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
  HelpCircle,
  FileText,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { PosDevice, ExpenseCategory } from '../types';
import { RestaurantProfile } from '../utils/storage';

interface SettingsViewProps {
  posDevices: PosDevice[];
  onUpdatePosDevices: (devices: PosDevice[]) => void;
  categories: ExpenseCategory[];
  onUpdateCategories: (categories: ExpenseCategory[]) => void;
  profile: RestaurantProfile;
  onUpdateProfile: (profile: RestaurantProfile) => void;
  onResetData: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  posDevices,
  onUpdatePosDevices,
  categories,
  onUpdateCategories,
  profile,
  onUpdateProfile,
  onResetData,
}) => {
  const [activeSection, setActiveSection] = useState<'kase' | 'pos' | 'categories' | 'system'>('kase');
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
      name: 'Yeni Gider Kategorisi',
      type: 'kasa',
    };
    const updated = [...categoriesList, newCat];
    setCategoriesList(updated);
    onUpdateCategories(updated);
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
                <span>Banka POS Cihazları Yönetimi</span>
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Günlük Z raporu mutabakatı yapılacak banka POS terminalleri
              </p>
            </div>

            <button
              type="button"
              onClick={handleAddPos}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-lg text-xs shadow-md transition cursor-pointer flex items-center space-x-1.5 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Yeni POS Ekle</span>
            </button>
          </div>

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
        </div>
      )}

      {/* SECTION 3: Gider Kategorileri */}
      {activeSection === 'categories' && (
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 sm:p-6 shadow-xl space-y-4 font-mono">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#30363d] pb-3">
            <div>
              <h3 className="font-bold text-white text-sm uppercase tracking-wider flex items-center space-x-2">
                <Tag className="w-4 h-4 text-orange-400" />
                <span>Kasa Gider Kategorileri</span>
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Günlük nakit harcamaların sınıflandırıldığı başlıklar
              </p>
            </div>

            <button
              type="button"
              onClick={handleAddCategory}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-lg text-xs shadow-md transition cursor-pointer flex items-center space-x-1.5 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Yeni Kategori Ekle</span>
            </button>
          </div>

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
        </div>
      )}

      {/* SECTION 4: Veri & Sistem */}
      {activeSection === 'system' && (
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 sm:p-6 shadow-xl space-y-6 font-mono">
          <div>
            <h3 className="font-bold text-white text-sm uppercase tracking-wider flex items-center space-x-2 border-b border-[#30363d] pb-3">
              <RotateCcw className="w-4 h-4 text-orange-400" />
              <span>Veri Yönetimi ve Sistem Sıfırlama</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-[#0d1117] border border-[#30363d] flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-white text-xs mb-1">Fabrika Ayarlarına Dön (Temiz Kurulum)</h4>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  Tüm günlük kasa kayıtlarını, faturaları ve harcamaları temizleyerek sıfır kuruluma döndürür.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-[#30363d]">
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Tüm verileri temizleyip sıfır kurulum haline getirmek istediğinize emin misiniz?')) {
                      onResetData();
                    }
                  }}
                  className="px-4 py-2 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-600/40 text-rose-300 font-bold rounded-lg text-xs transition cursor-pointer flex items-center space-x-2"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Verileri Sıfırla</span>
                </button>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#0d1117] border border-[#30363d] flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-white text-xs mb-1">Veri Güvenliği ve Saklama</h4>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  Tüm verileriniz tarayıcınızın yerel depolama alanında (localStorage) güvenli bir şekilde saklanır.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-[#30363d] flex items-center space-x-2 text-[11px] text-emerald-400">
                <Check className="w-4 h-4" />
                <span>Yerel Depolama Aktif</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
