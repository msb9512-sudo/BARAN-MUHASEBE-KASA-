import React, { useState, useEffect } from 'react';
import {
  loadAppState,
  saveAppState,
  resetToSampleData,
  resetAllFinancialData,
  resetSingleDayData,
  AppState,
  RestaurantProfile,
} from './utils/storage';
import {
  DailyEntry,
  CashExpense,
  Invoice,
  PosDevice,
  ExpenseCategory,
  TabType,
  OpenAccountCustomer,
  OpenAccountTransaction,
  MasterSafeState,
  BanknoteCounts,
  SafeTransaction,
  FinancialAccount,
  AccountTransaction,
} from './types';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { DailyCashAndVegaView } from './components/DailyCashAndVegaView';
import { VegaGroupReportView } from './components/VegaGroupReportView';
import { CashExpensesView } from './components/CashExpensesView';
import { AccountsView } from './components/AccountsView';
import { InvoicesView } from './components/InvoicesView';
import { OpenAccountsView } from './components/OpenAccountsView';
import { DailyClosingView } from './components/DailyClosingView';
import { MasterSafeVaultView } from './components/MasterSafeVaultView';
import { MonthlyReportView } from './components/MonthlyReportView';
import { BossReportModal } from './components/BossReportModal';
import { VegaImportModal } from './components/VegaImportModal';
import { OpenAccountPromptModal } from './components/OpenAccountPromptModal';
import { SettingsModal } from './components/SettingsModal';
import { SettingsView } from './components/SettingsView';
import { GoogleWorkspaceView } from './components/GoogleWorkspaceView';
import { Sidebar } from './components/Sidebar';
import { getTodayIsoDate } from './utils/formatters';
import { loadThemeSettings, applyThemeToDOM } from './utils/theme';

