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
- Stripe — payments (post-MVP)
- Resend — transactional email (pre-launch, replacing Supabase default)

## Domain

- **intuited.uk** — main domain (short for Intuit Education; also a real word)
- Hosted on Vercel, DNS via IONOS
- All URL references in code use `intuited.uk`

## URL structure

- `/` — leadership login/onboarding
- `/school/[school_code]` — staff PIN login → class selection → class dashboard
- `/join/[join_code]` — pupil profile creation (shared by teacher, one per class)

## User roles

### Leadership (Headteacher/SLT)
- Creates school account via magic link email auth
- Sets leadership PIN (personal) and staff PIN (shared) during onboarding
- Login: magic link OR email + leadership PIN fallback
- Creates and manages classes
- Views whole-school data and reporting
- Can change staff PIN from dashboard (requires leadership PIN to authorise)
- Login: magic link or email + leadership PIN

### Staff (Teachers)
- No individual accounts
- Access via `intuited.uk/school/[school_code]` — enter staff PIN → class dashboard
- Can access any class (self-directed to their own in practice)
- Class dashboard shows: pupil profile creator link, session join link (coming soon)
- Session stored in localStorage

### Pupil
- No credentials
- Self-register via `/join/[join_code]` (one link per class, shared by teacher)
- Profile: first name, last name, avatar
- Session login: tap name tile from class grid (session flow, not yet built)
- Earns credits, builds avatar over time

## PIN model

Two separate PINs:
- **Leadership PIN** — personal to the headteacher, stored in `users.pin_hash` + Supabase auth password. Set once during onboarding, not editable. Used for: email+PIN fallback login, authorising staff PIN changes.
- **Staff PIN** — shared with all teachers, stored in `schools.staff_pin`. Set during onboarding, changeable from dashboard (requires leadership PIN). Used for: staff access at `/school/[code]`.

Admin support: `SELECT admin_reset_staff_pin('SCHOOLCODE');` resets staff PIN to 0000.

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
id (uuid PK), name, school_id (FK), join_code (text, unique — auto-generated on insert), created_at

### pupil_profiles
id (uuid PK), user_id (FK, nullable — pupils have no auth account), class_id (FK, nullable), school_id (FK), first_name (text), last_name (text), current_stage (int 1-6), credits (int), avatar (json), unlocked_items (jsonb), created_at

### sessions
id (uuid PK), class_id (FK), join_code (text), status (lobby/active/finished), created_at

### session_participants
id (uuid PK), session_id (FK), pupil_id (FK), joined_at

### attempts
id (uuid PK), session_id (FK), pupil_id (FK), activity_type (challenge/lesson/game), stage (int), score (int), total (int), completed_at

### domain_results
id (uuid PK), attempt_id (FK), domain (text), subdomain (text), correct (bool)

### Key RLS notes
- RLS enabled on all tables
- Security definer functions: get_my_school_id(), get_my_role()
- Direct table inserts for schools and users fail due to RLS caching bug — use SECURITY DEFINER RPC functions instead

### RPC functions (all SECURITY DEFINER)
- `create_school(school_name, school_code)` — creates school, returns `{ id }`
- `complete_onboarding(leadership_pin, staff_pin)` — sets users.pin_hash, schools.staff_pin, onboarding_complete
- `set_staff_pin(leadership_pin, new_staff_pin)` — verifies leadership PIN, updates schools.staff_pin
- `admin_reset_staff_pin(school_code, new_pin DEFAULT '0000')` — support use from SQL editor
- `set_school_name(name)` — (future)
- `get_school_name(school_code)` — public/anon, returns school name for staff login screen
- `verify_school_pin(school_code, pin)` — public/anon, verifies staff PIN, returns school + classes (with join_code)
- `get_class_by_join_code(join_code)` — public/anon, returns class_name + school_name
- `get_class_pupils(join_code)` — public/anon, returns pupil list for class grid
- `create_pupil_profile(join_code, first_name, last_name, avatar)` — public/anon, creates pupil profile

## Current build status

### Working
- Landing screen — magic link, email+PIN login, sign up (three tabs)
- SchoolSetup screen — creates school via create_school() RPC, creates user record
- Payment screen — free vs paid, Stripe disabled (coming soon)
- AddClasses screen — adds classes (join_code auto-generated by DB trigger)
- PinSetup screen — sets leadership PIN + staff PIN in one screen
- Leadership Dashboard — school name, tier badge, staff link, classes with pupil counts, change staff PIN form
- Staff login — `/school/[code]` → PIN entry → class selection → class dashboard
- Class dashboard — shows pupil profile creator link (intuited.uk/join/[join_code])
- Pupil profile creation — `/join/[code]` → name + avatar builder → profile saved

### Not yet built
- Challenge session flow (lobby, timer, questions, results)
- Reporting views
- Avatar SVG assets (framework built, files not yet created)
- QR code display on class dashboard
- Admin dashboard (future) — Intuit-internal tool for resetting PINs, emails, managing schools

### MVP build order
1. Challenge session (lobby, timer, questions, results) ← current
2. Basic reporting

## Known gotchas
- Supabase magic link rate limit: 3/hour on free tier — disable email confirmation in Auth settings during development
- RLS caching bug on INSERT: use SECURITY DEFINER functions rather than direct table inserts
- .single() throws 406 when no rows — always use .maybeSingle() when record may not exist
- Environment variables must be prefixed VITE_ to be accessible in React
- npm run dev must be running for localhost testing
- Git push triggers automatic Vercel deployment (watch Vercel dashboard for build status)
- Supabase Auth creates user in auth.users — public.users is separate and only populated after SchoolSetup completes
- vercel.json + vite.config.js 404.html copy both in place for SPA routing on Vercel
- pupils have no Supabase auth account — pupil_profiles.user_id is nullable
- join_code on classes is auto-generated by DB trigger (assign_join_code) — never set manually
