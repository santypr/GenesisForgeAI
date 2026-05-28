#!/bin/bash
# Migrate an existing project to dual-path agents and skills structure (Option A)
# Detects existing agents/skills and copies them to both .github/ and .claude/ paths

set -e

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT_NAME="$(basename "$ROOT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() { echo -e "${GREEN}✓${NC} $1"; }
log_warn() { echo -e "${YELLOW}⚠${NC} $1"; }
log_error() { echo -e "${RED}✗${NC} $1"; }

normalize_kebab_case() {
  echo "$1" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9-]/-/g' | sed 's/-\+/-/g' | sed 's/^-\|-$//'
}

escape_yaml_double_quotes() {
  local str="$1"
  echo "$str" | sed 's/"/\\"/g'
}

extract_purpose() {
  local file="$1"
  awk '/^## Purpose/,/^##[^#]/ { if (/^##/) { getline; print; exit } }' "$file" | sed 's/^[[:space:]]*//; s/[[:space:]]*$//' | tr -d '\r'
}

# Detect existing agents in multiple possible locations
detect_agents() {
  local agent_locations=("instructions/agents" "src/agents" "agents" ".agents" ".github/agents")
  for loc in "${agent_locations[@]}"; do
    if [ -d "$ROOT_DIR/$loc" ] && [ "$(find "$ROOT_DIR/$loc" -maxdepth 1 -name '*.agent.md' -o -name '*agent.md' 2>/dev/null | wc -l)" -gt 0 ]; then
      echo "$loc"
      return 0
    fi
  done
  return 1
}

# Detect existing skills in multiple possible locations
detect_skills() {
  local skill_locations=("instructions/skills" "src/skills" "skills" ".skills" ".github/skills")
  for loc in "${skill_locations[@]}"; do
    if [ -d "$ROOT_DIR/$loc" ] && [ "$(find "$ROOT_DIR/$loc" -maxdepth 1 -name '*.skill.md' -o -name '*skill.md' 2>/dev/null | wc -l)" -gt 0 ]; then
      echo "$loc"
      return 0
    fi
  done
  return 1
}

# Detect existing instructions file
detect_instructions() {
  local instruction_locations=("copilot-instructions.md" ".github/copilot-instructions.md" "INSTRUCTIONS.md" "AGENTS.md")
  for loc in "${instruction_locations[@]}"; do
    if [ -f "$ROOT_DIR/$loc" ]; then
      echo "$loc"
      return 0
    fi
  done
  return 1
}

# Copy agents to both .github and .claude
migrate_agents() {
  local source_dir="$1"
  log_info "Migrating agents from $source_dir..."
  mkdir -p "$ROOT_DIR/.github/agents" "$ROOT_DIR/.claude/agents"

  # Find all agent files (handle .agent.md and agent.md)
  local agent_files
  agent_files=$(find "$ROOT_DIR/$source_dir" -maxdepth 1 \( -name '*.agent.md' -o -name '*agent.md' \) -type f)

  if [ -z "$agent_files" ]; then
    log_warn "No agent files found in $source_dir"
    return 1
  fi

  while IFS= read -r agent_file; do
    local basename
    basename="$(basename "$agent_file")"
    cp "$agent_file" "$ROOT_DIR/.github/agents/$basename"
    cp "$agent_file" "$ROOT_DIR/.claude/agents/$basename"
    log_info "Migrated agent: $basename"
  done <<< "$agent_files"
}

# Copy skills to both .github and .claude
migrate_skills() {
  local source_dir="$1"
  log_info "Migrating skills from $source_dir..."
  mkdir -p "$ROOT_DIR/.github/skills" "$ROOT_DIR/.claude/skills"

  # Find all skill files (handle .skill.md and skill.md)
  local skill_files
  skill_files=$(find "$ROOT_DIR/$source_dir" -maxdepth 1 \( -name '*.skill.md' -o -name '*skill.md' \) -type f)

  if [ -z "$skill_files" ]; then
    log_warn "No skill files found in $source_dir"
    return 1
  fi

  while IFS= read -r skill_file; do
    local skill_basename skill_stem skill_name skill_purpose skill_description
    skill_basename="$(basename "$skill_file")"
    skill_stem="${skill_basename%.skill.md}"
    skill_stem="${skill_stem%skill.md}"
    skill_name="$(normalize_kebab_case "$skill_stem")"
    skill_purpose="$(extract_purpose "$skill_file")"
    skill_description="${skill_purpose:-Generated skill for $skill_stem.}"
    skill_description="$(escape_yaml_double_quotes "$skill_description")"

    mkdir -p "$ROOT_DIR/.github/skills/$skill_name"
    mkdir -p "$ROOT_DIR/.claude/skills/$skill_name"

    # Build SKILL.md with frontmatter
    {
      echo "---"
      echo "name: $skill_name"
      echo "description: \"$skill_description\""
      echo "---"
      echo ""
      cat "$skill_file"
    } > "$ROOT_DIR/.github/skills/$skill_name/SKILL.md"

    cp "$ROOT_DIR/.github/skills/$skill_name/SKILL.md" "$ROOT_DIR/.claude/skills/$skill_name/SKILL.md"
    log_info "Migrated skill: $skill_name"
  done <<< "$skill_files"
}

