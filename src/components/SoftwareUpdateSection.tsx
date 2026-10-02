import React, { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  Download,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  ShieldCheck,
  FolderGit2,
  Terminal,
  Layers,
  Database,
  Info,
  Server,
  GitCommit,
  Check,
  RotateCcw,
  ExternalLink,
  Laptop,
  HardDrive,
  Cpu,
  ArrowRight,
} from 'lucide-react';
import { ElectronDownloadProgress, ElectronUpdateInfo } from '../types/electron';

interface SoftwareUpdateSectionProps {
  onNotify?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const DEFAULT_REPO = 'msb9512-sudo/BARAN-MUHASEBE-KASA-';
const DEFAULT_BRANCH = 'main';

export const SoftwareUpdateSection: React.FC<SoftwareUpdateSectionProps> = ({ onNotify }) => {
  // Running environment check
  const isElectron = typeof window !== 'undefined' && !!window.electronAPI?.isElectron;

  // Local version state
  const [currentVersion, setCurrentVersion] = useState<string>('1.0.5');
  const [isLoadingLocalVersion, setIsLoadingLocalVersion] = useState(true);
  const [userDataPath, setUserDataPath] = useState<string | null>(null);

  // GitHub configuration
  const [githubRepo, setGithubRepo] = useState<string>(() => {
    const saved = localStorage.getItem('app_update_github_repo');
    if (!saved || saved === 'msb9512/kasa-yonetimi' || saved.includes('kasa-yonetimi') || !saved.includes('/')) {
      localStorage.setItem('app_update_github_repo', DEFAULT_REPO);
      return DEFAULT_REPO;
    }
    return saved;
  });

  const [githubBranch, setGithubBranch] = useState<string>(() => {
    return localStorage.getItem('app_update_github_branch') || DEFAULT_BRANCH;
  });
  const [isRepoSaved, setIsRepoSaved] = useState(false);

  // Update check states
  const [status, setStatus] = useState<
    'idle' | 'checking' | 'up-to-date' | 'update-available' | 'downloading' | 'downloaded' | 'success' | 'error'
  >('idle');
  const [remoteVersion, setRemoteVersion] = useState<string | null>(null);
  const [releaseNotes, setReleaseNotes] = useState<string | null>(null);
  const [releaseDate, setReleaseDate] = useState<string | null>(null);
  const [releaseExeUrl, setReleaseExeUrl] = useState<string | null>(null);
  const [releaseExeName, setReleaseExeName] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [lastCheckTime, setLastCheckTime] = useState<string | null>(() => {
    return localStorage.getItem('app_last_update_check') || null;
  });

  // Download & Installation progress
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [downloadSpeedText, setDownloadSpeedText] = useState<string>('');
  const [downloadSizeText, setDownloadSizeText] = useState<string>('');
  const [downloadStepText, setDownloadStepText] = useState<string>('');
  const [countdown, setCountdown] = useState<number>(3);

  // Active guide tab
  const [activeTab, setActiveTab] = useState<'status' | 'architecture' | 'actions'>('status');

  // Format bytes helper
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Compare semver: returns 1 if vA > vB, -1 if vA < vB, 0 if equal
  const compareSemVer = (vA: string, vB: string): number => {
    const cleanA = vA.replace(/^v/i, '').trim().split('.').map((n) => parseInt(n, 10) || 0);
    const cleanB = vB.replace(/^v/i, '').trim().split('.').map((n) => parseInt(n, 10) || 0);

    for (let i = 0; i < Math.max(cleanA.length, cleanB.length); i++) {
      const a = cleanA[i] || 0;
      const b = cleanB[i] || 0;
      if (a > b) return 1;
      if (a < b) return -1;
    }
    return 0;
  };

  // Load version on mount
  useEffect(() => {
    let isMounted = true;

    async function init() {
      // 1. Try reading version from electronAPI if running in Electron
      if (window.electronAPI) {
        try {
          const appVer = await window.electronAPI.getVersion();
          if (appVer && isMounted) {
            setCurrentVersion(appVer);
            localStorage.setItem('app_installed_version', appVer);
          }
          const dataPath = await window.electronAPI.getUserDataPath();
          if (dataPath && isMounted) {
            setUserDataPath(dataPath);
          }
          setIsLoadingLocalVersion(false);
          return;
        } catch (e) {
          console.warn('Electron API version read failed:', e);
        }
      }

      // 2. Fallback to /version.txt
      try {
        const res = await fetch(`/version.txt?t=${Date.now()}`);
        if (res.ok) {
          const txt = await res.text();
          const clean = txt.trim();
          if (clean && isMounted) {
            setCurrentVersion(clean);
            localStorage.setItem('app_installed_version', clean);
          }
        }
      } catch (err) {
        console.warn('version.txt read failed:', err);
      } finally {
        if (isMounted) setIsLoadingLocalVersion(false);
      }
    }

    init();
    return () => {
      isMounted = false;
    };
  }, [isElectron]);

  // Setup electron-updater event listeners when running in Electron
  useEffect(() => {
    if (!window.electronAPI) return;

    const unsubs: Array<() => void> = [];

    // Checking event
    unsubs.push(
      window.electronAPI.onUpdateChecking(() => {
        setStatus('checking');
        setStatusMessage('GitHub Releases üzerinden en son Windows sürümü kontrol ediliyor...');
        setErrorDetails(null);
      })
    );

    // Update available event
    unsubs.push(
      window.electronAPI.onUpdateAvailable((info: ElectronUpdateInfo) => {
        setStatus('update-available');
        setRemoteVersion(info.version);
        if (info.releaseDate) setReleaseDate(info.releaseDate);
        if (info.releaseNotes) {
          setReleaseNotes(
            typeof info.releaseNotes === 'string'
              ? info.releaseNotes
              : JSON.stringify(info.releaseNotes)
          );
        }
        setStatusMessage(`Yeni Windows sürümü yayınlandı: v${info.version} (Mevcut: v${currentVersion})`);
      })
    );

    // Update not available event
    unsubs.push(
      window.electronAPI.onUpdateNotAvailable((info: { version: string }) => {
        setStatus('up-to-date');
        setStatusMessage(`Uygulamanız tamamen güncel! En son sürümü kullanıyorsunuz (v${info.version || currentVersion}).`);
      })
    );

    // Download progress event
    unsubs.push(
      window.electronAPI.onDownloadProgress((progress: ElectronDownloadProgress) => {
        setStatus('downloading');
        setDownloadProgress(progress.percent);
        const speed = formatBytes(progress.bytesPerSecond) + '/s';
        const transferred = formatBytes(progress.transferred);
        const total = formatBytes(progress.total);
        setDownloadSpeedText(speed);
        setDownloadSizeText(`${transferred} / ${total}`);
        setDownloadStepText(`Yeni Windows sürümü indiriliyor... (${transferred} / ${total} - ${speed})`);
      })
    );

    // Update downloaded event
    unsubs.push(
      window.electronAPI.onUpdateDownloaded((info: { version: string }) => {
        setStatus('downloaded');
        setRemoteVersion(info.version);
        setStatusMessage(`v${info.version} kurulum paketi başarıyla indirildi. Yüklemeye hazır!`);
        setDownloadStepText('Kurulum paketi doğrulandı. Kasa verileriniz korunarak uygulama güncellenecektir.');

        if (onNotify) {
          onNotify(`v${info.version} güncellemesi indirildi. Uygulama yeniden başlatılacak.`, 'success');
        }
      })
    );

    // Error event
    unsubs.push(
      window.electronAPI.onError((err: { message: string }) => {
        setStatus('error');
        setErrorDetails(
          `electron-updater hatası: ${err.message}. Mevcut kurulu sürümünüz ve kasa verileriniz güvendedir.`
        );
        setStatusMessage('Güncelleme denetimi veya indirme başarısız oldu.');
      })
    );

    return () => {
      unsubs.forEach((fn) => fn());
    };
  }, [currentVersion, onNotify]);

  // Save repo configuration
  const handleSaveRepoConfig = () => {
    const cleanRepo = githubRepo.trim() || DEFAULT_REPO;
    const cleanBranch = githubBranch.trim() || DEFAULT_BRANCH;
    localStorage.setItem('app_update_github_repo', cleanRepo);
    localStorage.setItem('app_update_github_branch', cleanBranch);
    setGithubRepo(cleanRepo);
    setGithubBranch(cleanBranch);
    setIsRepoSaved(true);
    setTimeout(() => setIsRepoSaved(false), 2500);
    if (onNotify) {
      onNotify('GitHub depo ayarları kaydedildi', 'success');
    }
  };

  // Reset to default repo
  const handleResetDefaultRepo = () => {
    localStorage.setItem('app_update_github_repo', DEFAULT_REPO);
    localStorage.setItem('app_update_github_branch', DEFAULT_BRANCH);
    setGithubRepo(DEFAULT_REPO);
    setGithubBranch(DEFAULT_BRANCH);
    if (onNotify) {
      onNotify(`Depo varsayılana (${DEFAULT_REPO}) sıfırlandı`, 'info');
    }
  };

  // Check for updates (Electron autoUpdater OR GitHub Releases API)
  const handleCheckUpdates = useCallback(async () => {
    setStatus('checking');
    setErrorDetails(null);
    setStatusMessage('GitHub Releases üzerinde en son yayınlanan sürüm kontrol ediliyor...');

    const nowTime = new Date().toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    setLastCheckTime(nowTime);
    localStorage.setItem('app_last_update_check', nowTime);

    const repoClean = (githubRepo.trim() || DEFAULT_REPO)
      .replace(/^https?:\/\/github\.com\//i, '')
      .replace(/\/$/, '');

    // 1. If running in Electron: use electron-updater
    if (window.electronAPI) {
      try {
        const res = await window.electronAPI.checkForUpdates();
        if (!res.success && res.error) {
          throw new Error(res.error);
        }
        return;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Electron güncelleme motoruna erişilemedi';
        console.warn('Electron updater check failed, falling back to GitHub API:', msg);
      }
    }

    // 2. Direct GitHub Releases API check (Works in both browser and Electron)
    try {
      const releaseApiUrl = `https://api.github.com/repos/${repoClean}/releases/latest`;
      const res = await fetch(releaseApiUrl, {
        headers: { Accept: 'application/vnd.github.v3+json' },
      });

      if (res.status === 404) {
        // No release created yet in GitHub repo
        // Also check raw version.txt as fallback
        const rawUrl = `https://raw.githubusercontent.com/${repoClean}/${githubBranch}/version.txt?t=${Date.now()}`;
        const rawRes = await fetch(rawUrl, { cache: 'no-store' });
        if (rawRes.ok) {
          const txt = (await rawRes.text()).trim();
          const comparison = compareSemVer(txt, currentVersion);
          if (comparison > 0) {
            setStatus('update-available');
            setRemoteVersion(txt);
            setStatusMessage(`GitHub main dalında v${txt} bulundu (Henüz Release derlenmemiş olabilir).`);
            return;
          }
        }

        setStatus('up-to-date');
        setStatusMessage(
          `GitHub Releases henüz oluşturulmamış veya yayınlanmış yeni sürüm yok. Sürümünüz: v${currentVersion}`
        );
        return;
      }

      if (!res.ok) {
        throw new Error(`GitHub API yanıt vermedi (HTTP ${res.status}). İnternet bağlantınızı kontrol ediniz.`);
      }

      const releaseData = await res.json();
      const latestTag = (releaseData.tag_name || '').replace(/^v/i, '').trim();
      const releaseBody = releaseData.body || null;
      const pubDate = releaseData.published_at
        ? new Date(releaseData.published_at).toLocaleDateString('tr-TR')
        : null;

      // Find Windows .exe installer asset
      const assets = releaseData.assets || [];
      const exeAsset = assets.find(
        (a: any) => a.name && (a.name.endsWith('.exe') || a.name.includes('Setup'))
      );

      setRemoteVersion(latestTag);
      setReleaseNotes(releaseBody);
      setReleaseDate(pubDate);

      if (exeAsset) {
        setReleaseExeUrl(exeAsset.browser_download_url);
        setReleaseExeName(exeAsset.name);
      } else {
        setReleaseExeUrl(null);
        setReleaseExeName(null);
      }

      const comparison = compareSemVer(latestTag, currentVersion);

      if (comparison > 0) {
        setStatus('update-available');
        setStatusMessage(`Yeni sürüm mevcut: v${latestTag} (Mevcut: v${currentVersion})`);
      } else {
        setStatus('up-to-date');
        setStatusMessage(`Uygulamanız güncel! En son yayınlanan sürümü (v${currentVersion}) kullanıyorsunuz.`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'GitHub bağlantı hatası oluştu';
      setStatus('error');
      setErrorDetails(
        `Güncelleme kontrolü başarısız: ${msg}. Eski çalışan sürümünüz (v${currentVersion}) bozulmadan korunmaktadır. Verileriniz güvendedir.`
      );
      setStatusMessage('Güncelleme sunucusuna erişilemedi.');
    }
  }, [currentVersion, githubBranch, githubRepo]);

  // Execute update download via electron-updater or browser
  const handleExecuteUpdate = async () => {
    setStatus('downloading');
    setDownloadProgress(10);
    setDownloadStepText('Kullanıcı verileri kilitleniyor (%APPDATA% korunuyor)...');

    // 1. If in Electron: trigger electron-updater download
    if (window.electronAPI) {
      try {
        setDownloadProgress(25);
        setDownloadStepText('electron-updater GitHub Release üzerinden yeni sürümü indiriyor...');
        const res = await window.electronAPI.downloadUpdate();
        if (!res.success && res.error) {
          throw new Error(res.error);
        }
        return;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'İndirme başlatılamadı';
        setStatus('error');
        setErrorDetails(
          `electron-updater indirme hatası: ${msg}. Mevcut çalışan sürümünüz ve kasa verileriniz bozulmadan korunmaktadır.`
        );
        setStatusMessage('İndirme işlemi başarısız oldu.');
        if (onNotify) {
          onNotify('İndirme başarısız: ' + msg, 'error');
        }
        return;
      }
    }

    // 2. Web browser mode: if exe download link available, open download
    if (releaseExeUrl) {
      setDownloadProgress(100);
      setStatus('downloaded');
      setDownloadStepText('Windows .exe kurulum dosyası indiriliyor...');
      window.open(releaseExeUrl, '_blank');
      if (onNotify) {
        onNotify('Windows kurulum dosyası indirilmeye başlandı.', 'success');
      }
      return;
    }

    // Direct GitHub release page fallback
    const repoClean = (githubRepo.trim() || DEFAULT_REPO)
      .replace(/^https?:\/\/github\.com\//i, '')
      .replace(/\/$/, '');
    window.open(`https://github.com/${repoClean}/releases`, '_blank');
    setStatus('downloaded');
    setDownloadStepText('GitHub Release indirme sayfası açıldı.');
  };

  // Quit and install update via electron-updater
  const handleQuitAndInstall = () => {
    if (window.electronAPI) {
      window.electronAPI.quitAndInstall();
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5 min-w-0">
            <div className="p-3 rounded-2xl bg-orange-500/10 border border-orange-500/30 text-orange-400 shrink-0">
              <RefreshCw className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2 text-xs font-semibold text-orange-400 uppercase tracking-wider mb-0.5 font-mono">
                <span className="w-2 h-2 rounded-full bg-orange-500 inline-block animate-pulse"></span>
                <span>YAZILIM GÜNCELLEME SİSTEMİ</span>
                <span className="text-gray-500">•</span>
                <span className="text-gray-400 lowercase font-normal flex items-center space-x-1">
                  <Laptop className="w-3.5 h-3.5" />
                  <span>{isElectron ? 'Electron-Updater (Masaüstü)' : 'GitHub Release Entegrasyonu'}</span>
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Otomatik Güncelleme & Release Yönetimi
              </h2>
              <p className="text-xs text-gray-400 font-mono mt-0.5">
                GitHub Releases üzerinden yeni Windows kurulum paketlerini kontrol edin ve tek tıkla güncelleyin. Kasa verileriniz asla silinmez.
              </p>
            </div>
          </div>

          {/* Sürüm & Ortam Rozeti */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 shrink-0">
            <div className="flex items-center space-x-2 bg-[#0d1117] border border-[#30363d] px-3.5 py-2 rounded-xl">
              <span className="text-xs font-mono text-gray-400">Kurulu Sürüm:</span>
              <span className="text-sm font-bold font-mono text-orange-400 bg-orange-500/10 px-2.5 py-0.5 rounded border border-orange-500/30">
                {isLoadingLocalVersion ? 'Okunuyor...' : `v${currentVersion}`}
              </span>
            </div>

            <div
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl border text-xs font-mono font-bold ${
                isElectron
                  ? 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>{isElectron ? 'Masaüstü (Electron)' : 'Web / Önizleme Modu'}</span>
            </div>
          </div>
        </div>

        {/* Tab Switcher: Kontrol Paneli / Mimari / GitHub Actions */}
        <div className="flex items-center space-x-2 mt-5 pt-4 border-t border-[#30363d] overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('status')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-mono transition flex items-center space-x-2 cursor-pointer border ${
              activeTab === 'status'
                ? 'bg-orange-500/20 text-orange-300 font-bold border-orange-500/50 shadow-xs'
                : 'bg-[#0d1117] hover:bg-[#21262d] text-gray-400 hover:text-white border-[#30363d]'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Güncelleme Kontrolü</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('architecture')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-mono transition flex items-center space-x-2 cursor-pointer border ${
              activeTab === 'architecture'
                ? 'bg-orange-500/20 text-orange-300 font-bold border-orange-500/50 shadow-xs'
                : 'bg-[#0d1117] hover:bg-[#21262d] text-gray-400 hover:text-white border-[#30363d]'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>electron-updater & Veri Güvenliği Mimarisi</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('actions')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-mono transition flex items-center space-x-2 cursor-pointer border ${
              activeTab === 'actions'
                ? 'bg-orange-500/20 text-orange-300 font-bold border-orange-500/50 shadow-xs'
                : 'bg-[#0d1117] hover:bg-[#21262d] text-gray-400 hover:text-white border-[#30363d]'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>GitHub Actions Otomatik EXE Derleme</span>
          </button>
        </div>
      </div>

      {/* 2. Main Content Tabs */}
      {activeTab === 'status' && (
        <div className="space-y-6">
          {/* GitHub Repo Configuration Card */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#30363d]">
              <div className="flex items-center space-x-2.5">
                <FolderGit2 className="w-4 h-4 text-orange-400" />
                <h3 className="font-bold text-sm text-white font-mono uppercase tracking-wider">
                  GitHub Release Kaynağı (Depo & Dal)
                </h3>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-mono text-gray-400">
                  Hedef: <strong className="text-orange-300">{githubRepo}</strong>
                </span>
                {githubRepo !== DEFAULT_REPO && (
                  <button
                    type="button"
                    onClick={handleResetDefaultRepo}
                    className="text-[11px] font-mono text-orange-400 hover:text-orange-300 underline cursor-pointer"
                  >
                    Varsayılana Sıfırla
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs text-gray-400 font-mono block">
                  GitHub Deposu (Kullanıcı / Repo Adı):
                </label>
                <input
                  type="text"
                  value={githubRepo}
                  onChange={(e) => setGithubRepo(e.target.value)}
                  placeholder={DEFAULT_REPO}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3.5 py-2 text-xs font-mono text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-400 font-mono block">
                  Release Dalı (Branch):
                </label>
                <input
                  type="text"
                  value={githubBranch}
                  onChange={(e) => setGithubBranch(e.target.value)}
                  placeholder={DEFAULT_BRANCH}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3.5 py-2 text-xs font-mono text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none transition"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <p className="text-[11px] font-mono text-gray-500">
                {isElectron
                  ? 'electron-updater bu depodaki en son Release ve latest.yml dosyasını tarayarak güncellemeleri yönetir.'
                  : 'GitHub Releases API ile bu depodaki en güncel Windows kurulum paketi denetlenir.'}
              </p>
              <button
                type="button"
                onClick={handleSaveRepoConfig}
                className="px-3 py-1.5 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] rounded-lg text-xs font-mono text-gray-200 hover:text-white transition cursor-pointer flex items-center space-x-1.5"
              >
                {isRepoSaved ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 font-bold">Kaydedildi</span>
                  </>
                ) : (
                  <span>Ayarları Kaydet</span>
                )}
              </button>
            </div>
          </div>

          {/* Action Center: Kontrol Butonu & Durum Kartı */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 sm:p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-base text-white font-mono flex items-center space-x-2">
                  <span>Sürüm Durumu & Kontrol</span>
                  {status === 'checking' && (
                    <span className="text-xs text-orange-400 font-normal animate-pulse">Sorgulanıyor...</span>
                  )}
                </h3>
                <p className="text-xs text-gray-400 font-mono mt-0.5">
                  {lastCheckTime
                    ? `Son kontrol zamanı: ${lastCheckTime}`
                    : 'Henüz güncelleme kontrolü yapılmadı.'}
                </p>
              </div>

              <div className="flex items-center space-x-2 flex-wrap">
                {/* Güncellemeleri Kontrol Et Butonu */}
                <button
                  type="button"
                  id="btn-check-updates"
                  disabled={status === 'checking' || status === 'downloading'}
                  onClick={handleCheckUpdates}
                  className={`px-4 py-2.5 rounded-xl font-mono text-xs font-bold transition flex items-center space-x-2 cursor-pointer border shadow-md ${
                    status === 'checking'
                      ? 'bg-orange-500/50 text-white cursor-not-allowed'
                      : 'bg-orange-500 hover:bg-orange-600 text-white border-orange-400 hover:border-orange-300'
                  }`}
                >
                  <RefreshCw className={`w-4 h-4 ${status === 'checking' ? 'animate-spin' : ''}`} />
                  <span>{status === 'checking' ? 'Kontrol Ediliyor...' : 'Güncellemeleri Kontrol Et'}</span>
                </button>
              </div>
            </div>

            {/* Durum Mesajı Alanı: Idle */}
            {status === 'idle' && (
              <div className="p-4 rounded-xl bg-[#0d1117] border border-[#30363d] flex items-center space-x-3 text-xs font-mono text-gray-400">
                <Info className="w-4 h-4 text-gray-400 shrink-0" />
                <span>
                  GitHub'daki en son yayınlanan Windows Release paketini denetlemek için yukarıdaki{' '}
                  <strong>"Güncellemeleri Kontrol Et"</strong> butonuna basınız.
                </span>
              </div>
            )}

            {/* Durum Mesajı Alanı: Checking */}
            {status === 'checking' && (
              <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center space-x-3 text-xs font-mono text-orange-300 animate-pulse">
                <RefreshCw className="w-4 h-4 animate-spin text-orange-400 shrink-0" />
                <span>
                  GitHub Releases taranıyor ({githubRepo})... {statusMessage}
                </span>
              </div>
            )}

            {/* GÜNCEL DURUM */}
            {status === 'up-to-date' && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 space-y-3 text-xs font-mono">
                <div className="flex items-start space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-bold text-sm text-emerald-400">Yazılımınız Tamamen Güncel!</div>
                    <p className="text-emerald-300/80 mt-1">
                      En son yayınlanan sürüm olan <strong>v{currentVersion}</strong> kullanılıyor. GitHub Releases üzerinde daha yeni bir kurulum paketi bulunmamaktadır.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* v1.0.5 Güncel Sürüm İçeriği ve Değişiklik Notları */}
            <div className="p-4 rounded-xl bg-[#0d1117] border border-[#30363d] space-y-3 text-xs font-mono">
              <div className="flex items-center justify-between border-b border-[#21262d] pb-2">
                <div className="flex items-center space-x-2">
                  <GitCommit className="w-4 h-4 text-orange-400" />
                  <span className="font-bold text-white uppercase tracking-wider">
                    v1.0.5 Sürüm İçeriği & Yenilikler
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20 text-[10px] font-bold">
                  v1.0.5 Güncel
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-[11px] text-gray-300">
                <div className="p-3 bg-[#161b22] rounded-lg border border-[#21262d] space-y-1">
                  <div className="font-bold text-orange-300 flex items-center space-x-1.5">
                    <span>💳 Üstte POS & Dikey Düzen</span>
                  </div>
                  <p className="text-gray-400 leading-relaxed">
                    Günlük Kasa ekranında POS Cihazları Z Raporları en üste alındı. Grup raporu satışları ve ürün grupları dikey sırada tam genişlikte yerleştirildi.
                  </p>
                </div>

                <div className="p-3 bg-[#161b22] rounded-lg border border-[#21262d] space-y-1">
                  <div className="font-bold text-orange-300 flex items-center space-x-1.5">
                    <span>📅 İnteraktif Mini Takvim & Dinamik Bugün</span>
                  </div>
                  <p className="text-gray-400 leading-relaxed">
                    Üst bardaki "Bugün" butonu anlık gerçek güne gider. Tarihe tıklandığında ay, yıl ve gün seçimi sağlayan Türkçe açılır mini takvim popover'ı açılır.
                  </p>
                </div>

                <div className="p-3 bg-[#161b22] rounded-lg border border-[#21262d] space-y-1">
                  <div className="font-bold text-orange-300 flex items-center space-x-1.5">
                    <span>📋 Genişletilmiş Kapanış Pencereleri</span>
                  </div>
                  <p className="text-gray-400 leading-relaxed">
                    Günlük Kapanış ekranında 4 finansal pencere tam genişlikte 2 sütunlu büyük pencerelere genişletildi. Otomatik Kapanış Denetim Listesi en alta 4'lü kart olarak konumlandırıldı.
                  </p>
                </div>

                <div className="p-3 bg-[#161b22] rounded-lg border border-[#21262d] space-y-1">
                  <div className="font-bold text-orange-300 flex items-center space-x-1.5">
                    <span>⚡ Kompakt Gider Formu & Sade Tasarım</span>
                  </div>
                  <p className="text-gray-400 leading-relaxed">
                    Gider ekleme penceresindeki yer kaplayan uyarı kutusu ve alt bilgi formül yazısı kaldırılarak sade, hızlı ve ergonomik bir kullanıcı deneyimi sağlandı.
                  </p>
                </div>
              </div>
            </div>

            {/* YENİ SÜRÜM VAR DURUMU */}
            {status === 'update-available' && remoteVersion && (
              <div className="p-5 rounded-2xl bg-gradient-to-r from-orange-500/15 to-amber-500/10 border border-orange-500/50 text-white space-y-4 shadow-lg shadow-orange-500/5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 rounded-xl bg-orange-500 text-white shadow-md shadow-orange-500/30 shrink-0">
                      <Download className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-mono uppercase tracking-wider text-orange-400 font-bold">
                        YENİ RELEASE BULUNDU
                      </div>
                      <div className="text-base sm:text-lg font-bold text-white font-mono">
                        Sürüm v{remoteVersion} Yayında!{' '}
                        <span className="text-xs text-gray-400 font-normal">(Mevcut: v{currentVersion})</span>
                      </div>
                      {releaseDate && (
                        <div className="text-[11px] text-gray-400 font-mono mt-0.5">
                          Yayınlanma Tarihi: {releaseDate}
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    id="btn-execute-update"
                    onClick={handleExecuteUpdate}
                    className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-mono font-bold text-xs rounded-xl shadow-lg shadow-orange-500/25 transition cursor-pointer flex items-center justify-center space-x-2 shrink-0 border border-orange-400"
                  >
                    <Download className="w-4 h-4" />
                    <span>Şimdi Güncelle ve İndir (v{remoteVersion})</span>
                  </button>
                </div>

                {releaseNotes && (
                  <div className="p-3 bg-[#0d1117] rounded-xl border border-[#30363d] space-y-1 text-xs font-mono">
                    <div className="font-bold text-orange-300">Sürüm Notları (Changelog):</div>
                    <p className="text-gray-300 whitespace-pre-line leading-relaxed text-[11px]">
                      {releaseNotes}
                    </p>
                  </div>
                )}

                <div className="p-3 bg-[#0d1117] rounded-xl border border-[#30363d] space-y-1.5 text-xs font-mono">
                  <div className="text-gray-300">
                    Hedef Depo: <code className="text-orange-400">{githubRepo}</code>
                    {releaseExeName && (
                      <span className="ml-2">
                        • Dosya: <code className="text-orange-400">{releaseExeName}</code>
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-emerald-400">
                    ✓ Kasa kayıtları, cariler, Z raporları ve veritabanı (%APPDATA%) bu güncellemeden asla etkilenmeyecektir.
                  </div>
                </div>
              </div>
            )}

            {/* İNDİRİLİYOR DURUMU */}
            {status === 'downloading' && (
              <div className="p-5 rounded-2xl bg-[#0d1117] border border-orange-500/50 space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-orange-400 font-bold flex items-center space-x-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>{isElectron ? 'electron-updater İndiriyor...' : 'Güncelleme Paketi İndiriliyor...'}</span>
                  </span>
                  <div className="flex items-center space-x-3">
                    {downloadSpeedText && <span className="text-gray-400">{downloadSpeedText}</span>}
                    <span className="font-bold text-white font-mono">%{downloadProgress}</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-[#161b22] h-2.5 rounded-full overflow-hidden border border-[#30363d]">
                  <div
                    className="bg-gradient-to-r from-orange-500 to-amber-400 h-full transition-all duration-300 ease-out"
                    style={{ width: `${downloadProgress}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] font-mono text-gray-300">
                  <span>{downloadStepText}</span>
                  {downloadSizeText && <span className="text-gray-400">{downloadSizeText}</span>}
                </div>
              </div>
            )}

            {/* İNDİRİLDİ / YENİDEN BAŞLATMAYA HAZIR DURUMU */}
            {status === 'downloaded' && (
              <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center space-x-2.5 font-bold text-base text-emerald-400 font-mono">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span>Güncelleme Başarıyla İndirildi!</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleQuitAndInstall}
                    className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-mono font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/25 transition cursor-pointer flex items-center space-x-2 self-start sm:self-auto border border-emerald-400"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>{isElectron ? 'Yeniden Başlat ve Güncelle' : 'Uygulamayı Yenile'}</span>
                  </button>
                </div>

                <p className="text-xs font-mono text-emerald-300/90">
                  v{remoteVersion || currentVersion} sürümü yüklendiğinde uygulama otomatik olarak yeniden başlatılacak.
                  Tüm kasa kayıtlarınız, carileriniz ve ayarlarınız eksiksiz olarak korunacaktır.
                </p>
              </div>
            )}

            {/* HATA DURUMU */}
            {status === 'error' && (
              <div className="p-5 rounded-2xl bg-red-500/10 border border-red-500/40 text-red-300 space-y-2">
                <div className="flex items-center space-x-2.5 font-bold text-sm text-red-400 font-mono">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                  <span>Güncelleme Kontrolü veya İndirme Başarısız Oldu</span>
                </div>
                <p className="text-xs font-mono text-red-200">
                  {errorDetails || statusMessage}
                </p>
                <div className="mt-3 p-3 bg-red-950/40 rounded-xl border border-red-500/30 text-[11px] font-mono text-gray-300">
                  <strong className="text-emerald-400">Veri Güvenliği Garantisi:</strong> Mevcut çalışan sürümünüz (v{currentVersion}) ve kasa kayıtlarınız hiçbir zarar görmeden çalışmaya devam etmektedir. İnternet bağlantınızı veya GitHub Releases durumunu kontrol edip tekrar deneyebilirsiniz.
                </div>
              </div>
            )}
          </div>

          {/* 3. Veri Güvenliği Garantisi Kutusu */}
          <div className="bg-[#161b22] border border-emerald-500/30 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
            <div className="flex items-start space-x-3.5">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0 mt-0.5">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="space-y-1 flex-1">
                <h4 className="font-bold text-xs uppercase tracking-wider text-emerald-400 font-mono">
                  Masaüstü Kullanıcı Verileri Koruma Garantisi (electron-updater + NSIS)
                </h4>
                <p className="text-xs text-gray-300 font-mono leading-relaxed">
                  Masaüstü uygulamasında kullanıcı verileri (kasa kayıtları, cariler, SQLite / IndexedDB veritabanı ve yedekler)
                  işletim sisteminizin güvenli <strong>AppData</strong> klasöründe saklanır:
                </p>
                {userDataPath && (
                  <div className="mt-2 p-2 bg-[#0d1117] rounded-lg border border-[#30363d] text-[11px] font-mono text-emerald-300 break-all flex items-center space-x-1.5">
                    <HardDrive className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span>Veri Konumu: {userDataPath}</span>
                  </div>
                )}
                <p className="text-[11px] text-gray-400 font-mono pt-1">
                  <code>electron-updater</code> yalnızca programın çalıştırılabilir kodlarını günceller. Veritabanı ve kasa kayıtları klasörüne <strong>ASLA dokunulmaz, üzerine yazılmaz veya silinmez</strong>.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. TAB: ELECTRON-UPDATER & MİMARİ */}
      {activeTab === 'architecture' && (
        <div className="space-y-6">
          <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 sm:p-6 space-y-5">
            <div>
              <h3 className="text-lg font-bold text-white font-mono flex items-center space-x-2">
                <Server className="w-5 h-5 text-orange-400" />
                <span>electron-updater Nasıl Çalışır? (Masaüstü Mimarisi)</span>
              </h3>
              <p className="text-xs text-gray-400 font-mono mt-1 leading-relaxed">
                Masaüstü Windows uygulamalarında dosya kilidi (file locking) ve izin problemleri yaşamamak için endüstri standardı olan <strong>electron-updater</strong> ve <strong>NSIS diferansiyel güncelleme motoru</strong> kullanılır.
              </p>
            </div>

            {/* Mimari Şeması */}
            <div className="bg-[#0d1117] border border-[#30363d] rounded-2xl p-4 sm:p-5 font-mono text-xs space-y-4">
              <div className="font-bold text-orange-400 uppercase tracking-wider text-[11px] pb-2 border-b border-[#30363d]">
                Windows Masaüstü Dosya Katmanları
              </div>

              <div className="space-y-3 font-mono">
                <div className="p-3 bg-[#161b22] rounded-xl border border-blue-500/30 flex items-start space-x-3">
                  <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 shrink-0">
                    <Terminal className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-blue-300 text-sm">1. Program Dosyaları (%LOCALAPPDATA%\Programs\baran-kasa-yonetimi)</div>
                    <p className="text-gray-400 text-[11px] mt-0.5">
                      Windows EXE çalıştırıcı, Electron çekirdeği ve derlenmiş React arayüz dosyaları burada bulunur. Güncelleme butonuna basıldığında sadece bu klasör yenilenir.
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-[#161b22] rounded-xl border border-emerald-500/30 flex items-start space-x-3">
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
                    <Database className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-emerald-300 text-sm">2. Kullanıcı Veri Klasörü (%APPDATA%\baran-kasa-yonetimi)</div>
                    <p className="text-gray-400 text-[11px] mt-0.5">
                      Tüm kasa icmalleri, cariler, POS tanımları, SQLite / IndexedDB kayıtları bu klasörde yaşar. <strong>electron-updater ve kurulum sihirbazı (NSIS) bu klasöre ASLA dokunmaz</strong>.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* electron-updater Çalışma Döngüsü */}
            <div className="space-y-3">
              <h4 className="font-bold text-sm text-white font-mono uppercase tracking-wider">
                electron-updater Çalışma Döngüsü:
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs font-mono">
                <div className="p-3.5 bg-[#0d1117] border border-[#30363d] rounded-xl space-y-1.5">
                  <span className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 font-bold flex items-center justify-center text-[10px]">1</span>
                  <div className="font-bold text-white">latest.yml Kontrolü</div>
                  <p className="text-[11px] text-gray-400">
                    Uygulama GitHub Releases altındaki `latest.yml` dosyasını çekerek yeni sürüm ve dosya hash'lerini doğrular.
                  </p>
                </div>

                <div className="p-3.5 bg-[#0d1117] border border-[#30363d] rounded-xl space-y-1.5">
                  <span className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 font-bold flex items-center justify-center text-[10px]">2</span>
                  <div className="font-bold text-white">Kullanıcı Onayı</div>
                  <p className="text-[11px] text-gray-400">
                    Arayüzde "Yeni Sürüm Bulundu" kartı belirir. Kullanıcı "Şimdi Güncelle ve İndir" butonuna basar.
                  </p>
                </div>

                <div className="p-3.5 bg-[#0d1117] border border-[#30363d] rounded-xl space-y-1.5">
                  <span className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 font-bold flex items-center justify-center text-[10px]">3</span>
                  <div className="font-bold text-white">Arka Plan İndirme</div>
                  <p className="text-[11px] text-gray-400">
                    İndirme arka planda çalışırken kullanıcı programı kesintisiz kullanmaya devam edebilir.
                  </p>
                </div>

                <div className="p-3.5 bg-[#0d1117] border border-[#30363d] rounded-xl space-y-1.5">
                  <span className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 font-bold flex items-center justify-center text-[10px]">4</span>
                  <div className="font-bold text-white">quitAndInstall()</div>
                  <p className="text-[11px] text-gray-400">
                    Uygulama kapanır, yeni sürüm 2 saniyede kurulur ve verileriniz korunarak program otomatik olarak açılır.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. TAB: GITHUB ACTIONS OTOMATİK RELEASE */}
      {activeTab === 'actions' && (
        <div className="space-y-6">
          <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 sm:p-6 space-y-5">
            <div>
              <h3 className="text-lg font-bold text-white font-mono flex items-center space-x-2">
                <FileCode className="w-5 h-5 text-orange-400" />
                <span>GitHub Actions ile Otomatik Windows EXE Release Oluşturma</span>
              </h3>
              <p className="text-xs text-gray-400 font-mono mt-1">
                Deponuzdaki <code>.github/workflows/release.yml</code> iş akışı sayesinde her yeni sürüm otomatik derlenir.
              </p>
            </div>

            {/* Adım Adım Rehber */}
            <div className="space-y-4 text-xs font-mono">
              <div className="p-4 bg-[#0d1117] border border-[#30363d] rounded-xl space-y-2">
                <div className="font-bold text-white flex items-center space-x-2">
                  <span className="w-5 h-5 rounded-full bg-orange-500 text-white font-bold flex items-center justify-center text-[11px]">1</span>
                  <span>version.txt Dosyasını Güncelleyin</span>
                </div>
                <p className="text-gray-400 pl-7 leading-relaxed">
                  Deponuzun ana dizinindeki <code>version.txt</code> dosyasına yeni sürüm numarasını yazın (Örn: <code>1.0.5</code>):
                </p>
                <div className="p-3 bg-[#161b22] rounded-lg border border-[#30363d] ml-7 font-mono text-emerald-400">
                  1.0.5
                </div>
              </div>

              <div className="p-4 bg-[#0d1117] border border-[#30363d] rounded-xl space-y-2">
                <div className="font-bold text-white flex items-center space-x-2">
                  <span className="w-5 h-5 rounded-full bg-orange-500 text-white font-bold flex items-center justify-center text-[11px]">2</span>
                  <span>GitHub'a Push Edin (Değişikliği Gönderin)</span>
                </div>
                <div className="p-3 bg-[#161b22] rounded-lg border border-[#30363d] ml-7 space-y-1 font-mono text-gray-200">
                  <div>git add version.txt</div>
                  <div>git commit -m "release: v1.0.5"</div>
                  <div className="text-orange-400">git push origin main</div>
                </div>
              </div>

              <div className="p-4 bg-[#0d1117] border border-[#30363d] rounded-xl space-y-2">
                <div className="font-bold text-white flex items-center space-x-2">
                  <span className="w-5 h-5 rounded-full bg-orange-500 text-white font-bold flex items-center justify-center text-[11px]">3</span>
                  <span>GitHub Actions Otomatik Olarak Ne Yapar?</span>
                </div>
                <ul className="text-gray-400 pl-7 space-y-1.5 list-disc list-inside">
                  <li>Windows sunucusunda depoyu klonlar ve Node.js ortamını kurar.</li>
                  <li><code>version.txt</code> sürümünü <code>package.json</code> ile senkronize eder.</li>
                  <li><code>npm run build</code> ile React kodlarını derler.</li>
                  <li><code>electron-builder --win --publish always</code> komutuyla Windows NSIS `.exe` kurulum dosyasını oluşturur.</li>
                  <li>GitHub Releases bölümünde otomatik olarak <code>v1.0.5</code> release'i açar ve `.exe` ile <code>latest.yml</code> dosyalarını oraya ekler.</li>
                </ul>
              </div>

              <div className="p-4 bg-[#0d1117] border border-[#30363d] rounded-xl space-y-2">
                <div className="font-bold text-white flex items-center space-x-2">
                  <span className="w-5 h-5 rounded-full bg-orange-500 text-white font-bold flex items-center justify-center text-[11px]">4</span>
                  <span>Masaüstü Kullanıcılarına Anında Bildirim</span>
                </div>
                <p className="text-gray-400 pl-7 leading-relaxed">
                  Release yayınlandığı anda, kurulu masaüstü uygulamasındaki <strong>"Güncellemeleri Kontrol Et"</strong> butonu veya arka plan kontrolü yeni sürümü anında görecek ve tek tıkla indirip uygulayacaktır.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
