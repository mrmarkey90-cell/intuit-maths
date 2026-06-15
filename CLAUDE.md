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
- Class dashboard: pupil profile creator link, Start Class Challenge button
- Session stored in localStorage (no Supabase auth)

### Pupil
- No credentials
- Self-register via `/join/[join_code]` (one link per class, permanent)
- Join sessions via `/play/[session_code]` (fresh code each challenge)
- Auto-rejoins from localStorage if profile stored for that class
- Earns credits, builds avatar over time

## PIN model

Two separate PINs:
- **Leadership PIN** — personal to the headteacher, stored in `users.pin_hash` + Supabase auth password. Set once during onboarding, not editable. Used for: email+PIN fallback login, authorising staff PIN changes.
- **Staff PIN** — shared with all teachers, stored in `schools.staff_pin`. Set during onboarding, changeable from dashboard (requires leadership PIN). Used for: staff access at `/school/[code]`.

Admin support: `SELECT admin_reset_staff_pin('SCHOOLCODE');` resets staff PIN to 0000.

## Challenge session model

- **Class Challenge** — teacher-initiated, once per week per class (resets Sunday). 90-second timer. Awards 10 credits per correct answer (2 base × 5x weekly multiplier).
- **Practice** — pupil self-initiated (not yet built). Awards 1 credit per correct answer.
- Session join code: 6-char alphanumeric, generated fresh per session. Displayed as URL + QR code in lobby.
- Timer: both teacher and pupil derive remaining time from `sessions.started_at` (absolute timestamp set 4 seconds in future when teacher clicks Begin, giving all clients time to sync).
- Skip button: 5-second timeout penalty, question not counted in total.
- Grace period: 5 seconds of "Marking your answers..." on teacher side after timer, before results are fetched.

## Level progression

- Move up: 10 correct answers in a session counts as a streak tick; 3 consecutive ticks → stage + 1 (resets streak)
- Move down: 3 consecutive sessions with <5 correct → pupil is offered the option to drop a stage (not automatic)
- Tracked via `challenge_streak` and `bad_streak` on `pupil_profiles`
- Only challenge sessions count toward streak (not practice)

## Avatar system

- Format: `{ face: 0, hat: 0, glasses: 0, scarf: 0 }` stored as JSON in `pupil_profiles.avatar`
- SVG assets live in `public/avatars/{faces,hats,glasses,scarves}/00.svg` etc. (not yet created)
- Layers are stacked absolutely — face first, then hat, glasses, scarf on top
- Missing SVGs silently hidden (onError handler)
- Unlocked items tracked in `pupil_profiles.unlocked_items` as `{"faces":[0],"hats":[0],"glasses":[0],"scarves":[0]}`
- New pupils start with index 0 unlocked in each category
- Up to 100 items per category (00–99)

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

- Free tier: 1 class, up to 40 pupils, full functionality
- Paid tier: £125/year, unlimited classes and pupils
- Stored as `subscribed` boolean on schools table
- Stripe webhook flips subscribed true/false (post-MVP)

## Database schema

### schools
id (uuid PK), name, school_code (text, unique), staff_pin (text, bcrypt hashed), subscribed (bool), created_at

### users
id (uuid PK), name, email, role (leadership/pupil), school_id (FK), pin_hash (text, bcrypt — leadership PIN), active (bool), onboarding_complete (bool), created_at

### classes
id (uuid PK), name, school_id (FK), join_code (text, unique — auto-generated on insert by trigger), created_at

### pupil_profiles
id (uuid PK), user_id (FK, nullable — pupils have no auth account), class_id (FK, nullable), school_id (FK), first_name (text), last_name (text), current_stage (int 1-6), credits (int), avatar (jsonb), unlocked_items (jsonb), challenge_streak (int), bad_streak (int), created_at

### sessions
id (uuid PK), class_id (FK), join_code (text, unique — 6-char generated by create_session RPC), status (lobby/active/finished), challenge_type (challenge/practice), started_at (timestamptz — set 4s in future when teacher clicks Begin), created_at

### session_participants
id (uuid PK), session_id (FK), pupil_id (FK → pupil_profiles.id), ready (bool), score (int), total (int), joined_at

### attempts
id (uuid PK), session_id (FK), pupil_id (FK), activity_type (challenge/practice), stage (int), score (int), total (int), completed_at

### domain_results
id (uuid PK), attempt_id (FK), domain (text), subdomain (text), correct (bool)

### Key RLS notes
- RLS enabled on all tables
- Security definer functions: get_my_school_id(), get_my_role()
- Direct table inserts for schools and users fail due to RLS caching bug — use SECURITY DEFINER RPC functions instead
- session_participants.pupil_id FK references pupil_profiles(id), NOT users(id) — pupils have no user accounts

