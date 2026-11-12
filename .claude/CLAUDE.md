# Project notes for Claude

## Commands

<!-- Replace these with your real commands -->

- Install: `npm ci`
- Test: `npm test`
- Lint: `npm run lint`

## Rules

- Keep changes scoped to the issue. Don't refactor unrelated code.
- Run tests and lint before committing, and fix failures you caused.
- Use the `explorer` subagent to search and read code before editing.
- The PR description must include `Closes #<issue number>` and a short summary of what changed.
- Build the PR description from `.github/pull_request_template.md` (`gh pr create` does not apply it automatically): keep every section, fill them all, and copy the issue's acceptance criteria into the checklist.
- If the issue is unclear or too large, comment on the issue asking for clarification instead of guessing.
- Issues are user stories (`.github/ISSUE_TEMPLATE/task.yml`). Treat every item under "Common acceptance criteria" as required for the PR, plus the story-specific criteria. If one can't be met, say so in the PR instead of ticking it.
- All design related files will be in the MiBarra-design folder with a readme to use as mapping guide of the design files, treat the html files as design guide and not as the final product

## Project structure

<!-- Briefly describe the main folders, e.g. -->
<!-- - src/api: HTTP handlers -->
<!-- - src/lib: shared logic -->
