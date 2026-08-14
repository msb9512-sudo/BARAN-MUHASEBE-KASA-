import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  HardDrive,
  Cloud,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Plus,
  Trash2,
  Download,
  Upload,
  FileText,
  Database,
  ArrowRight,
  ShieldCheck,
  LogOut,
  FolderOpen,
  Calendar,
} from 'lucide-react';
import { User } from 'firebase/auth';
import {
  initAuth,
  googleSignIn,
  logoutGoogle,
  getAccessToken,
} from '../services/googleAuth';
import {
  listDriveFiles,
  getOrCreateDriveFolder,
  uploadFileToDrive,
  downloadDriveFileText,
  downloadDriveFile,
  deleteDriveFile,
  DriveFileItem,
} from '../services/googleDriveService';
import {
  createRestaurantSpreadsheet,
  syncDailyEntryToSheets,
  syncAllDataToSheets,
  SpreadsheetInfo,
} from '../services/googleSheetsService';
import { DailyEntry, CashExpense, Invoice } from '../types';
import { AppState, RestaurantProfile, exportFullBackupJSON } from '../utils/storage';
import { formatDateTR } from '../utils/formatters';

interface GoogleWorkspaceViewProps {
  currentEntry: DailyEntry;
  appState: AppState;
  onRestoreState?: (state: AppState) => void;
  onOpenVegaImport?: () => void;
}

