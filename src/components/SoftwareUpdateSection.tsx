import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';

interface SoftwareUpdateSectionProps {
  onNotify?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const DEFAULT_REPO = 'msb9512-sudo/BARAN-MUHASEBE-KASA-';
const DEFAULT_BRANCH = 'main';

export const SoftwareUpdateSection: React.FC<SoftwareUpdateSectionProps> = ({ onNotify }) => {
  // Current local version
  const [currentVersion, setCurrentVersion] = useState<string>('1.0.0');
  const [isLoadingLocalVersion, setIsLoadingLocalVersion] = useState(true);

  // GitHub configuration (Correct default: msb9512-sudo/BARAN-MUHASEBE-KASA-)
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
    'idle' | 'checking' | 'up-to-date' | 'update-available' | 'downloading' | 'success' | 'error'
  >('idle');
  const [remoteVersion, setRemoteVersion] = useState<string | null>(null);
  const [lastCommitInfo, setLastCommitInfo] = useState<{
    sha: string | null;
    message: string | null;
    date: string | null;
  } | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [lastCheckTime, setLastCheckTime] = useState<string | null>(() => {
    return localStorage.getItem('app_last_update_check') || null;
  });

  // Download & Installation progress
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [downloadStepText, setDownloadStepText] = useState<string>('');
  const [countdown, setCountdown] = useState<number>(3);
  const [updatedFilesCount, setUpdatedFilesCount] = useState<number | null>(null);
  const [updatedFilesList, setUpdatedFilesList] = useState<string[]>([]);

  // Active guide tab
  const [activeTab, setActiveTab] = useState<'status' | 'architecture' | 'guide'>('status');

  // Load local version on mount
  useEffect(() => {
    let isMounted = true;
    async function loadVersion() {
      try {
        const res = await fetch(`/api/update/version?t=${Date.now()}`);
        if (res.ok) {
          const data = await res.json();
          if (data.version && isMounted) {
            setCurrentVersion(data.version);
            localStorage.setItem('app_installed_version', data.version);
            setIsLoadingLocalVersion(false);
            return;
          }
        }
      } catch {
        // Fallback to static version.txt
      }

      try {
        const res = await fetch(`/version.txt?t=${Date.now()}`);
        if (res.ok) {
          const txt = await res.text();
          const clean = txt.trim();
          if (clean && isMounted) {
            setCurrentVersion(clean);
            localStorage.setItem('app_installed_version', clean);
          }
        } else {
          const saved = localStorage.getItem('app_installed_version') || '1.0.0';
          if (isMounted) setCurrentVersion(saved);
        }
      } catch (err) {
        console.warn('version.txt okunurken hata oluştu:', err);
        const saved = localStorage.getItem('app_installed_version') || '1.0.0';
        if (isMounted) setCurrentVersion(saved);
      } finally {
        if (isMounted) setIsLoadingLocalVersion(false);
      }
    }
    loadVersion();
    return () => {
      isMounted = false;
    };
  }, []);

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

  // Check for updates via backend API and GitHub
  const handleCheckUpdates = async () => {
    setStatus('checking');
    setErrorDetails(null);
    setStatusMessage('GitHub üzerinden en son sürüm bilgileri sorgulanıyor...');

    const repoClean = (githubRepo.trim() || DEFAULT_REPO)
      .replace(/^https?:\/\/github\.com\//i, '')
      .replace(/\/$/, '');
    const branchClean = githubBranch.trim() || DEFAULT_BRANCH;

    if (!repoClean || !repoClean.includes('/')) {
      setStatus('error');
      setErrorDetails(`Geçerli bir GitHub depo adı belirtiniz (Örnek: ${DEFAULT_REPO}).`);
      setStatusMessage('Depo formatı geçersiz.');
      return;
    }

    try {
      // 1. Backend endpoint /api/update/check
      let apiSuccess = false;
      try {
        const apiRes = await fetch('/api/update/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ repo: repoClean, branch: branchClean }),
        });

        if (apiRes.ok) {
          const data = await apiRes.json();
          if (data.success) {
            apiSuccess = true;
            const nowTime = new Date().toLocaleTimeString('tr-TR', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            });
            setLastCheckTime(nowTime);
            localStorage.setItem('app_last_update_check', nowTime);

            setRemoteVersion(data.remoteVersion);
            if (data.lastCommit) {
              setLastCommitInfo(data.lastCommit);
            }

            if (data.updateAvailable) {
              setStatus('update-available');
              setStatusMessage(`Yeni sürüm mevcut: v${data.remoteVersion} (Mevcut: v${data.currentVersion})`);
            } else {
              setStatus('up-to-date');
              setStatusMessage(`Uygulamanız güncel! En son sürümü kullanıyorsunuz (v${data.currentVersion}).`);
            }
            return;
          }
        }
      } catch {
        // Fallback to direct GitHub fetch
      }

      if (!apiSuccess) {
        // 2. Direct GitHub fetch fallback
        const rawUrl = `https://raw.githubusercontent.com/${repoClean}/${branchClean}/version.txt?t=${Date.now()}`;
        const rawRes = await fetch(rawUrl, { cache: 'no-store' });

        if (!rawRes.ok) {
          throw new Error(
            `"${repoClean}" deposuna (${branchClean} dalı) erişilemedi veya version.txt bulunamadı (HTTP ${rawRes.status}).`
          );
        }

        const txt = await rawRes.text();
        const fetchedVersion = txt.trim();

        if (!fetchedVersion) {
          throw new Error('version.txt dosyası boş.');
        }

        const nowTime = new Date().toLocaleTimeString('tr-TR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
        setLastCheckTime(nowTime);
        localStorage.setItem('app_last_update_check', nowTime);

        setRemoteVersion(fetchedVersion);
        const comparison = compareSemVer(fetchedVersion, currentVersion);

        if (comparison > 0) {
          setStatus('update-available');
          setStatusMessage(`Yeni sürüm mevcut: v${fetchedVersion} (Mevcut: v${currentVersion})`);
        } else {
          setStatus('up-to-date');
          setStatusMessage(`Uygulamanız güncel! En son sürümü kullanıyorsunuz (v${currentVersion}).`);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Bilinmeyen bir ağ hatası oluştu';
      setStatus('error');
      setErrorDetails(
        `Güncelleme kontrolü başarısız: ${msg}. Eski çalışan sürümünüz (v${currentVersion}) bozulmadan korunmaktadır. Verileriniz güvendedir.`
      );
      setStatusMessage('Güncelleme sunucusuna erişilemedi.');
    }
  };

  // REAL download and file application
  const handleExecuteUpdate = async (targetVer?: string) => {
    const versionToInstall = targetVer || remoteVersion || currentVersion;

    setStatus('downloading');
    setDownloadProgress(10);
    setDownloadStepText('Kullanıcı verileri kilitleniyor ve güvenlik yedeği alınıyor...');

    // 1. Safety snapshot of all user records in localStorage before touching any code
    try {
      const snapshot: Record<string, string | null> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && !k.startsWith('app_update_') && !k.startsWith('emergency_')) {
          snapshot[k] = localStorage.getItem(k);
        }
      }
      localStorage.setItem(`emergency_user_data_backup_${Date.now()}`, JSON.stringify(snapshot));
    } catch {
      // Continue safely
    }

    setDownloadProgress(25);
    setDownloadStepText('Kasa kayıtları, cariler ve veritabanı koruma altına alındı (Dokunulmayacak).');

    const repoClean = (githubRepo.trim() || DEFAULT_REPO)
      .replace(/^https?:\/\/github\.com\//i, '')
      .replace(/\/$/, '');
    const branchClean = githubBranch.trim() || DEFAULT_BRANCH;

    try {
      setDownloadProgress(45);
      setDownloadStepText(`GitHub'dan (${repoClean}/${branchClean}) en güncel dosyalar indiriliyor...`);

      const res = await fetch('/api/update/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo: repoClean,
          branch: branchClean,
          targetVersion: versionToInstall,
        }),
      });

      setDownloadProgress(80);
      setDownloadStepText('Eski dosyaların üzerine yazılıyor, veritabanı ve kullanıcı kayıtları korunuyor...');

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Sunucu dosyaları üzerine yazarken bir hata ile karşılaştı.');
      }

