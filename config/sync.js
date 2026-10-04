/**
 * ============================================================================
 * YouTube-Paddy — Automated Version Synchronizer
 * ============================================================================
 * Synchronizes the version defined in config/version.json across:
 *  1. manifest.json
 *  2. config/version.js
 *  3. README.md
 * 
 * Usage:
 *   node config/sync.js            (Syncs current version.json everywhere)
 *   node config/sync.js 1.2.0      (Sets new version and syncs everywhere)
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const versionJsonPath = path.join(rootDir, 'config', 'version.json');
const versionJsPath = path.join(rootDir, 'config', 'version.js');
const manifestPath = path.join(rootDir, 'manifest.json');
const readmePath = path.join(rootDir, 'README.md');

// 1. Read or update config/version.json
let versionData = JSON.parse(fs.readFileSync(versionJsonPath, 'utf8'));

const targetVersion = process.argv[2];
if (targetVersion) {
  versionData.version = targetVersion;
  versionData.releaseDate = new Date().toISOString().split('T')[0];
  fs.writeFileSync(versionJsonPath, JSON.stringify(versionData, null, 2) + '\n');
  console.log(`[Sync] Updated config/version.json to v${targetVersion}`);
}

const currentVersion = versionData.version;

// 2. Sync manifest.json
if (fs.existsSync(manifestPath)) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  manifest.version = currentVersion;
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`[Sync] Updated manifest.json to v${currentVersion}`);
}

// 3. Sync config/version.js
const versionJsContent = `/**
 * ============================================================================
 * YouTube-Paddy — Centralized Version Configuration
 * ============================================================================
 * Single source of truth for version and extension metadata across all scripts.
 */

const PADDY_CONFIG = {
  version: "${currentVersion}",
  name: "${versionData.name || 'YouTube-Paddy'}",
  codename: "${versionData.codename || 'Automation Engine'}",
  build: "production"
};

// Export for ES modules and Node.js environments if required
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PADDY_CONFIG;
}

// Attach to global window scope for browser environments
if (typeof window !== 'undefined') {
  window.PADDY_CONFIG = PADDY_CONFIG;
}
`;
fs.writeFileSync(versionJsPath, versionJsContent);
console.log(`[Sync] Updated config/version.js to v${currentVersion}`);

// 4. Sync README.md header
if (fs.existsSync(readmePath)) {
  let readme = fs.readFileSync(readmePath, 'utf8');
  readme = readme.replace(/<h1 align="center">YouTube-Paddy \(v[0-9.]+\)<\/h1>/, `<h1 align="center">YouTube-Paddy (v${currentVersion})</h1>`);
  readme = readme.replace(/# YouTube-Paddy \(v[0-9.]+\)/, `# YouTube-Paddy (v${currentVersion})`);
  fs.writeFileSync(readmePath, readme);
  console.log(`[Sync] Updated README.md to v${currentVersion}`);
}

console.log(`[Sync] All extension files are now synchronized to v${currentVersion}!`);
