export interface ElectronUpdateInfo {
  version: string;
  releaseDate?: string;
  releaseNotes?: string | Array<{ version: string; note: string }>;
  files?: Array<{ url: string; size?: number; sha512?: string }>;
}

export interface ElectronDownloadProgress {
  percent: number;
  bytesPerSecond: number;
  transferred: number;
  total: number;
}

export interface ElectronAPI {
  isElectron: boolean;
  getVersion: () => Promise<string>;
  getUserDataPath: () => Promise<string>;
  checkForUpdates: () => Promise<{ success: boolean; result?: any; error?: string }>;
  downloadUpdate: () => Promise<{ success: boolean; result?: any; error?: string }>;
  quitAndInstall: () => Promise<void>;

  onUpdateChecking: (callback: () => void) => () => void;
  onUpdateAvailable: (callback: (info: ElectronUpdateInfo) => void) => () => void;
  onUpdateNotAvailable: (callback: (info: { version: string }) => void) => () => void;
  onDownloadProgress: (callback: (progress: ElectronDownloadProgress) => void) => () => void;
  onUpdateDownloaded: (callback: (info: { version: string; releaseNotes?: any }) => void) => () => void;
  onError: (callback: (error: { message: string }) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
