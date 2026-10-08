import React, { useState, useMemo } from 'react';
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
  Tag,
  Percent,
} from 'lucide-react';
import { Invoice, InvoiceItem, InvoicePayment, PaymentStatus, TabType, FinancialAccount } from '../types';
import { formatCurrency, formatDateTR, parseNumberInput } from '../utils/formatters';
import { exportInvoicesToExcel } from '../utils/excelExport';
import { CashierStepFooter } from './CashierStepFooter';

export interface FormInvoiceItemRow extends InvoiceItem {
  discountType: '%' | 'TL';
  discountInput: string | number;
}

export function calculateInvoiceBreakdown(
  items: FormInvoiceItemRow[],
  generalDiscountType: '%' | 'TL',
  generalDiscountValue: string | number
) {
  const round2 = (val: number) => Math.round((val + Number.EPSILON) * 100) / 100;

  let grossAmount = 0;
  let lineDiscountTotal = 0;
  let postLineSubtotal = 0;

  // 1. Process Line Items
  const processedItems = items.map((it) => {
    const qty = Number(it.quantity) || 0;
    const price = Number(it.unitPrice) || 0;
    const grossLine = round2(qty * price);
    const dType = it.discountType || (it.discountRate !== undefined ? '%' : it.discountAmount !== undefined ? 'TL' : '%');

    let dValNum = 0;
    if (it.discountInput !== undefined && it.discountInput !== '') {
      dValNum = typeof it.discountInput === 'number'
        ? it.discountInput
        : parseFloat(String(it.discountInput).replace(',', '.')) || 0;
    } else if (dType === '%' && it.discountRate !== undefined) {
      dValNum = Number(it.discountRate) || 0;
    } else if (dType === 'TL' && it.discountAmount !== undefined) {
      dValNum = Number(it.discountAmount) || 0;
    }

    let lineDiscount = 0;
    let lineRate = 0;

    if (dValNum > 0) {
      if (dType === '%') {
        lineRate = Math.min(100, Math.max(0, dValNum));
        lineDiscount = round2(grossLine * (lineRate / 100));
      } else {
        lineDiscount = Math.min(grossLine, Math.max(0, dValNum));
        lineRate = grossLine > 0 ? round2((lineDiscount / grossLine) * 100) : 0;
      }
    }

    const postLineTotal = Math.max(0, round2(grossLine - lineDiscount));

    grossAmount += grossLine;
    lineDiscountTotal += lineDiscount;
    postLineSubtotal += postLineTotal;

    return {
      it,
      qty,
      price,
      grossLine,
      lineDiscount,
      lineRate,
      postLineTotal,
      vatRate: Number(it.vatRate) || 0,
    };
  });

  grossAmount = round2(grossAmount);
  lineDiscountTotal = round2(lineDiscountTotal);
  postLineSubtotal = round2(postLineSubtotal);

  // 2. Process General Discount
  let genValNum = 0;
  if (generalDiscountValue !== undefined && generalDiscountValue !== '') {
    genValNum = typeof generalDiscountValue === 'number'
      ? generalDiscountValue
      : parseFloat(String(generalDiscountValue).replace(',', '.')) || 0;
  }

  let generalDiscountAmount = 0;
  let generalDiscountRate = 0;

  if (genValNum > 0 && postLineSubtotal > 0) {
    if (generalDiscountType === '%') {
      generalDiscountRate = Math.min(100, Math.max(0, genValNum));
      generalDiscountAmount = round2(postLineSubtotal * (generalDiscountRate / 100));
    } else {
      generalDiscountAmount = round2(genValNum);
      generalDiscountRate = round2((generalDiscountAmount / postLineSubtotal) * 100);
    }
  }

  const totalDiscountAmount = round2(lineDiscountTotal + generalDiscountAmount);
  const isDiscountExceeded = totalDiscountAmount > grossAmount;
  const netAmount = Math.max(0, round2(grossAmount - totalDiscountAmount));

  // 3. Proportional Distribution of General Discount for Exact VAT by Rate
  const vatBreakdown: Record<number, { base: number; vat: number }> = {
    1: { base: 0, vat: 0 },
    10: { base: 0, vat: 0 },
    20: { base: 0, vat: 0 },
  };

  const itemResults = processedItems.map((p) => {
    let allocatedGen = 0;
    if (postLineSubtotal > 0 && generalDiscountAmount > 0) {
      allocatedGen = (p.postLineTotal / postLineSubtotal) * generalDiscountAmount;
    }
    const effectiveBase = Math.max(0, p.postLineTotal - allocatedGen);
    const lineVat = round2((effectiveBase * p.vatRate) / 100);
    const lineTotalWithVat = round2(effectiveBase + lineVat);

    if (!vatBreakdown[p.vatRate]) {
      vatBreakdown[p.vatRate] = { base: 0, vat: 0 };
    }
    vatBreakdown[p.vatRate].base += effectiveBase;
    vatBreakdown[p.vatRate].vat += lineVat;

    return {
      ...p,
      allocatedGenDiscount: allocatedGen,
      effectiveBase,
      lineVat,
      lineTotalWithVat,
    };
  });

  // Round vat breakdown bases and vats
  let computedVat = 0;
  Object.keys(vatBreakdown).forEach((k) => {
    const rate = Number(k);
    vatBreakdown[rate].base = round2(vatBreakdown[rate].base);
    vatBreakdown[rate].vat = round2(vatBreakdown[rate].vat);
    computedVat += vatBreakdown[rate].vat;
  });
  computedVat = round2(computedVat);
  const totalAmount = round2(netAmount + computedVat);

  return {
    grossAmount,
    lineDiscountTotal,
    postLineSubtotal,
    generalDiscountAmount,
    generalDiscountRate,
    totalDiscountAmount,
    netAmount,
    vatAmount: computedVat,
    totalAmount,
    vatBreakdown,
    items: itemResults,
    isDiscountExceeded,
  };
}

