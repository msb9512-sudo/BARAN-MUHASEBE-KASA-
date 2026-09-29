const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');

// Keep reference to main window to prevent garbage collection
let mainWindow = null;

// Configure autoUpdater
autoUpdater.autoDownload = false; // User controls download via UI
autoUpdater.autoInstallOnAppQuit = true;
autoUpdater.allowPrerelease = false;
autoUpdater.logger = console;

// Configure GitHub repo for updates
autoUpdater.setFeedURL({
  provider: 'github',
  owner: 'msb9512-sudo',
  repo: 'BARAN-MUHASEBE-KASA-',
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'Baran Muhasebe ve Kasa Yönetim Sistemi',
    backgroundColor: '#0a0d12',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    show: false,
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Open external links in user's default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:') || url.startsWith('http:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // Load URL or local index.html
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
    if (fs.existsSync(indexPath)) {
      mainWindow.loadFile(indexPath);
    } else {
      mainWindow.loadURL('http://localhost:3000');
    }
  }

  // Handle autoUpdater events and forward to renderer process
  autoUpdater.on('checking-for-update', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('updater:checking');
    }
  });

  autoUpdater.on('update-available', (info) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('updater:update-available', {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes,
        files: info.files,
      });
    }
  });

  autoUpdater.on('update-not-available', (info) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('updater:update-not-available', {
        version: info?.version || app.getVersion(),
      });
    }
  });

  autoUpdater.on('error', (err) => {
    console.error('electron-updater error:', err);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('updater:error', {
        message: err?.message || 'Güncelleme sunucusuna erişilemedi veya release bulunamadı.',
      });
    }
  });

  autoUpdater.on('download-progress', (progressObj) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('updater:download-progress', {
        percent: Math.round(progressObj.percent || 0),
        bytesPerSecond: progressObj.bytesPerSecond || 0,
        transferred: progressObj.transferred || 0,
        total: progressObj.total || 0,
      });
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('updater:update-downloaded', {
        version: info.version,
        releaseNotes: info.releaseNotes,
      });
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers
ipcMain.handle('app:get-version', () => {
  return app.getVersion();
});

ipcMain.handle('app:get-user-data-path', () => {
  return app.getPath('userData');
});

ipcMain.handle('updater:check-for-updates', async () => {
  try {
    const result = await autoUpdater.checkForUpdates();
    return { success: true, result };
  } catch (error) {
    console.error('checkForUpdates failed:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('updater:download-update', async () => {
  try {
    const result = await autoUpdater.downloadUpdate();
    return { success: true, result };
  } catch (error) {
    console.error('downloadUpdate failed:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('updater:quit-and-install', () => {
  // isSilent: false, isForceRunAfter: true
  // User data in %APPDATA%/baran-kasa-yonetimi is strictly preserved by NSIS/Squirrel
  autoUpdater.quitAndInstall(false, true);
});

// App lifecycle
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
