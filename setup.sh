#!/usr/bin/env bash
# One-time repo setup: labels, board settings, and the auto-start setting.
#
# Usage: ./setup.sh <project-owner> <project-number> [autostart]
#   project-owner:  your GitHub username (or org) that owns the board
#   project-number: the number in the board URL, e.g. github.com/users/you/projects/3 → 3
#   autostart:      "false" (default) = new issues go to Backlog; you move them to Ready
#                   "true"            = new issues start immediately after triage
#
# Needs gh with the "project" scope: gh auth refresh -s project
set -euo pipefail

if [ $# -lt 2 ]; then
  echo "Usage: ./setup.sh <project-owner> <project-number> [true|false]"; exit 1
fi

OWNER="$1"; NUMBER="$2"; AUTOSTART="${3:-false}"

gh label create claude       --color 7C3AED --description "Claude is working on this (set automatically)" --force
gh label create model:haiku  --color 22C55E --description "Simple task: run with Haiku"   --force
gh label create model:sonnet --color 3B82F6 --description "Typical task: run with Sonnet" --force
gh label create model:opus   --color EF4444 --description "Complex task: run with Opus"   --force

gh variable set CLAUDE_PROJECT_OWNER  --body "$OWNER"
gh variable set CLAUDE_PROJECT_NUMBER --body "$NUMBER"
gh variable set CLAUDE_AUTOSTART      --body "$AUTOSTART"

echo
echo "Checking the board columns..."
PROJECT_OWNER="$OWNER" PROJECT_NUMBER="$NUMBER" bash "$(dirname "$0")/.github/scripts/board.sh" check

echo
echo "Done: labels, CLAUDE_PROJECT_OWNER=$OWNER, CLAUDE_PROJECT_NUMBER=$NUMBER, CLAUDE_AUTOSTART=$AUTOSTART."
echo "Still to do (see CLAUDE_SETUP.md):"
echo "  - Secret CLAUDE_CODE_OAUTH_TOKEN  (from: claude setup-token)"
echo "  - Secret CLAUDE_PAT               (classic token with repo + project scopes)"
