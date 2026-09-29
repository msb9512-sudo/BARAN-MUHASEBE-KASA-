const { app, BrowserWindow, ipcMain, shell, dialog, session } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');
const { startStaticServer } = require('./server.cjs');

// Fixed port constant: Kasa verileri (localStorage / IndexedDB) bu origin'e bağlıdır.
const FIXED_PORT = 47831;
const APP_URL = `http://localhost:${FIXED_PORT}`;

// 1. Single Instance Lock - İkinci bir kopya açılmasını engelle
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

let mainWindow = null;
let staticServer = null;

// Configure autoUpdater
autoUpdater.autoDownload = false; // Kullanıcı ayarlar sayfasından butona basarak indirir
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
    title: 'Baran Muhasebe Kasa',
    backgroundColor: '#0a0d12',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    show: false,
  });

  // Google girişinin engellenmemesi için User-Agent'tan 'Electron/...' ifadesini temizle
  const currentUA = mainWindow.webContents.getUserAgent();
  const cleanUA = currentUA.replace(/\sElectron\/[0-9\.]+/i, '');
  mainWindow.webContents.setUserAgent(cleanUA);
  session.defaultSession.setUserAgent(cleanUA);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // setWindowOpenHandler: Google girişi ve yerel adresler uygulama içi pencerede açılsın,
  // diğer dış bağlantılar varsayılan tarayıcıda açılsın.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.toLowerCase();

      // accounts.google.com, firebaseapp.com ve localhost:47831 adresleri uygulama içinde açılsın
      if (
        host.includes('accounts.google.com') ||
        host.includes('firebaseapp.com') ||
        (host === 'localhost' && parsed.port === String(FIXED_PORT)) ||
        (host === '127.0.0.1' && parsed.port === String(FIXED_PORT))
      ) {
        return {
          action: 'allow',
          overrideBrowserWindowOptions: {
            width: 600,
            height: 700,
            autoHideMenuBar: true,
            webPreferences: {
              nodeIntegration: false,
              contextIsolation: true,
            },
          },
        };
      }
    } catch {
      // Geçersiz url durumunda yoksay
    }

    // Diğer harici bağlantılar varsayılan tarayıcıda açılsın
    if (url.startsWith('https:') || url.startsWith('http:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // Sabit port üzerinden uygulamayı yükle (localStorage ve kasa verileri bu adreste saklanır)
  mainWindow.loadURL(APP_URL);

  // AutoUpdater event listeners -> Renderer süreci
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
  autoUpdater.quitAndInstall(false, true);
});

// İkinci kopya açılmaya çalışıldığında mevcut pencereyi öne getir
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

// App Lifecycle
app.whenReady().then(async () => {
  try {
    // Sabit 47831 portunda yerel sunucuyu başlat
    staticServer = await startStaticServer(FIXED_PORT);
  } catch (err) {
    console.error(`Port ${FIXED_PORT} başlatılamadı:`, err);
    dialog.showErrorBox(
      'Port Hatası (47831)',
      `Uygulama için gerekli olan sabit 47831 portu başka bir program tarafından kullanılıyor veya erişilemiyor.\n\nKasa kayıtlarınızın (localStorage) güvenliği için port sabit tutulmaktadır. Lütfen çakışan programı kapatıp uygulamayı tekrar başlatınız.`
    );
    app.quit();
    return;
  }

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

app.on('will-quit', () => {
  if (staticServer) {
    try {
      staticServer.close();
    } catch {
      // ignore
    }
  }
});
