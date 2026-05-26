# Diagrams

```mermaid
graph TD
  U[User] --> I[init-project]
  I --> T[/templates]
  I --> D[/docs]
  I --> M[project.json]
  I --> R[.genesisforge/registration.json]
  V[VS Code Extension] --> R
  V --> A[/instructions/agents]
  V --> S[/instructions/skills]
```