export const GoogleWorkspaceView: React.FC<GoogleWorkspaceViewProps> = ({
  currentEntry,
  appState,
  onRestoreState,
  onOpenVegaImport,
}) => {
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Sheets state
  const [spreadsheetId, setSpreadsheetId] = useState<string>(() => {
    return localStorage.getItem('google_restaurant_spreadsheet_id') || '';
  });
  const [spreadsheetUrl, setSpreadsheetUrl] = useState<string>(() => {
    return localStorage.getItem('google_restaurant_spreadsheet_url') || '';
  });
  const [isCreatingSheet, setIsCreatingSheet] = useState(false);
  const [isSyncingDay, setIsSyncingDay] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [sheetsSuccessMsg, setSheetsSuccessMsg] = useState<string | null>(null);

  // Drive state
  const [driveFiles, setDriveFiles] = useState<DriveFileItem[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [driveSuccessMsg, setDriveSuccessMsg] = useState<string | null>(null);

  // Destructive Confirmation Modal
  const [confirmAction, setConfirmAction] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    actionType: 'delete_file' | 'create_sheet' | 'restore_backup';
    targetId?: string;
    targetName?: string;
  }>({
    isOpen: false,
    title: '',
    description: '',
    actionType: 'delete_file',
  });

  useEffect(() => {
    // Listen for auth state change
    const unsubscribe = initAuth(
      (currentUser, accessToken) => {
        setUser(currentUser);
        setToken(accessToken);
        setAuthError(null);
      },
      () => {
        setUser(null);
        setToken(null);
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (token) {
      loadDriveFiles();
    }
  }, [token]);

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setAuthError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
        await loadDriveFiles();
      }
    } catch (err: any) {
      console.error(err);
      setAuthError(err.message || 'Google girişi sırasında bir hata oluştu.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logoutGoogle();
    setUser(null);
    setToken(null);
    setDriveFiles([]);
  };

  const loadDriveFiles = async () => {
    if (!token) return;
    setIsLoadingFiles(true);
    try {
      const files = await listDriveFiles("trashed = false", 25);
      setDriveFiles(files);
    } catch (err: any) {
      console.error('Drive dosyaları alınamadı:', err);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  // Create Spreadsheet
  const handleCreateNewSheet = async () => {
    if (!token) return;
    setIsCreatingSheet(true);
    setSheetsSuccessMsg(null);
    try {
      const info = await createRestaurantSpreadsheet(
        `${appState.profile?.companyTitle || 'Restoran'} - Kasa & Vega Takip Tablosu (${new Date().getFullYear()})`
      );
      setSpreadsheetId(info.spreadsheetId);
      setSpreadsheetUrl(info.spreadsheetUrl);
      localStorage.setItem('google_restaurant_spreadsheet_id', info.spreadsheetId);
      localStorage.setItem('google_restaurant_spreadsheet_url', info.spreadsheetUrl);

      // Also populate current data
      await syncAllDataToSheets(
        info.spreadsheetId,
        appState.entries,
        appState.expenses,
        appState.invoices
      );

      setSheetsSuccessMsg('Google E-Tablo başarıyla oluşturuldu ve verileriniz aktarıldı!');
      loadDriveFiles();
    } catch (err: any) {
      setAuthError(err.message || 'Google E-Tablo oluşturulurken hata oluştu.');
    } finally {
      setIsCreatingSheet(false);
      setConfirmAction((prev) => ({ ...prev, isOpen: false }));
    }
  };

  // Sync Daily Entry
  const handleSyncDaily = async () => {
    if (!token || !spreadsheetId) return;
    setIsSyncingDay(true);
    setSheetsSuccessMsg(null);
    try {
      await syncDailyEntryToSheets(
        spreadsheetId,
        currentEntry,
        appState.expenses,
        appState.invoices
      );
      setSheetsSuccessMsg(`${formatDateTR(currentEntry.date)} tarihli kasa icmali Google E-Tablo'ya eklendi.`);
    } catch (err: any) {
      setAuthError(err.message || 'E-Tabloya günlük veri eklenirken hata oluştu.');
    } finally {
      setIsSyncingDay(false);
    }
  };

  // Sync All Data
  const handleSyncAll = async () => {
    if (!token || !spreadsheetId) return;
    setIsSyncingAll(true);
    setSheetsSuccessMsg(null);
    try {
      await syncAllDataToSheets(
        spreadsheetId,
        appState.entries,
        appState.expenses,
        appState.invoices
      );
      setSheetsSuccessMsg('Tüm kasa kayıtları, Vega satışları ve faturalar Google E-Tablo ile senkronize edildi!');
    } catch (err: any) {
      setAuthError(err.message || 'Tüm veriler aktarılırken hata oluştu.');
    } finally {
      setIsSyncingAll(false);
    }
  };

  // Backup App State to Google Drive
  const handleBackupToDrive = async () => {
    if (!token) return;
    setIsBackingUp(true);
    setDriveSuccessMsg(null);
    try {
      const folderId = await getOrCreateDriveFolder('Kasa & Vega Raporları');
      const backupJson = exportFullBackupJSON();
      const today = new Date().toISOString().split('T')[0];
      const fileName = `Kasa_Vega_Sistem_Yedegi_${today}_${Date.now().toString().slice(-4)}.json`;

      const uploaded = await uploadFileToDrive(fileName, backupJson, 'application/json', folderId);
      setDriveSuccessMsg(`Yedek Google Drive'a ("Kasa & Vega Raporları" klasörüne) kaydedildi: ${uploaded.name}`);
      loadDriveFiles();
    } catch (err: any) {
      setAuthError(err.message || 'Google Drive yedeği oluşturulurken hata oluştu.');
    } finally {
      setIsBackingUp(false);
    }
  };

  // Delete Drive File
  const handleDeleteFile = async (fileId: string) => {
    if (!token) return;
    try {
      await deleteDriveFile(fileId);
      setDriveFiles((prev) => prev.filter((f) => f.id !== fileId));
      setDriveSuccessMsg('Dosya Google Drive üzerinden başarıyla silindi.');
    } catch (err: any) {
      setAuthError(err.message || 'Dosya silinirken hata oluştu.');
    } finally {
      setConfirmAction((prev) => ({ ...prev, isOpen: false }));
    }
  };

  // Download / Restore Backup
  const handleRestoreFromDrive = async (fileId: string) => {
    if (!token) return;
    try {
      const text = await downloadDriveFileText(fileId);
      const parsed = JSON.parse(text);
      if (parsed && parsed.entries && onRestoreState) {
        onRestoreState(parsed);
        setDriveSuccessMsg('Yedek başarıyla indirildi ve sistem verileri güncellendi!');
      } else {
        throw new Error('Geçersiz yedek dosyası formatı.');
      }
    } catch (err: any) {
      setAuthError('Yedek geri yüklenirken hata: ' + (err.message || 'Dosya okunamadı.'));
    } finally {
      setConfirmAction((prev) => ({ ...prev, isOpen: false }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600/20 to-emerald-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Cloud className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Google Drive & Google Sheets Entegrasyonu
                </h2>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30">
                  Google Workspace
                </span>
              </div>
              <p className="text-sm text-gray-400 mt-0.5">
                Kasa icmalleri, Vega satış raporları, masraflar ve faturaları Google E-Tablolar'a otomatik aktarın, Drive'da güvenli yedekleyin.
              </p>
            </div>
          </div>

          {/* User Sign In / Profile Box */}
          <div className="flex items-center space-x-3">
            {user ? (
              <div className="flex items-center space-x-3 bg-[#0d1117] border border-[#30363d] p-2 pr-3 rounded-lg">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Google User'}
                    className="w-8 h-8 rounded-full border border-emerald-500/40"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold text-xs">
                    {(user.displayName || user.email || 'G')[0].toUpperCase()}
                  </div>
                )}
                <div className="text-left">
                  <div className="text-xs font-bold text-white leading-none">
                    {user.displayName || 'Google Kullanıcısı'}
                  </div>
                  <div className="text-[11px] text-gray-400 font-mono mt-0.5 max-w-[150px] sm:max-w-[200px] truncate">
                    {user.email}
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-1.5 hover:bg-[#21262d] text-gray-400 hover:text-rose-400 rounded transition cursor-pointer"
                  title="Google Hesabından Çıkış Yap"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleGoogleLogin}
                disabled={isLoggingIn}
                className="flex items-center space-x-2 bg-white hover:bg-gray-100 text-gray-900 px-4 py-2 rounded-lg font-semibold text-xs transition shadow-md cursor-pointer disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                </svg>
                <span>{isLoggingIn ? 'Bağlanıyor...' : 'Google ile Bağlan'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Status / Alert feedback */}
        {authError && (
          <div className="mt-4 p-3 bg-rose-950/30 border border-rose-500/40 rounded-lg flex items-center space-x-2 text-rose-300 text-xs font-mono">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
            <span>{authError}</span>
          </div>
        )}

        {sheetsSuccessMsg && (
          <div className="mt-4 p-3 bg-emerald-950/30 border border-emerald-500/40 rounded-lg flex items-center space-x-2 text-emerald-300 text-xs font-mono">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
            <span>{sheetsSuccessMsg}</span>
          </div>
        )}

        {driveSuccessMsg && (
          <div className="mt-4 p-3 bg-sky-950/30 border border-sky-500/40 rounded-lg flex items-center space-x-2 text-sky-300 text-xs font-mono">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-sky-400" />
            <span>{driveSuccessMsg}</span>
          </div>
        )}
      </div>

      {/* Main Grid: Google Sheets & Google Drive */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 1: Google Sheets Synchronization */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-[#30363d]">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Google E-Tablolar (Sheets)</h3>
                  <p className="text-xs text-gray-400">Restoran Kasa & Vega Satış Tablosu</p>
                </div>
              </div>

              {spreadsheetUrl && (
                <a
                  href={spreadsheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-1 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                >
                  <span>Tabloyu Aç</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>

            {/* Content & Action Buttons */}
            <div className="mt-5 space-y-4">
              <div className="bg-[#0d1117] p-4 rounded-lg border border-[#30363d] space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400 font-medium">Bağlı E-Tablo:</span>
                  <span className="text-white font-mono font-bold">
                    {spreadsheetId ? 'Aktif Bağlantı' : 'Henüz Oluşturulmadı'}
                  </span>
                </div>

                {spreadsheetId ? (
                  <div className="text-[11px] text-gray-400 font-mono break-all bg-[#161b22] p-2 rounded border border-[#30363d]/60">
                    ID: {spreadsheetId}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Google Sheets üzerinde otomatik formüllü, renkli ve 5 ana çalışma sayfalı (Günlük Kasa, Vega Grupları, Masraflar, Faturalar, POS Dağılımı) bir takip tablosu oluşturabilirsiniz.
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {!spreadsheetId ? (
                  <button
                    onClick={() => {
                      if (!token) {
                        handleGoogleLogin();
                        return;
                      }
                      setConfirmAction({
                        isOpen: true,
                        title: 'Google E-Tablo Oluşturulsun mu?',
                        description:
                          'Google Drive hesabınızda yeni bir "Restoran Kasa & Vega Takip Tablosu" oluşturulacak ve mevcut tüm verileriniz aktarılacaktır.',
                        actionType: 'create_sheet',
                      });
                    }}
                    disabled={isCreatingSheet}
                    className="col-span-full flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white p-3 rounded-lg text-xs font-bold transition shadow-md cursor-pointer disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{isCreatingSheet ? 'Tablo Oluşturuluyor...' : 'Yeni Google E-Tablo Oluştur'}</span>
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleSyncDaily}
                      disabled={isSyncingDay}
                      className="flex items-center justify-center space-x-2 bg-[#21262d] hover:bg-[#30363d] border border-emerald-500/30 hover:border-emerald-500 text-emerald-400 p-2.5 rounded-lg text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                      title={`${formatDateTR(currentEntry.date)} gününün verilerini tabloya ekle`}
                    >
                      <Calendar className="w-4 h-4" />
                      <span>{isSyncingDay ? 'Aktarılıyor...' : 'Bugünün Kasa Raporunu Ekle'}</span>
                    </button>

                    <button
                      onClick={handleSyncAll}
                      disabled={isSyncingAll}
                      className="flex items-center justify-center space-x-2 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-gray-200 p-2.5 rounded-lg text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                      title="Tüm veritabanını ve günleri toplu güncelle"
                    >
                      <RefreshCw className={`w-4 h-4 ${isSyncingAll ? 'animate-spin text-orange-400' : 'text-gray-400'}`} />
                      <span>{isSyncingAll ? 'Senkronize Ediliyor...' : 'Tüm Verileri Senkronize Et'}</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-[#30363d] flex items-center justify-between text-[11px] text-gray-400 font-mono">
            <span>Sayfalar: Günlük Kasa, Vega Grupları, Masraflar, Faturalar</span>
            <span className="text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Yetkilendirildi
            </span>
          </div>
        </div>

        {/* Section 2: Google Drive Backup & Files */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-[#30363d]">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
                  <HardDrive className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Google Drive Bulut Depolama</h3>
                  <p className="text-xs text-gray-400">Dosya Yöneticisi & Otomatik Yedekler</p>
                </div>
              </div>

              <button
                onClick={loadDriveFiles}
                disabled={isLoadingFiles}
                className="p-2 hover:bg-[#21262d] text-gray-400 hover:text-white rounded-lg transition cursor-pointer"
                title="Dosya Listesini Yenile"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingFiles ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <button
                  onClick={() => {
                    if (!token) {
                      handleGoogleLogin();
                      return;
                    }
                    handleBackupToDrive();
                  }}
                  disabled={isBackingUp}
                  className="w-full flex items-center justify-center space-x-2 bg-sky-600 hover:bg-sky-500 text-white p-2.5 rounded-lg text-xs font-bold transition shadow-md cursor-pointer disabled:opacity-50"
                >
                  <Database className="w-4 h-4" />
                  <span>{isBackingUp ? 'Yedekleniyor...' : 'Drive\'a Tam Sistem Yedeği Kaydet'}</span>
                </button>
              </div>

              {/* Files List */}
              <div className="bg-[#0d1117] rounded-lg border border-[#30363d] overflow-hidden">
                <div className="px-3.5 py-2 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between text-xs font-medium text-gray-400">
                  <span>Google Drive Dosyalarınız ({driveFiles.length})</span>
                  <span className="text-[11px] font-mono text-gray-400">Klasör: Kasa & Vega</span>
                </div>

                <div className="max-h-52 overflow-y-auto divide-y divide-[#30363d]/60">
                  {driveFiles.length === 0 ? (
                    <div className="p-6 text-center text-xs text-gray-400 font-mono">
                      {token
                        ? isLoadingFiles
                          ? 'Drive dosyaları taranıyor...'
                          : 'Henüz yedek veya dosya bulunmuyor. Yukarıdan ilk yedeğinizi kaydedebilirsiniz.'
                        : 'Dosyalarınızı görmek için lütfen Google Hesabınızla giriş yapın.'}
                    </div>
                  ) : (
                    driveFiles.map((file) => {
                      const isBackup = file.name.includes('Yedeg') || file.name.endsWith('.json');
                      const isSheet = file.mimeType.includes('spreadsheet');

                      return (
                        <div
                          key={file.id}
                          className="p-2.5 flex items-center justify-between hover:bg-[#161b22] transition text-xs"
                        >
                          <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                            {isSheet ? (
                              <FileSpreadsheet className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                            ) : isBackup ? (
                              <Database className="w-4 h-4 text-sky-400 flex-shrink-0" />
                            ) : (
                              <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            )}
                            <div className="truncate">
                              <div className="font-medium text-gray-200 truncate">{file.name}</div>
                              <div className="text-[10px] text-gray-400 font-mono">
                                {file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString('tr-TR') : ''}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-1.5 flex-shrink-0">
                            {file.webViewLink && (
                              <a
                                href={file.webViewLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 hover:bg-[#21262d] text-gray-400 hover:text-white rounded"
                                title="Drive'da Aç"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}

                            {isBackup && onRestoreState && (
                              <button
                                onClick={() => {
                                  setConfirmAction({
                                    isOpen: true,
                                    title: 'Sistem Yedeği Geri Yüklensin mi?',
                                    description: `"${file.name}" adlı yedek dosyası indirilip mevcut sistem verilerinizin üzerine yazılacaktır. Devam etmek istiyor musunuz?`,
                                    actionType: 'restore_backup',
                                    targetId: file.id,
                                    targetName: file.name,
                                  });
                                }}
                                className="px-2 py-1 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 rounded text-[11px] font-semibold cursor-pointer"
                                title="Bu yedeği geri yükle"
                              >
                                Geri Yükle
                              </button>
                            )}

                            <button
                              onClick={() => {
                                setConfirmAction({
                                  isOpen: true,
                                  title: 'Dosyayı Silmek İstediğinize Emin misiniz?',
                                  description: `"${file.name}" dosyası Google Drive'dan kalıcı olarak silinecektir. Bu işlem geri alınamaz.`,
                                  actionType: 'delete_file',
                                  targetId: file.id,
                                  targetName: file.name,
                                });
                              }}
                              className="p-1.5 hover:bg-rose-500/10 text-gray-400 hover:text-rose-400 rounded transition cursor-pointer"
                              title="Drive'dan Sil"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-[#30363d] flex items-center justify-between text-[11px] text-gray-400 font-mono">
            <span>Yedekleme Formatı: Tam JSON & Raporlar</span>
            <span className="text-sky-400 font-medium">Bulut Senkronizasyon</span>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog for Destructive / Mutating Operations */}
      {confirmAction.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-orange-400">
              <AlertCircle className="w-6 h-6 flex-shrink-0" />
              <h3 className="text-base font-bold text-white">{confirmAction.title}</h3>
            </div>

            <p className="text-sm text-gray-300 leading-relaxed font-sans">
              {confirmAction.description}
            </p>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-[#30363d]">
              <button
                onClick={() => setConfirmAction((prev) => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 bg-[#21262d] hover:bg-[#30363d] text-gray-300 rounded-lg text-xs font-semibold transition cursor-pointer"
              >
                İptal
              </button>

              <button
                onClick={() => {
                  if (confirmAction.actionType === 'create_sheet') {
                    handleCreateNewSheet();
                  } else if (confirmAction.actionType === 'delete_file' && confirmAction.targetId) {
                    handleDeleteFile(confirmAction.targetId);
                  } else if (confirmAction.actionType === 'restore_backup' && confirmAction.targetId) {
                    handleRestoreFromDrive(confirmAction.targetId);
                  }
                }}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition shadow-md cursor-pointer ${
                  confirmAction.actionType === 'delete_file'
                    ? 'bg-rose-600 hover:bg-rose-500 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                {confirmAction.actionType === 'delete_file' ? 'Evet, Sil' : 'Onayla ve Devam Et'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
