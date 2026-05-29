const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

let extensionRoot = '';

const TECHNOLOGY_OPTIONS = [
  { label: 'React+TS', template: 'react-template' },
  { label: '.NET API', template: 'dotnet-api-template' },
  { label: 'Flutter', template: 'flutter-template' },
  { label: 'Full-stack', template: 'fullstack-template' },
  { label: 'Other', template: 'documentation-template' }
];

function workspaceRoot() {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}

function resourcesRoot() {
  return path.join(extensionRoot, 'resources');
}

function ensureDirectory(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function listDirectoryEntries(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  return fs.readdirSync(dirPath, { withFileTypes: true });
}

function hasFileMatching(dirPath, predicate) {
  if (!fs.existsSync(dirPath)) return false;
  return fs.readdirSync(dirPath).some(predicate);
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
  if (!fs.existsSync(changelogFile)) {
    fs.writeFileSync(changelogFile, '# Changelog\n', 'utf8');
  }
  fs.appendFileSync(changelogFile, `\n## ${new Date().toISOString()}\n- Documentation refresh triggered by GenesisForgeAI command\n`, 'utf8');
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

function detectWorkspaceTechnologies(root) {
  const detected = [];

  // React+TS: package.json with react/react-dom dependency plus TypeScript indicators
  const pkgJsonPath = path.join(root, 'package.json');
  if (fs.existsSync(pkgJsonPath)) {
    let pkg = null;
    try { pkg = readJson(pkgJsonPath); } catch { /* malformed package.json — skip */ }
    if (pkg) {
      const allDeps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
      const hasReact = 'react' in allDeps || 'react-dom' in allDeps;
      const hasTs =
        'typescript' in allDeps ||
        fs.existsSync(path.join(root, 'tsconfig.json')) ||
        hasFileMatching(path.join(root, 'src'), (f) => f.endsWith('.tsx') || f.endsWith('.ts'));
      if (hasReact && hasTs) {
        detected.push('React+TS');
      }
    }
  }

  // .NET: .csproj / .sln file or Program.cs at root
  if (
    hasFileMatching(root, (f) => f.endsWith('.csproj') || f.endsWith('.sln')) ||
    fs.existsSync(path.join(root, 'Program.cs'))
  ) {
    detected.push('.NET API');
  }

  // Flutter: pubspec.yaml or lib/main.dart
  if (
    fs.existsSync(path.join(root, 'pubspec.yaml')) ||
    fs.existsSync(path.join(root, 'lib', 'main.dart'))
  ) {
    detected.push('Flutter');
  }

  // Promote React+TS + .NET API co-presence to Full-stack
  if (detected.includes('React+TS') && detected.includes('.NET API')) {
    detected.push('Full-stack');
  }

  return detected;
}

function inferProjectName(root) {
  const pkgJsonPath = path.join(root, 'package.json');
  if (fs.existsSync(pkgJsonPath)) {
    let pkg = null;
    try { pkg = readJson(pkgJsonPath); } catch { /* ignore */ }
    if (pkg && pkg.name) return pkg.name;
  }
  return path.basename(root) || 'genesis-project';
}

function shouldInitializeCurrentWorkspace(root) {
  if (fs.existsSync(path.join(root, 'project.json'))) return true;
  if (fs.existsSync(path.join(root, '.genesisforge', 'registration.json'))) return true;
  if (detectWorkspaceTechnologies(root).length > 0) return true;
  // Non-empty workspace (ignoring common meta directories)
  const ignoredDirs = new Set(['.git', '.github', '.claude', '.genesisforge', 'node_modules', '.vscode']);
  const entries = fs.existsSync(root)
    ? fs.readdirSync(root).filter((f) => !ignoredDirs.has(f))
    : [];
  return entries.length > 0;
}

function normalizeTechnologySelection(selections) {
  const technologies = selections.map((s) => s.label);
  const templateSources = selections.map((s) => s.template);

  let type, templateSource;
  if (selections.length === 1) {
    type = selections[0].label;
    templateSource = selections[0].template;
  } else if (technologies.includes('React+TS') && technologies.includes('.NET API')) {
    // React+TS and .NET API together → Full-stack is the primary
    type = 'Full-stack';
    templateSource = 'fullstack-template';
  } else {
    // Use the first non-Other selection as primary for legacy compatibility
    const primary = selections.find((s) => s.label !== 'Other') || selections[0];
    type = primary.label;
    templateSource = primary.template;
  }

  return { technologies, templateSources, type, templateSource };
}

async function pickTechnologies(preselected = []) {
  const items = TECHNOLOGY_OPTIONS.map((opt) => ({
    ...opt,
    picked: preselected.includes(opt.label)
  }));
  const chosen = await vscode.window.showQuickPick(items, {
    canPickMany: true,
    placeHolder: 'Select all applicable technologies (multi-select)'
  });
  return chosen || null;
}

function manifestTechnologies(manifest) {
  if (Array.isArray(manifest.technologies)) return manifest.technologies;
  if (manifest.type) return [manifest.type];
  return [];
}

function manifestTemplateSources(manifest) {
  if (Array.isArray(manifest.templateSources)) return manifest.templateSources;
  if (manifest.templateSource) return [manifest.templateSource];
  return [];
}

function resolveWorkspaceProjectRoot(wsRoot) {
  if (!wsRoot) return wsRoot;
  // Workspace root is already a GenesisForge project
  if (
    fs.existsSync(path.join(wsRoot, 'project.json')) ||
    fs.existsSync(path.join(wsRoot, '.genesisforge', 'registration.json'))
  ) {
    return wsRoot;
  }
  // Search generated-projects subdirectories (return first match)
  const genDir = path.join(wsRoot, 'generated-projects');
  if (fs.existsSync(genDir)) {
    for (const entry of listDirectoryEntries(genDir)) {
      if (!entry.isDirectory()) continue;
      const candidate = path.join(genDir, entry.name);
      if (
        fs.existsSync(path.join(candidate, 'project.json')) ||
        fs.existsSync(path.join(candidate, '.genesisforge', 'registration.json'))
      ) {
        return candidate;
      }
    }
  }
  return wsRoot;
}

function readRegistration(projectRoot) {
  const regPath = path.join(projectRoot, '.genesisforge', 'registration.json');
  if (!fs.existsSync(regPath)) return null;
  return readJson(regPath);
}

function buildProjectManifest(projectName, norm, existing = {}) {
  return {
    ...existing,
    name: projectName,
    type: norm.type,
    technologies: norm.technologies,
    templateSource: norm.templateSource,
    templateSources: norm.templateSources
  };
}

async function bootstrapProject() {
  const root = workspaceRoot();
  if (!root) {
    vscode.window.showErrorMessage('Open a workspace folder first.');
    return;
  }

  loadPrompt('init-project.prompt.md');

  const detectedTechs = detectWorkspaceTechnologies(root);
  const initInPlace = shouldInitializeCurrentWorkspace(root);

  let targetDir;

  if (initInPlace) {
    const useInPlace = await askYesNo(
      'An existing project or technology stack was detected. Initialize GenesisForge in this workspace folder directly?'
    );
    if (useInPlace) {
      targetDir = root;
    }
  }

  if (!targetDir) {
    const projectNameInput = await vscode.window.showInputBox({
      prompt: 'Project name',
      placeHolder: 'genesis-project',
      value: inferProjectName(root)
    });
    if (projectNameInput === undefined) return;
    const projectName = projectNameInput.trim() || 'genesis-project';
    targetDir = path.join(root, 'generated-projects', projectName);
  }

  const projectName = targetDir === root ? inferProjectName(root) : path.basename(targetDir);

  const selections = await pickTechnologies(detectedTechs);
  if (!selections || selections.length === 0) return;

  const norm = normalizeTechnologySelection(selections);

  const cleanArchitecture = await askYesNo('Do you want Clean Architecture?');
  const automatedDocumentation = await askYesNo('Do you want automated documentation generation?');
  const ciCdTemplates = await askYesNo('Do you want CI/CD templates?');
  const testingTemplates = await askYesNo('Do you want testing templates?');
  const infrastructureTemplates = await askYesNo('Do you want infrastructure templates (IaC)?');

  const docsDir = path.join(targetDir, 'docs');
  const bundleDir = resourcesRoot();
  const instructionsDir = path.join(bundleDir, 'instructions');
  const existingManifest = fs.existsSync(path.join(targetDir, 'project.json'))
    ? readJson(path.join(targetDir, 'project.json'))
    : {};

  try {
    ensureDirectory(targetDir);

    for (const tmpl of norm.templateSources) {
      const templateDir = path.join(bundleDir, 'templates', tmpl);
      if (fs.existsSync(templateDir)) {
        copyDirectoryIfMissing(templateDir, targetDir);
      }
    }

    copyDirectoryIfMissing(instructionsDir, path.join(targetDir, 'instructions'));
    ensureDocumentationScaffold(docsDir);
    ensureDirectory(path.join(targetDir, '.genesisforge'));

    writeJson(path.join(targetDir, 'project.json'), {
      ...buildProjectManifest(projectName, norm, existingManifest),
      cleanArchitecture,
      automatedDocumentation,
      ciCdTemplates,
      testingTemplates,
      infrastructureTemplates
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

async function addTechnologiesToProject() {
  const root = workspaceRoot();
  if (!root) {
    vscode.window.showErrorMessage('Open a workspace folder first.');
    return;
  }

  const projectRoot = resolveWorkspaceProjectRoot(root);
  const manifestPath = path.join(projectRoot, 'project.json');
  if (!fs.existsSync(manifestPath)) {
    vscode.window.showErrorMessage('No project.json found. Run GenesisForgeAI: Init Project first.');
    return;
  }

  const existing = readJson(manifestPath);
  const currentTechs = manifestTechnologies(existing);

  const selections = await pickTechnologies(currentTechs);
  if (!selections || selections.length === 0) return;

  const norm = normalizeTechnologySelection(selections);
  const bundleDir = resourcesRoot();

  try {
    for (const tmpl of norm.templateSources) {
      const templateDir = path.join(bundleDir, 'templates', tmpl);
      if (fs.existsSync(templateDir)) {
        copyDirectoryIfMissing(templateDir, projectRoot);
      }
    }

    writeJson(manifestPath, buildProjectManifest(existing.name, norm, existing));
    vscode.window.showInformationMessage(`Technologies updated: ${norm.technologies.join(', ')}`);
  } catch (error) {
    vscode.window.showErrorMessage(error.message);
  }
}

class FileListProvider {
  constructor(registrationKey, fallbackRelativeDir, entryType = 'file') {
    this.registrationKey = registrationKey;
    this.fallbackRelativeDir = fallbackRelativeDir;
    this.entryType = entryType;
  }

  getTreeItem(element) {
    return element;
  }

  getChildren() {
    const root = workspaceRoot();
    if (!root) return [];
    const projectRoot = resolveWorkspaceProjectRoot(root);
    const reg = readRegistration(projectRoot);
    const relDir = (reg && reg[this.registrationKey]) || this.fallbackRelativeDir;
    const dir = path.join(projectRoot, relDir);
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
    const projectRoot = resolveWorkspaceProjectRoot(root);
    const manifestPath = path.join(projectRoot, 'project.json');
    if (!fs.existsSync(manifestPath)) {
      return [new vscode.TreeItem('project.json not found', vscode.TreeItemCollapsibleState.None)];
    }
    const manifest = readJson(manifestPath);
    return Object.entries(manifest).map(([k, v]) => {
      const display = Array.isArray(v) ? v.join(', ') : String(v);
      return new vscode.TreeItem(`${k}: ${display}`, vscode.TreeItemCollapsibleState.None);
    });
  }
}

class DocsStatusProvider {
  getTreeItem(element) {
    return element;
  }

  getChildren() {
    const root = workspaceRoot();
    if (!root) return [];
    const projectRoot = resolveWorkspaceProjectRoot(root);
    const reg = readRegistration(projectRoot);
    const docsRelPath = (reg && reg.docsPath) || 'docs';
    const docsDir = path.join(projectRoot, docsRelPath);
    if (!fs.existsSync(docsDir)) return [new vscode.TreeItem('docs/ missing', vscode.TreeItemCollapsibleState.None)];
    const sections = ['architecture', 'analysis', 'planning', 'testing', 'changelog'];
    return sections.map((section) => {
      const p = path.join(docsDir, section);
      return new vscode.TreeItem(`${section}: ${fs.existsSync(p) ? 'ready' : 'missing'}`, vscode.TreeItemCollapsibleState.None);
    });
  }
}

function activate(context) {
  extensionRoot = context.extensionPath;

  context.subscriptions.push(
    vscode.commands.registerCommand('genesisForge.bootstrap', bootstrapProject),
    vscode.commands.registerCommand('genesisForge.initProject', bootstrapProject),
    vscode.commands.registerCommand('genesisForge.addTechnologies', addTechnologiesToProject),
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
      const projectRoot = resolveWorkspaceProjectRoot(root);
      const reg = readRegistration(projectRoot);
      const docsRelPath = (reg && reg.docsPath) || 'docs';
      try {
        ensureDocumentationScaffold(path.join(projectRoot, docsRelPath));
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
      const projectRoot = resolveWorkspaceProjectRoot(root);
      const reg = readRegistration(projectRoot);
      const docsRelPath = (reg && reg.docsPath) || 'docs';
      try {
        createTaskFolder(path.join(projectRoot, docsRelPath, 'tasks', taskId));
        vscode.window.showInformationMessage(`Task folder ready: ${docsRelPath}/tasks/${taskId}`);
      } catch (error) {
        vscode.window.showErrorMessage(error.message);
      }
    })
  );

  vscode.window.registerTreeDataProvider('genesisForge.projectManifest', new ManifestProvider());
  vscode.window.registerTreeDataProvider('genesisForge.agents', new FileListProvider('agentsPath', '.github/agents'));
  vscode.window.registerTreeDataProvider('genesisForge.skills', new FileListProvider('skillsPath', '.github/skills', 'directory'));
  vscode.window.registerTreeDataProvider('genesisForge.docsStatus', new DocsStatusProvider());
}

function deactivate() {}

module.exports = { activate, deactivate };
