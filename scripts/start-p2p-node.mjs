#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const entry = join(rootDir, 'dist', 'node', 'index.js');

if (!existsSync(entry)) {
  console.error('[harmonia] missing dist/node/index.js. Run `npm run build-node` first.');
  process.exit(1);
}

const child = spawn(process.execPath, [entry], {
  stdio: 'inherit',
  env: {
    ...process.env,
    HARMONIA_RELAY: process.env.HARMONIA_RELAY ?? '0',
  },
});

child.on('close', (code) => {
  process.exit(code ?? 0);
});

