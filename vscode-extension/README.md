# GenesisForgeAI VS Code Extension

This extension installs GenesisForgeAI into VS Code and adds the `GenesisForgeAI` command.

## Local install

1. Open a terminal in `vscode-extension`.
2. Install dependencies:
   - `npm install`
3. Create a VSIX package:
   - `npm run package`
4. In VS Code, run:
   - `Extensions: Install from VSIX...`
5. Select the generated `.vsix` file.

## Main command

- `GenesisForgeAI` / `GenesisForgeAI: Init Project`

When executed, the command:

1. **Detects the existing workspace** — if a `project.json`, `.genesisforge/registration.json`, or known technology stack (React+TS, .NET, Flutter) is found, you are asked whether to initialize GenesisForge in place rather than under a new `generated-projects/<name>/` folder.
2. **Infers a default project name** from `package.json` or the workspace folder name.
3. **Asks which technologies apply** using a **multi-select** quick pick (React+TS, .NET API, Flutter, Full-stack, Other). Detected technologies are pre-checked.
4. Asks the standard quality options (Clean Architecture, docs, CI/CD, tests, IaC).
5. Generates everything needed under the target directory:

- project template files (one set per selected technology)
- `instructions/agents` and `instructions/skills`
- `docs` scaffolding and changelog
- `.genesisforge/registration.json`
- `project.json` (includes `technologies[]` and `templateSources[]` arrays alongside legacy `type`/`templateSource` fields)

## Add Technologies command

- `GenesisForgeAI: Add Technologies`

Run this command to extend an already-initialized project with additional technology templates without re-running the full bootstrap. It opens the same multi-select picker (with current technologies pre-checked), copies any missing template resources, and updates `project.json`.

## Other commands

- `GenesisForgeAI: Run Agent`
- `GenesisForgeAI: Run Skill`
- `GenesisForgeAI: Generate Documentation`
- `GenesisForgeAI: Create Task Folder`

## Tree views

The extension contributes four panels to the Explorer sidebar:

- **Project Manifest** — shows `project.json` fields; arrays (e.g. `technologies`) are displayed as comma-separated values. Resolves the project root automatically even when the project lives under `generated-projects/`.
- **Agents** — lists agent files from the path recorded in `registration.json` (`agentsPath`), falling back to `.github/agents`.
- **Skills** — lists skill directories from `registration.json` (`skillsPath`), falling back to `.github/skills`.
- **Documentation Status** — reports readiness of each docs section using the `docsPath` from `registration.json`.

