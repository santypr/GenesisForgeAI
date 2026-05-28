const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

let extensionRoot = '';

function workspaceRoot() {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}

function resourcesRoot() {
  return path.join(extensionRoot, 'resources');
}

function ensureDirectory(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function copyDirectoryIfMissing(sourceDir, targetDir) {
  if (!fs.existsSync(sourceDir)) {
    throw new Error(`Missing source directory: ${sourceDir}`);
  }
  ensureDirectory(targetDir);
  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);
    if (entry.isDirectory()) {
      copyDirectoryIfMissing(sourcePath, targetPath);
      continue;
    }
    if (!fs.existsSync(targetPath)) {
      fs.copyFileSync(sourcePath, targetPath);
    }
  }
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function loadPrompt(name) {
  const promptPath = path.join(extensionRoot, 'prompts', name);
  if (!fs.existsSync(promptPath)) return '';
  return fs.readFileSync(promptPath, 'utf8');
}

async function askYesNo(question) {
  const answer = await vscode.window.showQuickPick(
    [
      { label: 'Yes', value: true },
      { label: 'No', value: false }
    ],
    { placeHolder: question }
  );
  if (!answer) {
    throw new Error('Operation cancelled by user.');
  }
  return answer.value;
}

function ensureDocumentationScaffold(docsRoot) {
  const sections = ['architecture', 'analysis', 'planning', 'testing', 'changelog', 'tasks'];
  for (const section of sections) {
    ensureDirectory(path.join(docsRoot, section));
  }

  const changelogFile = path.join(docsRoot, 'changelog', 'CHANGELOG.md');
  const timestamp = new Date().toISOString();
  if (!fs.existsSync(changelogFile)) {
    fs.writeFileSync(changelogFile, '# Changelog\n', 'utf8');
  }
  fs.appendFileSync(changelogFile, `\n## ${timestamp}\n- Documentation refresh triggered by GenesisForgeAI command\n`, 'utf8');
}

function createTaskFolder(taskDir) {
  ensureDirectory(taskDir);
  const files = {
    'status.md': `# Status

## What has been done
- Pending.

## Why it was done
- Pending.

## Remaining work
- Pending.

## Blockers
- None.
`,
    'reasoning.md': `# Reasoning

- Iteration summaries go here.
`,
    'user-input.md': `# User Input

## Questions asked
- Pending.

## Answers provided
- Pending.
`,
    'output.md': `# Output

- Final generated content goes here.
`
  };

  for (const [fileName, content] of Object.entries(files)) {
    const filePath = path.join(taskDir, fileName);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, content, 'utf8');
    }
  }
}

async function bootstrapProject() {
  const root = workspaceRoot();
  if (!root) {
    vscode.window.showErrorMessage('Open a workspace folder first.');
    return;
  }

  const projectNameInput = await vscode.window.showInputBox({
    prompt: 'Project name',
    placeHolder: 'genesis-project',
    value: 'genesis-project'
  });
  if (projectNameInput === undefined) {
    return;
  }

  const projectName = projectNameInput.trim() || 'genesis-project';
  const projectTypeChoice = await vscode.window.showQuickPick(
    [
      { label: 'React+TS', template: 'react-template' },
      { label: '.NET API', template: 'dotnet-api-template' },
      { label: 'Flutter', template: 'flutter-template' },
      { label: 'Full-stack', template: 'fullstack-template' },
      { label: 'Other', template: 'documentation-template' }
    ],
    { placeHolder: 'What type of project do you want to create?' }
  );
  if (!projectTypeChoice) {
    return;
  }

  const cleanArchitecture = await askYesNo('Do you want Clean Architecture?');
  const automatedDocumentation = await askYesNo('Do you want automated documentation generation?');
  const ciCdTemplates = await askYesNo('Do you want CI/CD templates?');
  const testingTemplates = await askYesNo('Do you want testing templates?');
  const infrastructureTemplates = await askYesNo('Do you want infrastructure templates (IaC)?');

  try {
    const targetDir = path.join(root, 'generated-projects', projectName);
    const docsDir = path.join(targetDir, 'docs');
    const bundleDir = resourcesRoot();
    const templateDir = path.join(bundleDir, 'templates', projectTypeChoice.template);
    const instructionsDir = path.join(bundleDir, 'instructions');

    ensureDirectory(targetDir);
    copyDirectoryIfMissing(templateDir, targetDir);
    copyDirectoryIfMissing(instructionsDir, path.join(targetDir, 'instructions'));
    ensureDocumentationScaffold(docsDir);
    ensureDirectory(path.join(targetDir, '.genesisforge'));

    writeJson(path.join(targetDir, 'project.json'), {
      name: projectName,
      type: projectTypeChoice.label,
      cleanArchitecture,
      automatedDocumentation,
      ciCdTemplates,
      testingTemplates,
      infrastructureTemplates,
      templateSource: projectTypeChoice.template
    });

    writeJson(path.join(targetDir, '.genesisforge', 'registration.json'), {
      projectManifest: 'project.json',
      agentsPath: 'instructions/agents',
      skillsPath: 'instructions/skills',
      docsPath: 'docs',
      registeredAt: new Date().toISOString()
    });

    createTaskFolder(path.join(docsDir, 'tasks', 'task-example'));

    vscode.window.showInformationMessage(`GenesisForgeAI project ready at: ${targetDir}`);
  } catch (error) {
    vscode.window.showErrorMessage(error.message);
  }
}

