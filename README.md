# GenesisForgeAI

![License: GFPL v1.0](https://img.shields.io/badge/License-GFPL_v1.0-4B79A1.svg?style=for-the-badge)

GenesisForgeAI is a multi-project starter kit powered by Copilot Agents, Copilot Skills, and instruction files. It bootstraps and maintains modern software projects:

- React + TypeScript LOB web apps
- .NET backend APIs (minimal APIs, clean architecture, DDD optional)
- Flutter mobile apps
- Full-stack (React + .NET)
- Future project types via extensible skills and agents

## Repository Purpose

This repository provides:

- An idempotent `init-project` bootstrap workflow
- Reusable templates in `/templates`
- Agent and skill contracts in `/instructions`
- A markdown documentation engine in `/docs`
- A minimal functional VS Code extension in `/vscode-extension`

## Run the Init Process

```bash
bash scripts/init-project.sh
```

What `init-project` does:

1. Asks project questions (type, clean architecture, docs, CI/CD, tests, IaC)
2. Generates base folders and copies templates
3. Generates Copilot-compatible instruction, agent, skill, docs scaffolding and `project.json`
4. Registers the project for the VS Code extension at `.genesisforge/registration.json`

The script is idempotent: running it again updates generated metadata without duplicating folders.

## VS Code Extension Usage

Path: `/vscode-extension`

Installable as VS Code extension:

```bash
cd vscode-extension
npm install
npm run package
```

Then in VS Code run `Extensions: Install from VSIX...` and select the generated `.vsix`.

Commands:

- `GenesisForgeAI`
- `GenesisForgeAI: Init Project`
- `GenesisForgeAI: Add Technologies`
- `GenesisForgeAI: Run Agent`
- `GenesisForgeAI: Run Skill`
- `GenesisForgeAI: Generate Documentation`
- `GenesisForgeAI: Create Task Folder`

**In-place detection:** When `Init Project` runs it automatically checks for an existing `project.json`, `.genesisforge/registration.json`, or detectable technology stack (React+TS, .NET, Flutter). If found, you are asked whether to initialize GenesisForge directly in the workspace folder rather than creating a new subfolder under `generated-projects/`.

**Multi-select technologies:** The technology picker is a multi-select quick pick. Detected technologies are pre-checked. Selecting React+TS together with .NET API automatically resolves the primary type to Full-stack for legacy compatibility. The `project.json` manifest records both `technologies[]` / `templateSources[]` arrays and the legacy `type` / `templateSource` scalar fields.

**Add Technologies:** Run `GenesisForgeAI: Add Technologies` at any time to extend an initialized project with additional technology templates without re-running the full bootstrap.

The extension also exposes UI panels for:

- Project Manifest
- Agents
- Skills
- Documentation Status

## How Agents and Skills Work

- Always-on Copilot instructions live in `/.github/copilot-instructions.md`.
- Always-on Claude instructions live in `/CLAUDE.md` (references `AGENTS.md`).
- Shared multi-agent guidance lives in `/AGENTS.md`.
- Custom agents live in `/.github/agents` (VS Code Copilot + GitHub.com) and `/.claude/agents` (Claude Code + VS Code). Both are generated from the same source in `/instructions/agents`.
- Skills live in `/.github/skills/<skill-name>/SKILL.md` and `/.claude/skills/<skill-name>/SKILL.md`. Both are generated from `/instructions/skills`.
- GenesisForgeAI sources these generated artifacts from `/instructions`.

## Documentation Generation

Documentation is stored in `/docs` and generated/updated through:

- `generateDocumentation.skill.md`
- `updateDocumentation.skill.md`
- `documentationEngineer.agent.md`
- VS Code command: `GenesisForgeAI: Generate Documentation`

Task outputs are captured under `/docs/tasks/<task-id>/` with status, reasoning, user input, and output artifacts.

## Author

- **Santiago**
- Project: **GenesisForgeAI**

## License

GenesisForgeAI is licensed under the **GenesisForgeAI Public License (GFPL) v1.0**.

- You may use GenesisForgeAI to create commercial projects.
- You may not sell GenesisForgeAI itself.
- Modifications must be shared publicly under the same license.
- Attribution is required.
- Forks must not use the name “GenesisForgeAI”.
- Trademark and patent protections apply.

See `/tmp/workspace/santypr/GenesisForgeAI/LICENSE.md` for the full text.
