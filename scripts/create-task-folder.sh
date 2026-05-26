#!/usr/bin/env bash
set -euo pipefail

TASK_ID="${1:-}"
BASE_DIR="${2:-docs/tasks}"

if [[ -z "$TASK_ID" ]]; then
  echo "Usage: $0 <task-id> [base-dir]"
  exit 1
fi

TASK_DIR="$BASE_DIR/$TASK_ID"
mkdir -p "$TASK_DIR"

create_if_missing() {
  local file="$1"
  local content="$2"
  if [[ ! -f "$file" ]]; then
    printf "%s\n" "$content" > "$file"
  fi
}

create_if_missing "$TASK_DIR/status.md" "# Status

## What has been done
- Pending.

## Why it was done
- Pending.

## Remaining work
- Pending.

## Blockers
- None."

create_if_missing "$TASK_DIR/reasoning.md" "# Reasoning

- Iteration summaries go here."
create_if_missing "$TASK_DIR/user-input.md" "# User Input

## Questions asked
- Pending.

## Answers provided
- Pending."
create_if_missing "$TASK_DIR/output.md" "# Output

- Final generated content goes here."

echo "Task folder ready: $TASK_DIR"