const InvoiceDescriptionSnippet: React.FC<{ text: string }> = ({ text }) => {
  const [expanded, setExpanded] = useState(false);
  if (!text || !text.trim()) return null;
  const isLong = text.length > 55;

  return (
    <div
      onClick={(e) => {
        if (isLong) {
          e.stopPropagation();
          setExpanded(!expanded);
        }
      }}
      className={`text-xs text-gray-300 bg-[#0d1117] px-2.5 py-1.5 rounded-lg border border-[#21262d] inline-flex items-center gap-1.5 max-w-full ${
        isLong ? 'cursor-pointer hover:border-gray-600 transition' : ''
      }`}
      title={isLong && !expanded ? 'Tamamını görmek için tıklayın' : undefined}
    >
      <FileText className="w-3.5 h-3.5 text-gray-400 shrink-0" />
      <span className="text-gray-400 font-semibold shrink-0 text-[11px]">Not:</span>
      <span className="font-sans text-gray-300 break-words">
        {expanded || !isLong ? text : `${text.slice(0, 52)}...`}
      </span>
      {isLong && (
        <span className="text-[10px] text-orange-400 ml-1 font-mono font-medium underline shrink-0">
          {expanded ? 'Kapat' : 'Daha fazla'}
        </span>
      )}
    </div>
  );
};

interface InvoicesViewProps {
  selectedDate: string;
  invoices: Invoice[];
  accounts?: FinancialAccount[];
  onAddInvoice: (invoice: Omit<Invoice, 'id' | 'createdAt'>) => void;
  onUpdateInvoice: (invoice: Invoice) => void;
  onDeleteInvoice: (id: string) => void;
  onAddPayment: (invoiceId: string, payment: Omit<InvoicePayment, 'id' | 'createdAt'>) => void;
  onNavigate?: (tab: TabType) => void;
}

