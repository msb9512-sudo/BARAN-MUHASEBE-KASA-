import React, { useState, useMemo } from 'react';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Plus,
  Minus,
  Coins,
  Search,
  Filter,
  FileSpreadsheet,
  Trash2,
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Tag,
  Receipt,
  User,
  History,
  RotateCcw,
} from 'lucide-react';
import { MasterSafeState, SafeTransaction, BanknoteCounts, TabType, DailyEntry, CashExpense, Invoice, CashWithdrawalItem, FinancialAccount, AccountTransaction } from '../types';
import { formatCurrency, formatDateTR, parseNumberInput } from '../utils/formatters';
import { calculateBanknoteTotal, calculateTotalBanknoteCount, DEFAULT_BANKNOTES } from '../utils/storage';
import { calculateDailyRegister, getPreviousDayClosingCarryOver } from '../utils/calculations';
import { BanknoteCountModal, BanknoteModalSubmitData, DENOMINATIONS } from './BanknoteCountModal';
import { CashierStepFooter } from './CashierStepFooter';
import { SmartMoneyInput } from './SmartMoneyInput';

interface MasterSafeVaultViewProps {
  masterSafe: MasterSafeState;
  onUpdateMasterSafe: (updated: MasterSafeState) => void;
  selectedDate?: string;
  onNavigate?: (tab: TabType) => void;
  currentEntry?: DailyEntry;
  onUpdateEntry?: (updated: DailyEntry) => void;
  expenses?: CashExpense[];
  invoices?: Invoice[];
  accounts?: FinancialAccount[];
  accountTransactions?: AccountTransaction[];
  allEntries?: Record<string, DailyEntry> | DailyEntry[];
  onUpdateAccount?: (account: FinancialAccount) => void;
  onAddTransaction?: (tx: Omit<AccountTransaction, 'id' | 'createdAt'>) => void;
  onTransferToMasterSafe?: (transferData: {
    date: string;
    amount: number;
    banknotes: BanknoteCounts;
    enteredBy: string;
    description: string;
  }) => void;
}

