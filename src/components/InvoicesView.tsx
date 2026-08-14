import React, { useState } from 'react';
import {
  FileText,
  Plus,
  Search,
  Filter,
  FileSpreadsheet,
  Trash2,
  Edit2,
  Calendar,
  DollarSign,
  CreditCard,
  Building2,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Package,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Invoice, InvoiceItem, InvoicePayment, PaymentStatus } from '../types';
import { formatCurrency, formatDateTR, parseNumberInput } from '../utils/formatters';
import { exportInvoicesToExcel } from '../utils/excelExport';

interface InvoicesViewProps {
  selectedDate: string;
  invoices: Invoice[];
  onAddInvoice: (invoice: Omit<Invoice, 'id' | 'createdAt'>) => void;
  onUpdateInvoice: (invoice: Invoice) => void;
  onDeleteInvoice: (id: string) => void;
  onAddPayment: (invoiceId: string, payment: Omit<InvoicePayment, 'id' | 'createdAt'>) => void;
}

export const InvoicesView: React.FC<InvoicesViewProps> = ({
  selectedDate,
  invoices,
  onAddInvoice,
  onUpdateInvoice,
  onDeleteInvoice,
  onAddPayment,
}) => {
  const [statusFilter, setStatusFilter] = useState<'all' | PaymentStatus>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);

  // Modals
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);

  // Invoice Form State
  const [invoiceForm, setInvoiceForm] = useState({
    date: selectedDate,
    invoiceNo: '',
    supplierName: '',
    taxNumber: '',
    category: 'Manav',
    dueDate: selectedDate,
    description: '',
    vatRate: 1,
    items: [] as InvoiceItem[],
  });

  // Payment Form State
  const [paymentForm, setPaymentForm] = useState({
    date: selectedDate,
    amount: '',
    paymentMethod: 'Banka Transferi / EFT' as InvoicePayment['paymentMethod'],
    bankOrSource: 'Garanti Ticari',
    receiptNo: '',
    notes: '',
  });

  // Calculate high-level metrics
  const activeInvoices = invoices.filter((i) => i.isActive);
  const totalInvoiceAmount = activeInvoices.reduce((s, i) => s + (Number(i.totalAmount) || 0), 0);
  
  let totalPaidAmount = 0;
  activeInvoices.forEach((inv) => {
    inv.payments.forEach((p) => {
      totalPaidAmount += Number(p.amount) || 0;
    });
  });

  const totalRemainingDebt = Math.max(0, totalInvoiceAmount - totalPaidAmount);
  const overdueCount = activeInvoices.filter(
    (i) => i.paymentStatus !== 'paid' && i.dueDate && i.dueDate < selectedDate
  ).length;

  // Filtered invoices list
  const filteredInvoices = activeInvoices.filter((inv) => {
    if (statusFilter !== 'all') {
      if (statusFilter === 'overdue') {
        if (inv.paymentStatus === 'paid' || !inv.dueDate || inv.dueDate >= selectedDate) return false;
      } else if (inv.paymentStatus !== statusFilter) {
        return false;
      }
    }

    if (categoryFilter !== 'all' && inv.category !== categoryFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSup = inv.supplierName.toLowerCase().includes(q);
      const matchNo = inv.invoiceNo.toLowerCase().includes(q);
      const matchCat = inv.category.toLowerCase().includes(q);
      const matchItems = inv.items?.some((it) => it.productName.toLowerCase().includes(q));
      if (!matchSup && !matchNo && !matchCat && !matchItems) return false;
    }

    return true;
  });

  // Open Add Modal
  const handleOpenAddInvoice = () => {
    setEditingInvoice(null);
    setInvoiceForm({
      date: selectedDate,
      invoiceNo: `FTR-${Date.now().toString().slice(-6)}`,
      supplierName: '',
      taxNumber: '',
      category: 'Manav',
      dueDate: selectedDate,
      description: '',
      vatRate: 1,
      items: [
        {
          id: `item-${Date.now()}-1`,
          productName: '',
          quantity: 1,
          unit: 'kg',
          unitPrice: 0,
          vatRate: 1,
          total: 0,
          category: 'Sebze',
        },
      ],
    });
    setIsInvoiceModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditInvoice = (inv: Invoice) => {
    setEditingInvoice(inv);
    setInvoiceForm({
      date: inv.date,
      invoiceNo: inv.invoiceNo,
      supplierName: inv.supplierName,
      taxNumber: inv.taxNumber || '',
      category: inv.category,
      dueDate: inv.dueDate,
      description: inv.description,
      vatRate: inv.vatRate || 1,
      items: inv.items.length > 0 ? [...inv.items] : [
        {
          id: `item-${Date.now()}-1`,
          productName: 'Genel Mal / Hizmet Alımı',
          quantity: 1,
          unit: 'adet',
          unitPrice: inv.totalAmount,
          vatRate: inv.vatRate,
          total: inv.totalAmount,
          category: 'Genel',
        },
      ],
    });
    setIsInvoiceModalOpen(true);
  };

  // Line Item Handlers
  const handleItemChange = (index: number, field: keyof InvoiceItem, val: any) => {
    const updated = [...invoiceForm.items];
    const current = { ...updated[index], [field]: val };

    if (field === 'quantity' || field === 'unitPrice' || field === 'vatRate') {
      const qty = field === 'quantity' ? parseNumberInput(val) : (current.quantity || 0);
      const price = field === 'unitPrice' ? parseNumberInput(val) : (current.unitPrice || 0);
      current.quantity = qty;
      current.unitPrice = price;
      current.total = qty * price;
    }

    updated[index] = current;
    setInvoiceForm({ ...invoiceForm, items: updated });
  };

  const handleAddItemRow = () => {
    const newItem: InvoiceItem = {
      id: `item-${Date.now()}-${invoiceForm.items.length}`,
      productName: '',
      quantity: 1,
      unit: 'kg',
      unitPrice: 0,
      vatRate: invoiceForm.vatRate,
      total: 0,
      category: invoiceForm.category,
    };
    setInvoiceForm({ ...invoiceForm, items: [...invoiceForm.items, newItem] });
  };

  const handleRemoveItemRow = (index: number) => {
    const updated = invoiceForm.items.filter((_, i) => i !== index);
    setInvoiceForm({ ...invoiceForm, items: updated });
  };

  // Save Invoice
  const handleSaveInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceForm.supplierName.trim()) {
      alert('Lütfen firma/tedarikçi adını giriniz.');
      return;
    }

    // Compute total from items
    let computedTotal = 0;
    let computedVat = 0;
    invoiceForm.items.forEach((it) => {
      const lineTotal = (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0);
      computedTotal += lineTotal;
      computedVat += (lineTotal * (Number(it.vatRate) || 0)) / 100;
    });

    if (computedTotal <= 0) {
      alert('Lütfen en az bir geçerli ürün ve tutar giriniz.');
      return;
    }

    if (editingInvoice) {
      // Re-evaluate payment status
      const paidSum = editingInvoice.payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
      let newStatus: PaymentStatus = 'unpaid';
      if (paidSum >= computedTotal && computedTotal > 0) newStatus = 'paid';
      else if (paidSum > 0) newStatus = 'partial';
      else if (invoiceForm.dueDate < selectedDate) newStatus = 'overdue';

      onUpdateInvoice({
        ...editingInvoice,
        date: invoiceForm.date,
        invoiceNo: invoiceForm.invoiceNo.trim(),
        supplierName: invoiceForm.supplierName.trim(),
        taxNumber: invoiceForm.taxNumber.trim() || undefined,
        category: invoiceForm.category,
        dueDate: invoiceForm.dueDate,
        description: invoiceForm.description.trim(),
        totalAmount: computedTotal,
        vatAmount: computedVat,
        vatRate: invoiceForm.vatRate,
        items: invoiceForm.items,
        paymentStatus: newStatus,
      });
    } else {
      onAddInvoice({
        date: invoiceForm.date,
        invoiceNo: invoiceForm.invoiceNo.trim(),
        supplierName: invoiceForm.supplierName.trim(),
        taxNumber: invoiceForm.taxNumber.trim() || undefined,
        category: invoiceForm.category,
        dueDate: invoiceForm.dueDate,
        description: invoiceForm.description.trim(),
        totalAmount: computedTotal,
        vatAmount: computedVat,
        vatRate: invoiceForm.vatRate,
        paymentStatus: invoiceForm.dueDate < selectedDate ? 'overdue' : 'unpaid',
        items: invoiceForm.items,
        payments: [],
        isActive: true,
      });
    }

    setIsInvoiceModalOpen(false);
  };

  // Open Payment Modal
  const handleOpenPayment = (inv: Invoice) => {
    setPayingInvoice(inv);
    const paidSum = inv.payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
    const remaining = Math.max(0, inv.totalAmount - paidSum);

    setPaymentForm({
      date: selectedDate,
      amount: remaining.toString(),
      paymentMethod: 'Banka Transferi / EFT',
      bankOrSource: 'Garanti Ticari',
      receiptNo: `EFT-${Date.now().toString().slice(-4)}`,
      notes: `${inv.supplierName} faturası ödemesi`,
    });
    setIsPaymentModalOpen(true);
  };

  // Save Payment
  const handleSavePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingInvoice) return;

    const amountNum = parseFloat(paymentForm.amount.replace(',', '.'));
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('Lütfen geçerli bir ödeme tutarı giriniz.');
      return;
    }

    onAddPayment(payingInvoice.id, {
      invoiceId: payingInvoice.id,
      date: paymentForm.date,
      amount: amountNum,
      paymentMethod: paymentForm.paymentMethod,
      bankOrSource: paymentForm.bankOrSource.trim(),
      receiptNo: paymentForm.receiptNo.trim() || undefined,
      notes: paymentForm.notes.trim() || undefined,
    });

    setIsPaymentModalOpen(false);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#161b22] p-5 rounded-xl border border-[#30363d] shadow-lg">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-orange-500 uppercase tracking-wider mb-1 font-mono">
            <FileText className="w-4 h-4" />
            <span>FATURA & TEDARİKÇİ TAKİBİ</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Fatura & Tedarikçi Yönetim Modülü
          </h2>
          <p className="text-xs text-gray-400 font-mono mt-0.5">
            Gelen faturalar, KDV ayrıştırması, manav/gıda ürün kalemleri ve ödeme takibi
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => exportInvoicesToExcel(invoices)}
            className="flex items-center space-x-1.5 bg-[#21262d] hover:bg-[#30363d] text-gray-200 text-xs font-semibold px-3 py-2 rounded-lg border border-[#30363d] transition cursor-pointer font-mono"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Faturaları Excel'e Aktar</span>
          </button>

          <button
            onClick={handleOpenAddInvoice}
            className="flex items-center space-x-1.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-md transition cursor-pointer font-mono"
          >
            <Plus className="w-4 h-4" />
            <span>+ Yeni Fatura Kaydet</span>
          </button>
        </div>
      </div>

      {/* 4 Financial KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
        <div className="bg-[#161b22] p-4 rounded-xl border border-[#30363d]">
          <span className="text-xs text-gray-400 font-semibold uppercase">TOPLAM FATURA HACMİ</span>
          <div className="text-2xl font-bold text-white mt-1">
            {formatCurrency(totalInvoiceAmount)}
          </div>
          <span className="text-[11px] text-gray-500 mt-1 block">{activeInvoices.length} Kayıtlı Fatura</span>
        </div>

        <div className="bg-[#161b22] p-4 rounded-xl border border-[#30363d]">
          <span className="text-xs text-gray-400 font-semibold uppercase">TOPLAM YAPILAN ÖDEME</span>
          <div className="text-2xl font-bold text-emerald-400 mt-1">
            {formatCurrency(totalPaidAmount)}
          </div>
          <span className="text-[11px] text-gray-500 mt-1 block">Kasa ve Bankadan Kapatılan</span>
        </div>

        <div className="bg-[#161b22] p-4 rounded-xl border border-[#30363d]">
          <span className="text-xs text-gray-400 font-semibold uppercase">KALAN TEDARİKÇİ BORCU</span>
          <div className="text-2xl font-bold text-amber-400 mt-1">
            {formatCurrency(totalRemainingDebt)}
          </div>
          <span className="text-[11px] text-gray-500 mt-1 block">Ödenmeyi Bekleyen Bakiye</span>
        </div>

        <div className="bg-[#161b22] p-4 rounded-xl border border-[#30363d]">
          <span className="text-xs text-gray-400 font-semibold uppercase">VADESİ GEÇENLER</span>
          <div className={`text-2xl font-bold mt-1 ${overdueCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
            {overdueCount} Fatura
          </div>
          <span className="text-[11px] text-gray-500 mt-1 block">
            {overdueCount > 0 ? 'Acil ödeme bekliyor' : 'Gecikmiş fatura yok'}
          </span>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-[#161b22] p-4 rounded-xl border border-[#30363d] flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-lg font-mono">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tedarikçi firma, fatura no, ürün adı (örn: Domates, Kıyma)..."
            className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg pl-9 pr-4 py-2 text-xs text-white focus:border-orange-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Tabs */}
          <div className="flex items-center bg-[#0d1117] p-1 rounded-lg border border-[#30363d] text-xs font-semibold">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded transition cursor-pointer ${
                statusFilter === 'all' ? 'bg-[#21262d] text-white border border-[#30363d]' : 'text-gray-400 hover:text-white'
              }`}
            >
              Tümü
            </button>
            <button
              onClick={() => setStatusFilter('unpaid')}
              className={`px-3 py-1 rounded transition cursor-pointer ${
                statusFilter === 'unpaid' ? 'bg-[#21262d] text-white border border-[#30363d]' : 'text-gray-400 hover:text-white'
              }`}
            >
              Ödenmedi
            </button>
            <button
              onClick={() => setStatusFilter('partial')}
              className={`px-3 py-1 rounded transition cursor-pointer ${
                statusFilter === 'partial' ? 'bg-[#21262d] text-white border border-[#30363d]' : 'text-gray-400 hover:text-white'
              }`}
            >
              Kısmi
            </button>
            <button
              onClick={() => setStatusFilter('paid')}
              className={`px-3 py-1 rounded transition cursor-pointer ${
                statusFilter === 'paid' ? 'bg-[#21262d] text-white border border-[#30363d]' : 'text-gray-400 hover:text-white'
              }`}
            >
              Ödendi
            </button>
            <button
              onClick={() => setStatusFilter('overdue')}
              className={`px-3 py-1 rounded transition cursor-pointer ${
                statusFilter === 'overdue' ? 'bg-rose-900/60 text-rose-300 border border-rose-700' : 'text-rose-400'
              }`}
            >
              Geciken
            </button>
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-xs text-gray-200 focus:border-orange-500 focus:outline-none"
          >
            <option value="all">Tüm Kategoriler</option>
            <option value="Manav">Manav & Sebze</option>
            <option value="Kasap">Et & Kasap</option>
            <option value="Toptan Gıda">Toptan Gıda & Kuru</option>
            <option value="İçecek">İçecek & Meşrubat</option>
            <option value="Temizlik">Temizlik & Sarf</option>
            <option value="Diğer">Diğer</option>
          </select>
        </div>
      </div>

      {/* Invoices List */}
      <div className="space-y-3">
        {filteredInvoices.length === 0 ? (
          <div className="bg-[#161b22] rounded-xl border border-[#30363d] p-8 text-center text-gray-500 text-xs font-mono">
            Aranan kriterlere uygun fatura bulunamadı.
          </div>
        ) : (
          filteredInvoices.map((inv) => {
            const paid = inv.payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
            const remaining = Math.max(0, inv.totalAmount - paid);
            const isExpanded = expandedInvoiceId === inv.id;
            const isOverdue = inv.paymentStatus !== 'paid' && inv.dueDate && inv.dueDate < selectedDate;

            return (
              <div
                key={inv.id}
                className="bg-[#161b22] rounded-xl border border-[#30363d] shadow-lg overflow-hidden transition"
              >
                {/* Invoice Main Card Row */}
                <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-start space-x-3.5">
                    <div className="p-2.5 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 mt-1">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-bold text-white text-base">
                          {inv.supplierName}
                        </h3>
                        <span className="px-2 py-0.5 rounded bg-[#21262d] border border-[#30363d] text-gray-300 text-[10px] font-mono font-semibold uppercase">
                          {inv.category}
                        </span>
                        {isOverdue && (
                          <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-mono font-bold">
                            VADESİ GEÇTİ
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 mt-1 font-mono">
                        <span>No: <strong className="text-gray-200">{inv.invoiceNo}</strong></span>
                        <span>•</span>
                        <span>Fatura Tarihi: {formatDateTR(inv.date)}</span>
                        <span>•</span>
                        <span>Vade: <strong className={isOverdue ? 'text-rose-400' : 'text-gray-200'}>{formatDateTR(inv.dueDate)}</strong></span>
                        {inv.taxNumber && (
                          <>
                            <span>•</span>
                            <span>VKN: {inv.taxNumber}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Financial amounts & action buttons */}
                  <div className="flex flex-wrap items-center justify-between lg:justify-end gap-4 border-t lg:border-t-0 pt-3 lg:pt-0 border-[#30363d] font-mono">
                    <div className="text-left lg:text-right">
                      <div className="text-[11px] text-gray-400 font-medium">Fatura Toplamı</div>
                      <div className="text-lg font-bold text-white">
                        {formatCurrency(inv.totalAmount)}
                      </div>
                      <div className="text-[11px] text-gray-400">
                        Ödenen: {formatCurrency(paid)} | Kalan: <strong className="text-amber-400">{formatCurrency(remaining)}</strong>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {remaining > 0 && (
                        <button
                          onClick={() => handleOpenPayment(inv)}
                          className="flex items-center space-x-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm transition cursor-pointer"
                        >
                          <DollarSign className="w-3.5 h-3.5" />
                          <span>Ödeme Yap</span>
                        </button>
                      )}

                      <button
                        onClick={() => setExpandedInvoiceId(isExpanded ? null : inv.id)}
                        className="flex items-center space-x-1 bg-[#21262d] hover:bg-[#30363d] text-gray-200 text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#30363d] transition cursor-pointer"
                      >
                        <Package className="w-3.5 h-3.5 text-orange-400" />
                        <span>{inv.items.length} Kalem Ürün</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5 ml-1" /> : <ChevronDown className="w-3.5 h-3.5 ml-1" />}
                      </button>

                      <button
                        onClick={() => handleOpenEditInvoice(inv)}
                        className="p-1.5 text-gray-400 hover:text-orange-400 rounded transition cursor-pointer"
                        title="Düzenle"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => {
                          if (window.confirm('Bu faturayı silmek istediğinize emin misiniz?')) {
                            onDeleteInvoice(inv.id);
                          }
                        }}
                        className="p-1.5 text-gray-400 hover:text-rose-400 rounded transition cursor-pointer"
                        title="Sil"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Itemized Breakdown & Payment History */}
                {isExpanded && (
                  <div className="bg-[#0d1117] p-5 border-t border-[#30363d] space-y-4 text-xs font-mono">
                    {/* Products Table */}
                    <div>
                      <h4 className="font-bold text-white mb-2 flex items-center space-x-1.5">
                        <Package className="w-4 h-4 text-orange-400" />
                        <span>Fatura Ürün ve Malzeme Kalemleri</span>
                      </h4>

                      <div className="rounded-lg border border-[#30363d] overflow-hidden bg-[#161b22]">
                        <table className="w-full text-left">
                          <thead className="bg-[#0d1117] text-gray-400 font-semibold border-b border-[#30363d]">
                            <tr>
                              <th className="py-2 px-3">Ürün Adı</th>
                              <th className="py-2 px-3">Kategori</th>
                              <th className="py-2 px-3 text-right">Miktar</th>
                              <th className="py-2 px-3 text-right">Birim Fiyat</th>
                              <th className="py-2 px-3 text-center">KDV (%)</th>
                              <th className="py-2 px-3 text-right">Toplam (TL)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#21262d]">
                            {inv.items.map((it) => (
                              <tr key={it.id} className="hover:bg-[#21262d] transition-colors">
                                <td className="py-2 px-3 font-semibold text-gray-200 font-sans">
                                  {it.productName}
                                </td>
                                <td className="py-2 px-3 text-gray-400">{it.category}</td>
                                <td className="py-2 px-3 text-right font-medium text-gray-200">
                                  {it.quantity} {it.unit}
                                </td>
                                <td className="py-2 px-3 text-right text-gray-300">
                                  {formatCurrency(it.unitPrice)}
                                </td>
                                <td className="py-2 px-3 text-center text-gray-400">%{it.vatRate}</td>
                                <td className="py-2 px-3 text-right font-bold text-white">
                                  {formatCurrency(it.total)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Payment History */}
                    {inv.payments.length > 0 && (
                      <div className="pt-2">
                        <h4 className="font-bold text-white mb-2 flex items-center space-x-1.5">
                          <DollarSign className="w-4 h-4 text-emerald-400" />
                          <span>Bu Faturaya Yapılan Ödemeler Geçmişi ({inv.payments.length})</span>
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                          {inv.payments.map((pmt) => (
                            <div
                              key={pmt.id}
                              className="p-2.5 rounded-lg bg-[#161b22] border border-[#30363d] flex items-center justify-between"
                            >
                              <div>
                                <div className="font-semibold text-gray-200">
                                  {formatDateTR(pmt.date)}
                                </div>
                                <div className="text-[11px] text-gray-400">{pmt.paymentMethod}</div>
                                {pmt.receiptNo && (
                                  <div className="text-[10px] text-gray-500">Dekont: {pmt.receiptNo}</div>
                                )}
                              </div>
                              <span className="font-bold text-emerald-400">
                                {formatCurrency(pmt.amount)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Add / Edit Invoice Modal */}
      {isInvoiceModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-[#161b22] rounded-xl border border-[#30363d] w-full max-w-3xl p-6 shadow-2xl space-y-4 my-8 max-h-[90vh] overflow-y-auto font-mono">
            <div className="flex items-center justify-between border-b border-[#30363d] pb-3">
              <h3 className="font-bold text-white text-base">
                {editingInvoice ? 'Faturayı Düzenle' : 'Yeni Fatura & Ürün Kalemleri Kaydet'}
              </h3>
              <button
                onClick={() => setIsInvoiceModalOpen(false)}
                className="text-gray-400 hover:text-white text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveInvoice} className="space-y-4 text-xs">
              {/* Top metadata grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-gray-300 mb-1">
                    Fatura Tarihi *
                  </label>
                  <input
                    type="date"
                    required
                    value={invoiceForm.date}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, date: e.target.value })}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-white focus:border-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-300 mb-1">
                    Fatura Numarası *
                  </label>
                  <input
                    type="text"
                    required
                    value={invoiceForm.invoiceNo}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, invoiceNo: e.target.value })}
                    placeholder="Örn: MNV20260000412"
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-white focus:border-orange-500 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-300 mb-1">
                    Vade Tarihi *
                  </label>
                  <input
                    type="date"
                    required
                    value={invoiceForm.dueDate}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-white focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-gray-300 mb-1">
                    Firma / Tedarikçi Adı *
                  </label>
                  <input
                    type="text"
                    required
                    value={invoiceForm.supplierName}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, supplierName: e.target.value })}
                    placeholder="Örn: Hasan Manav Toptan"
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-white focus:border-orange-500 focus:outline-none font-sans"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-300 mb-1">
                    Vergi Numarası (VKN)
                  </label>
                  <input
                    type="text"
                    value={invoiceForm.taxNumber}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, taxNumber: e.target.value })}
                    placeholder="10 Haneli VKN"
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-white focus:border-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-300 mb-1">
                    Kategori
                  </label>
                  <select
                    value={invoiceForm.category}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, category: e.target.value })}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-gray-200 focus:border-orange-500 focus:outline-none"
                  >
                    <option value="Manav">Manav & Sebze</option>
                    <option value="Kasap">Et & Kasap</option>
                    <option value="Toptan Gıda">Toptan Gıda</option>
                    <option value="İçecek">İçecek & Meşrubat</option>
                    <option value="Temizlik">Temizlik & Sarf</option>
                    <option value="Hizmet">Hizmet & Genel</option>
                    <option value="Diğer">Diğer</option>
                  </select>
                </div>
              </div>

              {/* Itemized Line Items Section */}
              <div className="pt-3 border-t border-[#30363d] space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white text-xs flex items-center space-x-1.5">
                    <Package className="w-4 h-4 text-orange-400" />
                    <span>Faturadaki Ürün Kalemleri (Manav, Et vb.)</span>
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="text-xs bg-[#21262d] hover:bg-[#30363d] text-orange-400 font-semibold px-2.5 py-1 rounded-lg border border-[#30363d] transition cursor-pointer"
                  >
                    + Ürün Kalemi Ekle
                  </button>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {invoiceForm.items.map((it, idx) => (
                    <div
                      key={it.id || idx}
                      className="p-2.5 rounded-lg bg-[#0d1117] border border-[#30363d] flex flex-wrap sm:flex-nowrap items-center gap-2"
                    >
                      <input
                        type="text"
                        required
                        value={it.productName}
                        onChange={(e) => handleItemChange(idx, 'productName', e.target.value)}
                        placeholder="Ürün adı (Örn: Domates, Kıyma)"
                        className="bg-[#161b22] border border-[#30363d] rounded-lg px-2.5 py-1.5 flex-2 min-w-36 text-xs text-white focus:border-orange-500 focus:outline-none font-sans"
                      />

                      <div className="flex items-center space-x-1 w-28">
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={it.quantity || ''}
                          onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                          placeholder="Miktar"
                          className="w-16 bg-[#161b22] border border-[#30363d] rounded-lg px-2 py-1.5 text-xs text-right font-medium text-white focus:border-orange-500 focus:outline-none"
                        />
                        <select
                          value={it.unit}
                          onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                          className="bg-[#161b22] border border-[#30363d] rounded-lg px-1.5 py-1.5 text-xs text-gray-200 focus:border-orange-500 focus:outline-none"
                        >
                          <option value="kg">kg</option>
                          <option value="adet">adet</option>
                          <option value="koli">koli</option>
                          <option value="lt">lt</option>
                          <option value="demet">demet</option>
                          <option value="teneke">teneke</option>
                          <option value="çuval">çuval</option>
                        </select>
                      </div>

                      <div className="relative w-28">
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={it.unitPrice || ''}
                          onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                          placeholder="Birim Fiyat"
                          className="w-full bg-[#161b22] border border-[#30363d] rounded-lg px-2 py-1.5 text-xs text-right pr-5 font-medium text-white focus:border-orange-500 focus:outline-none"
                        />
                        <span className="absolute right-1.5 top-1.5 text-[10px] text-gray-500">₺</span>
                      </div>

                      <div className="w-20">
                        <select
                          value={it.vatRate}
                          onChange={(e) => handleItemChange(idx, 'vatRate', Number(e.target.value))}
                          className="w-full bg-[#161b22] border border-[#30363d] rounded-lg px-1.5 py-1.5 text-xs text-gray-200 focus:border-orange-500 focus:outline-none"
                        >
                          <option value={1}>%1 KDV</option>
                          <option value={10}>%10 KDV</option>
                          <option value={20}>%20 KDV</option>
                        </select>
                      </div>

                      <div className="w-24 text-right font-bold text-white text-xs">
                        {formatCurrency((Number(it.quantity) || 0) * (Number(it.unitPrice) || 0))}
                      </div>

                      {invoiceForm.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(idx)}
                          className="text-gray-500 hover:text-rose-400 p-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Calculation summary box */}
              {(() => {
                let computedTotal = 0;
                let computedVat = 0;
                invoiceForm.items.forEach((it) => {
                  const lineTotal = (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0);
                  computedTotal += lineTotal;
                  computedVat += (lineTotal * (Number(it.vatRate) || 0)) / 100;
                });

                return (
                  <div className="p-3.5 rounded-lg bg-[#0d1117] text-white flex items-center justify-between border border-[#30363d]">
                    <div>
                      <span className="text-xs text-gray-400">Hesaplanan Fatura Tutarı:</span>
                      <div className="text-xs text-orange-400">
                        KDV Dahil / {invoiceForm.items.length} Kalem
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-orange-400">
                        {formatCurrency(computedTotal)}
                      </div>
                      <div className="text-[11px] text-gray-500">
                        KDV: {formatCurrency(computedVat)}
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#30363d]">
                <button
                  type="button"
                  onClick={() => setIsInvoiceModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-gray-300 font-semibold cursor-pointer border border-[#30363d]"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-semibold shadow-md cursor-pointer"
                >
                  {editingInvoice ? 'Faturayı Güncelle' : 'Faturayı Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Payment Modal */}
      {isPaymentModalOpen && payingInvoice && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#161b22] rounded-xl border border-[#30363d] w-full max-w-md p-6 shadow-2xl space-y-4 font-mono">
            <div className="flex items-center justify-between border-b border-[#30363d] pb-3">
              <div>
                <h3 className="font-bold text-white text-base">
                  Faturaya Ödeme Yap
                </h3>
                <span className="text-xs text-gray-400 font-semibold">
                  {payingInvoice.supplierName} (No: {payingInvoice.invoiceNo})
                </span>
              </div>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="text-gray-400 hover:text-white text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePayment} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-300 mb-1">
                  Ödeme Tarihi *
                </label>
                <input
                  type="date"
                  required
                  value={paymentForm.date}
                  onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-white focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-300 mb-1">
                  Ödeme Tutarı (TL) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    placeholder="0.00"
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-base font-bold text-emerald-400 focus:border-orange-500 focus:outline-none pr-7"
                  />
                  <span className="absolute right-3 top-2.5 font-bold text-gray-500">₺</span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-300 mb-1">
                  Ödeme Yöntemi *
                </label>
                <select
                  value={paymentForm.paymentMethod}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value as any })}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-gray-200 focus:border-orange-500 focus:outline-none"
                >
                  <option value="Banka Transferi / EFT">Banka Transferi / EFT</option>
                  <option value="Nakit (Kasadan)">Nakit (Kasadan - Günlük Kasayı Etkiler)</option>
                  <option value="Kredi Kartı">Kurumsal Kredi Kartı</option>
                  <option value="Çek">Çek / Senet</option>
                </select>
                {paymentForm.paymentMethod === 'Nakit (Kasadan)' && (
                  <p className="text-[11px] text-amber-400 mt-1">
                    ⚠ Bu ödeme seçildiğinde {formatDateTR(paymentForm.date)} tarihli Günlük Nakit Kasadan otomatik düşülecektir.
                  </p>
                )}
              </div>

              <div>
                <label className="block font-semibold text-gray-300 mb-1">
                  Banka / Kasa Adı
                </label>
                <input
                  type="text"
                  value={paymentForm.bankOrSource}
                  onChange={(e) => setPaymentForm({ ...paymentForm, bankOrSource: e.target.value })}
                  placeholder="Örn: Garanti Ticari Şube / Ana Kasa"
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-white focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-300 mb-1">
                  Dekont / Makbuz No
                </label>
                <input
                  type="text"
                  value={paymentForm.receiptNo}
                  onChange={(e) => setPaymentForm({ ...paymentForm, receiptNo: e.target.value })}
                  placeholder="Örn: EFT-88192"
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-white focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#30363d]">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-gray-300 font-semibold cursor-pointer border border-[#30363d]"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-md cursor-pointer"
                >
                  Ödemeyi Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
