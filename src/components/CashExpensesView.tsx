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
} from 'lucide-react';
import { CashExpense, ExpenseCategory } from '../types';
import { formatCurrency, formatDateTR, parseNumberInput } from '../utils/formatters';
import { exportExpensesToExcel } from '../utils/excelExport';
import { SmartMoneyInput } from './SmartMoneyInput';
import { CashierStepFooter } from './CashierStepFooter';
import { TabType } from '../types';

interface CashExpensesViewProps {
  selectedDate: string;
  expenses: CashExpense[];
  categories: ExpenseCategory[];
  onAddExpense: (expense: Omit<CashExpense, 'id' | 'createdAt'>) => void;
  onUpdateExpense: (expense: CashExpense) => void;
  onDeleteExpense: (id: string) => void;
  onNavigate?: (tab: TabType) => void;
}

export const CashExpensesView: React.FC<CashExpensesViewProps> = ({
  selectedDate,
  expenses,
  categories,
  onAddExpense,
  onUpdateExpense,
  onDeleteExpense,
  onNavigate,
}) => {
  const [filterDateMode, setFilterDateMode] = useState<'selected-date' | 'all-month'>('selected-date');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<CashExpense | null>(null);
  const [isCustomCategoryMode, setIsCustomCategoryMode] = useState(false);

  const [formData, setFormData] = useState({
    date: selectedDate,
    category: '',
    description: '',
    amount: '',
    paidBy: 'Kasa' as 'Kasa' | 'Banka' | 'Cepte/Şahsi',
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

  // Filter expenses
  const filteredExpenses = expenses.filter((exp) => {
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

    // Source
    if (sourceFilter !== 'all' && exp.paidBy !== sourceFilter) return false;

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchDesc = exp.description.toLowerCase().includes(q);
      const matchCat = exp.category.toLowerCase().includes(q);
      const matchReceipt = exp.receiptNo?.toLowerCase().includes(q);
      const matchUser = exp.enteredBy.toLowerCase().includes(q);
      if (!matchDesc && !matchCat && !matchReceipt && !matchUser) return false;
    }

    return true;
  });

  const totalFilteredAmount = filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const cashOnlyAmount = filteredExpenses
    .filter((e) => e.paidBy === 'Kasa')
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const handleOpenAdd = () => {
    setEditingExpense(null);
    setIsCustomCategoryMode(categories.length === 0);
    setFormData({
      date: selectedDate,
      category: categories[0]?.name || '',
      description: '',
      amount: '',
      paidBy: 'Kasa',
      receiptNo: '',
      enteredBy: 'Kasa Sorumlusu',
      notes: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (exp: CashExpense) => {
    setEditingExpense(exp);
    const existsInList = categories.some((c) => c.name === exp.category);
    setIsCustomCategoryMode(!existsInList && !!exp.category);
    setFormData({
      date: exp.date,
      category: exp.category || '',
      description: exp.description,
      amount: exp.amount.toString(),
      paidBy: exp.paidBy,
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

    if (editingExpense) {
      onUpdateExpense({
        ...editingExpense,
        date: formData.date,
        category: formData.category,
        description: formData.description.trim(),
        amount: amountNum,
        paidBy: formData.paidBy,
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

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#161b22] p-4 rounded-xl border border-[#30363d] font-mono">
          <span className="text-xs text-gray-400 font-semibold uppercase">
            KASADAN ÇIKAN NAKİT GİDER
          </span>
          <div className="text-2xl font-bold text-rose-400 mt-1">
            {formatCurrency(cashOnlyAmount)}
          </div>
          <span className="text-[11px] text-gray-500 mt-1 block">
            Doğrudan gün sonu kasa hesabından düşülen tutar
          </span>
        </div>

        <div className="bg-[#161b22] p-4 rounded-xl border border-[#30363d] font-mono">
          <span className="text-xs text-gray-400 font-semibold uppercase">
            TOPLAM GİDER (TÜM KAYNAKLAR)
          </span>
          <div className="text-2xl font-bold text-white mt-1">
            {formatCurrency(totalFilteredAmount)}
          </div>
          <span className="text-[11px] text-gray-500 mt-1 block">
            {filteredExpenses.length} Kalem Harcama Kaydı
          </span>
        </div>

        <div className="bg-[#161b22] p-4 rounded-xl border border-[#30363d] font-mono flex flex-col justify-between">
          <span className="text-xs text-gray-400 font-semibold uppercase">GÖRÜNTÜLENEN DÖNEM</span>
          <div className="flex items-center space-x-2 mt-2">
            <button
              onClick={() => setFilterDateMode('selected-date')}
              className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                filterDateMode === 'selected-date'
                  ? 'bg-orange-600 text-white'
                  : 'bg-[#21262d] text-gray-300 border border-[#30363d] hover:bg-[#30363d]'
              }`}
            >
              Sadece {formatDateTR(selectedDate)}
            </button>
            <button
              onClick={() => setFilterDateMode('all-month')}
              className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
                filterDateMode === 'all-month'
                  ? 'bg-orange-600 text-white'
                  : 'bg-[#21262d] text-gray-300 border border-[#30363d] hover:bg-[#30363d]'
              }`}
            >
              Tüm Ay
            </button>
          </div>
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
            <option value="Kasa">Sadece Kasa</option>
            <option value="Banka">Banka / EFT</option>
            <option value="Cepte/Şahsi">Şahsi / Cep</option>
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
                <th className="py-3 px-4">Ödeme Kaynağı</th>
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
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                          exp.paidBy === 'Kasa'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : exp.paidBy === 'Banka'
                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                            : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                        }`}
                      >
                        {exp.paidBy}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-gray-400">
                      {exp.receiptNo || '-'}
                    </td>
                    <td className="py-3 px-4 text-gray-400 font-sans">
                      {exp.enteredBy}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-rose-400 text-sm whitespace-nowrap">
                      -{formatCurrency(exp.amount)}
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
                  <label className="block font-semibold text-gray-300 mb-1">
                    Ödeme Kaynağı *
                  </label>
                  <select
                    value={formData.paidBy}
                    onChange={(e) => setFormData({ ...formData, paidBy: e.target.value as any })}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-gray-200 focus:border-orange-500 focus:outline-none"
                  >
                    <option value="Kasa">Kasa (Günlük Nakit)</option>
                    <option value="Banka">Banka Transferi / EFT</option>
                    <option value="Cepte/Şahsi">Şahsi Cep / Kredi Kartı</option>
                  </select>
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
