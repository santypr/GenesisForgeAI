const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

let extensionRoot = '';

const TECHNOLOGY_OPTIONS = [
  { label: 'React+TS', template: 'react-template', technologies: ['React+TS'] },
  { label: '.NET API', template: 'dotnet-api-template', technologies: ['.NET API'] },
  { label: 'Flutter', template: 'flutter-template', technologies: ['Flutter'] },
  { label: 'Full-stack', template: 'fullstack-template', technologies: ['React+TS', '.NET API'] },
  { label: 'Other', template: 'documentation-template', technologies: ['Other'] }
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

function hasFileMatching(dirPath, predicate, maxDepth = 0, currentDepth = 0) {
  if (!fs.existsSync(dirPath)) return false;
  for (const entry of listDirectoryEntries(dirPath)) {
    if (entry.name === '.git' || entry.name === 'node_modules') {
      continue;
    }

    const entryPath = path.join(dirPath, entry.name);
    if (predicate(entry.name, entryPath, entry, currentDepth)) {
      return true;
    }

    if (entry.isDirectory() && currentDepth < maxDepth && hasFileMatching(entryPath, predicate, maxDepth, currentDepth + 1)) {
      return true;
    }
  }

  return false;
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

async function askYesNo(question, currentValue) {
  const placeHolder = typeof currentValue === 'boolean'
    ? `${question} (current: ${currentValue ? 'Yes' : 'No'})`
    : question;
  const answer = await vscode.window.showQuickPick(
    [
      { label: 'Yes', value: true },
      { label: 'No', value: false }
    ],
    { placeHolder }
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

  const packageJsonPath = path.join(root, 'package.json');
  const packageJsonContent = fs.existsSync(packageJsonPath)
    ? fs.readFileSync(packageJsonPath, 'utf8')
    : '';
  const hasReactDependency = /"(react|react-dom)"\s*:/.test(packageJsonContent);
  const hasTypeScriptHint = fs.existsSync(path.join(root, 'tsconfig.json'))
    || fs.existsSync(path.join(root, 'vite.config.ts'))
    || hasFileMatching(root, (name) => name.endsWith('.tsx') || name.endsWith('.ts'), 2);
  const hasReactEntrypoint = fs.existsSync(path.join(root, 'src', 'main.tsx'))
    || fs.existsSync(path.join(root, 'src', 'App.tsx'))
    || fs.existsSync(path.join(root, 'app', 'page.tsx'));

  if ((hasReactDependency && hasTypeScriptHint) || hasReactEntrypoint) {
    detected.push('React+TS');
  }

  if (
    hasFileMatching(root, (name) => name.endsWith('.csproj') || name.endsWith('.sln'), 4)
    || hasFileMatching(root, (name, entryPath) => name === 'Program.cs' && !entryPath.includes(`${path.sep}Controllers${path.sep}`), 4)
  ) {
    detected.push('.NET API');
  }

  if (
    hasFileMatching(root, (name) => name === 'pubspec.yaml', 4)
    || hasFileMatching(root, (name, entryPath) => name === 'main.dart' && entryPath.endsWith(`${path.sep}lib${path.sep}main.dart`), 4)
  ) {
    detected.push('Flutter');
  }

  return detected;
}

function inferProjectName(targetDir, existingManifest) {
  if (existingManifest?.name) {
    return existingManifest.name;
  }

  return path.basename(targetDir) || 'genesis-project';
}

function shouldInitializeCurrentWorkspace(root) {
  if (fs.existsSync(path.join(root, 'project.json')) || fs.existsSync(path.join(root, '.genesisforge', 'registration.json'))) {
    return true;
  }

  if (detectWorkspaceTechnologies(root).length > 0) {
    return true;
  }

  return listDirectoryEntries(root).filter((entry) => entry.name !== '.git').length > 0;
}

function normalizeTechnologySelection(selectedItems) {
  const selectedLabels = new Set(selectedItems.map((item) => item.label));
  const technologies = new Set();

  for (const item of selectedItems) {
    for (const technology of item.technologies ?? [item.label]) {
      technologies.add(technology);
    }
  }

  if (technologies.size > 1 && technologies.has('Other')) {
    technologies.delete('Other');
  }

  const templateSources = new Set();
  const hasFullStack = selectedLabels.has('Full-stack');

  for (const item of selectedItems) {
    if (hasFullStack && (item.label === 'React+TS' || item.label === '.NET API')) {
      continue;
    }

    if (technologies.size > 1 && item.label === 'Other') {
      continue;
    }

    templateSources.add(item.template);
  }

  if (templateSources.size === 0) {
    templateSources.add('documentation-template');
  }

  return {
    technologies: [...technologies],
    templateSources: [...templateSources]
  };
}

async function pickTechnologies(
  pickedLabels = [],
  placeHolder = 'Select one or more technologies for this project',
  pickedTemplateSources = []
) {
  const selectedItems = await vscode.window.showQuickPick(
    TECHNOLOGY_OPTIONS.map((option) => ({
      ...option,
      picked: pickedLabels.includes(option.label)
        || pickedTemplateSources.includes(option.template)
        || (option.label !== 'Full-stack' && option.technologies.some((technology) => pickedLabels.includes(technology)))
    })),
    {
      canPickMany: true,
      placeHolder
    }
  );

  if (!selectedItems) {
    return undefined;
  }

  if (selectedItems.length === 0) {
    throw new Error('Select at least one technology.');
  }

  return normalizeTechnologySelection(selectedItems);
}

function manifestTechnologies(manifest = {}) {
  if (Array.isArray(manifest.technologies) && manifest.technologies.length > 0) {
    return manifest.technologies;
  }

  if (typeof manifest.type === 'string' && manifest.type && manifest.type !== 'Multi-tech') {
    return [manifest.type];
  }

  return [];
}

function manifestTemplateSources(manifest = {}) {
  if (Array.isArray(manifest.templateSources) && manifest.templateSources.length > 0) {
    return manifest.templateSources;
  }

  if (typeof manifest.templateSource === 'string' && manifest.templateSource && manifest.templateSource !== 'multiple') {
    return [manifest.templateSource];
  }

  return [];
}

function resolveWorkspaceProjectRoot(root) {
  if (!root) {
    return root;
  }

  if (fs.existsSync(path.join(root, 'project.json'))) {
    return root;
  }

  const generatedProjectsDir = path.join(root, 'generated-projects');
  if (!fs.existsSync(generatedProjectsDir)) {
    return root;
  }

  const projects = listDirectoryEntries(generatedProjectsDir)
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(generatedProjectsDir, entry.name))
    .filter((projectDir) => fs.existsSync(path.join(projectDir, 'project.json')));

  return projects.length === 1 ? projects[0] : root;
}

function readRegistration(projectRoot) {
  const regPath = path.join(projectRoot, '.genesisforge', 'registration.json');
  if (!fs.existsSync(regPath)) return null;
  return readJson(regPath);
}

function buildProjectManifest(projectName, manifestData, previousManifest = {}) {
  return {
    ...previousManifest,
    name: projectName,
    type: manifestData.technologies.length === 1 ? manifestData.technologies[0] : 'Multi-tech',
    technologies: manifestData.technologies,
    cleanArchitecture: typeof manifestData.cleanArchitecture === 'boolean'
      ? manifestData.cleanArchitecture
      : previousManifest.cleanArchitecture,
    automatedDocumentation: typeof manifestData.automatedDocumentation === 'boolean'
      ? manifestData.automatedDocumentation
      : previousManifest.automatedDocumentation,
    ciCdTemplates: typeof manifestData.ciCdTemplates === 'boolean'
      ? manifestData.ciCdTemplates
      : previousManifest.ciCdTemplates,
    testingTemplates: typeof manifestData.testingTemplates === 'boolean'
      ? manifestData.testingTemplates
      : previousManifest.testingTemplates,
    infrastructureTemplates: typeof manifestData.infrastructureTemplates === 'boolean'
      ? manifestData.infrastructureTemplates
      : previousManifest.infrastructureTemplates,
    templateSource: manifestData.templateSources.length === 1 ? manifestData.templateSources[0] : 'multiple',
    templateSources: manifestData.templateSources
  };
}

function ensureGenesisForgeProject(targetDir, projectName, manifestData, previousManifest = {}) {
  const docsDir = path.join(targetDir, 'docs');
  const bundleDir = resourcesRoot();
  const instructionsDir = path.join(bundleDir, 'instructions');

  ensureDirectory(targetDir);
  for (const templateSource of manifestData.templateSources) {
    copyDirectoryIfMissing(path.join(bundleDir, 'templates', templateSource), targetDir);
  }
  copyDirectoryIfMissing(instructionsDir, path.join(targetDir, 'instructions'));
  ensureDocumentationScaffold(docsDir);
  ensureDirectory(path.join(targetDir, '.genesisforge'));

  writeJson(path.join(targetDir, 'project.json'), buildProjectManifest(projectName, manifestData, previousManifest));

  writeJson(path.join(targetDir, '.genesisforge', 'registration.json'), {
    projectManifest: 'project.json',
    agentsPath: 'instructions/agents',
    skillsPath: 'instructions/skills',
    docsPath: 'docs',
    registeredAt: new Date().toISOString()
  });

  createTaskFolder(path.join(docsDir, 'tasks', 'task-example'));
}

async function bootstrapProject() {
  const root = workspaceRoot();
  if (!root) {
    vscode.window.showErrorMessage('Open a workspace folder first.');
    return;
  }

  loadPrompt('init-project.prompt.md');

  const workspaceProjectRoot = resolveWorkspaceProjectRoot(root);
  const workspaceManifestPath = path.join(workspaceProjectRoot, 'project.json');
  const workspaceManifest = fs.existsSync(workspaceManifestPath)
    ? readJson(workspaceManifestPath)
    : {};
  const detectedTechs = [
    ...new Set([
      ...manifestTechnologies(workspaceManifest),
      ...detectWorkspaceTechnologies(root)
    ])
  ];
  const initInPlace = shouldInitializeCurrentWorkspace(root);

  let targetDir;

  if (initInPlace) {
    const useInPlace = await askYesNo(
      'An existing project or technology stack was detected. Initialize GenesisForge in this workspace folder directly?',
      workspaceProjectRoot === root ? true : undefined
    );
    if (useInPlace) {
      targetDir = root;
    }
  }

  if (!targetDir) {
    const projectNameInput = await vscode.window.showInputBox({
      prompt: 'Project name',
      placeHolder: 'genesis-project',
      value: inferProjectName(workspaceProjectRoot, workspaceManifest)
    });
    if (projectNameInput === undefined) return;
    const projectName = projectNameInput.trim() || 'genesis-project';
    targetDir = path.join(root, 'generated-projects', projectName);
  }

  const existingManifestPath = path.join(targetDir, 'project.json');
  const existingManifest = fs.existsSync(existingManifestPath)
    ? readJson(existingManifestPath)
    : (targetDir === workspaceProjectRoot ? workspaceManifest : {});
  const projectName = inferProjectName(targetDir, existingManifest);

  const selectedTechnologies = await pickTechnologies(
    [
      ...new Set([
        ...manifestTechnologies(existingManifest),
        ...detectedTechs
      ])
    ],
    'Select one or more technologies for this project',
    manifestTemplateSources(existingManifest)
  );
  if (!selectedTechnologies) return;

  const cleanArchitecture = await askYesNo('Do you want Clean Architecture?', existingManifest.cleanArchitecture);
  const automatedDocumentation = await askYesNo('Do you want automated documentation generation?', existingManifest.automatedDocumentation);
  const ciCdTemplates = await askYesNo('Do you want CI/CD templates?', existingManifest.ciCdTemplates);
  const testingTemplates = await askYesNo('Do you want testing templates?', existingManifest.testingTemplates);
  const infrastructureTemplates = await askYesNo('Do you want infrastructure templates (IaC)?', existingManifest.infrastructureTemplates);

  try {
    ensureGenesisForgeProject(targetDir, projectName, {
      ...selectedTechnologies,
      cleanArchitecture,
      automatedDocumentation,
      ciCdTemplates,
      testingTemplates,
      infrastructureTemplates
    }, existingManifest);
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
  const selections = await pickTechnologies(
    manifestTechnologies(existing),
    'Select technologies to keep or add for this project',
    manifestTemplateSources(existing)
  );
  if (!selections) return;

  try {
    ensureGenesisForgeProject(projectRoot, inferProjectName(projectRoot, existing), {
      ...selections,
      cleanArchitecture: existing.cleanArchitecture,
      automatedDocumentation: existing.automatedDocumentation,
      ciCdTemplates: existing.ciCdTemplates,
      testingTemplates: existing.testingTemplates,
      infrastructureTemplates: existing.infrastructureTemplates
    }, existing);
    vscode.window.showInformationMessage(`Technologies updated: ${selections.technologies.join(', ')}`);
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
