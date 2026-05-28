const fs = require('fs');
const path = require('path');

const extensionDir = path.resolve(__dirname, '..');
const repoRoot = path.resolve(extensionDir, '..');
const resourcesDir = path.join(extensionDir, 'resources');

const resourceMappings = [
  { from: path.join(repoRoot, 'templates'), to: path.join(resourcesDir, 'templates') },
  { from: path.join(repoRoot, 'instructions'), to: path.join(resourcesDir, 'instructions') }
];

function copyDirRecursive(sourceDir, targetDir) {
  fs.mkdirSync(targetDir, { recursive: true });
  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(sourcePath, targetPath);
      continue;
    }
    fs.copyFileSync(sourcePath, targetPath);
  }
}

function syncResources() {
  fs.rmSync(resourcesDir, { recursive: true, force: true });
  fs.mkdirSync(resourcesDir, { recursive: true });

  for (const mapping of resourceMappings) {
    if (!fs.existsSync(mapping.from)) {
      throw new Error(`Resource source does not exist: ${mapping.from}`);
    }
    copyDirRecursive(mapping.from, mapping.to);
  }
}

try {
  syncResources();
  process.stdout.write('GenesisForgeAI extension resources synchronized.\n');
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
}
