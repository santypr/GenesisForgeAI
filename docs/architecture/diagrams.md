# Diagrams

```mermaid
graph TD
  U[User] --> I[init-project]
  I --> T[/templates]
  I --> D[/docs]
  I --> M[project.json]
  I --> R[.genesisforge/registration.json]
  I --> C[.github/copilot-instructions.md]
  I --> CM[CLAUDE.md]
  I --> G[AGENTS.md]
  I --> GA[.github/agents]
  I --> CA[.claude/agents]
  I --> GS[.github/skills]
  I --> CS[.claude/skills]
  V[VS Code Extension] --> R
  V --> GA
  V --> GS
  note_gh["GitHub.com / Copilot cloud"] --> GA
  note_gh --> GS
  note_claude["Claude Code"] --> CA
  note_claude --> CS
```
