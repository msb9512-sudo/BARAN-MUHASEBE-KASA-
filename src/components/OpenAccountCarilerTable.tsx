import React, { useState, useMemo } from 'react';
import {
  UserCheck,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Phone,
  Building2,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  Filter,
  DollarSign,
  TrendingUp,
} from 'lucide-react';
import { OpenAccountCustomer, OpenAccountTransaction, TabType } from '../types';
import { formatCurrency, formatDateTR } from '../utils/formatters';

interface OpenAccountCarilerTableProps {
  customers: OpenAccountCustomer[];
  transactions: OpenAccountTransaction[];
  onNavigate?: (tab: TabType) => void;
  title?: string;
  subtitle?: string;
  badgeLabel?: string;
  showFilters?: boolean;
}

export const OpenAccountCarilerTable: React.FC<OpenAccountCarilerTableProps> = ({
  customers = [],
  transactions = [],
  onNavigate,
  title = 'Açık Hesaplar & Müşteri Carileri İcmali',
  subtitle = 'Veresiye masalar, açık hesap müşteri bakiyeleri ve tahsilat durumu',
  badgeLabel = 'CARİ TAKİBİ',
  showFilters = true,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'debtors' | 'settled'>('all');
  const [sortBy, setSortBy] = useState<'balance-desc' | 'recent' | 'name'>('balance-desc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const PAGE_SIZE = 10;

  // Calculate customer statistics
  const customerStats = useMemo<
    Record<
      string,
      {
        totalDebt: number;
        totalPayment: number;
        balance: number;
        txCount: number;
        lastTxDate?: string;
      }
    >
  >(() => {
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
    () =>
      transactions
        .filter((t) => t.type === 'debt')
        .reduce((s, t) => s + (Number(t.amount) || 0), 0),
    [transactions]
  );

  const totalPaymentOverall = useMemo(
    () =>
      transactions
        .filter((t) => t.type === 'payment')
        .reduce((s, t) => s + (Number(t.amount) || 0), 0),
    [transactions]
  );

  const totalRemainingBalance = totalDebtOverall - totalPaymentOverall;

  const debtorCount = useMemo(
    () =>
      Object.values(customerStats).filter((s: { balance: number }) => s.balance > 0.01).length,
    [customerStats]
  );

  // Filtered & Sorted Customer List
  const filteredCustomers = useMemo(() => {
    let list = customers.filter((c) => c.isActive !== false);

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(term) ||
          (c.company && c.company.toLowerCase().includes(term)) ||
          (c.phone && c.phone.includes(term)) ||
          (c.notes && c.notes.toLowerCase().includes(term))
      );
    }

    // Status filter
    if (filterType === 'debtors') {
      list = list.filter((c) => (customerStats[c.id]?.balance || 0) > 0.01);
    } else if (filterType === 'settled') {
      list = list.filter((c) => (customerStats[c.id]?.balance || 0) <= 0.01);
    }

    // Sorting
    list = [...list].sort((a, b) => {
      const statsA = customerStats[a.id] || { balance: 0, lastTxDate: '' };
      const statsB = customerStats[b.id] || { balance: 0, lastTxDate: '' };

      if (sortBy === 'balance-desc') {
        return statsB.balance - statsA.balance;
      } else if (sortBy === 'recent') {
        return (statsB.lastTxDate || '').localeCompare(statsA.lastTxDate || '');
      } else {
        return a.name.localeCompare(b.name, 'tr-TR');
      }
    });

    return list;
  }, [customers, searchTerm, filterType, sortBy, customerStats]);

  // Pagination calculation
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

  // Generate pagination buttons array (1, 2, 3, 4, 5...)
  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }, [totalPages]);

  return (
    <div className="bg-[#161b22] rounded-xl border border-[#30363d] overflow-hidden shadow-lg font-mono">
      {/* Header Container */}
      <div className="p-4 sm:p-5 border-b border-[#30363d] bg-[#161b22]">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-semibold text-orange-400 uppercase tracking-wider mb-1">
              <span className="w-2 h-2 rounded-full bg-orange-500 inline-block animate-pulse"></span>
              <span>{badgeLabel}</span>
            </div>
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white font-sans tracking-tight">
                  {title}
                </h3>
                <p className="text-xs text-gray-300 mt-0.5 font-sans">{subtitle}</p>
              </div>
            </div>
          </div>

          {/* Quick Stat Badges & Go to Management */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="px-3.5 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-xs shadow-xs">
              <span className="text-gray-400 block text-[10px] uppercase font-semibold">Açık Hesap Bakiye</span>
              <span className="text-orange-400 font-bold text-sm">
                {formatCurrency(totalRemainingBalance)}
              </span>
            </div>
            <div className="px-3.5 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-xs shadow-xs">
              <span className="text-gray-400 block text-[10px] uppercase font-semibold">Borçlu Cari</span>
              <span className="text-amber-400 font-bold text-sm">
                {debtorCount} / {customers.length}
              </span>
            </div>
            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate('openAccounts')}
                className="flex items-center space-x-1.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-sm transition cursor-pointer font-sans"
              >
                <span>Cari Yönetimine Git</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Filter and Search Bar */}
        {showFilters && (
          <div className="mt-4 pt-3.5 border-t border-[#30363d] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Cari adı, masa veya telefon ile ara..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg pl-9 pr-3 py-2 text-xs text-gray-100 placeholder-gray-400 focus:border-orange-500 focus:outline-none"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center space-x-1.5 bg-[#0d1117] p-1 rounded-lg border border-[#30363d] text-xs">
              <button
                type="button"
                onClick={() => {
                  setFilterType('all');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded transition text-xs font-medium cursor-pointer ${
                  filterType === 'all'
                    ? 'bg-[#21262d] text-white font-bold shadow-xs border border-[#30363d]'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                Tümü ({customers.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setFilterType('debtors');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded transition text-xs font-medium cursor-pointer ${
                  filterType === 'debtors'
                    ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                Borçlular ({debtorCount})
              </button>
              <button
                type="button"
                onClick={() => {
                  setFilterType('settled');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded transition text-xs font-medium cursor-pointer ${
                  filterType === 'settled'
                    ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                Kapananlar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#0d1117] text-gray-300 font-semibold border-b border-[#30363d]">
            <tr>
              <th className="py-3.5 px-4 font-mono">#</th>
              <th className="py-3.5 px-4 font-mono">Cari / Müşteri / Masa</th>
              <th className="py-3.5 px-3 font-mono">İletişim / Not</th>
              <th className="py-3.5 px-3 font-mono">Son İşlem</th>
              <th className="py-3.5 px-3 text-right font-mono">Toplam Borç</th>
              <th className="py-3.5 px-3 text-right font-mono">Tahsil Edilen</th>
              <th className="py-3.5 px-4 text-right font-bold text-white font-mono">Kalan Bakiye</th>
              <th className="py-3.5 px-3 text-center font-mono">Durum</th>
              <th className="py-3.5 px-4 text-center font-mono">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#30363d]/60">
            {paginatedCustomers.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-gray-400">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <UserCheck className="w-8 h-8 text-gray-500" />
                    <p className="text-xs text-gray-300">
                      {searchTerm || filterType !== 'all'
                        ? 'Arama kriterlerine uygun cari hesap kaydı bulunamadı.'
                        : 'Henüz kayıtlı açık hesap / cari bulunmamaktadır.'}
                    </p>
                    {onNavigate && (
                      <button
                        type="button"
                        onClick={() => onNavigate('openAccounts')}
                        className="mt-2 text-xs text-orange-400 hover:text-orange-300 font-bold underline cursor-pointer"
                      >
                        + Yeni Cari / Açık Hesap Oluştur
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              paginatedCustomers.map((customer, index) => {
                const globalIndex = (safeCurrentPage - 1) * PAGE_SIZE + index + 1;
                const stats = customerStats[customer.id] || {
                  totalDebt: 0,
                  totalPayment: 0,
                  balance: 0,
                  txCount: 0,
                };
                const hasBalance = stats.balance > 0.01;

                return (
                  <tr
                    key={customer.id}
                    className="hover:bg-[#21262d] transition-colors group cursor-pointer"
                    onClick={() => onNavigate?.('openAccounts')}
                  >
                    {/* Index */}
                    <td className="py-3.5 px-4 text-gray-400 font-mono text-[11px]">
                      {globalIndex}
                    </td>

                    {/* Name & Company/Table */}
                    <td className="py-3.5 px-4 font-sans">
                      <div className="flex items-center space-x-2.5">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                            hasBalance
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {customer.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-white group-hover:text-orange-400 transition-colors">
                            {customer.name}
                          </div>
                          {customer.company && (
                            <div className="text-[11px] text-gray-300 font-mono flex items-center space-x-1">
                              <Building2 className="w-3 h-3 text-gray-400 inline" />
                              <span>{customer.company}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Contact / Notes */}
                    <td className="py-3.5 px-3 font-mono text-gray-300 text-[11px]">
                      {customer.phone ? (
                        <div className="flex items-center space-x-1 text-gray-200">
                          <Phone className="w-3 h-3 text-gray-400" />
                          <span>{customer.phone}</span>
                        </div>
                      ) : customer.notes ? (
                        <span className="text-gray-300 truncate max-w-[140px] block">
                          {customer.notes}
                        </span>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>

                    {/* Last Transaction Date */}
                    <td className="py-3.5 px-3 font-mono text-gray-300 text-[11px] whitespace-nowrap">
                      {stats.lastTxDate ? (
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          <span>{formatDateTR(stats.lastTxDate)}</span>
                        </div>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>

                    {/* Total Debt */}
                    <td className="py-3.5 px-3 text-right font-mono text-rose-400 font-semibold">
                      {formatCurrency(stats.totalDebt)}
                    </td>

                    {/* Total Payment */}
                    <td className="py-3.5 px-3 text-right font-mono text-emerald-400 font-semibold">
                      {formatCurrency(stats.totalPayment)}
                    </td>

                    {/* Balance */}
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-sm">
                      <span
                        className={
                          hasBalance
                            ? 'text-orange-400 font-extrabold'
                            : 'text-gray-400'
                        }
                      >
                        {formatCurrency(stats.balance)}
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-3 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${
                          hasBalance
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        }`}
                      >
                        {hasBalance ? '● Açık Borç' : '✓ Kapandı'}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigate?.('openAccounts');
                        }}
                        className="text-orange-400 hover:text-orange-300 hover:underline text-xs font-semibold cursor-pointer"
                      >
                        Detay →
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer Box */}
      <div className="p-4 bg-[#0d1117] border-t border-[#30363d] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        {/* Record count info */}
        <div className="text-gray-300 font-mono flex items-center space-x-2">
          <span>
            Toplam <strong className="text-white">{filteredCustomers.length}</strong> cari kayıttan{' '}
            <strong className="text-orange-400">
              {filteredCustomers.length === 0
                ? 0
                : `${(safeCurrentPage - 1) * PAGE_SIZE + 1} - ${Math.min(
                    safeCurrentPage * PAGE_SIZE,
                    filteredCustomers.length
                  )}`}
            </strong>{' '}
            arası gösteriliyor.
          </span>
          {totalPages > 1 && (
            <span className="text-gray-400">
              (Sayfa {safeCurrentPage} / {totalPages})
            </span>
          )}
        </div>

        {/* 10-Item Page Navigation Box (1 2 3 4 5 ...) */}
        {totalPages > 1 && (
          <div className="flex items-center space-x-1.5 bg-[#161b22] p-1 rounded-lg border border-[#30363d] font-mono">
            {/* Previous button */}
            <button
              type="button"
              disabled={safeCurrentPage === 1}
              onClick={() => handlePageChange(safeCurrentPage - 1)}
              className="flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-medium text-gray-200 hover:text-white hover:bg-[#21262d] disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
              title="Önceki Sayfa"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Önceki</span>
            </button>

            {/* Page number buttons: 1, 2, 3, 4, 5... */}
            <div className="flex items-center space-x-1">
              {pageNumbers.map((pageNum) => {
                const isActive = pageNum === safeCurrentPage;
                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => handlePageChange(pageNum)}
                    className={`min-w-[28px] h-7 px-2 rounded text-xs font-bold transition cursor-pointer flex items-center justify-center ${
                      isActive
                        ? 'bg-orange-600 text-white shadow-md'
                        : 'bg-[#21262d] text-gray-200 hover:bg-[#30363d] hover:text-white border border-[#30363d]'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            {/* Next button */}
            <button
              type="button"
              disabled={safeCurrentPage === totalPages}
              onClick={() => handlePageChange(safeCurrentPage + 1)}
              className="flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-medium text-gray-200 hover:text-white hover:bg-[#21262d] disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
              title="Sonraki Sayfa"
            >
              <span className="hidden xs:inline">Sonraki</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
