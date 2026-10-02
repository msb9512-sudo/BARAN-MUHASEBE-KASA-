import React, { useState } from 'react';
import {
  Receipt,
  Plus,
  Search,
  Filter,
  FileSpreadsheet,
  Trash2,
  Edit2,
  Calendar,
  User,
  CheckCircle2,
  DollarSign,
  Tag,
  CreditCard,
  Wallet,
} from 'lucide-react';
import { CashExpense, ExpenseCategory, FinancialAccount, ExpensePaymentMethod } from '../types';
import { formatCurrency, formatDateTR, parseNumberInput } from '../utils/formatters';
import { exportExpensesToExcel } from '../utils/excelExport';
import { calculateAccountBalance, DEFAULT_ACCOUNTS } from '../utils/storage';
import { isCreditCardExpenseMethod, isCashExpenseMethod } from '../utils/calculations';
import { SmartMoneyInput } from './SmartMoneyInput';
import { CashierStepFooter } from './CashierStepFooter';
import { TabType } from '../types';

interface CashExpensesViewProps {
  selectedDate: string;
  expenses: CashExpense[];
  categories: ExpenseCategory[];
  accounts?: FinancialAccount[];
  onAddExpense: (expense: Omit<CashExpense, 'id' | 'createdAt'>) => void;
  onUpdateExpense: (expense: CashExpense) => void;
  onDeleteExpense: (id: string) => void;
  onNavigate?: (tab: TabType) => void;
}

