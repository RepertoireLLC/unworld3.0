import { enclypseCrypto } from '../crypto/enclypse.js';

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface SecureLogEntry {
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
}

export class SecureLogger {
  async log(entry: SecureLogEntry) {
    const record = JSON.stringify({
      level: entry.level,
      message: entry.message,
      context: entry.context ?? null,
      timestamp: new Date().toISOString()
    });

    const encrypted = await enclypseCrypto.encryptAtRest(Buffer.from(record));
    const payload = {
      level: entry.level,
      payload: encrypted
    };

    const consoleMethod = entry.level === 'error' ? console.error : entry.level === 'warn' ? console.warn : console.log;
    consoleMethod(`[secure-log] ${Buffer.from(JSON.stringify(payload)).toString('base64')}`);
  }
}

export const secureLogger = new SecureLogger();
