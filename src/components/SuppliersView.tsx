import React, { useState, useMemo } from 'react';
import {
  Building2,
  Search,
  ArrowUpDown,
  Calendar,
  DollarSign,
  Package,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingDown,
  Receipt,
  Layers,
} from 'lucide-react';
import { Invoice, TabType, SupplierGroup } from '../types';
import {
  groupInvoicesBySupplier,
  getInvoiceAmounts,
  normalizeSupplierName,
} from '../utils/calculations';
import { formatCurrency, formatDateTR } from '../utils/formatters';

interface SuppliersViewProps {
  invoices: Invoice[];
  onNavigate?: (tab: TabType) => void;
}

type SortField = 'debt' | 'amount' | 'name' | 'date';

export const SuppliersView: React.FC<SuppliersViewProps> = ({ invoices, onNavigate }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortField>('debt');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);

  // Detail view state
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);

  // Group invoices into unique suppliers
  const supplierGroups = useMemo(() => {
    return groupInvoicesBySupplier(invoices);
  }, [invoices]);

  // Overall KPIs
  const overallKPIs = useMemo(() => {
    let totalPurchases = 0;
    let totalPaid = 0;
    let totalDebt = 0;

    supplierGroups.forEach((s) => {
      totalPurchases += s.totalAmount;
      totalPaid += s.paidAmount;
      totalDebt += s.remainingDebt;
    });

    return {
      supplierCount: supplierGroups.length,
      totalPurchases,
      totalPaid,
      totalDebt,
    };
  }, [supplierGroups]);

  // Filtered & sorted supplier list
  const filteredSuppliers = useMemo(() => {
    const q = normalizeSupplierName(searchQuery);

    const list = supplierGroups.filter((s) => {
      if (!q) return true;
      const matchName = normalizeSupplierName(s.name).includes(q);
      const matchVkn = (s.taxNumber || '').toLowerCase().includes(q);
      return matchName || matchVkn;
    });

    return list.sort((a, b) => {
      if (sortBy === 'debt') return b.remainingDebt - a.remainingDebt;
      if (sortBy === 'amount') return b.totalAmount - a.totalAmount;
      if (sortBy === 'name') return a.name.localeCompare(b.name, 'tr-TR');
      if (sortBy === 'date') return (b.lastTransactionDate || '').localeCompare(a.lastTransactionDate || '');
      return 0;
    });
  }, [supplierGroups, searchQuery, sortBy]);

  // Current selected supplier for details
  const currentSupplier = useMemo(() => {
    if (!selectedSupplierId) return null;
    return supplierGroups.find((s) => s.id === selectedSupplierId) || null;
  }, [selectedSupplierId, supplierGroups]);

  // Distinct months for the selected supplier
  const supplierMonths = useMemo(() => {
    if (!currentSupplier) return [];
    const months = new Set<string>();
    currentSupplier.invoices.forEach((inv) => {
      if (inv.date && inv.date.length >= 7) {
        months.add(inv.date.slice(0, 7));
      }
    });
    return Array.from(months).sort().reverse();
  }, [currentSupplier]);

  // Filtered invoices for selected supplier by month
  const filteredSupplierInvoices = useMemo(() => {
    if (!currentSupplier) return [];
    if (selectedMonth === 'all') return currentSupplier.invoices;
    return currentSupplier.invoices.filter((inv) => inv.date?.startsWith(selectedMonth));
  }, [currentSupplier, selectedMonth]);

  // Aggregated product summary for the selected supplier
  const supplierProductSummary = useMemo(() => {
    if (!currentSupplier) return [];

    interface ProductAgg {
      productName: string;
      category: string;
      unit: string;
      totalQuantity: number;
      totalNetAmount: number;
      totalVatAmount: number;
      totalWithVatAmount: number;
      occurrenceCount: number;
    }

    const map = new Map<string, ProductAgg>();

    filteredSupplierInvoices.forEach((inv) => {
      if (!inv.items || inv.items.length === 0) return;
      inv.items.forEach((it) => {
        const name = (it.productName || 'Genel Kalem').trim();
        const unit = (it.unit || 'adet').trim();
        const key = `${name.toLowerCase()}__${unit.toLowerCase()}`;

        const qty = Number(it.quantity) || 0;
        const price = Number(it.unitPrice) || 0;
        const rate = Number(it.vatRate) || 0;
        const lineNet = Math.round((qty * price + Number.EPSILON) * 100) / 100;
        const lineVat = Math.round(((lineNet * rate) / 100 + Number.EPSILON) * 100) / 100;
        const lineTotal = Math.round((lineNet + lineVat + Number.EPSILON) * 100) / 100;

        if (!map.has(key)) {
          map.set(key, {
            productName: name,
            category: it.category || 'Genel',
            unit,
            totalQuantity: qty,
            totalNetAmount: lineNet,
            totalVatAmount: lineVat,
            totalWithVatAmount: lineTotal,
            occurrenceCount: 1,
          });
        } else {
          const existing = map.get(key)!;
          existing.totalQuantity += qty;
          existing.totalNetAmount += lineNet;
          existing.totalVatAmount += lineVat;
          existing.totalWithVatAmount += lineTotal;
          existing.occurrenceCount += 1;
        }
      });
    });

    return Array.from(map.values()).sort((a, b) => b.totalWithVatAmount - a.totalWithVatAmount);
  }, [currentSupplier, filteredSupplierInvoices]);

  // If a supplier detail is active, render DETAIL VIEW
  if (currentSupplier) {
    const detailTotals = filteredSupplierInvoices.reduce(
      (acc, inv) => {
        const amounts = getInvoiceAmounts(inv);
        acc.gross += inv.grossAmount || (amounts.netAmount + (Number(inv.discountAmount) || 0));
        acc.discount += Number(inv.discountAmount) || 0;
        acc.net += amounts.netAmount;
        acc.vat += amounts.vatAmount;
        acc.totalWithVat += amounts.totalWithVat;
        acc.paid += amounts.paidAmount;
        acc.debt += amounts.remainingDebt;
        return acc;
      },
      { gross: 0, discount: 0, net: 0, vat: 0, totalWithVat: 0, paid: 0, debt: 0 }
    );

    return (
      <div className="space-y-6 pb-12 font-mono">
        {/* Top navigation & Supplier Header */}
        <div className="bg-[#161b22] p-5 rounded-xl border border-[#30363d] shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <button
              onClick={() => {
                setSelectedSupplierId(null);
                setSelectedMonth('all');
                setExpandedInvoiceId(null);
              }}
              className="inline-flex items-center space-x-2 text-xs font-semibold text-gray-300 hover:text-white bg-[#21262d] hover:bg-[#30363d] px-3 py-2 rounded-lg border border-[#30363d] transition cursor-pointer self-start"
            >
              <ArrowLeft className="w-4 h-4 text-orange-400" />
              <span>← Tüm Tedarikçi Firmalara Dön</span>
            </button>

            {onNavigate && (
              <button
                onClick={() => onNavigate('invoices')}
                className="inline-flex items-center space-x-1.5 text-xs text-orange-400 hover:text-orange-300 transition cursor-pointer self-start sm:self-auto font-medium"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Faturalar Modülüne Git →</span>
              </button>
            )}
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-t border-[#30363d] pt-4">
            <div className="flex items-start space-x-3.5">
              <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 mt-1">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center flex-wrap gap-2">
                  <h2 className="text-xl font-bold text-white tracking-tight font-sans">
                    {currentSupplier.name}
                  </h2>
                  {currentSupplier.taxNumber ? (
                    <span className="px-2.5 py-0.5 rounded bg-[#21262d] border border-[#30363d] text-orange-400 text-xs font-semibold">
                      VKN: {currentSupplier.taxNumber}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-[#21262d] border border-[#30363d] text-gray-400 text-[11px]">
                      VKN Belirtilmemiş
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded bg-[#21262d] border border-[#30363d] text-gray-300 text-[11px]">
                    {currentSupplier.invoiceCount} Kayıtlı Fatura
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Son Alışveriş: <strong className="text-gray-200">{formatDateTR(currentSupplier.lastTransactionDate)}</strong>
                </p>
              </div>
            </div>

            {/* Quick Supplier Stats Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#0d1117] p-3 rounded-xl border border-[#30363d]">
              <div>
                <span className="text-[10px] text-gray-400 font-semibold uppercase block">KDV DAHİL TOPLAM</span>
                <span className="text-base font-bold text-white block mt-0.5">
                  {formatCurrency(currentSupplier.totalAmount)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 font-semibold uppercase block">KDV HARİÇ TUTAR</span>
                <span className="text-base font-semibold text-gray-300 block mt-0.5">
                  {formatCurrency(currentSupplier.netAmount)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 font-semibold uppercase block">TOPLAM ÖDENEN</span>
                <span className="text-base font-bold text-emerald-400 block mt-0.5">
                  {formatCurrency(currentSupplier.paidAmount)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 font-semibold uppercase block">KALAN BORÇ</span>
                <span
                  className={`text-base font-bold block mt-0.5 ${
                    currentSupplier.remainingDebt > 0 ? 'text-amber-400' : 'text-emerald-400'
                  }`}
                >
                  {formatCurrency(currentSupplier.remainingDebt)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Date / Month Filter Bar */}
        <div className="bg-[#161b22] p-4 rounded-xl border border-[#30363d] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-orange-400" />
            <span className="text-xs font-semibold text-gray-200">Dönem & Ay Filtresi:</span>
          </div>

          <div className="flex items-center space-x-2">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-1.5 text-xs text-white focus:border-orange-500 focus:outline-none cursor-pointer"
            >
              <option value="all">Tüm Aylar & Geçmiş ({currentSupplier.invoices.length} Fatura)</option>
              {supplierMonths.map((m) => (
                <option key={m} value={m}>
                  {m} Dönemi
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Section 1: Alışveriş Geçmişi Tablosu */}
        <div className="bg-[#161b22] rounded-xl border border-[#30363d] shadow-lg overflow-hidden space-y-3 p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-sm flex items-center space-x-2">
              <Receipt className="w-4 h-4 text-orange-400" />
              <span>Alışveriş & Fatura Geçmişi</span>
              <span className="text-xs font-normal text-gray-400">
                ({filteredSupplierInvoices.length} Fatura)
              </span>
            </h3>
            <span className="text-[11px] text-gray-400">
              Satıra tıklayarak ürün kalemlerini inceleyebilirsiniz
            </span>
          </div>

          <div className="rounded-lg border border-[#30363d] overflow-x-auto bg-[#0d1117]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#161b22] text-gray-400 font-semibold border-b border-[#30363d]">
                <tr>
                  <th className="py-2.5 px-3">Tarih</th>
                  <th className="py-2.5 px-3">Fatura No</th>
                  <th className="py-2.5 px-3 text-right">İskonto</th>
                  <th className="py-2.5 px-3 text-right">KDV Hariç Net</th>
                  <th className="py-2.5 px-3 text-right">KDV</th>
                  <th className="py-2.5 px-3 text-right">KDV Dahil</th>
                  <th className="py-2.5 px-3 text-right">Ödenen</th>
                  <th className="py-2.5 px-3 text-right">Kalan</th>
                  <th className="py-2.5 px-3 text-center">Durum</th>
                  <th className="py-2.5 px-3 text-center">Kalem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#21262d]">
                {filteredSupplierInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-gray-500">
                      Bu dönemde faturaya rastlanmadı.
                    </td>
                  </tr>
                ) : (
                  filteredSupplierInvoices.map((inv) => {
                    const amounts = getInvoiceAmounts(inv);
                    const isExpanded = expandedInvoiceId === inv.id;

                    let statusBadge = (
                      <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-bold">
                        Ödenmedi
                      </span>
                    );
                    if (inv.paymentStatus === 'paid') {
                      statusBadge = (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                          Ödendi
                        </span>
                      );
                    } else if (inv.paymentStatus === 'partial') {
                      statusBadge = (
                        <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-bold">
                          Kısmi
                        </span>
                      );
                    }

                    return (
                      <React.Fragment key={inv.id}>
                        <tr
                          onClick={() => setExpandedInvoiceId(isExpanded ? null : inv.id)}
                          className={`hover:bg-[#161b22] transition-colors cursor-pointer ${
                            isExpanded ? 'bg-[#161b22]' : ''
                          }`}
                        >
                          <td className="py-2.5 px-3 text-gray-200 font-medium">
                            {formatDateTR(inv.date)}
                          </td>
                          <td className="py-2.5 px-3 text-white font-semibold">
                            <div className="flex items-center space-x-1.5">
                              <span>{inv.invoiceNo}</span>
                              {amounts.isOldRecord && (
                                <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px]">
                                  eski kayıt
                                </span>
                              )}
                            </div>
                            {inv.description && (
                              <div className="text-[11px] text-gray-400 font-sans mt-0.5 flex items-center gap-1 font-normal">
                                <FileText className="w-3 h-3 text-gray-500 shrink-0" />
                                <span className="truncate max-w-[200px]" title={inv.description}>
                                  {inv.description}
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {inv.discountAmount !== undefined && inv.discountAmount > 0 ? (
                              <span className="text-amber-400 font-semibold">-{formatCurrency(inv.discountAmount)}</span>
                            ) : (
                              <span className="text-gray-500">-</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right text-gray-300">
                            {formatCurrency(amounts.netAmount)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-orange-400">
                            +{formatCurrency(amounts.vatAmount)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-white">
                            {formatCurrency(amounts.totalWithVat)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-emerald-400">
                            {formatCurrency(amounts.paidAmount)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-amber-400">
                            {formatCurrency(amounts.remainingDebt)}
                          </td>
                          <td className="py-2.5 px-3 text-center">{statusBadge}</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="inline-flex items-center text-gray-400 hover:text-white">
                              {inv.items?.length || 0} Kalem
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5 ml-1" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5 ml-1" />
                              )}
                            </span>
                          </td>
                        </tr>

                        {/* Accordion Line Items */}
                        {isExpanded && (
                          <tr className="bg-[#12161f]">
                            <td colSpan={10} className="p-4 border-y border-[#30363d]">
                              <div className="space-y-2">
                                <div className="text-[11px] font-bold text-orange-400 uppercase tracking-wider flex items-center space-x-1.5">
                                  <Package className="w-3.5 h-3.5" />
                                  <span>Fatura Kalemleri ({inv.invoiceNo})</span>
                                </div>

                                {inv.items && inv.items.length > 0 ? (
                                  <div className="rounded-lg border border-[#30363d] overflow-hidden bg-[#161b22]">
                                    <table className="w-full text-left text-[11px]">
                                      <thead className="bg-[#0d1117] text-gray-400 border-b border-[#30363d]">
                                        <tr>
                                          <th className="py-1.5 px-2.5">Ürün Adı</th>
                                          <th className="py-1.5 px-2.5">Kategori</th>
                                          <th className="py-1.5 px-2.5 text-right">Miktar</th>
                                          <th className="py-1.5 px-2.5 text-right">Birim Fiyat</th>
                                          <th className="py-1.5 px-2.5 text-center">İskonto</th>
                                          <th className="py-1.5 px-2.5 text-center">KDV (%)</th>
                                          <th className="py-1.5 px-2.5 text-right">KDV Hariç Tutar</th>
                                          <th className="py-1.5 px-2.5 text-right">KDV Dahil Toplam</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-[#21262d]">
                                        {inv.items.map((it) => {
                                          const qty = Number(it.quantity) || 0;
                                          const price = Number(it.unitPrice) || 0;
                                          const rate = Number(it.vatRate) || 0;
                                          const lineGross = Math.round((qty * price + Number.EPSILON) * 100) / 100;
                                          const lineNet = it.total !== undefined ? Number(it.total) : lineGross;
                                          const lineVat = Math.round(((lineNet * rate) / 100 + Number.EPSILON) * 100) / 100;
                                          const lineTotal = Math.round((lineNet + lineVat + Number.EPSILON) * 100) / 100;
                                          const hasDiscount = it.discountAmount !== undefined && it.discountAmount > 0;

                                          return (
                                            <tr key={it.id} className="hover:bg-[#21262d]/50">
                                              <td className="py-1.5 px-2.5 font-semibold text-gray-200 font-sans">
                                                {it.productName}
                                              </td>
                                              <td className="py-1.5 px-2.5 text-gray-400">
                                                {it.category}
                                              </td>
                                              <td className="py-1.5 px-2.5 text-right text-gray-200 font-medium">
                                                {it.quantity} {it.unit}
                                              </td>
                                              <td className="py-1.5 px-2.5 text-right text-gray-300">
                                                {formatCurrency(it.unitPrice)}
                                              </td>
                                              <td className="py-1.5 px-2.5 text-center">
                                                {hasDiscount ? (
                                                  <span className="text-amber-400 font-semibold">
                                                    {it.discountRate ? `-%${it.discountRate}` : ''} (-{formatCurrency(it.discountAmount!)})
                                                  </span>
                                                ) : (
                                                  <span className="text-gray-500">-</span>
                                                )}
                                              </td>
                                              <td className="py-1.5 px-2.5 text-center text-gray-400">
                                                %{it.vatRate}
                                              </td>
                                              <td className="py-1.5 px-2.5 text-right text-gray-300">
                                                {formatCurrency(lineNet)}
                                              </td>
                                              <td className="py-1.5 px-2.5 text-right font-bold text-orange-400">
                                                {formatCurrency(lineTotal)}
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                ) : (
                                  <div className="text-gray-500 italic text-xs py-2">
                                    Bu faturada ayrıntılı kalem bilgisi bulunmuyor.
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
              {/* Altta Toplam Satırı */}
              {filteredSupplierInvoices.length > 0 && (
                <tfoot className="bg-[#161b22] border-t-2 border-[#30363d] font-bold">
                  <tr>
                    <td colSpan={2} className="py-2.5 px-3 text-right text-gray-400">
                      DÖNEM TOPLAMLARI:
                    </td>
                    <td className="py-2.5 px-3 text-right text-amber-400">
                      {detailTotals.discount > 0 ? `-${formatCurrency(detailTotals.discount)}` : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right text-gray-200">
                      {formatCurrency(detailTotals.net)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-orange-400">
                      +{formatCurrency(detailTotals.vat)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-white text-sm">
                      {formatCurrency(detailTotals.totalWithVat)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-emerald-400">
                      {formatCurrency(detailTotals.paid)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-amber-400 text-sm">
                      {formatCurrency(detailTotals.debt)}
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* Section 2: Ürün Özeti (Bu firmadan alınan ürünlerin dökümü) */}
        <div className="bg-[#161b22] rounded-xl border border-[#30363d] shadow-lg p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-sm flex items-center space-x-2">
              <Package className="w-4 h-4 text-orange-400" />
              <span>Ürün Özeti (Bu Tedarikçiden Alınan Ürünler)</span>
              <span className="text-xs font-normal text-gray-400">
                ({supplierProductSummary.length} Farklı Ürün Kalemi)
              </span>
            </h3>
            <span className="text-[11px] text-gray-400">
              Miktarlar ve tutarlar bazında ürün analizi
            </span>
          </div>

          {supplierProductSummary.length === 0 ? (
            <div className="p-6 text-center text-gray-500 text-xs bg-[#0d1117] rounded-lg border border-[#30363d]">
              Bu dönemde kayıtlı ürün kalemi bulunamadı.
            </div>
          ) : (
            <div className="rounded-lg border border-[#30363d] overflow-x-auto bg-[#0d1117]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#161b22] text-gray-400 font-semibold border-b border-[#30363d]">
                  <tr>
                    <th className="py-2.5 px-3">Ürün Adı</th>
                    <th className="py-2.5 px-3">Kategori</th>
                    <th className="py-2.5 px-3 text-right">Toplam Alınan Miktar</th>
                    <th className="py-2.5 px-3 text-right">Ortalama Birim Fiyat</th>
                    <th className="py-2.5 px-3 text-right">KDV Hariç Tutar</th>
                    <th className="py-2.5 px-3 text-right">KDV Dahil Toplam</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#21262d]">
                  {supplierProductSummary.map((item, idx) => {
                    const avgUnitPrice =
                      item.totalQuantity > 0 ? item.totalNetAmount / item.totalQuantity : 0;

                    return (
                      <tr key={idx} className="hover:bg-[#161b22] transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-gray-200 font-sans">
                          {item.productName}
                        </td>
                        <td className="py-2.5 px-3 text-gray-400">{item.category}</td>
                        <td className="py-2.5 px-3 text-right font-medium text-white">
                          {item.totalQuantity.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}{' '}
                          <span className="text-gray-400 text-[11px]">{item.unit}</span>
                        </td>
                        <td className="py-2.5 px-3 text-right text-gray-300">
                          {formatCurrency(avgUnitPrice)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-gray-300">
                          {formatCurrency(item.totalNetAmount)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-orange-400">
                          {formatCurrency(item.totalWithVatAmount)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-[#161b22] border-t border-[#30363d] font-bold">
                  <tr>
                    <td colSpan={4} className="py-2.5 px-3 text-right text-gray-400">
                      ÜRÜN GENEL TOPLAMI:
                    </td>
                    <td className="py-2.5 px-3 text-right text-gray-200">
                      {formatCurrency(
                        supplierProductSummary.reduce((s, it) => s + it.totalNetAmount, 0)
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right text-orange-400 text-sm">
                      {formatCurrency(
                        supplierProductSummary.reduce((s, it) => s + it.totalWithVatAmount, 0)
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  // MAIN SUPPLIERS LIST VIEW
  return (
    <div className="space-y-6 pb-12 font-mono">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#161b22] p-5 rounded-xl border border-[#30363d] shadow-lg">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-orange-500 uppercase tracking-wider mb-1">
            <Building2 className="w-4 h-4" />
            <span>TEDARİKÇİ VE FİRMA TAKİBİ</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Tedarikçi Firmalar & Cari Borç Özeti
          </h2>
          <p className="text-xs text-gray-400 mt-0.5 font-mono">
            Faturalardan otomatik türetilen tedarikçi firma dökümü, alım geçmişi ve bakiye takibi
          </p>
        </div>

        {onNavigate && (
          <button
            onClick={() => onNavigate('invoices')}
            className="flex items-center space-x-1.5 bg-[#21262d] hover:bg-[#30363d] text-gray-200 text-xs font-semibold px-3 py-2 rounded-lg border border-[#30363d] transition cursor-pointer self-start sm:self-auto"
          >
            <FileText className="w-4 h-4 text-orange-400" />
            <span>Faturaları Yönet</span>
          </button>
        )}
      </div>

      {/* Genel Özet KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#161b22] p-4 rounded-xl border border-[#30363d]">
          <span className="text-xs text-gray-400 font-semibold uppercase">TOPLAM FİRMA SAYISI</span>
          <div className="text-2xl font-bold text-white mt-1">
            {overallKPIs.supplierCount} Firma
          </div>
          <span className="text-[11px] text-gray-500 mt-1 block">Aktif Faturalı Tedarikçi</span>
        </div>

        <div className="bg-[#161b22] p-4 rounded-xl border border-[#30363d]">
          <span className="text-xs text-gray-400 font-semibold uppercase">TOPLAM ALIM (KDV DAHİL)</span>
          <div className="text-2xl font-bold text-white mt-1">
            {formatCurrency(overallKPIs.totalPurchases)}
          </div>
          <span className="text-[11px] text-gray-500 mt-1 block">Tüm Zamanlar Alım Tutarı</span>
        </div>

        <div className="bg-[#161b22] p-4 rounded-xl border border-[#30363d]">
          <span className="text-xs text-gray-400 font-semibold uppercase">TOPLAM YAPILAN ÖDEME</span>
          <div className="text-2xl font-bold text-emerald-400 mt-1">
            {formatCurrency(overallKPIs.totalPaid)}
          </div>
          <span className="text-[11px] text-gray-500 mt-1 block">Kasa ve Bankadan Kapatılan</span>
        </div>

        <div className="bg-[#161b22] p-4 rounded-xl border border-[#30363d]">
          <span className="text-xs text-gray-400 font-semibold uppercase">TOPLAM KALAN BORÇ</span>
          <div
            className={`text-2xl font-bold mt-1 ${
              overallKPIs.totalDebt > 0 ? 'text-amber-400' : 'text-emerald-400'
            }`}
          >
            {formatCurrency(overallKPIs.totalDebt)}
          </div>
          <span className="text-[11px] text-gray-500 mt-1 block">Ödenmeyi Bekleyen Bakiye</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#161b22] p-4 rounded-xl border border-[#30363d] flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-lg">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tedarikçi firma adı veya VKN ile ara..."
            className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg pl-9 pr-4 py-2 text-xs text-white focus:border-orange-500 focus:outline-none"
          />
        </div>

        {/* Sort Controls */}
        <div className="flex items-center space-x-2 text-xs">
          <span className="text-gray-400 flex items-center space-x-1">
            <ArrowUpDown className="w-3.5 h-3.5 text-orange-400" />
            <span>Sırala:</span>
          </span>
          <div className="flex items-center bg-[#0d1117] p-1 rounded-lg border border-[#30363d]">
            <button
              onClick={() => setSortBy('debt')}
              className={`px-2.5 py-1 rounded transition cursor-pointer text-xs ${
                sortBy === 'debt'
                  ? 'bg-[#21262d] text-amber-400 font-bold border border-[#30363d]'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Borca Göre
            </button>
            <button
              onClick={() => setSortBy('amount')}
              className={`px-2.5 py-1 rounded transition cursor-pointer text-xs ${
                sortBy === 'amount'
                  ? 'bg-[#21262d] text-white font-bold border border-[#30363d]'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Alıma Göre
            </button>
            <button
              onClick={() => setSortBy('name')}
              className={`px-2.5 py-1 rounded transition cursor-pointer text-xs ${
                sortBy === 'name'
                  ? 'bg-[#21262d] text-white font-bold border border-[#30363d]'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Ada Göre
            </button>
            <button
              onClick={() => setSortBy('date')}
              className={`px-2.5 py-1 rounded transition cursor-pointer text-xs ${
                sortBy === 'date'
                  ? 'bg-[#21262d] text-white font-bold border border-[#30363d]'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Tarihe Göre
            </button>
          </div>
        </div>
      </div>

      {/* Supplier Cards / Rows List */}
      <div className="space-y-3">
        {filteredSuppliers.length === 0 ? (
          <div className="bg-[#161b22] p-12 text-center rounded-xl border border-[#30363d]">
            <Building2 className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <h3 className="text-white font-bold text-sm">Tedarikçi Firma Bulunamadı</h3>
            <p className="text-gray-400 text-xs mt-1">
              {searchQuery
                ? 'Arama kriterlerinize uygun tedarikçi firma bulunamadı.'
                : 'Henüz sisteme kayıtlı fatura bulunmuyor.'}
            </p>
          </div>
        ) : (
          filteredSuppliers.map((supplier) => (
            <div
              key={supplier.id}
              onClick={() => setSelectedSupplierId(supplier.id)}
              className="bg-[#161b22] hover:bg-[#1c222b] p-4 sm:p-5 rounded-xl border border-[#30363d] shadow-md transition-all cursor-pointer group flex flex-col lg:flex-row lg:items-center justify-between gap-4"
            >
              {/* Left Info */}
              <div className="flex items-start space-x-3.5">
                <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 group-hover:bg-orange-500/20 transition mt-0.5">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center flex-wrap gap-2">
                    <h3 className="font-bold text-white text-base font-sans group-hover:text-orange-400 transition">
                      {supplier.name}
                    </h3>
                    {supplier.taxNumber ? (
                      <span className="px-2 py-0.5 rounded bg-[#21262d] border border-[#30363d] text-orange-400 text-[10px] font-semibold">
                        VKN: {supplier.taxNumber}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-[#21262d] border border-[#30363d] text-gray-500 text-[10px]">
                        VKN Yok
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded bg-[#21262d] border border-[#30363d] text-gray-300 text-[10px]">
                      {supplier.invoiceCount} Fatura
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                    <span>
                      Son İşlem: <strong className="text-gray-300">{formatDateTR(supplier.lastTransactionDate)}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Amounts & Action */}
              <div className="flex flex-wrap items-center justify-between lg:justify-end gap-6 border-t lg:border-t-0 pt-3 lg:pt-0 border-[#30363d]">
                <div className="text-left lg:text-right">
                  <span className="text-[10px] text-gray-400 font-semibold uppercase block">
                    KDV Dahil Toplam Alım
                  </span>
                  <div className="text-base font-bold text-white mt-0.5">
                    {formatCurrency(supplier.totalAmount)}
                  </div>
                  <span className="text-[11px] text-gray-400">
                    Ödenen: <strong className="text-emerald-400">{formatCurrency(supplier.paidAmount)}</strong>
                  </span>
                </div>

                <div className="text-left lg:text-right min-w-32">
                  <span className="text-[10px] text-gray-400 font-semibold uppercase block">
                    Kalan Borç
                  </span>
                  <div
                    className={`text-lg font-bold mt-0.5 ${
                      supplier.remainingDebt > 0 ? 'text-amber-400' : 'text-emerald-400'
                    }`}
                  >
                    {formatCurrency(supplier.remainingDebt)}
                  </div>
                  <span className="text-[10px] text-gray-500">
                    {supplier.remainingDebt > 0 ? 'Ödeme Bekliyor' : 'Borç Kapatıldı'}
                  </span>
                </div>

                <div className="flex items-center text-orange-400 text-xs font-semibold group-hover:translate-x-1 transition-transform">
                  <span>Detaylar</span>
                  <ChevronRight className="w-4 h-4 ml-0.5" />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
