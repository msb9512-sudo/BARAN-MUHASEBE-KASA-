import React, { useState } from 'react';
import {
  Layers,
  Plus,
  Trash2,
  PieChart,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Search,
  Tag,
  DollarSign,
  ShoppingBag,
  Percent,
  Calculator,
  ArrowDown,
  Edit2,
  Save,
} from 'lucide-react';
import { DailyEntry, VegaGroupItem, SoldProductItem } from '../types';
import { formatCurrency, formatPercent, parseNumberInput, formatDateTR } from '../utils/formatters';

interface VegaGroupReportViewProps {
  currentEntry: DailyEntry;
  onUpdateEntry: (updated: DailyEntry) => void;
  onOpenVegaImport?: () => void;
}

export const VegaGroupReportView: React.FC<VegaGroupReportViewProps> = ({
  currentEntry,
  onUpdateEntry,
  onOpenVegaImport,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemData, setEditingItemData] = useState<Partial<SoldProductItem>>({});

  const groups = currentEntry.vegaGroups || [];
  
  // Calculate totals
  const totalGroupAmount = groups.reduce((sum, g) => sum + (Number(g.amount) || 0), 0);
  const totalItemsCount = groups.reduce(
    (sum, g) => sum + (g.items ? g.items.reduce((s, it) => s + (Number(it.quantity) || 0), 0) : (Number(g.itemCount) || 0)),
    0
  );

  // Discount & Summary Data
  const grossSales = currentEntry.vegaReport?.grossProductSales || totalGroupAmount;
  const discountTotal = currentEntry.vegaReport?.discountTotal || currentEntry.vegaReport?.discountAmount || 0;
  const openAccountTotal = currentEntry.vegaReport?.openAccountTotal || 0;
  const openTablesTotal = currentEntry.vegaReport?.openTablesTotal || 0;
  const netGeneralTotal = currentEntry.vegaReport?.totalSales || Math.max(0, grossSales - discountTotal - openAccountTotal);

  // Toggle group expansion
  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const expandAll = () => {
    const all: Record<string, boolean> = {};
    groups.forEach(g => {
      all[g.id] = true;
    });
    setExpandedGroups(all);
  };

  const collapseAll = () => {
    setExpandedGroups({});
  };

  // Group updater
  const handleGroupChange = (index: number, field: keyof VegaGroupItem, val: any) => {
    const updated = [...groups];
    updated[index] = {
      ...updated[index],
      [field]: field === 'amount' || field === 'itemCount' ? parseNumberInput(val) : val,
    };

    // recalculate percentages
    const newTotal = updated.reduce((sum, g) => sum + (Number(g.amount) || 0), 0);
    const withPerc = updated.map((g) => ({
      ...g,
      percentage: newTotal > 0 ? ((Number(g.amount) || 0) / newTotal) * 100 : 0,
    }));

    // Auto update gross and net
    const autoGross = newTotal;
    const autoNet = Math.max(0, autoGross - discountTotal - openAccountTotal);

    onUpdateEntry({
      ...currentEntry,
      vegaGroups: withPerc,
      vegaReport: {
        ...currentEntry.vegaReport,
        grossProductSales: autoGross,
        totalSales: autoNet,
      },
      updatedAt: new Date().toISOString(),
    });
  };

  // Item updater within group
  const handleItemUpdate = (groupIndex: number, itemIndex: number, field: keyof SoldProductItem, val: any) => {
    const updatedGroups = [...groups];
    const group = { ...updatedGroups[groupIndex] };
    const items = [...(group.items || [])];

    const currentItem = { ...items[itemIndex] };
    if (field === 'quantity') {
      const q = parseNumberInput(val);
      currentItem.quantity = q;
      currentItem.totalPrice = Math.round(q * (currentItem.unitPrice || 0) * 100) / 100;
    } else if (field === 'unitPrice') {
      const p = parseNumberInput(val);
      currentItem.unitPrice = p;
      currentItem.totalPrice = Math.round((currentItem.quantity || 0) * p * 100) / 100;
    } else if (field === 'totalPrice') {
      const t = parseNumberInput(val);
      currentItem.totalPrice = t;
      if (currentItem.quantity > 0) {
        currentItem.unitPrice = Math.round((t / currentItem.quantity) * 100) / 100;
      }
    } else {
      (currentItem as any)[field] = val;
    }

    items[itemIndex] = currentItem;
    group.items = items;
    group.amount = items.reduce((s, it) => s + (Number(it.totalPrice) || 0), 0);
    group.itemCount = items.reduce((s, it) => s + (Number(it.quantity) || 0), 0);

    updatedGroups[groupIndex] = group;

    // Recalculate total gross & net
    const newGross = updatedGroups.reduce((s, g) => s + (Number(g.amount) || 0), 0);
    const newNet = Math.max(0, newGross - discountTotal - openAccountTotal);

    onUpdateEntry({
      ...currentEntry,
      vegaGroups: updatedGroups,
      vegaReport: {
        ...currentEntry.vegaReport,
        grossProductSales: newGross,
        totalSales: newNet,
      },
      updatedAt: new Date().toISOString(),
    });
  };

  // Add Item to Group
  const handleAddItemToGroup = (groupIndex: number) => {
    const updatedGroups = [...groups];
    const group = { ...updatedGroups[groupIndex] };
    const items = [...(group.items || [])];

    const newItem: SoldProductItem = {
      id: `item-${Date.now()}`,
      name: 'Yeni Ürün',
      quantity: 1,
      unit: 'Ad.',
      unitPrice: 0,
      totalPrice: 0,
    };

    items.push(newItem);
    group.items = items;
    updatedGroups[groupIndex] = group;

    setExpandedGroups(prev => ({ ...prev, [group.id]: true }));

    onUpdateEntry({
      ...currentEntry,
      vegaGroups: updatedGroups,
      updatedAt: new Date().toISOString(),
    });
  };

  // Remove Item from Group
  const handleRemoveItem = (groupIndex: number, itemIndex: number) => {
    const updatedGroups = [...groups];
    const group = { ...updatedGroups[groupIndex] };
    const items = (group.items || []).filter((_, i) => i !== itemIndex);

    group.items = items;
    group.amount = items.reduce((s, it) => s + (Number(it.totalPrice) || 0), 0);
    group.itemCount = items.reduce((s, it) => s + (Number(it.quantity) || 0), 0);
    updatedGroups[groupIndex] = group;

    const newGross = updatedGroups.reduce((s, g) => s + (Number(g.amount) || 0), 0);
    const newNet = Math.max(0, newGross - discountTotal - openAccountTotal);

    onUpdateEntry({
      ...currentEntry,
      vegaGroups: updatedGroups,
      vegaReport: {
        ...currentEntry.vegaReport,
        grossProductSales: newGross,
        totalSales: newNet,
      },
      updatedAt: new Date().toISOString(),
    });
  };

  // Add Category Group
  const handleAddGroup = () => {
    const newGroup: VegaGroupItem = {
      id: `g-${Date.now()}`,
      name: 'Yeni Kategori',
      amount: 0,
      itemCount: 0,
      percentage: 0,
      items: [],
    };
    onUpdateEntry({
      ...currentEntry,
      vegaGroups: [...groups, newGroup],
      updatedAt: new Date().toISOString(),
    });
  };

  // Remove Category Group
  const handleRemoveGroup = (index: number) => {
    const updated = groups.filter((_, i) => i !== index);
    const newGross = updated.reduce((s, g) => s + (Number(g.amount) || 0), 0);
    const newNet = Math.max(0, newGross - discountTotal - openAccountTotal);

    onUpdateEntry({
      ...currentEntry,
      vegaGroups: updated,
      vegaReport: {
        ...currentEntry.vegaReport,
        grossProductSales: newGross,
        totalSales: newNet,
      },
      updatedAt: new Date().toISOString(),
    });
  };

  // Update Discount amount
  const handleDiscountChange = (val: string | number) => {
    const disc = typeof val === 'number' ? val : parseNumberInput(val);
    const autoNet = Math.max(0, grossSales - disc - openAccountTotal);

    onUpdateEntry({
      ...currentEntry,
      vegaReport: {
        ...currentEntry.vegaReport,
        discountTotal: disc,
        discountAmount: disc,
        totalSales: autoNet,
      },
      updatedAt: new Date().toISOString(),
    });
  };

  // Filter products by search term
  const filterMatches = (text: string) => {
    if (!searchTerm.trim()) return true;
    return text.toLocaleLowerCase('tr-TR').includes(searchTerm.toLocaleLowerCase('tr-TR'));
  };

  // Top Sold Products (Adet ve Ciro Bazında)
  const allProducts: { groupName: string; item: SoldProductItem }[] = [];
  groups.forEach(g => {
    if (g.items) {
      g.items.forEach(it => {
        allProducts.push({ groupName: g.name, item: it });
      });
    }
  });

  const topByQuantity = [...allProducts]
    .sort((a, b) => (b.item.quantity || 0) - (a.item.quantity || 0))
    .slice(0, 5);

  const topByRevenue = [...allProducts]
    .sort((a, b) => (b.item.totalPrice || 0) - (a.item.totalPrice || 0))
    .slice(0, 5);

  const colors = [
    'bg-emerald-500',
    'bg-blue-500',
    'bg-purple-500',
    'bg-amber-500',
    'bg-rose-500',
    'bg-cyan-500',
    'bg-orange-500',
    'bg-teal-500',
    'bg-indigo-500',
    'bg-pink-500',
  ];

  return (
    <div className="space-y-6 pb-16 font-sans">
      {/* 1. TOP HEADER & ACTION BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#161b22] p-5 rounded-xl border border-[#30363d] shadow-lg">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-orange-500 uppercase tracking-wider mb-1 font-mono">
            <Layers className="w-4 h-4" />
            <span>ÜRÜN GRUBU & KALEM BAZLI SATIŞ DETAYI</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            {formatDateTR(currentEntry.date)} Satış & Ürün Grubu Dökümü
          </h2>
          <p className="text-xs text-gray-400 font-mono mt-0.5">
            Kategorilere göre satılan tüm ürünler, adetler, birim fiyatlar ve rapordan düşülen iskontolar
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {onOpenVegaImport && (
            <button
              onClick={onOpenVegaImport}
              className="flex items-center space-x-1.5 bg-[#21262d] hover:bg-[#30363d] text-orange-400 border border-orange-500/30 text-xs font-mono font-semibold px-3 py-2 rounded-lg transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>PDF Raporunu Yeniden Yükle</span>
            </button>
          )}

          <button
            onClick={handleAddGroup}
            className="flex items-center space-x-1.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold px-3.5 py-2 rounded-lg shadow-md transition cursor-pointer font-mono"
          >
            <Plus className="w-4 h-4" />
            <span>+ Kategori Ekle</span>
          </button>
        </div>
      </div>

      {/* 2. AUTOMATIC CALCULATION FLOW BANNER (BRÜT - İSKONTO = NET CİRO) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-mono">
        {/* Card 1: Brüt Ürün Satışları */}
        <div className="p-4 bg-[#161b22] border border-[#30363d] rounded-xl shadow-md">
          <span className="text-[11px] text-gray-400 uppercase font-semibold block">
            1. Ürün Toplam Satış (Brüt)
          </span>
          <div className="text-2xl font-bold text-white mt-1">
            {formatCurrency(grossSales)}
          </div>
          <span className="text-[10px] text-gray-500 block mt-0.5">
            {groups.length} Kategori • {totalItemsCount.toLocaleString('tr-TR')} Adet Ürün
          </span>
        </div>

        {/* Card 2: Yapılan İskonto (Düşülen Tutar) */}
        <div className="p-4 bg-rose-950/20 border border-rose-500/40 rounded-xl shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-rose-400 uppercase font-bold tracking-wider">
              2. (-) Toplam İskonto
            </span>
            <span className="text-[10px] bg-rose-500/20 text-rose-300 font-semibold px-2 py-0.5 rounded">
              Otomatik Düşüldü
            </span>
          </div>
          <div className="text-2xl font-bold text-rose-400 mt-1">
            -{formatCurrency(discountTotal)}
          </div>
          <span className="text-[10px] text-gray-400 block mt-0.5">
            Hesaptan otomatik düşülen indirim
          </span>
        </div>

        {/* Card 3: Açık Hesap / Diğer */}
        <div className="p-4 bg-[#161b22] border border-[#30363d] rounded-xl shadow-md">
          <span className="text-[11px] text-gray-400 uppercase font-semibold block">
            3. (-) Açık Hesap / Cari
          </span>
          <div className="text-2xl font-bold text-amber-400 mt-1">
            {openAccountTotal > 0 ? `-${formatCurrency(openAccountTotal)}` : '0,00 ₺'}
          </div>
          <span className="text-[10px] text-gray-500 block mt-0.5">
            Ödenmemiş / Açık kalan adisyonlar
          </span>
        </div>

        {/* Card 4: Genel Kasa Toplamı (Net Satış) */}
        <div className="p-4 bg-emerald-950/25 border-2 border-emerald-500/50 rounded-xl shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-emerald-400 uppercase font-bold tracking-wider">
              (=) GENEL KASA TOPLAMI (NET)
            </span>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded border border-emerald-500/30">
              Net Ciro
            </span>
          </div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">
            {formatCurrency(netGeneralTotal)}
          </div>
          <span className="text-[10px] text-gray-300 block mt-0.5">
            Brüt Satış - İskonto - Açık Hesap
          </span>
        </div>
      </div>

      {/* 3. VISUAL CATEGORY SHARE BAR */}
      {totalGroupAmount > 0 && (
        <div className="bg-[#161b22] p-5 rounded-xl border border-[#30363d] shadow-lg font-mono space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <PieChart className="w-4 h-4 text-orange-400" />
              <span>Kategori Ciro Dağılımı ve Satış Payları</span>
            </h3>
            <span className="text-xs text-gray-400">
              Toplam: <strong>{formatCurrency(totalGroupAmount)}</strong>
            </span>
          </div>

          <div className="h-5 w-full rounded-lg overflow-hidden flex shadow-inner bg-[#0d1117] border border-[#30363d]">
            {groups.map((g, idx) => {
              const perc = totalGroupAmount > 0 ? ((Number(g.amount) || 0) / totalGroupAmount) * 100 : 0;
              if (perc <= 0) return null;
              return (
                <div
                  key={g.id || idx}
                  style={{ width: `${perc}%` }}
                  className={`${colors[idx % colors.length]} h-full transition-all duration-300 relative group flex items-center justify-center text-[10px] text-white font-bold`}
                  title={`${g.name}: ${formatCurrency(g.amount)} (%${perc.toFixed(1)})`}
                >
                  {perc > 8 && <span>%{perc.toFixed(0)}</span>}
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2 text-xs">
            {groups.map((g, idx) => {
              const perc = totalGroupAmount > 0 ? ((Number(g.amount) || 0) / totalGroupAmount) * 100 : 0;
              return (
                <div key={g.id || idx} className="flex items-center space-x-1.5 bg-[#0d1117] px-2.5 py-1 rounded border border-[#30363d]">
                  <span className={`w-2.5 h-2.5 rounded-full ${colors[idx % colors.length]}`} />
                  <span className="text-gray-300 font-medium">{g.name}:</span>
                  <span className="text-white font-bold">{formatCurrency(g.amount)}</span>
                  <span className="text-orange-400 font-semibold">(%{perc.toFixed(1)})</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. TOP PRODUCTS STATS WIDGET (ADET & CİRO) */}
      {allProducts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
          {/* Top by Quantity */}
          <div className="p-4 bg-[#161b22] border border-[#30363d] rounded-xl shadow-md space-y-2.5">
            <div className="flex items-center justify-between border-b border-[#30363d] pb-2">
              <span className="font-bold text-white flex items-center space-x-1.5">
                <ShoppingBag className="w-4 h-4 text-sky-400" />
                <span>En Çok Satan Ürünler (Adet Bazında Top 5)</span>
              </span>
              <span className="text-[10px] text-gray-500">Miktar</span>
            </div>
            <div className="space-y-1.5">
              {topByQuantity.map((p, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded bg-[#0d1117] border border-[#30363d]/60">
                  <div className="flex items-center space-x-2">
                    <span className="w-5 h-5 rounded bg-sky-500/10 text-sky-400 text-[11px] font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                    <span className="text-gray-200 font-medium truncate max-w-[180px] sm:max-w-[240px]">
                      {p.item.name}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-sky-400 font-bold">{p.item.quantity} Ad.</span>
                    <span className="text-[10px] text-gray-400 block">{formatCurrency(p.item.totalPrice)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top by Revenue */}
          <div className="p-4 bg-[#161b22] border border-[#30363d] rounded-xl shadow-md space-y-2.5">
            <div className="flex items-center justify-between border-b border-[#30363d] pb-2">
              <span className="font-bold text-white flex items-center space-x-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span>En Yüksek Ciro Yapan Ürünler (Tutar Bazında Top 5)</span>
              </span>
              <span className="text-[10px] text-gray-500">Hasılat</span>
            </div>
            <div className="space-y-1.5">
              {topByRevenue.map((p, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded bg-[#0d1117] border border-[#30363d]/60">
                  <div className="flex items-center space-x-2">
                    <span className="w-5 h-5 rounded bg-emerald-500/10 text-emerald-400 text-[11px] font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                    <span className="text-gray-200 font-medium truncate max-w-[180px] sm:max-w-[240px]">
                      {p.item.name}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-emerald-400 font-bold">{formatCurrency(p.item.totalPrice)}</span>
                    <span className="text-[10px] text-gray-400 block">{p.item.quantity} Ad. x {formatCurrency(p.item.unitPrice)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 5. SEARCH & BULK ACTIONS BAR */}
      <div className="bg-[#161b22] p-4 rounded-xl border border-[#30363d] shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono text-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Ürün veya kategori ara (örn: Adana, Carlsberg, Beyran, Meze)..."
            className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg pl-9 pr-3 py-2 text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={expandAll}
            className="px-3 py-1.5 bg-[#21262d] hover:bg-[#30363d] text-gray-300 rounded-lg border border-[#30363d] transition cursor-pointer"
          >
            Tümünü Aç
          </button>
          <button
            type="button"
            onClick={collapseAll}
            className="px-3 py-1.5 bg-[#21262d] hover:bg-[#30363d] text-gray-300 rounded-lg border border-[#30363d] transition cursor-pointer"
          >
            Tümünü Kapat
          </button>
        </div>
      </div>

      {/* 6. CATEGORIES & DETAILED PRODUCTS ACCORDION LIST */}
      <div className="space-y-4 font-mono">
        {groups.map((group, groupIdx) => {
          const isExpanded = !!expandedGroups[group.id] || searchTerm.trim().length > 0;
          const items = group.items || [];
          const filteredItems = items.filter(it => filterMatches(it.name) || filterMatches(group.name));

          if (searchTerm.trim().length > 0 && filteredItems.length === 0 && !filterMatches(group.name)) {
            return null;
          }

          const groupTotalQty = items.reduce((s, it) => s + (Number(it.quantity) || 0), Number(group.itemCount) || 0);
          const groupTotalAmt = Number(group.amount) || 0;
          const perc = totalGroupAmount > 0 ? (groupTotalAmt / totalGroupAmount) * 100 : 0;

          return (
            <div
              key={group.id || groupIdx}
              className="bg-[#161b22] rounded-xl border border-[#30363d] shadow-lg overflow-hidden transition"
            >
              {/* Category Header Bar */}
              <div
                onClick={() => toggleGroup(group.id)}
                className="p-4 bg-[#1c2128] hover:bg-[#21262d] cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#30363d]/80 transition select-none"
              >
                <div className="flex items-center space-x-3">
                  <span className={`w-3.5 h-3.5 rounded-full ${colors[groupIdx % colors.length]} flex-shrink-0`} />
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={group.name}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => handleGroupChange(groupIdx, 'name', e.target.value)}
                      className="font-bold text-sm text-white bg-transparent border-b border-transparent hover:border-[#30363d] focus:border-orange-500 focus:outline-none"
                    />
                    <span className="text-[11px] bg-orange-500/10 text-orange-400 border border-orange-500/30 px-2 py-0.5 rounded font-bold">
                      {items.length > 0 ? `${items.length} Kalem` : `${groupTotalQty} Adet`}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-400">{groupTotalQty} Ad. •</span>
                      <span className="text-sm font-bold text-white">{formatCurrency(groupTotalAmt)}</span>
                    </div>
                    <span className="text-[10px] text-orange-400 font-semibold block">
                      Ciro Payı: %{perc.toFixed(1)}
                    </span>
                  </div>

                  <div className="flex items-center space-x-1.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => handleAddItemToGroup(groupIdx)}
                      className="p-1.5 text-xs text-sky-400 hover:text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 rounded transition cursor-pointer"
                      title="Kategoriye Yeni Ürün Ekle"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRemoveGroup(groupIdx)}
                      className="p-1.5 text-xs text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded transition cursor-pointer"
                      title="Kategoriyi Sil"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="text-gray-400">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>
              </div>

              {/* Items Table Inside Category */}
              {isExpanded && (
                <div className="p-4 bg-[#0d1117] space-y-3">
                  {items.length === 0 ? (
                    <div className="text-center py-4 text-xs text-gray-500">
                      Bu grupta kayıtlı münferit ürün kalemi bulunmuyor.
                      <button
                        onClick={() => handleAddItemToGroup(groupIdx)}
                        className="text-orange-400 hover:underline font-bold ml-1.5 cursor-pointer"
                      >
                        + Ürün Ekle
                      </button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="text-gray-400 border-b border-[#30363d] pb-2 text-[11px] uppercase">
                            <th className="py-2 px-2 font-semibold">#</th>
                            <th className="py-2 px-2 font-semibold">Satılan Ürün Adı</th>
                            <th className="py-2 px-2 text-right font-semibold">Satılan Adet</th>
                            <th className="py-2 px-2 text-right font-semibold">Birim Fiyat</th>
                            <th className="py-2 px-2 text-right font-semibold">Toplam Tutar</th>
                            <th className="py-2 px-2 text-right font-semibold">Grup Payı</th>
                            <th className="py-2 px-2 text-center font-semibold w-10">İşlem</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#30363d]/40">
                          {filteredItems.map((item, itemIdx) => {
                            const itemPerc = groupTotalAmt > 0 ? (item.totalPrice / groupTotalAmt) * 100 : 0;
                            return (
                              <tr
                                key={item.id || itemIdx}
                                className="hover:bg-[#161b22] transition group"
                              >
                                <td className="py-2 px-2 text-gray-500 text-[11px]">
                                  {itemIdx + 1}
                                </td>

                                {/* Product Name */}
                                <td className="py-2 px-2">
                                  <input
                                    type="text"
                                    value={item.name}
                                    onChange={(e) => handleItemUpdate(groupIdx, itemIdx, 'name', e.target.value)}
                                    className="w-full bg-transparent font-medium text-gray-200 focus:text-white focus:outline-none border-b border-transparent focus:border-orange-500"
                                  />
                                </td>

                                {/* Quantity */}
                                <td className="py-2 px-2 text-right">
                                  <div className="inline-flex items-center justify-end space-x-1">
                                    <input
                                      type="number"
                                      step="0.5"
                                      value={item.quantity || ''}
                                      onChange={(e) => handleItemUpdate(groupIdx, itemIdx, 'quantity', e.target.value)}
                                      className="w-16 bg-[#161b22] border border-[#30363d] rounded px-1.5 py-0.5 text-right font-bold text-white focus:border-orange-500 focus:outline-none"
                                    />
                                    <span className="text-gray-500 text-[10px]">Ad.</span>
                                  </div>
                                </td>

                                {/* Unit Price */}
                                <td className="py-2 px-2 text-right">
                                  <div className="inline-flex items-center justify-end space-x-1">
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={item.unitPrice || ''}
                                      onChange={(e) => handleItemUpdate(groupIdx, itemIdx, 'unitPrice', e.target.value)}
                                      className="w-20 bg-[#161b22] border border-[#30363d] rounded px-1.5 py-0.5 text-right font-semibold text-gray-300 focus:border-orange-500 focus:outline-none"
                                    />
                                    <span className="text-gray-500 text-[10px]">₺</span>
                                  </div>
                                </td>

                                {/* Total Price */}
                                <td className="py-2 px-2 text-right">
                                  <div className="inline-flex items-center justify-end space-x-1">
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={item.totalPrice || ''}
                                      onChange={(e) => handleItemUpdate(groupIdx, itemIdx, 'totalPrice', e.target.value)}
                                      className="w-24 bg-[#161b22] border border-[#30363d] rounded px-1.5 py-0.5 text-right font-bold text-emerald-400 focus:border-emerald-500 focus:outline-none"
                                    />
                                    <span className="text-emerald-400 text-[10px] font-bold">₺</span>
                                  </div>
                                </td>

                                {/* Share inside category */}
                                <td className="py-2 px-2 text-right text-gray-400 text-[11px]">
                                  %{itemPerc.toFixed(1)}
                                </td>

                                {/* Remove Button */}
                                <td className="py-2 px-2 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveItem(groupIdx, itemIdx)}
                                    className="p-1 text-gray-500 hover:text-rose-400 opacity-60 group-hover:opacity-100 transition cursor-pointer"
                                    title="Ürünü Sil"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Category Subtotal Footer */}
                  <div className="pt-2 border-t border-[#30363d] flex items-center justify-between text-xs font-mono">
                    <span className="text-gray-400 font-semibold">
                      {group.name} Toplamı ({filteredItems.length} Kalem):
                    </span>
                    <div className="flex items-center space-x-3">
                      <span className="text-gray-400">
                        {groupTotalQty} Adet Ürün
                      </span>
                      <strong className="text-sm font-bold text-white bg-[#161b22] px-2.5 py-1 rounded border border-[#30363d]">
                        {formatCurrency(groupTotalAmt)}
                      </strong>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 7. BOTTOM SUMMARY & DEDUCTIONS CARD */}
      <div className="bg-[#161b22] rounded-xl border border-orange-500/30 p-5 shadow-xl font-mono space-y-4">
        <div className="flex items-center justify-between border-b border-[#30363d] pb-3">
          <div className="flex items-center space-x-2 text-sm font-bold text-white">
            <Calculator className="w-4 h-4 text-orange-400" />
            <span>Rapor Sonu Mutabakat & Otomatik İskonto Düşümü</span>
          </div>
          <span className="text-xs text-gray-400">PDF Rapor Sonu Özeti</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          {/* Brüt Ürün Toplamı */}
          <div className="p-3 bg-[#0d1117] rounded-lg border border-[#30363d]">
            <span className="text-gray-400 block mb-1">Ürün Toplam Satış (Brüt)</span>
            <div className="text-lg font-bold text-white">{formatCurrency(grossSales)}</div>
            <span className="text-[10px] text-gray-500">Tüm ürünlerin liste fiyatı toplamı</span>
          </div>

          {/* Toplam İskonto Girişi & Düşümü */}
          <div className="p-3 bg-rose-950/20 rounded-lg border border-rose-500/40">
            <span className="text-rose-400 font-bold block mb-1">(-) Yapılan Toplam İskonto</span>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                value={discountTotal || ''}
                onChange={(e) => handleDiscountChange(e.target.value)}
                placeholder="0.00"
                className="w-full bg-[#161b22] border border-rose-500/40 rounded px-2.5 py-1 text-sm font-bold text-rose-400 text-right pr-6 focus:outline-none focus:border-rose-400"
              />
              <span className="absolute right-2 top-1.5 text-xs text-rose-400 font-bold">₺</span>
            </div>
            <span className="text-[10px] text-gray-400 mt-1 block">
              Hesaptan ve kasadan otomatik düşülür
            </span>
          </div>

          {/* Genel Kasa Toplamı (Net) */}
          <div className="p-3 bg-emerald-950/25 rounded-lg border border-emerald-500/40">
            <span className="text-emerald-400 font-bold block mb-1">(=) Genel Kasa Toplamı (Net Ciro)</span>
            <div className="text-xl font-bold text-emerald-400">{formatCurrency(netGeneralTotal)}</div>
            <span className="text-[10px] text-gray-300">
              Kasaya ve POS'a intikal eden net hasılat
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
