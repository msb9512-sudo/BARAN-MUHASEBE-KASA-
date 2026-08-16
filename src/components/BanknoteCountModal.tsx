import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Minus,
  Coins,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Receipt,
  Wallet,
  RotateCcw,
} from 'lucide-react';
import { BanknoteCounts, BanknoteDenomination, MasterSafeState } from '../types';
import { formatCurrency, getTodayIsoDate } from '../utils/formatters';
import { calculateBanknoteTotal, calculateTotalBanknoteCount, DEFAULT_BANKNOTES } from '../utils/storage';

export const DENOMINATIONS: Array<{
  value: BanknoteDenomination;
  label: string;
  subLabel: string;
  bgGrad: string;
  borderColor: string;
  textColor: string;
  badgeBg: string;
}> = [
  {
    value: 200,
    label: '200 ₺',
    subLabel: 'İki Yüz Türk Lirası',
    bgGrad: 'from-violet-950/40 via-[#1c2333] to-[#161b22]',
    borderColor: 'border-violet-500/40',
    textColor: 'text-violet-300',
    badgeBg: 'bg-violet-500/20 text-violet-300 border-violet-500/40',
  },
  {
    value: 100,
    label: '100 ₺',
    subLabel: 'Yüz Türk Lirası',
    bgGrad: 'from-sky-950/40 via-[#1c2333] to-[#161b22]',
    borderColor: 'border-sky-500/40',
    textColor: 'text-sky-300',
    badgeBg: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
  },
  {
    value: 50,
    label: '50 ₺',
    subLabel: 'Elli Türk Lirası',
    bgGrad: 'from-emerald-950/40 via-[#1c2333] to-[#161b22]',
    borderColor: 'border-emerald-500/40',
    textColor: 'text-emerald-300',
    badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  },
  {
    value: 20,
    label: '20 ₺',
    subLabel: 'Yirmi Türk Lirası',
    bgGrad: 'from-lime-950/40 via-[#1c2333] to-[#161b22]',
    borderColor: 'border-lime-500/40',
    textColor: 'text-lime-300',
    badgeBg: 'bg-lime-500/20 text-lime-300 border-lime-500/40',
  },
  {
    value: 10,
    label: '10 ₺',
    subLabel: 'On Türk Lirası',
    bgGrad: 'from-rose-950/40 via-[#1c2333] to-[#161b22]',
    borderColor: 'border-rose-500/40',
    textColor: 'text-rose-300',
    badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  },
  {
    value: 5,
    label: '5 ₺',
    subLabel: 'Beş Türk Lirası',
    bgGrad: 'from-amber-950/40 via-[#1c2333] to-[#161b22]',
    borderColor: 'border-amber-500/40',
    textColor: 'text-amber-300',
    badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  },
  {
    value: 1,
    label: '1 ₺',
    subLabel: 'Madeni Para / Bozukluk',
    bgGrad: 'from-slate-800/40 via-[#1c2333] to-[#161b22]',
    borderColor: 'border-slate-500/40',
    textColor: 'text-slate-300',
    badgeBg: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
  },
];

export interface BanknoteModalSubmitData {
  banknotes: BanknoteCounts;
  totalAmount: number;
  description: string;
  category: string;
  date: string;
  enteredBy: string;
  receiptNo?: string;
  notes?: string;
}

interface BanknoteCountModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'deposit' | 'withdrawal' | 'closing_transfer' | 'audit_count';
  currentSafe?: MasterSafeState;
  targetAmount?: number;
  initialDate?: string;
  initialDescription?: string;
  initialCategory?: string;
  onConfirm: (data: BanknoteModalSubmitData) => void;
}