export const CashExpensesView: React.FC<CashExpensesViewProps> = ({
  selectedDate,
  expenses,
  categories,
  accounts = DEFAULT_ACCOUNTS,
  onAddExpense,
  onUpdateExpense,
  onDeleteExpense,
  onNavigate,
}) => {
  const [filterDateMode, setFilterDateMode] = useState<'selected-date' | 'all-month'>('selected-date');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [accountFilter, setAccountFilter] = useState('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<CashExpense | null>(null);
  const [isCustomCategoryMode, setIsCustomCategoryMode] = useState(false);

  const defaultAccount = accounts.find((a) => a.isDefault) || accounts[0] || DEFAULT_ACCOUNTS[0];

  const [formData, setFormData] = useState({
    date: selectedDate,
    category: '',
    description: '',
    amount: '',
    paidBy: 'Kasa' as ExpensePaymentMethod,
    accountId: defaultAccount?.id || 'ana-kasa',
    accountName: defaultAccount?.name || 'Ana Kasa (Nakit)',
    receiptNo: '',
    enteredBy: 'Kasa Sorumlusu',
    notes: '',
  });

  // Extract all available unique categories from props + existing expenses
  const availableCategories = Array.from(
    new Set([
      ...categories.map((c) => c.name),
      ...expenses.map((e) => e.category).filter(Boolean),
    ])
  );

  // Base expenses filtered by date, category, account, and search (WITHOUT source filter)
  const baseExpensesForPeriod = expenses.filter((exp) => {
    if (!exp.isActive) return false;

    // Date filtering
    if (filterDateMode === 'selected-date') {
      if (exp.date !== selectedDate) return false;
    } else {
      const currentMonth = selectedDate.slice(0, 7);
      if (!exp.date.startsWith(currentMonth)) return false;
    }

    // Category
    if (categoryFilter !== 'all' && exp.category !== categoryFilter) return false;

    // Account
    if (accountFilter !== 'all') {
      const expAccId = exp.accountId || (isCreditCardExpenseMethod(exp.paidBy) ? accounts.find((a) => a.type === 'bank' || a.type === 'credit_card')?.id : defaultAccount?.id);
      if (expAccId !== accountFilter) return false;
    }

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchDesc = exp.description.toLowerCase().includes(q);
      const matchCat = exp.category.toLowerCase().includes(q);
      const matchReceipt = exp.receiptNo?.toLowerCase().includes(q);
      const matchUser = exp.enteredBy.toLowerCase().includes(q);
      const matchAcc = exp.accountName?.toLowerCase().includes(q);
      if (!matchDesc && !matchCat && !matchReceipt && !matchUser && !matchAcc) return false;
    }

    return true;
  });

  // 1. Kasadan Çıkan Nakit: SADECE kasadaki elden nakit mevcudundan ödenenler
  const cashOnlyExpenses = baseExpensesForPeriod.filter((e) => isCashExpenseMethod(e.paidBy));
  const cashOnlyAmount = cashOnlyExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  // 2. Kredi & Kart Giderleri: Banka Kartı ve Kredi Kartı ile yapılan harcamalar (KASADAN DÜŞMEZ!)
  const creditCardOnlyExpenses = baseExpensesForPeriod.filter((e) => isCreditCardExpenseMethod(e.paidBy));
  const creditCardOnlyAmount = creditCardOnlyExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  // 3. Toplam Dönem Gideri (Tüm Kaynaklar)
  const totalPeriodAmount = baseExpensesForPeriod.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  // Filtered expenses for the table (applying sourceFilter)
  const filteredExpenses = baseExpensesForPeriod.filter((exp) => {
    if (sourceFilter === 'all') return true;
    if (sourceFilter === 'Kasa') return isCashExpenseMethod(exp.paidBy);
    if (sourceFilter === 'kredi_giderleri') return isCreditCardExpenseMethod(exp.paidBy);
    if (sourceFilter === 'Banka') return exp.paidBy === 'Banka';
    if (sourceFilter === 'Cepte/Şahsi') return exp.paidBy === 'Cepte/Şahsi';
    return exp.paidBy === sourceFilter;
  });

  const totalFilteredAmount = filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const handleOpenAdd = () => {
    const defaultAcc = accounts.find((a) => a.isDefault) || accounts[0] || DEFAULT_ACCOUNTS[0];
    setEditingExpense(null);
    setIsCustomCategoryMode(categories.length === 0);
    setFormData({
      date: selectedDate,
      category: categories[0]?.name || '',
      description: '',
      amount: '',
      paidBy: 'Kasa',
      accountId: defaultAcc?.id || 'ana-kasa',
      accountName: defaultAcc?.name || 'Ana Kasa (Nakit)',
      receiptNo: '',
      enteredBy: 'Kasa Sorumlusu',
      notes: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (exp: CashExpense) => {
    const matchingAcc =
      accounts.find((a) => a.id === exp.accountId) ||
      (exp.paidBy === 'Banka'
        ? accounts.find((a) => a.type === 'bank') || accounts[0]
        : exp.paidBy === 'Kredi Kartı'
        ? accounts.find((a) => a.type === 'credit_card' || a.type === 'bank') || accounts[0]
        : exp.paidBy === 'Banka Kartı'
        ? accounts.find((a) => a.type === 'bank') || accounts[0]
        : accounts.find((a) => a.isDefault || a.id === 'ana-kasa') || accounts[0]);

    setEditingExpense(exp);
    const existsInList = categories.some((c) => c.name === exp.category);
    setIsCustomCategoryMode(!existsInList && !!exp.category);
    setFormData({
      date: exp.date,
      category: exp.category || '',
      description: exp.description,
      amount: exp.amount.toString(),
      paidBy: exp.paidBy,
      accountId: exp.accountId || matchingAcc?.id || 'ana-kasa',
      accountName: exp.accountName || matchingAcc?.name || 'Ana Kasa',
      receiptNo: exp.receiptNo || '',
      enteredBy: exp.enteredBy,
      notes: exp.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseNumberInput(formData.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('Lütfen geçerli bir harcama tutarı giriniz.');
      return;
    }

    if (!formData.description.trim()) {
      alert('Lütfen gider açıklamasını yazınız.');
      return;
    }

    const chosenAcc = accounts.find((a) => a.id === formData.accountId);
    const finalAccountName = chosenAcc ? chosenAcc.name : formData.accountName;

    if (editingExpense) {
      onUpdateExpense({
        ...editingExpense,
        date: formData.date,
        category: formData.category,
        description: formData.description.trim(),
        amount: amountNum,
        paidBy: formData.paidBy,
        accountId: formData.accountId,
        accountName: finalAccountName,
        receiptNo: formData.receiptNo.trim() || undefined,
        enteredBy: formData.enteredBy.trim() || 'Kullanıcı',
        notes: formData.notes.trim() || undefined,
      });
    } else {
      onAddExpense({
        date: formData.date,
        category: formData.category,
        description: formData.description.trim(),
        amount: amountNum,
        paidBy: formData.paidBy,
        accountId: formData.accountId,
        accountName: finalAccountName,
        receiptNo: formData.receiptNo.trim() || undefined,
        enteredBy: formData.enteredBy.trim() || 'Kullanıcı',
        notes: formData.notes.trim() || undefined,
        isActive: true,
      });
    }

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#161b22] p-5 rounded-xl border border-[#30363d] shadow-lg">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-orange-500 uppercase tracking-wider mb-1 font-mono">
            <Receipt className="w-4 h-4" />
            <span>GİDER & HARCAMA YÖNETİMİ</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Kasa ve İşletme Giderleri
          </h2>
          <p className="text-xs text-gray-400 font-mono mt-0.5">
            Manav, market, personel avans, tamirat ve günlük kasa harcamaları takibi
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => exportExpensesToExcel(expenses)}
            className="flex items-center space-x-1.5 bg-[#21262d] hover:bg-[#30363d] text-gray-200 text-xs font-semibold px-3 py-2 rounded-lg border border-[#30363d] transition cursor-pointer font-mono"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Excel'e Aktar</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex items-center space-x-1.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-md transition cursor-pointer font-mono"
          >
            <Plus className="w-4 h-4" />
            <span>+ Yeni Gider Ekle</span>
          </button>
        </div>
      </div>

      {/* Stats row with dedicated "KREDİ GİDERLERİ" box */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Kutu 1: Kasadan Çıkan Nakit Gider */}
        <div
          onClick={() => setSourceFilter(sourceFilter === 'Kasa' ? 'all' : 'Kasa')}
          className={`p-4 rounded-xl border font-mono shadow-sm flex flex-col justify-between transition cursor-pointer group ${
            sourceFilter === 'Kasa'
              ? 'border-rose-400 ring-2 ring-rose-400/50 bg-rose-500/10'
              : 'bg-[#161b22] border-rose-500/30 hover:border-rose-400 hover:bg-[#1f1924]'
          }`}
          title="Tıklayarak sadece Kasadan Nakit ödenen harcamaları listeleyin"
        >
          <div>
            <div className="flex items-center justify-between text-xs text-gray-400 font-semibold uppercase">
              <span className="flex items-center gap-1.5 text-rose-300 font-bold">
                <Wallet className="w-4 h-4 text-rose-400" />
                <span>KASADAN ÇIKAN NAKİT GİDER</span>
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold">
                KASADAN DÜŞER
              </span>
            </div>
            <div className="text-2xl font-bold text-rose-400 mt-2 flex items-center justify-between">
              <span>{formatCurrency(cashOnlyAmount)}</span>
              <span className="text-[10px] text-rose-300/80 font-normal">
                {cashOnlyExpenses.length} Harcama {sourceFilter === 'Kasa' ? '• [Filtre Aktif]' : ''}
              </span>
            </div>
          </div>
          <span className="text-[11px] text-gray-400 mt-2 block pt-2 border-t border-[#21262d]">
            Fiziki kasadan elden ödenen harcamalar
          </span>
        </div>

        {/* Kutu 2: KREDİ & KART GİDERLERİ (YENİ AYRI KUTUCUK) */}
        <div
          onClick={() => setSourceFilter(sourceFilter === 'kredi_giderleri' ? 'all' : 'kredi_giderleri')}
          className={`p-4 rounded-xl border font-mono shadow-sm flex flex-col justify-between transition cursor-pointer group ${
            sourceFilter === 'kredi_giderleri'
              ? 'border-sky-400 ring-2 ring-sky-400/50 bg-sky-500/15'
              : 'bg-[#161b22] border-sky-500/40 hover:border-sky-400 hover:bg-[#162233]'
          }`}
          title="Tıklayarak sadece Kredi Kartı & Banka Kartı ile yapılan harcamaları listeleyin"
        >
          <div>
            <div className="flex items-center justify-between text-xs text-gray-400 font-semibold uppercase">
              <span className="text-sky-300 font-bold flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-sky-400" />
                <span>KREDİ GİDERLERİ</span>
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/25 text-sky-300 border border-sky-500/40 font-bold tracking-wide">
                KASADAN DÜŞMEZ!
              </span>
            </div>
            <div className="text-2xl font-bold text-sky-400 mt-2 flex items-center justify-between">
              <span>{formatCurrency(creditCardOnlyAmount)}</span>
              <span className="text-[10px] text-sky-300/80 font-normal">
                {creditCardOnlyExpenses.length} Harcama {sourceFilter === 'kredi_giderleri' ? '• [Filtre Aktif]' : ''}
              </span>
            </div>
          </div>
          <span className="text-[11px] text-gray-400 mt-2 block pt-2 border-t border-[#21262d]">
            Banka & Kredi Kartı ile yapılan harcamalar
          </span>
        </div>

        {/* Kutu 3: Toplam Gider (Tüm Kaynaklar) */}
        <div
          onClick={() => setSourceFilter('all')}
          className={`p-4 rounded-xl border font-mono shadow-sm flex flex-col justify-between transition cursor-pointer group ${
            sourceFilter === 'all'
              ? 'bg-[#161b22] border-orange-500/50'
              : 'bg-[#161b22] border-[#30363d] hover:border-gray-500'
          }`}
          title="Tüm harcamaları listelemek için tıklayın"
        >
          <div>
            <div className="flex items-center justify-between text-xs text-gray-400 font-semibold uppercase">
              <span className="text-gray-300 font-bold">TOPLAM GİDER (TÜMÜ)</span>
              <span className="text-[10px] text-gray-400 px-1.5 py-0.5 rounded bg-[#21262d] border border-[#30363d]">
                {baseExpensesForPeriod.length} Harcama
              </span>
            </div>
            <div className="text-2xl font-bold text-white mt-2 flex items-center justify-between">
              <span>{formatCurrency(totalPeriodAmount)}</span>
              <span className="text-[10px] text-gray-400">
                {sourceFilter !== 'all' ? 'Tümünü Göster' : ''}
              </span>
            </div>
          </div>
          <span className="text-[11px] text-gray-400 mt-2 block pt-2 border-t border-[#21262d]">
            Nakit + Kredi Kartı + Banka harcamaları
          </span>
        </div>

        {/* Kutu 4: Görüntülenen Dönem */}
        <div className="bg-[#161b22] p-4 rounded-xl border border-[#30363d] font-mono flex flex-col justify-between shadow-sm">
          <span className="text-xs text-gray-400 font-semibold uppercase">GÖRÜNTÜLENEN DÖNEM</span>
          <div className="flex items-center space-x-2 mt-2">
            <button
              onClick={() => setFilterDateMode('selected-date')}
              className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer flex-1 ${
                filterDateMode === 'selected-date'
                  ? 'bg-orange-600 text-white'
                  : 'bg-[#21262d] text-gray-300 border border-[#30363d] hover:bg-[#30363d]'
              }`}
            >
              Sadece {formatDateTR(selectedDate)}
            </button>
            <button
              onClick={() => setFilterDateMode('all-month')}
              className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer flex-1 ${
                filterDateMode === 'all-month'
                  ? 'bg-orange-600 text-white'
                  : 'bg-[#21262d] text-gray-300 border border-[#30363d] hover:bg-[#30363d]'
              }`}
            >
              Tüm Ay
            </button>
          </div>
          <span className="text-[11px] text-gray-400 mt-2 block pt-2 border-t border-[#21262d]">
            {filterDateMode === 'selected-date' ? 'Seçili günün kayıtları' : 'Bu ayın tüm giderleri'}
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#161b22] p-4 rounded-xl border border-[#30363d] flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-lg font-mono">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Açıklama, kategori, fiş no veya giren kişi ara..."
            className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg pl-9 pr-4 py-2 text-xs text-white focus:border-orange-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Account Filter */}
          <select
            value={accountFilter}
            onChange={(e) => setAccountFilter(e.target.value)}
            className="bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-xs text-gray-200 focus:border-orange-500 focus:outline-none"
          >
            <option value="all">Tüm Hesaplar</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name}
              </option>
            ))}
          </select>

          {/* Category Dropdown */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-xs text-gray-200 focus:border-orange-500 focus:outline-none"
          >
            <option value="all">
              Tüm Kategoriler{availableCategories.length > 0 ? ` (${availableCategories.length})` : ''}
            </option>
            {availableCategories.map((catName) => (
              <option key={catName} value={catName}>
                {catName}
              </option>
            ))}
          </select>

          {/* Source Dropdown */}
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-xs text-gray-200 focus:border-orange-500 focus:outline-none"
          >
            <option value="all">Tüm Ödeme Kaynakları</option>
            <option value="Kasa">💵 Sadece Kasadan Nakit</option>
            <option value="kredi_giderleri">💳 Sadece Kredi & Banka Kartı</option>
            <option value="Banka">🏦 Sadece Banka (Havale/EFT)</option>
            <option value="Cepte/Şahsi">👤 Şahsi / Cep</option>
          </select>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-[#161b22] rounded-xl border border-[#30363d] overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0d1117] text-gray-400 font-mono font-semibold border-b border-[#30363d]">
              <tr>
                <th className="py-3 px-4">Tarih</th>
                <th className="py-3 px-4">Kategori</th>
                <th className="py-3 px-4">Açıklama</th>
                <th className="py-3 px-4">Ödenen Hesap / Kaynak</th>
                <th className="py-3 px-4">Fiş / Belge No</th>
                <th className="py-3 px-4">Giriş Yapan</th>
                <th className="py-3 px-4 text-right">Tutar</th>
                <th className="py-3 px-4 text-center">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#21262d] font-mono">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-500">
                    Seçilen kriterlere uygun gider kaydı bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => (
                  <tr
                    key={exp.id}
                    className="hover:bg-[#21262d] transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-medium text-gray-300 whitespace-nowrap">
                      {formatDateTR(exp.date)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-0.5 rounded bg-orange-500/10 border border-orange-500/20 text-orange-400 font-semibold text-[10px] uppercase whitespace-nowrap">
                        {exp.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-gray-200 max-w-xs font-sans">
                      {exp.description}
                      {exp.notes && (
                        <p className="text-[11px] text-gray-400 mt-0.5 font-mono">{exp.notes}</p>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-1 items-start">
                        {isCreditCardExpenseMethod(exp.paidBy) ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[10px] font-bold">
                            <CreditCard className="w-3 h-3 text-sky-400" />
                            <span>{exp.paidBy}</span>
                            <span className="text-[9px] bg-sky-500/30 px-1 py-0.2 rounded text-sky-200">KASADAN DÜŞMEZ</span>
                          </span>
                        ) : isCashExpenseMethod(exp.paidBy) ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold">
                            <Wallet className="w-3 h-3 text-rose-400" />
                            <span>Nakit Kasa</span>
                            <span className="text-[9px] bg-rose-500/30 px-1 py-0.2 rounded text-rose-200">KASADAN DÜŞER</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold">
                            <span>{exp.paidBy}</span>
                            <span className="text-[9px] bg-purple-500/30 px-1 py-0.2 rounded text-purple-200">KASADAN DÜŞMEZ</span>
                          </span>
                        )}
                        <span className="text-[11px] text-gray-300 font-semibold px-1">
                          {exp.accountName || (exp.paidBy === 'Banka' ? 'Banka Hesabı' : isCreditCardExpenseMethod(exp.paidBy) ? 'Banka / Kart Hesabı' : 'Ana Kasa (Nakit)')}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-gray-400">
                      {exp.receiptNo || '-'}
                    </td>
                    <td className="py-3 px-4 text-gray-400 font-sans">
                      {exp.enteredBy}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex flex-col items-end">
                        <span className={`text-sm font-mono font-bold ${
                          isCreditCardExpenseMethod(exp.paidBy) ? 'text-sky-400' : 'text-rose-400'
                        }`}>
                          -{formatCurrency(exp.amount)}
                        </span>
                        <span className="text-[9px] font-mono text-gray-400">
                          {isCreditCardExpenseMethod(exp.paidBy) ? '💳 Kredi Gideri' : '💵 Kasa Nakiti'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center space-x-1.5">
                        <button
                          onClick={() => handleOpenEdit(exp)}
                          className="p-1.5 hover:bg-[#30363d] text-gray-400 hover:text-orange-400 rounded transition cursor-pointer"
                          title="Düzenle"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm('Bu gider kaydını silmek istediğinize emin misiniz?')) {
                              onDeleteExpense(exp.id);
                            }
                          }}
                          className="p-1.5 hover:bg-[#30363d] text-gray-400 hover:text-rose-400 rounded transition cursor-pointer"
                          title="Sil"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#161b22] rounded-xl border border-[#30363d] w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#30363d] pb-3">
              <h3 className="font-bold text-white text-base font-mono">
                {editingExpense ? 'Gider Kaydını Düzenle' : 'Yeni Kasa / İşletme Gideri Ekle'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs font-mono">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-300 mb-1">
                    Gider Tarihi *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-white focus:border-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-semibold text-gray-300">
                      Kategori *
                    </label>
                    {categories.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomCategoryMode(!isCustomCategoryMode);
                          if (!isCustomCategoryMode) {
                            setFormData({ ...formData, category: '' });
                          } else {
                            setFormData({ ...formData, category: categories[0]?.name || '' });
                          }
                        }}
                        className="text-[10px] text-orange-400 hover:text-orange-300 underline cursor-pointer"
                      >
                        {isCustomCategoryMode ? 'Listeden Seç' : '+ Yeni Kategori Yaz'}
                      </button>
                    )}
                  </div>

                  {isCustomCategoryMode || categories.length === 0 ? (
                    <input
                      type="text"
                      required
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      placeholder="Kategori Adı (Örn: Sebze, Personel, Sarf...)"
                      className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-white focus:border-orange-500 focus:outline-none"
                    />
                  ) : (
                    <select
                      value={formData.category}
                      onChange={(e) => {
                        if (e.target.value === '__NEW__') {
                          setIsCustomCategoryMode(true);
                          setFormData({ ...formData, category: '' });
                        } else {
                          setFormData({ ...formData, category: e.target.value });
                        }
                      }}
                      className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-gray-200 focus:border-orange-500 focus:outline-none"
                    >
                      <option value="">-- Kategori Seçin --</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                      <option value="__NEW__">+ Yeni Kategori Yaz...</option>
                    </select>
                  )}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-300 mb-1">
                  Açıklama (Ne için harcandı?) *
                </label>
                <input
                  type="text"
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Örn: Hasan Manav eksik maydanoz, limon ve patates alımı"
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-white focus:border-orange-500 focus:outline-none font-sans"
                />
              </div>

              {/* Ödeme Yöntemi / Harcama Şekli */}
              <div>
                <label className="block font-semibold text-gray-300 mb-1.5 flex items-center justify-between">
                  <span>Ödeme Şekli / Kaynağı *</span>
                  {isCreditCardExpenseMethod(formData.paidBy) ? (
                    <span className="text-[10px] text-sky-400 font-bold bg-sky-500/15 px-2 py-0.5 rounded border border-sky-500/30">
                      ⚡ Kredi Gideri - Kasadan Düşmez
                    </span>
                  ) : isCashExpenseMethod(formData.paidBy) ? (
                    <span className="text-[10px] text-rose-400 font-bold bg-rose-500/15 px-2 py-0.5 rounded border border-rose-500/30">
                      💵 Nakit - Kasadan Düşer
                    </span>
                  ) : (
                    <span className="text-[10px] text-purple-400 font-bold bg-purple-500/15 px-2 py-0.5 rounded border border-purple-500/30">
                      🏦 Banka / Diğer - Kasadan Düşmez
                    </span>
                  )}
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const cashAcc = accounts.find((a) => a.type === 'cash' || a.id === 'ana-kasa') || accounts[0];
                      setFormData({
                        ...formData,
                        paidBy: 'Kasa',
                        accountId: cashAcc ? cashAcc.id : 'ana-kasa',
                        accountName: cashAcc ? cashAcc.name : 'Ana Kasa (Nakit)',
                      });
                    }}
                    className={`p-2.5 rounded-lg border text-left flex flex-col justify-between transition cursor-pointer ${
                      formData.paidBy === 'Kasa'
                        ? 'bg-rose-500/20 border-rose-400 text-rose-300 ring-1 ring-rose-400'
                        : 'bg-[#0d1117] border-[#30363d] text-gray-400 hover:border-gray-500'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5 font-bold text-xs text-white">
                      <Wallet className="w-3.5 h-3.5 text-rose-400" />
                      <span>Nakit Kasa</span>
                    </div>
                    <span className="text-[10px] text-rose-400/90 mt-1 font-semibold">
                      Kasadan Düşer
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const bankAcc = accounts.find((a) => a.type === 'bank' || a.type === 'credit_card') || accounts[0];
                      setFormData({
                        ...formData,
                        paidBy: 'Banka Kartı',
                        accountId: bankAcc ? bankAcc.id : formData.accountId,
                        accountName: bankAcc ? bankAcc.name : formData.accountName,
                      });
                    }}
                    className={`p-2.5 rounded-lg border text-left flex flex-col justify-between transition cursor-pointer ${
                      formData.paidBy === 'Banka Kartı'
                        ? 'bg-sky-500/20 border-sky-400 text-sky-300 ring-1 ring-sky-400'
                        : 'bg-[#0d1117] border-[#30363d] text-gray-400 hover:border-gray-500'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5 font-bold text-xs text-white">
                      <CreditCard className="w-3.5 h-3.5 text-sky-400" />
                      <span>Banka Kartı</span>
                    </div>
                    <span className="text-[10px] text-sky-400 mt-1 font-semibold">
                      Kasadan Düşmez!
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const ccAcc = accounts.find((a) => a.type === 'credit_card' || a.type === 'bank') || accounts[0];
                      setFormData({
                        ...formData,
                        paidBy: 'Kredi Kartı',
                        accountId: ccAcc ? ccAcc.id : formData.accountId,
                        accountName: ccAcc ? ccAcc.name : formData.accountName,
                      });
                    }}
                    className={`p-2.5 rounded-lg border text-left flex flex-col justify-between transition cursor-pointer ${
                      formData.paidBy === 'Kredi Kartı'
                        ? 'bg-sky-500/20 border-sky-400 text-sky-300 ring-1 ring-sky-400'
                        : 'bg-[#0d1117] border-[#30363d] text-gray-400 hover:border-gray-500'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5 font-bold text-xs text-white">
                      <CreditCard className="w-3.5 h-3.5 text-sky-400" />
                      <span>Kredi Kartı</span>
                    </div>
                    <span className="text-[10px] text-sky-400 mt-1 font-semibold">
                      Kasadan Düşmez!
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const bankAcc = accounts.find((a) => a.type === 'bank') || accounts[0];
                      setFormData({
                        ...formData,
                        paidBy: 'Banka',
                        accountId: bankAcc ? bankAcc.id : formData.accountId,
                        accountName: bankAcc ? bankAcc.name : formData.accountName,
                      });
                    }}
                    className={`p-2 rounded-lg border text-left flex items-center justify-between transition cursor-pointer ${
                      formData.paidBy === 'Banka'
                        ? 'bg-purple-500/20 border-purple-400 text-purple-300 ring-1 ring-purple-400'
                        : 'bg-[#0d1117] border-[#30363d] text-gray-400 hover:border-gray-500'
                    }`}
                  >
                    <span className="font-semibold text-xs text-gray-200">🏦 Banka (Havale/EFT)</span>
                    <span className="text-[9px] text-gray-400">Kasadan Düşmez</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        paidBy: 'Cepte/Şahsi',
                      });
                    }}
                    className={`p-2 rounded-lg border text-left flex items-center justify-between transition cursor-pointer sm:col-span-2 ${
                      formData.paidBy === 'Cepte/Şahsi'
                        ? 'bg-gray-700/50 border-gray-400 text-white ring-1 ring-gray-400'
                        : 'bg-[#0d1117] border-[#30363d] text-gray-400 hover:border-gray-500'
                    }`}
                  >
                    <span className="font-semibold text-xs text-gray-200">👤 Cepte / Şahsi Ödeme</span>
                    <span className="text-[9px] text-gray-400">Kasadan Düşmez</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-300 mb-1">
                    Tutar (TL) *
                  </label>
                  <SmartMoneyInput
                    value={formData.amount}
                    onChange={(val) => setFormData({ ...formData, amount: val.toString() })}
                    placeholder="0,00"
                    className="px-3 py-2 text-sm font-bold text-rose-400 focus:border-orange-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-semibold text-gray-300">
                      {isCreditCardExpenseMethod(formData.paidBy)
                        ? 'İşlem Gören Kart / Banka Hesabı'
                        : 'Ödeme Yapılan Hesap / Kasa *'}
                    </label>
                    {onNavigate && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsModalOpen(false);
                          onNavigate('accounts');
                        }}
                        className="text-[10px] text-orange-400 hover:text-orange-300 underline cursor-pointer"
                      >
                        + Yeni Hesap Aç
                      </button>
                    )}
                  </div>
                  <select
                    value={formData.accountId}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      const acc = accounts.find((a) => a.id === selectedId);
                      setFormData({
                        ...formData,
                        accountId: selectedId,
                        accountName: acc ? acc.name : '',
                      });
                    }}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-white font-mono focus:border-orange-500 focus:outline-none"
                  >
                    {accounts.map((acc) => {
                      const bal = calculateAccountBalance(acc, expenses).currentBalance;
                      return (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} — (Kalan: {formatCurrency(bal)})
                        </option>
                      );
                    })}
                  </select>
                  <span className="text-[10px] text-gray-500 mt-1 block">
                    {isCreditCardExpenseMethod(formData.paidBy)
                      ? 'Bu harcama karta yansır, kasadaki nakiti etkilemez.'
                      : 'Gider bu hesaptan düşülür ve kalan para güncellenir.'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-300 mb-1">
                    Fiş / Belge No (Varsa)
                  </label>
                  <input
                    type="text"
                    value={formData.receiptNo}
                    onChange={(e) => setFormData({ ...formData, receiptNo: e.target.value })}
                    placeholder="Örn: FS-8819"
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-white focus:border-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-300 mb-1">
                    Giriş Yapan / Sorumlu
                  </label>
                  <input
                    type="text"
                    value={formData.enteredBy}
                    onChange={(e) => setFormData({ ...formData, enteredBy: e.target.value })}
                    placeholder="Mehmet"
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-white focus:border-orange-500 focus:outline-none font-sans"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-300 mb-1">
                  Ek Not
                </label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="İsteğe bağlı ek açıklama..."
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-white focus:border-orange-500 focus:outline-none font-sans"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#30363d]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-gray-300 font-semibold cursor-pointer border border-[#30363d]"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-semibold shadow-md cursor-pointer"
                >
                  {editingExpense ? 'Güncelle' : 'Gideri Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Sequential Cashier Workflow Navigation Footer */}
      {onNavigate && (
        <CashierStepFooter
          currentTab="expenses"
          onNavigate={onNavigate}
        />
      )}
    </div>
  );
};
