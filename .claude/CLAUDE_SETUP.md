# Claude + GitHub Projects board: setup

The board is your only control surface. You create issues on the board and move cards between columns. Claude and the workflows move cards forward on their own.

## The flow

| Column | What happens there | Who moves it here |
|---|---|---|
| **Backlog** | New issues land here after Haiku picks a model (`model:haiku/sonnet/opus` label, plus a comment with the reason). | Triage (automatic) |
| **Ready** | Means "Claude, go." Picked up within ~10 minutes during working hours. | **You** |
| **In progress** | Claude is working on a branch. | Dispatcher (automatic) |
| **In review** | Claude finished and a PR exists or there's a "Create PR" link on the issue. Review it, comment `@claude ...` for changes. | Claude workflow / PR opened (automatic) |
| **Done** | The issue was closed (merging a PR with `Closes #N` does this). | Board sync (automatic) |

If a run fails, the card goes back to **Backlog** with a comment linking the logs. Moving it to **Ready** again retries.

**Changing the model:** open the card, edit its labels in the side panel (swap `model:` label), then move it to Ready.

**Why "Ready" isn't instant:** GitHub Actions can't react to board moves, so a dispatcher checks the Ready column on a schedule. To start immediately, run it by hand: Actions tab → *Claude dispatch* → *Run workflow* (or `gh workflow run claude-dispatch.yml`).

## Files

```
.github/workflows/claude-triage.yml      new issue → model label → Backlog (or straight to work if auto-start)
.github/workflows/claude-dispatch.yml    Ready → In progress, starts Claude
.github/workflows/claude.yml             Claude Code run → In review (or Backlog on failure)
.github/workflows/claude-board-sync.yml  PR opened → In review, issue closed → Done, reopened → Backlog
.github/scripts/board.sh                 board helper used by all workflows
.github/ISSUE_TEMPLATE/task.yml          issue form that gives Claude what it needs
.claude/agents/explorer.md               cheap Haiku subagent for reading code
CLAUDE.md                                project notes for Claude (edit this)
setup.sh                                 one-time labels and settings
```

## One-time setup

### 1. Board columns
Your board's **Status** field needs these options (case doesn't matter): `Backlog`, `Ready`, `In progress`, `In review`, `Done`. The Kanban template already has them.

Note the owner and number from the board URL: `github.com/users/<owner>/projects/<number>`.

In the project menu (⋯) → **Workflows**, **turn off** the built-in "Item closed", "Pull request merged" and "Item added to project" workflows so they don't fight with these ones. **Auto-add to project** is optional: triage already adds every new issue. If you keep it, set its filter to `is:issue` so PRs don't clutter the board as separate cards.

### 2. Copy the files into your repo
Commit and push everything to the **default branch**. Issue-triggered and scheduled workflows only run from there.

### 3. Claude GitHub App and subscription token
In the repo folder, open Claude Code and run `/install-github-app`. Choose the token tied to your Claude subscription. Skip its workflow files (you're using these).

Manual alternative: `claude setup-token`, save the output as the repo secret `CLAUDE_CODE_OAUTH_TOKEN`, and install https://github.com/apps/claude on the repo.

### 4. Personal access token: `CLAUDE_PAT`
The built-in workflow token can't edit your personal project board, and labels it adds can't trigger other workflows. A token of your own solves both.

1. GitHub → Settings → Developer settings → Personal access tokens → **Tokens (classic)** → Generate new token.
2. Scopes: **`repo`** and **`project`**.
3. Set an expiration and a reminder to renew it.
4. Save it: `gh secret set CLAUDE_PAT`

A classic token is used because fine-grained tokens may not have access to boards owned by a personal account. Comments and labels from the workflows will show as you.

### 5. Labels and settings
```bash
gh auth refresh -s project            # lets your local gh read the board
./setup.sh <owner> <number> false     # false: new issues wait in Backlog (recommended)
./setup.sh <owner> <number> true      # true:  new issues start right after triage
```
It also checks that the board has all five columns.

### 6. Dispatcher schedule
`claude-dispatch.yml` checks the board every 10 minutes, Monday–Friday, 7am–7pm Honduras time. Each check costs 1 Actions minute, so this uses roughly 1,600 minutes a month, which fits GitHub Pro's allowance for private repos (public repos are free). Change the `cron` lines to fit your hours. Scheduled runs can be delayed a few minutes when GitHub is busy.

### 7. Let Claude run your tests (recommended)
In `claude.yml`, uncomment the toolchain setup step and add `--allowedTools` with your install, test and lint commands. Then fill in the commands in `CLAUDE.md`.

## Day-to-day

| You want to... | Do this on the board |
|---|---|
| Add a task | **+ Add item** → create a new issue in the repo (not a draft: drafts aren't issues, so nothing picks them up). |
| Start a task | Drag it to **Ready**. |
| Start right now | Drag to Ready, then run *Claude dispatch* from the Actions tab. |
| Force a model | Set the `model:` label in the card's side panel before moving to Ready. |
| Ask for changes | Comment `@claude <what to change>` on the issue or PR (the card stays In review). |
| Retry a failed or poor run | Move it back to **Ready**. |
| Park something | Leave it in Backlog. |

## Limits and costs

- **Pro usage**: triage is one short Haiku call. Implementation runs share your Pro 5-hour and weekly limits with your own Claude Code use, and Opus uses them fastest. Moving many cards to Ready at once starts them all at once.
- **Fable** is left out on purpose: on Pro it's billed through pay-as-you-go usage credits, not your plan limits.
- **Actions minutes**: dispatcher ~1,600/month on the default schedule, plus the runs themselves (capped at 60 minutes each).
- **Who can trigger**: only the repo owner, members and collaborators.

## Troubleshooting

- **Card stays in Ready**: check the Actions tab for *Claude dispatch*. Common causes: outside the schedule, `CLAUDE_PAT` missing the `project` scope, or the card is a draft rather than a real issue.
- **"Column not found" in logs**: rename the board's Status options to match, or run `bash .github/scripts/board.sh check` locally with `PROJECT_OWNER` and `PROJECT_NUMBER` set.
- **Card went to In review but there's no PR**: open the issue; Claude posts a "Create PR" link or a question there.
- **Auth errors from Claude**: run `claude setup-token` again and update `CLAUDE_CODE_OAUTH_TOKEN`.
- **Run stops partway**: probably your Pro usage limit. Wait for the reset, then move the card to Ready again or comment `@claude continue`.
