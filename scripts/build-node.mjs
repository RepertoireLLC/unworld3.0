#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const outputDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'node');

await mkdir(outputDir, { recursive: true });

const banner = `// Auto-generated placeholder sidecar.
// Replace with compiled Node mesh runtime when available.
console.log('[harmonia] node sidecar placeholder build ready');
`;

await writeFile(join(outputDir, 'index.js'), banner, 'utf8');

console.log('✔ Harmonia node placeholder emitted to dist/node/index.js');

