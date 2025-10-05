import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: Number(process.env.PORT ?? 4000),
  databasePath: process.env.DATABASE_PATH ?? './enclypse.db',
  encryptionKey: (process.env.ENCRYPTION_KEY ?? 'enclypse_dev_key').padEnd(32, '0').slice(0, 32),
};
