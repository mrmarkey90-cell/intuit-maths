# Intuit Education — Maths Platform

## What we're building

A web-based primary school maths platform for Welsh KS2 schools. The core product is a whole-class timed arithmetic challenge where teachers run sessions, children complete personalised question sets simultaneously, and results are automatically recorded with domain-level diagnostic data.

This is the first product on the Intuit Education platform (intuited.uk). Future products may follow.

## Core concept

Inspired by Big Maths Beat That — a popular but entirely physical timed arithmetic challenge. This digitises and significantly extends it:
- Questions are procedurally generated per pupil based on their stage (no question bank)
- Each pupil gets questions appropriate to their level while the whole class races simultaneously
- Wrong answers are logged at subdomain level for diagnostic reporting
- Children record their percentage score in their physical book at the end
- The whole-class simultaneous event feeling is preserved and central

## Tech stack

- React (Vite) + React Router — frontend
- Supabase (Postgres) — database, auth, real-time
- Vercel — hosting (auto-deploys from GitHub)
- GitHub — version control (repo: mrmarkey90-cell/intuit-maths)
- pgcrypto — PIN hashing (bcrypt)
- react-qr-code — QR code display in session lobby
- Stripe — payments (post-MVP)
- Resend — transactional email (pre-launch, replacing Supabase default)

## Domain

- **intuited.uk** — main domain (short for Intuit Education; also a real word)
- Hosted on Vercel, DNS via IONOS (A record @ 216.198.79.1)
- All URL references in code use `intuited.uk`
- intuit-education.co.uk points to a completely different, unrelated project — do not use it

## URL structure

- `/` — leadership login/onboarding
- `/school/[school_code]` — staff PIN login → class selection → class dashboard
- `/join/[join_code]` — pupil profile creation (one link per class, shared by teacher)
- `/play/[session_code]` — pupil session join (generated fresh per challenge, shared by teacher during lobby)
- `/hub/[join_code]` — pupil hub (self-select profile, then dashboard: levels, credits, streak, Start Practice)

## User roles

### Leadership (Headteacher/SLT)
- Creates school account via magic link email auth
- Sets leadership PIN (personal) and staff PIN (shared) during onboarding
- Login: magic link OR email + leadership PIN fallback
- Creates and manages classes
- Views whole-school data and reporting
- Can change staff PIN from dashboard (requires leadership PIN to authorise)

### Staff (Teachers)
- No individual accounts
- Access via `intuited.uk/school/[school_code]` — enter staff PIN → class dashboard
- Can access any class (self-directed to their own in practice)
- Class dashboard: pupil profile creator link, Start Class Challenge button, pupil list with click-through to pupil detail
- Session stored in localStorage (no Supabase auth)

### Pupil
- No credentials
- Self-register via `/join/[join_code]` (one link per class, permanent)
- Join sessions via `/play/[session_code]` (fresh code each challenge)
- Always selects their name tile on join (no auto-login from localStorage)
- Earns credits, builds avatar over time

## PIN model

Two separate PINs:
- **Leadership PIN** — personal to the headteacher, stored in `users.pin_hash` + Supabase auth password. Set once during onboarding, not editable. Used for: email+PIN fallback login, authorising staff PIN changes.
- **Staff PIN** — shared with all teachers, stored in `schools.staff_pin`. Set during onboarding, changeable from dashboard (requires leadership PIN). Used for: staff access at `/school/[code]`.

Admin support: `SELECT admin_reset_staff_pin('SCHOOLCODE');` resets staff PIN to 0000.

## Challenge session model

