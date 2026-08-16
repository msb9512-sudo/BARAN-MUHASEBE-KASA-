import React, { useState, useMemo } from 'react';
import {
  UserCheck,
  UserPlus,
  Users,
  Search,
  Filter,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Phone,
  Building,
  FileText,
  Trash2,
  Edit2,
  CheckCircle2,
  Clock,
  Printer,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  X,
  CreditCard,
  Wallet,
  Building2,
  Receipt,
  Download,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { OpenAccountCustomer, OpenAccountTransaction, DailyEntry, TabType } from '../types';
import { formatCurrency, formatDateTR } from '../utils/formatters';

interface OpenAccountsViewProps {
  customers: OpenAccountCustomer[];
  transactions: OpenAccountTransaction[];
  onAddCustomer: (customer: OpenAccountCustomer) => void;
  onUpdateCustomer: (customer: OpenAccountCustomer) => void;
  onDeleteCustomer: (customerId: string) => void;
  onAddTransaction: (tx: OpenAccountTransaction) => void;
  onDeleteTransaction: (txId: string) => void;
  selectedDate: string;
  onNavigate?: (tab: TabType) => void;
}

export const OpenAccountsView: React.FC<OpenAccountsViewProps> = ({
  customers = [],
  transactions = [],
  onAddCustomer,
  onUpdateCustomer,
  onDeleteCustomer,
  onAddTransaction,
  onDeleteTransaction,
  selectedDate,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'unpaid' | 'paid'>('all');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const PAGE_SIZE = 10;
  
  // Modals state
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<OpenAccountCustomer | null>(null);
  const [isAddTxModalOpen, setIsAddTxModalOpen] = useState(false);
  const [txModalType, setTxModalType] = useState<'debt' | 'payment'>('payment');
  const [targetCustomerIdForTx, setTargetCustomerIdForTx] = useState<string>('');

  // Form states for customer modal
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerCompany, setCustomerCompany] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');

  // Form states for transaction modal
  const [txAmount, setTxAmount] = useState<number | ''>('');
  const [txDate, setTxDate] = useState<string>(selectedDate || new Date().toISOString().split('T')[0]);
  const [txDescription, setTxDescription] = useState('');
  const [txPaymentMethod, setTxPaymentMethod] = useState<'Nakit' | 'Kredi Kartı / POS' | 'Banka Transferi / EFT' | 'Diğer'>('Nakit');
  const [txReceiptNo, setTxReceiptNo] = useState('');
  const [txNotes, setTxNotes] = useState('');

  // Calculate customer statistics
  const customerStats = useMemo<Record<string, {
    totalDebt: number;
    totalPayment: number;
    balance: number;
    txCount: number;
    lastTxDate?: string;
  }>>(() => {
    const statsMap: Record<
      string,
      {
        totalDebt: number;
        totalPayment: number;
        balance: number;
        txCount: number;
        lastTxDate?: string;
      }
    > = {};

    customers.forEach((c) => {
      statsMap[c.id] = {
        totalDebt: 0,
        totalPayment: 0,
        balance: 0,
        txCount: 0,
      };
    });

    transactions.forEach((tx) => {
      if (!statsMap[tx.customerId]) {
        statsMap[tx.customerId] = {
          totalDebt: 0,
          totalPayment: 0,
          balance: 0,
          txCount: 0,
        };
      }

      if (tx.type === 'debt') {
        statsMap[tx.customerId].totalDebt += Number(tx.amount) || 0;
      } else {
        statsMap[tx.customerId].totalPayment += Number(tx.amount) || 0;
      }

      statsMap[tx.customerId].balance =
        statsMap[tx.customerId].totalDebt - statsMap[tx.customerId].totalPayment;
      statsMap[tx.customerId].txCount += 1;

      if (
        !statsMap[tx.customerId].lastTxDate ||
        tx.date > statsMap[tx.customerId].lastTxDate!
      ) {
        statsMap[tx.customerId].lastTxDate = tx.date;
      }
    });

    return statsMap;
  }, [customers, transactions]);

  // Overall totals
  const totalDebtOverall = useMemo(
    () => transactions.filter((t) => t.type === 'debt').reduce((s, t) => s + (Number(t.amount) || 0), 0),
    [transactions]
  );
  const totalPaymentOverall = useMemo(
    () => transactions.filter((t) => t.type === 'payment').reduce((s, t) => s + (Number(t.amount) || 0), 0),
    [transactions]
  );
  const totalRemainingBalance = totalDebtOverall - totalPaymentOverall;
  const activeDebtorCount = useMemo(
    () => Object.values(customerStats).filter((s: { balance: number }) => s.balance > 0.01).length,
    [customerStats]
  );

  // Filtered and sorted customers
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const stats = customerStats[c.id] || { balance: 0 };
      const matchesSearch =
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.phone && c.phone.includes(searchTerm)) ||
        (c.company && c.company.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.notes && c.notes.toLowerCase().includes(searchTerm.toLowerCase()));

      if (!matchesSearch) return false;

      if (filterType === 'unpaid') return stats.balance > 0.01;
      if (filterType === 'paid') return stats.balance <= 0.01;
      return true;
    }).sort((a, b) => {
      const balA = customerStats[a.id]?.balance || 0;
      const balB = customerStats[b.id]?.balance || 0;
      return balB - balA; // Highest balance first
    });
  }, [customers, customerStats, searchTerm, filterType]);

  // Pagination calculation for customers list
  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedCustomers = useMemo(() => {
    const startIdx = (safeCurrentPage - 1) * PAGE_SIZE;
    return filteredCustomers.slice(startIdx, startIdx + PAGE_SIZE);
  }, [filteredCustomers, safeCurrentPage]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }, [totalPages]);

  // Customer Management Handlers
  const handleOpenAddCustomer = () => {
    setEditingCustomer(null);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerCompany('');
    setCustomerNotes('');
    setIsAddCustomerModalOpen(true);
  };

  const handleOpenEditCustomer = (c: OpenAccountCustomer, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCustomer(c);
    setCustomerName(c.name);
    setCustomerPhone(c.phone || '');
    setCustomerCompany(c.company || '');
    setCustomerNotes(c.notes || '');
    setIsAddCustomerModalOpen(true);
  };

  const handleSaveCustomerForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) return;

    if (editingCustomer) {
      onUpdateCustomer({
        ...editingCustomer,
        name: customerName.trim(),
        phone: customerPhone.trim() || undefined,
        company: customerCompany.trim() || undefined,
        notes: customerNotes.trim() || undefined,
        updatedAt: new Date().toISOString(),
      });
    } else {
      const newCust: OpenAccountCustomer = {
        id: `cust-${Date.now()}`,
        name: customerName.trim(),
        phone: customerPhone.trim() || undefined,
        company: customerCompany.trim() || undefined,
        notes: customerNotes.trim() || undefined,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      onAddCustomer(newCust);
    }

    setIsAddCustomerModalOpen(false);
  };

  // Transaction Management Handlers
  const handleOpenAddTx = (customerId: string, type: 'debt' | 'payment', e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setTargetCustomerIdForTx(customerId);
    setTxModalType(type);
    setTxAmount('');
    setTxDate(selectedDate || new Date().toISOString().split('T')[0]);
    setTxDescription(
      type === 'payment'
        ? 'Açık Hesap Tahsilatı'
        : 'Açık Hesap / Veresiye Satışı'
    );
    setTxPaymentMethod('Nakit');
    setTxReceiptNo('');
    setTxNotes('');
    setIsAddTxModalOpen(true);
  };

  const handleSaveTxForm = (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(txAmount) || 0;
    if (val <= 0 || !targetCustomerIdForTx) return;

    const targetCustomer = customers.find((c) => c.id === targetCustomerIdForTx);
    if (!targetCustomer) return;

    const newTx: OpenAccountTransaction = {
      id: `tx-${Date.now()}`,
      customerId: targetCustomer.id,
      customerName: targetCustomer.name,
      date: txDate,
      type: txModalType,
      amount: val,
      description: txDescription.trim() || (txModalType === 'payment' ? 'Açık Hesap Tahsilatı' : 'Borç Kaydı'),
      paymentMethod: txModalType === 'payment' ? txPaymentMethod : undefined,
      receiptNo: txReceiptNo.trim() || undefined,
      notes: txNotes.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    onAddTransaction(newTx);
    setIsAddTxModalOpen(false);
  };

  // Print Statement for selected customer or all
  const handlePrintStatement = (c?: OpenAccountCustomer) => {
    window.print();
  };

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);
  const selectedCustomerTxs = useMemo(() => {
    if (!selectedCustomerId) return [];
    return transactions
      .filter((t) => t.customerId === selectedCustomerId)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, selectedCustomerId]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#161b22] border border-[#30363d] p-5 sm:p-6 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 bg-orange-500/10 border border-orange-500/30 text-orange-400 rounded-xl shrink-0">
            <UserCheck className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Açık Hesap & Cari Takibi
              </h2>
              <span className="bg-orange-500/20 text-orange-300 text-xs px-2.5 py-0.5 rounded-full font-mono font-semibold border border-orange-500/30">
                {customers.length} Müşteri / Cari
              </span>
            </div>
            <p className="text-xs sm:text-sm text-gray-400 mt-1">
              Vega'dan aktarılan veya manuel eklenen veresiye / açık hesapları, ödemeleri ve kalan bakiyeleri takip edin.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleOpenAddCustomer}
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs transition flex items-center justify-center space-x-2 shadow-lg shadow-orange-500/20 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Yeni Cari / Müşteri Ekle</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 font-mono">
        {/* Card 1: Toplam Kalan Alacak / Bakiye */}
        <div className="p-4 bg-orange-500/10 border-2 border-orange-500/40 rounded-xl shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs text-orange-400 uppercase font-bold tracking-wider">
              Toplam Kalan Alacak (Bakiye)
            </span>
            <span className="text-[11px] bg-orange-500/20 text-orange-300 font-bold px-2 py-0.5 rounded border border-orange-500/30">
              Net Alacak
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-orange-400 mt-2">
            {formatCurrency(totalRemainingBalance)}
          </div>
          <span className="text-xs text-gray-300 block mt-1 font-medium">
            {activeDebtorCount} müşteride bekleyen açık hesap
          </span>
        </div>

        {/* Card 2: Toplam Açılan Borç */}
        <div className="p-4 bg-[#161b22] border border-[#30363d] rounded-xl shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400 uppercase font-semibold block">
              Toplam Açılan Veresiye / Borç
            </span>
            <ArrowUpRight className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-400 mt-2">
            {formatCurrency(totalDebtOverall)}
          </div>
          <span className="text-xs text-gray-400 block mt-1 font-medium">
            {transactions.filter((t) => t.type === 'debt').length} adet açık hesap işlemi
          </span>
        </div>

        {/* Card 3: Toplam Tahsil Edilen */}
        <div className="p-4 bg-[#161b22] border border-[#30363d] rounded-xl shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400 uppercase font-semibold block">
              Toplam Tahsil Edilen Tutar
            </span>
            <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 mt-2">
            {formatCurrency(totalPaymentOverall)}
          </div>
          <span className="text-xs text-gray-400 block mt-1 font-medium">
            {transactions.filter((t) => t.type === 'payment').length} adet ödeme tahsilatı
          </span>
        </div>

        {/* Card 4: Tahsilat Oranı */}
        <div className="p-4 bg-[#161b22] border border-[#30363d] rounded-xl shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400 uppercase font-semibold block">
              Tahsil Edilme Oranı
            </span>
            <CheckCircle2 className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-sky-400 mt-2">
            %{totalDebtOverall > 0 ? ((totalPaymentOverall / totalDebtOverall) * 100).toFixed(1) : '100'}
          </div>
          <span className="text-xs text-gray-400 block mt-1 font-medium">
            {totalRemainingBalance <= 0 ? 'Tüm hesaplar dengeli ✓' : 'Açık bakiye tahsilatları sürüyor'}
          </span>
        </div>
      </div>

      {/* Main Content Layout: Customer List & Detail Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Customer List & Filters (7 cols on lg) */}
        <div className="lg:col-span-7 space-y-3.5">
          {/* Search & Filter Toolbar */}
          <div className="bg-[#161b22] p-3 rounded-xl border border-[#30363d] flex flex-col sm:flex-row items-center justify-between gap-2.5">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Müşteri, telefon veya firma ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#0d1117] border border-[#30363d] focus:border-orange-500 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-gray-500 outline-hidden font-mono"
              />
            </div>

            <div className="flex items-center space-x-1.5 w-full sm:w-auto font-mono text-xs">
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 rounded-lg border transition ${
                  filterType === 'all'
                    ? 'bg-orange-500/20 text-orange-300 border-orange-500/50 font-bold'
                    : 'bg-[#0d1117] text-gray-400 border-[#30363d] hover:text-white'
                }`}
              >
                Tümü ({customers.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('unpaid')}
                className={`px-3 py-1.5 rounded-lg border transition ${
                  filterType === 'unpaid'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 font-bold'
                    : 'bg-[#0d1117] text-gray-400 border-[#30363d] hover:text-white'
                }`}
              >
                Borçlular ({activeDebtorCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('paid')}
                className={`px-3 py-1.5 rounded-lg border transition ${
                  filterType === 'paid'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-bold'
                    : 'bg-[#0d1117] text-gray-400 border-[#30363d] hover:text-white'
                }`}
              >
                Kapalılar
              </button>
            </div>
          </div>

          {/* Customer Cards List */}
          {filteredCustomers.length === 0 ? (
            <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-8 text-center space-y-3 font-mono">
              <div className="p-3 rounded-full bg-orange-500/10 text-orange-400 inline-block">
                <Users className="w-8 h-8" />
              </div>
              <h4 className="text-white font-bold text-sm">Açık Hesap Kaydı Bulunamadı</h4>
              <p className="text-xs text-gray-400 max-w-md mx-auto">
                {searchTerm
                  ? 'Arama kriterlerine uygun müşteri bulunamadı.'
                  : 'Henüz açık hesap müşterisi eklenmemiş. Yukarıdaki "Yeni Cari / Müşteri Ekle" butonuyla veya Vega Z raporunu içe aktarırken açık hesapları bağlayabilirsiniz.'}
              </p>
              <button
                type="button"
                onClick={handleOpenAddCustomer}
                className="mt-2 px-4 py-2 rounded-xl bg-orange-500 text-white text-xs font-bold hover:bg-orange-600 transition inline-flex items-center space-x-1.5"
              >
                <UserPlus className="w-4 h-4" />
                <span>İlk Cari Kartını Oluştur</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {paginatedCustomers.map((c) => {
                const stats = customerStats[c.id] || { totalDebt: 0, totalPayment: 0, balance: 0, txCount: 0 };
                const isSelected = selectedCustomerId === c.id;
                const hasDebt = stats.balance > 0.01;

                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedCustomerId(isSelected ? null : c.id)}
                    className={`bg-[#161b22] p-4 rounded-xl border transition cursor-pointer ${
                      isSelected
                        ? 'border-orange-500 bg-orange-500/5 shadow-md'
                        : hasDebt
                        ? 'border-[#30363d] hover:border-orange-500/40'
                        : 'border-[#30363d]/60 opacity-80 hover:opacity-100'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono">
                      {/* Left: Customer Info */}
                      <div className="flex items-start space-x-3 min-w-0">
                        <div
                          className={`p-2.5 rounded-xl shrink-0 ${
                            hasDebt
                              ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
                              : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          <UserCheck className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-bold text-white text-sm truncate">
                              {c.name}
                            </h4>
                            {c.company && (
                              <span className="text-[11px] bg-[#21262d] text-gray-300 px-2 py-0.5 rounded border border-[#30363d]">
                                {c.company}
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 mt-1">
                            {c.phone && (
                              <span className="flex items-center space-x-1 text-gray-300">
                                <Phone className="w-3 h-3 text-gray-400" />
                                <span>{c.phone}</span>
                              </span>
                            )}
                            <span className="text-gray-400">
                              {stats.txCount} İşlem {stats.lastTxDate ? `• Son: ${stats.lastTxDate}` : ''}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Balance & Quick Action Buttons */}
                      <div className="flex items-center justify-between sm:justify-end space-x-3 border-t sm:border-t-0 pt-2 sm:pt-0 border-[#30363d]">
                        <div className="text-left sm:text-right">
                          <span className="text-[10px] text-gray-400 block uppercase">
                            Kalan Bakiye
                          </span>
                          <span
                            className={`text-base sm:text-lg font-bold block ${
                              hasDebt ? 'text-orange-400' : 'text-emerald-400'
                            }`}
                          >
                            {hasDebt ? formatCurrency(stats.balance) : '0,00 ₺ (Kapalı)'}
                          </span>
                        </div>

                        <div className="flex items-center space-x-1.5">
                          {/* Quick Payment Button */}
                          <button
                            type="button"
                            title="Tahsilat / Ödeme Ekle"
                            onClick={(e) => handleOpenAddTx(c.id, 'payment', e)}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-white text-xs font-bold transition border border-emerald-500/30 flex items-center space-x-1"
                          >
                            <ArrowDownLeft className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Tahsilat</span>
                          </button>

                          {/* Quick Debt Button */}
                          <button
                            type="button"
                            title="Yeni Borç Ekle"
                            onClick={(e) => handleOpenAddTx(c.id, 'debt', e)}
                            className="px-2.5 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white text-xs font-bold transition border border-rose-500/30 flex items-center space-x-1"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Borç</span>
                          </button>

                          {/* Edit Customer */}
                          <button
                            type="button"
                            title="Düzenle"
                            onClick={(e) => handleOpenEditCustomer(c, e)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#21262d] transition"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* 10-Item Pagination Box for Open Accounts View */}
              {totalPages > 1 && (
                <div className="mt-4 p-3 bg-[#161b22] rounded-xl border border-[#30363d] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono">
                  <span className="text-gray-400">
                    Toplam <strong className="text-white">{filteredCustomers.length}</strong> müşteriden{' '}
                    <strong className="text-orange-400">
                      {(safeCurrentPage - 1) * PAGE_SIZE + 1} -{' '}
                      {Math.min(safeCurrentPage * PAGE_SIZE, filteredCustomers.length)}
                    </strong>{' '}
                    arası gösteriliyor
                  </span>

                  <div className="flex items-center space-x-1 bg-[#0d1117] p-1 rounded-lg border border-[#30363d]">
                    <button
                      type="button"
                      disabled={safeCurrentPage === 1}
                      onClick={() => handlePageChange(safeCurrentPage - 1)}
                      className="px-2 py-1 rounded text-gray-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5 inline" />
                    </button>
                    {pageNumbers.map((pageNum) => (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => handlePageChange(pageNum)}
                        className={`min-w-[28px] h-7 px-1.5 rounded text-xs font-bold transition cursor-pointer ${
                          pageNum === safeCurrentPage
                            ? 'bg-orange-600 text-white shadow-xs'
                            : 'text-gray-400 hover:text-white hover:bg-[#21262d]'
                        }`}
                      >
                        {pageNum}
                      </button>
                    ))}
                    <button
                      type="button"
                      disabled={safeCurrentPage === totalPages}
                      onClick={() => handlePageChange(safeCurrentPage + 1)}
                      className="px-2 py-1 rounded text-gray-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                    >
                      <ChevronRight className="w-3.5 h-3.5 inline" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Customer Details & Statement History (5 cols on lg) */}
        <div className="lg:col-span-5 space-y-4">
          {selectedCustomer ? (
            <div className="bg-[#161b22] border border-orange-500/30 rounded-2xl p-5 shadow-xl space-y-4 font-mono">
              {/* Selected Customer Header */}
              <div className="flex items-center justify-between border-b border-[#30363d] pb-3">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 rounded-lg bg-orange-500/20 text-orange-400">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base truncate">
                      {selectedCustomer.name}
                    </h3>
                    <p className="text-xs text-gray-400">
                      Cari Hesap Ekstresi & Hareketleri
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`${selectedCustomer.name} carisini ve tüm hareketlerini silmek istediğinize emin misiniz?`)) {
                        onDeleteCustomer(selectedCustomer.id);
                        setSelectedCustomerId(null);
                      }
                    }}
                    title="Cariyi Sil"
                    className="p-1.5 text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Balance Summary Box */}
              <div className="p-3.5 bg-[#0d1117] rounded-xl border border-[#30363d] grid grid-cols-3 gap-2 text-center">
                <div>
                  <span className="text-[10px] text-gray-400 uppercase block">Toplam Borç</span>
                  <span className="text-sm font-bold text-rose-400">
                    {formatCurrency(customerStats[selectedCustomer.id]?.totalDebt || 0)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 uppercase block">Tahsilat</span>
                  <span className="text-sm font-bold text-emerald-400">
                    {formatCurrency(customerStats[selectedCustomer.id]?.totalPayment || 0)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 uppercase block">Kalan Bakiye</span>
                  <span className="text-sm font-bold text-orange-400">
                    {formatCurrency(customerStats[selectedCustomer.id]?.balance || 0)}
                  </span>
                </div>
              </div>

              {/* Action Buttons for this customer */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenAddTx(selectedCustomer.id, 'payment')}
                  className="p-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs transition flex items-center justify-center space-x-1.5 shadow-md shadow-emerald-500/20"
                >
                  <ArrowDownLeft className="w-4 h-4" />
                  <span>Tahsilat Ekle</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenAddTx(selectedCustomer.id, 'debt')}
                  className="p-2.5 rounded-xl bg-[#21262d] hover:bg-[#30363d] text-gray-200 hover:text-white font-bold text-xs transition flex items-center justify-center space-x-1.5 border border-[#30363d]"
                >
                  <Plus className="w-4 h-4 text-orange-400" />
                  <span>Borç Ekle</span>
                </button>
              </div>

              {/* Transaction History List */}
              <div>
                <div className="flex items-center justify-between text-xs text-gray-400 font-bold uppercase mb-2">
                  <span>Hesap Hareketleri ({selectedCustomerTxs.length})</span>
                </div>

                {selectedCustomerTxs.length === 0 ? (
                  <div className="p-4 bg-[#0d1117] rounded-xl border border-[#30363d] text-center text-xs text-gray-500">
                    Henüz işlem hareketi bulunmuyor.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                    {selectedCustomerTxs.map((tx) => {
                      const isDebt = tx.type === 'debt';
                      return (
                        <div
                          key={tx.id}
                          className="p-3 bg-[#0d1117] rounded-xl border border-[#30363d] flex items-center justify-between text-xs transition hover:border-[#484f58]"
                        >
                          <div className="flex items-center space-x-2.5 min-w-0">
                            <div
                              className={`p-1.5 rounded-lg shrink-0 ${
                                isDebt
                                  ? 'bg-rose-500/20 text-rose-400'
                                  : 'bg-emerald-500/20 text-emerald-400'
                              }`}
                            >
                              {isDebt ? (
                                <ArrowUpRight className="w-3.5 h-3.5" />
                              ) : (
                                <ArrowDownLeft className="w-3.5 h-3.5" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-white truncate">
                                {tx.description || (isDebt ? 'Borç Kaydı' : 'Tahsilat')}
                              </div>
                              <div className="text-[11px] text-gray-400 flex items-center space-x-2 mt-0.5">
                                <span>{tx.date}</span>
                                {tx.paymentMethod && <span>• {tx.paymentMethod}</span>}
                                {tx.notes && <span>• {tx.notes}</span>}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 shrink-0">
                            <span
                              className={`font-bold text-sm ${
                                isDebt ? 'text-rose-400' : 'text-emerald-400'
                              }`}
                            >
                              {isDebt ? '+' : '-'}{formatCurrency(tx.amount)}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm('Bu işlemi silmek istediğinize emin misiniz?')) {
                                  onDeleteTransaction(tx.id);
                                }
                              }}
                              className="text-gray-500 hover:text-rose-400 p-1 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 text-center space-y-3 font-mono">
              <div className="p-3 bg-[#0d1117] rounded-xl text-gray-400 inline-block border border-[#30363d]">
                <FileText className="w-6 h-6" />
              </div>
              <h4 className="text-white font-bold text-sm">Müşteri Detayı & Ekstre</h4>
              <p className="text-xs text-gray-400">
                Hesap hareketlerini, borç ve tahsilat geçmişini görüntülemek için sol taraftaki listeden bir müşteri seçiniz.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Add / Edit Customer */}
      {isAddCustomerModalOpen && (
        <div
          onClick={() => setIsAddCustomerModalOpen(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#161b22] rounded-2xl border border-[#30363d] w-full max-w-md p-5 sm:p-6 shadow-2xl space-y-4 cursor-default font-mono text-xs"
          >
            <div className="flex items-center justify-between border-b border-[#30363d] pb-3">
              <div className="flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-orange-400" />
                <h3 className="font-bold text-white text-base">
                  {editingCustomer ? 'Cari Kartını Düzenle' : 'Yeni Cari / Müşteri Ekle'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddCustomerModalOpen(false)}
                className="text-gray-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomerForm} className="space-y-3">
              <div>
                <label className="block text-gray-300 font-bold mb-1 uppercase">
                  Müşteri / Kişi / Firma Adı *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Ahmet Yılmaz, Av. Mehmet Bey"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] focus:border-orange-500 rounded-xl px-3 py-2 text-white outline-hidden"
                />
              </div>

              <div>
                <label className="block text-gray-300 font-bold mb-1 uppercase">
                  Telefon Numarası
                </label>
                <input
                  type="tel"
                  placeholder="05XX XXX XX XX"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] focus:border-orange-500 rounded-xl px-3 py-2 text-white outline-hidden"
                />
              </div>

              <div>
                <label className="block text-gray-300 font-bold mb-1 uppercase">
                  Firma / Ünvan
                </label>
                <input
                  type="text"
                  placeholder="Örn: ABC Mimarlık Ltd."
                  value={customerCompany}
                  onChange={(e) => setCustomerCompany(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] focus:border-orange-500 rounded-xl px-3 py-2 text-white outline-hidden"
                />
              </div>

              <div>
                <label className="block text-gray-300 font-bold mb-1 uppercase">
                  Notlar
                </label>
                <textarea
                  rows={2}
                  placeholder="Masa tercihleri, özel notlar vb."
                  value={customerNotes}
                  onChange={(e) => setCustomerNotes(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] focus:border-orange-500 rounded-xl px-3 py-2 text-white outline-hidden"
                />
              </div>

              <div className="pt-3 border-t border-[#30363d] flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddCustomerModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#30363d] text-gray-400 hover:text-white"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold transition shadow-md"
                >
                  {editingCustomer ? 'Güncelle' : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Transaction (Debt / Payment) */}
      {isAddTxModalOpen && (
        <div
          onClick={() => setIsAddTxModalOpen(false)}
          className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#161b22] rounded-2xl border border-[#30363d] w-full max-w-md p-5 sm:p-6 shadow-2xl space-y-4 cursor-default font-mono text-xs"
          >
            <div className="flex items-center justify-between border-b border-[#30363d] pb-3">
              <div className="flex items-center space-x-2">
                {txModalType === 'payment' ? (
                  <ArrowDownLeft className="w-5 h-5 text-emerald-400" />
                ) : (
                  <ArrowUpRight className="w-5 h-5 text-rose-400" />
                )}
                <h3 className="font-bold text-white text-base">
                  {txModalType === 'payment' ? 'Açık Hesap Tahsilatı (Ödeme Al)' : 'Yeni Borç / Adisyon Ekle'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddTxModalOpen(false)}
                className="text-gray-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTxForm} className="space-y-3">
              <div>
                <label className="block text-gray-300 font-bold mb-1 uppercase">
                  Müşteri *
                </label>
                <select
                  value={targetCustomerIdForTx}
                  onChange={(e) => setTargetCustomerIdForTx(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] focus:border-orange-500 rounded-xl px-3 py-2 text-white outline-hidden"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.company ? `(${c.company})` : ''} - Bakiye:{' '}
                      {formatCurrency(customerStats[c.id]?.balance || 0)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-gray-300 font-bold mb-1 uppercase">
                    İşlem Tutarı (TL) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="0.00"
                    value={txAmount}
                    onChange={(e) => setTxAmount(e.target.value ? parseFloat(e.target.value) : '')}
                    className={`w-full bg-[#0d1117] border rounded-xl px-3 py-2 font-bold text-sm text-right outline-hidden ${
                      txModalType === 'payment'
                        ? 'border-emerald-500/50 text-emerald-400'
                        : 'border-rose-500/50 text-rose-400'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-gray-300 font-bold mb-1 uppercase">
                    İşlem Tarihi
                  </label>
                  <input
                    type="date"
                    required
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#30363d] focus:border-orange-500 rounded-xl px-3 py-2 text-white outline-hidden"
                  />
                </div>
              </div>

              {txModalType === 'payment' && (
                <div>
                  <label className="block text-gray-300 font-bold mb-1 uppercase">
                    Tahsilat Yöntemi
                  </label>
                  <select
                    value={txPaymentMethod}
                    onChange={(e) => setTxPaymentMethod(e.target.value as any)}
                    className="w-full bg-[#0d1117] border border-[#30363d] focus:border-orange-500 rounded-xl px-3 py-2 text-white outline-hidden"
                  >
                    <option value="Nakit">Nakit (Elden)</option>
                    <option value="Kredi Kartı / POS">Kredi Kartı / POS</option>
                    <option value="Banka Transferi / EFT">Banka Havale / EFT</option>
                    <option value="Diğer">Diğer</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-gray-300 font-bold mb-1 uppercase">
                  Açıklama
                </label>
                <input
                  type="text"
                  placeholder="İşlem detayı..."
                  value={txDescription}
                  onChange={(e) => setTxDescription(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] focus:border-orange-500 rounded-xl px-3 py-2 text-white outline-hidden"
                />
              </div>

              <div className="pt-3 border-t border-[#30363d] flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddTxModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#30363d] text-gray-400 hover:text-white"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 rounded-xl text-white font-bold transition shadow-md ${
                    txModalType === 'payment'
                      ? 'bg-emerald-500 hover:bg-emerald-600'
                      : 'bg-rose-500 hover:bg-rose-600'
                  }`}
                >
                  {txModalType === 'payment' ? 'Tahsilatı Kaydet' : 'Borcu Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
