#!/usr/bin/env bash
# Helper for moving issues between columns on a GitHub Projects (v2) board.
#
# Usage:
#   board.sh set-status <issue-number> "<Status>"   # adds the issue to the board if needed
#   board.sh list "<Status>"                        # prints open-issue numbers in that column (this repo)
#   board.sh check                                  # verifies the board has the expected columns
#
# Env: GH_TOKEN (PAT with project access), PROJECT_OWNER, PROJECT_NUMBER, GH_REPO (owner/repo)
set -euo pipefail

: "${PROJECT_OWNER:?Set the CLAUDE_PROJECT_OWNER repo variable}"
: "${PROJECT_NUMBER:?Set the CLAUDE_PROJECT_NUMBER repo variable}"

REQUIRED=("Backlog" "Ready" "In progress" "In review" "Done")

status_field() {
  gh project field-list "$PROJECT_NUMBER" --owner "$PROJECT_OWNER" --format json \
    | jq -c '.fields[] | select(.name == "Status")'
}

cmd="${1:-}"; shift || true

case "$cmd" in
  set-status)
    number="$1"; status="$2"
    : "${GH_REPO:?GH_REPO not set}"
    project_id="$(gh project view "$PROJECT_NUMBER" --owner "$PROJECT_OWNER" --format json --jq .id)"
    field="$(status_field)"
    field_id="$(jq -r .id <<<"$field")"
    option_id="$(jq -r --arg s "$status" \
      '.options[] | select((.name | ascii_downcase) == ($s | ascii_downcase)) | .id' <<<"$field")"
    if [ -z "$option_id" ]; then
      echo "Column '$status' not found. Board columns are:" >&2
      jq -r '.options[].name' <<<"$field" >&2
      exit 1
    fi
    # item-add returns the existing item if the issue is already on the board
    item_id="$(gh project item-add "$PROJECT_NUMBER" --owner "$PROJECT_OWNER" \
      --url "https://github.com/$GH_REPO/issues/$number" --format json --jq .id)"
    gh project item-edit --id "$item_id" --project-id "$project_id" \
      --field-id "$field_id" --single-select-option-id "$option_id" >/dev/null
    echo "Issue #$number → $status"
    ;;

  list)
    status="$1"
    : "${GH_REPO:?GH_REPO not set}"
    gh project item-list "$PROJECT_NUMBER" --owner "$PROJECT_OWNER" --format json --limit 500 \
      | jq -r --arg s "$status" --arg r "$GH_REPO" '
          .items[]
          | select(.content.type == "Issue")
          | select((.content.repository // "" | ascii_downcase) == ($r | ascii_downcase))
          | select((.status // "" | ascii_downcase) == ($s | ascii_downcase))
          | .content.number'
    ;;

  check)
    field="$(status_field)"
    if [ -z "$field" ]; then echo "No 'Status' field found on the board." >&2; exit 1; fi
    echo "Board columns: $(jq -r '[.options[].name] | join(", ")' <<<"$field")"
    missing=0
    for s in "${REQUIRED[@]}"; do
      if ! jq -e --arg s "$s" '.options[] | select((.name | ascii_downcase) == ($s | ascii_downcase))' <<<"$field" >/dev/null; then
        echo "  Missing column: $s" >&2; missing=1
      fi
    done
    [ "$missing" = 0 ] && echo "All required columns found." || exit 1
    ;;

  *)
    echo "Usage: board.sh set-status <n> <Status> | list <Status> | check" >&2; exit 2 ;;
esac
