import React, { useState, useMemo } from 'react';
import {
  Landmark,
  Wallet,
  Building2,
  CreditCard,
  Plus,
  Minus,
  ArrowRight,
  ArrowRightLeft,
  Search,
  Filter,
  Trash2,
  Edit2,
  Calendar,
  CheckCircle2,
  ArrowDownRight,
  ArrowUpRight,
  Receipt,
  FileSpreadsheet,
  AlertCircle,
  HelpCircle,
  TrendingUp,
  TrendingDown,
  Shield,
  Layers,
  Scale,
  AlertTriangle,
} from 'lucide-react';
import {
  FinancialAccount,
  AccountTransaction,
  CashExpense,
  MasterSafeState,
  AccountType,
  TabType,
  DailyEntry,
  Invoice,
} from '../types';
import { formatCurrency, formatDateTR, parseNumberInput } from '../utils/formatters';
import { calculateAccountBalance, calculateBanknoteTotal } from '../utils/storage';
import { getAnaKasaChain } from '../utils/calculations';
import { SmartMoneyInput } from './SmartMoneyInput';

interface AccountsViewProps {
  accounts: FinancialAccount[];
  accountTransactions: AccountTransaction[];
  expenses: CashExpense[];
  masterSafe?: MasterSafeState;
  selectedDate: string;
  entries?: Record<string, DailyEntry> | DailyEntry[];
  invoices?: Invoice[];
  onAddAccount: (account: Omit<FinancialAccount, 'id' | 'createdAt'>) => void;
  onUpdateAccount: (account: FinancialAccount) => void;
  onDeleteAccount: (id: string) => void;
  onAddTransaction: (tx: Omit<AccountTransaction, 'id' | 'createdAt'>) => void;
  onDeleteTransaction: (id: string) => void;
  onNavigate?: (tab: TabType) => void;
}

