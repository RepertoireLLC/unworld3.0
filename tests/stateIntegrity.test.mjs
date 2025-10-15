import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const repoRoot = process.cwd();

const readSource = async (relativePath) => {
  const fullPath = path.join(repoRoot, relativePath);
  const content = await readFile(fullPath, 'utf8');
  return content.replace(/\r\n/g, '\n');
};

test('user store maintains online presence tracking contract', async () => {
  const content = await readSource('src/store/userStore.ts');

  assert.match(
    content,
    /onlineUsers:\s*new Set<string>\(\)/,
    'userStore should initialize onlineUsers as a typed Set'
  );

  assert.match(
    content,
    /users:\s*\[],/,
    'userStore should initialize with an empty user list'
  );

  assert.match(
    content,
    /state\.users\.filter\(\(user\) => user\.id !== userId\)/,
    'removeUser should filter out the target id'
  );

  assert.match(
    content,
    /lastSeen:\s*online \? undefined : Date\.now\(\)/,
    'setOnlineStatus should update lastSeen when a user disconnects'
  );

  assert.match(
    content,
    /return state\.users\.filter\(\(user\) => state\.onlineUsers\.has\(user\.id\)\);/,
    'getOnlineUsers should filter based on the onlineUsers set'
  );
});

test('theme catalog exposes multiple builtin themes with gradients', async () => {
  const content = await readSource('src/store/themeStore.ts');

  const expectedThemeIds = ['classic', 'neon', 'galaxy', 'matrix', 'minimal', 'technoPunk'];
  for (const themeId of expectedThemeIds) {
    const themeRegex = new RegExp(`id: '${themeId}'`, 'g');
    assert.match(
      content,
      themeRegex,
      `themeStore should define builtin theme with id "${themeId}"`
    );
  }

  assert.match(
    content,
    /withAlpha\('#06b6d4', 0\.2\)/,
    'classic theme should apply alpha blending helper for cyan accent'
  );

  assert.match(
    content,
    /return `rgba\(\$\{r\}, \$\{g\}, \$\{b\}, \$\{alpha\}\)`;/,
    'withAlpha should return rgba string for valid hex codes'
  );

  assert.match(
    content,
    /normalized\.startsWith\('rgb'\)/,
    'withAlpha should handle existing rgb color definitions'
  );
});
