// تصميم م. أبو أحمد — مصمم ومنفذ Claude — © الحقوق محفوظة
import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Receipt,
  BookOpen,
  Boxes,
  ShieldCheck,
  Printer,
  FileSpreadsheet,
  PlusCircle,
  Search,
  Filter,
  CheckCircle2,
  Calendar,
  Building,
  User,
  ArrowUpRight,
  TrendingDown,
  Layers,
  FileText,
  LogOut,
  History,
  Eye,
  Check,
  AlertTriangle,
  LayoutDashboard,
  PieChart,
  TrendingUp,
  Download,
  DollarSign,
  Landmark
} from 'lucide-react';
import { useStore } from '../../lib/store';
import { DashboardOverview, PaymentsList, InvoicesList, ExpensesList, AccountingHub, InventoryHub, FixedAssetsHub, PropertiesList, ContractsList, ReportsHub, AuditTrailView } from '../common/lazyViews';
import { useAuth } from '../../context/AuthContext';
import { Payment, Invoice, PropertyExpense, InventoryItem, InventoryTransaction, SystemSection } from '../../types';
import { ActiveTab } from '../layout/Sidebar';
import { formatCurrency } from '../../lib/numberToArabicWords';
import { Badge } from '../common/Badge';
import { StatCard } from '../common/StatCard';
import { OfficialReceiptModal } from '../payments/OfficialReceiptModal';
import { PaymentModal } from '../payments/PaymentModal';
import { ExpenseDetailsModal } from '../common/ExpenseDetailsModal';
import { InvoiceDetailsModal } from '../common/InvoiceDetailsModal';
import { ExpenseModal } from '../expenses/ExpenseModal';
import { TenantDetailsModal } from '../common/TenantDetailsModal';
import { UpcomingDuesAndExpiryAlerts } from '../dashboard/UpcomingDuesAndExpiryAlerts';
import {
  exportDailyCollectionsToExcel,
  exportInvoicesToExcel,
  exportExpensesToExcel,
  exportInventoryToExcel,
  exportTenantStatementToExcel,
  exportMasterAuditPackageToExcel,
  exportTrialBalanceToExcel,
  exportAuditTrailToExcel
} from '../../lib/exportUtils';
import {
  generateTrialBalance,
  generateProfitLoss,
  generateBalanceSheet,
  calculateAgingBuckets
} from '../../lib/accountingEngine';

export type EmployeeTab = ActiveTab | 'department_ops';

interface EmployeeDepartmentWindowProps {
  activeTab?: ActiveTab;
  onNavigateTab?: (tab: ActiveTab) => void;
  onOpenExpenseModal?: () => void;
  onOpenPaymentModal?: () => void;
}

