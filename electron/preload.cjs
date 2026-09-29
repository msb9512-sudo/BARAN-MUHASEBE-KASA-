const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  getVersion: () => ipcRenderer.invoke('app:get-version'),
  getUserDataPath: () => ipcRenderer.invoke('app:get-user-data-path'),
  checkForUpdates: () => ipcRenderer.invoke('updater:check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('updater:download-update'),
  quitAndInstall: () => ipcRenderer.invoke('updater:quit-and-install'),

  // Event Listeners from autoUpdater
  onUpdateChecking: (callback) => {
    const subscription = () => callback();
    ipcRenderer.on('updater:checking', subscription);
    return () => ipcRenderer.removeListener('updater:checking', subscription);
  },
  onUpdateAvailable: (callback) => {
    const subscription = (_event, info) => callback(info);
    ipcRenderer.on('updater:update-available', subscription);
    return () => ipcRenderer.removeListener('updater:update-available', subscription);
  },
  onUpdateNotAvailable: (callback) => {
    const subscription = (_event, info) => callback(info);
    ipcRenderer.on('updater:update-not-available', subscription);
    return () => ipcRenderer.removeListener('updater:update-not-available', subscription);
  },
  onDownloadProgress: (callback) => {
    const subscription = (_event, progress) => callback(progress);
    ipcRenderer.on('updater:download-progress', subscription);
    return () => ipcRenderer.removeListener('updater:download-progress', subscription);
  },
  onUpdateDownloaded: (callback) => {
    const subscription = (_event, info) => callback(info);
    ipcRenderer.on('updater:update-downloaded', subscription);
    return () => ipcRenderer.removeListener('updater:update-downloaded', subscription);
  },
  onError: (callback) => {
    const subscription = (_event, err) => callback(err);
    ipcRenderer.on('updater:error', subscription);
    return () => ipcRenderer.removeListener('updater:error', subscription);
  },
});