export function App() {
  // Main State loaded from localStorage
  const [appState, setAppState] = useState<AppState>(() => loadAppState());
  
  // Initialize and apply theme settings immediately on mount
  useEffect(() => {
    const settings = loadThemeSettings();
    applyThemeToDOM(settings);
  }, []);
  
  // Navigation & UI state
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  
  const [selectedDate, setSelectedDate] = useState<string>(
    () => appState.currentSelectedDate || getTodayIsoDate()
  );

  // Mobile & Desktop sidebar collapsed state
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('sidebar_collapsed');
      return saved === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleSidebarCollapse = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('sidebar_collapsed', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Modals state
  const [isBossReportOpen, setIsBossReportOpen] = useState(false);
  const [isVegaImportOpen, setIsVegaImportOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Open Account prompt modal state
  const [isOpenAccountPromptOpen, setIsOpenAccountPromptOpen] = useState(false);
  const [detectedOpenAccountAmount, setDetectedOpenAccountAmount] = useState<number>(0);
  const [detectedOpenAccountDate, setDetectedOpenAccountDate] = useState<string>('');

  const handlePromptOpenAccount = (amount: number, date: string) => {
    setDetectedOpenAccountAmount(amount);
    setDetectedOpenAccountDate(date || selectedDate);
    setIsOpenAccountPromptOpen(true);
  };

  // Persist state to localStorage on update
  useEffect(() => {
    saveAppState(appState);
  }, [appState]);

  // Automatically scroll to the top of the page smoothly whenever the active tab / step changes
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    document.documentElement.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    document.body.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  }, [activeTab]);

  // Ensure current entry exists for selected date
  const getCurrentEntry = (date: string): DailyEntry => {
    if (appState.entries[date]) {
      return appState.entries[date];
    }

    // Default clean entry if date is new
    return {
      id: `entry-${date}`,
      date,
      status: 'draft',
      openingCash: 0,
      actualCashInHand: 0,
      cashWithdrawals: [],
      notes: '',
      vegaReport: {
        totalSales: 0,
        cashSales: 0,
        creditCardSales: 0,
        otherSales: 0,
        cancelledAmount: 0,
        complimentaryAmount: 0,
        discountAmount: 0,
        tableCount: 0,
        guestCount: 0,
      },
      posReports: appState.posDevices.map((pos) => ({
        id: `pos-${pos.id}-${date}`,
        posDeviceId: pos.id,
        posDeviceName: pos.name,
        bankName: pos.bankName,
        creditCardTotal: 0,
      })),
      vegaGroups: [
        { id: '1', name: 'Yiyecek Grubu', amount: 0, percentage: 0 },
        { id: '2', name: 'Sıcak İçecekler', amount: 0, percentage: 0 },
        { id: '3', name: 'Soğuk İçecekler & Meşrubat', amount: 0, percentage: 0 },
        { id: '4', name: 'Tatlı & Dondurma', amount: 0, percentage: 0 },
        { id: '5', name: 'Alkollü İçecekler', amount: 0, percentage: 0 },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  };

  const currentEntry = getCurrentEntry(selectedDate);

  // Handlers for Entry Updates
  const handleUpdateEntry = (updated: DailyEntry) => {
    setAppState((prev) => ({
      ...prev,
      entries: {
        ...prev.entries,
        [updated.date]: updated,
      },
    }));
  };

  // Expenses Handlers
  const handleAddExpense = (expenseData: Omit<CashExpense, 'id' | 'createdAt'>) => {
    const newExpense: CashExpense = {
      ...expenseData,
      id: `exp-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setAppState((prev) => ({
      ...prev,
      expenses: [newExpense, ...prev.expenses],
    }));
  };

  const handleUpdateExpense = (updated: CashExpense) => {
    setAppState((prev) => ({
      ...prev,
      expenses: prev.expenses.map((e) => (e.id === updated.id ? updated : e)),
    }));
  };

  const handleDeleteExpense = (id: string) => {
    setAppState((prev) => ({
      ...prev,
      expenses: prev.expenses.filter((e) => e.id !== id),
    }));
  };

  // Invoices Handlers
  const handleAddInvoice = (invoiceData: Omit<Invoice, 'id' | 'createdAt'>) => {
    const newInvoice: Invoice = {
      ...invoiceData,
      id: `inv-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setAppState((prev) => ({
      ...prev,
      invoices: [newInvoice, ...prev.invoices],
    }));
  };

  const handleUpdateInvoice = (updated: Invoice) => {
    setAppState((prev) => ({
      ...prev,
      invoices: prev.invoices.map((i) => (i.id === updated.id ? updated : i)),
    }));
  };

  const handleDeleteInvoice = (id: string) => {
    setAppState((prev) => ({
      ...prev,
      invoices: prev.invoices.filter((i) => i.id !== id),
    }));
  };

  const handleAddPayment = (invoiceId: string, paymentData: any) => {
    setAppState((prev) => {
      const updatedInvoices = prev.invoices.map((inv) => {
        if (inv.id !== invoiceId) return inv;

        const newPayment = {
          ...paymentData,
          id: `pmt-${Date.now()}`,
          createdAt: new Date().toISOString(),
        };

        const newPayments = [...inv.payments, newPayment];
        const totalPaid = newPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
        
        let newStatus: Invoice['paymentStatus'] = 'unpaid';
        if (totalPaid >= inv.totalAmount) newStatus = 'paid';
        else if (totalPaid > 0) newStatus = 'partial';

        return {
          ...inv,
          payments: newPayments,
          paymentStatus: newStatus,
        };
      });

      return {
        ...prev,
        invoices: updatedInvoices,
      };
    });
  };

  // Open Account Customers & Transactions Handlers
  const handleAddOpenAccountCustomer = (customer: OpenAccountCustomer) => {
    setAppState((prev) => ({
      ...prev,
      openAccountCustomers: [customer, ...(prev.openAccountCustomers || [])],
    }));
  };

  const handleUpdateOpenAccountCustomer = (updated: OpenAccountCustomer) => {
    setAppState((prev) => ({
      ...prev,
      openAccountCustomers: (prev.openAccountCustomers || []).map((c) =>
        c.id === updated.id ? updated : c
      ),
    }));
  };

  const handleDeleteOpenAccountCustomer = (customerId: string) => {
    setAppState((prev) => ({
      ...prev,
      openAccountCustomers: (prev.openAccountCustomers || []).filter((c) => c.id !== customerId),
      openAccountTransactions: (prev.openAccountTransactions || []).filter(
        (t) => t.customerId !== customerId
      ),
    }));
  };

  const handleAddOpenAccountTransaction = (tx: OpenAccountTransaction) => {
    setAppState((prev) => ({
      ...prev,
      openAccountTransactions: [tx, ...(prev.openAccountTransactions || [])],
    }));
  };

  const handleDeleteOpenAccountTransaction = (txId: string) => {
    setAppState((prev) => ({
      ...prev,
      openAccountTransactions: (prev.openAccountTransactions || []).filter((t) => t.id !== txId),
    }));
  };

  // Master Safe (Vault) Handlers
  const handleUpdateMasterSafe = (updated: MasterSafeState) => {
    setAppState((prev) => ({
      ...prev,
      masterSafe: updated,
    }));
  };

  const handleTransferToMasterSafe = (transferData: {
    date: string;
    amount: number;
    banknotes: BanknoteCounts;
    enteredBy: string;
    description: string;
  }) => {
    setAppState((prev) => {
      const currentSafe = prev.masterSafe || {
        banknotes: { 200: 0, 100: 0, 50: 0, 20: 0, 10: 0, 5: 0, 1: 0 },
        transactions: [],
        lastUpdated: new Date().toISOString(),
      };

      const newBanknotes = { ...currentSafe.banknotes };
      for (const d of [200, 100, 50, 20, 10, 5, 1]) {
        const delta = Number(transferData.banknotes[d]) || 0;
        newBanknotes[d] = (Number(newBanknotes[d]) || 0) + delta;
      }

      const newTx: SafeTransaction = {
        id: `safe-transfer-${transferData.date}-${Date.now()}`,
        date: transferData.date,
        type: 'deposit',
        source: 'daily_closing',
        amount: transferData.amount,
        banknotes: transferData.banknotes,
        category: 'Gün Sonu Kasa Devri',
        description: transferData.description,
        enteredBy: transferData.enteredBy,
        createdAt: new Date().toISOString(),
      };

      return {
        ...prev,
        masterSafe: {
          banknotes: newBanknotes,
          transactions: [newTx, ...(currentSafe.transactions || [])],
          lastUpdated: new Date().toISOString(),
        },
      };
    });
  };

  // Accounts & Account Transactions Handlers
  const handleAddAccount = (accountData: Omit<FinancialAccount, 'id' | 'createdAt'>) => {
    const newAccount: FinancialAccount = {
      ...accountData,
      id: `acc-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setAppState((prev) => ({
      ...prev,
      accounts: [...(prev.accounts || []), newAccount],
    }));
  };

  const handleUpdateAccount = (updated: FinancialAccount) => {
    setAppState((prev) => ({
      ...prev,
      accounts: (prev.accounts || []).map((a) => (a.id === updated.id ? updated : a)),
    }));
  };

  const handleDeleteAccount = (id: string) => {
    setAppState((prev) => ({
      ...prev,
      accounts: (prev.accounts || []).filter((a) => a.id !== id),
    }));
  };

  const handleAddAccountTransaction = (txData: Omit<AccountTransaction, 'id' | 'createdAt'>) => {
    const newTx: AccountTransaction = {
      ...txData,
      id: `tx-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setAppState((prev) => ({
      ...prev,
      accountTransactions: [newTx, ...(prev.accountTransactions || [])],
    }));
  };

  const handleDeleteAccountTransaction = (id: string) => {
    setAppState((prev) => ({
      ...prev,
      accountTransactions: (prev.accountTransactions || []).filter((tx) => tx.id !== id),
    }));
  };

  // Settings & Profile Handlers
  const handleUpdatePosDevices = (devices: PosDevice[]) => {
    setAppState((prev) => ({ ...prev, posDevices: devices }));
  };

  const handleUpdateCategories = (categories: ExpenseCategory[]) => {
    setAppState((prev) => ({ ...prev, categories }));
  };

  const handleUpdateProfile = (profile: RestaurantProfile) => {
    setAppState((prev) => ({ ...prev, profile }));
  };

  const handleResetData = () => {
    const sample = resetToSampleData();
    setAppState(sample);
  };

  const handleResetAllFinancialData = () => {
    const cleaned = resetAllFinancialData(appState);
    setAppState(cleaned);
  };

  const handleResetSingleDay = (date: string) => {
    const updated = resetSingleDayData(date, appState);
    setAppState(updated);
  };

  return (
    <div className="min-h-screen bg-[#0f1115] text-gray-200 flex flex-col font-sans antialiased selection:bg-orange-500 selection:text-white">
      {/* Top Main Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedDate={selectedDate}
        setSelectedDate={(date) => {
          setSelectedDate(date);
          setAppState((prev) => ({ ...prev, currentSelectedDate: date }));
        }}
        onOpenBossReport={() => setIsBossReportOpen(true)}
        onOpenVegaImport={() => setIsVegaImportOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        profile={appState.profile}
        onToggleMobileSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebarCollapse={handleToggleSidebarCollapse}
      />

      {/* Main Layout Body: Left Sidebar + Central Content */}
      <div className="flex-1 flex w-full">
        {/* Left Vertical Navigation Groups */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenBossReport={() => setIsBossReportOpen(true)}
          onOpenVegaImport={() => setIsVegaImportOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          profile={appState.profile}
          isOpenMobile={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={handleToggleSidebarCollapse}
        />

        {/* Main Workspace Area */}
        <main className="flex-1 min-w-0 p-3 sm:p-5 lg:p-7 max-w-7xl mx-auto w-full">
          {activeTab === 'dashboard' && (
            <DashboardView
              selectedDate={selectedDate}
              currentEntry={currentEntry}
              expenses={appState.expenses}
              invoices={appState.invoices}
              customers={appState.openAccountCustomers || []}
              transactions={appState.openAccountTransactions || []}
              masterSafe={appState.masterSafe}
              onNavigate={(tab) => setActiveTab(tab)}
              onOpenBossReport={() => setIsBossReportOpen(true)}
              onOpenVegaImport={() => setIsVegaImportOpen(true)}
            />
          )}

          {activeTab === 'daily' && (
            <DailyCashAndVegaView
              selectedDate={selectedDate}
              currentEntry={currentEntry}
              onUpdateEntry={handleUpdateEntry}
              expenses={appState.expenses}
              invoices={appState.invoices}
              posDevices={appState.posDevices}
              onOpenVegaImport={() => setIsVegaImportOpen(true)}
              onOpenBossReport={() => setIsBossReportOpen(true)}
              onNavigate={(tab) => setActiveTab(tab)}
              onPromptOpenAccount={handlePromptOpenAccount}
            />
          )}

          {activeTab === 'groups' && (
            <VegaGroupReportView
              currentEntry={currentEntry}
              onUpdateEntry={handleUpdateEntry}
              onOpenVegaImport={() => setIsVegaImportOpen(true)}
              onNavigate={(tab) => setActiveTab(tab)}
              onPromptOpenAccount={handlePromptOpenAccount}
            />
          )}

          {activeTab === 'expenses' && (
            <CashExpensesView
              selectedDate={selectedDate}
              expenses={appState.expenses}
              categories={appState.categories}
              accounts={appState.accounts || []}
              onAddExpense={handleAddExpense}
              onUpdateExpense={handleUpdateExpense}
              onDeleteExpense={handleDeleteExpense}
              onNavigate={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'accounts' && (
            <AccountsView
              accounts={appState.accounts || []}
              accountTransactions={appState.accountTransactions || []}
              expenses={appState.expenses}
              masterSafe={appState.masterSafe}
              selectedDate={selectedDate}
              onAddAccount={handleAddAccount}
              onUpdateAccount={handleUpdateAccount}
              onDeleteAccount={handleDeleteAccount}
              onAddTransaction={handleAddAccountTransaction}
              onDeleteTransaction={handleDeleteAccountTransaction}
              onNavigate={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'openAccounts' && (
            <OpenAccountsView
              customers={appState.openAccountCustomers || []}
              transactions={appState.openAccountTransactions || []}
              onAddCustomer={handleAddOpenAccountCustomer}
              onUpdateCustomer={handleUpdateOpenAccountCustomer}
              onDeleteCustomer={handleDeleteOpenAccountCustomer}
              onAddTransaction={handleAddOpenAccountTransaction}
              onDeleteTransaction={handleDeleteOpenAccountTransaction}
              selectedDate={selectedDate}
              onNavigate={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'invoices' && (
            <InvoicesView
              selectedDate={selectedDate}
              invoices={appState.invoices}
              onAddInvoice={handleAddInvoice}
              onUpdateInvoice={handleUpdateInvoice}
              onDeleteInvoice={handleDeleteInvoice}
              onAddPayment={handleAddPayment}
              onNavigate={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'closing' && (
            <DailyClosingView
              currentEntry={currentEntry}
              onUpdateEntry={handleUpdateEntry}
              expenses={appState.expenses}
              invoices={appState.invoices}
              masterSafe={appState.masterSafe}
              onTransferToMasterSafe={handleTransferToMasterSafe}
              onOpenBossReport={() => setIsBossReportOpen(true)}
              onNavigate={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'vault' && (
            <MasterSafeVaultView
              masterSafe={appState.masterSafe}
              onUpdateMasterSafe={handleUpdateMasterSafe}
              selectedDate={selectedDate}
              onNavigate={(tab) => setActiveTab(tab)}
              currentEntry={currentEntry}
              onUpdateEntry={handleUpdateEntry}
              expenses={appState.expenses}
              invoices={appState.invoices}
              onTransferToMasterSafe={handleTransferToMasterSafe}
              accounts={appState.accounts || []}
              accountTransactions={appState.accountTransactions || []}
              onUpdateAccount={handleUpdateAccount}
              onAddTransaction={handleAddAccountTransaction}
            />
          )}

          {activeTab === 'monthly' && (
            <MonthlyReportView
              entries={appState.entries}
              expenses={appState.expenses}
              invoices={appState.invoices}
              customers={appState.openAccountCustomers || []}
              transactions={appState.openAccountTransactions || []}
              onSelectDate={(date) => {
                 setSelectedDate(date);
                 setActiveTab('daily');
              }}
              onNavigate={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'workspace' && (
            <GoogleWorkspaceView
              currentEntry={currentEntry}
              appState={appState}
              onRestoreState={(restoredState) => setAppState(restoredState)}
              onOpenVegaImport={() => setIsVegaImportOpen(true)}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              posDevices={appState.posDevices}
              onUpdatePosDevices={handleUpdatePosDevices}
              categories={appState.categories}
              onUpdateCategories={handleUpdateCategories}
              profile={appState.profile}
              onUpdateProfile={handleUpdateProfile}
              onResetData={handleResetData}
              entries={appState.entries}
              expenses={appState.expenses}
              invoices={appState.invoices}
              selectedDate={selectedDate}
              onResetAllFinancialData={handleResetAllFinancialData}
              onResetSingleDay={handleResetSingleDay}
            />
          )}
        </main>
      </div>

      {/* Footer info */}
      <footer className="border-t border-[#30363d] bg-[#0d1117] py-3.5 px-4 text-center text-xs text-gray-400 font-mono">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block"></span>
            <strong className="text-gray-200">
              {appState.profile.companyTitle || appState.profile.name}
            </strong>
            {appState.profile.taxNumber && (
              <span>• VKN: {appState.profile.taxNumber}</span>
            )}
          </div>
          <div>
            Nakit Akışı Formülü: <span className="font-mono font-semibold text-orange-400">Devir + Gelirler - Giderler = Gün Sonu Kasa</span>
          </div>
        </div>
      </footer>

      {/* Boss Report Modal */}
      <BossReportModal
        isOpen={isBossReportOpen}
        onClose={() => setIsBossReportOpen(false)}
        entry={currentEntry}
        expenses={appState.expenses}
        invoices={appState.invoices}
        profile={appState.profile}
      />

      {/* Vega Report Import Modal */}
      <VegaImportModal
        isOpen={isVegaImportOpen}
        onClose={() => setIsVegaImportOpen(false)}
        currentEntry={currentEntry}
        onApplyImport={handleUpdateEntry}
        expenses={appState.expenses}
        invoices={appState.invoices}
        onOpenAccountDetected={handlePromptOpenAccount}
      />

      {/* Open Account Prompt Modal */}
      <OpenAccountPromptModal
        isOpen={isOpenAccountPromptOpen}
        onClose={() => setIsOpenAccountPromptOpen(false)}
        detectedAmount={detectedOpenAccountAmount}
        date={detectedOpenAccountDate || selectedDate}
        customers={appState.openAccountCustomers || []}
        onSaveCustomer={handleAddOpenAccountCustomer}
        onSaveTransaction={handleAddOpenAccountTransaction}
        onNavigateToOpenAccounts={() => {
          setActiveTab('openAccounts');
        }}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        posDevices={appState.posDevices}
        onUpdatePosDevices={handleUpdatePosDevices}
        categories={appState.categories}
        onUpdateCategories={handleUpdateCategories}
        profile={appState.profile}
        onUpdateProfile={handleUpdateProfile}
        onResetData={handleResetData}
        selectedDate={selectedDate}
        onResetAllFinancialData={handleResetAllFinancialData}
        onResetSingleDay={handleResetSingleDay}
      />
    </div>
  );
}

export default App;