export const MasterSafeVaultView: React.FC<MasterSafeVaultViewProps> = ({
  masterSafe,
  onUpdateMasterSafe,
  selectedDate,
  onNavigate,
  currentEntry,
  onUpdateEntry,
  expenses,
  invoices,
  accounts = [],
  accountTransactions = [],
  allEntries = [],
  onTransferToMasterSafe,
}) => {
  const [modalMode, setModalMode] = useState<'deposit' | 'withdrawal' | 'audit_count' | null>(null);
  const [isClosingTransferModalOpen, setIsClosingTransferModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'deposit' | 'withdrawal'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const gunlukKasaAccount = accounts?.find((a) => a.id === 'gunluk-kasa') || accounts?.find((a) => a.isDefault || a.type === 'cash') || accounts?.[0];
  const mainAccount = gunlukKasaAccount;
  const reg = currentEntry
    ? calculateDailyRegister(currentEntry, expenses || [], invoices || [], accountTransactions || [], mainAccount)
    : null;
  const remainingCashToTransfer = reg ? (reg.actualCashInHand > 0 ? reg.actualCashInHand : reg.expectedCash) : 0;
  const isVaultTransferred = currentEntry?.vaultTransfer?.transferred;

  const handleClosingTransferConfirm = (data: BanknoteModalSubmitData) => {
    if (!currentEntry) return;

    if (data.totalAmount <= 0 || remainingCashToTransfer <= 0) {
      alert('Devredilecek tutar sıfır veya eksi olamaz.');
      setIsClosingTransferModalOpen(false);
      return;
    }

    if (onTransferToMasterSafe) {
      onTransferToMasterSafe({
        date: currentEntry.date,
        amount: data.totalAmount,
        banknotes: data.banknotes,
        enteredBy: data.enteredBy || 'Muhasebe Sorumlusu',
        description: data.description || `${formatDateTR(currentEntry.date)} Gün Sonu Kalan Kasa Nakti`,
      });
    }

    if (onUpdateEntry) {
      onUpdateEntry({
        ...currentEntry,
        vaultTransfer: {
          transferred: true,
          amount: data.totalAmount,
          banknotes: data.banknotes,
          transferredAt: new Date().toISOString(),
          transferredBy: data.enteredBy || 'Muhasebe Sorumlusu',
        },
        updatedAt: new Date().toISOString(),
      });
    }

    setIsClosingTransferModalOpen(false);
  };

  const safeBanknotes = masterSafe?.banknotes || DEFAULT_BANKNOTES;
  const transactions = masterSafe?.transactions || [];

  const totalVaultBalance = useMemo(() => calculateBanknoteTotal(safeBanknotes), [safeBanknotes]);
  const totalBanknoteCount = useMemo(() => calculateTotalBanknoteCount(safeBanknotes), [safeBanknotes]);

  // Overall stats
  const stats = useMemo(() => {
    let totalDeposits = 0;
    let totalWithdrawals = 0;
    let depositCount = 0;
    let withdrawalCount = 0;

    transactions.forEach((tx) => {
      if (tx.type === 'deposit') {
        totalDeposits += tx.amount || 0;
        depositCount++;
      } else {
        totalWithdrawals += tx.amount || 0;
        withdrawalCount++;
      }
    });

    return {
      totalDeposits,
      totalWithdrawals,
      depositCount,
      withdrawalCount,
      netFlow: totalDeposits - totalWithdrawals,
    };
  }, [transactions]);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((tx) => {
        if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
        if (categoryFilter !== 'all' && tx.category !== categoryFilter) return false;
        if (searchTerm.trim()) {
          const s = searchTerm.toLowerCase();
          const matchDesc = tx.description?.toLowerCase().includes(s);
          const matchCat = tx.category?.toLowerCase().includes(s);
          const matchBy = tx.enteredBy?.toLowerCase().includes(s);
          const matchDate = tx.date?.includes(s);
          return matchDesc || matchCat || matchBy || matchDate;
        }
        return true;
      })
      .sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime());
  }, [transactions, typeFilter, categoryFilter, searchTerm]);

  // Category options for filter
  const categoriesList = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((tx) => {
      if (tx.category) set.add(tx.category);
    });
    return Array.from(set);
  }, [transactions]);

  const handleModalSubmit = (data: BanknoteModalSubmitData) => {
    if (modalMode === 'audit_count') {
      // Direct count override
      const updatedSafe: MasterSafeState = {
        ...masterSafe,
        banknotes: { ...data.banknotes },
        lastUpdated: new Date().toISOString(),
      };
      onUpdateMasterSafe(updatedSafe);
      setModalMode(null);
      return;
    }

    const isDeposit = modalMode === 'deposit';
    const newBanknotes = { ...safeBanknotes };

    // Update banknote inventory
    for (const d of [200, 100, 50, 20, 10, 5, 1]) {
      const delta = Number(data.banknotes[d]) || 0;
      if (isDeposit) {
        newBanknotes[d] = (Number(newBanknotes[d]) || 0) + delta;
      } else {
        newBanknotes[d] = Math.max(0, (Number(newBanknotes[d]) || 0) - delta);
      }
    }

    const newTx: SafeTransaction = {
      id: `safe-tx-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      date: data.date,
      type: isDeposit ? 'deposit' : 'withdrawal',
      source: isDeposit ? 'manual_deposit' : 'manual_expense',
      amount: data.totalAmount,
      banknotes: data.banknotes,
      category: data.category,
      description: data.description,
      enteredBy: data.enteredBy,
      receiptNo: data.receiptNo,
      createdAt: new Date().toISOString(),
    };

    const updatedSafe: MasterSafeState = {
      banknotes: newBanknotes,
      transactions: [newTx, ...transactions],
      lastUpdated: new Date().toISOString(),
    };

    onUpdateMasterSafe(updatedSafe);
    setModalMode(null);
  };

  const handleDeleteTransaction = (txId: string) => {
    const tx = transactions.find((t) => t.id === txId);
    if (!tx) return;

    const confirm = window.confirm(
      `"${tx.description}" (${formatCurrency(tx.amount)}) işlemini silmek istiyor musunuz? Not: Bu işlem kasa banknot stoklarını geri döndürecektir.`
    );
    if (!confirm) return;

    // Rollback banknotes
    const newBanknotes = { ...safeBanknotes };
    for (const d of [200, 100, 50, 20, 10, 5, 1]) {
      const delta = Number(tx.banknotes?.[d]) || 0;
      if (tx.type === 'deposit') {
        newBanknotes[d] = Math.max(0, (Number(newBanknotes[d]) || 0) - delta);
      } else {
        newBanknotes[d] = (Number(newBanknotes[d]) || 0) + delta;
      }
    }

    const updatedSafe: MasterSafeState = {
      banknotes: newBanknotes,
      transactions: transactions.filter((t) => t.id !== txId),
      lastUpdated: new Date().toISOString(),
    };

    onUpdateMasterSafe(updatedSafe);
  };

  const handleExportCSV = () => {
    if (transactions.length === 0) {
      alert('Dışa aktarılacak hareket kaydı bulunamadı.');
      return;
    }

    let csvContent = 'data:text/csv;charset=utf-8,\uFEFF';
    csvContent += 'Tarih,Islem Turu,Kategori,Aciklama,Tutar (TL),Banknot Dagilimi,Yetkili\n';

    transactions.forEach((tx) => {
      const bnStr = [200, 100, 50, 20, 10, 5, 1]
        .filter((d) => Number(tx.banknotes?.[d]) > 0)
        .map((d) => `${d}TLx${tx.banknotes[d]}`)
        .join('; ');

      const row = [
        tx.date,
        tx.type === 'deposit' ? 'Giris' : 'Cikis (Gider)',
        `"${tx.category || ''}"`,
        `"${tx.description || ''}"`,
        tx.amount,
        `"${bnStr}"`,
        `"${tx.enteredBy || ''}"`,
      ];
      csvContent += row.join(',') + '\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Ana_Kasa_Banknot_Hareketleri_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12 font-sans">
      
      {/* Top Banner / Navigation Card */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 sm:p-6 shadow-xl text-white">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          
          <div className="flex items-start space-x-4">
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-transparent text-amber-400 border border-amber-500/30 flex-shrink-0 shadow-inner">
              <Wallet className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center space-x-2 font-mono">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                  MERKEZ REZERV KASA
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  BANKNOT ENVENTERİ
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white mt-1 tracking-tight">
                Ana Kasa & Banknotlu Nakit Yönetimi
              </h2>
              <p className="text-xs sm:text-sm text-gray-300 font-mono mt-1">
                Günlük kasalardan aktarılan artan nakitler, banknot adetleri (200₺, 100₺, 50₺...) ve kasadan yapılan harcamaların anlık takibi.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 font-mono">
            <button
              onClick={() => setModalMode('deposit')}
              className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl shadow-lg transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nakit / Kasa Girişi Yap</span>
            </button>

            <button
              onClick={() => setModalMode('withdrawal')}
              className="flex items-center space-x-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl shadow-lg transition cursor-pointer"
            >
              <Minus className="w-4 h-4" />
              <span>Harcama / Masraf Çıkışı Yap</span>
            </button>

            <button
              onClick={() => setModalMode('audit_count')}
              className="flex items-center space-x-1.5 bg-[#21262d] hover:bg-[#30363d] text-gray-200 text-xs font-semibold px-3 py-2.5 rounded-xl border border-[#30363d] transition cursor-pointer"
              title="Kasayı fiziksel sayarak doğrudan düzelt"
            >
              <Coins className="w-4 h-4 text-purple-400" />
              <span>Sayım & Düzenle</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="flex items-center space-x-1.5 bg-[#21262d] hover:bg-[#30363d] text-gray-200 text-xs font-semibold px-3 py-2.5 rounded-xl border border-[#30363d] transition cursor-pointer"
              title="Hareketleri Excel / CSV formatında indir"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Excel / CSV</span>
            </button>
          </div>

        </div>
      </div>

      {/* Günün Kasa Kapanışından Nakit Devri Card */}
      {currentEntry && reg && (
        <div className="bg-[#161b22] rounded-2xl border border-amber-500/40 p-5 shadow-xl font-mono flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#30363d] flex-wrap gap-2">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
                    <Coins className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                        Günün Kasa Kapanışından Nakit Devri
                      </h3>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Gün sonu artan kasa mevcudunu küpür sayımıyla ana kasaya aktarma.
                    </p>
                  </div>
                </div>

                {isVaultTransferred ? (
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center space-x-1.5 shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Ana Kasaya Aktarıldı</span>
                  </span>
                ) : remainingCashToTransfer > 0 ? (
                  <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold shrink-0">
                    Devir Bekliyor
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-lg bg-[#21262d] text-gray-400 border border-[#30363d] text-xs font-bold shrink-0">
                    Kasa Dengede
                  </span>
                )}
              </div>

              {isVaultTransferred ? (
                <div className="bg-[#0d1117] rounded-xl border border-emerald-500/30 p-4 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <span className="text-xs text-gray-400">Devredilen Kasa Tutarı:</span>
                      <div className="text-2xl font-black text-emerald-400">
                        {formatCurrency(currentEntry.vaultTransfer?.amount || 0)}
                      </div>
                      {currentEntry.vaultTransfer?.transferredBy && (
                        <span className="text-xs text-gray-400">
                          Aktaran: <strong className="text-gray-300">{currentEntry.vaultTransfer.transferredBy}</strong>
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => setIsClosingTransferModalOpen(true)}
                      className="px-3.5 py-2 bg-[#21262d] hover:bg-[#30363d] border border-amber-500/30 text-amber-400 hover:text-amber-300 text-xs font-semibold rounded-lg transition cursor-pointer"
                    >
                      Banknot Sayımını Güncelle
                    </button>
                  </div>

                  {/* Banknotes Breakdown Chips */}
                  <div className="flex flex-wrap gap-1.5 pt-2.5 border-t border-[#21262d]">
                    {[200, 100, 50, 20, 10, 5, 1]
                      .filter((d) => Number(currentEntry.vaultTransfer?.banknotes?.[d]) > 0)
                      .map((d) => (
                        <span
                          key={d}
                          className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded bg-[#161b22] border border-[#30363d] text-xs text-gray-300"
                        >
                          <strong className="text-amber-400">{d} ₺</strong>
                          <span>×</span>
                          <strong className="text-white">
                            {currentEntry.vaultTransfer?.banknotes?.[d]}
                          </strong>
                        </span>
                      ))}
                  </div>
                </div>
              ) : (
                <div className="bg-[#0d1117] rounded-xl border border-[#30363d] p-4 space-y-3">
                  <div>
                    <span className="text-xs text-gray-400">Devredilecek Net Kasa Nakti:</span>
                    <div className="text-2xl font-black text-amber-400">
                      {formatCurrency(remainingCashToTransfer)}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {remainingCashToTransfer > 0
                        ? 'Günün kapanışından kalan bu tutarı küpürlerine (200₺, 100₺, 50₺...) ayırarak ana kasaya devredin.'
                        : 'Günün kasasında devredilecek nakit fazlası bulunmuyor veya kasa eşit.'}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      if (remainingCashToTransfer > 0) {
                        setIsClosingTransferModalOpen(true);
                      }
                    }}
                    disabled={remainingCashToTransfer <= 0}
                    className={`w-full py-3 px-4 font-bold text-xs rounded-xl shadow-lg transition flex items-center justify-center space-x-2 ${
                      remainingCashToTransfer > 0
                        ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white cursor-pointer'
                        : 'bg-gray-800 text-gray-500 border border-gray-700 cursor-not-allowed opacity-60'
                    }`}
                    title={remainingCashToTransfer <= 0 ? 'Devredilecek pozitif tutar bulunmadığı için aktarım yapılamaz (Tutar ≤ 0)' : undefined}
                  >
                    <Coins className="w-4 h-4" />
                    <span>
                      {remainingCashToTransfer > 0
                        ? 'Kalan Nakti Banknot Sayımıyla Ana Kasaya Aktar'
                        : 'Kasa Devri Yapılamaz (Tutar 0 veya Eksi)'}
                    </span>
                  </button>
                </div>
              )}
            </div>

            <div className="text-[11px] text-gray-500 pt-2 border-t border-[#30363d]">
              Aktarılan tutarlar aşağıdaki kasa mevcuduna ve banknot envanterine otomatik eklenir.
            </div>
          </div>
      )}

      {/* Main Banknote Inventory Summary Header */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 font-mono">
        
        {/* Big Total Safe Card (4 Cols) */}
        <div className="md:col-span-4 bg-gradient-to-br from-amber-950/40 via-[#161b22] to-[#0d1117] border-2 border-amber-500/50 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                TOPLAM KASA MEVCUDU
              </span>
              <span className="text-[11px] bg-amber-500/20 text-amber-300 font-bold px-2.5 py-0.5 rounded-full border border-amber-500/30">
                {totalBanknoteCount} Banknot / Madeni
              </span>
            </div>
            <div className="text-3xl sm:text-4xl font-black text-white mt-2 tracking-tight">
              {formatCurrency(totalVaultBalance)}
            </div>
            <p className="text-xs text-gray-300 mt-1">
              Kasada bulunan fiziki nakit toplamı.
            </p>
          </div>

          <div className="pt-4 border-t border-[#30363d] mt-4 grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-gray-400 block text-[11px]">Toplam Giriş:</span>
              <strong className="text-emerald-400 font-bold">+{formatCurrency(stats.totalDeposits)}</strong>
            </div>
            <div>
              <span className="text-gray-400 block text-[11px]">Toplam Çıkan:</span>
              <strong className="text-rose-400 font-bold">-{formatCurrency(stats.totalWithdrawals)}</strong>
            </div>
          </div>
        </div>

        {/* Banknote Denominations Cards Grid (8 Cols) */}
        <div className="md:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {DENOMINATIONS.map((d) => {
            const count = safeBanknotes[d.value] || 0;
            const subtotal = count * d.value;

            return (
              <div
                key={d.value}
                className={`p-3 rounded-xl border bg-gradient-to-b ${d.bgGrad} ${d.borderColor} shadow-md flex flex-col justify-between`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-extrabold px-2 py-0.5 rounded border ${d.badgeBg}`}>
                    {d.label}
                  </span>
                  <span className="text-[11px] text-gray-400 font-bold">
                    {count} Adet
                  </span>
                </div>

                <div className="mt-2.5">
                  <div className={`text-base font-black ${count > 0 ? d.textColor : 'text-gray-500'}`}>
                    {formatCurrency(subtotal)}
                  </div>
                  <div className="text-[10px] text-gray-400 truncate">
                    {d.subLabel}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* Transactions & Cash Movement Section */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl shadow-xl overflow-hidden font-sans">
        
        {/* Header & Filter Controls */}
        <div className="p-4 sm:p-5 border-b border-[#30363d] bg-[#1a212d] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-2 font-mono">
            <History className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white">
              Ana Kasa Nakit & Banknot Hareketleri ({filteredTransactions.length})
            </h3>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
            
            {/* Search Input */}
            <div className="relative min-w-[180px]">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Açıklama, kategori, tarih..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none"
              />
            </div>

            {/* Type Filter Buttons */}
            <div className="flex items-center bg-[#0d1117] border border-[#30363d] rounded-lg p-0.5">
              <button
                onClick={() => setTypeFilter('all')}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition cursor-pointer ${
                  typeFilter === 'all' ? 'bg-[#21262d] text-white font-bold' : 'text-gray-400 hover:text-white'
                }`}
              >
                Tümü
              </button>
              <button
                onClick={() => setTypeFilter('deposit')}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition cursor-pointer ${
                  typeFilter === 'deposit' ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-gray-400 hover:text-white'
                }`}
              >
                Girişler (+)
              </button>
              <button
                onClick={() => setTypeFilter('withdrawal')}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition cursor-pointer ${
                  typeFilter === 'withdrawal' ? 'bg-rose-500/20 text-rose-300 font-bold' : 'text-gray-400 hover:text-white'
                }`}
              >
                Harcamalar (-)
              </button>
            </div>

            {/* Category Filter */}
            {categoriesList.length > 0 && (
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-[#0d1117] border border-[#30363d] rounded-lg px-2.5 py-1.5 text-xs text-gray-300 focus:border-orange-500 focus:outline-none"
              >
                <option value="all">Tüm Kategoriler</option>
                {categoriesList.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            )}

          </div>
        </div>

        {/* Transactions Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="bg-[#0d1117] border-b border-[#30363d] text-gray-400 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Tarih</th>
                <th className="py-3 px-4">Tür</th>
                <th className="py-3 px-4">Kategori & Açıklama</th>
                <th className="py-3 px-4">Banknot Dağılımı (Küpür)</th>
                <th className="py-3 px-4 text-right">Tutar</th>
                <th className="py-3 px-4 text-center">Yetkili</th>
                <th className="py-3 px-4 text-center">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#21262d]">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400">
                    <Wallet className="w-8 h-8 mx-auto text-gray-500 mb-2 opacity-50" />
                    <p className="text-sm font-semibold text-gray-300">Henüz bir ana kasa hareketi kaydedilmemiş.</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Günlük kasa kapanışından devir yapabilir veya yukarıdaki butonlarla nakit girişi / gider çıkışı ekleyebilirsiniz.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => {
                  const isDep = tx.type === 'deposit';

                  // Active banknotes in this tx
                  const activeDenoms = [200, 100, 50, 20, 10, 5, 1].filter(
                    (d) => Number(tx.banknotes?.[d]) > 0
                  );

                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-[#1c2333]/50 transition group"
                    >
                      {/* Date */}
                      <td className="py-3 px-4 whitespace-nowrap text-gray-300">
                        {formatDateTR(tx.date)}
                      </td>

                      {/* Type Badge */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-bold border ${
                            isDep
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                          }`}
                        >
                          {isDep ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          <span>{isDep ? 'GİRİŞ' : 'ÇIKIŞ / GİDER'}</span>
                        </span>
                      </td>

                      {/* Description & Category */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-white font-sans">
                          {tx.description}
                        </div>
                        <div className="flex items-center space-x-2 text-[11px] text-gray-400 mt-0.5">
                          {tx.category && (
                            <span className="px-1.5 py-0.2 bg-[#21262d] text-gray-300 rounded border border-[#30363d]">
                              {tx.category}
                            </span>
                          )}
                          {tx.receiptNo && (
                            <span>Fiş/Makbuz No: {tx.receiptNo}</span>
                          )}
                        </div>
                      </td>

                      {/* Banknote Breakdown Badges */}
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1.5">
                          {activeDenoms.length === 0 ? (
                            <span className="text-gray-500 text-[11px]">-</span>
                          ) : (
                            activeDenoms.map((d) => {
                              const cnt = tx.banknotes[d];
                              return (
                                <span
                                  key={d}
                                  className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-[#0d1117] border border-[#30363d] text-[11px] text-gray-300"
                                >
                                  <strong className="text-amber-400">{d} ₺</strong>
                                  <span className="text-gray-400">×</span>
                                  <strong className="text-white">{cnt}</strong>
                                </span>
                              );
                            })
                          )}
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div
                          className={`text-sm font-extrabold ${
                            isDep ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {isDep ? '+' : '-'}
                          {formatCurrency(tx.amount)}
                        </div>
                      </td>

                      {/* Entered By */}
                      <td className="py-3 px-4 text-center whitespace-nowrap text-gray-400 text-[11px]">
                        {tx.enteredBy || 'Yetkili'}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleDeleteTransaction(tx.id)}
                          className="p-1.5 text-gray-500 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition cursor-pointer"
                          title="Hareketi Sil ve Kasayı Geri Al"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* Banknote Count / Transaction Modal */}
      {modalMode && (
        <BanknoteCountModal
          isOpen={true}
          onClose={() => setModalMode(null)}
          mode={modalMode}
          currentSafe={masterSafe}
          initialDate={selectedDate}
          onConfirm={handleModalSubmit}
        />
      )}

      {/* Daily Cash Closing Transfer Modal */}
      {isClosingTransferModalOpen && currentEntry && (
        <BanknoteCountModal
          isOpen={true}
          onClose={() => setIsClosingTransferModalOpen(false)}
          mode="closing_transfer"
          currentSafe={masterSafe}
          targetAmount={remainingCashToTransfer}
          initialDate={selectedDate || currentEntry.date}
          initialDescription={`${formatDateTR(selectedDate || currentEntry.date)} Gün Sonu Kalan Kasa Nakti`}
          initialCategory="Gün Sonu Kasa Devri"
          onConfirm={handleClosingTransferConfirm}
        />
      )}

      {/* Sequential Cashier Workflow Navigation Footer */}
      {onNavigate && (
        <CashierStepFooter
          currentTab="vault"
          onNavigate={onNavigate}
        />
      )}

    </div>
  );
};