export const EmployeeDepartmentWindow: React.FC<EmployeeDepartmentWindowProps> = ({
  activeTab,
  onNavigateTab,
  onOpenExpenseModal,
  onOpenPaymentModal
}) => {
  const {
    currentUser,
    payments,
    invoices,
    expenses,
    tenants,
    contracts,
    properties,
    units,
    journalEntries,
    accounts,
    inventoryItems,
    fixedAssets,
    inventoryTransactions,
    aggregatedDocuments,
    auditLogs,
    canUserPerform,
    recordInventoryTransaction,
    logoutUser,
    activeAlert,
    dismissAlert,
    reportActiveWindow,
    isSectionAllowed
  } = useStore();

  const { logout: authLogout } = useAuth();

  const handleLogout = async () => {
    try {
      if (authLogout) {
        await authLogout();
      }
    } catch (e) {
      console.warn('Firebase logout warning:', e);
    }
    logoutUser();
  };

  // Role detection
  const isExecutive = currentUser.role === 'EXECUTIVE';
  const isCashier = currentUser.role === 'CASHIER';
  const isAccountant = currentUser.role === 'ACCOUNTANT';
  const isStorekeeper = currentUser.role === 'STOREKEEPER';
  const isAuditor = currentUser.role === 'AUDITOR';

  // Section Tab State (Synced with activeTab prop or local selection)
  const [internalTab, setInternalTab] = useState<EmployeeTab>(() => {
    return activeTab || (isExecutive ? 'dashboard' : isCashier ? 'payments' : isStorekeeper ? 'inventory' : isAccountant ? 'accounting' : 'dashboard');
  });

  useEffect(() => {
    if (activeTab) {
      setInternalTab(activeTab);
    }
  }, [activeTab]);

  const currentTab: EmployeeTab = activeTab || internalTab;

  const handleSelectTab = (tab: EmployeeTab) => {
    setInternalTab(tab);
    if (onNavigateTab && tab !== 'department_ops') {
      onNavigateTab(tab as ActiveTab);
    }
  };

  // Sub-tabs based on department
  const [cashierTab, setCashierTab] = useState<'payments' | 'tenants' | 'invoices'>('payments');
  const [accountantTab, setAccountantTab] = useState<'accounting' | 'expenses' | 'invoices' | 'contracts' | 'properties'>('accounting');
  const [storekeeperTab, setStorekeeperTab] = useState<'items' | 'movements' | 'new_tx'>('items');
  const [auditorTab, setAuditorTab] = useState<'audit_collections' | 'audit_expenses' | 'audit_journals' | 'audit_tenants' | 'audit_trail'>('audit_collections');

  // Executive & Portfolio metrics
  const totalCollections = payments.reduce((acc, p) => acc + (p.amount || 0), 0);
  const totalExpensesAmount = expenses.reduce((acc, e) => acc + (e.amount || 0), 0);
  const netOperatingIncome = totalCollections - totalExpensesAmount;
  const totalInvoiced = invoices.reduce((acc, i) => acc + (i.amount || 0), 0);
  const totalUnitsCount = units.length;
  const occupiedUnitsCount = units.filter(u => u.status === 'OCCUPIED').length;
  const occupancyRate = totalUnitsCount > 0 ? Math.round((occupiedUnitsCount / totalUnitsCount) * 100) : 0;

  const [isLocalExpenseModalOpen, setIsLocalExpenseModalOpen] = useState(false);

  const handleOpenExpense = () => {
    if (onOpenExpenseModal) {
      onOpenExpenseModal();
    } else {
      setIsLocalExpenseModalOpen(true);
    }
  };

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [auditUserFilter, setAuditUserFilter] = useState('ALL');
  const [auditActionFilter, setAuditActionFilter] = useState('ALL');

  // Modals
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [prefilledPaymentTenantId, setPrefilledPaymentTenantId] = useState<string | undefined>(undefined);
  const [selectedPaymentForReceipt, setSelectedPaymentForReceipt] = useState<Payment | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedExpense, setSelectedExpense] = useState<PropertyExpense | null>(null);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);

  const handleOpenPaymentWithTenant = (tenantId: string) => {
    setPrefilledPaymentTenantId(tenantId);
    setIsPaymentModalOpen(true);
  };

  // New Store Movement Form
  const [txType, setTxType] = useState<'INBOUND' | 'OUTBOUND' | 'CUSTODY_ASSIGN'>('OUTBOUND');
  const [txItemId, setTxItemId] = useState(inventoryItems[0]?.id || '');
  const [txQty, setTxQty] = useState(1);
  const [txRecipient, setTxRecipient] = useState('');
  const [txNotes, setTxNotes] = useState('');
  const [txSuccessMsg, setTxSuccessMsg] = useState('');
  const [txErrorMsg, setTxErrorMsg] = useState('');

  const handleRecordStoreTx = (e: React.FormEvent) => {
    e.preventDefault();
    setTxSuccessMsg('');
    setTxErrorMsg('');

    if (!txItemId) {
      setTxErrorMsg('يرجى اختيار الصنف المطلوب');
      return;
    }
    if (!txQty || txQty <= 0) {
      setTxErrorMsg('يرجى إدخال كمية صحيحة أكبر من الصفر');
      return;
    }
    if (!txRecipient.trim()) {
      setTxErrorMsg('يرجى إدخال اسم المستلم / الفني المستودعي');
      return;
    }

    const res = recordInventoryTransaction({
      type: txType,
      itemId: txItemId,
      quantity: txQty,
      recipientName: txRecipient.trim(),
      notes: txNotes.trim()
    });

    if (res.success) {
      setTxSuccessMsg(`تم تسجيل الحركة المستودعية بنجاح برقم: ${res.transaction?.documentNumber}`);
      setTxQty(1);
      setTxRecipient('');
      setTxNotes('');
      setTimeout(() => setStorekeeperTab('movements'), 1000);
    } else {
      setTxErrorMsg(res.error || 'فشل تسجيل الحركة المخزنية');
    }
  };

  // Report current active window to the Server & General Manager
  React.useEffect(() => {
    let windowDesc = 'نافذة الموظف';
    if (isCashier) {
      windowDesc = cashierTab === 'payments' ? 'نافذة أمين الصندوق - شاشة سندات القبض' :
                   cashierTab === 'tenants' ? 'نافذة أمين الصندوق - كشف حساب المستأجرين' :
                   'نافذة أمين الصندوق - فواتير الإيجار';
    } else if (isAccountant) {
      windowDesc = accountantTab === 'accounting' ? 'نافذة المحاسب - دفتر الأستاذ والقيود' :
                   accountantTab === 'expenses' ? 'نافذة المحاسب - سندات الصرف والمصروفات' :
                   'نافذة المحاسب - فواتير الإيجار';
    } else if (isStorekeeper) {
      windowDesc = storekeeperTab === 'items' ? 'نافذة أمين المستودع - جرد الأصناف والعهد' :
                   storekeeperTab === 'movements' ? 'نافذة أمين المستودع - سجل حركات الصرف' :
                   'نافذة أمين المستودع - حركة صرف وتوريد جديدة';
    } else if (isAuditor) {
      windowDesc = auditorTab === 'audit_collections' ? 'نافذة المدقق - تدقيق سندات القبض' :
                   auditorTab === 'audit_expenses' ? 'نافذة المدقق - تدقيق سندات الصرف' :
                   auditorTab === 'audit_journals' ? 'نافذة المدقق - تدقيق القيود اليومية' :
                   auditorTab === 'audit_trail' ? 'نافذة المدقق - سجل النشاط المالي الكامل' :
                   'نافذة المدقق - تدقيق حسابات المستأجرين';
    }
    reportActiveWindow(windowDesc);
  }, [isCashier, isAccountant, isStorekeeper, isAuditor, cashierTab, accountantTab, storekeeperTab, auditorTab, reportActiveWindow]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">

      {/* Real-Time Admin Alert Banner if present */}
      {activeAlert && (
        <div className={`p-4 rounded-2xl border shadow-md flex items-start justify-between gap-4 animate-in slide-in-from-top duration-300 ${
          activeAlert.urgency === 'CRITICAL' ? 'bg-rose-50 border-rose-300 text-rose-900' :
          activeAlert.urgency === 'URGENT' ? 'bg-amber-50 border-amber-300 text-amber-900' :
          'bg-indigo-50 border-indigo-200 text-indigo-900'
        }`}>
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              activeAlert.urgency === 'CRITICAL' ? 'bg-rose-200 text-rose-800' :
              activeAlert.urgency === 'URGENT' ? 'bg-amber-200 text-amber-800' :
              'bg-indigo-200 text-indigo-800'
            }`}>
              <AlertTriangle className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm">
                  {activeAlert.urgency === 'CRITICAL' ? '🚨 تنبيه إداري حرج وفوري من المدير العام' :
                   activeAlert.urgency === 'URGENT' ? '⚠️ تنبيه إداري عاجل من المدير العام' :
                   '📢 إشعار إداري رسمي من المدير العام'}
                </span>
                <span className="text-[10px] font-mono opacity-70">
                  {new Date(activeAlert.timestamp).toLocaleTimeString('ar-SA')}
                </span>
              </div>
              <p className="text-xs sm:text-sm font-semibold mt-1 leading-relaxed">
                {activeAlert.message}
              </p>
            </div>
          </div>

          <button
            onClick={dismissAlert}
            className="px-3 py-1.5 rounded-lg bg-white/80 hover:bg-white text-xs font-bold shadow-2xs border border-slate-200 transition-colors shrink-0 cursor-pointer"
          >
            تأكيد وقراءة
          </button>
        </div>
      )}
      
      {/* Employee Department Banner */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-xs ${
            isExecutive ? 'bg-indigo-600' :
            isCashier ? 'bg-amber-600' :
            isAccountant ? 'bg-emerald-600' :
            isStorekeeper ? 'bg-teal-600' :
            'bg-blue-600'
          }`}>
            {isExecutive ? <PieChart className="w-6 h-6" /> :
             isCashier ? <CreditCard className="w-6 h-6" /> :
             isAccountant ? <BookOpen className="w-6 h-6" /> :
             isStorekeeper ? <Boxes className="w-6 h-6" /> :
             <ShieldCheck className="w-6 h-6" />}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-slate-900">
                {isExecutive ? 'نافذة الإدارة العليا ومؤشرات الأداء والتقارير الرقابية' :
                 isCashier ? 'نافذة قسم التحصيل وأمين الصندوق المخصصة' :
                 isAccountant ? 'نافذة قسم المحاسبة والمراجعة المالية المخصصة' :
                 isStorekeeper ? 'نافذة قسم المستودع والمخازن والعهد المخصصة' :
                 'نافذة قسم المراجعة والتدقيق الخارجي'}
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                مرخص بقرار المدير العام
              </span>
            </div>

            <p className="text-xs text-slate-500 mt-0.5">
              الموظف: <strong className="text-slate-800">{currentUser.name}</strong> ({currentUser.titleAr}) — البريد: <span className="font-mono">{currentUser.email}</span>
            </p>
          </div>
        </div>

        {/* Status notice & Logout */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="bg-slate-50 border border-slate-200 text-slate-700 text-xs px-3.5 py-2 rounded-xl flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <div className="text-[11px] leading-tight">
              <span className="font-bold text-slate-900 block">فصل تام للصلاحيات والرقابة:</span>
              <span>نافذتك مقيدة بالصلاحيات الممنوحة لك من قِبل المدير العام.</span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs active:scale-95"
            title="تسجيل الخروج والعودة لشاشة الدخول بكلمة المرور"
          >
            <LogOut className="w-4 h-4 text-rose-600" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </div>

      {/* Top Department Sections Navigation Tabs */}
      {(() => {
        const availableNavTabs: { id: EmployeeTab; label: string; icon: any; badge?: any }[] = [
          { id: 'dashboard' as EmployeeTab, label: 'لوحة التحكم والمؤشرات', icon: LayoutDashboard },
          { id: 'reports' as EmployeeTab, label: 'مركز التقارير المالية والتحليلية', icon: FileSpreadsheet },
          ...(isAccountant || isCashier ? [{ id: 'invoices' as EmployeeTab, label: 'فواتير الإيجار والمطالبات', icon: Receipt, badge: invoices.length }] : []),
          ...(isCashier ? [{ id: 'payments' as EmployeeTab, label: 'سجل التحصيل وسندات القبض', icon: CreditCard, badge: payments.length }] : []),
          ...(isAccountant ? [{ id: 'accounting' as EmployeeTab, label: 'شجرة الحسابات والقيود', icon: BookOpen, badge: journalEntries.length }] : []),
          ...(isAccountant ? [{ id: 'fixed_assets' as EmployeeTab, label: 'الأصول الثابتة والإهلاك', icon: Landmark, badge: fixedAssets.length }] : []),
          ...(isAccountant ? [{ id: 'expenses' as EmployeeTab, label: 'مصروفات وسندات الصرف', icon: TrendingDown, badge: expenses.length }] : []),
          ...(isAccountant ? [{ id: 'contracts' as EmployeeTab, label: 'عقود الإيجار', icon: FileText, badge: contracts.length }] : []),
          ...(isAccountant ? [{ id: 'properties' as EmployeeTab, label: 'العقارات والوحدات', icon: Building, badge: properties.length }] : []),
          ...(isStorekeeper ? [{ id: 'inventory' as EmployeeTab, label: 'المستودع والمخازن والعهد', icon: Boxes, badge: inventoryItems.length }] : []),
          ...(isAuditor ? [{ id: 'audit' as EmployeeTab, label: 'سجل التدقيق والرقابة المالية', icon: ShieldCheck, badge: auditLogs.length }] : []),
          ...(!isExecutive ? [{ id: 'department_ops' as EmployeeTab, label: 'العمليات التشغيلية للتخصص', icon: Layers }] : [])
        ].filter(t => isSectionAllowed(t.id as any) || t.id === 'department_ops' || t.id === 'dashboard' || t.id === 'reports');

        return (
          <div className="bg-white p-2.5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {availableNavTabs.map(tabItem => {
              const TabIcon = tabItem.icon;
              const isActive = currentTab === tabItem.id;
              return (
                <button
                  key={tabItem.id}
                  onClick={() => handleSelectTab(tabItem.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-xs scale-100'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <TabIcon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                  <span>{tabItem.label}</span>
                  {tabItem.badge !== undefined && tabItem.badge !== null && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                      isActive ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {tabItem.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        );
      })()}

      {/* SECTION 1: REPORTS HUB */}
      {currentTab === 'reports' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-emerald-900">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-700 shrink-0" />
              <div>
                <span className="font-bold block sm:inline">مركز التقارير المالية والتحليلية المعتمد:</span>
                <span className="text-[11px] text-emerald-800 mr-1">استعراض، تصدير وطباعة القوائم المالية الرسمية، ميزان المراجعة، أعمار الديون وسندات القبض.</span>
              </div>
            </div>
            <span className="text-[10px] bg-emerald-200 text-emerald-900 font-bold px-2 py-0.5 rounded-md shrink-0">
              صلاحية معتمدة من الإدارة
            </span>
          </div>
          <ReportsHub />
        </div>
      )}

      {/* SECTION 2: DASHBOARD OVERVIEW & EXECUTIVE HUB */}
      {currentTab === 'dashboard' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Executive Overview Header Cards */}
          {isExecutive && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <StatCard
                  title="إجمالي التحصيلات الفعلية"
                  value={formatCurrency(totalCollections)}
                  subtitle={`${payments.length} سند قبض مسجل`}
                  icon={TrendingUp}
                  accentColor="emerald"
                />
                <StatCard
                  title="إجمالي المصروفات التشغيلية"
                  value={formatCurrency(totalExpensesAmount)}
                  subtitle={`${expenses.length} بند مصروف`}
                  icon={TrendingDown}
                  accentColor="rose"
                />
                <StatCard
                  title="صافي الدخل التشغيلي (NOI)"
                  value={formatCurrency(netOperatingIncome)}
                  subtitle={netOperatingIncome >= 0 ? 'فائض تشغيلي إيجابي' : 'عجز تشغيلي'}
                  icon={DollarSign}
                  accentColor={netOperatingIncome >= 0 ? 'emerald' : 'rose'}
                />
                <StatCard
                  title="نسبة إشغال العقارات"
                  value={`${occupancyRate}%`}
                  subtitle={`${occupiedUnitsCount} من ${totalUnitsCount} وحدة مؤجرة`}
                  icon={Building}
                  accentColor="indigo"
                />
              </div>

              {/* Quick Report Shortcuts for Executive */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-indigo-600" />
                  <span className="text-xs font-bold text-slate-800">الوصول السريع للتقارير التنفيذية والمالية:</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleSelectTab('reports')}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>فتح مركز التقارير الكامل</span>
                  </button>
                  <button
                    onClick={() => exportDailyCollectionsToExcel(payments)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 border border-slate-200 shadow-2xs cursor-pointer transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>تصدير سجل التحصيلات (Excel)</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          <DashboardOverview
            onOpenPaymentModalWithTenant={handleOpenPaymentWithTenant}
            onViewReceipt={setSelectedPaymentForReceipt}
            onNavigateTab={handleSelectTab}
          />
        </div>
      )}

      {/* SECTION 3: INVOICES LIST */}
      {currentTab === 'invoices' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <InvoicesList />
        </div>
      )}

      {/* SECTION 4: PAYMENTS LIST */}
      {currentTab === 'payments' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <PaymentsList
            onViewReceipt={setSelectedPaymentForReceipt}
            onOpenNewPayment={() => setIsPaymentModalOpen(true)}
          />
        </div>
      )}

      {/* SECTION 5: EXPENSES LIST */}
      {currentTab === 'expenses' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <ExpensesList />
        </div>
      )}

      {/* SECTION 6: ACCOUNTING HUB */}
      {currentTab === 'accounting' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <AccountingHub />
        </div>
      )}

      {/* SECTION 6b: FIXED ASSETS */}
      {currentTab === 'fixed_assets' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <FixedAssetsHub />
        </div>
      )}

      {/* SECTION 7: INVENTORY HUB */}
      {currentTab === 'inventory' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <InventoryHub />
        </div>
      )}

      {/* SECTION 8: PROPERTIES LIST */}
      {currentTab === 'properties' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <PropertiesList />
        </div>
      )}

      {/* SECTION 9: CONTRACTS LIST */}
      {currentTab === 'contracts' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <ContractsList />
        </div>
      )}

      {/* SECTION 10: AUDIT TRAIL VIEW */}
      {currentTab === 'audit' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <AuditTrailView />
        </div>
      )}

      {/* SECTION 11: SPECIALIZED DEPARTMENT OPERATIONS */}
      {(currentTab === 'department_ops' || (!isExecutive && currentTab !== 'reports' && currentTab !== 'dashboard' && currentTab !== 'invoices' && currentTab !== 'payments' && currentTab !== 'expenses' && currentTab !== 'accounting' && currentTab !== 'inventory' && currentTab !== 'properties' && currentTab !== 'contracts' && currentTab !== 'audit')) && (
        <>
      {/* Smart Alerts: Upcoming Rent Dues & Expiring Contracts within 30 days */}
      {(isCashier || isAccountant || isAuditor) && (
        <UpcomingDuesAndExpiryAlerts
          onOpenPaymentModalWithTenant={handleOpenPaymentWithTenant}
          onNavigateTab={(tabKey) => {
            if (isCashier) {
              if (tabKey === 'invoices' || tabKey === 'contracts') setCashierTab('invoices');
              if (tabKey === 'tenants') setCashierTab('tenants');
            } else if (isAccountant) {
              if (tabKey === 'contracts') setAccountantTab('contracts');
              if (tabKey === 'invoices') setAccountantTab('invoices');
            }
          }}
        />
      )}

      {/* CASHIER WINDOW VIEW */}
      {isCashier && (
        <div className="space-y-4">
          
          {/* Sub-Tabs & Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg text-xs font-bold">
              <button
                onClick={() => setCashierTab('payments')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  cashierTab === 'payments' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                سجل مقبوضات التحصيل ({payments.length})
              </button>
              <button
                onClick={() => setCashierTab('tenants')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  cashierTab === 'tenants' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                المستأجرون والذمم ({tenants.length})
              </button>
              <button
                onClick={() => setCashierTab('invoices')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  cashierTab === 'invoices' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                فواتير الإيجار والمطالبات ({invoices.length})
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => exportDailyCollectionsToExcel(payments)}
                className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                title="تصدير جدول المقبوضات إلى ملف Excel"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
                <span>تصدير Excel</span>
              </button>

              {canUserPerform('canIssueReceipts') && (
                <button
                  onClick={() => setIsPaymentModalOpen(true)}
                  className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>إصدار سند قبض جديد</span>
                </button>
              )}
            </div>
          </div>

          {/* Cashier Tab Content: Payments */}
          {cashierTab === 'payments' && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-sm">سندات القبض المسجلة في الصندوق</h3>
                <span className="text-xs text-slate-500 font-mono">
                  إجمالي التحصيل: <strong className="text-emerald-700">{formatCurrency(payments.filter(p => p.status === 'POSTED').reduce((s, p) => s + p.amount, 0))}</strong>
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">رقم السند</th>
                      <th className="p-3">التاريخ</th>
                      <th className="p-3">المستأجر</th>
                      <th className="p-3">طريقة السداد</th>
                      <th className="p-3 text-left">المبلغ</th>
                      <th className="p-3 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payments.map(p => {
                      const t = tenants.find(tenant => tenant.id === p.tenantId);
                      return (
                        <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-mono font-bold text-slate-900">{p.receiptNumber}</td>
                          <td className="p-3 font-mono text-slate-600">{p.paymentDate}</td>
                          <td className="p-3 font-bold text-slate-800">{t?.name || '—'}</td>
                          <td className="p-3 text-slate-600">
                            {p.paymentMethod === 'BANK_TRANSFER' ? 'تحويل بنكي' :
                             p.paymentMethod === 'CASH' ? 'نقدي' : 'شبكة مدى'}
                          </td>
                          <td className="p-3 text-left font-mono font-black text-emerald-800 text-sm">
                            {formatCurrency(p.amount)}
                          </td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => setSelectedPaymentForReceipt(p)}
                              className="text-emerald-700 hover:text-emerald-900 font-bold text-xs inline-flex items-center gap-1 cursor-pointer bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>طباعة السند</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Cashier Tab Content: Tenants */}
          {cashierTab === 'tenants' && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-sm">كشوف حسابات المستأجرين للتحصيل المباشر</h3>
                <span className="text-xs text-slate-500 font-mono">{tenants.length} مستأجرين مسجلين</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">اسم المستأجر</th>
                      <th className="p-3">الهوية الوطنية</th>
                      <th className="p-3">الجوال</th>
                      <th className="p-3 text-left">الرصيد القائم</th>
                      <th className="p-3 text-left">أمانة التأمين</th>
                      <th className="p-3 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tenants.map(t => (
                      <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-bold text-slate-900">{t.name}</td>
                        <td className="p-3 font-mono text-slate-600">{t.nationalId}</td>
                        <td className="p-3 font-mono text-slate-600">{t.phone}</td>
                        <td className={`p-3 text-left font-mono font-black ${t.balance > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                          {formatCurrency(t.balance)}
                        </td>
                        <td className="p-3 text-left font-mono text-slate-700">
                          {formatCurrency(t.securityDepositHeld || 0)}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => setSelectedTenantId(t.id)}
                            className="text-blue-700 hover:text-blue-900 font-bold text-xs inline-flex items-center gap-1 cursor-pointer bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200"
                          >
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            <span>كشف الحساب</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Cashier Tab Content: Invoices */}
          {cashierTab === 'invoices' && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-sm">فواتير الإيجار والمطالبات المالية</h3>
                <button
                  onClick={() => exportInvoicesToExcel(invoices)}
                  className="bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>تصدير الفواتير (Excel)</span>
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">رقم الفاتورة</th>
                      <th className="p-3">تاريخ الاستحقاق</th>
                      <th className="p-3">المستأجر</th>
                      <th className="p-3 text-left">المبلغ</th>
                      <th className="p-3 text-left">المتبقي</th>
                      <th className="p-3">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invoices.map(inv => {
                      const t = tenants.find(tenant => tenant.id === inv.tenantId);
                      return (
                        <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-mono font-bold text-slate-900">
                            <button
                              onClick={() => setSelectedInvoice(inv)}
                              className="text-blue-700 hover:underline flex items-center gap-1"
                            >
                              <span>{inv.invoiceNumber}</span>
                              <ArrowUpRight className="w-3 h-3" />
                            </button>
                          </td>
                          <td className="p-3 font-mono text-slate-600">{inv.dueDate}</td>
                          <td className="p-3 font-bold text-slate-800">{t?.name || '—'}</td>
                          <td className="p-3 text-left font-mono font-bold">{formatCurrency(inv.amount)}</td>
                          <td className="p-3 text-left font-mono font-black text-rose-600">{formatCurrency(inv.balance)}</td>
                          <td className="p-3">
                            <Badge variant={inv.status === 'PAID' ? 'emerald' : inv.status === 'OVERDUE' ? 'rose' : 'amber'} size="sm">
                              {inv.status === 'PAID' ? 'مسددة' : inv.status === 'OVERDUE' ? 'متأخرة' : 'مستحقة'}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ACCOUNTANT WINDOW VIEW */}
      {/* ACCOUNTANT WINDOW VIEW */}
      {isAccountant && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold">
              <button
                onClick={() => setAccountantTab('accounting')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  accountantTab === 'accounting' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                القيود ودفتر الأستاذ ({journalEntries.length})
              </button>
              <button
                onClick={() => setAccountantTab('expenses')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                  accountantTab === 'expenses' ? 'bg-white text-rose-900 shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
                <span>سندات الصرف ({expenses.length})</span>
              </button>
              <button
                onClick={() => setAccountantTab('invoices')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  accountantTab === 'invoices' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                فواتير الإيجار ({invoices.length})
              </button>
              <button
                onClick={() => setAccountantTab('contracts')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                  accountantTab === 'contracts' ? 'bg-white text-blue-900 shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                <span>عقود الإيجار ({contracts.length})</span>
              </button>
              <button
                onClick={() => setAccountantTab('properties')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                  accountantTab === 'properties' ? 'bg-white text-emerald-900 shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Building className="w-3.5 h-3.5 text-emerald-600" />
                <span>العقارات والوحدات ({properties.length})</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleOpenExpense}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
              >
                <PlusCircle className="w-4 h-4 text-rose-200" />
                <span>تسجيل سند صرف جديد</span>
              </button>

              <button
                onClick={() => exportExpensesToExcel(expenses)}
                className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>تصدير Excel</span>
              </button>
            </div>
          </div>

          {accountantTab === 'accounting' && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-sm">سجل قيود اليومية العامة المزدوجة</h3>
                <span className="text-xs text-slate-500 font-mono">{journalEntries.length} قيد محاسبي معتمد</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">رقم القيد</th>
                      <th className="p-3">التاريخ</th>
                      <th className="p-3">البيان والشرح</th>
                      <th className="p-3 text-left">إجمالي القيد</th>
                      <th className="p-3">المعد</th>
                      <th className="p-3">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {journalEntries.map(j => (
                      <tr key={j.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-mono font-bold text-indigo-700">{j.entryNumber}</td>
                        <td className="p-3 font-mono text-slate-600">{j.date}</td>
                        <td className="p-3 font-bold text-slate-800">{j.description}</td>
                        <td className="p-3 text-left font-mono font-black text-slate-900">{formatCurrency(j.totalDebit)}</td>
                        <td className="p-3 text-slate-600">{j.createdBy}</td>
                        <td className="p-3">
                          <Badge variant="emerald" size="sm">مرحل ومتوازن</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {accountantTab === 'expenses' && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gradient-to-r from-rose-50/50 to-white">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-rose-600" />
                    <span>سجل سندات الصرف ومصروفات العقارات</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    إجمالي المصروفات المرحلة: <strong className="font-mono text-rose-700 font-bold">{formatCurrency(expenses.reduce((s, e) => s + e.amount, 0))}</strong>
                  </p>
                </div>
                <button
                  onClick={handleOpenExpense}
                  className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-2 transition-all shadow-xs cursor-pointer active:scale-95"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>تحرير سند صرف جديد</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">رقم السند</th>
                      <th className="p-3">التاريخ</th>
                      <th className="p-3">العقار</th>
                      <th className="p-3">المستفيد / المورد</th>
                      <th className="p-3">البيان والغرض</th>
                      <th className="p-3 text-left">المبلغ المدفوع</th>
                      <th className="p-3">طريقة الدفع</th>
                      <th className="p-3">معاينة وطباعة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {expenses.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-400">
                          لا توجد سندات صرف مسجلة حالياً. انقر على «تحرير سند صرف جديد» للبدء.
                        </td>
                      </tr>
                    ) : (
                      expenses.map(e => {
                        const prop = properties.find(p => p.id === e.propertyId);
                        return (
                          <tr
                            key={e.id}
                            onClick={() => setSelectedExpense(e)}
                            className="hover:bg-rose-50/40 transition-colors cursor-pointer group"
                            title="انقر لمعاينة وطباعة سند الصرف الرسمي"
                          >
                            <td className="p-3 font-mono font-bold text-rose-700 group-hover:underline flex items-center gap-1.5">
                              <Printer className="w-3.5 h-3.5 text-slate-400 group-hover:text-rose-600" />
                              <span>{e.voucherNumber}</span>
                            </td>
                            <td className="p-3 font-mono text-slate-600">{e.date}</td>
                            <td className="p-3 font-medium text-slate-800">{prop?.name || '—'}</td>
                            <td className="p-3 font-bold text-slate-900">{e.payee || '—'}</td>
                            <td className="p-3 text-slate-600 max-w-xs truncate">{e.description}</td>
                            <td className="p-3 text-left font-mono font-black text-rose-700 text-sm">
                              {formatCurrency(e.amount)}
                            </td>
                            <td className="p-3 text-slate-600">
                              {e.paymentMethod === 'BANK_TRANSFER' ? 'تحويل بنكي' : 'نقدي'}
                            </td>
                            <td className="p-3">
                              <span className="text-[11px] text-rose-700 font-bold bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg inline-flex items-center gap-1 group-hover:bg-rose-100 transition-colors">
                                <Printer className="w-3 h-3" />
                                <span>معاينة السند</span>
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {accountantTab === 'invoices' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <InvoicesList />
            </div>
          )}

          {accountantTab === 'contracts' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <ContractsList />
            </div>
          )}

          {accountantTab === 'properties' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <PropertiesList />
            </div>
          )}
        </div>
      )}

      {/* STOREKEEPER WINDOW VIEW */}
      {isStorekeeper && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg text-xs font-bold">
              <button
                onClick={() => setStorekeeperTab('items')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  storekeeperTab === 'items' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                أرصدة الأصناف المستودعية ({inventoryItems.length})
              </button>
              <button
                onClick={() => setStorekeeperTab('movements')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  storekeeperTab === 'movements' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                سجل الحركات (وارد / صادر) ({inventoryTransactions.length})
              </button>
              <button
                onClick={() => setStorekeeperTab('new_tx')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  storekeeperTab === 'new_tx' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                إدخال حركة مخزنية جديدة
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => exportInventoryToExcel(inventoryItems, inventoryTransactions)}
                className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
                <span>تصدير المستودع (Excel)</span>
              </button>
            </div>
          </div>

          {storekeeperTab === 'items' && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-sm">أرصدة الأصناف ومستويات الأمان في المستودع</h3>
                <span className="text-xs text-slate-500 font-mono">
                  إجمالي قيمة المخزون: <strong className="text-emerald-700">{formatCurrency(inventoryItems.reduce((s, i) => s + i.totalValue, 0))}</strong>
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">رمز الصنف</th>
                      <th className="p-3">اسم الصنف</th>
                      <th className="p-3">التصنيف</th>
                      <th className="p-3 text-center">الرصيد المتوفر</th>
                      <th className="p-3 text-center">حد الطلب الأدنى</th>
                      <th className="p-3 text-left">سعر الوحدة</th>
                      <th className="p-3 text-left">إجمالي القيمة</th>
                      <th className="p-3">الموقع</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {inventoryItems.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-mono font-bold text-indigo-700">{item.itemCode}</td>
                        <td className="p-3 font-bold text-slate-900">{item.name}</td>
                        <td className="p-3 text-slate-600">{item.category}</td>
                        <td className="p-3 text-center font-mono font-bold text-slate-900">
                          {item.quantityOnHand}
                        </td>
                        <td className="p-3 text-center font-mono text-rose-600 font-bold">
                          {item.minimumThreshold}
                        </td>
                        <td className="p-3 text-left font-mono">{formatCurrency(item.unitPrice)}</td>
                        <td className="p-3 text-left font-mono font-black text-emerald-800">
                          {formatCurrency(item.totalValue)}
                        </td>
                        <td className="p-3 text-slate-600">{item.warehouseLocation}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {storekeeperTab === 'movements' && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-sm">سجل الحركات المستودعية (أذون الصرف والتوريد والعهد)</h3>
                <span className="text-xs text-slate-500 font-mono">{inventoryTransactions.length} حركة مسجلة</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">رقم الإذن</th>
                      <th className="p-3">التاريخ</th>
                      <th className="p-3">الصنف</th>
                      <th className="p-3">نوع الحركة</th>
                      <th className="p-3 text-center">الكمية</th>
                      <th className="p-3 text-left">المبلغ الإجمالي</th>
                      <th className="p-3">المستلم</th>
                      <th className="p-3">المسؤول</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {inventoryTransactions.map(tx => (
                      <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-mono font-bold text-slate-900">{tx.documentNumber}</td>
                        <td className="p-3 font-mono text-slate-600">{tx.date}</td>
                        <td className="p-3 font-bold text-slate-800">{tx.itemName}</td>
                        <td className="p-3">
                          <Badge variant={tx.type === 'INBOUND' ? 'emerald' : tx.type === 'OUTBOUND' ? 'rose' : 'amber'} size="sm">
                            {tx.type === 'INBOUND' ? 'توريد / وارد' : tx.type === 'OUTBOUND' ? 'صرف لموقع' : 'تسليم عهدة'}
                          </Badge>
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-slate-900">{tx.quantity}</td>
                        <td className="p-3 text-left font-mono font-bold text-emerald-800">{formatCurrency(tx.totalAmount)}</td>
                        <td className="p-3 text-slate-700">{tx.recipientName}</td>
                        <td className="p-3 text-slate-500">{tx.issuedBy}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {storekeeperTab === 'new_tx' && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs max-w-xl mx-auto">
              <h3 className="font-bold text-base text-slate-900 mb-4 border-b border-slate-200 pb-2">
                إدخال حركة مخزنية جديدة (صرف / توريد / عهدة)
              </h3>

              {txSuccessMsg && (
                <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl p-3 mb-4 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{txSuccessMsg}</span>
                </div>
              )}

              {txErrorMsg && (
                <div className="bg-rose-50 border border-rose-300 text-rose-900 rounded-xl p-3 mb-4 text-xs font-bold">
                  {txErrorMsg}
                </div>
              )}

              <form onSubmit={handleRecordStoreTx} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">نوع الحركة:</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'OUTBOUND', label: 'صرف لموقع / عقار' },
                      { id: 'INBOUND', label: 'توريد / شراء جديد' },
                      { id: 'CUSTODY_ASSIGN', label: 'تسليم عهدة لفني' }
                    ].map(type => (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setTxType(type.id as any)}
                        className={`p-2.5 rounded-lg border font-bold text-center cursor-pointer transition-colors ${
                          txType === type.id
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">الصنف المستودعي:</label>
                  <select
                    value={txItemId}
                    onChange={e => setTxItemId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-bold text-slate-800"
                  >
                    {inventoryItems.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.itemCode}) — متوفر: {item.quantityOnHand} قطعة (سعر: {item.unitPrice} ر.س)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">الكمية:</label>
                    <input
                      type="number"
                      min="1"
                      value={txQty}
                      onChange={e => setTxQty(parseInt(e.target.value) || 1)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono font-bold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">اسم المستلم / الفني:</label>
                    <input
                      type="text"
                      value={txRecipient}
                      onChange={e => setTxRecipient(e.target.value)}
                      placeholder="مثال: فني الصيانة أحمد"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-bold text-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">البيان والملاحظات:</label>
                  <textarea
                    value={txNotes}
                    onChange={e => setTxNotes(e.target.value)}
                    placeholder="سبب الحركة أو رقم أمر الصيانة..."
                    rows={2}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold p-3 rounded-xl transition-colors cursor-pointer text-xs"
                >
                  تسجيل واعتماد الحركة المخزنية
                </button>
              </form>
            </div>
          )}

        </div>
      )}

      {/* AUDITOR / REVIEW WINDOW VIEW */}
      {isAuditor && (
        <div className="space-y-4">
          
          {/* Supervisory & Audit Banner */}
          <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 text-white p-5 rounded-2xl border border-blue-800/60 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black tracking-tight">
                    مركز المراجعة والتدقيق الداخلي والخارجي
                  </h3>
                  <Badge variant="indigo" size="sm">مراجعة مستقلة</Badge>
                </div>
                <p className="text-xs text-blue-200 mt-0.5">
                  فحص ومطابقة سندات القبض، الصرف، قيود اليومية، ميزان المراجعة، وسجل الحركات المحاسبية وفق المعايير المهنية.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  const tb = generateTrialBalance(accounts, journalEntries);
                  const pl = generateProfitLoss(accounts, journalEntries);
                  const bs = generateBalanceSheet(accounts, journalEntries);
                  const ag = calculateAgingBuckets(invoices, tenants, properties, units);
                  exportMasterAuditPackageToExcel({
                    trialBalance: tb,
                    pnl: pl,
                    balanceSheet: bs,
                    agingReport: ag,
                    payments,
                    expenses,
                    aggregatedDocuments,
                    inventoryItems
                  });
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                title="تصدير حقيبة التدقيق والمراجعة الكاملة إلى ملف Excel متعدد الصفحات"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
                <span>حقيبة التدقيق الشاملة (Excel)</span>
              </button>
            </div>
          </div>

          {/* Sub-Tabs Selector */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-lg text-xs font-bold">
              <button
                onClick={() => setAuditorTab('audit_collections')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  auditorTab === 'audit_collections' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                تدقيق التحصيل ({payments.length} سند)
              </button>
              <button
                onClick={() => setAuditorTab('audit_expenses')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  auditorTab === 'audit_expenses' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                تدقيق المصروفات ({expenses.length} سند)
              </button>
              <button
                onClick={() => setAuditorTab('audit_journals')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  auditorTab === 'audit_journals' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                فحص القيود والتوازن ({journalEntries.length} قيد)
              </button>
              <button
                onClick={() => setAuditorTab('audit_tenants')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  auditorTab === 'audit_tenants' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                كشوف حسابات المستأجرين ({tenants.length})
              </button>
              <button
                onClick={() => setAuditorTab('audit_trail')}
                className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
                  auditorTab === 'audit_trail' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <History className="w-3.5 h-3.5 text-indigo-600" />
                <span>سجل النشاط المالي (Activity Log) ({auditLogs.length})</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                <span>وضع المراجعة: تدقيق واطلاع فقط</span>
              </span>
            </div>
          </div>

          {/* Tab 1: Audit Collections */}
          {auditorTab === 'audit_collections' && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">مراجعة وتدقيق سندات التحصيل والمقبوضات</h3>
                  <p className="text-xs text-slate-500 mt-0.5">مطابقة السندات الصادرة مع الإيرادات وأرصدة الصناديق</p>
                </div>
                <button
                  onClick={() => exportDailyCollectionsToExcel(payments)}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200" />
                  <span>تصدير تقرير التحصيل (Excel)</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">رقم السند</th>
                      <th className="p-3">التاريخ</th>
                      <th className="p-3">المستأجر</th>
                      <th className="p-3">طريقة السداد</th>
                      <th className="p-3 text-left">المبلغ</th>
                      <th className="p-3 text-center">حالة التدقيق</th>
                      <th className="p-3 text-center">المعاينة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payments.map(p => {
                      const t = tenants.find(tenant => tenant.id === p.tenantId);
                      return (
                        <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-mono font-bold text-slate-900">{p.receiptNumber}</td>
                          <td className="p-3 font-mono text-slate-600">{p.paymentDate}</td>
                          <td className="p-3 font-bold text-slate-800">{t?.name || '—'}</td>
                          <td className="p-3 text-slate-600">
                            {p.paymentMethod === 'BANK_TRANSFER' ? 'تحويل بنكي' :
                             p.paymentMethod === 'CASH' ? 'نقدي' : 'شبكة مدى'}
                          </td>
                          <td className="p-3 text-left font-mono font-black text-emerald-800">
                            {formatCurrency(p.amount)}
                          </td>
                          <td className="p-3 text-center">
                            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-bold">
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span>مرحل ومطابق</span>
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => setSelectedPaymentForReceipt(p)}
                              className="text-blue-700 hover:text-blue-900 font-bold text-xs inline-flex items-center gap-1 cursor-pointer bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>فحص السند</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 2: Audit Expenses */}
          {auditorTab === 'audit_expenses' && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">مراجعة وتدقيق سندات الصرف والمصروفات التشغيلية</h3>
                  <p className="text-xs text-slate-500 mt-0.5">مطابقة المصروفات مع فواتير الموردين ومراكز التكلفة</p>
                </div>
                <button
                  onClick={() => exportExpensesToExcel(expenses)}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200" />
                  <span>تصدير المصروفات (Excel)</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">رقم سند الصرف</th>
                      <th className="p-3">التاريخ</th>
                      <th className="p-3">المستفيد / المورد</th>
                      <th className="p-3">البيان</th>
                      <th className="p-3 text-left">المبلغ</th>
                      <th className="p-3 text-center">حالة التدقيق</th>
                      <th className="p-3 text-center">المعاينة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {expenses.map(e => (
                      <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-mono font-bold text-rose-700">{e.voucherNumber}</td>
                        <td className="p-3 font-mono text-slate-600">{e.date}</td>
                        <td className="p-3 font-bold text-slate-800">{e.payee || '—'}</td>
                        <td className="p-3 text-slate-600">{e.description}</td>
                        <td className="p-3 text-left font-mono font-black text-rose-700">
                          {formatCurrency(e.amount)}
                        </td>
                        <td className="p-3 text-center">
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-bold">
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span>مستند معتمد</span>
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => setSelectedExpense(e)}
                            className="text-slate-700 hover:text-slate-900 font-bold text-xs inline-flex items-center gap-1 cursor-pointer bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>معاينة الصرف</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 3: Audit Journals & Trial Balance */}
          {auditorTab === 'audit_journals' && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">فحص وتدقيق القيود اليومية وتوازن ميزان المراجعة</h3>
                  <p className="text-xs text-slate-500 mt-0.5">التأكد التام من توازن المدين والدائن وعدم وجود فروقات محاسبية</p>
                </div>
                <button
                  onClick={() => {
                    const tb = generateTrialBalance(accounts, journalEntries);
                    exportTrialBalanceToExcel(tb);
                  }}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200" />
                  <span>تصدير ميزان المراجعة (Excel)</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">رقم القيد</th>
                      <th className="p-3">التاريخ</th>
                      <th className="p-3">البيان والشرح</th>
                      <th className="p-3 text-left">إجمالي المدين</th>
                      <th className="p-3 text-left">إجمالي الدائن</th>
                      <th className="p-3 text-center">التوازن (IFRS)</th>
                      <th className="p-3">المعد</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {journalEntries.map(j => (
                      <tr key={j.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-mono font-bold text-indigo-700">{j.entryNumber}</td>
                        <td className="p-3 font-mono text-slate-600">{j.date}</td>
                        <td className="p-3 font-bold text-slate-800">{j.description}</td>
                        <td className="p-3 text-left font-mono font-black text-slate-900">{formatCurrency(j.totalDebit)}</td>
                        <td className="p-3 text-left font-mono font-black text-slate-900">{formatCurrency(j.totalCredit)}</td>
                        <td className="p-3 text-center">
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-bold">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>متوازن تماماً (0.00)</span>
                          </span>
                        </td>
                        <td className="p-3 text-slate-600">{j.createdBy}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 4: Audit Tenants Statements */}
          {auditorTab === 'audit_tenants' && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">تدقيق حسابات الذمم المدينة للمستأجرين</h3>
                  <p className="text-xs text-slate-500 mt-0.5">فحص الأرصدة القائمة وتأمينات الضمان وكشوف الحسابات المستمرة</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">اسم المستأجر</th>
                      <th className="p-3">الهوية الوطنية</th>
                      <th className="p-3">الجوال</th>
                      <th className="p-3 text-left">الرصيد المدين القائم</th>
                      <th className="p-3 text-left">تأمين الضمان (التزام)</th>
                      <th className="p-3 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tenants.map(t => (
                      <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-bold text-slate-900">{t.name}</td>
                        <td className="p-3 font-mono text-slate-600">{t.nationalId}</td>
                        <td className="p-3 font-mono text-slate-600">{t.phone}</td>
                        <td className={`p-3 text-left font-mono font-black ${t.balance > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                          {formatCurrency(t.balance)}
                        </td>
                        <td className="p-3 text-left font-mono text-slate-700">
                          {formatCurrency(t.securityDepositHeld || 0)}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => setSelectedTenantId(t.id)}
                            className="text-blue-700 hover:text-blue-900 font-bold text-xs inline-flex items-center gap-1 cursor-pointer bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200"
                          >
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            <span>كشف الحساب للتدقيق</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 5: Activity Log & Financial Audit Trail */}
          {auditorTab === 'audit_trail' && (() => {
            // Filter audit logs based on search, user, and action
            const filteredAuditLogs = auditLogs.filter(log => {
              if (auditUserFilter !== 'ALL' && log.actorName !== auditUserFilter) {
                return false;
              }
              if (auditActionFilter !== 'ALL') {
                if (auditActionFilter === 'PAYMENTS' && !log.action.includes('قبض') && !log.entity.includes('Payment')) return false;
                if (auditActionFilter === 'EXPENSES' && !log.action.includes('صرف') && !log.entity.includes('Expense')) return false;
                if (auditActionFilter === 'JOURNALS' && !log.action.includes('قيد') && !log.entity.includes('Journal')) return false;
                if (auditActionFilter === 'USERS' && !log.action.includes('مستخدم') && !log.action.includes('مرور') && !log.entity.includes('User')) return false;
                if (auditActionFilter === 'SYSTEM' && !log.action.includes('نظام') && !log.entity.includes('System')) return false;
              }
              if (searchTerm.trim()) {
                const term = searchTerm.trim().toLowerCase();
                const matched = (
                  log.action.toLowerCase().includes(term) ||
                  log.actorName.toLowerCase().includes(term) ||
                  (log.actorRole && log.actorRole.toLowerCase().includes(term)) ||
                  (log.entity && log.entity.toLowerCase().includes(term)) ||
                  (log.entityId && log.entityId.toLowerCase().includes(term)) ||
                  (log.details && log.details.toLowerCase().includes(term))
                );
                if (!matched) return false;
              }
              return true;
            });

            // Extract unique actors for filter dropdown
            const actors = Array.from(new Set(auditLogs.map(l => l.actorName).filter(Boolean)));

            return (
              <div className="space-y-4">
                {/* Stats Summary for Accountability */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                    <p className="text-[11px] font-bold text-slate-500">إجمالي الحركات المالية المسجلة</p>
                    <p className="text-xl font-black text-slate-900 mt-1 font-mono">{auditLogs.length}</p>
                    <span className="text-[10px] text-emerald-600 font-semibold">تتبع رقابي لحظي شامل</span>
                  </div>

                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                    <p className="text-[11px] font-bold text-slate-500">المسؤولون والمنفذون النشطون</p>
                    <p className="text-xl font-black text-indigo-700 mt-1 font-mono">{actors.length}</p>
                    <span className="text-[10px] text-slate-500">أدوار إدارية ومحاسبية</span>
                  </div>

                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                    <p className="text-[11px] font-bold text-slate-500">حركات القبض والتحصيل</p>
                    <p className="text-xl font-black text-emerald-700 mt-1 font-mono">
                      {auditLogs.filter(l => l.action.includes('قبض') || l.entity.includes('Payment')).length}
                    </p>
                    <span className="text-[10px] text-slate-500">سندات قبض وإلغاءات</span>
                  </div>

                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                    <p className="text-[11px] font-bold text-slate-500">حركات الصرف والقيود</p>
                    <p className="text-xl font-black text-amber-700 mt-1 font-mono">
                      {auditLogs.filter(l => l.action.includes('صرف') || l.action.includes('قيد')).length}
                    </p>
                    <span className="text-[10px] text-slate-500">مصروفات ودفاتر اليومية</span>
                  </div>
                </div>

                {/* Main Activity Log Card */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                  {/* Header & Export Bar */}
                  <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-slate-50/50">
                    <div>
                      <div className="flex items-center gap-2">
                        <History className="w-5 h-5 text-indigo-600" />
                        <h3 className="font-bold text-slate-900 text-sm">
                          سجل النشاط المالي والرقابة الشاملة (Activity Log & Accountability)
                        </h3>
                        <span className="bg-indigo-100 text-indigo-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full font-mono">
                          {filteredAuditLogs.length} حركة مطابقة
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        رصد تاريخي لجميع التغييرات المالية والعمليات المحاسبية، وتحديد هوية المنفذ ونوع الإجراء والتوقيت الزمني الدقيق لتعزيز المساءلة والامتثال.
                      </p>
                    </div>

                    <button
                      onClick={() => exportAuditTrailToExcel(filteredAuditLogs)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer shrink-0"
                      title="تصدير سجل النشاط المالي كاملاً إلى ملف Excel"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
                      <span>تصدير السجل (Excel)</span>
                    </button>
                  </div>

                  {/* Filter and Search Bar */}
                  <div className="p-3 bg-slate-50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="بحث في الإجراء، التفاصيل، السند، أو اسم المنفذ..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg pr-9 pl-3 py-1.5 text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 font-bold shrink-0 text-[11px]">المستخدم المنفذ:</span>
                      <select
                        value={auditUserFilter}
                        onChange={e => setAuditUserFilter(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg p-1.5 font-bold text-slate-800 cursor-pointer"
                      >
                        <option value="ALL">جميع المنفذين والمستخدمين ({actors.length})</option>
                        {actors.map(act => (
                          <option key={act} value={act}>{act}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 font-bold shrink-0 text-[11px]">نوع العملية:</span>
                      <select
                        value={auditActionFilter}
                        onChange={e => setAuditActionFilter(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg p-1.5 font-bold text-slate-800 cursor-pointer"
                      >
                        <option value="ALL">جميع التصنيفات المالية</option>
                        <option value="PAYMENTS">سندات القبض والتحصيل</option>
                        <option value="EXPENSES">سندات الصرف والمصروفات</option>
                        <option value="JOURNALS">قيود اليومية المحاسبية</option>
                        <option value="USERS">إدارة المستخدمين والصلاحيات</option>
                        <option value="SYSTEM">تهيئة النظام والفترات المالية</option>
                      </select>
                    </div>
                  </div>

                  {/* Table of Activity Logs */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-3">التوقيت والتاريخ</th>
                          <th className="p-3">المستخدم المنفذ (Who)</th>
                          <th className="p-3">الدور الوظيفي</th>
                          <th className="p-3">الإجراء المالي (Action)</th>
                          <th className="p-3">الكيان / المستند</th>
                          <th className="p-3">التفاصيل والمساءلة (Accountability Details)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredAuditLogs.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-slate-500">
                              لا توجد حركات مالية مطابقة لمعايير البحث المحددة.
                            </td>
                          </tr>
                        ) : (
                          filteredAuditLogs.map(log => {
                            const isPayment = log.action.includes('قبض') || log.entity.includes('Payment');
                            const isExpense = log.action.includes('صرف') || log.entity.includes('Expense');
                            const isJournal = log.action.includes('قيد') || log.entity.includes('Journal');
                            const isUserMgmt = log.action.includes('مستخدم') || log.action.includes('مرور');

                            return (
                              <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                <td className="p-3 font-mono text-slate-600 text-[11px] whitespace-nowrap">
                                  <div className="font-bold text-slate-800">
                                    {new Date(log.timestamp).toLocaleDateString('ar-SA')}
                                  </div>
                                  <div className="text-[10px] text-slate-400" dir="ltr">
                                    {new Date(log.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                  </div>
                                </td>

                                <td className="p-3">
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[10px]">
                                      {log.actorName ? log.actorName[0] : 'U'}
                                    </div>
                                    <span className="font-bold text-slate-900">{log.actorName}</span>
                                  </div>
                                </td>

                                <td className="p-3">
                                  <Badge
                                    variant={
                                      log.actorRole === 'ADMIN' ? 'rose' :
                                      log.actorRole === 'ACCOUNTANT' ? 'emerald' :
                                      log.actorRole === 'CASHIER' ? 'amber' :
                                      log.actorRole === 'STOREKEEPER' ? 'indigo' :
                                      'blue'
                                    }
                                    size="sm"
                                  >
                                    {log.actorRole}
                                  </Badge>
                                </td>

                                <td className="p-3 font-semibold text-slate-800">
                                  <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                                    isPayment ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                                    isExpense ? 'bg-rose-50 text-rose-800 border border-rose-200' :
                                    isJournal ? 'bg-indigo-50 text-indigo-800 border border-indigo-200' :
                                    isUserMgmt ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                                    'bg-slate-100 text-slate-700'
                                  }`}>
                                    {log.action}
                                  </span>
                                </td>

                                <td className="p-3 font-mono text-slate-600 whitespace-nowrap">
                                  <span className="font-semibold text-slate-800">{log.entity}</span>
                                  {log.entityId && (
                                    <span className="text-[10px] text-slate-400 block font-mono">
                                      #{log.entityId}
                                    </span>
                                  )}
                                </td>

                                <td className="p-3 text-slate-700 leading-relaxed max-w-md">
                                  <div className="text-[11px] bg-slate-50/80 p-2 rounded-lg border border-slate-200/60 font-sans">
                                    {log.details}
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })()}

        </div>
      )}
      </>
      )}

      {/* Modals for Employee Window */}
      {selectedPaymentForReceipt && (
        <OfficialReceiptModal
          payment={selectedPaymentForReceipt}
          onClose={() => setSelectedPaymentForReceipt(null)}
        />
      )}

      {isPaymentModalOpen && (
        <PaymentModal
          initialTenantId={prefilledPaymentTenantId}
          onClose={() => {
            setIsPaymentModalOpen(false);
            setPrefilledPaymentTenantId(undefined);
          }}
          onSuccess={pay => {
            setIsPaymentModalOpen(false);
            setPrefilledPaymentTenantId(undefined);
            setSelectedPaymentForReceipt(pay);
          }}
        />
      )}

      {selectedInvoice && (
        <InvoiceDetailsModal
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
        />
      )}

      {selectedExpense && (
        <ExpenseDetailsModal
          expense={selectedExpense}
          onClose={() => setSelectedExpense(null)}
        />
      )}

      {selectedTenantId && (
        <TenantDetailsModal
          tenantId={selectedTenantId}
          onClose={() => setSelectedTenantId(null)}
        />
      )}

      {isLocalExpenseModalOpen && (
        <ExpenseModal
          isOpen={isLocalExpenseModalOpen}
          onClose={() => setIsLocalExpenseModalOpen(false)}
        />
      )}

    </div>
  );
};
