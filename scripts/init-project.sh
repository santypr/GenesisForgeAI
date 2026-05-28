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

normalize_kebab_case() {
  printf '%s' "$1" \
    | sed -E 's/([[:lower:][:digit:]])([[:upper:]])/\1-\2/g' \
    | tr '[:upper:]' '[:lower:]' \
    | sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//'
}

escape_yaml_double_quotes() {
  local value="$1"
  value="${value//\\/\\\\}"
  value="${value//\"/\\\"}"
  printf '%s' "$value"
}

extract_purpose() {
  awk '
    { sub(/\r$/, "") }
    /^## Purpose$/ {
      while (getline) {
        sub(/\r$/, "")
        if ($0 !~ /^[[:space:]]*$/) {
          print
          exit
        }
      }
    }
  ' "$1"
}

write_copilot_instructions() {
  local target_dir="$1"
  local template_source="$2"

  cat > "$target_dir/.github/copilot-instructions.md" <<EOF
---
applyTo: "**"
---
# GenesisForgeAI workspace instructions

This workspace was bootstrapped by GenesisForgeAI. Follow the project manifest and generated template structure before creating new files or changing conventions.

## Project manifest
- Name: \`$PROJECT_NAME\`
- Type: \`$PROJECT_TYPE\`
- Template source: \`$template_source\`
- Clean Architecture: \`$CLEAN_ARCH\`
- Automated documentation: \`$AUTO_DOCS\`
- CI/CD templates requested: \`$CICD\`
- Testing templates requested: \`$TESTING\`
- Infrastructure templates requested: \`$IAC\`

$(cat "$ROOT_DIR/instructions/system/globalConstitution.md")

$(cat "$ROOT_DIR/instructions/system/collaborationProtocol.md")
EOF
}

write_agents_manifest() {
  local target_dir="$1"

  cat > "$target_dir/AGENTS.md" <<EOF
# AGENTS

This repository shares always-on guidance for any AI coding agent that works in the project.

## Generated Copilot assets
- Project-wide instructions (Copilot): \`.github/copilot-instructions.md\`
- Project-wide instructions (Claude): \`CLAUDE.md\`
- Custom agents (Copilot + GitHub.com): \`.github/agents/*.agent.md\`
- Custom agents (Claude Code + VS Code): \`.claude/agents/*.agent.md\`
- Agent skills: \`.github/skills/*/SKILL.md\` and \`.claude/skills/*/SKILL.md\`

## Preferred workflow
1. Read \`project.json\` and the existing template structure before making structural changes.
2. Keep documentation under \`docs/\` aligned with code and architecture changes.
3. Use the generated custom agents and skills when a task matches their responsibilities.

$(cat "$ROOT_DIR/instructions/system/globalConstitution.md")

$(cat "$ROOT_DIR/instructions/system/collaborationProtocol.md")
EOF
}

write_claude_md() {
  local target_dir="$1"
  local template_source="$2"

  cat > "$target_dir/CLAUDE.md" <<EOF
# Claude instructions for $PROJECT_NAME

This workspace was bootstrapped by GenesisForgeAI.

## Project context
- Name: \`$PROJECT_NAME\`
- Type: \`$PROJECT_TYPE\`
- Template source: \`$template_source\`
- Clean Architecture: \`$CLEAN_ARCH\`

## Always-on guidance
See [AGENTS.md](./AGENTS.md) for project-wide rules, collaboration protocol, and agent pipeline.

## Claude-specific agent and skill locations
- Custom agents: \`.claude/agents/*.agent.md\`
- Agent skills: \`.github/skills/*/SKILL.md\` and \`.claude/skills/*/SKILL.md\`

## Project instructions (Copilot)
See [\`.github/copilot-instructions.md\`](./.github/copilot-instructions.md) for the full Copilot instruction set.
EOF
}

copy_agent_files() {
  local target_dir="$1"
  local agent_file

  mkdir -p "$target_dir/.github/agents" "$target_dir/.claude/agents"
  for agent_file in "$ROOT_DIR"/instructions/agents/*.agent.md; do
    local dest_name
    dest_name="$(basename "$agent_file")"
    cp "$agent_file" "$target_dir/.github/agents/$dest_name"
    cp "$agent_file" "$target_dir/.claude/agents/$dest_name"
  done
}

build_skill_md() {
  local skill_file="$1"
  local skill_name="$2"
  local skill_description="$3"

  printf -- '---\nname: %s\ndescription: "%s"\n---\n\n' "$skill_name" "$skill_description"
  cat "$skill_file"
}

copy_skill_files() {
  local target_dir="$1"
  local skill_file

  mkdir -p "$target_dir/.github/skills" "$target_dir/.claude/skills"
  for skill_file in "$ROOT_DIR"/instructions/skills/*.skill.md; do
    local skill_basename skill_stem skill_name skill_purpose skill_description
    skill_basename="$(basename "$skill_file")"
    skill_stem="${skill_basename%.skill.md}"
    skill_name="$(normalize_kebab_case "$skill_stem")"
    skill_purpose="$(extract_purpose "$skill_file")"
    skill_description="${skill_purpose:-Generated GenesisForgeAI skill for $skill_stem tasks.}"
    skill_description="$(escape_yaml_double_quotes "$skill_description")"

    mkdir -p "$target_dir/.github/skills/$skill_name"
    build_skill_md "$skill_file" "$skill_name" "$skill_description" \
      > "$target_dir/.github/skills/$skill_name/SKILL.md"

    mkdir -p "$target_dir/.claude/skills/$skill_name"
    cp "$target_dir/.github/skills/$skill_name/SKILL.md" \
       "$target_dir/.claude/skills/$skill_name/SKILL.md"
  done
}

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

cp -Rn "$TEMPLATE_DIR"/. "$TARGET_DIR"/ || true
rm -f "$TARGET_DIR/agents.instructions.md"
mkdir -p "$TARGET_DIR/docs" "$TARGET_DIR/.github" "$TARGET_DIR/.claude" "$TARGET_DIR/.genesisforge"

write_copilot_instructions "$TARGET_DIR" "$(basename "$TEMPLATE_DIR")"
write_agents_manifest "$TARGET_DIR"
write_claude_md "$TARGET_DIR" "$(basename "$TEMPLATE_DIR")"
copy_agent_files "$TARGET_DIR"
copy_skill_files "$TARGET_DIR"

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
  "copilotInstructionsPath": ".github/copilot-instructions.md",
  "claudeInstructionsPath": "CLAUDE.md",
  "agentsManifestPath": "AGENTS.md",
  "agentsPath": ".github/agents",
  "claudeAgentsPath": ".claude/agents",
  "skillsPath": ".github/skills",
  "claudeSkillsPath": ".claude/skills",
  "docsPath": "docs",
  "registeredAt": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
JSON

mkdir -p "$TARGET_DIR/docs/tasks"
if [[ "$AUTO_DOCS" == "true" ]]; then
  bash "$ROOT_DIR/scripts/generate-documentation.sh" "$TARGET_DIR/docs"
fi

echo "Project initialized at: $TARGET_DIR"