class FileListProvider {
  constructor(relativeDir, entryType = 'file') {
    this.relativeDir = relativeDir;
    this.entryType = entryType;
  }

  getTreeItem(element) {
    return element;
  }

  getChildren() {
    const root = workspaceRoot();
    if (!root) return [];
    const dir = path.join(root, this.relativeDir);
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir)
      .filter((name) => {
        const fullPath = path.join(dir, name);
        return this.entryType === 'directory'
          ? fs.statSync(fullPath).isDirectory()
          : fs.statSync(fullPath).isFile();
      })
      .map((name) => new vscode.TreeItem(name, vscode.TreeItemCollapsibleState.None));
  }
}

class ManifestProvider {
  getTreeItem(element) {
    return element;
  }

  getChildren() {
    const root = workspaceRoot();
    if (!root) return [];
    const manifestPath = path.join(root, 'project.json');
    if (!fs.existsSync(manifestPath)) {
      return [new vscode.TreeItem('project.json not found', vscode.TreeItemCollapsibleState.None)];
    }
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    return Object.entries(manifest).map(([k, v]) => new vscode.TreeItem(`${k}: ${v}`, vscode.TreeItemCollapsibleState.None));
  }
}

class DocsStatusProvider {
  getTreeItem(element) {
    return element;
  }

  getChildren() {
    const root = workspaceRoot();
    if (!root) return [];
    const docsDir = path.join(root, 'docs');
    if (!fs.existsSync(docsDir)) return [new vscode.TreeItem('docs/ missing', vscode.TreeItemCollapsibleState.None)];
    const sections = ['architecture', 'analysis', 'planning', 'testing', 'changelog'];
    return sections.map((section) => {
      const p = path.join(docsDir, section);
      const exists = fs.existsSync(p);
      return new vscode.TreeItem(`${section}: ${exists ? 'ready' : 'missing'}`, vscode.TreeItemCollapsibleState.None);
    });
  }
}

function activate(context) {
  extensionRoot = context.extensionPath;

  context.subscriptions.push(
    vscode.commands.registerCommand('genesisForge.bootstrap', bootstrapProject),
    vscode.commands.registerCommand('genesisForge.initProject', () => {
      loadPrompt('init-project.prompt.md');
      return bootstrapProject();
    }),
    vscode.commands.registerCommand('genesisForge.runAgent', async () => {
      const prompt = loadPrompt('run-agent.prompt.md');
      const agent = await vscode.window.showQuickPick(['projectArchitect', 'documentationEngineer', 'taskManager', 'codeGenerator', 'apiDesigner', 'testEngineer']);
      if (!agent) return;
      vscode.window.showInformationMessage(`Agent selected: ${agent}${prompt ? ' (prompt loaded)' : ''}`);
    }),
    vscode.commands.registerCommand('genesisForge.runSkill', async () => {
      const prompt = loadPrompt('run-skill.prompt.md');
      const skill = await vscode.window.showQuickPick(['generateDocumentation', 'updateDocumentation', 'createTaskFolder', 'generateReactComponent', 'generateDotNetController', 'generateFlutterPage', 'generateApiSpec', 'generateUserStories', 'generateChangelog', 'generateArchitectureDiagram']);
      if (!skill) return;
      vscode.window.showInformationMessage(`Skill selected: ${skill}${prompt ? ' (prompt loaded)' : ''}`);
    }),
    vscode.commands.registerCommand('genesisForge.generateDocumentation', () => {
      const root = workspaceRoot();
      if (!root) {
        vscode.window.showErrorMessage('Open a workspace folder first.');
        return;
      }
      try {
        ensureDocumentationScaffold(path.join(root, 'docs'));
        vscode.window.showInformationMessage('Documentation generation completed.');
      } catch (error) {
        vscode.window.showErrorMessage(error.message);
      }
    }),
    vscode.commands.registerCommand('genesisForge.createTaskFolder', async () => {
      const taskId = await vscode.window.showInputBox({ prompt: 'Task ID' });
      if (!taskId) return;
      const root = workspaceRoot();
      if (!root) {
        vscode.window.showErrorMessage('Open a workspace folder first.');
        return;
      }
      try {
        createTaskFolder(path.join(root, 'docs', 'tasks', taskId));
        vscode.window.showInformationMessage(`Task folder ready: docs/tasks/${taskId}`);
      } catch (error) {
        vscode.window.showErrorMessage(error.message);
      }
    })
  );

  vscode.window.registerTreeDataProvider('genesisForge.projectManifest', new ManifestProvider());
  vscode.window.registerTreeDataProvider('genesisForge.agents', new FileListProvider('.github/agents'));
  vscode.window.registerTreeDataProvider('genesisForge.skills', new FileListProvider('.github/skills', 'directory'));
  vscode.window.registerTreeDataProvider('genesisForge.docsStatus', new DocsStatusProvider());
}

function deactivate() {}

module.exports = { activate, deactivate };
