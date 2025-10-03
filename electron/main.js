import { app, BrowserWindow, shell } from 'electron';
import path from 'path';
import url from 'url';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FRONTEND_ENTRY = process.env.ENCLYPSE_ENTRY || path.join(__dirname, '..', 'enclypse', 'frontend', 'login.html');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 840,
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  win.loadURL(
    url.format({
      pathname: FRONTEND_ENTRY,
      protocol: 'file:',
      slashes: true,
    }),
  );

  win.webContents.setWindowOpenHandler(({ url: externalUrl }) => {
    shell.openExternal(externalUrl);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
