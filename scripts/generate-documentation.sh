#!/usr/bin/env bash
set -euo pipefail

DOC_ROOT="${1:-docs}"
STAMP="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

mkdir -p "$DOC_ROOT"

if [[ -f "$DOC_ROOT/changelog/CHANGELOG.md" ]]; then
  printf "\n## %s\n- Documentation refresh triggered by automation\n" "$STAMP" >> "$DOC_ROOT/changelog/CHANGELOG.md"
fi

echo "Documentation generation completed at $STAMP"
