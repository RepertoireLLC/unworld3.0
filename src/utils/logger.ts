const LOG_STORAGE_KEY = 'harmonia.aiIntegrationLog';
const LOG_FILE_PATH = '/logs/aiIntegration.log';

async function appendToFile(message: string) {
  if (typeof window !== 'undefined') {
    return;
  }

  try {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const logPath = path.resolve(process.cwd(), LOG_FILE_PATH.replace(/^\//, ''));
    await fs.mkdir(path.dirname(logPath), { recursive: true });
    await fs.appendFile(logPath, `${message}\n`);
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
