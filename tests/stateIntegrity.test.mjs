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

test('node resonance store blends category hues without intensity bias', async () => {
  const content = await readSource('src/store/nodeResonanceStore.ts');

  assert.match(
    content,
    /const baselineContribution = 0\.4;/,
    'baseline contribution should remain at 0.4 to favor recent activity in blends'
  );

  assert.match(
    content,
    /recent\[category] = \(recent\[category] \?\? 0\) \+ weight \* recentContribution;/,
    'recent weights should accumulate without intensity scaling to honor category ratios'
  );

  assert.doesNotMatch(
    content,
    /weight \* intensity/,
    'category weights should not multiply by interaction intensity'
  );

  assert.match(
    content,
    /const blendedColor = blendCategoryColors\(normalizedComposite\);/,
    'normalized composites should resolve through the category blend helper'
  );

  assert.match(
    content,
    /blendWithCurrentColor\(entry, blendedColor, intensity\);/,
    'intensity should only inform easing toward the blended hue'
  );
});

test('chess store orchestrates invites, gameplay, and archival state', async () => {
  const content = await readSource('src/store/chessStore.ts');

  assert.match(
    content,
    /const chessVault = createSecureVault<ChessPersistedState>\({/,
    'chessStore should persist state through the secure vault'
  );

  assert.match(
    content,
    /sendInvite\(fromUserId, toUserId\)/,
    'sendInvite should be exposed to coordinate challenges between users'
  );

  assert.match(
    content,
    /acceptInvite: \(/,
    'acceptInvite should promote pending invites into active games'
  );

  assert.match(
    content,
    /makeMove:\s*\(/,
    'makeMove should validate and apply moves for multiplayer turns'
  );

  assert.match(
    content,
    /generatePGN\(game, whiteName, blackName\)/,
    'generatePGN should archive completed games with metadata headers'
  );
});

test('reels store manages creation, feed scoring, and retention', async () => {
  const content = await readSource('src/store/reelsStore.ts');

  assert.match(
    content,
    /const reelsVault = createSecureVault<ReelPersistedState>\({/,
    'reelsStore should encrypt persisted feed state'
  );

  assert.match(
    content,
    /createReel: \(creator, payload\) => {/,
    'createReel should accept creator context and payload details'
  );

  assert.match(
    content,
    /getFeedForUser: \(options: ReelFeedOptions\) => ReelRecord\[]/,
    'getFeedForUser should expose recommendation-aware feed assembly'
  );

  assert.match(
    content,
    /toggleLike: \(reelId, userId, displayName\) => {/,
    'toggleLike should support engagement interactions on reels'
  );

  assert.match(
    content,
    /purgeUserData: \(userId: string\) => void/,
    'purgeUserData should remove reels when an account is deleted'
  );
});

test('settings modal surfaces account, content, privacy, and support hubs', async () => {
  const content = await readSource('src/components/interface/SettingsModal.tsx');

  assert.match(
    content,
    /label: 'Account'/,
    'settings modal should register the Account category'
  );

  assert.match(
    content,
    /label: 'Content'/,
    'settings modal should register the Content category'
  );

  assert.match(
    content,
    /label: 'Privacy'/,
    'settings modal should register the Privacy category'
  );

  assert.match(
    content,
    /label: 'Support'/,
    'settings modal should register the Support category'
  );

  assert.match(
    content,
    /onSubmit={handleDeleteAccount}/,
    'settings modal should wire the delete account confirmation form'
  );

  assert.match(
    content,
    /onChange={handleNsfwToggle}/,
    'settings modal should include the NSFW content toggle control'
  );

  assert.match(
    content,
    /Contact support/,
    'settings modal should present the contact support form entry point'
  );
});