export const BanknoteCountModal: React.FC<BanknoteCountModalProps> = ({
  isOpen,
  onClose,
  mode,
  currentSafe,
  targetAmount,
  initialDate,
  initialDescription,
  initialCategory,
  onConfirm,
}) => {
  const [counts, setCounts] = useState<BanknoteCounts>({ ...DEFAULT_BANKNOTES });
  const [description, setDescription] = useState(initialDescription || '');
  const [category, setCategory] = useState(
    initialCategory ||
      (mode === 'closing_transfer'
        ? 'Gün Sonu Kasa Devri'
        : mode === 'withdrawal'
        ? 'Genel Gider / Masraf'
        : 'Nakit Girişi')
  );
  const [date, setDate] = useState(initialDate || getTodayIsoDate());
  const [enteredBy, setEnteredBy] = useState('Kasiyer / Muhasebe');
  const [receiptNo, setReceiptNo] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const safeBanknotes = currentSafe?.banknotes || DEFAULT_BANKNOTES;

  // Initialize or auto-suggest on open
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setDescription(initialDescription || (mode === 'closing_transfer' ? 'Gün Sonu Kalan Kasa Nakti Aktarımı' : ''));
      setCategory(
        initialCategory ||
          (mode === 'closing_transfer'
            ? 'Gün Sonu Kasa Devri'
            : mode === 'withdrawal'
            ? 'Genel Gider / Masraf'
            : 'Nakit Girişi')
      );
      setDate(initialDate || getTodayIsoDate());

      if (mode === 'audit_count') {
        // Pre-fill with current safe stock for physical recount
        setCounts({ ...safeBanknotes });
      } else if (targetAmount && targetAmount > 0 && mode === 'closing_transfer') {
        // Try optimal auto-distribution for target amount if blank
        autoDistributeTarget(targetAmount);
      } else {
        setCounts({ ...DEFAULT_BANKNOTES });
      }
    }
  }, [isOpen, targetAmount, mode]);

  if (!isOpen) return null;

  const totalCalculated = calculateBanknoteTotal(counts);
  const totalCount = calculateTotalBanknoteCount(counts);

  const difference = targetAmount !== undefined ? totalCalculated - targetAmount : 0;
  const isTargetMatched = targetAmount !== undefined ? Math.abs(difference) < 0.01 : true;

  const handleCountChange = (denom: number, value: number) => {
    const val = Math.max(0, Math.floor(value || 0));
    setCounts((prev) => ({
      ...prev,
      [denom]: val,
    }));
  };

  const handleIncrement = (denom: number, step: number = 1) => {
    const current = Number(counts[denom]) || 0;
    handleCountChange(denom, current + step);
  };

  const handleDecrement = (denom: number, step: number = 1) => {
    const current = Number(counts[denom]) || 0;
    handleCountChange(denom, Math.max(0, current - step));
  };

  const handleSetMaxStock = (denom: number) => {
    const available = safeBanknotes[denom] || 0;
    handleCountChange(denom, available);
  };

  const autoDistributeTarget = (amount: number) => {
    let rem = Math.floor(amount);
    const newCounts: BanknoteCounts = { ...DEFAULT_BANKNOTES };

    const denoms: BanknoteDenomination[] = [200, 100, 50, 20, 10, 5, 1];
    for (const d of denoms) {
      if (rem >= d) {
        const count = Math.floor(rem / d);
        newCounts[d] = count;
        rem %= d;
      }
    }
    setCounts(newCounts);
  };

  const handleReset = () => {
    setCounts({ ...DEFAULT_BANKNOTES });
    setErrorMessage(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (totalCalculated <= 0 && mode !== 'audit_count') {
      setErrorMessage('Lütfen en az bir banknot adedi giriniz.');
      return;
    }

    // If withdrawal, check if safe has enough of each denomination
    if (mode === 'withdrawal') {
      for (const d of [200, 100, 50, 20, 10, 5, 1]) {
        const requested = Number(counts[d]) || 0;
        const available = Number(safeBanknotes[d]) || 0;
        if (requested > available) {
          setErrorMessage(
            `Yetersiz Banknot: Kasada yalnızca ${available} adet ${d} ₺ var. İstenen: ${requested} adet.`
          );
          return;
        }
      }
    }

    onConfirm({
      banknotes: counts,
      totalAmount: totalCalculated,
      description: description.trim() || (mode === 'withdrawal' ? 'Kasadan Nakit Çıkışı' : 'Kasaya Nakit Girişi'),
      category: category.trim() || 'Genel',
      date,
      enteredBy: enteredBy.trim() || 'Kasiyer',
      receiptNo: receiptNo.trim() || undefined,
    });

    onClose();
  };

  const isWithdrawal = mode === 'withdrawal';
  const isClosing = mode === 'closing_transfer';
  const isAudit = mode === 'audit_count';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col font-sans">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#30363d] bg-[#1a212d] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div
              className={`p-2.5 rounded-xl border ${
                isWithdrawal
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                  : isClosing
                  ? 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                  : isAudit
                  ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                  : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
              }`}
            >
              {isWithdrawal ? (
                <TrendingDown className="w-5 h-5" />
              ) : isClosing ? (
                <Wallet className="w-5 h-5" />
              ) : isAudit ? (
                <Coins className="w-5 h-5" />
              ) : (
                <TrendingUp className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  {isWithdrawal
                    ? 'Kasadan Harcama / Masraf Çıkışı (Banknot Seçimi)'
                    : isClosing
                    ? 'Gün Sonu Kalan Nakti Ana Kasaya Aktar (Küpür Sayımı)'
                    : isAudit
                    ? 'Ana Kasa Fiziksel Sayım & Banknot Güncelleme'
                    : 'Ana Kasaya Nakit Girişi (Banknot Sayımı)'}
                </h3>
              </div>
              <p className="text-xs text-gray-300 font-mono mt-0.5">
                {isWithdrawal
                  ? 'Harcama yapılacak tutar için hangi banknottan kaç adet çıktığını girin.'
                  : isClosing
                  ? 'Günlük kasada artan nakiti küpürlerine göre ana kasaya devredin.'
                  : 'Kasaya eklenen banknotların adetlerini sayarak kaydedin.'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#21262d] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Total & Comparison Bar */}
        <div className="p-4 bg-[#0d1117] border-b border-[#30363d] font-mono grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
          {/* Target Amount (If exists) */}
          {targetAmount !== undefined && (
            <div className="p-3 bg-[#161b22] border border-[#30363d] rounded-xl">
              <span className="text-[10px] text-gray-400 uppercase font-semibold block">
                Hedef Kapanış Tutarı
              </span>
              <div className="text-lg font-bold text-orange-400">
                {formatCurrency(targetAmount)}
              </div>
            </div>
          )}

          {/* Current Banknote Total */}
          <div
            className={`p-3 bg-[#161b22] border rounded-xl ${
              targetAmount !== undefined
                ? isTargetMatched
                  ? 'border-emerald-500/50 text-emerald-400'
                  : 'border-amber-500/50 text-amber-300'
                : 'border-blue-500/50 text-blue-400'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-400 uppercase font-semibold block">
                Sayılan Banknot Tutarı
              </span>
              <span className="text-[11px] px-1.5 py-0.2 rounded bg-black/40 text-gray-300">
                {totalCount} Adet
              </span>
            </div>
            <div className="text-xl font-extrabold text-white mt-0.5">
              {formatCurrency(totalCalculated)}
            </div>
          </div>

          {/* Status & Match Indicator */}
          {targetAmount !== undefined ? (
            <div
              className={`p-3 border rounded-xl flex flex-col justify-center ${
                isTargetMatched
                  ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                  : difference < 0
                  ? 'bg-amber-950/30 border-amber-500/40 text-amber-300'
                  : 'bg-blue-950/30 border-blue-500/40 text-blue-300'
              }`}
            >
              <div className="flex items-center space-x-1.5 font-bold text-xs">
                {isTargetMatched ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>✓ %100 TAM EŞLEŞTİ</span>
                  </>
                ) : difference < 0 ? (
                  <>
                    <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <span>{formatCurrency(Math.abs(difference))} EKSİK</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-blue-400 flex-shrink-0" />
                    <span>+{formatCurrency(difference)} FAZLA</span>
                  </>
                )}
              </div>
              <span className="text-[10px] text-gray-400 mt-0.5">
                {isTargetMatched
                  ? 'Kasadaki nakit ile birebir mutabık.'
                  : 'Banknot adetlerini güncelleyin.'}
              </span>
            </div>
          ) : (
            <div className="p-3 bg-[#161b22] border border-[#30363d] rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-semibold block">
                  İşlem Türü
                </span>
                <span className="text-xs font-bold text-gray-200">
                  {isWithdrawal ? 'Kasadan Çıkış (-)' : 'Kasaya Giriş (+)'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleReset}
                className="flex items-center space-x-1 text-xs text-gray-400 hover:text-white px-2 py-1 bg-[#21262d] rounded-lg transition cursor-pointer"
                title="Sıfırla"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Sıfırla</span>
              </button>
            </div>
          )}
        </div>

        {/* Scrollable Content Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          
          {errorMessage && (
            <div className="p-3.5 bg-rose-950/40 border border-rose-500/40 rounded-xl text-rose-300 text-xs font-mono flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Quick Helper for Closing Transfer */}
          {targetAmount && targetAmount > 0 && (
            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-orange-950/30 via-[#1c2333] to-[#161b22] border border-orange-500/30 rounded-xl">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-orange-400 flex-shrink-0" />
                <span className="text-xs text-gray-200 font-mono">
                  {formatCurrency(targetAmount)} tutarını en büyük banknotlara göre otomatik paylaştır:
                </span>
              </div>
              <button
                type="button"
                onClick={() => autoDistributeTarget(targetAmount)}
                className="text-xs bg-orange-600 hover:bg-orange-500 text-white font-bold px-3 py-1.5 rounded-lg shadow-sm transition cursor-pointer font-mono whitespace-nowrap"
              >
                Otomatik Küpür Doldur ⚡
              </button>
            </div>
          )}

          {/* Banknote Denominations Grid / Table */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs text-gray-400 font-mono px-2">
              <span>BANKNOT KÜPÜRÜ</span>
              <span className="text-right">ADET SAYIMI & TOPLAM TUTAR</span>
            </div>

            <div className="space-y-2 font-mono">
              {DENOMINATIONS.map((d) => {
                const count = Number(counts[d.value]) || 0;
                const rowTotal = count * d.value;
                const inSafe = safeBanknotes[d.value] || 0;
                const isOverStock = isWithdrawal && count > inSafe;

                return (
                  <div
                    key={d.value}
                    className={`p-3 rounded-xl border bg-gradient-to-r ${d.bgGrad} ${d.borderColor} transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isOverStock ? 'ring-2 ring-rose-500/60' : ''
                    }`}
                  >
                    {/* Left: Denomination Title & Safe Stock */}
                    <div className="flex items-center space-x-3 min-w-[200px]">
                      <span className={`px-2.5 py-1 rounded-lg text-sm font-extrabold border ${d.badgeBg}`}>
                        {d.label}
                      </span>
                      <div>
                        <div className={`text-xs font-bold ${d.textColor}`}>
                          {d.subLabel}
                        </div>
                        {currentSafe && (
                          <div className="text-[11px] text-gray-400 mt-0.5">
                            Kasada Mevcut:{' '}
                            <strong className={inSafe > 0 ? 'text-gray-200' : 'text-gray-500'}>
                              {inSafe} Adet ({formatCurrency(inSafe * d.value)})
                            </strong>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Middle / Right: Controls & Total */}
                    <div className="flex items-center justify-between sm:justify-end space-x-3 w-full sm:w-auto">
                      
                      {/* Counter Controls */}
                      <div className="flex items-center space-x-1.5 bg-[#0d1117] border border-[#30363d] rounded-lg p-1">
                        <button
                          type="button"
                          onClick={() => handleDecrement(d.value, 1)}
                          className="w-7 h-7 flex items-center justify-center rounded bg-[#21262d] hover:bg-[#30363d] text-gray-300 hover:text-white transition cursor-pointer text-xs font-bold"
                          title="-1"
                        >
                          <Minus className="w-3 h-3" />
                        </button>

                        <input
                          type="number"
                          min="0"
                          value={count === 0 ? '' : count}
                          onChange={(e) => handleCountChange(d.value, parseInt(e.target.value, 10))}
                          placeholder="0"
                          className={`w-16 text-center bg-transparent text-sm font-bold focus:outline-none ${
                            isOverStock ? 'text-rose-400' : 'text-white'
                          }`}
                        />

                        <button
                          type="button"
                          onClick={() => handleIncrement(d.value, 1)}
                          className="w-7 h-7 flex items-center justify-center rounded bg-[#21262d] hover:bg-[#30363d] text-gray-300 hover:text-white transition cursor-pointer text-xs font-bold"
                          title="+1"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Quick Shortcut Buttons (+5, +10 or Max) */}
                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => handleIncrement(d.value, 5)}
                          className="px-2 py-1 rounded bg-[#21262d] hover:bg-[#30363d] text-[11px] text-gray-300 hover:text-white border border-[#30363d] transition cursor-pointer"
                        >
                          +5
                        </button>
                        <button
                          type="button"
                          onClick={() => handleIncrement(d.value, 10)}
                          className="px-2 py-1 rounded bg-[#21262d] hover:bg-[#30363d] text-[11px] text-gray-300 hover:text-white border border-[#30363d] transition cursor-pointer hidden xs:inline"
                        >
                          +10
                        </button>
                        {isWithdrawal && inSafe > 0 && (
                          <button
                            type="button"
                            onClick={() => handleSetMaxStock(d.value)}
                            className="px-2 py-1 rounded bg-rose-950/40 hover:bg-rose-900/60 text-[10px] text-rose-300 border border-rose-800 transition cursor-pointer"
                            title="Kasada mevcut tüm banknotları seç"
                          >
                            Maks
                          </button>
                        )}
                      </div>

                      {/* Row Total Amount */}
                      <div className="text-right min-w-[95px]">
                        <div
                          className={`text-sm font-bold ${
                            count > 0 ? d.textColor : 'text-gray-500'
                          }`}
                        >
                          {formatCurrency(rowTotal)}
                        </div>
                        <div className="text-[10px] text-gray-400">
                          {count} Adet
                        </div>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Transaction Metadata Details (Description, Category, Date, etc.) */}
          <div className="p-4 bg-[#0d1117] border border-[#30363d] rounded-xl space-y-3 font-sans">
            <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider font-mono">
              İşlem & Açıklama Detayları
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Açıklama / Sebep
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="örn: Manav sebze alımı, Personel avans, Gün sonu kasası..."
                  className="w-full bg-[#161b22] border border-[#30363d] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Kategori
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-[#161b22] border border-[#30363d] rounded-lg px-3 py-2 text-xs text-white focus:border-orange-500 focus:outline-none font-mono"
                >
                  <option value="Gün Sonu Kasa Devri">Gün Sonu Kasa Devri</option>
                  <option value="Toptancı & Mal Alımı">Toptancı & Mal Alımı</option>
                  <option value="Manav & Pazar">Manav & Pazar</option>
                  <option value="Kasap & Et Alımı">Kasap & Et Alımı</option>
                  <option value="Personel Avans & Maaş">Personel Avans & Maaş</option>
                  <option value="Ortak / Patron Çekimi">Ortak / Patron Çekimi</option>
                  <option value="Banka Hesabına Yatırma">Banka Hesabına Yatırma</option>
                  <option value="Küçük Masraf & Sarf">Küçük Masraf & Sarf</option>
                  <option value="Diğer">Diğer</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  İşlem Tarihi
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-[#161b22] border border-[#30363d] rounded-lg px-3 py-2 text-xs text-white focus:border-orange-500 focus:outline-none font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  İşlemi Yapan / Teslim Alan
                </label>
                <input
                  type="text"
                  value={enteredBy}
                  onChange={(e) => setEnteredBy(e.target.value)}
                  placeholder="Kasiyer / Yetkili Adı"
                  className="w-full bg-[#161b22] border border-[#30363d] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none font-mono"
                />
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-2 flex flex-col-reverse sm:flex-row items-center justify-between gap-3 border-t border-[#30363d]">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 bg-[#21262d] hover:bg-[#30363d] text-gray-300 text-xs font-bold rounded-lg border border-[#30363d] transition cursor-pointer font-mono"
            >
              Vazgeç
            </button>

            <div className="flex items-center space-x-3 w-full sm:w-auto">
              <button
                type="submit"
                disabled={totalCalculated <= 0 && !isAudit}
                className={`w-full sm:w-auto px-6 py-2.5 text-white text-xs font-bold rounded-lg shadow-lg transition flex items-center justify-center space-x-2 cursor-pointer font-mono ${
                  isWithdrawal
                    ? 'bg-rose-600 hover:bg-rose-500 disabled:opacity-50'
                    : isClosing
                    ? 'bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 disabled:opacity-50'
                    : 'bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {isWithdrawal
                    ? `${formatCurrency(totalCalculated)} Kasadan Çıkışı Onayla`
                    : isClosing
                    ? `${formatCurrency(totalCalculated)} Ana Kasaya Aktar & Kilitle`
                    : isAudit
                    ? 'Sayımı Kaydet ve Güncelle'
                    : `${formatCurrency(totalCalculated)} Kasaya Girişi Kaydet`}
                </span>
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
