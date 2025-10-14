#!/usr/bin/env node

import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const platform = process.argv[2] ?? process.platform;
const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const entry = join(rootDir, 'dist', 'node', 'index.js');

if (!existsSync(entry)) {
  console.error('[harmonia] launcher packaging requires a built node sidecar. Run `npm run build-node` first.');
  process.exit(1);
}

console.log(`ℹ Packaging Harmonia launcher for ${platform}.`);
console.log('   - Ensure Tauri CLI is installed: `cargo install tauri-cli --locked`.');
console.log('   - Build the Rust shell: `cargo build --release --manifest-path launcher/src-tauri/Cargo.toml`.');
console.log('   - Bundle UI assets: `npm run build:ui`.');
console.log('   - Run `tauri build --target <triple>` to produce platform artifacts.');

console.log('\nThis script acts as documentation glue while the launcher workspace is assembled.');

