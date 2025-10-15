#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const IGNORED_DIRECTORIES = new Set([
  'node_modules',
  '.git',
  'dist',
  '.cache',
  'logs',
]);

const TEXT_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.json',
  '.md',
  '.css',
  '.html',
  '.txt',
  '.yaml',
  '.yml',
]);

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name.startsWith('.')) {
      continue;
    }
    if (IGNORED_DIRECTORIES.has(entry.name)) {
      continue;
    }

    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(entryPath)));
    } else if (TEXT_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(entryPath);
    }
  }
  return files;
}

function checkForMergeMarkers(content, filePath, issues) {
  const lines = content.split(/\r?\n/);
  for (const [index, line] of lines.entries()) {
    if (line.startsWith('<<<<<<< ')) {
      issues.push({
        filePath,
        message: `Detected unresolved merge conflict (start marker) on line ${index + 1}.`,
      });
      break;
    }
    if (line.startsWith('>>>>>>> ')) {
      issues.push({
        filePath,
        message: `Detected unresolved merge conflict (end marker) on line ${index + 1}.`,
      });
      break;
    }
    if (line === '=======') {
      issues.push({
        filePath,
        message: `Detected unresolved merge conflict (separator) on line ${index + 1}.`,
      });
      break;
    }
  }
}

function checkConsoleUsage(content, filePath, issues) {
  if (!filePath.includes(`${path.sep}src${path.sep}`)) {
    return;
  }
  const consolePattern = /console\.log\s*\(/;
  if (consolePattern.test(content)) {
    issues.push({
      filePath,
      message: 'Unexpected console debugging statement detected.',
    });
  }
}

function stripJsonComments(content) {
  return content
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|\s)\/\/.*$/gm, '$1');
}

function checkJsonIntegrity(content, filePath, issues) {
  try {
    const sanitized = stripJsonComments(content);
    JSON.parse(sanitized);
  } catch (error) {
    issues.push({
      filePath,
      message: `Invalid JSON structure: ${error.message}`,
    });
  }
}

const files = await collectFiles(repoRoot);
const issues = [];
let consoleCheckCount = 0;
let mergeCheckCount = 0;
let jsonCheckCount = 0;

for (const filePath of files) {
  const content = await readFile(filePath, 'utf8');

  checkForMergeMarkers(content, filePath, issues);
  mergeCheckCount += 1;

  const ext = path.extname(filePath);
  if (ext === '.json') {
    checkJsonIntegrity(content, filePath, issues);
    jsonCheckCount += 1;
  }

  if (ext === '.ts' || ext === '.tsx' || ext === '.js' || ext === '.jsx' || ext === '.mjs') {
    checkConsoleUsage(content, filePath, issues);
    consoleCheckCount += 1;
  }
}

if (issues.length > 0) {
  console.error('Lint failed with the following issues:');
  for (const issue of issues) {
    console.error(` - ${issue.filePath}: ${issue.message}`);
  }
  process.exitCode = 1;
} else {
  console.log('Lint checks completed successfully.');
  console.log(
    `Files scanned: ${files.length}. Merge checks: ${mergeCheckCount}, JSON checks: ${jsonCheckCount}, console checks: ${consoleCheckCount}.`
  );
}
