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
bash /tmp/workspace/santypr/GenesisForgeAI/scripts/init-project.sh
```

What `init-project` does:

1. Asks project questions (type, clean architecture, docs, CI/CD, tests, IaC)
2. Generates base folders and copies templates
3. Generates instruction/docs scaffolding and `project.json`
4. Registers the project for the VS Code extension at `.genesisforge/registration.json`

The script is idempotent: running it again updates generated metadata without duplicating folders.

## VS Code Extension Usage

Path: `/vscode-extension`

Commands:

- `GenesisForgeAI: Init Project`
- `GenesisForgeAI: Run Agent`
- `GenesisForgeAI: Run Skill`
- `GenesisForgeAI: Generate Documentation`
- `GenesisForgeAI: Create Task Folder`

The extension also exposes UI panels for:

- Project Manifest
- Agents
- Skills
- Documentation Status

## How Agents and Skills Work

- Agents live in `/instructions/agents` and define role-driven orchestration contracts.
- Skills live in `/instructions/skills` and define deterministic, composable reusable operations.
- System governance is in `/instructions/system` for consistency and collaboration flow.

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
