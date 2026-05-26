#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECT_NAME=""
PROJECT_TYPE=""
CLEAN_ARCH="false"
AUTO_DOCS="false"
CICD="false"
TESTING="false"
IAC="false"

ask_yes_no() {
  local prompt="$1"
  local answer
  while true; do
    read -r -p "$prompt (y/n): " answer
    case "${answer,,}" in
      y|yes) echo "true"; return ;;
      n|no) echo "false"; return ;;
      *) echo "Please answer y or n." ;;
    esac
  done
}

if [[ "${1:-}" == "--help" ]]; then
  cat <<HELP
Usage: bash scripts/init-project.sh
Interactive idempotent project bootstrap for GenesisForgeAI.
HELP
  exit 0
fi

echo "GenesisForgeAI :: init-project"
read -r -p "Project name: " PROJECT_NAME
PROJECT_NAME="${PROJECT_NAME:-genesis-project}"

PS3="What type of project do you want to create? "
options=("React+TS" ".NET API" "Flutter" "Full-stack" "Other")
select opt in "${options[@]}"; do
  case "$opt" in
    "React+TS"|".NET API"|"Flutter"|"Full-stack"|"Other") PROJECT_TYPE="$opt"; break ;;
    *) echo "Invalid option" ;;
  esac
done

CLEAN_ARCH="$(ask_yes_no 'Do you want Clean Architecture?')"
AUTO_DOCS="$(ask_yes_no 'Do you want automated documentation generation?')"
CICD="$(ask_yes_no 'Do you want CI/CD templates?')"
TESTING="$(ask_yes_no 'Do you want testing templates?')"
IAC="$(ask_yes_no 'Do you want infrastructure templates (IaC)?')"

TARGET_DIR="$ROOT_DIR/generated-projects/$PROJECT_NAME"
mkdir -p "$TARGET_DIR"

case "$PROJECT_TYPE" in
  "React+TS") TEMPLATE_DIR="$ROOT_DIR/templates/react-template" ;;
  ".NET API") TEMPLATE_DIR="$ROOT_DIR/templates/dotnet-api-template" ;;
  "Flutter") TEMPLATE_DIR="$ROOT_DIR/templates/flutter-template" ;;
  "Full-stack") TEMPLATE_DIR="$ROOT_DIR/templates/fullstack-template" ;;
  *) TEMPLATE_DIR="$ROOT_DIR/templates/documentation-template" ;;
esac

cp -R --update=none "$TEMPLATE_DIR"/. "$TARGET_DIR"/ || true
mkdir -p "$TARGET_DIR/docs" "$TARGET_DIR/instructions" "$TARGET_DIR/.genesisforge"

cat > "$TARGET_DIR/project.json" <<JSON
{
  "name": "$PROJECT_NAME",
  "type": "$PROJECT_TYPE",
  "cleanArchitecture": $CLEAN_ARCH,
  "automatedDocumentation": $AUTO_DOCS,
  "ciCdTemplates": $CICD,
  "testingTemplates": $TESTING,
  "infrastructureTemplates": $IAC,
  "templateSource": "$(basename "$TEMPLATE_DIR")"
}
JSON

cat > "$TARGET_DIR/.genesisforge/registration.json" <<JSON
{
  "projectManifest": "project.json",
  "agentsPath": "instructions/agents",
  "skillsPath": "instructions/skills",
  "docsPath": "docs",
  "registeredAt": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
JSON

mkdir -p "$TARGET_DIR/docs/tasks"
if [[ "$AUTO_DOCS" == "true" ]]; then
  bash "$ROOT_DIR/scripts/generate-documentation.sh" "$TARGET_DIR/docs"
fi

echo "Project initialized at: $TARGET_DIR"
