# Pact90 build plan

Season: Thu 1 Oct to Thu 31 Dec 2026 (92 days). Today is Sun 27 Sep, so the real app has to work by Thursday.

## Decisions so far

| Topic | Decision |
| --- | --- |
| Product | Public-facing. Anyone can sign in with Google and gets a profile. Data stays locked until an admin approves them. |
| Sign-in | Google only, through Neon Auth (Managed Better Auth). Email/password is turned off on the branch. |
| Google keys | Neon's shared development credentials for now. Swap to our own Google Cloud client before inviting anyone outside the four of us. |
| Admin | `abhishekbhagawati@gmail.com`, set through the `ADMIN_EMAILS` env var (comma separated). Admins are auto-approved. |
| Before approval | A waiting screen only. Goal setup happens after approval. |
| Squads | One shared pact. Every approved person joins it. A `squads` table exists so more can be added later. |
| Backend | Neon Postgres, reached only from Next.js Route Handlers (`app/api/**`) and server components, using Drizzle ORM over `@neondatabase/serverless`. |
| Hosting | Vercel. |
| Look | The Clean theme: Barlow and Barlow Condensed, member colours blue, orange, aqua and violet. |

## Modules

Onboarding asks what people want to work on, then turns each pick into goals on their daily check-in. Defined in `apps/web/lib/modules.ts`.

| Module | Adds | Default privacy |
| --- | --- | --- |
| Workouts | Sessions per week (1 to 7), with what you trained | Everything |
| Weight | Start weight, goal weight, daily weigh-in (not scored) | Hit or miss (squad sees % change only) |
| Steps | Daily step target | Everything |
| Food | Protein, calories, no junk, no added sugar, home-cooked (pick any) | Everything |
| Water | Litres a day | Everything |
| Sleep | Bedtime check (renamable) and/or hours | Everything |
| Habits | Up to 6 custom yes/no habits, with presets | Everything |
| Reading | Pages a day | Everything |
| Deep work | Focused hours a day | Everything |
| Screen time | Minutes under a daily limit | Everything |
| Spending | Daily limit in £/$/€/₹, optional no-spend days | Hit or miss |
| Mood | 1 to 5, never scored | Just me |

Privacy per module: Everything (numbers visible), Hit or miss (only whether you hit it), Just me (hidden, not scored). Enforced on the server in `lib/squad-data.ts`.

Ideas for later modules: progress photos (private, monthly, needs Neon object storage), body measurements, study sessions with subjects, meditation minutes, cold exposure, caffeine cut-off, no-takeaway weeks, savings goal.

## Email

Neon doesn't offer a general email API. Neon Auth sends its own auth emails (sign-in codes, verification, password reset) from a shared, rate-limited sender (`auth@mail.myneon.app`) that's for development only, and we don't use any of them while sign-in is Google-only. For app emails (nudges, weekly recap) use Resend: free plan is 3,000 emails a month and 100 a day, with 3 domains. Plenty for a small squad.

## Development workflow

- `next dev` talks to the Neon `dev` branch (`.env.development.local` at the repo root); production credentials stay in `.env.local`.
- The dev branch has email/password sign-in on (production is Google-only) with four test accounts: alex, blake, casey, drew `@example.com`. Password is `DEV_TEST_PASSWORD` in `apps/web/.env.local`.
- `bun run scripts/seed-dev.ts --until 2026-11-14 --reset` fills the test accounts with check-ins (refuses to run on production).
- `PACT_TODAY=2026-11-14` in `apps/web/.env.local` pins "today" in development to preview mid-season.
- Migrations: `bun run db:generate`, `bun run db:migrate` (dev), `bun run db:migrate:prod` (production).

## Still open

- Real names and which colour each friend gets.
- Scoring rule for standings (current prototype: daily goals hit rate, workouts prorated weekly) and the weekly stake.
- Whether weight in kg is visible to the squad or opt-in (default in the plan: opt-in, others see only change).
- Which season view goes on home (Lanes, Calendar grids, The race, Week grid, Momentum or Rings).

## Phase 1: front door and access (done)

