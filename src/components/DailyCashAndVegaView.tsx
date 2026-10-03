import React, { useState, useRef } from 'react';
import {
  Wallet,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Plus,
  Trash2,
  Sparkles,
  ArrowRight,
  Info,
  Layers,
  Save,
  HelpCircle,
  Upload,
  Receipt,
  FileText,
  FileCheck,
  Check,
  RefreshCw,
  Calculator,
  ChevronDown,
  ChevronUp,
  ShoppingBag,
  Tag,
} from 'lucide-react';
import { DailyEntry, CashExpense, Invoice, PosDevice, PosZReportItem, CashWithdrawalItem } from '../types';
import { formatCurrency, parseNumberInput, formatDateTR, evaluateMathExpression } from '../utils/formatters';
import {
  calculateDailyRegister,
  getPosTotal,
  getDailyCashExpenses,
  getDailyInvoiceCashPayments,
  getDailyCashWithdrawals,
} from '../utils/calculations';
import { extractTextFromPdf, parseReportText } from '../utils/pdfParser';
import { SmartMoneyInput } from './SmartMoneyInput';
import { CashierStepFooter } from './CashierStepFooter';
import { TabType } from '../types';

interface DailyCashAndVegaViewProps {
  selectedDate?: string;
  currentEntry: DailyEntry;
  onUpdateEntry: (updated: DailyEntry) => void;
  posDevices?: PosDevice[];
  expenses: CashExpense[];
  invoices: Invoice[];
  onOpenVegaImport?: () => void;
  onOpenBossReport?: () => void;
  onOpenQuickImport?: () => void;
  onOpenNewExpense?: () => void;
  onOpenNewInvoice?: () => void;
  onNavigate?: (tab: TabType) => void;
  onPromptOpenAccount?: (amount: number, date: string) => void;
}

