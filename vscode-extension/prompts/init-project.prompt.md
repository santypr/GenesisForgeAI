# Init Project Prompt

Before running `init-project`, examine the current workspace and collect the following:

1. **Detect existing project signals** — check for `project.json`, `.genesisforge/registration.json`, known technology markers (React+TS via `package.json` + `tsconfig.json`/`.tsx` files; .NET via `.csproj`/`.sln`/`Program.cs`; Flutter via `pubspec.yaml`/`lib/main.dart`). If any are found, suggest initializing in place rather than under `generated-projects/`.

2. **Infer project name** — use `package.json` `name` field or workspace folder name as the default.

3. **Collect all applicable technologies** — present a multi-select list (React+TS, .NET API, Flutter, Full-stack, Other). Pre-check any technologies that were auto-detected. Confirm with the user before proceeding.

4. **Collect quality options** — Clean Architecture, automated documentation, CI/CD templates, testing templates, infrastructure (IaC) templates.

5. **Confirm the target directory** — in-place (workspace root) or a new `generated-projects/<name>/` subfolder.

Generate base folders, copy templates for every selected technology, scaffold instructions/agents and instructions/skills, create the docs structure, write `project.json` (with `technologies[]` and `templateSources[]` arrays plus legacy `type`/`templateSource` fields), and write `.genesisforge/registration.json`.
