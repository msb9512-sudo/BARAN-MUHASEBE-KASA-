import React, { useState } from 'react';
import {
  Building2,
  Stamp,
  CreditCard,
  Tag,
  Save,
  Check,
  Plus,
  Trash2,
  FileSpreadsheet,
  AlertCircle,
  AlertTriangle,
  HelpCircle,
  FileText,
  RotateCcw,
  Sparkles,
  Calendar,
  ShieldAlert,
  Database,
  X,
  Palette,
} from 'lucide-react';
import { PosDevice, ExpenseCategory, DailyEntry, CashExpense, Invoice } from '../types';
import { RestaurantProfile } from '../utils/storage';
import { formatDateTR, formatCurrency, getTodayIsoDate } from '../utils/formatters';
import { ThemeAppearanceSettings } from './ThemeAppearanceSettings';

interface SettingsViewProps {
  posDevices: PosDevice[];
  onUpdatePosDevices: (devices: PosDevice[]) => void;
  categories: ExpenseCategory[];
  onUpdateCategories: (categories: ExpenseCategory[]) => void;
  profile: RestaurantProfile;
  onUpdateProfile: (profile: RestaurantProfile) => void;
  onResetData: () => void;
  entries?: Record<string, DailyEntry>;
  expenses?: CashExpense[];
  invoices?: Invoice[];
  selectedDate?: string;
  onResetAllFinancialData?: () => void;
  onResetSingleDay?: (date: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  posDevices,
  onUpdatePosDevices,
  categories,
  onUpdateCategories,
  profile,
  onUpdateProfile,
  onResetData,
  entries = {},
  expenses = [],
  invoices = [],
  selectedDate = getTodayIsoDate(),
  onResetAllFinancialData,
  onResetSingleDay,
}) => {
  const [activeSection, setActiveSection] = useState<'kase' | 'pos' | 'categories' | 'appearance' | 'system'>('kase');
  const [profileForm, setProfileForm] = useState<RestaurantProfile>({
    ...profile,
    companyTitle: profile.companyTitle || profile.name || '',
    taxOffice: profile.taxOffice || '',
    taxNumber: profile.taxNumber || '',
    tradeRegistryNo: profile.tradeRegistryNo || '',
    mersisNo: profile.mersisNo || '',
    address: profile.address || '',
    stampText: profile.stampText || '',
  });

  const [devicesList, setDevicesList] = useState<PosDevice[]>(posDevices);
  const [categoriesList, setCategoriesList] = useState<ExpenseCategory[]>(categories);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);

  // Day reset state
  const [targetDayToReset, setTargetDayToReset] = useState<string>(selectedDate || getTodayIsoDate());

  // Modal Confirmation State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'single_day' | 'clean_install' | 'factory_reset';
    targetDate?: string;
    title: string;
    description: string;
    impacts: string[];
    confirmButtonText: string;
  } | null>(null);

  // Auto-generate stamp text helper
  const handleGenerateStampText = () => {
    const lines = [
      profileForm.companyTitle || profileForm.name || 'ŞİRKET ÜNVANI',
      `${profileForm.taxOffice ? profileForm.taxOffice + ' V.D. ' : ''}${profileForm.taxNumber ? 'VKN: ' + profileForm.taxNumber : ''} ${profileForm.tradeRegistryNo ? '• Tic. Sicil: ' + profileForm.tradeRegistryNo : ''}`.trim(),
      profileForm.mersisNo ? `Mersis: ${profileForm.mersisNo}` : '',
      profileForm.address || '',
      profileForm.phone ? `Tel: ${profileForm.phone}` : '',
    ].filter(Boolean);

    const generated = lines.join('\n');
    setProfileForm((prev) => ({
      ...prev,
      stampText: generated,
    }));
  };

  // Save Profile / Kaşe
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile(profileForm);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  // Add POS
  const handleAddPos = () => {
    const newPos: PosDevice = {
      id: `pos-${Date.now()}`,
      name: `POS ${devicesList.length + 1}`,
      bankName: 'Banka Adı',
      isActive: true,
      terminalId: '00000000',
    };
    const updated = [...devicesList, newPos];
    setDevicesList(updated);
    onUpdatePosDevices(updated);
  };

  const handleUpdatePos = (idx: number, field: keyof PosDevice, val: any) => {
    const updated = [...devicesList];
    updated[idx] = { ...updated[idx], [field]: val };
    setDevicesList(updated);
    onUpdatePosDevices(updated);
  };

  const handleDeletePos = (idx: number) => {
    const updated = devicesList.filter((_, i) => i !== idx);
    setDevicesList(updated);
    onUpdatePosDevices(updated);
  };

  // Add Category
  const handleAddCategory = () => {
    const newCat: ExpenseCategory = {
      id: `cat-${Date.now()}`,
      name: 'Yeni Kategori',
      type: 'kasa',
    };
    const updated = [...categoriesList, newCat];
    setCategoriesList(updated);
    onUpdateCategories(updated);
  };

  const handleClearAllCategories = () => {
    if (window.confirm('Tüm gider kategorilerini silmek ve listeyi tamamen temizlemek istediğinize emin misiniz?')) {
      setCategoriesList([]);
      onUpdateCategories([]);
    }
  };

  const handleClearAllPos = () => {
    if (window.confirm('Tüm POS cihazı tanımlarını silmek istediğinize emin misiniz?')) {
      setDevicesList([]);
      onUpdatePosDevices([]);
    }
  };

  const handleUpdateCat = (idx: number, name: string) => {
    const updated = [...categoriesList];
    updated[idx] = { ...updated[idx], name };
    setCategoriesList(updated);
    onUpdateCategories(updated);
  };

  const handleDeleteCat = (idx: number) => {
    const updated = categoriesList.filter((_, i) => i !== idx);
    setCategoriesList(updated);
    onUpdateCategories(updated);
  };

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Header */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 sm:p-6 text-gray-200 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2 text-xs font-semibold text-orange-500 uppercase tracking-wider mb-0.5 font-mono">
                <span className="w-2 h-2 rounded-full bg-orange-500 inline-block"></span>
                <span>ŞİRKET & SİSTEM AYARLARI</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Kaşe Bilgileri ve Firma Tanımlamaları
              </h2>
              <p className="text-xs text-gray-400 font-mono mt-0.5">
                Şirket ünvanı ve kaşe bilgilerinizi buradan güncelleyebilir, POS cihazları ve gider kategorilerini yönetebilirsiniz.
              </p>
            </div>
          </div>

          {savedSuccess && (
            <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-xs font-mono font-bold flex items-center space-x-2 self-start sm:self-auto animate-pulse">
              <Check className="w-4 h-4" />
              <span>Ayarlar Başarıyla Kaydedildi!</span>
            </div>
          )}
        </div>

        {/* Sub-nav sections */}
        <div className="flex flex-wrap items-center gap-2 mt-5 pt-4 border-t border-[#30363d] text-xs font-mono">
          <button
            onClick={() => setActiveSection('kase')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg transition cursor-pointer font-semibold ${
              activeSection === 'kase'
                ? 'bg-orange-600 text-white shadow-md'
                : 'bg-[#0d1117] text-gray-400 hover:text-white hover:bg-[#21262d] border border-[#30363d]'
            }`}
          >
            <Stamp className="w-4 h-4" />
            <span>Şirket Adı & Kaşe Bilgisi</span>
          </button>

          <button
            onClick={() => setActiveSection('pos')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg transition cursor-pointer font-semibold ${
              activeSection === 'pos'
                ? 'bg-orange-600 text-white shadow-md'
                : 'bg-[#0d1117] text-gray-400 hover:text-white hover:bg-[#21262d] border border-[#30363d]'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>POS Cihazları ({devicesList.length})</span>
          </button>

          <button
            onClick={() => setActiveSection('categories')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg transition cursor-pointer font-semibold ${
              activeSection === 'categories'
                ? 'bg-orange-600 text-white shadow-md'
                : 'bg-[#0d1117] text-gray-400 hover:text-white hover:bg-[#21262d] border border-[#30363d]'
            }`}
          >
            <Tag className="w-4 h-4" />
            <span>Gider Kategorileri ({categoriesList.length})</span>
          </button>

          <button
            onClick={() => setActiveSection('appearance')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg transition cursor-pointer font-semibold ${
              activeSection === 'appearance'
                ? 'bg-orange-600 text-white shadow-md'
                : 'bg-[#0d1117] text-gray-400 hover:text-white hover:bg-[#21262d] border border-[#30363d]'
            }`}
          >
            <Palette className="w-4 h-4" />
            <span>Görünüm, Tema & Yazı Tipi</span>
          </button>

          <button
            onClick={() => setActiveSection('system')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg transition cursor-pointer font-semibold ${
              activeSection === 'system'
                ? 'bg-orange-600 text-white shadow-md'
                : 'bg-[#0d1117] text-gray-400 hover:text-white hover:bg-[#21262d] border border-[#30363d]'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            <span>Veri & Sistem</span>
          </button>
        </div>
      </div>

      {/* SECTION 1: Kaşe Bilgileri & Şirket Adı */}
      {activeSection === 'kase' && (
        <form onSubmit={handleSaveProfile} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form Fields (2 Cols) */}
            <div className="lg:col-span-2 bg-[#161b22] border border-[#30363d] rounded-xl p-5 sm:p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-[#30363d] pb-3">
                <div className="flex items-center space-x-2">
                  <Stamp className="w-4 h-4 text-orange-400" />
                  <h3 className="font-bold text-white text-sm uppercase tracking-wider font-mono">
                    Şirket & Kaşe Tanımlaması
                  </h3>
                </div>
                <span className="text-[11px] font-mono text-gray-400">
                  * Başlıkta ve raporlarda görünecektir
                </span>
              </div>

              {/* 1. Resmi Şirket Ünvanı (Firma Adı) */}
              <div>
                <label className="block text-xs font-semibold text-gray-200 mb-1.5 font-mono">
                  Şirket Resmi Ünvanı / Firma Adı *
                  <span className="text-gray-400 font-normal ml-1">
                    (Üst menüde ve resmi dökümlerde görünecek isim)
                  </span>
                </label>
                <input
                  type="text"
                  required
                  value={profileForm.companyTitle}
                  onChange={(e) => setProfileForm({ ...profileForm, companyTitle: e.target.value })}
                  placeholder="Örn: ANADOLU LEZZETLERİ GIDA TURİZM SAN. VE TİC. LTD. ŞTİ."
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3.5 py-2.5 text-sm text-white font-mono focus:border-orange-500 focus:outline-none shadow-inner"
                />
              </div>

              {/* 2. Tabela / Marka Adı ve Şube */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1 font-mono">
                    Tabela / İşletme Adı (Marka)
                  </label>
                  <input
                    type="text"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    placeholder="Örn: Lezzet Sarayı Restoran"
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1 font-mono">
                    Şube / Lokasyon Adı
                  </label>
                  <input
                    type="text"
                    value={profileForm.branch}
                    onChange={(e) => setProfileForm({ ...profileForm, branch: e.target.value })}
                    placeholder="Örn: Kadıköy Merkez Şube"
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* 3. Vergi Dairesi, Vergi No, Ticaret Sicil, Mersis No */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1 font-mono">
                    Vergi Dairesi
                  </label>
                  <input
                    type="text"
                    value={profileForm.taxOffice || ''}
                    onChange={(e) => setProfileForm({ ...profileForm, taxOffice: e.target.value })}
                    placeholder="Örn: Kadıköy"
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1 font-mono">
                    Vergi No / TC No *
                  </label>
                  <input
                    type="text"
                    required
                    value={profileForm.taxNumber}
                    onChange={(e) => setProfileForm({ ...profileForm, taxNumber: e.target.value })}
                    placeholder="Örn: 1234567890"
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1 font-mono">
                    Ticaret Sicil No
                  </label>
                  <input
                    type="text"
                    value={profileForm.tradeRegistryNo || ''}
                    onChange={(e) => setProfileForm({ ...profileForm, tradeRegistryNo: e.target.value })}
                    placeholder="Örn: 987654"
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1 font-mono">
                    Mersis No
                  </label>
                  <input
                    type="text"
                    value={profileForm.mersisNo || ''}
                    onChange={(e) => setProfileForm({ ...profileForm, mersisNo: e.target.value })}
                    placeholder="Örn: 012345..."
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* 4. Şirket / Şube Adresi */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1 font-mono">
                  Şirket / Fatura Adresi
                </label>
                <input
                  type="text"
                  value={profileForm.address || ''}
                  onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                  placeholder="Örn: Caferağa Mah. Moda Cad. No:44 Kadıköy / İstanbul"
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-orange-500 focus:outline-none"
                />
              </div>

              {/* 5. Yetkili / İletişim */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1 font-mono">
                    Sorumlu Muhasebeci / Kasiyer
                  </label>
                  <input
                    type="text"
                    value={profileForm.accountantName}
                    onChange={(e) => setProfileForm({ ...profileForm, accountantName: e.target.value })}
                    placeholder="Mehmet Muhasebeci"
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1 font-mono">
                    Telefon / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={profileForm.bossPhone}
                    onChange={(e) => setProfileForm({ ...profileForm, bossPhone: e.target.value })}
                    placeholder="+90 532 000 00 00"
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1 font-mono">
                    E-Posta Adresi
                  </label>
                  <input
                    type="email"
                    value={profileForm.bossEmail}
                    onChange={(e) => setProfileForm({ ...profileForm, bossEmail: e.target.value })}
                    placeholder="patron@sirket.com"
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* 6. Kaşe Metni (Textarea) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-gray-300 font-mono">
                    Kaşe Metni & Rapor Dipnotu
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateStampText}
                    className="text-[11px] font-mono text-orange-400 hover:text-orange-300 underline cursor-pointer flex items-center space-x-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Bilgilerden Otomatik Kaşe Üret</span>
                  </button>
                </div>
                <textarea
                  rows={4}
                  value={profileForm.stampText || ''}
                  onChange={(e) => setProfileForm({ ...profileForm, stampText: e.target.value })}
                  placeholder="Kaşe metnini buraya yazabilir veya yukarıdaki butonla otomatik üretebilirsiniz..."
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-3 text-xs text-gray-200 font-mono focus:border-orange-500 focus:outline-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-[#30363d] flex items-center justify-between">
                <p className="text-xs text-gray-400 font-mono">
                  Kaydettiğinizde şirket ismi üst menüde anında güncellenir.
                </p>

                <button
                  type="submit"
                  className="px-6 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-lg shadow-md transition cursor-pointer flex items-center space-x-2 font-mono text-xs"
                >
                  <Save className="w-4 h-4" />
                  <span>Bilgileri Kaydet</span>
                </button>
              </div>
            </div>

            {/* Live Kaşe Stamp Preview (1 Col) */}
            <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 sm:p-6 flex flex-col justify-between shadow-xl">
              <div>
                <div className="flex items-center space-x-2 border-b border-[#30363d] pb-3 mb-4">
                  <Stamp className="w-4 h-4 text-orange-400" />
                  <h3 className="font-bold text-white text-sm uppercase tracking-wider font-mono">
                    Canlı Kaşe Önizlemesi
                  </h3>
                </div>

                <p className="text-xs text-gray-400 font-mono mb-4">
                  Aşağıdaki kaşe görseli girdiğiniz şirket bilgileriyle anlık olarak oluşturulur:
                </p>

                {/* Stamp Box */}
                <div className="border-2 border-dashed border-orange-500/50 rounded-xl p-5 bg-[#0d1117] relative shadow-inner text-center font-mono space-y-2">
                  <div className="absolute top-2 right-2 text-[9px] font-bold uppercase tracking-wider text-orange-500/60 border border-orange-500/30 px-1.5 py-0.5 rounded">
                    KAŞE / MÜHÜR
                  </div>

                  <div className="text-xs font-bold text-white uppercase tracking-tight break-words pt-1">
                    {profileForm.companyTitle || profileForm.name || 'ŞİRKET ÜNVANI GİRİNİZ'}
                  </div>

                  {profileForm.name && profileForm.name !== profileForm.companyTitle && (
                    <div className="text-[11px] text-orange-400 font-semibold">
                      ({profileForm.name})
                    </div>
                  )}

                  <div className="text-[11px] text-gray-300 font-mono border-t border-[#30363d] pt-2 mt-2 space-y-0.5">
                    {profileForm.taxOffice && (
                      <div>
                        {profileForm.taxOffice} V.D. No: <strong className="text-white">{profileForm.taxNumber || '-'}</strong>
                      </div>
                    )}
                    {profileForm.tradeRegistryNo && (
                      <div>
                        Tic. Sicil No: <strong className="text-white">{profileForm.tradeRegistryNo}</strong>
                      </div>
                    )}
                    {profileForm.mersisNo && (
                      <div className="text-[10px] text-gray-400">
                        Mersis: {profileForm.mersisNo}
                      </div>
                    )}
                    {profileForm.address && (
                      <div className="text-[10px] text-gray-400 break-words mt-1">
                        {profileForm.address}
                      </div>
                    )}
                    {profileForm.bossPhone && (
                      <div className="text-[10px] text-gray-400">
                        Tel: {profileForm.bossPhone}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 p-3 rounded-lg bg-[#0d1117] border border-[#30363d] text-xs text-gray-400 font-mono space-y-1.5">
                  <div className="font-semibold text-gray-200 flex items-center space-x-1.5">
                    <FileText className="w-3.5 h-3.5 text-orange-400" />
                    <span>Kullanım Alanları:</span>
                  </div>
                  <ul className="list-disc list-inside text-[11px] space-y-1 text-gray-400">
                    <li>Üst başlık menüsü & ana navigasyon</li>
                    <li>Patron Raporu & WhatsApp paylaşım kartı</li>
                    <li>Aylık İcmal ve Resmi Yazdırma çıktıları</li>
                    <li>Kasa teslim & mutabakat tutanakları</li>
                  </ul>
                </div>
              </div>

              <div className="mt-6 pt-3 border-t border-[#30363d]">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-lg shadow-md transition cursor-pointer font-mono text-xs flex items-center justify-center space-x-2"
                >
                  <Save className="w-4 h-4" />
                  <span>Değişiklikleri Kaydet</span>
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* SECTION 2: POS Cihazları */}
      {activeSection === 'pos' && (
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 sm:p-6 shadow-xl space-y-4 font-mono">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#30363d] pb-3">
            <div>
              <h3 className="font-bold text-white text-sm uppercase tracking-wider flex items-center space-x-2">
                <CreditCard className="w-4 h-4 text-orange-400" />
                <span>Banka POS Cihazları Yönetimi ({devicesList.length})</span>
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Günlük Z raporu mutabakatı yapılacak banka POS terminalleri
              </p>
            </div>

            <div className="flex items-center space-x-2">
              {devicesList.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllPos}
                  className="px-3 py-2 bg-[#0d1117] hover:bg-rose-950/40 text-gray-400 hover:text-rose-400 font-semibold rounded-lg text-xs border border-[#30363d] transition cursor-pointer"
                >
                  Tüm POS'ları Sil
                </button>
              )}
              <button
                type="button"
                onClick={handleAddPos}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-lg text-xs shadow-md transition cursor-pointer flex items-center space-x-1.5 self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Yeni POS Ekle</span>
              </button>
            </div>
          </div>

          {devicesList.length === 0 ? (
            <div className="p-8 rounded-lg bg-[#0d1117] border border-[#30363d] text-center text-gray-500 space-y-2">
              <CreditCard className="w-8 h-8 mx-auto text-gray-600 mb-2" />
              <p className="text-gray-300 font-semibold text-sm">Tanımlı POS cihazı bulunmuyor</p>
              <p className="text-xs text-gray-500">POS cihazı eklemek için yukarıdaki 'Yeni POS Ekle' butonunu kullanabilirsiniz.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {devicesList.map((device, idx) => (
                <div
                  key={device.id || idx}
                  className="p-3.5 rounded-lg bg-[#0d1117] border border-[#30363d] flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
                >
                  <div className="flex items-center space-x-2 text-orange-400">
                    <CreditCard className="w-4 h-4 flex-shrink-0" />
                    <span className="text-xs text-gray-500 font-bold">#{idx + 1}</span>
                  </div>

                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={device.name}
                      onChange={(e) => handleUpdatePos(idx, 'name', e.target.value)}
                      placeholder="Cihaz Adı (Örn: POS 1 - Garanti)"
                      className="bg-[#161b22] border border-[#30363d] rounded px-3 py-1.5 text-xs text-white focus:border-orange-500 focus:outline-none"
                    />
                    <input
                      type="text"
                      value={device.bankName}
                      onChange={(e) => handleUpdatePos(idx, 'bankName', e.target.value)}
                      placeholder="Banka Adı (Örn: Garanti BBVA)"
                      className="bg-[#161b22] border border-[#30363d] rounded px-3 py-1.5 text-xs text-white focus:border-orange-500 focus:outline-none"
                    />
                    <input
                      type="text"
                      value={device.terminalId || ''}
                      onChange={(e) => handleUpdatePos(idx, 'terminalId', e.target.value)}
                      placeholder="Terminal / Seri No"
                      className="bg-[#161b22] border border-[#30363d] rounded px-3 py-1.5 text-xs text-white focus:border-orange-500 focus:outline-none"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeletePos(idx)}
                    className="p-2 text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition cursor-pointer self-end sm:self-auto"
                    title="Sil"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SECTION 3: Gider Kategorileri */}
      {activeSection === 'categories' && (
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 sm:p-6 shadow-xl space-y-4 font-mono">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#30363d] pb-3">
            <div>
              <h3 className="font-bold text-white text-sm uppercase tracking-wider flex items-center space-x-2">
                <Tag className="w-4 h-4 text-orange-400" />
                <span>Kasa Gider Kategorileri ({categoriesList.length})</span>
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Günlük nakit harcamaların sınıflandırıldığı başlıklar
              </p>
            </div>

            <div className="flex items-center space-x-2">
              {categoriesList.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllCategories}
                  className="px-3 py-2 bg-[#0d1117] hover:bg-rose-950/40 text-gray-400 hover:text-rose-400 font-semibold rounded-lg text-xs border border-[#30363d] transition cursor-pointer"
                >
                  Tümünü Temizle
                </button>
              )}
              <button
                type="button"
                onClick={handleAddCategory}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-lg text-xs shadow-md transition cursor-pointer flex items-center space-x-1.5 self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Yeni Kategori Ekle</span>
              </button>
            </div>
          </div>

          {categoriesList.length === 0 ? (
            <div className="p-8 rounded-lg bg-[#0d1117] border border-[#30363d] text-center text-gray-500 space-y-2">
              <Tag className="w-8 h-8 mx-auto text-gray-600 mb-2" />
              <p className="text-gray-300 font-semibold text-sm">Tanımlı kategori bulunmuyor (Tertemiz Liste)</p>
              <p className="text-xs text-gray-500">Gider girerken kategori adını serbestçe yazabilir veya '+ Yeni Kategori Ekle' butonundan ekleyebilirsiniz.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {categoriesList.map((cat, idx) => (
                <div
                  key={cat.id || idx}
                  className="p-3 rounded-lg bg-[#0d1117] border border-[#30363d] flex items-center space-x-2"
                >
                  <Tag className="w-4 h-4 text-orange-400 flex-shrink-0" />
                  <input
                    type="text"
                    value={cat.name}
                    onChange={(e) => handleUpdateCat(idx, e.target.value)}
                    className="flex-1 bg-[#161b22] border border-[#30363d] rounded px-2.5 py-1 text-xs text-white focus:border-orange-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleDeleteCat(idx)}
                    className="text-gray-500 hover:text-rose-400 p-1 transition cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SECTION 4: Veri & Sistem */}
      {activeSection === 'system' && (
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 sm:p-6 shadow-xl space-y-6 font-mono">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#30363d] pb-3">
            <div>
              <h3 className="font-bold text-white text-sm uppercase tracking-wider flex items-center space-x-2">
                <RotateCcw className="w-4 h-4 text-orange-400" />
                <span>Veri Yönetimi, Gün Sıfırlama ve Temiz Kurulum</span>
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Test aşamasına geçiş için tek bir günü veya tüm finansal hareketleri onaylı olarak sıfırlayabilirsiniz.
              </p>
            </div>

            {resetSuccessMessage && (
              <div className="px-3.5 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-xs font-bold flex items-center space-x-2 animate-pulse">
                <Check className="w-4 h-4" />
                <span>{resetSuccessMessage}</span>
              </div>
            )}
          </div>

          {/* 1. GÜN GÜN SIFIRLAMA (TEK BİR GÜNÜ TEMİZLE) */}
          <div className="p-4 sm:p-5 rounded-xl bg-[#0d1117] border border-orange-500/30 space-y-4 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#30363d] pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-xs uppercase tracking-wider">
                    1. Gün Gün Sıfırlama (Seçili Tarihi Temizle)
                  </h4>
                  <p className="text-[11px] text-gray-400">
                    Yalnızca seçtiğiniz tarihe ait Vega hasılatını, POS dökümlerini ve kasa masraflarını sıfırlar. Diğer günleriniz etkilenmez.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="date"
                  value={targetDayToReset}
                  onChange={(e) => setTargetDayToReset(e.target.value)}
                  className="bg-[#161b22] border border-[#30363d] rounded-lg px-3 py-1.5 text-xs text-white focus:border-orange-500 focus:outline-none font-mono"
                />
                <button
                  type="button"
                  onClick={() => {
                    const dayEntry = entries[targetDayToReset];
                    const dayExpenses = expenses.filter((e) => e.date === targetDayToReset);
                    const dayInvoices = invoices.filter((i) => i.date === targetDayToReset);

                    setConfirmModal({
                      isOpen: true,
                      type: 'single_day',
                      targetDate: targetDayToReset,
                      title: `${formatDateTR(targetDayToReset)} Tarihli Günü Sıfırla`,
                      description: `Seçili güne ait tüm operasyonel kayıtlar temizlenerek gün başlangıç (taslak) haline döndürülecektir.`,
                      impacts: [
                        `Vega Raporu & Ciro Tutarları (Mevcut: ${formatCurrency(dayEntry?.vegaReport?.totalSales || 0)})`,
                        `POS Z Raporları & Kredi Kartı Girişleri`,
                        `Bu tarihe ait Kasa Harcamaları (${dayExpenses.length} adet gider)`,
                        `Bu tarihe ait Faturalar (${dayInvoices.length} adet fatura)`,
                        `Diğer günlerin kayıtlarına VE şirket/kaşe/POS ayarlarınıza DOKUNULMAZ.`,
                      ],
                      confirmButtonText: `${formatDateTR(targetDayToReset)} Gününü Sıfırla`,
                    });
                  }}
                  className="px-3.5 py-1.5 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-lg text-xs transition cursor-pointer flex items-center space-x-1.5 shadow-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Seçili Günü Sıfırla</span>
                </button>
              </div>
            </div>

            {/* Kayıtlı Günler Tablosu */}
            <div>
              <div className="text-[11px] font-bold text-gray-300 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Sistemde İşlem Görmüş Günler:</span>
                <span className="text-gray-500 text-[10px] font-normal">
                  ({Object.keys(entries).length} Gün Kayıtlı)
                </span>
              </div>

              {Object.keys(entries).length === 0 ? (
                <div className="p-3 bg-[#161b22] border border-[#30363d] rounded-lg text-center text-xs text-gray-500">
                  Henüz kaydedilmiş bir gün bulunmuyor.
                </div>
              ) : (
                <div className="max-h-52 overflow-y-auto border border-[#30363d] rounded-lg divide-y divide-[#30363d] bg-[#161b22]">
                  {(Object.values(entries) as DailyEntry[])
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .map((item: DailyEntry) => {
                      const dayExpensesCount = expenses.filter((e) => e.date === item.date).length;
                      const hasData = (item.vegaReport?.totalSales || 0) > 0 || dayExpensesCount > 0 || (item.actualCashInHand || 0) > 0;

                      return (
                        <div
                          key={item.date}
                          className="p-2.5 sm:px-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-[#21262d] transition text-xs"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="font-bold text-white flex items-center space-x-1.5">
                              <Calendar className="w-3.5 h-3.5 text-orange-400" />
                              <span>{formatDateTR(item.date)}</span>
                            </div>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                              item.status === 'closed'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            }`}>
                              {item.status === 'closed' ? 'Kapatıldı' : 'Taslak'}
                            </span>
                            {hasData && (
                              <span className="text-[11px] text-gray-400 hidden sm:inline">
                                Ciro: <strong className="text-gray-200">{formatCurrency(item.vegaReport?.totalSales || 0)}</strong> • Gider: <strong className="text-gray-200">{dayExpensesCount} Adet</strong>
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              const dayExpenses = expenses.filter((e) => e.date === item.date);
                              const dayInvoices = invoices.filter((i) => i.date === item.date);

                              setConfirmModal({
                                isOpen: true,
                                type: 'single_day',
                                targetDate: item.date,
                                title: `${formatDateTR(item.date)} Tarihli Günü Sıfırla`,
                                description: `${formatDateTR(item.date)} tarihine ait kasa, ciro ve gider kayıtları sıfırlanacaktır.`,
                                impacts: [
                                  `Vega Raporu & Ciro Tutarları (Mevcut: ${formatCurrency(item.vegaReport?.totalSales || 0)})`,
                                  `POS Z Raporları & Kredi Kartı Girişleri`,
                                  `Bu tarihe ait Kasa Harcamaları (${dayExpenses.length} adet gider)`,
                                  `Bu tarihe ait Faturalar (${dayInvoices.length} adet fatura)`,
                                ],
                                confirmButtonText: `${formatDateTR(item.date)} Gününü Sıfırla`,
                              });
                            }}
                            className="px-2.5 py-1 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-600/30 rounded text-[11px] font-bold transition cursor-pointer flex items-center space-x-1 self-end sm:self-auto"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Bu Günü Sıfırla</span>
                          </button>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>

          {/* 2. TOPLU SIFIRLAMA SEÇENEKLERİ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* SEÇENEK A: Temiz Kurulum (Sadece Hareketleri Sıfırla - Ayarları Koru) */}
            <div className="p-4 sm:p-5 rounded-xl bg-[#0d1117] border border-emerald-500/30 flex flex-col justify-between space-y-4 shadow-md">
              <div>
                <div className="flex items-center space-x-2 text-emerald-400 mb-1.5">
                  <Database className="w-4 h-4" />
                  <h4 className="font-bold text-white text-xs uppercase tracking-wider">
                    2. Temiz Kuruluma Sıfırla (Önerilen)
                  </h4>
                </div>
                <p className="text-[11px] text-gray-300 leading-relaxed">
                  Şirket Resmi Ünvanı, Kaşe bilgileri, POS Cihazları ve Gider Kategorileri <strong className="text-emerald-400">KORUNUR</strong>. Tüm test amaçlı girilen günlük kasa icmalleri, Vega raporları, masraflar ve faturalar sıfırlanır.
                </p>
                <div className="mt-3 p-2.5 bg-[#161b22] rounded-lg border border-[#30363d] text-[11px] space-y-1 text-gray-400">
                  <div className="text-emerald-400 font-bold flex items-center space-x-1">
                    <Check className="w-3.5 h-3.5" />
                    <span>Şirket & POS Ayarları Korunur</span>
                  </div>
                  <div>• Tüm Günlük Kasa Raporları temizlenir</div>
                  <div>• Tüm Kasa Giderleri & Faturalar temizlenir</div>
                </div>
              </div>

              <div className="pt-3 border-t border-[#30363d]">
                <button
                  type="button"
                  onClick={() => {
                    setConfirmModal({
                      isOpen: true,
                      type: 'clean_install',
                      title: 'Temiz Kuruluma Sıfırla (Hareketleri Temizle)',
                      description: 'Test aşamasına geçmek için tüm kasa dökümleri, masraflar ve faturalar sıfırlanacaktır. Şirket kaşesi ve POS cihazlarınız korunacaktır.',
                      impacts: [
                        'Tüm Günlük Kasa & Vega Hasılat Dökümleri silinecektir.',
                        'Tüm Kasa Harcamaları & Gider Kayıtları silinecektir.',
                        'Tüm Tedarikçi Faturaları silinecektir.',
                        'ŞİRKET ÜNVANI, KAŞE, POS CİHAZLARI VE KATEGORİLER SAKLANACAKTIR.',
                      ],
                      confirmButtonText: 'Temiz Kuruluma Geç (Hareketleri Sıfırla)',
                    });
                  }}
                  className="w-full py-2.5 bg-emerald-700/80 hover:bg-emerald-600 text-white font-bold rounded-lg text-xs transition cursor-pointer flex items-center justify-center space-x-2 shadow-md"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Temiz Kuruluma Sıfırla (Ayarları Koru)</span>
                </button>
              </div>
            </div>

            {/* SEÇENEK B: Tam Fabrika Ayarlarına Dön (Her Şeyi Sıfırla) */}
            <div className="p-4 sm:p-5 rounded-xl bg-[#0d1117] border border-rose-500/30 flex flex-col justify-between space-y-4 shadow-md">
              <div>
                <div className="flex items-center space-x-2 text-rose-400 mb-1.5">
                  <ShieldAlert className="w-4 h-4" />
                  <h4 className="font-bold text-white text-xs uppercase tracking-wider">
                    3. Tam Fabrika Sıfırlaması
                  </h4>
                </div>
                <p className="text-[11px] text-gray-300 leading-relaxed">
                  Şirket profili, kaşe bilgisi, POS cihazları, kategoriler ve tüm finansal veriler dahil <strong className="text-rose-400">HER ŞEYİ</strong> ilk kurulum haline sıfırlar.
                </p>
                <div className="mt-3 p-2.5 bg-[#161b22] rounded-lg border border-[#30363d] text-[11px] space-y-1 text-gray-400">
                  <div className="text-rose-400 font-bold flex items-center space-x-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Tüm Ayarlar ve Bilgiler Silinir</span>
                  </div>
                  <div>• Şirket & Kaşe bilgileri sıfırlanır</div>
                  <div>• POS cihazları ve kategoriler ilk varsayılana döner</div>
                </div>
              </div>

              <div className="pt-3 border-t border-[#30363d]">
                <button
                  type="button"
                  onClick={() => {
                    setConfirmModal({
                      isOpen: true,
                      type: 'factory_reset',
                      title: 'Tam Fabrika Ayarlarına Sıfırla',
                      description: 'Tüm sistem, kaşe tanımları ve hareket kayıtları kalıcı olarak ilk kurulum haline döndürülecektir.',
                      impacts: [
                        'Şirket Ünvanı, Kaşe, VKN ve Adres bilgileri silinir.',
                        'POS Cihazları ve Gider Kategorileri varsayılana döner.',
                        'Tüm Günlük Kasa, Harcama ve Fatura kayıtları silinir.',
                      ],
                      confirmButtonText: 'Tüm Sistemi Fabrika Ayarlarına Sıfırla',
                    });
                  }}
                  className="w-full py-2.5 bg-rose-950/50 hover:bg-rose-900/80 border border-rose-600/40 text-rose-300 font-bold rounded-lg text-xs transition cursor-pointer flex items-center justify-center space-x-2 shadow-md"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Tam Fabrika Ayarlarına Sıfırla</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: Görünüm, Tema & Yazı Tipi Tercihleri */}
      {activeSection === 'appearance' && (
        <ThemeAppearanceSettings />
      )}

      {/* SAFETY CONFIRMATION MODAL */}
      {confirmModal && confirmModal.isOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto font-mono">
          <div className="bg-[#161b22] rounded-xl border border-rose-500/50 w-full max-w-lg p-6 shadow-2xl space-y-4 my-6 text-gray-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-[#30363d] pb-3">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-rose-400 uppercase tracking-wider">
                    GÜVENLİK ONAYI GEREKLİ
                  </div>
                  <h3 className="text-base font-bold text-white">
                    {confirmModal.title}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="text-gray-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Description */}
            <p className="text-xs text-gray-300 leading-relaxed">
              {confirmModal.description}
            </p>

            {/* Impacts List */}
            <div className="p-3.5 rounded-lg bg-[#0d1117] border border-[#30363d] space-y-2">
              <div className="text-[11px] font-bold text-gray-300 uppercase tracking-wider flex items-center space-x-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>Bu işlem sonucunda:</span>
              </div>
              <ul className="space-y-1 text-xs text-gray-400">
                {confirmModal.impacts.map((imp, idx) => (
                  <li key={idx} className="flex items-start space-x-1.5">
                    <span className="text-rose-400 font-bold">•</span>
                    <span>{imp}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-[#30363d] flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="w-full sm:w-auto px-4 py-2 bg-[#21262d] hover:bg-[#30363d] text-gray-300 font-bold rounded-lg text-xs transition cursor-pointer"
              >
                Vazgeç / İptal
              </button>

              <button
                type="button"
                onClick={() => {
                  if (confirmModal.type === 'single_day' && confirmModal.targetDate) {
                    if (onResetSingleDay) {
                      onResetSingleDay(confirmModal.targetDate);
                    }
                    setResetSuccessMessage(`${formatDateTR(confirmModal.targetDate)} tarihli gün başarıyla sıfırlandı.`);
                  } else if (confirmModal.type === 'clean_install') {
                    if (onResetAllFinancialData) {
                      onResetAllFinancialData();
                    } else {
                      onResetData();
                    }
                    setResetSuccessMessage('Tüm kasa hareketleri sıfırlandı. Temiz kuruluma geçildi.');
                  } else if (confirmModal.type === 'factory_reset') {
                    onResetData();
                    setResetSuccessMessage('Tüm sistem fabrika ayarlarına döndürüldü.');
                  }

                  setConfirmModal(null);
                  setTimeout(() => setResetSuccessMessage(null), 4000);
                }}
                className="w-full sm:w-auto px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs transition cursor-pointer flex items-center justify-center space-x-2 shadow-lg"
              >
                <Trash2 className="w-4 h-4" />
                <span>{confirmModal.confirmButtonText}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