export const AccountsView: React.FC<AccountsViewProps> = ({
  accounts,
  accountTransactions,
  expenses,
  masterSafe,
  selectedDate,
  entries,
  invoices,
  onAddAccount,
  onUpdateAccount,
  onDeleteAccount,
  onAddTransaction,
  onDeleteTransaction,
  onNavigate,
}) => {
  // Modal states
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<FinancialAccount | null>(null);

  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [txMode, setTxMode] = useState<'deposit' | 'withdrawal'>('deposit');
  const [selectedAccountIdForTx, setSelectedAccountIdForTx] = useState<string>('');

  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  // Filters
  const [accountTypeFilter, setAccountTypeFilter] = useState<'all' | 'bank' | 'cash' | 'pos' | 'other'>('all');
  const [accountFilter, setAccountFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'expense' | 'deposit' | 'withdrawal' | 'transfer'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // UI feedback states
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [accountFormError, setAccountFormError] = useState<string | null>(null);
  const [txFormError, setTxFormError] = useState<string | null>(null);
  const [transferFormError, setTransferFormError] = useState<string | null>(null);
  const [deleteConfirmAccount, setDeleteConfirmAccount] = useState<FinancialAccount | null>(null);
  const [deleteConfirmTxId, setDeleteConfirmTxId] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Account form state
  const [accountFormData, setAccountFormData] = useState({
    name: '',
    type: 'bank' as AccountType,
    bankName: '',
    accountNumber: '',
    initialBalance: '',
    trackingStartDate: '',
    color: '#3b82f6',
    notes: '',
  });

  // Transaction form state (Deposit / Withdrawal)
  const [txFormData, setTxFormData] = useState({
    accountId: '',
    date: selectedDate,
    amount: '',
    category: 'Para Girişi',
    description: '',
    receiptNo: '',
    enteredBy: 'Kasa Sorumlusu',
    notes: '',
  });

  // Transfer form state (Virman)
  const [transferFormData, setTransferFormData] = useState({
    fromAccountId: '',
    toAccountId: '',
    date: selectedDate,
    amount: '',
    description: 'Hesaplar arası para transferi (Virman)',
    receiptNo: '',
    enteredBy: 'Kasa Sorumlusu',
  });

  // Calculate balances for each account
  const accountBalances = useMemo(() => {
    const map = new Map<string, ReturnType<typeof calculateAccountBalance>>();
    accounts.forEach((acc) => {
      map.set(acc.id, calculateAccountBalance(acc, expenses, accountTransactions, masterSafe, entries, invoices));
    });
    return map;
  }, [accounts, expenses, accountTransactions, masterSafe, entries, invoices]);

  // All managed accounts filtered by category
  const displayedAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      if (accountTypeFilter === 'all') return true;
      if (accountTypeFilter === 'bank') return acc.type === 'bank';
      if (accountTypeFilter === 'cash') return acc.type === 'cash';
      if (accountTypeFilter === 'pos') return acc.type === 'pos' || acc.type === 'credit_card';
      if (accountTypeFilter === 'other') return acc.type === 'other';
      return true;
    });
  }, [accounts, accountTypeFilter]);

  // Overall aggregate stats for accounts
  const aggregateStats = useMemo(() => {
    let totalAllBalance = 0;
    let bankAccountsTotal = 0;
    let bankTotalDeposits = 0;
    let bankTotalExpenses = 0;

    accounts.forEach((acc) => {
      const bal = accountBalances.get(acc.id);
      if (bal) {
        totalAllBalance += bal.currentBalance;
        if (acc.type === 'bank' || acc.type === 'pos' || acc.type === 'credit_card') {
          bankAccountsTotal += bal.currentBalance;
        }
        bankTotalDeposits += bal.totalDeposits + bal.totalTransfersIn;
        bankTotalExpenses += bal.totalExpenses;
      }
    });

    return {
      totalAllBalance,
      bankAccountsTotal,
      bankTotalDeposits,
      bankTotalExpenses,
      allCount: accounts.length,
      bankCount: accounts.filter((a) => a.type === 'bank').length,
      cashCount: accounts.filter((a) => a.type === 'cash').length,
      posCount: accounts.filter((a) => a.type === 'pos' || a.type === 'credit_card').length,
      otherCount: accounts.filter((a) => a.type === 'other').length,
    };
  }, [accounts, accountBalances]);

  // Main Cash Account & Carry-over Chain Summary
  const mainCashAccount = useMemo(() => {
    return accounts.find((a) => a.isDefault || a.id === 'ana-kasa' || a.type === 'cash');
  }, [accounts]);

  const anaKasaChainSummary = useMemo(() => {
    if (!mainCashAccount || !mainCashAccount.trackingStartDate) return null;
    return getAnaKasaChain(mainCashAccount, entries, expenses, invoices, accountTransactions);
  }, [mainCashAccount, entries, expenses, invoices, accountTransactions]);

  // Combined unified ledger entries (Transactions + Expenses + Kasa Düzeltmeleri)
  const unifiedLedger = useMemo(() => {
    interface LedgerItem {
      id: string;
      date: string;
      accountId: string;
      accountName: string;
      type: 'deposit' | 'withdrawal' | 'transfer' | 'expense' | 'adjustment';
      amount: number;
      category: string;
      description: string;
      toAccountName?: string;
      fromAccountName?: string;
      receiptNo?: string;
      enteredBy?: string;
      createdAt: string;
      isExpense: boolean;
      rawTransactionId?: string;
      isCarryOverAdjustment?: boolean;
      rawDifference?: number;
    }

    const items: LedgerItem[] = [];

    // Add manual account transactions
    accountTransactions.forEach((tx) => {
      const acc = accounts.find((a) => a.id === tx.accountId);
      items.push({
        id: `tx-${tx.id}`,
        date: tx.date,
        accountId: tx.accountId,
        accountName: acc?.name || tx.accountName || 'Hesap',
        type: tx.type,
        amount: tx.amount,
        category: tx.category || (tx.type === 'deposit' ? 'Para Girişi' : tx.type === 'withdrawal' ? 'Para Çıkışı' : 'Virman'),
        description: tx.description,
        toAccountName: tx.toAccountName,
        fromAccountName: tx.fromAccountName,
        receiptNo: tx.receiptNo,
        enteredBy: tx.enteredBy,
        createdAt: tx.createdAt,
        isExpense: false,
        rawTransactionId: tx.id,
      });
    });

    // Add expenses mapped to their account
    expenses.forEach((exp) => {
      if (!exp.isActive) return;
      const p = (exp.paidBy || '').toLowerCase();
      const isCreditOrCard =
        p === 'kredi kartı' ||
        p === 'banka kartı' ||
        p === 'kredi karti' ||
        p === 'banka karti' ||
        p.includes('kredi') ||
        p.includes('kart');

      let targetAccount = accounts.find((a) => a.id === exp.accountId);

      if (isCreditOrCard) {
        // If assigned to a cash drawer account or not set, route to a credit card or bank account
        if (!targetAccount || targetAccount.type === 'cash' || targetAccount.id === 'ana-kasa') {
          targetAccount =
            accounts.find((a) => a.type === 'credit_card') ||
            accounts.find((a) => a.type === 'bank') ||
            targetAccount;
        }
      } else if (!targetAccount) {
        targetAccount =
          exp.paidBy === 'Banka'
            ? accounts.find((a) => a.type === 'bank') || accounts[0]
            : accounts.find((a) => a.isDefault || a.id === 'ana-kasa') || accounts[0];
      }

      items.push({
        id: `exp-${exp.id}`,
        date: exp.date,
        accountId: targetAccount ? targetAccount.id : isCreditOrCard ? 'kredi-karti' : 'ana-kasa',
        accountName: targetAccount ? targetAccount.name : isCreditOrCard ? 'Kredi / Banka Kartı' : 'Ana Kasa',
        type: 'expense',
        amount: exp.amount,
        category: exp.category || 'Gider',
        description: exp.description,
        receiptNo: exp.receiptNo,
        enteredBy: exp.enteredBy,
        createdAt: exp.createdAt,
        isExpense: true,
      });
    });

    // 4) Add Kasa Düzeltmesi entries for days where closingCarryOver differed from expectedCash
    if (anaKasaChainSummary && mainCashAccount) {
      anaKasaChainSummary.differenceEntries.forEach((diff) => {
        items.push({
          id: `diff-${diff.date}`,
          date: diff.date,
          accountId: mainCashAccount.id,
          accountName: mainCashAccount.name,
          type: 'adjustment',
          amount: Math.abs(diff.difference),
          category: 'Kasa Düzeltmesi',
          description: `Kasa Düzeltmesi (${formatDateTR(diff.date)}): ${diff.difference > 0 ? '+' : ''}${formatCurrency(diff.difference)} (Hesaplanan: ${formatCurrency(diff.expectedCash)}, Devir: ${formatCurrency(diff.closingCarryOver)})`,
          receiptNo: 'Gün Kapanışı',
          enteredBy: 'Sistem',
          createdAt: diff.date + 'T23:59:59',
          isExpense: false,
          isCarryOverAdjustment: true,
          rawDifference: diff.difference,
        });
      });
    }

    // Filter
    return items
      .filter((item) => {
        if (accountFilter !== 'all' && item.accountId !== accountFilter) return false;
        if (typeFilter !== 'all') {
          if (typeFilter === 'expense' && !item.isExpense) return false;
          if (typeFilter === 'deposit' && item.type !== 'deposit' && (!item.isCarryOverAdjustment || (item.rawDifference ?? 0) < 0)) return false;
          if (typeFilter === 'withdrawal' && item.type !== 'withdrawal' && (!item.isCarryOverAdjustment || (item.rawDifference ?? 0) >= 0)) return false;
          if (typeFilter === 'transfer' && item.type !== 'transfer') return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchDesc = item.description?.toLowerCase().includes(q);
          const matchCat = item.category?.toLowerCase().includes(q);
          const matchAcc = item.accountName?.toLowerCase().includes(q);
          const matchRc = item.receiptNo?.toLowerCase().includes(q);
          if (!matchDesc && !matchCat && !matchAcc && !matchRc) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.date + ' ' + (b.createdAt || '')).getTime() - new Date(a.date + ' ' + (a.createdAt || '')).getTime());
  }, [accountTransactions, expenses, accounts, accountFilter, typeFilter, searchQuery, anaKasaChainSummary, mainCashAccount]);

  // Handlers for Account Modal
  const handleOpenAddAccount = () => {
    setEditingAccount(null);
    setAccountFormError(null);
    setAccountFormData({
      name: '',
      type: 'bank',
      bankName: '',
      accountNumber: '',
      initialBalance: '',
      trackingStartDate: '',
      color: '#3b82f6',
      notes: '',
    });
    setIsAccountModalOpen(true);
  };

  const handleOpenEditAccount = (acc: FinancialAccount) => {
    setEditingAccount(acc);
    setAccountFormError(null);
    setAccountFormData({
      name: acc.name,
      type: acc.type,
      bankName: acc.bankName || '',
      accountNumber: acc.accountNumber || '',
      initialBalance: acc.initialBalance ? acc.initialBalance.toString() : '',
      trackingStartDate: acc.trackingStartDate || '',
      color: acc.color || '#3b82f6',
      notes: acc.notes || '',
    });
    setIsAccountModalOpen(true);
  };

  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    setAccountFormError(null);
    if (!accountFormData.name.trim()) {
      setAccountFormError('Lütfen geçerli bir hesap adı yazınız.');
      return;
    }

    const initBal = parseNumberInput(accountFormData.initialBalance) || 0;

    if (editingAccount) {
      onUpdateAccount({
        ...editingAccount,
        name: accountFormData.name.trim(),
        type: accountFormData.type,
        bankName: accountFormData.bankName.trim() || undefined,
        accountNumber: accountFormData.accountNumber.trim() || undefined,
        initialBalance: initBal,
        trackingStartDate: accountFormData.trackingStartDate?.trim() || undefined,
        color: accountFormData.color,
        notes: accountFormData.notes.trim() || undefined,
        updatedAt: new Date().toISOString(),
      });
      showToast(`"${accountFormData.name.trim()}" hesabı güncellendi.`);
    } else {
      onAddAccount({
        name: accountFormData.name.trim(),
        type: accountFormData.type,
        bankName: accountFormData.bankName.trim() || undefined,
        accountNumber: accountFormData.accountNumber.trim() || undefined,
        initialBalance: initBal,
        trackingStartDate: accountFormData.trackingStartDate?.trim() || undefined,
        color: accountFormData.color,
        notes: accountFormData.notes.trim() || undefined,
      });
      showToast(`"${accountFormData.name.trim()}" hesabı başarıyla açıldı.`);
    }

    setIsAccountModalOpen(false);
  };

  // Handlers for Deposit / Withdrawal
  const handleOpenTxModal = (mode: 'deposit' | 'withdrawal', defaultAccId?: string) => {
    setTxMode(mode);
    setTxFormError(null);
    const chosenAcc = defaultAccId || accounts[0]?.id || '';
    setSelectedAccountIdForTx(chosenAcc);
    setTxFormData({
      accountId: chosenAcc,
      date: selectedDate,
      amount: '',
      category: mode === 'deposit' ? 'Para Girişi' : 'Para Çıkışı',
      description: '',
      receiptNo: '',
      enteredBy: 'Kasa Sorumlusu',
      notes: '',
    });
    setIsTxModalOpen(true);
  };

  const handleSaveTx = (e: React.FormEvent) => {
    e.preventDefault();
    setTxFormError(null);
    const amountNum = parseNumberInput(txFormData.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setTxFormError('Lütfen geçerli bir işlem tutarı giriniz.');
      return;
    }
    if (!txFormData.description.trim()) {
      setTxFormError('Lütfen işlem açıklamasını yazınız.');
      return;
    }

    const acc = accounts.find((a) => a.id === (txFormData.accountId || selectedAccountIdForTx));
    if (!acc) {
      setTxFormError('Lütfen bir hesap seçiniz.');
      return;
    }

    onAddTransaction({
      accountId: acc.id,
      accountName: acc.name,
      date: txFormData.date,
      type: txMode,
      amount: amountNum,
      category: txFormData.category,
      description: txFormData.description.trim(),
      receiptNo: txFormData.receiptNo.trim() || undefined,
      enteredBy: txFormData.enteredBy.trim() || 'Kullanıcı',
      notes: txFormData.notes.trim() || undefined,
    });

    showToast(`${txMode === 'deposit' ? 'Para girişi' : 'Para çıkışı'} işlemi kaydedildi.`);
    setIsTxModalOpen(false);
  };

  // Handlers for Transfer (Virman)
  const handleOpenTransferModal = (fromAccId?: string) => {
    setTransferFormError(null);
    const fromId = fromAccId || accounts[0]?.id || '';
    const otherAcc = accounts.find((a) => a.id !== fromId);
    setTransferFormData({
      fromAccountId: fromId,
      toAccountId: otherAcc ? otherAcc.id : '',
      date: selectedDate,
      amount: '',
      description: 'Hesaplar arası virman transferi',
      receiptNo: '',
      enteredBy: 'Kasa Sorumlusu',
    });
    setIsTransferModalOpen(true);
  };

  const handleSaveTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    setTransferFormError(null);
    const amountNum = parseNumberInput(transferFormData.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setTransferFormError('Lütfen geçerli bir transfer tutarı giriniz.');
      return;
    }
    if (transferFormData.fromAccountId === transferFormData.toAccountId) {
      setTransferFormError('Kaynak hesap ile hedef hesap aynı olamaz. Lütfen farklı iki hesap seçiniz.');
      return;
    }

    const fromAcc = accounts.find((a) => a.id === transferFormData.fromAccountId);
    const toAcc = accounts.find((a) => a.id === transferFormData.toAccountId);

    if (!fromAcc || !toAcc) {
      setTransferFormError('Lütfen hem kaynak hem de hedef hesabı seçiniz.');
      return;
    }

    onAddTransaction({
      accountId: fromAcc.id,
      accountName: fromAcc.name,
      date: transferFormData.date,
      type: 'transfer',
      amount: amountNum,
      category: 'Virman',
      description: transferFormData.description.trim(),
      fromAccountId: fromAcc.id,
      fromAccountName: fromAcc.name,
      toAccountId: toAcc.id,
      toAccountName: toAcc.name,
      receiptNo: transferFormData.receiptNo.trim() || undefined,
      enteredBy: transferFormData.enteredBy.trim() || 'Kullanıcı',
    });

    showToast(`Virman işlemi başarıyla tamamlandı: ${fromAcc.name} ➔ ${toAcc.name}`);
    setIsTransferModalOpen(false);
  };

  const getAccountTypeIcon = (type: AccountType) => {
    switch (type) {
      case 'cash':
        return <Wallet className="w-4 h-4" />;
      case 'bank':
        return <Building2 className="w-4 h-4" />;
      case 'pos':
        return <CreditCard className="w-4 h-4" />;
      case 'credit_card':
        return <CreditCard className="w-4 h-4" />;
      default:
        return <Landmark className="w-4 h-4" />;
    }
  };

  const getAccountTypeLabel = (type: AccountType) => {
    switch (type) {
      case 'cash':
        return 'Nakit Kasa';
      case 'bank':
        return 'Banka Hesabı';
      case 'pos':
        return 'POS Tahsilat';
      case 'credit_card':
        return 'Kredi Kartı';
      default:
        return 'Diğer Hesap';
    }
  };

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#161b22] p-5 rounded-xl border border-[#30363d] shadow-lg">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-orange-500 uppercase tracking-wider mb-1 font-mono">
            <Landmark className="w-4 h-4" />
            <span>KASA İŞLEMLERİ & HESAP YÖNETİMİ</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>Kasa & Banka Hesapları</span>
            <span className="text-xs font-normal text-gray-400 font-mono px-2 py-0.5 rounded bg-[#21262d] border border-[#30363d]">
              {accounts.length} Hesap Aktif
            </span>
          </h2>
          <p className="text-xs text-gray-400 font-mono mt-0.5">
            Ana kasa mevcudu, açılan banka hesapları, nakit/banka transferleri ve anlık kalan para bakiyeleri
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 font-mono">
          <button
            onClick={() => handleOpenTransferModal()}
            disabled={accounts.length < 2}
            className="flex items-center space-x-1.5 bg-[#21262d] hover:bg-[#30363d] disabled:opacity-40 disabled:cursor-not-allowed text-gray-200 text-xs font-semibold px-3 py-2 rounded-lg border border-[#30363d] transition cursor-pointer"
            title="Hesaplar Arası Virman / Para Aktarımı"
          >
            <ArrowRightLeft className="w-4 h-4 text-sky-400" />
            <span>Virman / Transfer</span>
          </button>

          <button
            onClick={() => handleOpenTxModal('deposit')}
            className="flex items-center space-x-1.5 bg-[#21262d] hover:bg-[#30363d] text-emerald-300 text-xs font-semibold px-3 py-2 rounded-lg border border-emerald-500/30 transition cursor-pointer"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>+ Para Girişi</span>
          </button>

          <button
            onClick={handleOpenAddAccount}
            className="flex items-center space-x-1.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-md transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Yeni Hesap Aç</span>
          </button>
        </div>
      </div>

      {/* Top Financial Aggregate Stats Cards (4 compact Bank & POS cards) */}
      <div className="grid grid-cols-4 gap-2 sm:gap-3 font-mono">
        {/* Total Bank & POS Balance */}
        <div className="bg-[#161b22] p-2.5 sm:p-3 rounded-lg border border-[#30363d] relative overflow-hidden flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between gap-1 text-[11px] text-gray-400 font-semibold uppercase">
            <span className="truncate">TOPLAM BAKİYE</span>
            <Landmark className="w-3.5 h-3.5 text-orange-400 shrink-0" />
          </div>
          <div className={`text-base sm:text-lg font-bold mt-1 tracking-tight truncate ${aggregateStats.bankAccountsTotal >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {formatCurrency(aggregateStats.bankAccountsTotal)}
          </div>
          <span className="text-[10px] text-gray-500 mt-0.5 truncate block" title="Banka ve POS hesaplarındaki toplam net bakiye">
            Banka & POS toplamı
          </span>
        </div>

        {/* Banka Hesapları Sayısı */}
        <div className="bg-[#161b22] p-2.5 sm:p-3 rounded-lg border border-sky-500/30 bg-gradient-to-b from-sky-500/5 to-transparent relative overflow-hidden flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between gap-1 text-[11px] text-sky-400 font-semibold uppercase">
            <span className="truncate">BANKA HESAPLARI</span>
            <Building2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          </div>
          <div className="text-base sm:text-lg font-bold text-white mt-1 tracking-tight truncate">
            {aggregateStats.bankCount} Aktif Hesap
          </div>
          <span className="text-[10px] text-gray-400 mt-0.5 truncate block" title="Vadesiz mevduat hesapları">
            Mevduat hesapları
          </span>
        </div>

        {/* POS Hesapları */}
        <div className="bg-[#161b22] p-2.5 sm:p-3 rounded-lg border border-[#30363d] relative overflow-hidden flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between gap-1 text-[11px] text-gray-400 font-semibold uppercase">
            <span className="truncate">POS & KART</span>
            <CreditCard className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          </div>
          <div className="text-base sm:text-lg font-bold text-amber-400 mt-1 tracking-tight truncate">
            {aggregateStats.posCount} POS Hesabı
          </div>
          <span className="text-[10px] text-gray-500 mt-0.5 truncate block" title="POS tahsilat ve kart hesapları">
            POS & kart hesapları
          </span>
        </div>

        {/* Total Expenses Paid from Bank Accounts */}
        <div className="bg-[#161b22] p-2.5 sm:p-3 rounded-lg border border-[#30363d] relative overflow-hidden flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between gap-1 text-[11px] text-gray-400 font-semibold uppercase">
            <span className="truncate">BANKADAN GİDER</span>
            <Receipt className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          </div>
          <div className="text-base sm:text-lg font-bold text-rose-400 mt-1 tracking-tight truncate">
            {formatCurrency(aggregateStats.bankTotalExpenses)}
          </div>
          <span className="text-[10px] text-gray-500 mt-0.5 truncate block" title="Banka hesaplarından ödenen toplam işletme giderleri">
            Düşülen gider toplamı
          </span>
        </div>
      </div>

      {/* Notice Banner: Ana Kasa moved to 6. Ana Kasa & Banknot Takibi */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-center justify-between font-mono text-xs">
        <div className="flex items-center space-x-2 text-amber-300">
          <Wallet className="w-4 h-4 shrink-0 text-orange-400" />
          <span><strong>Ana Kasa (Nakit):</strong> Fiziki nakit ve banknot hareketleri <strong>6. Ana Kasa & Banknot Takibi</strong> adımından yönetilmektedir.</span>
        </div>
        {onNavigate && (
          <button
            onClick={() => onNavigate('vault')}
            className="px-2.5 py-1 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-lg transition shrink-0 ml-2 cursor-pointer flex items-center space-x-1"
          >
            <span>6. Ana Kasa'ya Git</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Accounts Grid (Cards for Each Account Showing Remaining Balance) */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div>
            <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
              <span>Hesap Listesi & Kalan Bakiyeleri</span>
              <span className="text-xs text-gray-400 font-normal">
                (Gider girildiğinde veya tahsilatta seçilen hesaptan düşülür/eklenir)
              </span>
            </h3>
          </div>

          {/* Account Category Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1 font-mono text-xs">
            <button
              onClick={() => setAccountTypeFilter('all')}
              className={`px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                accountTypeFilter === 'all'
                  ? 'bg-orange-500/20 text-orange-400 border-orange-500/40 font-bold'
                  : 'bg-[#161b22] text-gray-400 border-[#30363d] hover:text-white'
              }`}
            >
              Tümü ({aggregateStats.allCount})
            </button>
            <button
              onClick={() => setAccountTypeFilter('bank')}
              className={`px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                accountTypeFilter === 'bank'
                  ? 'bg-sky-500/20 text-sky-400 border-sky-500/40 font-bold'
                  : 'bg-[#161b22] text-gray-400 border-[#30363d] hover:text-white'
              }`}
            >
              Banka ({aggregateStats.bankCount})
            </button>
            <button
              onClick={() => setAccountTypeFilter('cash')}
              className={`px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                accountTypeFilter === 'cash'
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 font-bold'
                  : 'bg-[#161b22] text-gray-400 border-[#30363d] hover:text-white'
              }`}
            >
              Kasa & Nakit ({aggregateStats.cashCount})
            </button>
            <button
              onClick={() => setAccountTypeFilter('pos')}
              className={`px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                accountTypeFilter === 'pos'
                  ? 'bg-purple-500/20 text-purple-400 border-purple-500/40 font-bold'
                  : 'bg-[#161b22] text-gray-400 border-[#30363d] hover:text-white'
              }`}
            >
              POS & Kart ({aggregateStats.posCount})
            </button>
          </div>
        </div>

        {displayedAccounts.length === 0 ? (
          <div className="bg-[#161b22] rounded-xl border border-dashed border-[#30363d] p-8 text-center space-y-3 font-mono">
            <div className="w-12 h-12 rounded-full bg-[#21262d] flex items-center justify-center text-gray-400 mx-auto">
              <Landmark className="w-6 h-6" />
            </div>
            <h4 className="text-white font-bold text-sm">Bu filtreye ait hesap bulunamadı</h4>
            <p className="text-xs text-gray-400 max-w-md mx-auto">
              Yeni bir banka vadesiz hesabı, nakit kasa veya POS hesabı tanımlayabilirsiniz.
            </p>
            <button
              onClick={handleOpenAddAccount}
              className="inline-flex items-center space-x-1.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-md transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Yeni Hesap Aç</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedAccounts.map((acc) => {
              const bal = accountBalances.get(acc.id) || {
                initialBalance: 0,
                totalDeposits: 0,
                totalWithdrawals: 0,
                totalTransfersIn: 0,
                totalTransfersOut: 0,
                totalExpenses: 0,
                totalInflow: 0,
                totalOutflow: 0,
                currentBalance: 0,
              };

              const isMainCash = acc.isDefault || acc.id === 'ana-kasa';

              return (
                <div
                  key={acc.id}
                  className="bg-[#161b22] rounded-xl border border-[#30363d] hover:border-gray-600 transition shadow-lg overflow-hidden flex flex-col justify-between"
                >
                  {/* Account Card Header */}
                  <div className="p-4 border-b border-[#30363d]">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center space-x-2.5">
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-white shadow-inner shrink-0"
                          style={{ backgroundColor: acc.color ? `${acc.color}25` : '#3b82f625', color: acc.color || '#3b82f6' }}
                        >
                          {getAccountTypeIcon(acc.type)}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="text-base font-bold text-white tracking-tight">
                              {acc.name}
                            </h4>
                            {isMainCash && (
                              <span className="px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30 text-[10px] font-mono font-bold">
                                VARSAYILAN KASA
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 text-[11px] text-gray-400 font-mono mt-0.5">
                            <span>{getAccountTypeLabel(acc.type)}</span>
                            {acc.bankName && <span>• {acc.bankName}</span>}
                            {acc.accountNumber && <span>• No: {acc.accountNumber}</span>}
                          </div>
                        </div>
                      </div>

                      {/* Edit & Delete Action Buttons */}
                      <div className="flex items-center space-x-1 shrink-0">
                        <button
                          onClick={() => handleOpenEditAccount(acc)}
                          className="p-1.5 text-gray-400 hover:text-white hover:bg-[#21262d] rounded transition cursor-pointer"
                          title="Hesap Bilgilerini Düzenle"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {!isMainCash && (
                          <button
                            onClick={() => setDeleteConfirmAccount(acc)}
                            className="p-1.5 text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition cursor-pointer"
                            title="Hesabı Sil"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Account Balance Body */}
                  <div className="p-4 space-y-3 font-mono">
                    {/* Big Remaining Balance Display */}
                    <div className="bg-[#0d1117] p-3 rounded-lg border border-[#30363d]">
                      <div className="text-[11px] text-gray-400 font-semibold uppercase flex items-center justify-between">
                        <span>KALAN PARASI / BAKİYE</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded ${bal.currentBalance >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                          {bal.currentBalance >= 0 ? 'Pozitif Bakiye' : 'Eksi Bakiye'}
                        </span>
                      </div>
                      <div className={`text-2xl font-black mt-1 ${bal.currentBalance >= 0 ? 'text-white' : 'text-rose-400'}`}>
                        {formatCurrency(bal.currentBalance)}
                      </div>
                    </div>

                    {/* Financial Breakdown */}
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="bg-[#12161c] p-2 rounded border border-[#21262d]">
                        <span className="text-gray-400 block text-[10px]">
                          {isMainCash ? 'Başlangıç Bakiyesi (Avans):' : 'Başlangıç Bakiyesi:'}
                        </span>
                        <span className="font-semibold text-gray-300">{formatCurrency(bal.initialBalance)}</span>
                      </div>

                      <div className="bg-[#12161c] p-2 rounded border border-[#21262d]">
                        <span className="text-gray-400 block text-[10px]">Toplam Giriş (+):</span>
                        <span className="font-semibold text-emerald-400">+{formatCurrency(bal.totalDeposits + bal.totalTransfersIn)}</span>
                      </div>

                      <div className="bg-[#12161c] p-2 rounded border border-[#21262d]">
                        <span className="text-gray-400 block text-[10px]">Gider Çıkışları (-):</span>
                        <span className="font-semibold text-rose-400">-{formatCurrency(bal.totalExpenses)}</span>
                      </div>

                      <div className="bg-[#12161c] p-2 rounded border border-[#21262d]">
                        <span className="text-gray-400 block text-[10px]">Para Çekim / Virman (-):</span>
                        <span className="font-semibold text-amber-400">-{formatCurrency(bal.totalWithdrawals + bal.totalTransfersOut)}</span>
                      </div>
                    </div>

                    {isMainCash && (
                      <div className="bg-[#0d1117] p-2 rounded border border-orange-500/30 text-[10px] space-y-1">
                        <div className="flex items-center justify-between text-gray-300">
                          <span className="text-gray-400">Kasa Takip Başlangıç Tarihi:</span>
                          <strong className="text-orange-400 font-bold">
                            {acc.trackingStartDate ? formatDateTR(acc.trackingStartDate) : 'Tanımlanmadı (Tüm Hareketler)'}
                          </strong>
                        </div>
                        {acc.trackingStartDate ? (
                          <>
                            <span className="text-gray-400 block text-[9px]">
                              ✓ {formatDateTR(acc.trackingStartDate)} sabahı {formatCurrency(acc.initialBalance)} açılış avansı ile başlatıldı; günlük kasa ile tek sabit kasa olarak birleştirildi.
                            </span>
                            {anaKasaChainSummary && anaKasaChainSummary.differenceEntries.length > 0 && (
                              <div className="flex items-center justify-between text-[10px] font-mono text-purple-300 bg-purple-500/10 px-2 py-1 rounded border border-purple-500/20 mt-1">
                                <span>Kasa Düzeltme Özeti ({anaKasaChainSummary.differenceEntries.length} gün):</span>
                                <strong className={anaKasaChainSummary.totalCarryOverDifferences >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                                  {anaKasaChainSummary.totalCarryOverDifferences > 0 ? '+' : ''}
                                  {formatCurrency(anaKasaChainSummary.totalCarryOverDifferences)}
                                </strong>
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="text-gray-500 block text-[9px]">
                            Düzenle butonuna tıklayarak takip başlangıç tarihi belirleyebilirsiniz.
                          </span>
                        )}
                      </div>
                    )}

                    {acc.notes && (
                      <p className="text-[11px] text-gray-400 italic bg-[#0d1117] p-2 rounded border border-[#21262d]">
                        Not: {acc.notes}
                      </p>
                    )}
                  </div>

                  {/* Account Quick Buttons Footer */}
                  <div className="p-3 bg-[#12161c] border-t border-[#30363d] flex items-center justify-between gap-1.5 font-mono text-xs">
                    <button
                      onClick={() => handleOpenTxModal('deposit', acc.id)}
                      className="flex-1 flex items-center justify-center space-x-1 bg-[#21262d] hover:bg-[#2d333b] text-emerald-400 py-1.5 px-2 rounded border border-[#30363d] transition cursor-pointer font-semibold"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Para Yatır</span>
                    </button>

                    <button
                      onClick={() => handleOpenTxModal('withdrawal', acc.id)}
                      className="flex-1 flex items-center justify-center space-x-1 bg-[#21262d] hover:bg-[#2d333b] text-rose-400 py-1.5 px-2 rounded border border-[#30363d] transition cursor-pointer font-semibold"
                    >
                      <Minus className="w-3.5 h-3.5" />
                      <span>Para Çek</span>
                    </button>

                    <button
                      onClick={() => handleOpenTransferModal(acc.id)}
                      className="flex-1 flex items-center justify-center space-x-1 bg-[#21262d] hover:bg-[#2d333b] text-sky-400 py-1.5 px-2 rounded border border-[#30363d] transition cursor-pointer font-semibold"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                      <span>Virman</span>
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Direct Add Account Card at End of Grid */}
            <button
              onClick={handleOpenAddAccount}
              className="border-2 border-dashed border-[#30363d] hover:border-orange-500/60 rounded-xl p-6 flex flex-col items-center justify-center gap-2.5 text-gray-400 hover:text-orange-400 transition bg-[#161b22]/40 hover:bg-[#161b22] min-h-[220px] cursor-pointer group shadow-sm"
            >
              <div className="w-12 h-12 rounded-full bg-[#21262d] group-hover:bg-orange-500/20 flex items-center justify-center text-gray-400 group-hover:text-orange-400 transition">
                <Plus className="w-6 h-6" />
              </div>
              <span className="font-bold text-sm text-gray-200 group-hover:text-white font-mono">
                + Yeni Hesap Tanımla
              </span>
              <span className="text-xs text-gray-500 font-mono text-center max-w-[200px]">
                Banka, Nakit Kasa, POS veya Kredi Kartı hesabı açın
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Toplam Kasa Düzeltme Özeti Banner (Kural 4) */}
      {anaKasaChainSummary && anaKasaChainSummary.differenceEntries.length > 0 && (
        <div className="bg-[#161b22] rounded-xl border border-purple-500/30 p-4 sm:p-5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-mono">
          <div className="flex items-start space-x-3.5">
            <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 shrink-0">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                  Ana Kasa Kapanış Düzeltmeleri Özeti
                </h4>
                <span className="px-2 py-0.5 rounded-full bg-purple-500/30 text-purple-300 text-[11px] font-bold">
                  {anaKasaChainSummary.differenceEntries.length} Gün Düzeltmeli
                </span>
              </div>
              <p className="text-xs text-gray-400 font-sans mt-0.5">
                Gün kapanışlarında fiili sayım ile hesaplanan kasa arasındaki farktan kaynaklanan onaylanmış devir düzeltmeleri.
              </p>
            </div>
          </div>
          <div className="bg-[#0d1117] px-4 py-2.5 rounded-xl border border-[#30363d] flex sm:flex-col items-center sm:items-end justify-between sm:justify-center shrink-0">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider">Net Kasa Düzeltmesi</span>
            <span
              className={`text-lg font-black ${
                anaKasaChainSummary.totalCarryOverDifferences >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {anaKasaChainSummary.totalCarryOverDifferences > 0 ? '+' : ''}
              {formatCurrency(anaKasaChainSummary.totalCarryOverDifferences)}
            </span>
          </div>
        </div>
      )}

      {/* Unified Transaction & Expense Ledger Table */}
      <div className="bg-[#161b22] rounded-xl border border-[#30363d] shadow-lg overflow-hidden">
        {/* Table Filter Header */}
        <div className="p-4 sm:p-5 border-b border-[#30363d] flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight flex items-center space-x-2">
              <span>Hesap Hareketleri & Gider Çıkışları</span>
              <span className="text-xs text-gray-400 font-mono px-2 py-0.5 rounded bg-[#21262d] border border-[#30363d]">
                {unifiedLedger.length} Kayıt
              </span>
            </h3>
            <p className="text-xs text-gray-400 font-mono mt-0.5">
              Giderlerden yapılan harcamalar, kasadan çıkışlar, para yatırma ve virman hareketleri
            </p>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
            {/* Account Selector Filter */}
            <select
              value={accountFilter}
              onChange={(e) => setAccountFilter(e.target.value)}
              className="bg-[#0d1117] border border-[#30363d] rounded-lg px-2.5 py-1.5 text-gray-200 focus:border-orange-500 focus:outline-none"
            >
              <option value="all">Tüm Hesaplar</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="bg-[#0d1117] border border-[#30363d] rounded-lg px-2.5 py-1.5 text-gray-200 focus:border-orange-500 focus:outline-none"
            >
              <option value="all">Tüm İşlem Türleri</option>
              <option value="expense">Gider Harcaması (-)</option>
              <option value="deposit">Para Girişi (+)</option>
              <option value="withdrawal">Para Çıkışı (-)</option>
              <option value="transfer">Virman Transfer (⇄)</option>
            </select>

            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Açıklama, kategori veya hesap ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-[#0d1117] border border-[#30363d] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none w-48 sm:w-60"
              />
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2" />
            </div>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="bg-[#0d1117] text-gray-400 border-b border-[#30363d] uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Tarih</th>
                <th className="py-3 px-4">Hesap / Kaynak</th>
                <th className="py-3 px-4">İşlem Türü</th>
                <th className="py-3 px-4">Kategori / Açıklama</th>
                <th className="py-3 px-4">Yetkili / Fiş No</th>
                <th className="py-3 px-4 text-right">Tutar (TL)</th>
                <th className="py-3 px-4 text-center">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#30363d] text-gray-300">
              {unifiedLedger.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500">
                    Seçilen kriterlere ait hesap hareketi bulunamadı.
                  </td>
                </tr>
              ) : (
                unifiedLedger.map((item) => {
                  const isExp = item.isExpense;
                  const isDep = item.type === 'deposit';
                  const isWith = item.type === 'withdrawal';
                  const isTrf = item.type === 'transfer';

                  return (
                    <tr key={item.id} className="hover:bg-[#1f242c] transition">
                      <td className="py-3 px-4 whitespace-nowrap text-gray-400">
                        {formatDateTR(item.date)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-semibold text-white px-2 py-0.5 rounded bg-[#21262d] border border-[#30363d]">
                          {item.accountName}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {item.isCarryOverAdjustment && (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 font-semibold">
                            <Scale className="w-3 h-3" />
                            <span>Kasa Düzeltmesi</span>
                          </span>
                        )}
                        {!item.isCarryOverAdjustment && isExp && (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-semibold">
                            <Receipt className="w-3 h-3" />
                            <span>Gider Çıkışı</span>
                          </span>
                        )}
                        {!item.isCarryOverAdjustment && isDep && (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                            <ArrowDownRight className="w-3 h-3" />
                            <span>Para Girişi</span>
                          </span>
                        )}
                        {!item.isCarryOverAdjustment && isWith && (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold">
                            <ArrowUpRight className="w-3 h-3" />
                            <span>Para Çıkışı</span>
                          </span>
                        )}
                        {!item.isCarryOverAdjustment && isTrf && (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 font-semibold">
                            <ArrowRightLeft className="w-3 h-3" />
                            <span>Virman ({item.fromAccountName || item.accountName} ➔ {item.toAccountName})</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">{item.description}</div>
                        <div className="text-[11px] text-gray-400 font-sans">
                          Kategori: <strong className="text-gray-300 font-mono">{item.category}</strong>
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-gray-400">
                        <div>{item.enteredBy || '—'}</div>
                        {item.receiptNo && (
                          <div className="text-[10px] text-gray-500">Fiş: {item.receiptNo}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-right font-bold text-sm">
                        {item.isCarryOverAdjustment ? (
                          (item.rawDifference ?? 0) >= 0 ? (
                            <span className="text-emerald-400">+{formatCurrency(item.amount)}</span>
                          ) : (
                            <span className="text-rose-400">-{formatCurrency(item.amount)}</span>
                          )
                        ) : isDep ? (
                          <span className="text-emerald-400">+{formatCurrency(item.amount)}</span>
                        ) : (
                          <span className="text-rose-400">-{formatCurrency(item.amount)}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {item.isCarryOverAdjustment ? (
                          <span
                            className="text-[10px] text-gray-500 italic px-2 py-0.5 rounded bg-[#0d1117] border border-[#21262d] inline-block cursor-help"
                            title="Bu satır silinemez. İlgili günün kapanış kilidi açılarak devir tutarı değiştirilebilir."
                          >
                            Kilitli Devir
                          </span>
                        ) : !isExp && item.rawTransactionId ? (
                          <button
                            onClick={() => setDeleteConfirmTxId(item.rawTransactionId!)}
                            className="p-1 text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition cursor-pointer"
                            title="Hareketi Sil"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => onNavigate && onNavigate('expenses')}
                            className="text-[10px] text-orange-400 hover:underline cursor-pointer"
                            title="Giderler sayfasına git"
                          >
                            Gidere Git
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal 1: Add / Edit Account Modal */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#161b22] rounded-xl border border-[#30363d] w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#30363d] pb-3">
              <div>
                <h3 className="font-bold text-white text-base">
                  {editingAccount ? 'Hesabı Düzenle' : 'Yeni Hesap Aç'}
                </h3>
                <span className="text-xs text-gray-400 font-mono">
                  Banka, Kasa, POS veya Kredi Kartı hesabı tanımlayın
                </span>
              </div>
              <button
                onClick={() => setIsAccountModalOpen(false)}
                className="text-gray-400 hover:text-white text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {accountFormError && (
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center space-x-2 font-mono">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{accountFormError}</span>
              </div>
            )}

            <form onSubmit={handleSaveAccount} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block font-semibold text-gray-300 mb-1">
                  Hesap Adı *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Ziraat Bankası, Garanti POS, Şirket Kredi Kartı, Yedek Kasa"
                  value={accountFormData.name}
                  onChange={(e) => {
                    setAccountFormData({ ...accountFormData, name: e.target.value });
                    if (accountFormError) setAccountFormError(null);
                  }}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-white focus:border-orange-500 focus:outline-none font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-300 mb-1">
                    Hesap Türü *
                  </label>
                  <select
                    value={accountFormData.type}
                    onChange={(e) => {
                      const newType = e.target.value as AccountType;
                      let autoColor = '#3b82f6';
                      if (newType === 'cash') autoColor = '#f97316';
                      else if (newType === 'pos') autoColor = '#8b5cf6';
                      else if (newType === 'credit_card') autoColor = '#10b981';
                      else if (newType === 'other') autoColor = '#64748b';
                      setAccountFormData({ ...accountFormData, type: newType, color: autoColor });
                    }}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-gray-200 focus:border-orange-500 focus:outline-none"
                  >
                    <option value="bank">Banka Hesabı</option>
                    <option value="cash">Nakit Kasa</option>
                    <option value="pos">POS / Tahsilat Hesabı</option>
                    <option value="credit_card">Kurumsal Kredi Kartı</option>
                    <option value="other">Diğer Hesap</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-gray-300 mb-1">
                    Banka Adı (Varsa)
                  </label>
                  <input
                    type="text"
                    placeholder="Örn: Ziraat, Garanti, İş Bankası"
                    value={accountFormData.bankName}
                    onChange={(e) => setAccountFormData({ ...accountFormData, bankName: e.target.value })}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-white focus:border-orange-500 focus:outline-none font-sans"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-300 mb-1">
                    IBAN / Hesap No
                  </label>
                  <input
                    type="text"
                    placeholder="TR00 0000..."
                    value={accountFormData.accountNumber}
                    onChange={(e) => setAccountFormData({ ...accountFormData, accountNumber: e.target.value })}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-white focus:border-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-300 mb-1">
                    {accountFormData.type === 'cash' ? 'Başlangıç Bakiyesi (Avans)' : 'Başlangıç Bakiyesi (TL)'}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="0,00"
                      value={accountFormData.initialBalance}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9.,]/g, '');
                        setAccountFormData({ ...accountFormData, initialBalance: val });
                      }}
                      className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-emerald-400 font-bold font-mono focus:border-orange-500 focus:outline-none pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 font-mono pointer-events-none">
                      ₺
                    </span>
                  </div>
                </div>
              </div>

              {/* Kasa Takip Başlangıç Tarihi (Özellikle Nakit Kasa için) */}
              <div>
                <label className="block font-semibold text-gray-300 mb-1">
                  Kasa Takip Başlangıç Tarihi
                </label>
                <input
                  type="date"
                  value={accountFormData.trackingStartDate}
                  onChange={(e) => setAccountFormData({ ...accountFormData, trackingStartDate: e.target.value })}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-white font-mono focus:border-orange-500 focus:outline-none"
                />
                <span className="text-[10px] text-gray-400 mt-1 block">
                  Başlangıç bakiyesi, bu tarihin SABAHINDAKİ kasa tutarıdır (avans). Bu tarihten önceki günlerin hiçbir hesabı değişmez; bu tarihten itibaren günlük kasa ve Ana Kasa tek sabit kasa olarak otomatik devir işletir.
                </span>
              </div>

              {/* Color Selection Palette */}
              <div>
                <label className="block font-semibold text-gray-300 mb-1.5">
                  Hesap Rozet Rengi
                </label>
                <div className="flex items-center gap-2">
                  {[
                    { hex: '#3b82f6', label: 'Banka Mavisi' },
                    { hex: '#f97316', label: 'Kasa Turuncusu' },
                    { hex: '#10b981', label: 'Finans Yeşili' },
                    { hex: '#8b5cf6', label: 'POS Moru' },
                    { hex: '#f59e0b', label: 'Amber / Altın' },
                    { hex: '#ef4444', label: 'Kırmızı' },
                  ].map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setAccountFormData({ ...accountFormData, color: c.hex })}
                      title={c.label}
                      className={`w-7 h-7 rounded-full border-2 transition cursor-pointer flex items-center justify-center ${
                        accountFormData.color === c.hex ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-75 hover:opacity-100 hover:scale-105'
                      }`}
                      style={{ backgroundColor: c.hex }}
                    >
                      {accountFormData.color === c.hex && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-300 mb-1">
                  Açıklama / Not
                </label>
                <input
                  type="text"
                  placeholder="İsteğe bağlı not..."
                  value={accountFormData.notes}
                  onChange={(e) => setAccountFormData({ ...accountFormData, notes: e.target.value })}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-white focus:border-orange-500 focus:outline-none font-sans"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#30363d]">
                <button
                  type="button"
                  onClick={() => setIsAccountModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-gray-300 font-semibold cursor-pointer border border-[#30363d]"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-semibold shadow-md cursor-pointer"
                >
                  {editingAccount ? 'Hesabı Güncelle' : 'Hesabı Aç'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Deposit / Withdrawal Modal */}
      {isTxModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#161b22] rounded-xl border border-[#30363d] w-full max-w-md p-6 shadow-2xl space-y-4 font-mono">
            <div className="flex items-center justify-between border-b border-[#30363d] pb-3">
              <div>
                <h3 className="font-bold text-white text-base flex items-center space-x-2">
                  <span>{txMode === 'deposit' ? 'Para Girişi / Yatırma' : 'Para Çıkışı / Çekme'}</span>
                </h3>
                <span className="text-xs text-gray-400">
                  Hesaba nakit veya banka hareketi ekleyin
                </span>
              </div>
              <button
                onClick={() => setIsTxModalOpen(false)}
                className="text-gray-400 hover:text-white text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {txFormError && (
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{txFormError}</span>
              </div>
            )}

            <form onSubmit={handleSaveTx} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-300 mb-1">
                    İşlem Yapılacak Hesap *
                  </label>
                  <select
                    value={txFormData.accountId || selectedAccountIdForTx}
                    onChange={(e) => setTxFormData({ ...txFormData, accountId: e.target.value })}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-white focus:border-orange-500 focus:outline-none"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-gray-300 mb-1">
                    Tarih *
                  </label>
                  <input
                    type="date"
                    required
                    value={txFormData.date}
                    onChange={(e) => setTxFormData({ ...txFormData, date: e.target.value })}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-white focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-300 mb-1">
                    Tutar (TL) *
                  </label>
                  <SmartMoneyInput
                    value={txFormData.amount}
                    onChange={(val) => setTxFormData({ ...txFormData, amount: val.toString() })}
                    placeholder="0,00"
                    className="px-3 py-2 text-base font-bold text-white focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-300 mb-1">
                    Kategori
                  </label>
                  <input
                    type="text"
                    value={txFormData.category}
                    onChange={(e) => setTxFormData({ ...txFormData, category: e.target.value })}
                    placeholder="Örn: Sermaye, Devir, Avans..."
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-white focus:border-orange-500 focus:outline-none font-sans"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-300 mb-1">
                  Açıklama *
                </label>
                <input
                  type="text"
                  required
                  placeholder="İşlem nedeni ve detayı..."
                  value={txFormData.description}
                  onChange={(e) => setTxFormData({ ...txFormData, description: e.target.value })}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-white focus:border-orange-500 focus:outline-none font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-300 mb-1">
                    Makbuz / Dekont No
                  </label>
                  <input
                    type="text"
                    placeholder="Örn: DKT-104"
                    value={txFormData.receiptNo}
                    onChange={(e) => setTxFormData({ ...txFormData, receiptNo: e.target.value })}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-white focus:border-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-300 mb-1">
                    İşlemi Yapan
                  </label>
                  <input
                    type="text"
                    value={txFormData.enteredBy}
                    onChange={(e) => setTxFormData({ ...txFormData, enteredBy: e.target.value })}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-white focus:border-orange-500 focus:outline-none font-sans"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#30363d]">
                <button
                  type="button"
                  onClick={() => setIsTxModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-gray-300 font-semibold cursor-pointer border border-[#30363d]"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 rounded-lg text-white font-semibold shadow-md cursor-pointer ${
                    txMode === 'deposit' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'
                  }`}
                >
                  {txMode === 'deposit' ? 'Girişi Kaydet' : 'Çıkışı Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Transfer (Virman) Modal */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#161b22] rounded-xl border border-[#30363d] w-full max-w-md p-6 shadow-2xl space-y-4 font-mono">
            <div className="flex items-center justify-between border-b border-[#30363d] pb-3">
              <div>
                <h3 className="font-bold text-white text-base flex items-center space-x-2">
                  <ArrowRightLeft className="w-4 h-4 text-sky-400" />
                  <span>Hesaplar Arası Virman / Transfer</span>
                </h3>
                <span className="text-xs text-gray-400">
                  Bir hesaptan diğer hesaba para aktarın (Örn: Kasadan Bankaya)
                </span>
              </div>
              <button
                onClick={() => setIsTransferModalOpen(false)}
                className="text-gray-400 hover:text-white text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {transferFormError && (
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{transferFormError}</span>
              </div>
            )}

            <form onSubmit={handleSaveTransfer} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-300 mb-1">
                    Kaynak Hesap (Çıkacak) *
                  </label>
                  <select
                    value={transferFormData.fromAccountId}
                    onChange={(e) => setTransferFormData({ ...transferFormData, fromAccountId: e.target.value })}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-white focus:border-orange-500 focus:outline-none"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-gray-300 mb-1">
                    Hedef Hesap (Girecek) *
                  </label>
                  <select
                    value={transferFormData.toAccountId}
                    onChange={(e) => setTransferFormData({ ...transferFormData, toAccountId: e.target.value })}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-white focus:border-orange-500 focus:outline-none"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-300 mb-1">
                    Transfer Tutarı (TL) *
                  </label>
                  <SmartMoneyInput
                    value={transferFormData.amount}
                    onChange={(val) => setTransferFormData({ ...transferFormData, amount: val.toString() })}
                    placeholder="0,00"
                    className="px-3 py-2 text-base font-bold text-sky-400 focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-300 mb-1">
                    Transfer Tarihi *
                  </label>
                  <input
                    type="date"
                    required
                    value={transferFormData.date}
                    onChange={(e) => setTransferFormData({ ...transferFormData, date: e.target.value })}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-white focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-300 mb-1">
                  Açıklama
                </label>
                <input
                  type="text"
                  placeholder="Örn: Kasadan Ziraat Bankası vadesiz hesaba yatırılan nakit"
                  value={transferFormData.description}
                  onChange={(e) => setTransferFormData({ ...transferFormData, description: e.target.value })}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-white focus:border-orange-500 focus:outline-none font-sans"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#30363d]">
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-gray-300 font-semibold cursor-pointer border border-[#30363d]"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold shadow-md cursor-pointer"
                >
                  Transferi Gerçekleştir
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Delete Account */}
      {deleteConfirmAccount && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#161b22] rounded-xl border border-[#30363d] w-full max-w-sm p-5 shadow-2xl space-y-4 font-mono">
            <div className="flex items-center space-x-2.5 text-rose-400">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <h4 className="font-bold text-white text-base">Hesabı Sil</h4>
            </div>
            <p className="text-xs text-gray-300">
              <strong className="text-white">"{deleteConfirmAccount.name}"</strong> hesabını silmek istediğinize emin misiniz?
            </p>
            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#30363d]">
              <button
                type="button"
                onClick={() => setDeleteConfirmAccount(null)}
                className="px-3.5 py-1.5 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-gray-300 text-xs font-semibold cursor-pointer border border-[#30363d]"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteAccount(deleteConfirmAccount.id);
                  showToast(`"${deleteConfirmAccount.name}" hesabı silindi.`);
                  setDeleteConfirmAccount(null);
                }}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow cursor-pointer"
              >
                Evet, Sil
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Delete Transaction */}
      {deleteConfirmTxId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#161b22] rounded-xl border border-[#30363d] w-full max-w-sm p-5 shadow-2xl space-y-4 font-mono">
            <div className="flex items-center space-x-2.5 text-rose-400">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <h4 className="font-bold text-white text-base">Hareketi Sil</h4>
            </div>
            <p className="text-xs text-gray-300">
              Bu hesap hareketini silmek istediğinize emin misiniz?
            </p>
            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#30363d]">
              <button
                type="button"
                onClick={() => setDeleteConfirmTxId(null)}
                className="px-3.5 py-1.5 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-gray-300 text-xs font-semibold cursor-pointer border border-[#30363d]"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteTransaction(deleteConfirmTxId);
                  showToast('Hesap hareketi silindi.');
                  setDeleteConfirmTxId(null);
                }}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow cursor-pointer"
              >
                Evet, Sil
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#161b22] border border-emerald-500/50 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center space-x-2 font-mono text-xs animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