# Generate AGENTS.md (always-on for all agents)
write_agents_manifest() {
  cat > "$ROOT_DIR/AGENTS.md" <<'EOF'
# AGENTS

This repository shares always-on guidance for any AI coding agent.

## Generated assets
- Project instructions (Copilot): `.github/copilot-instructions.md`
- Project instructions (Claude): `CLAUDE.md`
- Custom agents (Copilot + GitHub.com): `.github/agents/*.agent.md`
- Custom agents (Claude Code + VS Code): `.claude/agents/*.agent.md`
- Agent skills: `.github/skills/*/SKILL.md` and `.claude/skills/*/SKILL.md`

## Preferred workflow
1. Keep documentation aligned with code and architecture changes.
2. Use the custom agents and skills when a task matches their responsibilities.

**Note:** This structure was auto-generated by GenesisForgeAI migration.
EOF
  log_info "Generated AGENTS.md"
}

# Generate CLAUDE.md (always-on for Claude Code)
write_claude_md() {
  cat > "$ROOT_DIR/CLAUDE.md" <<EOF
# Claude instructions for $PROJECT_NAME

This workspace was migrated to GenesisForgeAI dual-path structure.

## Project context
- Name: \`$PROJECT_NAME\`
- Agents live in: \`.claude/agents/*.agent.md\`
- Skills live in: \`.claude/skills/*/SKILL.md\`

See AGENTS.md for shared always-on guidance.
EOF
  log_info "Generated CLAUDE.md"
}

# Generate/update .github/copilot-instructions.md
write_copilot_instructions() {
  local existing_instructions="$1"

  local instructions_content=""
  if [ -f "$ROOT_DIR/$existing_instructions" ]; then
    instructions_content=$(cat "$ROOT_DIR/$existing_instructions")
    log_info "Using existing instructions from $existing_instructions"
  else
    instructions_content="This workspace was migrated to GenesisForgeAI dual-path structure.\n\nCustom agents and skills are available; see AGENTS.md for guidance."
  fi

  cat > "$ROOT_DIR/.github/copilot-instructions.md" <<EOF
---
applyTo: "**"
---

# Copilot instructions for $PROJECT_NAME

$instructions_content
EOF
  log_info "Generated .github/copilot-instructions.md"
}

# Generate/update registration.json for VS Code extension
write_registration() {
  mkdir -p "$ROOT_DIR/.genesisforge"
  cat > "$ROOT_DIR/.genesisforge/registration.json" <<EOF
{
  "projectName": "$PROJECT_NAME",
  "copilotInstructionsPath": ".github/copilot-instructions.md",
  "claudeInstructionsPath": "CLAUDE.md",
  "agentsManifestPath": "AGENTS.md",
  "agentsPath": ".github/agents",
  "claudeAgentsPath": ".claude/agents",
  "skillsPath": ".github/skills",
  "claudeSkillsPath": ".claude/skills",
  "migratedAt": "$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
}
EOF
  log_info "Generated .genesisforge/registration.json"
}

# Main migration flow
main() {
  echo ""
  log_info "Starting GenesisForgeAI migration for: $PROJECT_NAME"
  echo ""

  # Detect what needs to be migrated
  local agent_source instruction_source skill_source
  agent_source=$(detect_agents) || agent_source=""
  instruction_source=$(detect_instructions) || instruction_source=""
  skill_source=$(detect_skills) || skill_source=""

  if [ -z "$agent_source" ] && [ -z "$skill_source" ] && [ -z "$instruction_source" ]; then
    log_warn "No existing agents, skills, or instructions detected."
    log_info "Creating minimal dual-path structure..."
  else
    echo ""
    if [ -n "$agent_source" ]; then
      log_info "Detected agents at: $agent_source"
    fi
    if [ -n "$skill_source" ]; then
      log_info "Detected skills at: $skill_source"
    fi
    if [ -n "$instruction_source" ]; then
      log_info "Detected instructions at: $instruction_source"
    fi
    echo ""
  fi

  # Create base structure
  mkdir -p "$ROOT_DIR/.github/agents" "$ROOT_DIR/.github/skills"
  mkdir -p "$ROOT_DIR/.claude/agents" "$ROOT_DIR/.claude/skills"

  # Migrate detected assets
  if [ -n "$agent_source" ]; then
    migrate_agents "$agent_source"
  fi

  if [ -n "$skill_source" ]; then
    migrate_skills "$skill_source"
  fi

  # Generate required files
  echo ""
  write_agents_manifest
  write_claude_md
  write_copilot_instructions "$instruction_source"
  write_registration

  echo ""
  log_info "Migration complete!"
  echo ""
  echo "Generated structure:"
  echo "  .github/agents/*.agent.md       (Copilot + GitHub.com)"
  echo "  .claude/agents/*.agent.md       (Claude Code + VS Code)"
  echo "  .github/skills/*/SKILL.md       (Copilot + open standard)"
  echo "  .claude/skills/*/SKILL.md       (Claude Code)"
  echo "  AGENTS.md                       (Always-on for all agents)"
  echo "  CLAUDE.md                       (Always-on for Claude)"
  echo "  .github/copilot-instructions.md (Always-on for Copilot)"
  echo "  .genesisforge/registration.json (Extension discovery)"
  echo ""
  log_info "Don't forget to commit these changes!"
  echo ""
}

main "$@"
