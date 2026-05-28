const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

function workspaceRoot() {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}

function runInRoot(command) {
  const cwd = workspaceRoot();
  if (!cwd) {
    vscode.window.showErrorMessage('Open a workspace folder first.');
    return;
  }
  exec(command, { cwd }, (error, stdout, stderr) => {
    if (error) {
      vscode.window.showErrorMessage(stderr || error.message);
      return;
    }
    vscode.window.showInformationMessage(stdout.trim() || 'Command executed.');
  });
}

function loadPrompt(name) {
  const root = workspaceRoot();
  if (!root) return '';
  const promptPath = path.join(root, 'vscode-extension', 'prompts', name);
  if (!fs.existsSync(promptPath)) return '';
  return fs.readFileSync(promptPath, 'utf8');
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
  context.subscriptions.push(
    vscode.commands.registerCommand('genesisForge.setupProject', async () => {
      const choice = await vscode.window.showQuickPick(
        [
          { label: 'Init New Project', description: 'Bootstrap a new GenesisForgeAI project', action: 'init' },
          { label: 'Migrate Existing Project', description: 'Add GenesisForgeAI dual-path structure to existing project', action: 'migrate' }
        ],
        { placeHolder: 'What would you like to do?' }
      );
      
      if (!choice) return;
      
      if (choice.action === 'init') {
        vscode.commands.executeCommand('genesisForge.initProject');
      } else if (choice.action === 'migrate') {
        vscode.commands.executeCommand('genesisForge.migrateProject');
      }
    }),
    vscode.commands.registerCommand('genesisForge.initProject', () => {
      loadPrompt('init-project.prompt.md');
      runInRoot('bash scripts/init-project.sh');
    }),
    vscode.commands.registerCommand('genesisForge.migrateProject', () => {
      vscode.window.showInformationMessage('Migrating project to dual-path structure...');
      runInRoot('bash scripts/migrate-to-dual-path.sh');
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
    vscode.commands.registerCommand('genesisForge.generateDocumentation', () => runInRoot('bash scripts/generate-documentation.sh')),
    vscode.commands.registerCommand('genesisForge.createTaskFolder', async () => {
      const taskId = await vscode.window.showInputBox({ prompt: 'Task ID' });
      if (!taskId) return;
      runInRoot(`bash scripts/create-task-folder.sh ${taskId}`);
    })
  );

  vscode.window.registerTreeDataProvider('genesisForge.projectManifest', new ManifestProvider());
  vscode.window.registerTreeDataProvider('genesisForge.agents', new FileListProvider('.github/agents'));
  vscode.window.registerTreeDataProvider('genesisForge.skills', new FileListProvider('.github/skills', 'directory'));
  vscode.window.registerTreeDataProvider('genesisForge.docsStatus', new DocsStatusProvider());
}

function deactivate() {}

module.exports = { activate, deactivate };