### RPC functions (all SECURITY DEFINER)

#### Onboarding / school management
- `create_school(school_name, school_code)` — creates school, returns `{ id }`
- `complete_onboarding(leadership_pin, staff_pin)` — sets users.pin_hash, schools.staff_pin, onboarding_complete
- `set_staff_pin(leadership_pin, new_staff_pin)` — verifies leadership PIN, updates schools.staff_pin
- `admin_reset_staff_pin(school_code, new_pin DEFAULT '0000')` — support use from SQL editor
- `get_school_name(school_code)` — public/anon, returns school name for staff login screen
- `verify_school_pin(school_code, pin)` — public/anon, verifies staff PIN, returns school + classes (with id, name, join_code)

#### Pupil profiles
- `get_class_by_join_code(join_code)` — public/anon, returns class_name + school_name
- `get_class_pupils(join_code)` — public/anon, returns pupil list for class grid (used for both /join and /play flows)
- `create_pupil_profile(join_code, first_name, last_name, avatar)` — public/anon, creates pupil profile
- `lower_pupil_stage(pupil_id)` — public/anon, drops pupil one stage, resets streaks (called from level-down offer UI)

#### Session lifecycle
- `get_class_session_status(class_id)` — returns `{ weekly_used, active_session }` — teacher dashboard uses this to check weekly limit and restore active sessions after page refresh
- `create_session(class_id, challenge_type)` — creates lobby session with generated join code; enforces weekly challenge limit (returns error 'weekly_challenge_used' if already done this week)
- `get_session_info(join_code)` — public/anon, returns session status + started_at + class join_code (pupils use this to load the class grid and poll for Begin)
- `get_session_participants(session_id)` — returns participant list with pupil details, ready state, score, total (teacher polls this for lobby grid and results)
- `join_session(join_code, pupil_id)` — public/anon, inserts into session_participants; only works when status = 'lobby'
- `start_session(session_id)` — sets status = 'active', started_at = now() + 4s; returns started_at (both teacher and pupil derive their timer from this)
- `end_session(session_id)` — sets status = 'finished'
- `submit_attempt(session_id, pupil_id, score, total)` — records attempt, updates credits/streak/stage, returns `{ credits_earned, level_up, level_down_offer, new_stage, new_streak, prev_score, prev_total }`

## Current build status

### Working
- Landing screen — magic link, email+PIN login, sign up (three tabs)
- SchoolSetup screen — creates school via create_school() RPC, creates user record
- Payment screen — free vs paid, Stripe disabled (coming soon)
- AddClasses screen — adds classes (join_code auto-generated by DB trigger)
- PinSetup screen — sets leadership PIN + staff PIN in one screen
- Leadership Dashboard — school name, tier badge, staff link, classes with pupil counts, change staff PIN form
- Staff login — `/school/[code]` → PIN entry → class selection → class dashboard
- Class dashboard — pupil profile creator link + Start Class Challenge button (disabled if weekly challenge done)
- Pupil profile creation — `/join/[code]` → name + avatar builder → profile saved
- **Class Challenge session (teacher side)** — lobby with QR code + pupil ready grid, live timer with class stats, 5s marking grace period, results with individual scores
- **Class Challenge session (pupil side)** — `/play/[code]` → profile select → lobby wait → 90s question flow with numpad + skip → results with credits/streak/level info

### Not yet built
- Practice session flow (pupil self-directed, from pupil dashboard)
- Pupil dashboard (credits, avatar, stage, history)
- Reporting views (leadership)
- Avatar SVG assets (framework built, files not yet created)
- Admin dashboard (future) — Intuit-internal tool for resetting PINs, emails, managing schools
- Stripe integration
- Resend email

### MVP build order
1. ~~Challenge session~~ ✓
2. Basic reporting (leadership view of session history + pupil progress)
3. Pupil dashboard (credits, avatar, practice sessions)

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
- session_participants.pupil_id references pupil_profiles(id), not users(id) — caused silent join failures when originally set to users FK
- Staff and pupil sessions use localStorage only (no Supabase auth) — all relevant RPCs must be granted to `anon` role
- React stale closure pitfall in timer/interval callbacks: use refs (useRef) alongside state for any values read inside setInterval or setTimeout (pupil, question, feedback, sessionInfo all need refs in PupilSession)
- Timer sync: start_session sets started_at = now() + 4 seconds; both teacher and pupil compute remaining time from this absolute timestamp — do not use independent local countdowns
- intuit-education.co.uk points to a completely different project; always use intuited.uk