1. Landing page at `/`: illustrated hero, live product visuals built from the real components, countdown to 1 Oct, Google sign-in.
2. Brand mark and favicon: `app/icon.svg`, `app/favicon.ico`, `app/apple-icon.png`, plus an Open Graph image.
3. Neon Auth wiring:
   - `lib/auth/server.ts` (`createNeonAuth`), `lib/auth/client.ts` (`createAuthClient`).
   - `app/api/auth/[...path]/route.ts` proxies to Neon Auth.
   - `proxy.ts` protects app routes and completes the OAuth verifier exchange.
4. `profiles` table keyed on `neon_auth.user.id` with `status` (pending, approved, rejected) and `is_admin`.
5. Gating: every app route checks the viewer server-side. Pending or rejected people go to `/waiting`.
6. Admin portal at `/admin`: pending, approved and rejected lists with approve and reject, backed by `GET /api/admin/members` and `PATCH /api/admin/members/[id]`.

## Phase 2: real data model (done)

Built as: `squads`, `squad_members` (colour, display name, onboarded), `goals` (module, metric, target, weekly target, start value, visibility; archived on reshape mid-season), `check_ins`, `entries`, `reactions`, `comments`, `nudges`. Routes: `PUT /api/setup`, `PUT /api/check-ins/[day]` (today or yesterday), `POST/DELETE /api/feed/reactions`, `POST /api/feed/comments`, `POST /api/nudges`. The original sketch is below for reference.

Tables (all in `public`, all keyed by profile `user_id`):

- `squads` (id, name, starts_on, ends_on) and `squad_members` (squad_id, user_id, colour, joined_at).
- `goals` (id, user_id, squad_id, label, kind check or number, unit, target, compare min or max, step, weekly_target, scored, position, archived_at).
- `day_logs` (user_id, day date, workout_name, saved_at), primary key (user_id, day).
- `goal_entries` (user_id, day, goal_id, checked boolean, value numeric).
- `weigh_ins` (user_id, day, kg) kept apart from goals so privacy rules are easy to apply.
- `feed_events` (id, squad_id, user_id, day, kind, title, meta jsonb, created_at).
- `reactions` (event_id, user_id, emoji), `comments` (id, event_id, user_id, body, created_at).
- `nudges` (from_user, to_user, day).

API routes:

- `GET /api/me`, `PATCH /api/me` (display name, colour, kg visibility).
- `GET/PUT /api/goals` (setup flow saves here).
- `GET /api/squad?from=&to=` returns members, goals and logs for a date range (one round trip for home, standings and profiles).
- `PUT /api/check-ins/[day]` saves one day (workout, numbers, checks) and writes feed events in one transaction.
- `POST/DELETE /api/feed/[id]/reactions`, `POST /api/feed/[id]/comments`.
- `POST /api/nudges`.

Every handler: `getSession`, load profile, reject unless approved, then check squad membership for the rows it touches.

## Phase 3: swap the prototype onto real data (done, sample data removed from the app)

The landing page still uses a made-up demo squad (`lib/demo.ts`) for its previews.

1. Replace `lib/season.ts` sample generator with data from `/api/squad`, keeping the scoring helpers.
2. `squad-store` becomes a thin client cache over the API, with optimistic check-ins.
3. Setup flow writes real goals and becomes the first screen after approval.
4. Check-in sheet saves through `PUT /api/check-ins/[day]` with a day picker for yesterday (allow editing the last 2 days).
5. Standings, feed, profiles and recap read from real data. Empty states for day 1.
6. Timezones: store `day` as a date in the member's local time zone, captured at check-in.

## Phase 4: detail pass

- Motion audit: consistent spring, no layout jumps, reduced-motion paths.
- Empty, loading and error states on every screen.
- Mobile safe areas, haptics-feel press states, 44px targets.
- Accessibility pass: focus order, chart tables, contrast in both themes.
- Weekly recap generated from real data each Monday.

## Phase 5: launch

- Own Google OAuth client with Pact90 branding, redirect URI `{NEON_AUTH_BASE_URL}/callback/google`.
- Vercel project, env vars (`DATABASE_URL`, `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET`, `ADMIN_EMAILS`), production domain added to Neon Auth trusted domains, wildcard for previews.
- Custom SMTP is not needed while we are Google-only.
