const LOG_STORAGE_KEY = 'harmonia.aiIntegrationLog';
const LOG_FILE_PATH = '/logs/aiIntegration.log';

type NodeAdapters = {
  fs: typeof import('node:fs/promises');
  path: typeof import('node:path');
};

let nodeAdaptersPromise: Promise<NodeAdapters | null> | null = null;

type GlobalWithProcess = typeof globalThis & {
  process?: {
    versions?: { node?: string };
    cwd?: () => string;
  };
};

function resolveProcess() {
  return (globalThis as GlobalWithProcess).process;
}

async function loadNodeAdapters(): Promise<NodeAdapters | null> {
  if (nodeAdaptersPromise) {
    return nodeAdaptersPromise;
  }

  const nodeProcess = resolveProcess();
  if (!nodeProcess?.versions?.node) {
    nodeAdaptersPromise = Promise.resolve(null);
    return nodeAdaptersPromise;
  }

  nodeAdaptersPromise = Promise.all([
    import(/* @vite-ignore */ 'node:fs/promises'),
    import(/* @vite-ignore */ 'node:path'),
  ])
    .then(([fs, path]) => ({ fs, path }))
    .catch(() => null);

  return nodeAdaptersPromise;
}

async function appendToFile(message: string) {
  const adapters = await loadNodeAdapters();
  if (!adapters) {
    return;
  }

  try {
    const nodeProcess = resolveProcess();
    const logPath = adapters.path.resolve(
      nodeProcess?.cwd?.() ?? '.',
      LOG_FILE_PATH.replace(/^\//, '')
    );
    await adapters.fs.mkdir(adapters.path.dirname(logPath), { recursive: true });
    await adapters.fs.appendFile(logPath, `${message}\n`);
  } catch (error) {
    console.error('Failed to append to log file', error);
  }
}

function appendToBrowserLog(message: string) {
  if (typeof window === 'undefined') {
    return;
  }

  const existing = window.localStorage.getItem(LOG_STORAGE_KEY);
  const entries = existing ? JSON.parse(existing) : [];
  entries.push(message);
  const trimmed = entries.slice(-500);
  window.localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(trimmed));
}

export async function logAIIntegration(message: string) {
  const timestamp = new Date().toISOString();
  const entry = `[${timestamp}] ${message}`;
  if (typeof window !== 'undefined') {
    appendToBrowserLog(entry);
  }
  await appendToFile(entry);
  // Mirror to console for developer visibility
  console.debug(entry);
}
