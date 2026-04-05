import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');

const candidates = [
  path.join(projectRoot, '.env.local'),
  path.join(projectRoot, '.env'),
  path.join(projectRoot, '.vercel', '.env.development.local'),
];

for (const file of candidates) {
  if (fs.existsSync(file)) {
    dotenv.config({ path: file, override: false });
  }
}

export function readEnv(name, fallback = '') {
  return process.env[name] || fallback;
}