- **Instinct** — teacher-initiated, once per week per class (resets Sunday). 60-second timer. Awards 10 credits per correct answer (2 base × 5x weekly multiplier). Stored in DB as `challenge_type = 'challenge'`.
- **Practice** — pupil self-initiated, launched from the pupil hub via `create_practice_session`. No timer limit on frequency (unlike Instinct's once-per-week gate). Awards 1 credit per correct answer. Stored in DB as `challenge_type = 'practice'`.
- Session join code: 6-char alphanumeric, generated fresh per session. Displayed as URL + QR code in lobby.
- Timer (Instinct, teacher-led): both teacher and pupil derive remaining time from `sessions.started_at` (absolute timestamp set 4 seconds in future when teacher clicks Begin, giving all clients time to sync) — `create_session`/`start_session` set this. The pupil's own screen never shows a visual timer bar during an Instinct session; the teacher's screen is the single source of truth for "how much time is left", which also reinforces the whole-class shared-event feel.
- Timer (Practice, solo): `create_practice_session` sets `started_at = now()` (no +4s delay — there's no other client to sync with, and point of the delay was multi-client coordination). `PupilSession.jsx`'s `beginQuestions` runs its own local 60s countdown from `Date.now()` rather than deriving from the server timestamp at all, and *does* render the `TimerBar` component (otherwise dead code, since Instinct never renders it) — a solo pupil has no teacher screen to check, so they need their own visible countdown.
- Begin countdown (Instinct only): once the teacher clicks Begin, the pupil's screen leaves the `lobby` view and shows a `countdown` view for the few seconds until `started_at` arrives — avatar + name + a rotating hype phrase (`HypePhrase` component in `PupilSession.jsx`, e.g. "Lock in!", "Brain: activate", Welsh: "Barod?", "Nawn ni hyn!"). English and Welsh phrase lists are independent sets, not translations of each other, so they don't go through the `t()`/`words.js` systems — flagged for the same Welsh-speaker review as everything else. Practice has no equivalent countdown screen since it no longer has any begin delay to fill.
- Skip button: 5-second timeout penalty, question not counted in total.
- Grace period: 5 seconds of "Marking your answers..." on teacher side after timer, before results are fetched.
- Teacher active view: shows live "Answered" count updated in real-time via Supabase Broadcast (pupils send a broadcast event after each answer; teacher receives it on the same channel).
- Teacher active view plays a ping sound for each new answer received.
- Pupil answer count/correct count not shown during session — no distractions.

## Level progression

- "Test Level" = `current_stage` (1–6) on `pupil_profiles`
- Move up: 12 correct answers in a session counts as a streak tick (`challenge_streak` +1); 3 consecutive ticks → stage + 1, streak resets to 0
- Move down: 3 consecutive sessions with <5 correct (`bad_streak` +1 each) → pupil is offered the option to drop a stage (not automatic)
- Only challenge sessions count toward streak (not practice)
- Pupil results screen shows: Test Level badge, 3 streak dots (●●○ towards next level), comparison % vs last session
- Teacher results screen shows: class aggregate + comparison vs previous session

## Insight session model

Curriculum source: Google Sheet **"intuit question examples"** (https://docs.google.com/spreadsheets/d/1SBGIIRV2p-4bsbKdIMdXq6cgnp4_ZyUAF5fMZ3_8tiA) — defines all 9 domains, ~36 subdomains, the active level range per subdomain, and an example question + interaction type per level. Treat this sheet as the source of truth when adding new levels/subdomains; `src/insight/domainConfig.js` mirrors its structure.

- 9 domains (Number System, Ordering, Addition, Subtraction, Multiplication, Division, Doubling & Halving, Proportionality, Problem Solving), each with 2-4 subdomains (codes like `1A`, `7B`) active across a specific contiguous level range (1-6)
- Each Insight test is **12 questions**: one subdomain per domain that's active at the pupil's level (randomly chosen if a domain has several active subdomains), then randomly filled to 12, preferring subdomains not already in the grid before allowing repeats (`generateModuleSlots` in `domainConfig.js`). `getActiveSubdomains` requires both an in-range level *and* an actual registered generator (`hasGenerator` from `generators/index.js`) — a subdomain that's "active" by range but has no generator yet (or never will, like 8B) is never selected, so a pupil never sees a "Coming soon" placeholder card. `InsightModule.jsx` still has a placeholder fallback for if `question` is ever null, kept deliberately as a defensive guard against `MODULE_COMPONENTS[...]` being undefined (which would otherwise crash trying to render `<undefined />`) rather than because it's expected to fire.
- 11 interaction types implemented so far (one component per type under `src/insight/modules/`): Numpad (reuses the Instinct `NumberPad` via a popup overlay), Circle (tap-one-of-N), Pair-sum (tap exactly 2 tiles summing to a target — any valid pair counts), Drag-sort (real pointer-based drag via Pointer Events, source row → labelled target slots), Number line (a true ruled line, drag a pin-shaped handle to a notch; `labelPoints` defaults to `[min, max]` but a question can supply more, e.g. Level 2's 1A labels 1/5/10/15/20 — unlabelled notches stay bare until marking, when every notch is labelled; `step` defaults to 1 but accepts a decimal for fractional lines; `continuous: true` hides notches entirely for "estimate the position" questions, paired with `tolerance` to accept an answer within that distance rather than requiring exact), Share (tap +/- to move items from a pool into boxes; counts above 8 collapse to a compact "× N" badge so it never needs scrolling — the +/- buttons show only the symbol, no words, so nothing needs translating), Fill-blank (a pattern sequence with one gap; drag the correct value up from a row of plausible options into the gap — same Pointer Events approach as Drag-sort, but a single slot inline within the sequence), True/False (two large tap buttons, e.g. Even/Odd — same tap-one interaction as Circle, styled bigger as a binary choice), Partition (a number with arrows down to one numpad box per place-value part, e.g. 34 → [30] + [4] — wordless by design, both boxes always required; generalised to skip punctuation like a decimal point when mapping digits to parts, e.g. 3.6 → [3, 0.6]), Multi-select (grid of tiles, tap any number on/off; no internal submit — `onAnswer` just reflects whatever's currently selected, same as every other module, and the child moves on via the carousel's own Next/Submit; `columns` overrides the default 3-column grid, e.g. Level 5's 1G uses a 5x5 grid of every number 1-25 rather than the usual mixed-tile approach), Match (two columns, drag from a left item to a right item to connect them — Pointer Events plus a live SVG line, same measured-position technique as Partition's arrows; used for fraction-to-decimal style matching)
- `NumberPad` (`src/components/NumberPad.jsx`, shared with Instinct) takes an `allowDecimal` prop, default `false` — only Insight's Numpad/Partition modules pass it through (from a question's `decimal: true`), so Instinct's integer-only flow is untouched. Submit is disabled on a trailing decimal point (e.g. "5.") same as on an empty or bare "-" value.
- Some subdomains change interaction type between levels as the scaffolding comes off (e.g. 6A: Share module at L1/L2 → plain Numpad at L3; 7B: Number line at L1 → Circle at L2 → plain Numpad at L3) — this is deliberate, not a copy-paste error, confirmed with the curriculum author
- Progression: same model as Instinct — all 12 correct = streak tick (`insight_streak`), 3 ticks → level up; <75% correct = bad-streak tick (`insight_bad_streak`), 3 bad sessions → level-down offer
- Any Insight level change (up, down, or teacher override via `set_pupil_levels`) wipes `pupil_subdomain_strength` for that pupil — the difficulty calibration just shifted, so old per-subdomain counts aren't comparable
- Credits: 50 flat on completion + 1 per correct answer
- Weekly gating (intended pupil hub flow, not yet wired up): Practice Instinct is always available on the hub; Insight becomes available — and is the *only* option shown — once the class's weekly Instinct session is done, until the pupil completes one Insight test that week
- `pupil_subdomain_strength` tracks per-subdomain correct/attempt counts, intended to drive future gap-fill activities on the pupil hub (not yet built)
- Bilingual: `generateInsightQuestion(subdomain, level, language)` threads `language` into the matching generator function, which builds its prompt/question text from `src/insight/generators/words.js` (a shared `en`/`cy` word bank — English authoritative, Welsh standard classroom usage but **not yet checked against Y Termiadur Addysg**, same caveat as the Instinct generator). New levels should import `w(lang)` from `words.js` rather than redefining vocabulary. Module components translate their own static chrome (e.g. "Tap to answer", "Lowest"/"Highest", the "Correct: …" hints, Share's wording) via `useTranslation()` under the `insight.*` keys in `src/i18n/translations.js`; the per-subdomain label shown on every module card (e.g. "1B Partitioning") is translated separately under `insightSubdomain.*` (all 36 codes, done once since it's level-independent). `InsightResults.jsx` (the dev-mock results/credits screen) is also fully translated under `insight.*`, even though it's explicitly a preview pending the real `submit_insight_attempt`-driven screen, so there's no English-only surface anywhere in the question→marking→results flow. `NumberPad` (`src/components/NumberPad.jsx`) and `InsightNumpadOverlay`'s Submit/Cancel buttons route through the general `common.submit`/`common.cancel` keys rather than `insight.*`, since `NumberPad` is shared with **production** Instinct sessions — this was a real gap (Instinct's live pupil-facing Submit button was hardcoded English) caught and fixed during a bilingual audit, not an Insight-specific concern. `/insight-test` has a dev-only language toggle (not itself translated, along with the rest of the dev harness's own picker/test-runner chrome — that's never pupil-facing) to preview Welsh output while building new levels.

**Current implementation status: dev test harness only.** `/insight-test` (`src/screens/InsightTest.jsx`) lets you pick a domain/level and answer one module, or run a full 12-question carousel with Submit → marking → results → review. It does **not** call `submit_insight_attempt` or write real data — results/credits shown there are client-side mocks. All 6 levels of generators now exist (`src/insight/generators/level1.js` through `level6.js`). 3A at Level 2 deliberately reuses `L1_3A` directly (the sheet specifies an identical question), rather than duplicating it into `level2.js`; similarly Level 5's 4C reuses `level4.L4_4C` directly — that generator was built for Level 4 but deliberately held back to Level 5 for difficulty reasons. 8B (Ratios), 5C (By Partition — redundant with 5B), and 9A at Level 6 specifically (redundant per explicit instruction) are deliberately unimplemented — kept in `domainConfig.js` but never registered with a generator, so `getActiveSubdomains`'s `hasGenerator` check excludes them from ever being picked (see below). `NumpadModule` supports an optional `column` layout (`{ a, b, operator }`, values can be pre-formatted strings e.g. with `.toLocaleString('en-GB')` for thousands separators), an optional `answer` as an array of multiple acceptable strings (e.g. Level 6's 1G accepts any valid common factor, not one fixed answer), an optional `prefix` shown on the answer button as a hint (e.g. `'£'`), and an optional `diagram: { type: rectangle-minus-square shape via width/height/cutWidth/cutHeight/unit }` for geometry word problems — not to scale, every edge labelled directly on the SVG. The real pupil-facing flow (PupilHub integration, weekly gating, actual DB submission) is not yet built.

**`domainConfig.js` corrections made while building Levels 5-6** (resolved, not open questions): 4B (Column Subtraction) confirmed discontinued after Level 4 — `maxLevel` corrected to 4. 6C (Multiple Digits) confirmed discontinued after Level 5 — `maxLevel` corrected to 5. 6D (Decimals) confirmed *not* active at Level 5 but active at Level 6 — `minLevel` corrected to 6 (so it's only active at Level 6 currently).

## Avatar system (v2)

Overhauled to be the main character of a standalone game to be built later (Cyanide & Happiness-style minimalist figure). Design reference: `design/avatar rig.svg` — the shared `0 0 200 300` coordinate system every hand-drawn asset and the procedural body both draw against (head/torso connection point, shoulder/hip anchor coordinates, etc.). This is the artist's actual working file (renamed from the original `avatar-rig-guide.svg`, every hairstyle/clothing/face piece drawn in it as its own layer and individually exported out to `public/avatars/...`) — not a static reference to keep in sync by hand.

- **Format**: `{ skinTone: 0, hairStyle: 0, hairColor: 0, clothing: 0, hat: null }` stored as JSON in `pupil_profiles.avatar`. `skinTone`/`hairColor` are indexes into the palettes in `src/lib/avatarConfig.js` (`SKIN_TONES`, `HAIR_COLORS` — 6 each, "moderate choice" per explicit instruction); `hairStyle`/`clothing`/`hat` are indexes into their `public/avatars/{category}/` folders. `hat` is `null` when nothing's equipped.
- **What's hand-drawn vs procedural**: face/head shape, hair, clothing, and hats are hand-drawn SVGs (artist-authored in Inkscape against the rig guide). Eyes, mouth, arms, and legs are drawn directly by code in `AvatarDisplay.jsx` — simple lines/dots, animated where appropriate (not yet built — currently a static neutral pose). There's deliberately no separate procedural "torso" shape; the equipped clothing *is* the torso visual, since clothing always covers that whole area.
- **Recoloring**: only the face (skin tone) and hair (hair colour) are dynamically recolorable — clothing and hats each have their own fixed colour baked into the asset file, picked by which file/index, not overridden. The recolorable element in an asset file is the one the artist tagged `id="fill"` (set via Inkscape's Object Properties → ID field, **not** the Objects panel's "label" field — a mistake that's happened more than once when exporting real assets, easy to mix up since both live in dialogs named similarly).
- **Rendering**: `AvatarDisplay.jsx` does NOT use `<img src>` (the old system did) — CSS can't reach inside an externally-referenced image to swap a fill colour. Instead `src/lib/avatarAssetLoader.js` fetches each asset's raw SVG text, strips it down to plain shape descriptors via `DOMParser` (discarding Inkscape's `sodipodi:`/`inkscape:` metadata, `<defs>`, and the original `id` — every Inkscape export reuses ids like `fill`/`path1`, so preserving them would collide when multiple avatars render on one page, e.g. a class roster), and `AvatarDisplay` re-renders them as fresh React elements via `createElement`, overriding `fill` on whichever shape was tagged as the target. Results are cached per `category/index` (a `Map` of promises, so concurrent requests for the same asset share one fetch).
- **Crop**: `AvatarDisplay` takes a `crop` prop, `'bust'` (default, square container — used everywhere in the maths platform today: pupil tiles, hub badge, profile preview) or `'full'` (2:3 container, for a future full-body game/showcase context — not used anywhere yet). Both render the same full-body `0 0 200 300` viewBox; `'bust'` just asks for a square container, so the whole figure scales down to fit (letterboxed left/right) rather than being cropped at the legs.
- **Asset file convention**: `public/avatars/{category}/{NN}.svg`, e.g. `hair/00.svg`, `clothing/03.svg` — same indexed-folder convention as the old system. Counts tracked in `avatarConfig.js` (`HAIR_STYLE_COUNT`, `CLOTHING_COUNT`, `HAT_COUNT`) — bump these as the artist adds more files. Currently: 1 face shape, 3 hairstyles, 5 clothing designs (10 planned), 0 hats.
- **Unlocking**: skin tone, hair (style + colour), and clothing are always fully available — no unlock tracking needed. **Hats are the only locked/earnable item** (the one gameplay-affecting item, by deliberate later decision — "much easier tuning control" than locking multiple categories) — tracked in `pupil_profiles.unlocked_items` as `{"hats":[]}`, set by `create_pupil_profile`. Starts empty; awarded by the standalone game once it exists (no interim unlock mechanism on the current platform, by explicit decision). `AvatarBuilder.jsx` shows a placeholder message instead of a hat picker when `unlocked.hats` is empty.
- `AvatarBuilder.jsx` renders only the controls (palette swatch rows for skin/hair colour, steppers for hairstyle/clothing/hat) — the big avatar preview itself is the caller's responsibility, so screens can lay preview + controls out however they need (e.g. `PupilProfileCreate.jsx`'s side-by-side split).

## Curriculum structure — 6 stages

Mapped to Welsh Curriculum Progression Steps, arithmetic only.

- Stage 1 — Early PS1 (age ~5): counting, comparing, simple +/-
- Stage 2 — Late PS1 (age ~6-7): +/- within 20, doubling/halving, ordering
- Stage 3 — Early PS2 (age ~7-8): place value, 2-digit +/-, times tables 2/5/10, simple fractions
- Stage 4 — Late PS2 (age ~9-10): larger numbers, all times tables, fractions of amounts
- Stage 5 — Early PS3 (age ~10-11): negatives, decimals, fractions, percentages, powers of 10
- Stage 6 — Late PS3 (age ~11): FDP equivalence, complex %, multi-step, ratio

All generated questions have integer answers. Decimal display/input is deferred.
Out of scope: geometry, statistics, algebra, money, time, formal written methods.

## Subscription model

Three tiers, stored as `schools.tier` (free/pilot/paid):

- **Free** — 1 active class (`class_slots = 1`), full functionality
- **Pilot** — unlimited active classes (`class_slots = NULL`), manually assigned by us for early partner schools
- **Paid** — N active classes (`class_slots = N`), per-class annual subscription

Pricing model:
- Annual subscription, per class, billed at signup
- Mid-year additions: one-off charge for extra classes, aligned to anniversary date
- On renewal, subscription quantity updates to current active classes
- Cancellation: no refund, access until period end

Class management:
- `classes.active` bool — inactive classes are hidden from staff login but data is retained indefinitely
- `toggle_class_active(p_class_id, p_active)` RPC enforces slot limit for paid tier, allows freely for pilot/NULL
- Leadership dashboard shows active class count vs limit, with per-class activate/deactivate toggles
- `verify_school_pin` only returns `active = true` classes to staff

Stripe integration is post-MVP. Webhook will manage `class_slots` and `slots_expire_at`.

## Database schema

### schools
id (uuid PK), name, school_code (text, unique), staff_pin (text, bcrypt hashed), tier (text: free/pilot/paid, default free), class_slots (int, NULL = unlimited), slots_expire_at (timestamptz), stripe_customer_id (text), stripe_subscription_id (text), subscribed (bool — legacy, no longer used), created_at

### users
id (uuid PK), name, email, role (leadership/pupil), school_id (FK), pin_hash (text, bcrypt — leadership PIN), active (bool), onboarding_complete (bool), transfer_pending_email (text — set by initiate_transfer, cleared on complete), created_at

### classes
id (uuid PK), name, school_id (FK), join_code (text, unique — auto-generated on insert by trigger), active (bool, default true), created_at

### pupil_profiles
id (uuid PK), user_id (FK, nullable — pupils have no auth account), class_id (FK, nullable), school_id (FK), first_name (text), last_name (text), instinct_level (int 1-6), insight_level (int 1-6), credits (int), avatar (jsonb), unlocked_items (jsonb), challenge_streak (int), bad_streak (int), insight_streak (int), insight_bad_streak (int), created_at

### sessions
id (uuid PK), class_id (FK), join_code (text, unique — 6-char generated by create_session RPC), status (lobby/active/finished), challenge_type (challenge/practice), started_at (timestamptz — set 4s in future when teacher clicks Begin), created_at

### session_participants
id (uuid PK), session_id (FK), pupil_id (FK → pupil_profiles.id), ready (bool), score (int), total (int), joined_at
- Auto-purged by pg_cron job every 10 minutes (deletes rows for finished or >30min old sessions)
- Has anon SELECT RLS policy (required for Realtime; data not sensitive)

### attempts
id (uuid PK), session_id (FK, nullable — Insight attempts have no session), pupil_id (FK → pupil_profiles.id — NOT users.id), activity_type (challenge/practice/lesson/game/insight), stage (int), score (int), total (int), completed_at

### domain_results
id (uuid PK), attempt_id (FK), domain (text), subdomain (text), correct (bool)

### pupil_subdomain_strength
pupil_id (FK), subdomain (text — e.g. `1A`, `7B`, matches the curriculum sheet codes), level (int — insight_level this was accrued at), strength (int — +1 per correct answer), attempts (int), last_attempted_at (timestamptz)
- Unique on (pupil_id, subdomain)
- Wiped entirely whenever the pupil's `insight_level` changes (level-up, level-down offer accepted, or teacher override)
- Feeds future gap-fill activities on the pupil hub (not yet built)

### Key RLS notes
- RLS enabled on all tables
- Security definer functions: get_my_school_id(), get_my_role()
- Direct table inserts for schools and users fail due to RLS caching bug — use SECURITY DEFINER RPC functions instead
- session_participants.pupil_id FK references pupil_profiles(id), NOT users(id)
- attempts.pupil_id FK references pupil_profiles(id), NOT users(id)

### RPC functions (all SECURITY DEFINER)

#### Onboarding / school management
- `create_school(school_name, school_code)` — creates school, returns `{ id }`
- `complete_onboarding(leadership_pin, staff_pin)` — sets users.pin_hash, schools.staff_pin, onboarding_complete
- `set_staff_pin(leadership_pin, new_staff_pin)` — verifies leadership PIN, updates schools.staff_pin
- `admin_reset_staff_pin(school_code, new_pin DEFAULT '0000')` — support use from SQL editor
- `get_school_name(school_code)` — public/anon, returns school name for staff login screen
- `verify_school_pin(school_code, pin)` — public/anon, verifies staff PIN, returns school + active classes (with id, name, join_code) + tier
- `toggle_class_active(p_class_id, p_active)` — leadership, activates/deactivates a class; enforces class_slots limit for paid tier; returns `{ ok }` or `{ error: 'no_slots' }`
- `create_class(p_name, p_active DEFAULT true)` — leadership, creates a class for the current school; join_code auto-generated by DB trigger; returns `{ id, name, active }`
- `initiate_transfer(p_leadership_pin, p_new_email)` — verifies leadership PIN, sets `users.transfer_pending_email`
- `complete_transfer()` — matches `auth.email()` to `transfer_pending_email`; re-parents the user row to the new auth UID; called automatically by App.jsx when a new auth session has no matching public.users row

#### Leadership management
- `get_leadership_class_detail(p_class_id)` — returns class info + pupil list with `last_attempt_at` for each pupil
- `delete_class(p_class_id)` — NULLs `class_id` on all member pupils (preserving them), then deletes the class
- `move_pupil(p_pupil_id, p_class_id)` — updates `pupil_profiles.class_id`; pass NULL to unallocate
- `delete_pupil(p_pupil_id)` — cascades: domain_results → attempts → session_participants → pupil_profiles

#### Pupil profiles
- `get_class_by_join_code(join_code)` — public/anon, returns class_name + school_name
- `get_class_pupils(join_code)` — public/anon, returns pupil list (id, first_name, last_name, avatar, instinct_level, challenge_streak)
- `create_pupil_profile(join_code, first_name, last_name, avatar)` — public/anon, creates pupil profile
- `lower_pupil_stage(pupil_id)` — public/anon, drops pupil one Instinct stage, resets challenge/bad streaks (called from level-down offer UI)
- `lower_insight_stage(pupil_id)` — public/anon, drops pupil one Insight level, resets insight streaks, clears `pupil_subdomain_strength`
- `set_pupil_levels(pupil_id, p_instinct_level, p_insight_level)` — teacher override (PupilDetail); resets all four streak counters and clears `pupil_subdomain_strength`
- `get_pupil_history(pupil_id)` — anon, returns `{ pupil: { id, first_name, last_name, instinct_level, insight_level, credits, challenge_streak, bad_streak, insight_streak, insight_bad_streak, class_id }, attempts: [...], insight_attempts: [...] }` — last 10 attempts of each activity_type, with stage/score/total/date
- `create_practice_session(p_class_id, p_pupil_id)` — anon, creates a `challenge_type = 'practice'` session (no weekly limit, unlike Instinct) and returns the join code directly as text; PupilHub navigates straight to `/play/[join_code]` with it

#### Insight
- `get_pupil_hub_status(pupil_id, class_id)` — anon, returns `{ insight_available }` — true once the class's weekly Instinct is done AND this pupil hasn't done Insight this week
- `submit_insight_attempt(pupil_id, p_modules)` — anon, `p_modules` is a jsonb array of `{ subdomain, correct }`; records the attempt, upserts `pupil_subdomain_strength` per subdomain, updates insight streak/level/credits, clears subdomain strength on level change; returns `{ credits_earned, level_up, level_down_offer, new_stage, new_streak, score, total }`
- `get_pupil_subdomain_strengths(pupil_id)` — anon, returns array of `{ subdomain, level, strength, attempts, last_attempted_at }`

#### Session lifecycle
- `get_class_session_status(class_id)` — returns `{ weekly_used, active_session }` — teacher dashboard uses this to check weekly limit and restore active sessions after page refresh
- `create_session(class_id, challenge_type)` — creates lobby session with generated join code; enforces weekly challenge limit (returns error 'weekly_challenge_used' if already done this week)
- `get_session_info(join_code)` — public/anon, returns `{ session_id, status, started_at, challenge_type, class_name, class_join_code }`
- `get_session_participants(session_id)` — returns participant list with pupil details, ready state, score, total (teacher polls for lobby grid and grace-period results fetch)
- `join_session(join_code, pupil_id)` — public/anon, inserts into session_participants; only works when status = 'lobby'
- `start_session(session_id)` — sets status = 'active', started_at = now() + 4s; returns started_at
- `end_session(session_id)` — sets status = 'finished'
- `submit_attempt(session_id, pupil_id, score, total)` — records attempt, updates credits/streak/stage, returns `{ credits_earned, level_up, level_down_offer, new_stage, new_streak, prev_score, prev_total }`
- `update_participant_progress(session_id, pupil_id, score, total)` — public/anon, updates score/total on session_participants mid-session (called after each answer; persists for grace-period fetch)
- `get_class_challenge_comparison(class_id, current_session_id)` — anon, returns `{ current: { answered, correct }, previous: { answered, correct, session_date } | null }` — used on teacher results screen

## Current build status

### Working
- Landing screen — magic link, email+PIN login, sign up (three tabs)
- SchoolSetup screen — creates school via create_school() RPC, creates user record
- Payment screen — free vs paid, Stripe disabled (coming soon)
- AddClasses screen — adds classes (join_code auto-generated by DB trigger)
- PinSetup screen — sets leadership PIN + staff PIN in one screen
- **Leadership Dashboard** — tile-based 3-column grid (Staff Link copy, Manage Classes, Manage Pupils, Tier, Manage Account, Support, Sign Out); school name in header; "intuit" brand above tiles
- **Leadership — Manage Classes** — active/inactive toggle (edit mode), slot counter pill, add class inline form (`create_class` RPC)
- **Leadership — Manage Pupils** — full school pupil list with search, level badge, class name; click through to pupil detail
- **Leadership — Manage Account** — change staff PIN form, transfer ownership flow (magic link to new owner)
- **Leadership — Class Detail** — pupil list with last-active dates, delete class (warns pupils become unallocated)
- **Leadership — Pupil Detail** — challenge history, Test Level, streak, credits, move class dropdown, delete pupil
- **Ownership transfer** — `initiate_transfer` + `supabase.auth.signInWithOtp`; `complete_transfer` auto-fires in App.jsx when new auth session has no public.users row
- Staff login — `/school/[code]` → PIN entry → class selection → class dashboard
- Class dashboard — pupil list with levels + click-through to pupil detail, profile creator link, Start Instinct button
- Pupil detail view — challenge history, Test Level, streak progress (teacher-accessible)
- Pupil profile creation — `/join/[code]` → name + avatar builder → profile saved
- **Instinct session (teacher side)** — lobby with QR code + pupil ready grid, real-time answered count via Broadcast + ping sound, 5s marking grace period, results with class aggregate + comparison vs last session
- **Instinct session (pupil side)** — `/play/[code]` → profile select → lobby wait → 60s question flow with numpad + skip → results with Test Level badge, streak dots, credits earned, comparison vs last time
- **FloatingLogos** — 12 bouncing logo instances (RAF physics, direct DOM mutation) behind all leadership screens; logo at `public/intuit-logo.svg`
- **Insight module framework** (dev tool, not yet pupil-facing) — `/insight-test`: domain/level picker for testing a single module, or a full 12-question carousel (free editing until Submit → marking → results → "look at the marking" review). All 6 levels have real generators across 11 interaction types. See "Insight session model" above for what's real vs. mocked.
- **Pupil hub** (`/hub/[join_code]`, `src/screens/PupilHub.jsx`) — self-select profile (with avatar confirm step), then a dashboard showing Instinct/Insight level badges, credits, streak dots, and a Start Practice button that calls `create_practice_session` and navigates straight into a real `/play/[code]` session
- **Practice sessions** — pupil-self-directed, launched from the pupil hub via `create_practice_session`; reuses the same PupilSession/SessionHost flow as Instinct but with no weekly limit and the lower 1-credit-per-correct-answer rate
- **Pupil device chrome** (`src/components/PupilScreenGuard.jsx`) — wraps all three child-facing routes (`/join`, `/play`, `/hub`; never Staff/Leadership, since teachers use laptops): a persistent fullscreen toggle button (top right, SVG expand/compress icon, hidden entirely if `document.fullscreenEnabled` is false) and a portrait-blocking overlay (full-screen, high z-index, animated rotate-device icon + message) that appears whenever `window.innerHeight > window.innerWidth` and disappears the instant the device is rotated. Detection is plain resize/orientationchange listeners, not the Fullscreen/Screen Orientation APIs, for broad device support. Known limitation: rotating mid-Instinct-session does not pause the timer, since timing is derived from an absolute server timestamp (`sessions.started_at`), not a locally pausable countdown — the overlay just blocks interaction, it can't stop the clock.

### Not yet built
- Insight pupil-facing session — real PupilHub integration, weekly gating, actual `submit_insight_attempt` calls (currently only a disconnected dev test harness exists)
- Gap-fill activities on the pupil hub, driven by `pupil_subdomain_strength`
- Reporting views (leadership)
- Full hand-drawn avatar asset set (in progress — currently 1 face, 3 hairstyles, 5 of 10 planned clothing designs, 0 hats; see "Avatar system (v2)" above)
- Procedural body animation (walk/jump/celebrate/punch) — currently a static neutral pose
- Admin dashboard (future) — Intuit-internal tool for resetting PINs, emails, managing schools
- Stripe integration
- Resend email

### MVP build order
1. ~~Challenge session~~ ✓
2. ~~Basic per-pupil history and level display~~ ✓
3. ~~Leadership management screens (classes, pupils, account, transfer)~~ ✓
4. Pupil dashboard (credits, avatar, practice sessions)
5. Reporting views (leadership — whole-school session history and pupil progress)

## Known gotchas
- Supabase magic link rate limit: 3/hour on free tier — disable email confirmation in Auth settings during development
- RLS caching bug on INSERT: use SECURITY DEFINER functions rather than direct table inserts
- .single() throws 406 when no rows — always use .maybeSingle() when record may not exist
- Environment variables must be prefixed VITE_ to be accessible in React
- npm run dev must be running for localhost testing
- Git push triggers automatic Vercel deployment (watch Vercel dashboard for build status)
- Supabase Auth creates user in auth.users — public.users is separate and only populated after SchoolSetup completes
- vercel.json rewrites + vite.config.js 404.html copy both in place for SPA routing on Vercel
- pupils have no Supabase auth account — pupil_profiles.user_id is nullable
- join_code on classes is auto-generated by DB trigger (assign_join_code) — never set manually
- session_participants.pupil_id and attempts.pupil_id both reference pupil_profiles(id), NOT users(id) — easy to get wrong
- Staff and pupil sessions use localStorage only (no Supabase auth) — all relevant RPCs must be granted to `anon` role
- React stale closure pitfall in timer/interval callbacks: use refs (useRef) alongside state for any values read inside setInterval or setTimeout (pupil, question, feedback, sessionInfo all need refs in PupilSession)
- Timer sync: for Instinct (multi-client, teacher + every pupil), start_session sets started_at = now() + 4 seconds, and everyone computes remaining time from this absolute timestamp — do not use independent local countdowns there. This does NOT apply to Practice, which is solo by definition (no other client to sync with) — it intentionally uses its own local 60s countdown from the moment it begins on that one device, and create_practice_session sets started_at = now() with no +4s delay.
- Supabase postgres_changes Realtime is unreliable for anon users (RLS filtering causes missed events) — use Broadcast instead for client-to-client real-time (pupils broadcast to teacher on `session-{id}` channel)
- Calling async RPCs inside React state setter callbacks (setAnswers, etc.) is bad practice — keep side effects in the main handler body
- intuit-education.co.uk points to a completely different project; always use intuited.uk
- Test sessions must be manually cleared for retesting: delete from domain_results, attempts, session_participants, sessions in that order (FK cascade order)
- FloatingLogos uses requestAnimationFrame + direct DOM mutation (imgRef.style.left/top) — not React state — to avoid 60fps re-renders; keep it that way
- FloatingLogos z-index model: container is `position: fixed; z-index: 0`; `.dashboard` and `.screen` are `position: relative; z-index: 1` with no background (body provides #f5f5f5); content sections/header keep white backgrounds so logos are hidden behind cards but visible in gaps
- `public/intuit-logo.svg` is the company logo (portrait, ASPECT = 181.54816 / 116.77534 ≈ 1.555)
- `button:disabled { background: #a5a3e8; }` (global, App.css) has higher CSS specificity than a single modifier class (e.g. `.insight-circle-option--correct`), so it silently overrides their background whenever the button is disabled — most visible as an unwanted lavender box where a transparent/differently-coloured background was expected. Any new disabled-and-coloured button state needs an explicit `.your-class:disabled { ... }` companion rule to win back the cascade.
- Components that must persist internal state across a parent's view changes (e.g. the Insight carousel's 12 question modules, which must not regenerate their random question when moving from "answering" → "marking" → "review") need to stay mounted continuously — toggle visibility with CSS `display`, not by conditionally returning different JSX trees per view, which unmounts everything in the unrendered branch
- `white-space: pre` on generated question text blocks wrapping entirely and can overflow on long lines — use `white-space: pre-wrap` to keep explicit `\n` line breaks while still allowing normal wrapping
- `src/components/NumberPad.jsx` is shared between Instinct (production, live pupil sessions) and Insight (dev harness) — any hardcoded English string added to it silently breaks bilingual support for the *production* Instinct flow, not just the Insight dev tool. Caught once already (its "Submit" button); route any new static text through `common.*` translation keys, not Insight-specific `insight.*` ones.
- Avatar SVG assets exported from Inkscape carry over the design guide's leftover comment block (artists won't always remember to delete it), and that comment text used `--` as a stylistic dash in several places — which is invalid inside an XML comment (`--` can't appear except as the closing delimiter). A real browser's strict XML `DOMParser` rejects this and silently returns a `<parsererror>` document instead of throwing, so every shape in `avatarAssetLoader.js` failed to extract with literally nothing to catch — assets just never rendered, no console error, no exception. Caught only by screenshotting a headless browser running the actual page, since a Node-based parser test (`linkedom`) was lenient enough to mask the bug entirely and passed cleanly on the same file. Fixed by stripping all comments out of the raw SVG text before parsing, which sidesteps the whole class of bug regardless of what ends up in a future export — but worth remembering if a *different* parsing oddity ever shows up: check for a `<parsererror>` element in the parsed document, don't assume an empty shapes array means "no shapes," it can mean "didn't parse at all."
