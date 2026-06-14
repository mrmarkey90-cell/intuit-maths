# Intuit Education — Maths Platform

## What we're building

A web-based primary school maths platform for Welsh KS2 schools. The core product is a whole-class timed arithmetic challenge where teachers run sessions, children complete personalised question sets simultaneously, and results are automatically recorded with domain-level diagnostic data.

This is the first product on the Intuit Education platform (intuit-education.co.uk). Future products may follow.

## Core concept

Inspired by Big Maths Beat That — a popular but entirely physical timed arithmetic challenge. This digitises and significantly extends it:
- Questions are procedurally generated per pupil based on their stage (no question bank)
- Each pupil gets questions appropriate to their level while the whole class races simultaneously
- Wrong answers are logged at subdomain level for diagnostic reporting
- Children record their percentage score in their physical book at the end
- The whole-class simultaneous event feeling is preserved and central

## Tech stack

- React (Vite) — frontend
- Supabase (Postgres) — database, auth, real-time
- Vercel — hosting (auto-deploys from GitHub)
- GitHub — version control (repo: mrmarkey90-cell/intuit-maths)
- pgcrypto — PIN hashing (bcrypt)
- Stripe — payments (post-MVP)
- Resend — transactional email (pre-launch, replacing Supabase default)

## User roles

### Leadership
- Creates school account via magic link email auth
- Sets school name, PIN, school_code during onboarding
- Creates and manages classes
- Views whole-school data and reporting
- Can reassign pupils between classes, mass-unparent at year start
- Login: magic link or school_code + PIN fallback

### Staff (Teachers)
- No individual accounts
- Access via PIN-protected school link (intuit-education.co.uk/school/[school_code])
- Enter PIN, land on class dashboard
- Can access any class (self-directed to their own in practice)
- Display two QR codes per class: profile creation link and session join link
- Persistent cookie session

### Pupil
- No credentials
- Self-register via Profile Creation link (name + avatar)
- Session login: tap name tile from class grid, confirm identity
- Earns credits, builds avatar

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
- stored as `subscribed` boolean on schools table
- Stripe webhook flips subscribed true/false (post-MVP)

## Database schema

### schools
id (uuid PK), name, subscribed (bool), pin (text, bcrypt hashed), school_code (text, unique), created_at

### users
id (uuid PK), name, email, role (leadership/pupil), school_id (FK), active (bool), onboarding_complete (bool), created_at

### classes
id (uuid PK), name, school_id (FK), created_at

### pupil_profiles
id (uuid PK), user_id (FK), class_id (FK, nullable), school_id (FK), current_stage (int 1-6), credits (int), avatar (json), created_at

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
- create_school(school_name, school_code) RPC exists
- complete_onboarding(plain_pin) RPC exists — sets schools.pin and onboarding_complete in one call
- set_school_pin(old_pin, new_pin) RPC exists — verifies current PIN before updating
- admin_reset_school_pin(school_code, new_pin DEFAULT '0000') RPC exists — for support use from SQL editor

## Current build status

### Working
- Landing screen — magic link email auth
- SchoolSetup screen — creates school via create_school() RPC, creates user record
- Payment screen — free vs paid, Stripe disabled (coming soon)
- AddClasses screen — adds classes, enforces free tier limit of 1
- PinSetup screen — PIN entry/confirm, school link display, copy button
- Leadership Dashboard — school name, tier badge, staff link, classes with pupil counts, change PIN form

### Not yet built
- Staff PIN login flow
- Pupil profile creation flow
- Challenge session flow
- Reporting views
- Admin dashboard (future) — Intuit-internal tool for resetting PINs, emails, managing schools

### MVP build order
1. Staff PIN login ← current
2. Pupil profile creation (name + avatar builder)
3. Challenge session (lobby, timer, questions, results)
4. Basic reporting

## Known gotchas
- Supabase magic link rate limit: 3/hour on free tier — disable email confirmation in Auth settings during development
- RLS caching bug on INSERT: use SECURITY DEFINER functions rather than direct table inserts
- .single() throws 406 when no rows — always use .maybeSingle() when record may not exist
- Environment variables must be prefixed VITE_ to be accessible in React
- npm run dev must be running for localhost testing
- Git push triggers automatic Vercel deployment (watch Vercel dashboard for build status)
- Supabase Auth creates user in auth.users — public.users is separate and only populated after SchoolSetup completes