export const DailyCashAndVegaView: React.FC<DailyCashAndVegaViewProps> = ({
  selectedDate,
  currentEntry,
  onUpdateEntry,
  posDevices,
  expenses,
  invoices,
  onOpenVegaImport,
  onOpenBossReport,
  onOpenQuickImport,
  onOpenNewExpense,
  onOpenNewInvoice,
  onNavigate,
  onPromptOpenAccount,
}) => {
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  const [pdfSuccessMessage, setPdfSuccessMessage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [expandedVegaGroups, setExpandedVegaGroups] = useState<Record<string, boolean>>({});
  const directPdfInputRef = useRef<HTMLInputElement>(null);

  const toggleVegaGroup = (id: string) => {
    setExpandedVegaGroups(prev => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const expandAllVegaGroups = () => {
    const all: Record<string, boolean> = {};
    (currentEntry.vegaGroups || []).forEach(g => {
      all[g.id] = true;
    });
    setExpandedVegaGroups(all);
  };

  const collapseAllVegaGroups = () => {
    setExpandedVegaGroups({});
  };

  const reg = calculateDailyRegister(currentEntry, expenses, invoices);
  const handleImportClick = onOpenVegaImport || onOpenQuickImport || (() => {});

  // Direct PDF Drop / Upload Handler
  const handleDirectPdfFile = async (file: File) => {
    setIsProcessingPdf(true);
    setPdfSuccessMessage(null);

    try {
      if (file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf') {
        const buffer = await file.arrayBuffer();
        const rawText = await extractTextFromPdf(buffer);
        if (!rawText || rawText.trim().length === 0) {
          throw new Error('PDF dosyasından metin çıkartılamadı.');
        }

        const parsed = parseReportText(rawText);

        const totalSales = parsed.totalSales || 0;
        const grossSales = parsed.grossProductSales || totalSales;
        const discountTotal = parsed.discountAmount || 0;
        const openAccountTotal = parsed.openAccountTotal || 0;
        const rawReportCC = parsed.creditCardSales || 0;
        const otherSales = parsed.otherSales || 0;

        // 1) NAKİT SATIŞ HESABI: kart satışı olarak şunu kullan:
        // efektifKart = (mevcut posReports toplamı > 0) ? posReports toplamı : raporun creditCardSales değeri.
        // cashSales = max(0, totalSales - efektifKart - otherSales).
        // Rapor nakit yazmıyorsa (cashSales <= 0) bu formül kullanılsın.
        // creditCardSales alanına da efektifKart yazılsın.
        const posTotal = getPosTotal(currentEntry.posReports);
        const efektifKart = posTotal > 0 ? posTotal : rawReportCC;
        const derivedCash = Math.max(0, totalSales - efektifKart - otherSales);
        const autoCash = (parsed.cashSales && parsed.cashSales > 0) ? parsed.cashSales : derivedCash;

        // 2) FİİLİ SAYILAN KASA: içe aktarma, kullanıcının elle girdiği actualCashInHand değerinin ÜSTÜNE YAZMASIN.
        // - currentEntry.actualCashInHand > 0 ise aynen koru.
        // - 0 ise: openingCash + cashSales - totalCashOutflow hesapla,
        //   sonuç 0 veya daha büyükse yaz; negatifse 0 bırak.
        const openingCash = Number(currentEntry.openingCash) || 0;
        const dailyCashExpenses = getDailyCashExpenses(expenses, currentEntry.date);
        const dailyInvoiceCash = getDailyInvoiceCashPayments(invoices, currentEntry.date);
        const withdrawals = getDailyCashWithdrawals(currentEntry);
        const totalOutflow = dailyCashExpenses + dailyInvoiceCash + withdrawals;
        const autoRemainingCash = openingCash + autoCash - totalOutflow;

        const currentActualCash = Number(currentEntry.actualCashInHand) || 0;
        const targetActualCash = currentActualCash > 0
          ? currentActualCash
          : (autoRemainingCash >= 0 ? autoRemainingCash : 0);

        const isGroupReportWithoutCardSales = rawReportCC <= 0;

        const updatedVega = {
          ...currentEntry.vegaReport,
          grossProductSales: grossSales,
          discountTotal: discountTotal,
          discountAmount: discountTotal,
          openAccountTotal: openAccountTotal,
          totalSales: totalSales,
          cashSales: autoCash,
          creditCardSales: efektifKart,
          otherSales: otherSales,
          hasVegaCardSales: !isGroupReportWithoutCardSales,
          cardSalesFromPos: isGroupReportWithoutCardSales && posTotal > 0,
          complimentaryAmount: parsed.complimentaryAmount || currentEntry.vegaReport.complimentaryAmount,
          cancelledAmount: parsed.cancelledAmount || currentEntry.vegaReport.cancelledAmount,
          tableCount: parsed.tableCount || currentEntry.vegaReport.tableCount,
          guestCount: parsed.guestCount || currentEntry.vegaReport.guestCount,
        };

        // If parsed posBreakdown exists, update posReports
        let updatedPosReports = currentEntry.posReports;
        if (parsed.posBreakdown && parsed.posBreakdown.length > 0) {
          updatedPosReports = parsed.posBreakdown.map((item, idx) => ({
            id: `pos-${Date.now()}-${idx}`,
            posDeviceId: `pos-dev-${idx}`,
            posDeviceName: item.name,
            bankName: item.name,
            creditCardTotal: item.amount,
            zNumber: '',
            slipCount: 0,
          }));
        }

        const updatedEntry: DailyEntry = {
          ...currentEntry,
          vegaReport: updatedVega,
          vegaGroups: parsed.groups && parsed.groups.length > 0 ? parsed.groups : currentEntry.vegaGroups,
          posReports: updatedPosReports,
          actualCashInHand: targetActualCash,
          updatedAt: new Date().toISOString(),
        };

        const totalItemsParsed = (parsed.groups || []).reduce((s, g) => s + (g.items ? g.items.length : 0), 0);

        // Auto-expand all groups on PDF import
        if (parsed.groups && parsed.groups.length > 0) {
          const autoExp: Record<string, boolean> = {};
          parsed.groups.forEach((g) => {
            autoExp[g.id] = true;
          });
          setExpandedVegaGroups(autoExp);
        }

        onUpdateEntry(updatedEntry);
        setPdfSuccessMessage(
          `✓ PDF Grup Raporu Başarıyla Okundu! ${parsed.groups.length} ürün grubu (${totalItemsParsed > 0 ? `${totalItemsParsed} adet münferit ürün kalemi` : ''}) ayrıştırıldı. Toplam İskonto (-${formatCurrency(discountTotal)}) otomatik düşüldü ve kalan net nakit ${formatCurrency(
            autoRemainingCash
          )} olarak hesaplandı.`
        );

        if (Number(parsed.openAccountTotal) > 0 && onPromptOpenAccount) {
          setTimeout(() => {
            onPromptOpenAccount(Number(parsed.openAccountTotal), currentEntry.date);
          }, 300);
        }
      } else {
        // Trigger modal for excel/other
        handleImportClick();
      }
    } catch (err: any) {
      console.error('PDF Read Error', err);
      alert('PDF okunurken bir hata oluştu. Lütfen dosyanın taranmış metin içerdiğinden emin olunuz veya İçe Aktar penceresini kullanınız.');
    } finally {
      setIsProcessingPdf(false);
    }
  };

  // Sync remaining calculated cash to actual cash in hand
  const handleSyncToActualCash = () => {
    onUpdateEntry({
      ...currentEntry,
      actualCashInHand: reg.expectedCash,
      updatedAt: new Date().toISOString(),
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  // Auto-calculate cash sales from Total Sales minus POS/CC sales
  const handleAutoComputeCashFromSales = () => {
    const total = Number(currentEntry.vegaReport.totalSales) || 0;
    const cc = reg.posTotal > 0 ? reg.posTotal : (Number(currentEntry.vegaReport.creditCardSales) || 0);
    const other = Number(currentEntry.vegaReport.otherSales) || 0;
    const autoCash = Math.max(0, total - cc - other);

    const openingCash = Number(currentEntry.openingCash) || 0;
    const autoRemainingCash = openingCash + autoCash - reg.totalCashOutflow;

    const currentActual = Number(currentEntry.actualCashInHand) || 0;
    const targetActual = currentActual > 0 ? currentActual : (autoRemainingCash >= 0 ? autoRemainingCash : 0);

    onUpdateEntry({
      ...currentEntry,
      vegaReport: {
        ...currentEntry.vegaReport,
        cashSales: autoCash,
        creditCardSales: cc,
      },
      actualCashInHand: targetActual,
      updatedAt: new Date().toISOString(),
    });
  };

  // Vega field updater
  const handleVegaChange = (field: string, val: string | number) => {
    const num = typeof val === 'number' ? val : parseNumberInput(val);
    const currentVega = currentEntry.vegaReport;
    const posTotal = getPosTotal(currentEntry.posReports);
    const effectiveCC = posTotal > 0 ? posTotal : (field === 'creditCardSales' ? num : (Number(currentVega.creditCardSales) || 0));
    const other = field === 'otherSales' ? num : (Number(currentVega.otherSales) || 0);

    const updatedVega: typeof currentVega = {
      ...currentVega,
      [field]: num,
    };

    if (field === 'discountTotal' || field === 'discountAmount') {
      updatedVega.discountTotal = num;
      updatedVega.discountAmount = num;
      const gross = Number(updatedVega.grossProductSales) || (currentEntry.vegaGroups && currentEntry.vegaGroups.length > 0 ? currentEntry.vegaGroups.reduce((s, g) => s + (Number(g.amount) || 0), 0) : 0);
      const openAcc = Number(updatedVega.openAccountTotal) || 0;
      if (gross > 0) {
        const autoNet = Math.max(0, gross - num - openAcc);
        updatedVega.totalSales = autoNet;
        updatedVega.cashSales = Math.max(0, autoNet - effectiveCC - other);
      }
    } else if (field === 'openAccountTotal') {
      updatedVega.openAccountTotal = num;
      const gross = Number(updatedVega.grossProductSales) || (currentEntry.vegaGroups && currentEntry.vegaGroups.length > 0 ? currentEntry.vegaGroups.reduce((s, g) => s + (Number(g.amount) || 0), 0) : 0);
      const disc = Number(updatedVega.discountTotal) || Number(updatedVega.discountAmount) || 0;
      if (gross > 0) {
        const autoNet = Math.max(0, gross - disc - num);
        updatedVega.totalSales = autoNet;
        updatedVega.cashSales = Math.max(0, autoNet - effectiveCC - other);
      }
    } else if (field === 'grossProductSales') {
      updatedVega.grossProductSales = num;
      const disc = Number(updatedVega.discountTotal) || Number(updatedVega.discountAmount) || 0;
      const openAcc = Number(updatedVega.openAccountTotal) || 0;
      const autoNet = Math.max(0, num - disc - openAcc);
      updatedVega.totalSales = autoNet;
      updatedVega.cashSales = Math.max(0, autoNet - effectiveCC - other);
    } else if (field === 'totalSales') {
      // Toplam Net Satış değiştiğinde Kredi Kartı / POS düşülüp Nakit Satış otomatik hesaplanır
      updatedVega.cashSales = Math.max(0, num - effectiveCC - other);
    } else if (field === 'creditCardSales') {
      const total = Number(currentVega.totalSales) || 0;
      if (total > 0) {
        updatedVega.cashSales = Math.max(0, total - num - other);
      } else {
        updatedVega.totalSales = (Number(currentVega.cashSales) || 0) + num + other;
      }
    } else if (field === 'cashSales') {
      updatedVega.totalSales = num + effectiveCC + other;
    } else if (field === 'otherSales') {
      const total = Number(currentVega.totalSales) || 0;
      if (total > 0) {
        updatedVega.cashSales = Math.max(0, total - effectiveCC - num);
      }
    }

    const calculatedCashSales = updatedVega.cashSales ?? (Math.max(0, (Number(updatedVega.totalSales) || 0) - effectiveCC - other));
    const openingCash = Number(currentEntry.openingCash) || 0;
    const autoRemainingCash = openingCash + calculatedCashSales - reg.totalCashOutflow;

    const currentActual = Number(currentEntry.actualCashInHand) || 0;
    const targetActual = currentActual > 0 ? currentActual : (autoRemainingCash >= 0 ? autoRemainingCash : 0);

    onUpdateEntry({
      ...currentEntry,
      vegaReport: updatedVega,
      actualCashInHand: targetActual,
      updatedAt: new Date().toISOString(),
    });
  };

  // POS Z report list updater
  const handlePosChange = (index: number, field: keyof PosZReportItem, val: any, rawExpr?: string) => {
    const updatedPos = [...currentEntry.posReports];
    const item = { ...updatedPos[index] };

    if (field === 'creditCardTotal') {
      item.creditCardTotal = typeof val === 'number' ? val : parseNumberInput(val);
      item.rawExpression = rawExpr;
    } else if (field === 'refundTotal') {
      item.refundTotal = typeof val === 'number' ? val : parseNumberInput(val);
    } else if (field === 'slipCount') {
      item.slipCount = typeof val === 'number' ? val : parseNumberInput(val);
    } else {
      (item as any)[field] = val;
    }

    updatedPos[index] = item;

    // Calculate total of all POS credit cards
    const newPosTotal = updatedPos.reduce((sum, p) => sum + (Number(p.creditCardTotal) || 0), 0);
    const totalSales = Number(currentEntry.vegaReport.totalSales) || 0;
    const otherSales = Number(currentEntry.vegaReport.otherSales) || 0;
    
    // Auto-calculate Cash Sales: Total Sales (Ciro) - POS Total - Other Sales
    const autoCashSales = Math.max(0, totalSales - newPosTotal - otherSales);

    // Auto-calculate expected remaining cash in hand
    const openingCash = Number(currentEntry.openingCash) || 0;
    const autoRemainingCash = openingCash + autoCashSales - reg.totalCashOutflow;

    onUpdateEntry({
      ...currentEntry,
      posReports: updatedPos,
      vegaReport: {
        ...currentEntry.vegaReport,
        creditCardSales: newPosTotal,
        cashSales: autoCashSales,
      },
      actualCashInHand: autoRemainingCash,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleAddPosDevice = () => {
    const newPosItem: PosZReportItem = {
      id: `pos-rep-${Date.now()}`,
      posDeviceId: `custom-pos-${Date.now()}`,
      posDeviceName: `POS ${currentEntry.posReports.length + 1} (Ek Cihaz)`,
      bankName: 'Banka POS',
      zNumber: '',
      creditCardTotal: 0,
      slipCount: 0,
    };
    onUpdateEntry({
      ...currentEntry,
      posReports: [...currentEntry.posReports, newPosItem],
      updatedAt: new Date().toISOString(),
    });
  };

  const handleRemovePos = (index: number) => {
    const updatedPos = currentEntry.posReports.filter((_, i) => i !== index);
    const newPosTotal = updatedPos.reduce((sum, item) => sum + (Number(item.creditCardTotal) || 0), 0);
    const totalSales = Number(currentEntry.vegaReport.totalSales) || 0;
    const otherSales = Number(currentEntry.vegaReport.otherSales) || 0;
    const autoCashSales = Math.max(0, totalSales - newPosTotal - otherSales);
    const openingCash = Number(currentEntry.openingCash) || 0;
    const autoRemainingCash = openingCash + autoCashSales - reg.totalCashOutflow;

    const currentActual = Number(currentEntry.actualCashInHand) || 0;
    const targetActual = currentActual > 0 ? currentActual : (autoRemainingCash >= 0 ? autoRemainingCash : 0);

    onUpdateEntry({
      ...currentEntry,
      posReports: updatedPos,
      vegaReport: {
        ...currentEntry.vegaReport,
        creditCardSales: newPosTotal,
        cashSales: autoCashSales,
      },
      actualCashInHand: targetActual,
      updatedAt: new Date().toISOString(),
    });
  };

  // Cash withdrawal updater
  const handleSave = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* 1. TOP HEADER & DIRECT PDF DROP ZONE */}
      <div className="bg-[#161b22] p-4 sm:p-5 rounded-xl border border-[#30363d] shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2 text-xs font-semibold text-orange-500 uppercase tracking-wider mb-0.5 font-mono">
              <Wallet className="w-4 h-4" />
              <span>GÜNLÜK KASA & PDF GRUP RAPORU YÖNETİMİ</span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {formatDateTR(currentEntry.date)} Kasa & Hasılat Girişi
            </h2>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleSave}
              className="flex items-center space-x-1.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-md transition cursor-pointer font-mono"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saveSuccess ? 'Kaydedildi ✓' : 'Kaydet'}</span>
            </button>
          </div>
        </div>

        {/* DRAG & DROP QUICK BANNER FOR PDF GROUP REPORT */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOver(false);
            const file = e.dataTransfer.files?.[0];
            if (file) handleDirectPdfFile(file);
          }}
          onClick={() => directPdfInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-4 sm:p-5 transition cursor-pointer flex flex-col sm:flex-row items-center justify-between gap-4 ${
            isDragOver
              ? 'border-orange-500 bg-orange-500/10'
              : 'border-[#30363d] hover:border-orange-500/50 bg-[#0d1117]'
          }`}
        >
          <input
            ref={directPdfInputRef}
            type="file"
            accept=".pdf,application/pdf"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleDirectPdfFile(f);
            }}
            className="hidden"
          />

          <div className="flex items-center space-x-3.5">
            <div className="p-3 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20 flex-shrink-0">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-white font-mono">
                  Vega / POS Grup Raporu PDF Dosyasını Buraya Sürükleyin
                </span>
              </div>
            </div>
          </div>

          <div className="flex-shrink-0 flex items-center space-x-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleImportClick();
              }}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-xs font-mono font-semibold text-gray-200 hover:text-white transition cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-orange-400" />
              <span>Excel / Metin</span>
            </button>

            <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#161b22] border border-[#30363d] text-xs font-mono font-semibold text-gray-300 hover:text-white">
              {isProcessingPdf ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-orange-400" />
                  <span>PDF Taranıyor...</span>
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5 text-orange-400" />
                  <span>PDF Seç veya Sürükle</span>
                </>
              )}
            </span>
          </div>
        </div>

        {/* Success Alert */}
        {pdfSuccessMessage && (
          <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/30 text-emerald-400 text-xs font-mono flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{pdfSuccessMessage}</span>
            </div>
            <button
              onClick={() => setPdfSuccessMessage(null)}
              className="text-gray-400 hover:text-white font-bold ml-2 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* 2. PROMINENT AUTOMATIC CASH CALCULATION & STATUS BANNER */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 font-mono">
        <div className="p-3.5 sm:p-4 bg-[#161b22] border border-[#30363d] rounded-xl shadow-md min-w-0">
          <span className="text-[11px] sm:text-xs text-gray-400 uppercase font-semibold block whitespace-nowrap truncate" title="1. Toplam Ciro (Vega)">
            1. Toplam Ciro (Vega)
          </span>
          <div className="text-xl font-bold text-white mt-1 whitespace-nowrap truncate">
            {formatCurrency(reg.totalSales)}
          </div>
          <span className="text-[11px] text-gray-400 block mt-0.5 font-medium whitespace-nowrap truncate" title="Grup raporu toplam hasılatı">
            Grup raporu hasılatı
          </span>
        </div>

        <div className="p-3.5 sm:p-4 bg-[#161b22] border border-[#30363d] rounded-xl shadow-md min-w-0">
          <span className="text-[11px] sm:text-xs text-gray-400 uppercase font-semibold block whitespace-nowrap truncate" title="2. Kredi Kartı / POS Z Toplamı">
            2. Kredi Kartı / POS Z
          </span>
          <div className="text-xl font-bold text-sky-400 mt-1 whitespace-nowrap truncate">
            {formatCurrency(reg.posTotal > 0 ? reg.posTotal : reg.creditCardSales)}
          </div>
          <span className="text-[11px] text-sky-400 block mt-0.5 font-medium whitespace-nowrap truncate" title="Terminallerden çekilen tutar">
            Terminallerden çekilen
          </span>
        </div>

        <div className="p-3.5 sm:p-4 bg-[#161b22] border border-[#30363d] rounded-xl shadow-md min-w-0">
          <span className="text-[11px] sm:text-xs text-gray-400 uppercase font-semibold block whitespace-nowrap truncate" title="3. Çıkan Kasa Gider & Fatura">
            3. Çıkan Gider & Fatura
          </span>
          <div className="text-xl font-bold text-rose-400 mt-1 whitespace-nowrap truncate">
            -{formatCurrency(reg.totalCashOutflow)}
          </div>
          <span className="text-[11px] text-rose-400/90 block mt-0.5 font-medium whitespace-nowrap truncate" title="Giderler + Fatura nakit çıkışları">
            Giderler + Fatura çıkışı
          </span>
        </div>

        <div className="p-3.5 sm:p-4 bg-orange-500/10 border-2 border-orange-500/60 rounded-xl shadow-lg relative overflow-hidden min-w-0">
          <div className="flex items-center justify-between gap-1.5 min-w-0">
            <span className="text-[11px] sm:text-xs text-orange-400 uppercase font-bold tracking-wider whitespace-nowrap truncate" title="Otomatik Kalan Net Nakit">
              Kalan Net Nakit
            </span>
            <button
              onClick={handleSyncToActualCash}
              title="Kalan nakiti fiili kasa sayımı ile eşitle"
              className="text-[10px] sm:text-xs bg-orange-600 hover:bg-orange-500 text-white font-bold px-2 py-0.5 rounded transition cursor-pointer shadow-sm whitespace-nowrap flex-shrink-0"
            >
              Eşitle ✓
            </button>
          </div>
          <div className="text-2xl font-bold text-orange-400 mt-1 whitespace-nowrap truncate">
            {formatCurrency(reg.expectedCash)}
          </div>
          <span className="text-[11px] text-gray-300 block mt-0.5 font-medium whitespace-nowrap truncate" title="Devir + Nakit - (Giderler + Fatura)">
            Devir + Nakit - Çıkışlar
          </span>
        </div>
      </div>

      {/* 3. MAIN WORKSPACE (Vertical Stack: POS on Top, Vega underneath) */}
      <div className="flex flex-col gap-6">
        {/* Section 1: POS Cihazları Z Raporları (Üstte) */}
        <div className="space-y-6">
          <div className="bg-[#161b22] rounded-xl border border-[#30363d] p-5 shadow-lg">
            <div className="flex items-center justify-between border-b border-[#30363d] pb-3.5 mb-3">
              <div className="flex items-center space-x-3">
                <span className="w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400 font-mono font-bold text-xs flex items-center justify-center">
                  1
                </span>
                <div>
                  <h3 className="font-bold text-white text-sm font-mono flex items-center space-x-2">
                    <span>POS Cihazları Z Raporları</span>
                    <span className="text-[10px] bg-sky-500/20 text-sky-300 font-semibold px-2 py-0.5 rounded border border-sky-500/30">
                      Çoklu Z & (+) Toplama Destekli
                    </span>
                  </h3>
                  <span className="text-xs text-gray-400 font-mono">
                    Tüm banka terminallerinin gün sonu Z raporu tutarları
                  </span>
                </div>
              </div>

              <button
                onClick={handleAddPosDevice}
                className="flex items-center space-x-1 text-xs bg-[#21262d] hover:bg-[#30363d] text-sky-400 font-semibold px-2.5 py-1.5 rounded-lg border border-[#30363d] transition cursor-pointer font-mono"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ POS Ekle</span>
              </button>
            </div>

            {/* Helpful Quick Tip for Multi-Z and Comma support */}
            <div className="mb-4 p-2.5 bg-sky-500/10 rounded-lg border border-sky-500/30 flex items-start space-x-2 text-xs font-mono text-sky-300">
              <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
              <div>
                <span>
                  <strong>Çift Z Raporu / Toplama:</strong> Gün içinde aynı cihazdan 2 veya daha fazla Z raporu çıktıysa, tutara araya <strong>+</strong> koyarak yazabilirsiniz (Örn: <strong>1.450,50 + 720,25</strong>). Virgüllü küsuratlar otomatik toplanır.
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {currentEntry.posReports.map((pos, index) => {
                const isMultiZ = (pos.rawExpression && pos.rawExpression.includes('+')) || false;

                return (
                  <div
                    key={pos.id || index}
                    className={`bg-[#0d1117] p-3.5 rounded-lg border transition ${
                      isMultiZ ? 'border-sky-500/50 bg-sky-500/10' : 'border-[#30363d]'
                    } flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={pos.posDeviceName}
                          onChange={(e) => handlePosChange(index, 'posDeviceName', e.target.value)}
                          className="font-bold text-xs text-gray-200 bg-transparent border-b border-transparent hover:border-[#30363d] focus:border-sky-500 focus:outline-none w-full"
                        />
                        {isMultiZ && (
                          <span className="text-[10px] bg-sky-500/20 text-sky-300 font-bold px-1.5 py-0.5 rounded shrink-0">
                            Çift Z
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 mt-1.5">
                        <span className="text-[11px] text-gray-500">Z No:</span>
                        <input
                          type="text"
                          value={pos.zNumber || ''}
                          onChange={(e) => handlePosChange(index, 'zNumber', e.target.value)}
                          placeholder="0084 veya 14+15"
                          className="bg-[#161b22] border border-[#30363d] rounded px-2 py-0.5 text-xs text-gray-200 w-28 font-mono focus:border-sky-500 focus:outline-none"
                        />
                        <span className="text-[11px] text-gray-500">Fiş Adet:</span>
                        <input
                          type="text"
                          value={pos.slipCount || ''}
                          onChange={(e) => handlePosChange(index, 'slipCount', e.target.value)}
                          placeholder="0"
                          className="bg-[#161b22] border border-[#30363d] rounded px-2 py-0.5 text-xs text-gray-200 w-16 font-mono focus:border-sky-500 focus:outline-none text-right"
                        />
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <div className="w-44">
                        <SmartMoneyInput
                          value={pos.creditCardTotal}
                          rawExpression={pos.rawExpression}
                          onChange={(val, rawExpr) => handlePosChange(index, 'creditCardTotal', val, rawExpr)}
                          placeholder="0,00"
                          className="px-3 py-1.5 text-xs font-bold text-sky-400 focus:border-sky-500"
                          showLiveSum={true}
                        />
                      </div>

                      {currentEntry.posReports.length > 1 && (
                        <button
                          onClick={() => handleRemovePos(index)}
                          className="p-1.5 text-gray-500 hover:text-rose-400 rounded transition cursor-pointer"
                          title="POS Kaydını Kaldır"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* POS Total Summary Bar */}
            <div className="mt-4 pt-3 border-t border-[#30363d] flex items-center justify-between font-mono">
              <span className="text-xs font-semibold text-gray-400">
                TOPLAM POS Z RAPORLARI ({currentEntry.posReports.length} Cihaz):
              </span>
              <strong className="text-lg font-bold text-sky-400">
                {formatCurrency(reg.posTotal)}
              </strong>
            </div>
          </div>
        </div>

        {/* Section 2: Vega Satışları & Ürün Grupları (Altta) */}
        <div className="space-y-6">
          {/* Section A: Vega / PDF Satış Raporu */}
          <div className="bg-[#161b22] rounded-xl border border-[#30363d] p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-[#30363d] pb-3.5">
              <div className="flex items-center space-x-3">
                <span className="w-7 h-7 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-400 font-mono font-bold text-xs flex items-center justify-center">
                  2
                </span>
                <div>
                  <h3 className="font-bold text-white text-sm font-mono">
                    Grup Raporu Satışları & Hasılat
                  </h3>
                  <span className="text-xs text-gray-400 font-mono">
                    PDF'ten aktarılan veya otomatik hesaplanan satış dağılımı
                  </span>
                </div>
              </div>
            </div>

            {/* Top breakdown formula: Brüt - İskonto - Açık Hesap = Net Ciro */}
            {(currentEntry.vegaReport.grossProductSales || currentEntry.vegaReport.discountAmount || currentEntry.vegaReport.discountTotal || currentEntry.vegaReport.openAccountTotal || (currentEntry.vegaGroups && currentEntry.vegaGroups.length > 0)) ? (
              <div className="p-3 bg-[#0d1117] rounded-lg border border-[#30363d] grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs shadow-inner">
                <div className="flex flex-col items-center justify-center text-center">
                  <span className="text-gray-400 text-xs uppercase font-semibold text-center">1. Brüt Ürün Satışı:</span>
                  <span className="font-bold text-white text-sm text-center mt-0.5">
                    {formatCurrency(currentEntry.vegaReport.grossProductSales || (currentEntry.vegaGroups && currentEntry.vegaGroups.length > 0 ? currentEntry.vegaGroups.reduce((s, g) => s + (Number(g.amount) || 0), 0) : currentEntry.vegaReport.totalSales))}
                  </span>
                </div>

                <div className="flex flex-col items-center justify-center text-center">
                  <span className="text-rose-400 text-xs uppercase font-bold text-center">2. (-) Toplam İskonto:</span>
                  <span className="font-bold text-rose-400 text-sm text-center mt-0.5">
                    -{formatCurrency(currentEntry.vegaReport.discountTotal || currentEntry.vegaReport.discountAmount || 0)}
                  </span>
                </div>

                <div className="flex flex-col items-center justify-center text-center">
                  <span className="text-amber-400 text-xs uppercase font-bold text-center">3. (-) Açık Hesap (Cari):</span>
                  <span className="font-bold text-amber-400 text-sm text-center mt-0.5">
                    -{formatCurrency(currentEntry.vegaReport.openAccountTotal || 0)}
                  </span>
                </div>

                <div className="flex flex-col items-center justify-center text-center">
                  <span className="text-emerald-400 text-xs uppercase font-bold text-center">4. (=) Net Genel Kasa:</span>
                  <span className="font-bold text-emerald-400 text-sm text-center mt-0.5">
                    {formatCurrency(currentEntry.vegaReport.totalSales)}
                  </span>
                </div>
              </div>
            ) : null}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {/* Toplam Satış Ciro */}
              <div>
                <div className="flex items-center justify-between mb-1.5 min-h-[22px]">
                  <label className="block text-xs font-semibold text-gray-300 font-mono truncate">
                    Toplam Net Satış (Ciro) *
                  </label>
                </div>
                <SmartMoneyInput
                  value={currentEntry.vegaReport.totalSales}
                  onChange={(val) => handleVegaChange('totalSales', val)}
                  placeholder="0,00"
                  className="text-sm font-bold text-white focus:border-orange-500"
                />
              </div>

              {/* Credit Card Sales */}
              <div>
                <div className="flex items-center justify-between mb-1.5 min-h-[22px]">
                  <label className="block text-xs font-semibold text-gray-300 font-mono truncate">
                    Kredi Kartı Satış (POS) *
                  </label>
                </div>
                <SmartMoneyInput
                  value={currentEntry.vegaReport.creditCardSales}
                  onChange={(val) => handleVegaChange('creditCardSales', val)}
                  placeholder="0,00"
                  className="text-sm font-bold text-sky-400 focus:border-sky-500"
                />
              </div>

              {/* Cash Sales (Auto inferred or manual) */}
              <div>
                <div className="flex items-center justify-between mb-1.5 min-h-[22px]">
                  <label className="block text-xs font-semibold text-gray-300 font-mono truncate">
                    Nakit Satış Hasılatı
                  </label>
                  <span className="text-[10px] text-emerald-400 font-mono font-medium px-1.5 py-0.5 bg-emerald-500/10 rounded border border-emerald-500/20 shrink-0">
                    Otomatik
                  </span>
                </div>
                <SmartMoneyInput
                  value={currentEntry.vegaReport.cashSales}
                  onChange={(val) => handleVegaChange('cashSales', val)}
                  placeholder="0,00"
                  className="text-sm font-bold text-emerald-400 focus:border-emerald-500"
                />
              </div>

              {/* Toplam İskonto */}
              <div>
                <div className="flex items-center justify-between gap-1 mb-1.5 min-h-[22px]">
                  <label className="block text-xs font-semibold text-rose-400 font-mono truncate" title="Toplam İskonto (İndirim)">
                    (-) Toplam İskonto
                  </label>
                  <span className="text-[10px] text-rose-400 font-mono font-medium px-1.5 py-0.5 bg-rose-500/10 rounded border border-rose-500/20 shrink-0">
                    Düşülür
                  </span>
                </div>
                <SmartMoneyInput
                  value={currentEntry.vegaReport.discountTotal || currentEntry.vegaReport.discountAmount}
                  onChange={(val) => handleVegaChange('discountTotal', val)}
                  placeholder="0,00"
                  className="text-sm font-bold text-rose-400 border-rose-500/40 focus:border-rose-500"
                />
              </div>

              {/* Açık Hesap (Cari / Veresiye) */}
              <div>
                <div className="flex items-center justify-between gap-1 mb-1.5 min-h-[22px]">
                  <label className="block text-xs font-semibold text-amber-400 font-mono truncate" title="Açık Hesap / Cari (Veresiye)">
                    (-) Açık Hesap (Cari)
                  </label>
                  <div className="flex items-center space-x-1.5 font-mono text-[10px] shrink-0">
                    {Number(currentEntry.vegaReport.openAccountTotal) > 0 && onPromptOpenAccount && (
                      <button
                        type="button"
                        onClick={() =>
                          onPromptOpenAccount(
                            Number(currentEntry.vegaReport.openAccountTotal),
                            currentEntry.date
                          )
                        }
                        className="text-orange-400 hover:text-orange-300 font-bold underline cursor-pointer"
                        title="Bu açık hesabı bir müşteriye borç olarak ata"
                      >
                        Ata ➜
                      </button>
                    )}
                    <span className="text-amber-400 font-medium px-1.5 py-0.5 bg-amber-500/10 rounded border border-amber-500/20">
                      Veresiye
                    </span>
                  </div>
                </div>
                <SmartMoneyInput
                  value={currentEntry.vegaReport.openAccountTotal}
                  onChange={(val) => handleVegaChange('openAccountTotal', val)}
                  placeholder="0,00"
                  className="text-sm font-bold text-amber-400 border-amber-500/40 focus:border-amber-500"
                />
              </div>

              {/* Brüt Ürün Satışı */}
              <div>
                <div className="flex items-center justify-between mb-1.5 min-h-[22px]">
                  <label className="block text-xs font-semibold text-gray-300 font-mono truncate" title="Brüt Ürün Satışı (Liste Fiyatı)">
                    Brüt Ürün Satışı
                  </label>
                  <span className="text-[10px] text-gray-400 font-mono font-medium px-1.5 py-0.5 bg-gray-500/10 rounded border border-gray-500/20 shrink-0">
                    Liste Fiyatı
                  </span>
                </div>
                <SmartMoneyInput
                  value={currentEntry.vegaReport.grossProductSales}
                  onChange={(val) => handleVegaChange('grossProductSales', val)}
                  placeholder="0,00"
                  className="text-sm font-bold text-gray-200 focus:border-orange-500"
                />
              </div>
            </div>

            {/* Live Formula Banner: Net Satış - Kredi Ödemeleri = Kalan Nakit Hasılat */}
            <div className="p-3 bg-[#0d1117] rounded-xl border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
              <div className="flex items-start sm:items-center space-x-2.5">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                  <Calculator className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-gray-200 font-bold flex items-center space-x-1.5">
                    <span>Kredi Düşüldükten Sonra Kalan Nakit Hasılat:</span>
                    <span className="text-emerald-400 font-bold text-sm">
                      {formatCurrency(reg.cashSales)}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Net Ciro ({formatCurrency(reg.totalSales)}) - Kredi Kartı/POS ({formatCurrency(reg.posTotal > 0 ? reg.posTotal : reg.creditCardSales)})
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 shrink-0 bg-[#161b22] px-3 py-1.5 rounded-lg border border-orange-500/30">
                <span className="text-[11px] text-gray-400">Kalan Net Kasa:</span>
                <span className="text-orange-400 font-bold text-sm">
                  {formatCurrency(reg.expectedCash)}
                </span>
              </div>
            </div>

            {/* Extracted Product Groups Accordion View */}
            {currentEntry.vegaGroups && currentEntry.vegaGroups.length > 0 && (
              <div className="pt-4 border-t border-[#30363d] space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-gray-200 flex items-center space-x-1.5">
                      <Layers className="w-4 h-4 text-orange-400" />
                      <span>Ürün Grupları & Satış Kalemleri ({currentEntry.vegaGroups.length} Grup):</span>
                    </span>
                    <span className="text-[11px] text-gray-400">
                      (Açmak/kapatmak için kategoriye tıklayın)
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={expandAllVegaGroups}
                      className="px-2 py-1 bg-[#21262d] hover:bg-[#30363d] text-gray-300 text-[11px] rounded border border-[#30363d] transition cursor-pointer"
                    >
                      Tümünü Aç
                    </button>
                    <button
                      type="button"
                      onClick={collapseAllVegaGroups}
                      className="px-2 py-1 bg-[#21262d] hover:bg-[#30363d] text-gray-300 text-[11px] rounded border border-[#30363d] transition cursor-pointer"
                    >
                      Tümünü Kapat
                    </button>
                    {onNavigate && (
                      <button
                        type="button"
                        onClick={() => onNavigate('groups')}
                        className="text-orange-400 hover:text-orange-300 underline font-semibold text-[11px] ml-1 cursor-pointer"
                      >
                        Tam Rapor Ekranı →
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-2 font-mono">
                  {currentEntry.vegaGroups.map((grp, idx) => {
                    const isExpanded = !!expandedVegaGroups[grp.id];
                    const items = grp.items || [];
                    const totalQty = items.length > 0
                      ? items.reduce((s, it) => s + (Number(it.quantity) || 0), 0)
                      : (Number(grp.itemCount) || 0);
                    const totalAmount = items.length > 0
                      ? (items.reduce((s, it) => s + (Number(it.totalPrice) || 0), 0) || (Number(grp.amount) || 0))
                      : (Number(grp.amount) || 0);

                    return (
                      <div
                        key={grp.id || idx}
                        className="bg-[#0d1117] rounded-lg border border-[#30363d] overflow-hidden transition-all duration-200"
                      >
                        {/* Group Header Row - Clickable */}
                        <div
                          onClick={() => toggleVegaGroup(grp.id)}
                          className={`p-3 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition select-none ${
                            isExpanded ? 'bg-[#1c2128] border-b border-[#30363d]' : 'hover:bg-[#161b22]'
                          }`}
                        >
                          {/* Group Name & Badge */}
                          <div className="flex items-center space-x-2.5">
                            <span className="text-gray-400 flex items-center justify-center">
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-orange-400" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-gray-500" />
                              )}
                            </span>
                            <span className="text-white font-bold text-xs uppercase tracking-wider">
                              {grp.name}
                            </span>
                            <span className="text-[10px] bg-orange-500/10 text-orange-400 border border-orange-500/30 px-2 py-0.5 rounded font-semibold">
                              {items.length > 0 ? `${items.length} Kalem` : `${totalQty} Adet`}
                            </span>
                          </div>

                          {/* Group Summary: Total Sold Quantity & Total Sales Amount */}
                          <div className="flex items-center space-x-3 text-xs pl-6 sm:pl-0">
                            <div className="flex items-center space-x-1.5 bg-[#161b22] px-2.5 py-1 rounded border border-[#30363d]">
                              <span className="text-gray-400 text-[11px]">Toplam Satış:</span>
                              <span className="text-sky-400 font-bold">{totalQty} Adet</span>
                            </div>

                            <div className="flex items-center space-x-1.5 bg-[#161b22] px-2.5 py-1 rounded border border-[#30363d]">
                              <span className="text-gray-400 text-[11px]">Toplam Tutar:</span>
                              <span className="text-emerald-400 font-bold">{formatCurrency(totalAmount)}</span>
                            </div>

                            {grp.percentage ? (
                              <span className="text-[11px] text-orange-400 font-semibold hidden md:inline-block">
                                %{grp.percentage} Pay
                              </span>
                            ) : null}
                          </div>
                        </div>

                        {/* Collapsible Sub-Items Table */}
                        {isExpanded && (
                          <div className="p-3 bg-[#0d1117] text-xs space-y-2">
                            {items.length === 0 ? (
                              <div className="text-center py-2.5 text-gray-500 text-[11px]">
                                Bu grupta listelenmiş alt ürün bulunmuyor. Toplam satış adedi: <strong>{totalQty} Adet</strong>, Tutar: <strong>{formatCurrency(totalAmount)}</strong>
                              </div>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                  <thead>
                                    <tr className="text-gray-500 border-b border-[#30363d]/80 pb-1.5 text-[10px] uppercase font-semibold">
                                      <th className="py-1.5 px-2">#</th>
                                      <th className="py-1.5 px-2">Satılan Ürün</th>
                                      <th className="py-1.5 px-2 text-right">Satılan Adet</th>
                                      <th className="py-1.5 px-2 text-right">Birim Fiyat</th>
                                      <th className="py-1.5 px-2 text-right">Toplam Tutar</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-[#30363d]/40">
                                    {items.map((item, itemIdx) => (
                                      <tr key={item.id || itemIdx} className="hover:bg-[#161b22]/60 transition">
                                        <td className="py-1.5 px-2 text-gray-500 text-[11px]">
                                          {itemIdx + 1}
                                        </td>
                                        <td className="py-1.5 px-2 font-medium text-gray-200">
                                          {item.name}
                                        </td>
                                        <td className="py-1.5 px-2 text-right font-bold text-sky-400">
                                          {item.quantity} Ad.
                                        </td>
                                        <td className="py-1.5 px-2 text-right text-gray-300 font-mono">
                                          {formatCurrency(item.unitPrice)}
                                        </td>
                                        <td className="py-1.5 px-2 text-right font-bold text-emerald-400 font-mono">
                                          {formatCurrency(item.totalPrice)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}

                            {/* Subtotal Summary Footer for the Group */}
                            <div className="pt-2 border-t border-[#30363d] flex items-center justify-between text-[11px] text-gray-400">
                              <span><strong>{grp.name}</strong> Alt Kalemleri ({items.length} Çeşit):</span>
                              <div className="flex items-center space-x-2">
                                <span className="text-sky-400 font-semibold">{totalQty} Adet</span>
                                <span>•</span>
                                <span className="text-emerald-400 font-bold text-xs">{formatCurrency(totalAmount)}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Overall Vega Groups & Products Total Summary Bar */}
                {(() => {
                  const allGroupsTotalQty = currentEntry.vegaGroups.reduce(
                    (sum, g) =>
                      sum +
                      (g.items && g.items.length > 0
                        ? g.items.reduce((s, it) => s + (Number(it.quantity) || 0), 0)
                        : Number(g.itemCount) || 0),
                    0
                  );
                  const allGroupsTotalAmount = currentEntry.vegaGroups.reduce(
                    (sum, g) =>
                      sum +
                      (g.items && g.items.length > 0
                        ? g.items.reduce((s, it) => s + (Number(it.totalPrice) || 0), 0)
                        : Number(g.amount) || 0),
                    0
                  );
                  const allGroupsItemsCount = currentEntry.vegaGroups.reduce(
                    (sum, g) => sum + (g.items ? g.items.length : 0),
                    0
                  );
                  const discountVal =
                    currentEntry.vegaReport.discountTotal || currentEntry.vegaReport.discountAmount || 0;
                  const openAccountVal = currentEntry.vegaReport.openAccountTotal || 0;
                  const netVal = currentEntry.vegaReport.totalSales || Math.max(0, allGroupsTotalAmount - discountVal - openAccountVal);

                  return (
                    <div className="mt-3 p-3.5 bg-[#161b22] rounded-lg border border-orange-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono shadow-md">
                      <div className="flex items-center space-x-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-orange-400"></span>
                        <span className="text-gray-200 font-bold uppercase tracking-wider">
                          Tüm Gruplar Toplamı ({currentEntry.vegaGroups.length} Grup
                          {allGroupsItemsCount > 0 ? `, ${allGroupsItemsCount} Kalem` : ''}):
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center space-x-1.5 bg-[#0d1117] px-2.5 py-1 rounded border border-[#30363d]">
                          <span className="text-gray-400 text-[11px]">Toplam Satılan:</span>
                          <span className="text-sky-400 font-bold">{allGroupsTotalQty} Adet</span>
                        </div>

                        <div className="flex items-center space-x-1.5 bg-[#0d1117] px-2.5 py-1 rounded border border-[#30363d]">
                          <span className="text-gray-400 text-[11px]">Brüt Ürün Cirosu:</span>
                          <span className="text-white font-bold">{formatCurrency(allGroupsTotalAmount)}</span>
                        </div>

                        {discountVal > 0 && (
                          <div className="flex items-center space-x-1.5 bg-rose-500/10 px-2.5 py-1 rounded border border-rose-500/30">
                            <span className="text-rose-400 text-xs font-semibold">İskonto:</span>
                            <span className="text-rose-400 font-bold">-{formatCurrency(discountVal)}</span>
                          </div>
                        )}

                        {openAccountVal > 0 && (
                          <div className="flex items-center space-x-1.5 bg-amber-500/10 px-2.5 py-1 rounded border border-amber-500/30">
                            <span className="text-amber-400 text-xs font-semibold">Açık Hesap:</span>
                            <span className="text-amber-400 font-bold">-{formatCurrency(openAccountVal)}</span>
                          </div>
                        )}

                        <div className="flex items-center space-x-1.5 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/40">
                          <span className="text-emerald-400 text-xs font-semibold">Net Genel Kasa:</span>
                          <span className="text-emerald-400 font-bold text-sm">{formatCurrency(netVal)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sequential Cashier Workflow Navigation Footer */}
      {onNavigate && (
        <CashierStepFooter
          currentTab="daily"
          onNavigate={onNavigate}
        />
      )}
    </div>
  );
};