      setDownloadProgress(100);
      setUpdatedFilesCount(data.updatedCount || null);
      if (data.updatedItems && Array.isArray(data.updatedItems)) {
        setUpdatedFilesList(data.updatedItems);
      }
      setCurrentVersion(data.newVersion || versionToInstall);
      localStorage.setItem('app_installed_version', data.newVersion || versionToInstall);
      setStatus('success');
      setStatusMessage(
        `v${data.newVersion || versionToInstall} başarıyla yüklendi! (${data.updatedCount || 'Tüm'} dosya güncellendi)`
      );
      setDownloadStepText('Güncelleme tamamlandı. Uygulama kendini yeniden başlatıyor...');

      if (onNotify) {
        onNotify(`v${data.newVersion || versionToInstall} güncellemesi başarıyla yüklendi!`, 'success');
      }

      // 3-second countdown to reload
      let secondsLeft = 3;
      setCountdown(secondsLeft);
      const interval = setInterval(() => {
        secondsLeft -= 1;
        setCountdown(secondsLeft);
        if (secondsLeft <= 0) {
          clearInterval(interval);
          window.location.reload();
        }
      }, 1000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'İndirme sırasında beklenmeyen bir hata oluştu.';
      setStatus('error');
      setErrorDetails(
        `Güncelleme indirilemedi: ${msg}. Eski çalışan sürümünüz (v${currentVersion}) bozulmadan korunmuştur. Kasa verileriniz ve ayarlarınız güvendedir.`
      );
      setStatusMessage('Güncelleme işlemi başarısız oldu.');
      if (onNotify) {
        onNotify('Güncelleme başarısız: ' + msg, 'error');
      }
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
                <span className="text-gray-400 lowercase font-normal">GitHub Canlı Güncelleme</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Otomatik Güncelleme & Sürüm Yönetimi
              </h2>
              <p className="text-xs text-gray-400 font-mono mt-0.5">
                GitHub deponuz üzerinden en güncel dosyaları indirin ve uygulayın. Kasa verileriniz ve ayarlarınız asla silinmez.
              </p>
            </div>
          </div>

          {/* Sürüm Rozeti */}
          <div className="flex items-center space-x-2 bg-[#0d1117] border border-[#30363d] px-3.5 py-2 rounded-xl shrink-0 self-start md:self-auto">
            <span className="text-xs font-mono text-gray-400">Mevcut Sürüm:</span>
            <span className="text-sm font-bold font-mono text-orange-400 bg-orange-500/10 px-2.5 py-0.5 rounded border border-orange-500/30">
              {isLoadingLocalVersion ? 'Okunuyor...' : `v${currentVersion}`}
            </span>
          </div>
        </div>

        {/* Tab Switcher: Kontrol Paneli / Mimari / Kılavuz */}
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
            <span>EXE & Güncelleyici Mimarisi</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('guide')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-mono transition flex items-center space-x-2 cursor-pointer border ${
              activeTab === 'guide'
                ? 'bg-orange-500/20 text-orange-300 font-bold border-orange-500/50 shadow-xs'
                : 'bg-[#0d1117] hover:bg-[#21262d] text-gray-400 hover:text-white border-[#30363d]'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>version.txt Nasıl Artırılır?</span>
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
                  GitHub Güncelleme Kaynağı (Depo & Dal)
                </h3>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-mono text-gray-400">
                  Hedef: <strong className="text-orange-300">{githubRepo}</strong> ({githubBranch})
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
                  Branch (Dal):
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
                GitHub deposundaki en güncel dosyalar bu adresten indirilip uygulamanın çalıştığı dizine yazılır.
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

            {/* Durum Mesajı Alanı (Güncel / Yeni Sürüm Var / Hata / İndiriliyor) */}
            {status === 'idle' && (
              <div className="p-4 rounded-xl bg-[#0d1117] border border-[#30363d] flex items-center space-x-3 text-xs font-mono text-gray-400">
                <Info className="w-4 h-4 text-gray-400 shrink-0" />
                <span>
                  GitHub'daki en son sürümü ve güncellemeleri denetlemek için yukarıdaki <strong>"Güncellemeleri Kontrol Et"</strong> butonuna basınız.
                </span>
              </div>
            )}

            {status === 'checking' && (
              <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center space-x-3 text-xs font-mono text-orange-300 animate-pulse">
                <RefreshCw className="w-4 h-4 animate-spin text-orange-400 shrink-0" />
                <span>GitHub deposu ({githubRepo}) taranıyor ve son yayınlanan `version.txt` kontrol ediliyor...</span>
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
                      En son sürüm olan <strong>v{currentVersion}</strong> kullanılıyor. GitHub deposunda daha yeni bir sürüm numarası bulunmamaktadır.
                    </p>
                    {lastCommitInfo && lastCommitInfo.message && (
                      <div className="mt-2 text-[11px] text-gray-400 flex items-center space-x-2">
                        <GitCommit className="w-3.5 h-3.5 text-gray-500" />
                        <span>Son Değişiklik ({lastCommitInfo.sha}): {lastCommitInfo.message}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* İsteğe Bağlı: GitHub'dan en güncel kodları zorla yeniden çekme butonu */}
                <div className="pt-2 border-t border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-[11px] text-gray-400">
                    GitHub main dalındaki en güncel dosyaları doğrudan indirip üzerine yazmak isterseniz:
                  </span>
                  <button
                    type="button"
                    onClick={() => handleExecuteUpdate(currentVersion)}
                    className="px-3.5 py-1.5 bg-[#0d1117] hover:bg-[#21262d] border border-emerald-500/40 text-emerald-300 rounded-lg text-xs font-mono font-bold transition flex items-center space-x-1.5 shrink-0 cursor-pointer self-start sm:self-auto"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>En Güncel Dosyaları İndir ve Yenile</span>
                  </button>
                </div>
              </div>
            )}

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
                        YENİ SÜRÜM BULUNDU
                      </div>
                      <div className="text-base sm:text-lg font-bold text-white font-mono">
                        Sürüm v{remoteVersion} Yayında! <span className="text-xs text-gray-400 font-normal">(Mevcut: v{currentVersion})</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    id="btn-execute-update"
                    onClick={() => handleExecuteUpdate()}
                    className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-mono font-bold text-xs rounded-xl shadow-lg shadow-orange-500/25 transition cursor-pointer flex items-center justify-center space-x-2 shrink-0 border border-orange-400"
                  >
                    <Download className="w-4 h-4" />
                    <span>Şimdi Güncelle ve İndir (v{remoteVersion})</span>
                  </button>
                </div>

                <div className="p-3 bg-[#0d1117] rounded-xl border border-[#30363d] space-y-2 text-xs font-mono">
                  <div className="font-bold text-orange-300">İndirilecek Kaynak:</div>
                  <div className="text-gray-300">
                    Depo: <code className="text-orange-400">{githubRepo}</code> • Dal: <code className="text-orange-400">{githubBranch}</code>
                  </div>
                  {lastCommitInfo && lastCommitInfo.message && (
                    <div className="text-gray-400 text-[11px] pt-1 border-t border-[#30363d]">
                      Son Değişiklik ({lastCommitInfo.sha}): {lastCommitInfo.message}
                    </div>
                  )}
                  <div className="text-[11px] text-emerald-400 pt-1">
                    ✓ Kasa kayıtları, cariler, Z raporları ve veritabanı dosyaları bu işlemden asla etkilenmeyecektir.
                  </div>
                </div>
              </div>
            )}

            {/* İNDİRİLİYOR & YÜKLENİYOR DURUMU */}
            {status === 'downloading' && (
              <div className="p-5 rounded-2xl bg-[#0d1117] border border-orange-500/50 space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-orange-400 font-bold flex items-center space-x-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>GitHub'dan Gerçek Dosyalar İndiriliyor & Yazılıyor...</span>
                  </span>
                  <span className="font-bold text-white font-mono">%{downloadProgress}</span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-[#161b22] h-2.5 rounded-full overflow-hidden border border-[#30363d]">
                  <div
                    className="bg-gradient-to-r from-orange-500 to-amber-400 h-full transition-all duration-300 ease-out"
                    style={{ width: `${downloadProgress}%` }}
                  />
                </div>

                <p className="text-[11px] font-mono text-gray-300">{downloadStepText}</p>
              </div>
            )}

            {/* BAŞARILI DURUM */}
            {status === 'success' && (
              <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 space-y-2">
                <div className="flex items-center space-x-2.5 font-bold text-base text-emerald-400 font-mono">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span>Güncelleme Başarıyla Tamamlandı!</span>
                </div>
                <p className="text-xs font-mono text-emerald-300/90">
                  Uygulama başarıyla <strong>v{remoteVersion || currentVersion}</strong> sürümüne yükseltildi.
                  {updatedFilesCount !== null && ` (${updatedFilesCount} dosya güncellendi). `}
                  Tüm kasa kayıtlarınız, carileriniz ve kullanıcı verileriniz eksiksiz olarak korundu.
                </p>
                {updatedFilesList.length > 0 && (
                  <div className="text-[11px] font-mono text-gray-400 pt-1">
                    Güncellenen modüller: {updatedFilesList.join(', ')}
                  </div>
                )}
                <div className="pt-2 text-xs font-mono text-white flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-ping"></span>
                  <span>Uygulama {countdown} saniye içinde kendini yeniden başlatıyor...</span>
                </div>
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
                  <strong className="text-emerald-400">Veri Güvenliği Garantisi:</strong> Mevcut çalışan sürümünüz (v{currentVersion}) ve kasa kayıtlarınız hiçbir zarar görmeden çalışmaya devam etmektedir. İnternet bağlantınızı veya GitHub depo ayarlarını kontrol edip tekrar deneyebilirsiniz.
                </div>
              </div>
            )}
          </div>

          {/* 3. Veri Güvenliği Garantisi Kutusu (Kullanıcı Verileri ASLA Silinmez) */}
          <div className="bg-[#161b22] border border-emerald-500/30 rounded-2xl p-4 sm:p-5 shadow-sm">
            <div className="flex items-start space-x-3.5">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0 mt-0.5">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-xs uppercase tracking-wider text-emerald-400 font-mono">
                  Kullanıcı Verileri Koruma Garantisi
                </h4>
                <p className="text-xs text-gray-300 font-mono leading-relaxed">
                  Güncelleme mekanizması yalnızca derlenmiş uygulama kodlarını (HTML/JS/CSS veya bundle paketini) yeniler.
                  Kasa kayıtları, Z raporları, günlük giderler, cari hesaplar, SQLite veritabanı ve ayar dosyalarınız
                  güncelleme işleminden <strong>ASLA etkilenmez, silinmez ve üzerine yazılmaz</strong>.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. TAB: EXE & GÜNCELLEYİCİ MİMARİSİ */}
      {activeTab === 'architecture' && (
        <div className="space-y-6">
          <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 sm:p-6 space-y-5">
            <div>
              <h3 className="text-lg font-bold text-white font-mono flex items-center space-x-2">
                <Server className="w-5 h-5 text-orange-400" />
                <span>EXE ve Güncellenecek Dosyaların Ayrılması (Mimari Öneri)</span>
              </h3>
              <p className="text-xs text-gray-400 font-mono mt-1 leading-relaxed">
                Windows işletim sisteminde çalışan bir <code className="text-orange-300">.exe</code> dosyası bellekte çalışırken kendi kendisinin üzerine yazılamaz (Windows Dosya Kilidi - File Locking). Bu nedenle profesyonel masaüstü uygulamalarında aşağıdaki <strong>Launcher + App + Data</strong> 3 katmanlı mimarisi kullanılır.
              </p>
            </div>

            {/* Mimari Şeması */}
            <div className="bg-[#0d1117] border border-[#30363d] rounded-2xl p-4 sm:p-5 font-mono text-xs space-y-4">
              <div className="font-bold text-orange-400 uppercase tracking-wider text-[11px] pb-2 border-b border-[#30363d]">
                Önerilen Klasör Mimarisi
              </div>

              <div className="space-y-3 font-mono">
                <div className="p-3 bg-[#161b22] rounded-xl border border-blue-500/30 flex items-start space-x-3">
                  <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 shrink-0">
                    <Terminal className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-blue-300 text-sm">1. KasaYonetimi.exe (Ana Başlatıcı / Launcher)</div>
                    <p className="text-gray-400 text-[11px] mt-0.5">
                      Çok küçük (1-2 MB) bir başlatıcıdır. Asla güncellenmesine gerek kalmaz. Görevi: <code className="text-gray-200">app/</code> klasöründeki kodları çalıştırmak ve güncelleme emri geldiğinde geçici klasördeki dosyaları <code className="text-gray-200">app/</code> içine kopyalayıp uygulamayı yeniden başlatmaktır.
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-[#161b22] rounded-xl border border-orange-500/30 flex items-start space-x-3">
                  <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-400 shrink-0">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-orange-300 text-sm">2. app/ Klasörü (Güncellenen Kod Dosyaları)</div>
                    <p className="text-gray-400 text-[11px] mt-0.5">
                      HTML, JavaScript, CSS ve ikon varlıklarının bulunduğu klasördür. GitHub'dan yeni bir sürüm çıktığında sadece bu klasörün içeriği indirilir ve üzerine yazılır. EXE kapalıyken değiştirildiği için dosya kilidi hatası oluşmaz.
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-[#161b22] rounded-xl border border-emerald-500/30 flex items-start space-x-3">
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
                    <Database className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-emerald-300 text-sm">3. data/ Klasörü (Kullanıcı Veritabanı & Ayarlar)</div>
                    <p className="text-gray-400 text-[11px] mt-0.5">
                      Kasa kayıtları, SQLite veritabanı, yedekler ve yerel ayar dosyaları burada tutulur. <strong>Bu klasör güncelleyicinin erişim alanı dışındadır</strong> ve güncellemeler sırasında hiçbir dosya silinmez veya üzerine yazılmaz.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Adım Adım Güncelleme Çalışma Akışı */}
            <div className="space-y-3">
              <h4 className="font-bold text-sm text-white font-mono uppercase tracking-wider">
                Masaüstü Güncelleyici (Updater) Çalışma Mantığı:
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs font-mono">
                <div className="p-3.5 bg-[#0d1117] border border-[#30363d] rounded-xl space-y-1.5">
                  <span className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 font-bold flex items-center justify-center text-[10px]">1</span>
                  <div className="font-bold text-white">Sürüm Kontrolü</div>
                  <p className="text-[11px] text-gray-400">
                    Uygulama arka planda veya kullanıcı butona basınca GitHub'daki `version.txt`'yi çeker.
                  </p>
                </div>

                <div className="p-3.5 bg-[#0d1117] border border-[#30363d] rounded-xl space-y-1.5">
                  <span className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 font-bold flex items-center justify-center text-[10px]">2</span>
                  <div className="font-bold text-white">Geçici İndirme</div>
                  <p className="text-[11px] text-gray-400">
                    Yeni dosyalar önce <code className="text-orange-300">.update_temp/</code> klasörüne indirilir. İndirme kesilirse eski sürüm zarar görmez.
                  </p>
                </div>

                <div className="p-3.5 bg-[#0d1117] border border-[#30363d] rounded-xl space-y-1.5">
                  <span className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 font-bold flex items-center justify-center text-[10px]">3</span>
                  <div className="font-bold text-white">Yedek & Üzerine Yazma</div>
                  <p className="text-[11px] text-gray-400">
                    İndirme tamamlanınca sadece kod dosyalarının üzerine yazılır. <code className="text-emerald-300">data/</code> klasörüne dokunulmaz.
                  </p>
                </div>

                <div className="p-3.5 bg-[#0d1117] border border-[#30363d] rounded-xl space-y-1.5">
                  <span className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 font-bold flex items-center justify-center text-[10px]">4</span>
                  <div className="font-bold text-white">Yeniden Başlatma</div>
                  <p className="text-[11px] text-gray-400">
                    Uygulama kendini yeniden başlatır. Kullanıcı hiçbir veri kaybetmeden yeni sürümle devam eder.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. TAB: VERSION.TXT NASIL ARTIRILIR? */}
      {activeTab === 'guide' && (
        <div className="space-y-6">
          <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 sm:p-6 space-y-5">
            <div>
              <h3 className="text-lg font-bold text-white font-mono flex items-center space-x-2">
                <FileCode className="w-5 h-5 text-orange-400" />
                <span>Her Sürümde `version.txt` Nasıl Artırılır? (Rehber)</span>
              </h3>
              <p className="text-xs text-gray-400 font-mono mt-1">
                Uygulamanızın yeni güncellemeleri algılayabilmesi için GitHub reponuzdaki sürüm numarasını yönetme kılavuzu.
              </p>
            </div>

            {/* Adım Adım Rehber */}
            <div className="space-y-4 text-xs font-mono">
              <div className="p-4 bg-[#0d1117] border border-[#30363d] rounded-xl space-y-2">
                <div className="font-bold text-white flex items-center space-x-2">
                  <span className="w-5 h-5 rounded-full bg-orange-500 text-white font-bold flex items-center justify-center text-[11px]">1</span>
                  <span>Semantik Sürümleme (SemVer: MAJOR.MINOR.PATCH)</span>
                </div>
                <p className="text-gray-400 pl-7 leading-relaxed">
                  Sürüm numaralarınızı 3 haneli standart formatta artırınız:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pl-7 pt-1">
                  <div className="p-2.5 bg-[#161b22] rounded-lg border border-[#30363d]">
                    <div className="font-bold text-emerald-400">PATCH (1.0.0 → 1.0.1)</div>
                    <div className="text-[11px] text-gray-400">Küçük hata düzeltmeleri ve iyileştirmeler için.</div>
                  </div>
                  <div className="p-2.5 bg-[#161b22] rounded-lg border border-[#30363d]">
                    <div className="font-bold text-amber-400">MINOR (1.0.1 → 1.1.0)</div>
                    <div className="text-[11px] text-gray-400">Yeni bir özellik eklendiğinde (örn: Yeni rapor ekranı).</div>
                  </div>
                  <div className="p-2.5 bg-[#161b22] rounded-lg border border-[#30363d]">
                    <div className="font-bold text-rose-400">MAJOR (1.1.0 → 2.0.0)</div>
                    <div className="text-[11px] text-gray-400">Tamamen yeni bir arayüz veya köklü mimari değişiminde.</div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-[#0d1117] border border-[#30363d] rounded-xl space-y-2">
                <div className="font-bold text-white flex items-center space-x-2">
                  <span className="w-5 h-5 rounded-full bg-orange-500 text-white font-bold flex items-center justify-center text-[11px]">2</span>
                  <span>version.txt Dosyasını Düzenleme</span>
                </div>
                <p className="text-gray-400 pl-7 leading-relaxed">
                  Projenizin ana dizinindeki veya <code className="text-orange-400">public/version.txt</code> dosyasını açın ve sadece yeni sürüm numarasını yazıp kaydedin:
                </p>
                <div className="p-3 bg-[#161b22] rounded-lg border border-[#30363d] ml-7 font-mono text-emerald-400">
                  1.0.1
                </div>
              </div>

              <div className="p-4 bg-[#0d1117] border border-[#30363d] rounded-xl space-y-2">
                <div className="font-bold text-white flex items-center space-x-2">
                  <span className="w-5 h-5 rounded-full bg-orange-500 text-white font-bold flex items-center justify-center text-[11px]">3</span>
                  <span>GitHub'a Gönderme (Commit & Push)</span>
                </div>
                <p className="text-gray-400 pl-7 leading-relaxed">
                  Terminalinizde aşağıdaki 3 komutu çalıştırarak değişikliği GitHub reponuza gönderin:
                </p>
                <div className="p-3 bg-[#161b22] rounded-lg border border-[#30363d] ml-7 space-y-1 font-mono text-gray-200">
                  <div className="text-gray-500"># Değişiklikleri ekleyin</div>
                  <div>git add version.txt public/version.txt</div>
                  <div className="text-gray-500 mt-1"># Commit mesajı yazın</div>
                  <div>git commit -m "chore: release v1.0.1"</div>
                  <div className="text-gray-500 mt-1"># GitHub main dalına gönderin</div>
                  <div className="text-orange-400">git push origin main</div>
                </div>
              </div>

              <div className="p-4 bg-[#0d1117] border border-[#30363d] rounded-xl space-y-2">
                <div className="font-bold text-white flex items-center space-x-2">
                  <span className="w-5 h-5 rounded-full bg-orange-500 text-white font-bold flex items-center justify-center text-[11px]">4</span>
                  <span>Sonuç</span>
                </div>
                <p className="text-gray-400 pl-7 leading-relaxed">
                  Push işlemi bittiği anda uygulamadaki <strong>"Güncellemeleri Kontrol Et"</strong> butonu yeni sürümü anında görecek ve kullanıcıya tek tıkla <strong>"Şimdi Güncelle ve İndir"</strong> seçeneği sunacaktır.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
