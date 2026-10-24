import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const publicSourceDir = path.join(projectRoot, 'public');
const standalonePublicDir = path.join(projectRoot, '.next', 'standalone', 'public');

if (!fs.existsSync(publicSourceDir)) {
  console.log('No public directory found; standalone asset prep skipped.');
  process.exit(0);
}

try {
  fs.rmSync(standalonePublicDir, { recursive: true, force: true });
} catch (error) {
  if (error && typeof error === 'object' && 'code' in error && error.code !== 'EBUSY') {
    throw error;
  }
}

fs.mkdirSync(path.dirname(standalonePublicDir), { recursive: true });
fs.mkdirSync(standalonePublicDir, { recursive: true });
fs.cpSync(publicSourceDir, standalonePublicDir, { recursive: true });

console.log(`Copied public assets to ${standalonePublicDir}`);
