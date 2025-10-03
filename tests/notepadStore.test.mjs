import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';

const originalDateNow = Date.now;
let tick = 0;
Date.now = () => {
  tick += 1;
  return tick;
};

const storageMap = new Map();

const localStorageStub = {
  getItem: (key) => (storageMap.has(key) ? storageMap.get(key) : null),
  setItem: (key, value) => {
    storageMap.set(key, value);
  },
  removeItem: (key) => {
    storageMap.delete(key);
  },
  clear: () => {
    storageMap.clear();
  },
  key: (index) => Array.from(storageMap.keys())[index] ?? null,
  get length() {
    return storageMap.size;
  },
};

if (typeof globalThis.localStorage === 'undefined') {
  Object.defineProperty(globalThis, 'localStorage', {
    value: localStorageStub,
    configurable: true,
  });
}

if (typeof globalThis.crypto === 'undefined' || typeof globalThis.crypto.randomUUID !== 'function') {
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    configurable: true,
  });
}

const { useNotepadStore } = await import('../dist-test/src/store/notepadStore.js');

const storeWithPersist = useNotepadStore;

const resetState = async () => {
  storageMap.clear();
  if (storeWithPersist.persist?.clearStorage) {
    await storeWithPersist.persist.clearStorage();
  }
  useNotepadStore.setState({
    notesByUser: {},
    activeNoteIdByUser: {},
    panelOpenByUser: {},
  });
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const userId = 'test-user';

const testCreateNoteSetsActive = async () => {
  await resetState();
  const { createNote } = useNotepadStore.getState();
  const created = createNote(userId);
  const notes = useNotepadStore.getState().getNotesForUser(userId);
  assert.equal(notes.length, 1);
  assert.equal(notes[0].id, created.id);
  assert.equal(notes[0].title, 'New note');
  assert.equal(notes[0].content, '');
  assert.equal(useNotepadStore.getState().getActiveNoteId(userId), created.id);
};

const testUpdateNoteResortsList = async () => {
  await resetState();
  const { createNote, updateNote } = useNotepadStore.getState();
  const first = createNote(userId);
  await wait(5);
  const second = createNote(userId);
  updateNote(userId, first.id, { title: 'Alpha', content: 'Hello world' });
  const notes = useNotepadStore.getState().getNotesForUser(userId);
  assert.equal(notes.length, 2);
  assert.equal(notes[0].id, first.id);
  assert.equal(notes[0].title, 'Alpha');
  assert.equal(notes[0].content, 'Hello world');
  assert(notes[0].updatedAt >= notes[1].updatedAt);
  assert.equal(notes[1].id, second.id);
};

const testDeleteNoteReassignsActive = async () => {
  await resetState();
  const { createNote, deleteNote } = useNotepadStore.getState();
  const first = createNote(userId);
  const second = createNote(userId);
  deleteNote(userId, second.id);
  const remaining = useNotepadStore.getState().getNotesForUser(userId);
  assert.equal(remaining.length, 1);
  assert.equal(remaining[0].id, first.id);
  assert.equal(useNotepadStore.getState().getActiveNoteId(userId), first.id);
};

const testPanelStateToggles = async () => {
  await resetState();
  const store = useNotepadStore.getState();
  assert.equal(store.isPanelOpen(userId), false);
  store.setPanelOpen(userId, true);
  assert.equal(useNotepadStore.getState().isPanelOpen(userId), true);
  store.togglePanel(userId);
  assert.equal(useNotepadStore.getState().isPanelOpen(userId), false);
};

const run = async () => {
  await testCreateNoteSetsActive();
  await testUpdateNoteResortsList();
  await testDeleteNoteReassignsActive();
  await testPanelStateToggles();
  console.log('✅ Notepad store tests passed');
};

try {
  await run();
} catch (error) {
  console.error('❌ Notepad store tests failed');
  console.error(error);
  process.exitCode = 1;
} finally {
  Date.now = originalDateNow;
  if (process.exitCode && process.exitCode !== 0) {
    process.exit(process.exitCode);
  }
}
