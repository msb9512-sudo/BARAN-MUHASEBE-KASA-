import React, { useState } from 'react';
import {
  Settings,
  CreditCard,
  Plus,
  Trash2,
  Building2,
  Tag,
  Save,
  RotateCcw,
  Check,
  Stamp,
  Sparkles,
} from 'lucide-react';
import { PosDevice, ExpenseCategory } from '../types';
import { RestaurantProfile } from '../utils/storage';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  posDevices: PosDevice[];
  onUpdatePosDevices: (devices: PosDevice[]) => void;
  categories: ExpenseCategory[];
  onUpdateCategories: (categories: ExpenseCategory[]) => void;
  profile: RestaurantProfile;
  onUpdateProfile: (profile: RestaurantProfile) => void;
  onResetData: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  posDevices,
  onUpdatePosDevices,
  categories,
  onUpdateCategories,
  profile,
  onUpdateProfile,
  onResetData,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'pos' | 'categories'>('profile');
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

  const [devicesList, setDevicesList] = useState(posDevices);
  const [categoriesList, setCategoriesList] = useState(categories);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  // Auto-generate stamp text
  const handleGenerateStampText = () => {
    const lines = [
      profileForm.companyTitle || profileForm.name || 'ŞİRKET ÜNVANI',
      `${profileForm.taxOffice ? profileForm.taxOffice + ' V.D. ' : ''}${profileForm.taxNumber ? 'VKN: ' + profileForm.taxNumber : ''} ${profileForm.tradeRegistryNo ? '• Tic. Sicil: ' + profileForm.tradeRegistryNo : ''}`.trim(),
      profileForm.mersisNo ? `Mersis: ${profileForm.mersisNo}` : '',
      profileForm.address || '',
      profileForm.bossPhone ? `Tel: ${profileForm.bossPhone}` : '',
    ].filter(Boolean);

    const generated = lines.join('\n');
    setProfileForm((prev) => ({
      ...prev,
      stampText: generated,
    }));
  };

  // Profile Save
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile(profileForm);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto font-sans">
      <div className="bg-[#161b22] rounded-xl border border-[#30363d] w-full max-w-3xl p-6 shadow-2xl space-y-5 my-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#30363d] pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base font-mono">
                Şirket & Program Ayarları
              </h3>
              <p className="text-xs text-gray-400 font-mono">
                Kaşe bilgileri, şirket ünvanı, POS cihazları ve gider kategorileri
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-lg font-bold cursor-pointer p-1"
          >
            ✕
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center space-x-2 border-b border-[#30363d] pb-2 text-xs font-mono font-semibold">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'text-gray-400 hover:bg-[#21262d] hover:text-white'
            }`}
          >
            <Stamp className="w-3.5 h-3.5" />
            <span>Şirket Adı & Kaşe</span>
          </button>

          <button
            onClick={() => setActiveTab('pos')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
              activeTab === 'pos'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'text-gray-400 hover:bg-[#21262d] hover:text-white'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>POS Cihazları ({devicesList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('categories')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
              activeTab === 'categories'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'text-gray-400 hover:bg-[#21262d] hover:text-white'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Gider Kategorileri ({categoriesList.length})</span>
          </button>
        </div>

        {/* Tab 1: Profile & Kaşe */}
        {activeTab === 'profile' && (
          <form onSubmit={handleSaveProfile} className="space-y-4 text-xs font-mono">
            <div>
              <label className="block font-semibold text-gray-200 mb-1">
                Şirket Resmi Ünvanı / Firma Adı *
                <span className="text-gray-400 font-normal ml-1">(Üst menüde görünecek isim)</span>
              </label>
              <input
                type="text"
                required
                value={profileForm.companyTitle}
                onChange={(e) => setProfileForm({ ...profileForm, companyTitle: e.target.value })}
                placeholder="Örn: LEZZET SARAYI GIDA TURİZM SAN. VE TİC. LTD. ŞTİ."
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-white text-xs focus:border-orange-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-gray-300 mb-1">
                  Tabela / İşletme Adı
                </label>
                <input
                  type="text"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  placeholder="Örn: Lezzet Sarayı Restoran"
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-white text-xs focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-300 mb-1">
                  Şube / Lokasyon
                </label>
                <input
                  type="text"
                  value={profileForm.branch}
                  onChange={(e) => setProfileForm({ ...profileForm, branch: e.target.value })}
                  placeholder="Örn: Kadıköy Merkez Şube"
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-white text-xs focus:border-orange-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block font-semibold text-gray-300 mb-1">
                  Vergi Dairesi
                </label>
                <input
                  type="text"
                  value={profileForm.taxOffice || ''}
                  onChange={(e) => setProfileForm({ ...profileForm, taxOffice: e.target.value })}
                  placeholder="Örn: Kadıköy"
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-white text-xs focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-300 mb-1">
                  Vergi No / TC No *
                </label>
                <input
                  type="text"
                  required
                  value={profileForm.taxNumber}
                  onChange={(e) => setProfileForm({ ...profileForm, taxNumber: e.target.value })}
                  placeholder="Örn: 1234567890"
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-white text-xs focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-300 mb-1">
                  Ticaret Sicil No
                </label>
                <input
                  type="text"
                  value={profileForm.tradeRegistryNo || ''}
                  onChange={(e) => setProfileForm({ ...profileForm, tradeRegistryNo: e.target.value })}
                  placeholder="Örn: 987654"
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-white text-xs focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-300 mb-1">
                  Mersis No
                </label>
                <input
                  type="text"
                  value={profileForm.mersisNo || ''}
                  onChange={(e) => setProfileForm({ ...profileForm, mersisNo: e.target.value })}
                  placeholder="Örn: 012345..."
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-white text-xs focus:border-orange-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-gray-300 mb-1">
                Şirket / Fatura Adresi
              </label>
              <input
                type="text"
                value={profileForm.address || ''}
                onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                placeholder="Örn: Caferağa Mah. Moda Cad. No:44 Kadıköy / İstanbul"
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-white text-xs focus:border-orange-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-gray-300 mb-1">
                  Sorumlu Muhasebeci
                </label>
                <input
                  type="text"
                  value={profileForm.accountantName}
                  onChange={(e) => setProfileForm({ ...profileForm, accountantName: e.target.value })}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-white text-xs focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-300 mb-1">
                  Telefon / WhatsApp
                </label>
                <input
                  type="text"
                  value={profileForm.bossPhone}
                  onChange={(e) => setProfileForm({ ...profileForm, bossPhone: e.target.value })}
                  placeholder="+90 532 ..."
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-white text-xs focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-300 mb-1">
                  E-Posta
                </label>
                <input
                  type="email"
                  value={profileForm.bossEmail}
                  onChange={(e) => setProfileForm({ ...profileForm, bossEmail: e.target.value })}
                  placeholder="patron@sirket.com"
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-white text-xs focus:border-orange-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Stamp Preview */}
            <div className="p-3 rounded-xl border border-dashed border-orange-500/40 bg-[#0d1117] text-center space-y-1">
              <div className="text-[10px] text-orange-400 font-bold uppercase">Canlı Kaşe Önizlemesi</div>
              <div className="text-xs font-bold text-white uppercase">{profileForm.companyTitle || profileForm.name || 'ŞİRKET ÜNVANI'}</div>
              <div className="text-[11px] text-gray-400">
                {profileForm.taxOffice ? `${profileForm.taxOffice} V.D. ` : ''}
                {profileForm.taxNumber ? `VKN: ${profileForm.taxNumber} ` : ''}
                {profileForm.tradeRegistryNo ? `• Tic. Sicil: ${profileForm.tradeRegistryNo}` : ''}
              </div>
              {profileForm.address && <div className="text-[10px] text-gray-400">{profileForm.address}</div>}
            </div>

            <div className="pt-2 flex items-center justify-between">
              {savedSuccess ? (
                <span className="text-emerald-400 font-bold flex items-center space-x-1">
                  <Check className="w-4 h-4" />
                  <span>Şirket ve kaşe bilgileri kaydedildi!</span>
                </span>
              ) : <div />}

              <button
                type="submit"
                className="px-5 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-lg shadow-md cursor-pointer transition flex items-center space-x-1.5"
              >
                <Save className="w-4 h-4" />
                <span>Kaydet</span>
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: POS Devices */}
        {activeTab === 'pos' && (
          <div className="space-y-3 text-xs font-mono">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Restorandaki aktif POS cihazları listesi:</span>
              <button
                onClick={handleAddPos}
                className="text-xs bg-orange-600 hover:bg-orange-500 text-white font-bold px-3 py-1.5 rounded-lg shadow-xs cursor-pointer flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ POS Cihazı Ekle</span>
              </button>
            </div>

            <div className="space-y-2">
              {devicesList.map((device, idx) => (
                <div
                  key={device.id || idx}
                  className="p-3 rounded-lg bg-[#0d1117] border border-[#30363d] flex items-center space-x-2"
                >
                  <CreditCard className="w-4 h-4 text-orange-400 flex-shrink-0" />
                  <input
                    type="text"
                    value={device.name}
                    onChange={(e) => handleUpdatePos(idx, 'name', e.target.value)}
                    placeholder="Cihaz Adı (Örn: Garanti POS 1)"
                    className="flex-1 bg-[#161b22] border border-[#30363d] rounded-lg px-2.5 py-1 text-xs text-white focus:border-orange-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={device.bankName}
                    onChange={(e) => handleUpdatePos(idx, 'bankName', e.target.value)}
                    placeholder="Banka Adı"
                    className="w-32 bg-[#161b22] border border-[#30363d] rounded-lg px-2.5 py-1 text-xs text-white focus:border-orange-500 focus:outline-none"
                  />
                  <button
                    onClick={() => handleDeletePos(idx)}
                    className="text-gray-500 hover:text-rose-400 p-1 transition cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Categories */}
        {activeTab === 'categories' && (
          <div className="space-y-3 text-xs font-mono">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Kasa gider kategorileri:</span>
              <button
                onClick={handleAddCategory}
                className="text-xs bg-orange-600 hover:bg-orange-500 text-white font-bold px-3 py-1.5 rounded-lg shadow-xs cursor-pointer flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Kategori Ekle</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {categoriesList.map((cat, idx) => (
                <div
                  key={cat.id || idx}
                  className="p-2.5 rounded-lg bg-[#0d1117] border border-[#30363d] flex items-center space-x-2"
                >
                  <Tag className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
                  <input
                    type="text"
                    value={cat.name}
                    onChange={(e) => handleUpdateCat(idx, e.target.value)}
                    className="flex-1 bg-[#161b22] border border-[#30363d] rounded-lg px-2.5 py-1 text-xs text-white focus:border-orange-500 focus:outline-none"
                  />
                  <button
                    onClick={() => handleDeleteCat(idx)}
                    className="text-gray-500 hover:text-rose-400 p-1 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reset Data Warning Box */}
        <div className="pt-4 border-t border-[#30363d] flex items-center justify-between text-xs font-mono">
          <div>
            <div className="font-semibold text-gray-300">Temiz Kuruluma Sıfırla</div>
            <p className="text-[11px] text-gray-500">Tüm verileri temizleyip sıfır kurulum haline döndürür.</p>
          </div>

          <button
            type="button"
            onClick={() => {
              if (window.confirm('Tüm verileri temizleyip sıfır kurulum haline getirmek istediğinize emin misiniz?')) {
                onResetData();
                onClose();
              }
            }}
            className="text-rose-400 hover:text-rose-300 font-bold border border-rose-500/30 px-3 py-1.5 rounded-lg hover:bg-rose-500/10 transition cursor-pointer"
          >
            Temiz Kuruluma Sıfırla
          </button>
        </div>
      </div>
    </div>
  );
};