export const InvoicesView: React.FC<InvoicesViewProps> = ({
  selectedDate,
  invoices,
  accounts = [],
  onAddInvoice,
  onUpdateInvoice,
  onDeleteInvoice,
  onAddPayment,
  onNavigate,
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
    generalDiscountType: '%' as '%' | 'TL',
    generalDiscountValue: '' as string | number,
    items: [] as FormInvoiceItemRow[],
  });

  // Payment Form State
  const [paymentForm, setPaymentForm] = useState({
    date: selectedDate,
    amount: '',
    paymentMethod: 'Banka Transferi / EFT' as InvoicePayment['paymentMethod'],
    bankOrSource: 'Garanti Ticari',
    receiptNo: '',
    notes: '',
    accountId: 'gunluk-kasa',
  });

  // Calculate high-level metrics
  const activeInvoices = invoices.filter((i) => i.isActive);

  // Distinct existing suppliers for auto-complete datalist
  const existingSuppliers = useMemo(() => {
    const map = new Map<string, { name: string; taxNumber: string; category: string }>();
    activeInvoices.forEach((i) => {
      const name = (i.supplierName || '').trim();
      if (!name) return;
      const key = name.toLowerCase();
      const existing = map.get(key);
      if (!existing) {
        map.set(key, {
          name,
          taxNumber: i.taxNumber?.trim() || '',
          category: i.category || 'Manav',
        });
      } else if (!existing.taxNumber && i.taxNumber?.trim()) {
        existing.taxNumber = i.taxNumber.trim();
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'tr-TR'));
  }, [activeInvoices]);

  const handleSupplierNameChange = (val: string) => {
    const trimmed = val.trim().toLowerCase();
    const match = existingSuppliers.find((s) => s.name.trim().toLowerCase() === trimmed);
    if (match) {
      setInvoiceForm((prev) => ({
        ...prev,
        supplierName: val,
        taxNumber: match.taxNumber || prev.taxNumber,
        category: match.category || prev.category,
      }));
    } else {
      setInvoiceForm((prev) => ({ ...prev, supplierName: val }));
    }
  };

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
      const matchDesc = inv.description?.toLowerCase().includes(q);
      const matchItems = inv.items?.some((it) => it.productName.toLowerCase().includes(q));
      if (!matchSup && !matchNo && !matchCat && !matchDesc && !matchItems) return false;
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
      generalDiscountType: '%',
      generalDiscountValue: '',
      items: [
        {
          id: `item-${Date.now()}-1`,
          productName: '',
          quantity: 1,
          unit: 'kg',
          unitPrice: 0,
          vatRate: 1,
          discountType: '%',
          discountInput: '',
          discountRate: undefined,
          discountAmount: 0,
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
    const fallbackPrice = inv.netAmount !== undefined ? inv.netAmount : inv.totalAmount;

    // Determine general discount initial state
    let genType: '%' | 'TL' = '%';
    let genVal: string | number = '';
    if (inv.generalDiscountRate && inv.generalDiscountRate > 0) {
      genType = '%';
      genVal = inv.generalDiscountRate;
    } else if (inv.generalDiscountAmount && inv.generalDiscountAmount > 0) {
      genType = 'TL';
      genVal = inv.generalDiscountAmount;
    }

    const items: FormInvoiceItemRow[] = inv.items.length > 0 ? inv.items.map((it) => {
      let dType: '%' | 'TL' = '%';
      let dVal: string | number = '';
      if (it.discountRate !== undefined && it.discountRate > 0) {
        dType = '%';
        dVal = it.discountRate;
      } else if (it.discountAmount !== undefined && it.discountAmount > 0) {
        dType = 'TL';
        dVal = it.discountAmount;
      }
      return {
        ...it,
        discountType: dType,
        discountInput: dVal,
        discountRate: it.discountRate,
        discountAmount: it.discountAmount || 0,
      };
    }) : [
      {
        id: `item-${Date.now()}-1`,
        productName: 'Genel Mal / Hizmet Alımı',
        quantity: 1,
        unit: 'adet',
        unitPrice: fallbackPrice,
        vatRate: inv.vatRate || 1,
        discountType: '%' as const,
        discountInput: '',
        discountRate: undefined,
        discountAmount: 0,
        total: fallbackPrice,
        category: 'Genel',
      },
    ];

    setInvoiceForm({
      date: inv.date,
      invoiceNo: inv.invoiceNo,
      supplierName: inv.supplierName,
      taxNumber: inv.taxNumber || '',
      category: inv.category,
      dueDate: inv.dueDate,
      description: inv.description || '',
      vatRate: inv.vatRate || 1,
      generalDiscountType: genType,
      generalDiscountValue: genVal,
      items,
    });
    setIsInvoiceModalOpen(true);
  };

  // Line Item Handlers
  const handleItemChange = (index: number, field: string, val: any) => {
    const updated = [...invoiceForm.items];
    const current = { ...updated[index], [field]: val };
    updated[index] = current;
    setInvoiceForm({ ...invoiceForm, items: updated });
  };

  const handleAddItemRow = () => {
    const newItem: FormInvoiceItemRow = {
      id: `item-${Date.now()}-${invoiceForm.items.length}`,
      productName: '',
      quantity: 1,
      unit: 'kg',
      unitPrice: 0,
      vatRate: invoiceForm.vatRate,
      discountType: '%',
      discountInput: '',
      discountRate: undefined,
      discountAmount: 0,
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

    const round2 = (val: number) => Math.round((val + Number.EPSILON) * 100) / 100;
    const breakdown = calculateInvoiceBreakdown(
      invoiceForm.items,
      invoiceForm.generalDiscountType,
      invoiceForm.generalDiscountValue
    );

    if (breakdown.isDiscountExceeded) {
      alert('İskonto, KDV hariç ara toplamdan fazla olamaz! Lütfen iskonto tutar veya oranını düzeltiniz.');
      return;
    }

    if (breakdown.totalAmount <= 0) {
      alert('Lütfen en az bir geçerli ürün ve tutar giriniz.');
      return;
    }

    const normalizedItems: InvoiceItem[] = invoiceForm.items.map((it, idx) => {
      const calc = breakdown.items[idx];
      return {
        id: it.id,
        productName: it.productName.trim(),
        quantity: calc.qty,
        unit: it.unit,
        unitPrice: calc.price,
        vatRate: calc.vatRate,
        total: calc.postLineTotal, // İskonto sonrası KDV hariç kalem tutarı
        category: it.category || 'Genel',
        discountRate: calc.lineRate > 0 ? calc.lineRate : undefined,
        discountAmount: calc.lineDiscount > 0 ? calc.lineDiscount : undefined,
      };
    });

    if (editingInvoice) {
      // Re-evaluate payment status against KDV dahil totalAmount
      const paidSum = round2(editingInvoice.payments.reduce((s, p) => s + (Number(p.amount) || 0), 0));
      let newStatus: PaymentStatus = 'unpaid';
      if (paidSum >= breakdown.totalAmount && breakdown.totalAmount > 0) newStatus = 'paid';
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
        grossAmount: breakdown.grossAmount,
        discountAmount: breakdown.totalDiscountAmount > 0 ? breakdown.totalDiscountAmount : undefined,
        generalDiscountRate: breakdown.generalDiscountRate > 0 ? breakdown.generalDiscountRate : undefined,
        generalDiscountAmount: breakdown.generalDiscountAmount > 0 ? breakdown.generalDiscountAmount : undefined,
        netAmount: breakdown.netAmount,
        totalAmount: breakdown.totalAmount,
        vatAmount: breakdown.vatAmount,
        vatRate: invoiceForm.vatRate,
        items: normalizedItems,
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
        grossAmount: breakdown.grossAmount,
        discountAmount: breakdown.totalDiscountAmount > 0 ? breakdown.totalDiscountAmount : undefined,
        generalDiscountRate: breakdown.generalDiscountRate > 0 ? breakdown.generalDiscountRate : undefined,
        generalDiscountAmount: breakdown.generalDiscountAmount > 0 ? breakdown.generalDiscountAmount : undefined,
        netAmount: breakdown.netAmount,
        totalAmount: breakdown.totalAmount,
        vatAmount: breakdown.vatAmount,
        vatRate: invoiceForm.vatRate,
        paymentStatus: invoiceForm.dueDate < selectedDate ? 'overdue' : 'unpaid',
        items: normalizedItems,
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
    const defaultAcc = accounts.find((a) => a.id === 'gunluk-kasa') || accounts[0];

    setPaymentForm({
      date: selectedDate,
      amount: remaining.toString(),
      paymentMethod: 'Banka Transferi / EFT',
      bankOrSource: defaultAcc ? defaultAcc.name : 'Garanti Ticari',
      receiptNo: `EFT-${Date.now().toString().slice(-4)}`,
      notes: `${inv.supplierName} faturası ödemesi`,
      accountId: defaultAcc ? defaultAcc.id : 'gunluk-kasa',
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
      accountId: paymentForm.accountId || undefined,
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
                      <div className="flex items-center flex-wrap gap-2">
                        <h3 className="font-bold text-white text-base">
                          {inv.supplierName}
                        </h3>
                        <span className="px-2 py-0.5 rounded bg-[#21262d] border border-[#30363d] text-gray-300 text-[10px] font-mono font-semibold uppercase">
                          {inv.category}
                        </span>
                        {inv.discountAmount !== undefined && inv.discountAmount > 0 && (
                          <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[10px] font-mono font-semibold flex items-center gap-1">
                            <Tag className="w-3 h-3 text-amber-400" />
                            <span>İskonto: -{formatCurrency(inv.discountAmount)}</span>
                          </span>
                        )}
                        {isOverdue && (
                          <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-mono font-bold">
                            VADESİ GEÇTİ
                          </span>
                        )}
                        {(inv.netAmount === undefined || inv.netAmount === null) && (
                          <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-mono font-medium">
                            eski kayıt (KDV hariç girilmiş)
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

                      {inv.description && (
                        <div className="mt-2">
                          <InvoiceDescriptionSnippet text={inv.description} />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Financial amounts & action buttons */}
                  <div className="flex flex-wrap items-center justify-between lg:justify-end gap-4 border-t lg:border-t-0 pt-3 lg:pt-0 border-[#30363d] font-mono">
                    <div className="text-left lg:text-right">
                      <div className="text-lg font-bold text-white tracking-tight">
                        {formatCurrency(inv.totalAmount)}
                        <span className="text-[11px] font-normal text-gray-400 ml-1.5">(KDV Dahil)</span>
                      </div>
                      <div className="flex flex-wrap items-center lg:justify-end gap-2 text-[11px] text-gray-400 mt-0.5">
                        {inv.grossAmount !== undefined && (
                          <>
                            <span>Ara Toplam: <strong className="text-gray-300 font-semibold">{formatCurrency(inv.grossAmount)}</strong></span>
                            <span>•</span>
                          </>
                        )}
                        {inv.discountAmount !== undefined && inv.discountAmount > 0 && (
                          <>
                            <span className="text-amber-400">İskonto: <strong className="font-semibold">-{formatCurrency(inv.discountAmount)}</strong></span>
                            <span>•</span>
                          </>
                        )}
                        <span>KDV Hariç Net: <strong className="text-gray-300 font-semibold">{formatCurrency(inv.netAmount !== undefined ? inv.netAmount : inv.totalAmount)}</strong></span>
                        <span>•</span>
                        <span>KDV: <strong className="text-orange-400 font-semibold">+{formatCurrency(inv.vatAmount || 0)}</strong></span>
                      </div>
                      <div className="text-[11px] text-gray-400 mt-0.5">
                        Ödenen: <span className="text-emerald-400 font-semibold">{formatCurrency(paid)}</span> | Kalan: <strong className="text-amber-400 font-semibold">{formatCurrency(remaining)}</strong>
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
                    {/* Invoice Note if present */}
                    {inv.description && (
                      <div className="p-3 rounded-lg bg-[#161b22] border border-[#30363d] flex items-start space-x-2 text-xs">
                        <FileText className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold text-gray-300">Fatura Açıklaması / Notu:</span>
                          <p className="text-gray-200 mt-0.5 font-sans whitespace-pre-wrap">{inv.description}</p>
                        </div>
                      </div>
                    )}

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
                              <th className="py-2 px-3 text-center">İskonto</th>
                              <th className="py-2 px-3 text-center">KDV (%)</th>
                              <th className="py-2 px-3 text-right">KDV Hariç Tutar</th>
                              <th className="py-2 px-3 text-right">KDV Tutarı</th>
                              <th className="py-2 px-3 text-right">KDV Dahil Toplam</th>
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
                              const lineTotalWithVat = Math.round((lineNet + lineVat + Number.EPSILON) * 100) / 100;
                              const hasDiscount = it.discountAmount !== undefined && it.discountAmount > 0;

                              return (
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
                                  <td className="py-2 px-3 text-center">
                                    {hasDiscount ? (
                                      <span className="text-amber-400 font-semibold">
                                        {it.discountRate ? `-%${it.discountRate}` : ''} (-{formatCurrency(it.discountAmount!)})
                                      </span>
                                    ) : (
                                      <span className="text-gray-500">-</span>
                                    )}
                                  </td>
                                  <td className="py-2 px-3 text-center text-gray-400">%{it.vatRate}</td>
                                  <td className="py-2 px-3 text-right text-gray-300">
                                    {formatCurrency(lineNet)}
                                  </td>
                                  <td className="py-2 px-3 text-right text-orange-400">
                                    +{formatCurrency(lineVat)}
                                  </td>
                                  <td className="py-2 px-3 text-right font-bold text-white">
                                    {formatCurrency(lineTotalWithVat)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot className="bg-[#0d1117] border-t border-[#30363d] font-bold">
                            <tr>
                              <td colSpan={4} className="py-2.5 px-3 text-right text-gray-400">
                                Toplamlar:
                              </td>
                              <td className="py-2.5 px-3 text-center text-amber-400">
                                {inv.discountAmount !== undefined && inv.discountAmount > 0 ? (
                                  <span>-{formatCurrency(inv.discountAmount)}</span>
                                ) : (
                                  <span className="text-gray-500">-</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-center text-gray-500">-</td>
                              <td className="py-2.5 px-3 text-right text-gray-200">
                                {formatCurrency(inv.netAmount !== undefined ? inv.netAmount : inv.totalAmount)}
                              </td>
                              <td className="py-2.5 px-3 text-right text-orange-400">
                                +{formatCurrency(inv.vatAmount || 0)}
                              </td>
                              <td className="py-2.5 px-3 text-right text-emerald-400 text-sm">
                                {formatCurrency(inv.totalAmount)}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                      {(inv.netAmount === undefined || inv.netAmount === null) && (
                        <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center justify-between">
                          <span>
                            ℹ️ Bu fatura eski sistemle (KDV hariç) girilmiştir. "Düzenle" butonuna tıklayıp faturayı kaydettiğinizde KDV dahil yeni sistemle yeniden hesaplanıp güncellenir.
                          </span>
                          <button
                            type="button"
                            onClick={() => handleOpenEditInvoice(inv)}
                            className="text-amber-400 hover:text-white underline font-semibold cursor-pointer ml-2 whitespace-nowrap"
                          >
                            Düzenle & Güncelle
                          </button>
                        </div>
                      )}
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

              {(() => {
                const cleanVkn = (invoiceForm.taxNumber || '').trim().replace(/\s+/g, '');
                const isVknInvalid =
                  cleanVkn.length > 0 && !(/^\d{10}$/.test(cleanVkn) || /^\d{11}$/.test(cleanVkn));

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-semibold text-gray-300 mb-1 flex items-center justify-between">
                        <span>Firma / Tedarikçi Adı *</span>
                        {existingSuppliers.length > 0 && (
                          <span className="text-[10px] text-orange-400 font-normal">
                            (Öneri için yazın)
                          </span>
                        )}
                      </label>
                      <input
                        type="text"
                        required
                        list="invoice-supplier-suggestions"
                        value={invoiceForm.supplierName}
                        onChange={(e) => handleSupplierNameChange(e.target.value)}
                        placeholder="Örn: Hasan Manav Toptan"
                        className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-white focus:border-orange-500 focus:outline-none font-sans"
                      />
                      <datalist id="invoice-supplier-suggestions">
                        {existingSuppliers.map((s, idx) => (
                          <option key={idx} value={s.name}>
                            {s.taxNumber ? `VKN: ${s.taxNumber} • ${s.category}` : s.category}
                          </option>
                        ))}
                      </datalist>
                    </div>

                    <div>
                      <label className="block font-semibold text-gray-300 mb-1">
                        Vergi Numarası (VKN)
                      </label>
                      <input
                        type="text"
                        value={invoiceForm.taxNumber}
                        onChange={(e) => setInvoiceForm({ ...invoiceForm, taxNumber: e.target.value })}
                        placeholder="10 Haneli VKN veya 11 Haneli TCKN"
                        className={`w-full bg-[#0d1117] border rounded-lg px-3 py-2 text-white focus:outline-none ${
                          isVknInvalid
                            ? 'border-amber-500/70 focus:border-amber-500'
                            : 'border-[#30363d] focus:border-orange-500'
                        }`}
                      />
                      {isVknInvalid && (
                        <span className="text-[10px] text-amber-400 mt-1 block">
                          ⚠️ VKN 10 haneli veya şahıs firması ise 11 haneli TCKN olmalıdır (uyarıdır, kaydı engellemez).
                        </span>
                      )}
                    </div>

                    <div>
                      <label className="block font-semibold text-gray-300 mb-1">
                        Fatura Kategorisi
                      </label>
                      <input
                        type="text"
                        value={invoiceForm.category}
                        onChange={(e) => setInvoiceForm({ ...invoiceForm, category: e.target.value })}
                        placeholder="Örn: Manav, Kasap, Hizmet..."
                        className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-white focus:border-orange-500 focus:outline-none"
                      />
                    </div>
                  </div>
                );
              })()}

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

                {(() => {
                  const formBreakdown = calculateInvoiceBreakdown(
                    invoiceForm.items,
                    invoiceForm.generalDiscountType,
                    invoiceForm.generalDiscountValue
                  );

                  return (
                    <>
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {invoiceForm.items.map((it, idx) => {
                          const itemCalc = formBreakdown.items[idx];
                          return (
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
                                  value={it.quantity ?? ''}
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
                                  value={it.unitPrice ?? ''}
                                  onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                                  placeholder="Birim Fiyat"
                                  className="w-full bg-[#161b22] border border-[#30363d] rounded-lg px-2 py-1.5 text-xs text-right pr-5 font-medium text-white focus:border-orange-500 focus:outline-none"
                                />
                                <span className="absolute right-1.5 top-1.5 text-[10px] text-gray-500">₺</span>
                              </div>

                              {/* Kalem İskontosu */}
                              <div className="flex items-center space-x-1 w-28">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={it.discountInput ?? ''}
                                  onChange={(e) => handleItemChange(idx, 'discountInput', e.target.value)}
                                  placeholder="İskonto"
                                  className="w-16 bg-[#161b22] border border-[#30363d] rounded-lg px-1.5 py-1.5 text-xs text-right font-medium text-amber-300 focus:border-orange-500 focus:outline-none placeholder-gray-600"
                                  title="Kalem iskontosu (% veya TL)"
                                />
                                <select
                                  value={it.discountType || '%'}
                                  onChange={(e) => handleItemChange(idx, 'discountType', e.target.value as '%' | 'TL')}
                                  className="bg-[#161b22] border border-[#30363d] rounded-lg px-1 py-1.5 text-xs text-gray-200 focus:border-orange-500 focus:outline-none cursor-pointer"
                                  title="İskonto Tipi"
                                >
                                  <option value="%">%</option>
                                  <option value="TL">₺</option>
                                </select>
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

                              <div className="w-28 text-right flex flex-col justify-center">
                                <div className="font-bold text-white text-xs">
                                  {formatCurrency(itemCalc ? itemCalc.postLineTotal : 0)}
                                </div>
                                {itemCalc && itemCalc.lineDiscount > 0 ? (
                                  <div className="text-[10px] text-amber-400 whitespace-nowrap">
                                    İsk: -{formatCurrency(itemCalc.lineDiscount)}
                                  </div>
                                ) : (
                                  <div className="text-[10px] text-gray-400 whitespace-nowrap">
                                    KDV Dahil: <span className="text-orange-400 font-semibold">{formatCurrency(itemCalc ? itemCalc.lineTotalWithVat : 0)}</span>
                                  </div>
                                )}
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
                          );
                        })}
                      </div>

                      {/* Genel İskonto & Açıklama / Not Alanları */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        {/* Genel İskonto */}
                        <div className="p-3 rounded-lg bg-[#0d1117] border border-[#30363d] flex flex-col justify-between">
                          <div>
                            <label className="block font-semibold text-gray-300 text-xs mb-1 flex items-center justify-between">
                              <span className="flex items-center space-x-1">
                                <Tag className="w-3.5 h-3.5 text-amber-400" />
                                <span>Genel Fatura İskontosu</span>
                              </span>
                              <span className="text-[10px] text-gray-500 font-normal">Opsiyonel</span>
                            </label>
                            <p className="text-[10px] text-gray-400 leading-tight mb-2">
                              Tüm kalemlere orantılı dağıtılır ve her KDV oranı için iskontolu tutar üzerinden hesaplanır.
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="number"
                              step="0.01"
                              value={invoiceForm.generalDiscountValue}
                              onChange={(e) => setInvoiceForm({ ...invoiceForm, generalDiscountValue: e.target.value })}
                              placeholder="0.00"
                              className="w-full bg-[#161b22] border border-[#30363d] rounded-lg px-2.5 py-1.5 text-xs text-amber-300 font-semibold focus:border-orange-500 focus:outline-none"
                            />
                            <select
                              value={invoiceForm.generalDiscountType}
                              onChange={(e) => setInvoiceForm({ ...invoiceForm, generalDiscountType: e.target.value as '%' | 'TL' })}
                              className="bg-[#161b22] border border-[#30363d] rounded-lg px-2.5 py-1.5 text-xs text-gray-200 focus:border-orange-500 focus:outline-none cursor-pointer"
                            >
                              <option value="%">% (Yüzde)</option>
                              <option value="TL">₺ (Tutar)</option>
                            </select>
                          </div>
                        </div>

                        {/* Açıklama / Not (Çok satırlı) */}
                        <div className="p-3 rounded-lg bg-[#0d1117] border border-[#30363d] flex flex-col justify-between">
                          <label className="block font-semibold text-gray-300 text-xs mb-1 flex items-center justify-between">
                            <span className="flex items-center space-x-1">
                              <FileText className="w-3.5 h-3.5 text-orange-400" />
                              <span>Fatura Açıklaması / Not</span>
                            </span>
                            <span className="text-[10px] text-gray-500 font-normal">Opsiyonel</span>
                          </label>
                          <textarea
                            rows={2}
                            value={invoiceForm.description}
                            onChange={(e) => setInvoiceForm({ ...invoiceForm, description: e.target.value })}
                            placeholder="Fatura açıklaması, irsaliye no, sipariş notu..."
                            className="w-full bg-[#161b22] border border-[#30363d] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-600 focus:border-orange-500 focus:outline-none resize-none font-sans"
                          />
                        </div>
                      </div>

                      {/* İskonto Fazlaysa Kırmızı Uyarı */}
                      {formBreakdown.isDiscountExceeded && (
                        <div className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center space-x-2">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>
                            ⚠️ Toplam iskonto tutarı ({formatCurrency(formBreakdown.totalDiscountAmount)}), fatura ara toplamından ({formatCurrency(formBreakdown.grossAmount)}) fazla olamaz!
                          </span>
                        </div>
                      )}

                      {/* Total Calculation summary box (5 Sıralı Satır) */}
                      <div className="p-4 rounded-xl bg-[#0d1117] text-white border border-[#30363d] space-y-2.5">
                        {/* 1) Ara Toplam (İskonto Öncesi) */}
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-gray-400">
                            Ara Toplam (İskonto Öncesi KDV Hariç):
                          </span>
                          <span className="font-semibold text-gray-200 text-sm">
                            {formatCurrency(formBreakdown.grossAmount)}
                          </span>
                        </div>

                        {/* 2) (-) İskonto (0 ise gizle) */}
                        {formBreakdown.totalDiscountAmount > 0 && (
                          <div className="flex items-center justify-between text-xs text-amber-400 border-t border-[#21262d] pt-2">
                            <div className="flex items-center space-x-1.5">
                              <span className="font-medium">(-) Toplam İskonto:</span>
                              <span className="text-[10px] text-gray-400 font-normal">
                                (Kalem: {formatCurrency(formBreakdown.lineDiscountTotal)} | Genel: {formatCurrency(formBreakdown.generalDiscountAmount)})
                              </span>
                            </div>
                            <span className="font-bold text-sm">
                              -{formatCurrency(formBreakdown.totalDiscountAmount)}
                            </span>
                          </div>
                        )}

                        {/* 3) KDV Hariç Net Tutar */}
                        <div className="flex items-center justify-between text-xs border-t border-[#21262d] pt-2">
                          <span className="font-medium text-gray-400">
                            KDV Hariç Net Tutar ({invoiceForm.items.length} Kalem):
                          </span>
                          <span className="font-semibold text-gray-200 text-sm">
                            {formatCurrency(formBreakdown.netAmount)}
                          </span>
                        </div>

                        {/* 4) KDV Tutarı (Oran Dökümüyle) */}
                        <div className="border-t border-[#21262d] pt-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-gray-400">KDV Tutarı Toplamı:</span>
                            <span className="font-bold text-orange-400 text-sm">
                              +{formatCurrency(formBreakdown.vatAmount)}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[11px] text-gray-400 mt-1 pl-0.5">
                            <span className="text-gray-500 font-semibold">Oran Dökümü:</span>
                            <span className={formBreakdown.vatBreakdown[1]?.vat > 0 ? 'text-gray-200 font-medium' : 'text-gray-500'}>
                              %1 KDV: <strong className={formBreakdown.vatBreakdown[1]?.vat > 0 ? 'text-orange-400' : 'text-gray-400'}>{formatCurrency(formBreakdown.vatBreakdown[1]?.vat || 0)}</strong>
                            </span>
                            <span className="text-gray-600">•</span>
                            <span className={formBreakdown.vatBreakdown[10]?.vat > 0 ? 'text-gray-200 font-medium' : 'text-gray-500'}>
                              %10 KDV: <strong className={formBreakdown.vatBreakdown[10]?.vat > 0 ? 'text-orange-400' : 'text-gray-400'}>{formatCurrency(formBreakdown.vatBreakdown[10]?.vat || 0)}</strong>
                            </span>
                            <span className="text-gray-600">•</span>
                            <span className={formBreakdown.vatBreakdown[20]?.vat > 0 ? 'text-gray-200 font-medium' : 'text-gray-500'}>
                              %20 KDV: <strong className={formBreakdown.vatBreakdown[20]?.vat > 0 ? 'text-orange-400' : 'text-gray-400'}>{formatCurrency(formBreakdown.vatBreakdown[20]?.vat || 0)}</strong>
                            </span>
                          </div>
                        </div>

                        {/* 5) KDV Dahil Genel Toplam */}
                        <div className="border-t border-[#30363d] pt-2.5 flex items-center justify-between">
                          <div>
                            <div className="text-xs font-bold text-white uppercase tracking-wider">
                              KDV Dahil Genel Toplam
                            </div>
                            <div className="text-[10px] text-gray-400">
                              Ödeme, kalan borç ve muhasebe takibi bu tutar üzerinden yapılır
                            </div>
                          </div>
                          <div className="text-xl sm:text-2xl font-extrabold text-orange-400 tracking-tight">
                            {formatCurrency(formBreakdown.totalAmount)}
                          </div>
                        </div>
                      </div>

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
                          disabled={formBreakdown.isDiscountExceeded}
                          className={`px-5 py-2 rounded-lg font-semibold shadow-md ${
                            formBreakdown.isDiscountExceeded
                              ? 'bg-gray-700 text-gray-500 cursor-not-allowed opacity-60'
                              : 'bg-orange-600 hover:bg-orange-500 text-white cursor-pointer'
                          }`}
                        >
                          {editingInvoice ? 'Faturayı Güncelle' : 'Faturayı Kaydet'}
                        </button>
                      </div>
                    </>
                  );
                })()}
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
                  <p className="text-[11px] mt-1">
                    {paymentForm.accountId === 'gunluk-kasa' || !paymentForm.accountId ? (
                      <span className="text-amber-400">
                        ⚠ Bu ödeme seçildiğinde {formatDateTR(paymentForm.date)} tarihli Günlük Nakit Kasadan otomatik düşülecektir.
                      </span>
                    ) : (
                      <span className="text-sky-400">
                        ℹ Bu nakit ödeme seçilen hesaptan düşülecektir; Günlük Kasa'yı etkilemez.
                      </span>
                    )}
                  </p>
                )}
              </div>

              {accounts.length > 0 ? (
                <div>
                  <label className="block font-semibold text-gray-300 mb-1">
                    Ödeme Yapılan Hesap / Kasa *
                  </label>
                  <select
                    value={paymentForm.accountId}
                    onChange={(e) => {
                      const selId = e.target.value;
                      const selAcc = accounts.find((a) => a.id === selId);
                      setPaymentForm({
                        ...paymentForm,
                        accountId: selId,
                        bankOrSource: selAcc ? selAcc.name : paymentForm.bankOrSource,
                      });
                    }}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-white focus:border-orange-500 focus:outline-none"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.type === 'cash' ? 'Kasa' : acc.type === 'bank' ? 'Banka' : 'Hesap'})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
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
              )}

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
      {/* Sequential Cashier Workflow Navigation Footer */}
      {onNavigate && (
        <CashierStepFooter
          currentTab="invoices"
          onNavigate={onNavigate}
        />
      )}
    </div>
  );
};
