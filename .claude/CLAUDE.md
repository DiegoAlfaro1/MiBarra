# Project notes for Claude

## Commands

<!-- Replace these with your real commands -->

- Install: `npm ci`
- Test: `npm test`
- Lint: `npm run lint`

## Rules

- Keep changes scoped to the issue. Don't refactor unrelated code.
- Use the `explorer` subagent to search and read code before editing.
- The PR description must include `Closes #<issue number>` and a short summary of what changed.
- Build the PR description from `.github/pull_request_template.md` (`gh pr create` does not apply it automatically): keep every section, fill them all, and copy the issue's acceptance criteria into the checklist.
- When you finish an issue, push your branch and open the PR yourself with `gh pr create --base main --title "..." --body "..."`. Don't just post a "Create PR" link. Then post the PR URL in your issue comment.
- If the issue is unclear or too large, comment on the issue asking for clarification instead of guessing.
- Issues are user stories (`.github/ISSUE_TEMPLATE/task.yml`). Treat every item under "Common acceptance criteria" as required for the PR, plus the story-specific criteria. If one can't be met, say so in the PR instead of ticking it.
- All design related files will be in the MiBarra-design folder with a readme to use as mapping guide of the design files, treat the html files as design guide and not as the final product
- Dont create test just for the sake of testing, create test for core functionalities that will break user experience, agent experience and developer experience on failure

## Backend: local Supabase (no account needed)

There is no hosted Supabase project yet, and you don't need one. The backend runs on the local Supabase stack (Supabase CLI + Docker, configured in `supabase/`). A missing Supabase account, project ref or API key is never a reason to leave a feature as a mockup or skip backend work.

- When a story needs data, auth, permissions or server logic, build the real backend and wire the app to it. Replace the mock data or in-memory auth for the screens the story covers; leave other screens' mocks alone.
- Where things go:
  - Tables, RLS policies, SQL functions: a new migration in `supabase/migrations/` (`npx supabase migration new <name>`). Never edit a migration that is already on `main`; add a new one.
  - Server code: Edge Functions in `supabase/functions/<name>/index.ts` (Deno), with a `[functions.<name>]` entry in `supabase/config.toml`. Put pure logic in `supabase/functions/_shared/` with a `*.test.ts` next to it so `npm test` covers it.
  - Local test data and test logins: `supabase/seed.sql`. Local auth settings: `supabase/config.toml`.
  - Database tests (RLS, constraints, SQL functions): pgTAP files in `supabase/tests/database/`.
  - Read `docs/data-model.md` and `docs/access-control.md` before changing tables or permissions, and update them when you change either.
- Apps reach Supabase only through the `supabase` client in `apps/*/src/lib/supabase.ts` (`createMiBarraClient` from `@mibarra/shared`), which reads `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`. Never hardcode URLs or keys, and never use the `service_role` key in app code.
- Don't start local Supabase in your run (`db:start`, `db:reset`, `test:db`): it's slow and its output is long. CI does it on every PR (`.github/workflows/ci.yml`): lint, typecheck and `npm test`, plus a database job that starts a fresh local Supabase, applies every migration and the seed, and runs the pgTAP tests. Create migration files with `npx supabase migration new <name>` (no Docker needed). Test logins are listed in `supabase/seed.sql` (password `password123`).
- Add pgTAP tests in `supabase/tests/database/` for every new RLS rule, SQL function or constraint, so CI checks them against a real database. With those tests in place, tick "works end to end" and "only the owner of the data can read or change it" and add "(checked by CI database tests)". Without tests that prove them, leave them unticked and say why. Never fall back to mocks because you couldn't run the database yourself.
- If a PR comment says CI failed, the failing log is in that comment. Fix the cause on the same branch and push; don't open a new PR, and don't start Supabase to reproduce it, since CI runs again on your push. If the log is cut off, read the rest with `gh run view <run-id> --log-failed`. CI asks for at most 2 automatic fixes per PR, then leaves it to the user.
- Hosted Supabase is out of scope: don't run `supabase login`, `link`, `db push` or `functions deploy`, and don't ask for a project ref or keys. Deploying is done by hand later (README, "Deploying").

## Project structure

<!-- Briefly describe the main folders, e.g. -->
<!-- - src/api: HTTP handlers -->
<!-- - src/lib: shared logic -->
