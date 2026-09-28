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
} from 'lucide-react';
import {
  FinancialAccount,
  AccountTransaction,
  CashExpense,
  MasterSafeState,
  AccountType,
  TabType,
} from '../types';
import { formatCurrency, formatDateTR, parseNumberInput } from '../utils/formatters';
import { calculateAccountBalance, calculateBanknoteTotal } from '../utils/storage';
import { SmartMoneyInput } from './SmartMoneyInput';

interface AccountsViewProps {
  accounts: FinancialAccount[];
  accountTransactions: AccountTransaction[];
  expenses: CashExpense[];
  masterSafe?: MasterSafeState;
  selectedDate: string;
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
  const [accountFilter, setAccountFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'expense' | 'deposit' | 'withdrawal' | 'transfer'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Account form state
  const [accountFormData, setAccountFormData] = useState({
    name: '',
    type: 'bank' as AccountType,
    bankName: '',
    accountNumber: '',
    initialBalance: '',
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
      map.set(acc.id, calculateAccountBalance(acc, expenses, accountTransactions, masterSafe));
    });
    return map;
  }, [accounts, expenses, accountTransactions, masterSafe]);

  // Filter out Ana Kasa from AccountsView (Ana Kasa is exclusively managed in 6. Ana Kasa & Banknot Takibi)
  const bankAccounts = useMemo(() => {
    return accounts.filter((acc) => !acc.isDefault && acc.id !== 'ana-kasa' && acc.type !== 'cash');
  }, [accounts]);

  // Overall aggregate stats for Bank & POS accounts
  const aggregateStats = useMemo(() => {
    let bankAccountsTotal = 0;
    let bankTotalDeposits = 0;
    let bankTotalExpenses = 0;

    bankAccounts.forEach((acc) => {
      const bal = accountBalances.get(acc.id);
      if (bal) {
        bankAccountsTotal += bal.currentBalance;
        bankTotalDeposits += bal.totalDeposits + bal.totalTransfersIn;
        bankTotalExpenses += bal.totalExpenses;
      }
    });

    return {
      bankAccountsTotal,
      bankTotalDeposits,
      bankTotalExpenses,
      bankCount: bankAccounts.filter((a) => a.type === 'bank').length,
      posCount: bankAccounts.filter((a) => a.type === 'pos' || a.type === 'credit_card').length,
    };
  }, [bankAccounts, accountBalances]);

  // Combined unified ledger entries (Transactions + Expenses)
  const unifiedLedger = useMemo(() => {
    interface LedgerItem {
      id: string;
      date: string;
      accountId: string;
      accountName: string;
      type: 'deposit' | 'withdrawal' | 'transfer' | 'expense';
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
      const targetAccount =
        accounts.find((a) => a.id === exp.accountId) ||
        (exp.paidBy === 'Banka'
          ? accounts.find((a) => a.type === 'bank') || accounts[0]
          : accounts.find((a) => a.isDefault || a.id === 'ana-kasa') || accounts[0]);

      items.push({
        id: `exp-${exp.id}`,
        date: exp.date,
        accountId: targetAccount ? targetAccount.id : 'ana-kasa',
        accountName: targetAccount ? targetAccount.name : 'Ana Kasa',
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

    // Filter
    return items
      .filter((item) => {
        if (accountFilter !== 'all' && item.accountId !== accountFilter) return false;
        if (typeFilter !== 'all' && item.type !== typeFilter) return false;
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
  }, [accountTransactions, expenses, accounts, accountFilter, typeFilter, searchQuery]);

  // Handlers for Account Modal
  const handleOpenAddAccount = () => {
    setEditingAccount(null);
    setAccountFormData({
      name: '',
      type: 'bank',
      bankName: '',
      accountNumber: '',
      initialBalance: '',
      color: '#3b82f6',
      notes: '',
    });
    setIsAccountModalOpen(true);
  };

  const handleOpenEditAccount = (acc: FinancialAccount) => {
    setEditingAccount(acc);
    setAccountFormData({
      name: acc.name,
      type: acc.type,
      bankName: acc.bankName || '',
      accountNumber: acc.accountNumber || '',
      initialBalance: acc.initialBalance.toString(),
      color: acc.color || '#3b82f6',
      notes: acc.notes || '',
    });
    setIsAccountModalOpen(true);
  };

  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountFormData.name.trim()) {
      alert('Lütfen geçerli bir hesap adı yazınız.');
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
        color: accountFormData.color,
        notes: accountFormData.notes.trim() || undefined,
        updatedAt: new Date().toISOString(),
      });
    } else {
      onAddAccount({
        name: accountFormData.name.trim(),
        type: accountFormData.type,
        bankName: accountFormData.bankName.trim() || undefined,
        accountNumber: accountFormData.accountNumber.trim() || undefined,
        initialBalance: initBal,
        color: accountFormData.color,
        notes: accountFormData.notes.trim() || undefined,
      });
    }

    setIsAccountModalOpen(false);
  };

  // Handlers for Deposit / Withdrawal
  const handleOpenTxModal = (mode: 'deposit' | 'withdrawal', defaultAccId?: string) => {
    setTxMode(mode);
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
    const amountNum = parseNumberInput(txFormData.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('Lütfen geçerli bir işlem tutarı giriniz.');
      return;
    }
    if (!txFormData.description.trim()) {
      alert('Lütfen işlem açıklamasını yazınız.');
      return;
    }

    const acc = accounts.find((a) => a.id === (txFormData.accountId || selectedAccountIdForTx));
    if (!acc) {
      alert('Lütfen bir hesap seçiniz.');
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

    setIsTxModalOpen(false);
  };

  // Handlers for Transfer (Virman)
  const handleOpenTransferModal = (fromAccId?: string) => {
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
    const amountNum = parseNumberInput(transferFormData.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('Lütfen geçerli bir transfer tutarı giriniz.');
      return;
    }
    if (transferFormData.fromAccountId === transferFormData.toAccountId) {
      alert('Kaynak hesap ile hedef hesap aynı olamaz. Lütfen farklı iki hesap seçiniz.');
      return;
    }

    const fromAcc = accounts.find((a) => a.id === transferFormData.fromAccountId);
    const toAcc = accounts.find((a) => a.id === transferFormData.toAccountId);

    if (!fromAcc || !toAcc) {
      alert('Lütfen hem kaynak hem de hedef hesabı seçiniz.');
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

      {/* Accounts Grid (Cards for Each Bank & POS Account Showing Remaining Balance) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
            <span>Açık Banka & POS Hesapları ve Kalan Bakiyeleri</span>
            <span className="text-xs text-gray-400 font-normal">
              (Gider girildiğinde seçilen hesaptan düşülür)
            </span>
          </h3>
          <span className="text-xs text-gray-400 font-mono">
            {bankAccounts.length} Hesap Listeleniyor
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bankAccounts.map((acc) => {
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
                              VARSAYILAN
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
                          onClick={() => {
                            if (window.confirm(`"${acc.name}" hesabını silmek istediğinize emin misiniz?`)) {
                              onDeleteAccount(acc.id);
                            }
                          }}
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
                      <span className="text-gray-400 block text-[10px]">Başlangıç Bakiyesi:</span>
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
        </div>
      </div>

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
                        {isExp && (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-semibold">
                            <Receipt className="w-3 h-3" />
                            <span>Gider Çıkışı</span>
                          </span>
                        )}
                        {isDep && (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                            <ArrowDownRight className="w-3 h-3" />
                            <span>Para Girişi</span>
                          </span>
                        )}
                        {isWith && (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold">
                            <ArrowUpRight className="w-3 h-3" />
                            <span>Para Çıkışı</span>
                          </span>
                        )}
                        {isTrf && (
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
                        {isDep ? (
                          <span className="text-emerald-400">+{formatCurrency(item.amount)}</span>
                        ) : (
                          <span className="text-rose-400">-{formatCurrency(item.amount)}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {!isExp && item.rawTransactionId ? (
                          <button
                            onClick={() => {
                              if (window.confirm('Bu hareketi silmek istediğinize emin misiniz?')) {
                                onDeleteTransaction(item.rawTransactionId!);
                              }
                            }}
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
                  Kasa, banka veya POS hesabı tanımlayın
                </span>
              </div>
              <button
                onClick={() => setIsAccountModalOpen(false)}
                className="text-gray-400 hover:text-white text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

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
                  onChange={(e) => setAccountFormData({ ...accountFormData, name: e.target.value })}
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
                    onChange={(e) => setAccountFormData({ ...accountFormData, type: e.target.value as AccountType })}
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
                    Başlangıç Bakiyesi (TL)
                  </label>
                  <SmartMoneyInput
                    value={accountFormData.initialBalance}
                    onChange={(val) => setAccountFormData({ ...accountFormData, initialBalance: val.toString() })}
                    placeholder="0,00"
                    className="px-3 py-2 text-sm font-bold text-emerald-400 focus:border-orange-500"
                  />
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
    </div>
  );
};
