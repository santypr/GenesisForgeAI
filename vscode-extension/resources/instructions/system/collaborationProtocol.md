# Collaboration Protocol

## Pipeline
`taskManager -> projectArchitect -> documentationEngineer -> codeGenerator -> testEngineer`

## Orchestration Rules
- `taskManager` creates and updates `/docs/tasks/<task-id>/` for each iteration.
- `projectArchitect` defines structure and architectural constraints.
- `documentationEngineer` updates analysis, architecture, planning, testing, changelog docs.
- `codeGenerator` produces implementation based on approved architecture/docs.
- `testEngineer` validates behavior and coverage against requirements.

## Handover Contract
Each handover must include:
- Inputs consumed
- Output artifacts produced
- Open assumptions and risks
- Next required actor
