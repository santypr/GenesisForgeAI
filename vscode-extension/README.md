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

- `GenesisForgeAI`

When executed, the command asks the project setup questions and generates everything needed under:

- `generated-projects/<project-name>/`

Including:

- project template files
- `instructions/agents` and `instructions/skills`
- `docs` scaffolding and changelog
- `.genesisforge/registration.json`
- `project.json`
