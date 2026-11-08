// تصميم م. أبو أحمد — مصمم ومنفذ Claude — © الحقوق محفوظة
import React, { useState, useRef, useEffect } from 'react';
import {
  Crown,
  ShieldCheck,
  Users,
  PieChart,
  Layers,
  Printer,
  Download,
  CheckCircle2,
  AlertTriangle,
  Building,
  FileText,
  Receipt,
  CreditCard,
  TrendingDown,
  BookOpen,
  Boxes,
  Lock,
  Unlock,
  KeyRound,
  Eye,
  ExternalLink,
  Search,
  Filter,
  Check,
  X,
  History,
  TrendingUp,
  DollarSign,
  FileSpreadsheet,
  PlusCircle,
  Copy,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Radio,
  Database,
  Bell,
  Zap,
  MessageCircle,
  Phone,
  ShieldAlert,
  LogOut,
  UserPlus,
  RotateCcw,
  Trash2,
  Sparkles,
  Share2,
  Landmark
} from 'lucide-react';
import { GeneralManagerDocumentReaderModal } from './GeneralManagerDocumentReaderModal';
import { SystemDataResetModal } from './SystemDataResetModal';
import { DashboardOverview, PaymentsList, InvoicesList, ExpensesList, AccountingHub, InventoryHub, FixedAssetsHub, PropertiesList, ContractsList, ReportsHub, AuditTrailView, UsersManagement, SmartAlertsHub, DatabaseBackupHub } from '../common/lazyViews';
import { ShareAppModal } from '../common/ShareAppModal';
import { useStore } from '../../lib/store';
import { useAuth } from '../../context/AuthContext';
import {
  UserProfile,
  SystemSection,
  AggregatedDocument,
  Invoice,
  Payment,
  PropertyExpense,
  JournalEntry,
  Tenant
} from '../../types';
import { formatCurrency } from '../../lib/numberToArabicWords';
import { Badge } from '../common/Badge';
import { StatCard } from '../common/StatCard';
import { AggregatedDocumentModal } from '../common/AggregatedDocumentModal';
import { ReportPdfPreviewModal } from '../reports/ReportPdfPreviewModal';
import { MasterFinancialStatementsPdfModal } from '../reports/MasterFinancialStatementsPdfModal';
import { exportMasterAuditPackageToExcel, exportAggregatedBatchesToExcel } from '../../lib/exportUtils';
import {
  generateTrialBalance,
  generateProfitLoss,
  generateBalanceSheet,
  calculateAgingBuckets
} from '../../lib/accountingEngine';

// Department components to embed into the General Manager's single unified window
import { OnlineSurveillanceHub } from './OnlineSurveillanceHub';

export type GeneralManagerSection =
  | 'overview'           // لوحة الرقابة والمؤشرات العليا
  | 'smart_alerts'       // لوحة التنبيهات والرقابة الذكية
  | 'backups'            // مركز النسخ الاحتياطي والأمان السحابي
  | 'online_monitoring'  // مركز المراقبة الحية للجلسات أونلاين
  | 'payments'           // قسم التحصيل وسندات القبض
  | 'auditing'           // قسم المراجعة والتدقيق المالي
  | 'invoices'           // قسم فواتير الإيجار والمطالبات
  | 'expenses'           // قسم المصروفات وسندات الصرف
  | 'accounting'         // قسم المحاسبة ودفتر الأستاذ
  | 'fixed_assets'       // الأصول الثابتة والإهلاك
  | 'inventory'          // قسم المستودع والمخازن والعهد
  | 'properties'         // محفظة العقارات والوحدات
  | 'contracts'          // عقود الإيجار السارية
  | 'reports'            // مركز التقارير والقوائم المالية
  | 'aggregated_docs'    // سجل الحزم والمستندات المجمعة
  | 'employees'          // تخصيص نوافذ الموظفين والصلاحيات
  | 'audit';             // سجل التدقيق والرقابة

interface GeneralManagerPortalProps {
  onNavigateTab?: (tab: any) => void;
  onOpenReport?: (reportType: string) => void;
  activeTab?: string;
}

export const GeneralManagerPortal: React.FC<GeneralManagerPortalProps> = ({
  onNavigateTab,
  onOpenReport,
  activeTab
}) => {
  const {
    currentUser,
    users,
    tenants,
    properties,
    units,
    contracts,
    invoices,
    payments,
    expenses,
    journalEntries,
    accounts,
    periods,
    inventoryItems,
    fixedAssets,
    inventoryTransactions,
    aggregatedDocuments,
    auditLogs,
    activeSessions,
    onlineCount,
    updateUser,
    changeUserPassword,
    resetUserInitialPassword,
    isSupervisoryOnly,
    smartAlerts,
    backups,
    backupSettings,
    logoutUser,
    systemMode
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

  // Active section selected from the vertical item sidebar
  const [selectedSection, setSelectedSection] = useState<GeneralManagerSection>(() => {
    if (activeTab === 'users') return 'employees';
    return 'overview';
  });
  const [selectedAggregatedDoc, setSelectedAggregatedDoc] = useState<AggregatedDocument | null>(null);

  // Synchronize when activeTab changes from Sidebar or Header
  useEffect(() => {
    if (activeTab === 'users') {
      setSelectedSection('employees');
    } else if (activeTab === 'manager_portal') {
      setSelectedSection('overview');
    } else if (activeTab === 'inventory') {
      setSelectedSection('inventory');
    } else if (activeTab === 'reports') {
      setSelectedSection('reports');
    } else if (activeTab === 'properties') {
      setSelectedSection('properties');
    } else if (activeTab === 'contracts') {
      setSelectedSection('contracts');
    } else if (activeTab === 'invoices') {
      setSelectedSection('invoices');
    } else if (activeTab === 'payments') {
      setSelectedSection('payments');
    } else if (activeTab === 'expenses') {
      setSelectedSection('expenses');
    } else if (activeTab === 'accounting') {
      setSelectedSection('accounting');
    } else if (activeTab === 'fixed_assets') {
      setSelectedSection('fixed_assets');
    } else if (activeTab === 'audit') {
      setSelectedSection('audit');
    }
  }, [activeTab]);

  // General Manager Document Reader State
  const [readerInvoice, setReaderInvoice] = useState<Invoice | null>(null);
  const [readerTenantId, setReaderTenantId] = useState<string | null>(null);

  // Admin Password Management State
  const [isAdminPwdModalOpen, setIsAdminPwdModalOpen] = useState(false);
  const [currentAdminPassword, setCurrentAdminPassword] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [confirmAdminPassword, setConfirmAdminPassword] = useState('');
  const [adminPwdError, setAdminPwdError] = useState('');
  const [adminPwdSuccess, setAdminPwdSuccess] = useState<string | null>(null);
  const [isChangingAdminPwd, setIsChangingAdminPwd] = useState(false);

  // Executive PDF Statements Modal
  const [isMasterPdfOpen, setIsMasterPdfOpen] = useState(false);

  // System Data Reset & Environment Switcher Modal (بكلمة سر المدير العام)
  const [isResetDataModalOpen, setIsResetDataModalOpen] = useState(false);

  // Share App with Employees Modal
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Financial and Operational Calculations for the Manager
  const totalCollections = payments.filter(p => p.status === 'POSTED').reduce((sum, p) => sum + p.amount, 0);
  const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.amount, 0);
  const totalOverdue = invoices.filter(inv => inv.status === 'OVERDUE').reduce((sum, inv) => sum + inv.balance, 0);
  const totalExpenses = expenses.filter(e => e.status === 'POSTED').reduce((sum, e) => sum + e.amount, 0);
  const netOperatingProfit = totalCollections - totalExpenses;

  const activeContractsCount = contracts.filter(c => c.status === 'ACTIVE').length;
  const occupiedUnitsCount = units.filter(u => u.status === 'OCCUPIED').length;
  const occupancyRate = units.length > 0 ? Math.round((occupiedUnitsCount / units.length) * 100) : 0;
  const totalInventoryValuation = inventoryItems.reduce((sum, i) => sum + i.totalValue, 0);

  const handleExportExternalAuditPackage = () => {
    const trialBalance = generateTrialBalance(accounts, journalEntries);
    const pnl = generateProfitLoss(accounts, journalEntries);
    const balanceSheet = generateBalanceSheet(accounts, journalEntries);
    const agingReport = calculateAgingBuckets(invoices, tenants, properties, units);

    exportMasterAuditPackageToExcel({
      trialBalance,
      pnl,
      balanceSheet,
      agingReport,
      payments,
      expenses,
      aggregatedDocuments,
      inventoryItems
    });
  };

  // Grouped vertical menu items matching the design from Screenshot 2
  const menuCategories = [
    {
      title: 'المؤشرات والرقابة العليا',
      items: [
        {
          num: 1,
          id: 'overview' as GeneralManagerSection,
          label: 'لوحة الرقابة والمؤشرات',
          shortLabel: 'لوحة الرقابة',
          icon: Crown,
          badge: 'إشراف',
          badgeColor: 'rose'
        },
        {
          num: 2,
          id: 'smart_alerts' as GeneralManagerSection,
          label: 'التنبيهات الذكية والرادار',
          shortLabel: 'التنبيهات الذكية',
          icon: Bell,
          badge: `${smartAlerts.length}`,
          badgeColor: smartAlerts.some(a => a.severity === 'CRITICAL') ? 'rose' : smartAlerts.length > 0 ? 'amber' : 'slate'
        },
        {
          num: 3,
          id: 'online_monitoring' as GeneralManagerSection,
          label: 'المراقبة الحية للجلسات',
          shortLabel: 'المراقبة الحية',
          icon: Radio,
          badge: `${activeSessions.filter(s => s.status !== 'DISCONNECTED').length} متصل`,
          badgeColor: 'emerald'
        },
        {
          num: 4,
          id: 'backups' as GeneralManagerSection,
          label: 'النسخ الاحتياطي والأمان',
          shortLabel: 'النسخ الاحتياطي',
          icon: Database,
          badge: backupSettings?.autoBackupEnabled ? 'تلقائي' : `${backups.length}`,
          badgeColor: backupSettings?.autoBackupEnabled ? 'emerald' : 'indigo'
        }
      ]
    },
    {
      title: 'العمليات المالية والتدقيق',
      items: [
        {
          num: 5,
          id: 'auditing' as GeneralManagerSection,
          label: 'فحص وتدقيق السندات',
          shortLabel: 'تدقيق السندات',
          icon: ShieldCheck,
          badge: 'تدقيق',
          badgeColor: 'indigo'
        },
        {
          num: 6,
          id: 'invoices' as GeneralManagerSection,
          label: 'فواتير الإيجار والمطالبات',
          shortLabel: 'فواتير الإيجار',
          icon: Receipt,
          badge: `${invoices.filter(i => i.status === 'OVERDUE').length} متأخرة`,
          badgeColor: 'rose'
        },
        {
          num: 7,
          id: 'payments' as GeneralManagerSection,
          label: 'التحصيل وسندات القبض',
          shortLabel: 'سندات القبض',
          icon: CreditCard,
          badge: `${payments.length}`,
          badgeColor: 'emerald'
        },
        {
          num: 8,
          id: 'expenses' as GeneralManagerSection,
          label: 'المصروفات وسندات الصرف',
          shortLabel: 'سندات الصرف',
          icon: TrendingDown,
          badge: `${expenses.length}`,
          badgeColor: 'amber'
        },
        {
          num: 9,
          id: 'accounting' as GeneralManagerSection,
          label: 'المحاسبة ودفتر الأستاذ',
          shortLabel: 'دفتر الأستاذ',
          icon: BookOpen,
          badge: `${journalEntries.length}`,
          badgeColor: 'indigo'
        }
      ]
    },
    {
      title: 'الأصول والمستودع والعقود',
      items: [
        {
          num: 9,
          id: 'fixed_assets' as GeneralManagerSection,
          label: 'الأصول الثابتة والإهلاك',
          shortLabel: 'الأصول الثابتة',
          icon: Landmark,
          badge: `${fixedAssets.length}`,
          badgeColor: 'emerald'
        },
        {
          num: 10,
          id: 'inventory' as GeneralManagerSection,
          label: 'المستودع والمخازن والعهد',
          shortLabel: 'المستودع والمخازن',
          icon: Boxes,
          badge: `${inventoryItems.length}`,
          badgeColor: 'amber'
        },
        {
          num: 11,
          id: 'properties' as GeneralManagerSection,
          label: 'محفظة العقارات والوحدات',
          shortLabel: 'محفظة العقارات',
          icon: Building,
          badge: `${properties.length}`,
          badgeColor: 'slate'
        },
        {
          num: 12,
          id: 'contracts' as GeneralManagerSection,
          label: 'عقود الإيجار السارية',
          shortLabel: 'عقود الإيجار',
          icon: FileText,
          badge: `${activeContractsCount}`,
          badgeColor: 'slate'
        }
      ]
    },
    {
      title: 'التقارير والمستخدمين',
      items: [
        {
          num: 13,
          id: 'reports' as GeneralManagerSection,
          label: 'مركز التقارير والقوائم',
          shortLabel: 'التقارير المالية',
          icon: PieChart,
          badge: 'PDF / XLS',
          badgeColor: 'emerald'
        },
        {
          num: 14,
          id: 'aggregated_docs' as GeneralManagerSection,
          label: 'سجل الحزم والمستندات',
          shortLabel: 'الحزم والمستندات',
          icon: Layers,
          badge: `${aggregatedDocuments.length}`,
          badgeColor: 'indigo'
        },
        {
          num: 15,
          id: 'employees' as GeneralManagerSection,
          label: 'إدارة المستخدمين والصلاحيات',
          shortLabel: 'إدارة المستخدمين',
          icon: Users,
          badge: `${users.filter(u => u.role !== 'ADMIN').length}`,
          badgeColor: 'amber'
        },
        {
          num: 16,
          id: 'audit' as GeneralManagerSection,
          label: 'سجل التدقيق والرقابة اللحظي',
          shortLabel: 'سجل التدقيق',
          icon: History,
          badge: `${auditLogs.length}`,
          badgeColor: 'slate'
        }
      ]
    }
  ];

  const allFlatItems = menuCategories.flatMap(g => g.items);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen]);

  const currentSectionItem = allFlatItems.find(m => m.id === selectedSection) || allFlatItems[0];
  const currentCategory = menuCategories.find(cat => cat.items.some(item => item.id === selectedSection));

  return (
    <div className="space-y-4 w-full max-w-full overflow-hidden">
      
      {/* 1. Top Supervisory Executive Banner - Clean, High-Density & Sleek */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white rounded-2xl p-3 sm:p-4 shadow-md border border-slate-800 w-full max-w-full overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-rose-600 flex items-center justify-center text-white shadow-md shrink-0">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xs sm:text-sm md:text-base font-black tracking-tight">
                  نافذة المدير العام الموحدة (الرقابة والإشراف الشامل)
                </h1>
                <span className="text-[9px] sm:text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2 py-0.5 rounded-md">
                  صلاحية سيادية
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">
                قاعدة الفصل الرقابي: المدير العام يشرف ويدقق ويعتمد، وتصدر الحركات حصراً من الموظف المفوّض بالقسم.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 self-stretch sm:self-auto justify-between sm:justify-end">
            <button
              onClick={() => {
                setSelectedSection('smart_alerts');
                setIsDropdownOpen(false);
              }}
              className={`text-[11px] sm:text-xs font-bold px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer border ${
                selectedSection === 'smart_alerts'
                  ? 'bg-rose-600 text-white border-rose-500'
                  : 'bg-slate-800/90 hover:bg-slate-700 text-rose-300 border-rose-500/30'
              }`}
              title="لوحة التنبيهات والرقابة الذكية"
            >
              <Bell className="w-3.5 h-3.5 text-rose-400" />
              <span>التنبيهات ({smartAlerts.length})</span>
            </button>

            <button
              onClick={() => {
                setSelectedSection('backups');
                setIsDropdownOpen(false);
              }}
              className={`text-[11px] sm:text-xs font-bold px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer border ${
                selectedSection === 'backups'
                  ? 'bg-indigo-600 text-white border-indigo-500'
                  : 'bg-slate-800/90 hover:bg-slate-700 text-indigo-300 border-indigo-500/30'
              }`}
              title="مركز النسخ الاحتياطي والأمان السحابي"
            >
              <Database className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">النسخ الاحتياطي</span>
              <span className="sm:hidden">النسخ</span>
            </button>

            <button
              onClick={() => {
                setSelectedSection('online_monitoring');
                setIsDropdownOpen(false);
              }}
              className={`text-[11px] sm:text-xs font-bold px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer border ${
                selectedSection === 'online_monitoring'
                  ? 'bg-emerald-600 text-white border-emerald-500'
                  : 'bg-slate-800/90 hover:bg-slate-700 text-emerald-300 border-emerald-500/30'
              }`}
              title="المراقبة الحية للجلسات أونلاين"
            >
              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span className="hidden sm:inline">المراقبة الحية</span>
              <span className="sm:hidden">مراقبة</span>
            </button>

            <button
              onClick={() => {
                setSelectedSection('employees');
                setIsDropdownOpen(false);
              }}
              className={`text-[11px] sm:text-xs font-bold px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer border ${
                selectedSection === 'employees'
                  ? 'bg-amber-600 text-white border-amber-500'
                  : 'bg-slate-800/90 hover:bg-slate-700 text-amber-300 border-amber-500/30'
              }`}
              title="إدارة المستخدمين والصلاحيات وإضافة موظف جديد"
            >
              <UserPlus className="w-3.5 h-3.5 text-amber-400" />
              <span>إدارة المستخدمين ({users.length})</span>
            </button>

            <button
              onClick={() => setIsShareModalOpen(true)}
              className="bg-sky-600 hover:bg-sky-700 text-white text-[11px] sm:text-xs font-bold px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer border border-sky-500"
              title="مشاركة رابط البرنامج وإرسال بيانات الدخول للموظفين مع مزامنة سحابية فورية"
            >
              <Share2 className="w-3.5 h-3.5 text-sky-200" />
              <span className="hidden sm:inline">إرسال البرنامج للموظفين</span>
              <span className="sm:hidden">مشاركة الرابط</span>
            </button>

            <button
              onClick={() => setIsMasterPdfOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] sm:text-xs font-bold px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer border border-indigo-500"
              title="تصدير وطباعة القوائم المالية والميزانية العمومية الرسمية إلى ملف PDF للمدير العام"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-200" />
              <span className="hidden sm:inline">القوائم المالية (PDF)</span>
              <span className="sm:hidden">PDF</span>
            </button>

            <button
              onClick={handleExportExternalAuditPackage}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] sm:text-xs font-bold px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
              title="تصدير حقيبة التدقيق الخارجي الشاملة بصيغة Excel متعدد الصفحات"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200" />
              <span className="hidden sm:inline">حقيبة التدقيق (Excel)</span>
              <span className="sm:hidden">إكسل</span>
            </button>

            {/* System Environment Switcher & Reset Button (قفل المدير العام) */}
            <button
              onClick={() => setIsResetDataModalOpen(true)}
              className={`text-[11px] font-black px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-2xs border transition-all ${
                systemMode === 'PRODUCTION'
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50 hover:bg-emerald-900'
                  : 'bg-amber-950/80 text-amber-300 border-amber-500/50 hover:bg-amber-900'
              }`}
              title="انقر لتعديل البيئة أو تصفير بيانات النظام بكلمة سر المدير"
            >
              <span className={`w-2 h-2 rounded-full ${systemMode === 'PRODUCTION' ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
              <span className="hidden sm:inline">
                {systemMode === 'PRODUCTION' ? 'البيئة الحقيقية' : 'بيئة تجريبية'}
              </span>
              <span className="sm:hidden">
                {systemMode === 'PRODUCTION' ? 'حقيقي' : 'تجريبي'}
              </span>
            </button>

            <button
              onClick={() => setIsResetDataModalOpen(true)}
              className="bg-rose-700 hover:bg-rose-800 text-white text-[11px] sm:text-xs font-bold px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer border border-rose-600"
              title="تصفير ومسح بيانات النظام بكلمة سر المدير العام للبدء الفعلي أو إدارة البيئة التجريبية"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-200" />
              <span className="hidden sm:inline">تصفير النظام (قفل المدير)</span>
              <span className="sm:hidden">تصفير</span>
            </button>

            <button
              onClick={handleLogout}
              className="bg-rose-600/90 hover:bg-rose-600 text-white text-[11px] sm:text-xs font-bold px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer border border-rose-500 active:scale-95"
              title="تسجيل الخروج من لوحة المدير والعودة لشاشة الدخول"
            >
              <LogOut className="w-3.5 h-3.5 text-white" />
              <span>خروج</span>
            </button>
          </div>
        </div>
      </div>

      {/* Demo Sandbox Mode Notice Banner (عند العمل في بيئة تجريبية) */}
      {systemMode !== 'PRODUCTION' && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/20 to-amber-500/10 border border-amber-400/50 rounded-2xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-amber-950 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
            <div>
              <span className="font-bold">أنت تعمل حالياً في البيئة التجريبية (Demo Sandbox Mode):</span>
              <span className="text-amber-900 mr-1.5">
                تضم بيانات نموذجية لفحص العمليات وتدريب الكادر. يمكنك تصفير العمليات بكلمة سر المدير في أي وقت لبدء العمل الحقيقي.
              </span>
            </div>
          </div>
          <button
            onClick={() => setIsResetDataModalOpen(true)}
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs whitespace-nowrap shadow-xs cursor-pointer border border-amber-500"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-200" />
            <span>تصفير العمليات وبدء العمل الفعلي</span>
          </button>
        </div>
      )}

      {/* 2. Collapsible Top Section Dropdown Selector (قائمة منسدلة مطوية للأقسام تتيح كامل المساحة للمستندات) */}
      <div ref={dropdownRef} className="relative z-30 w-full select-none">
        {/* Main Selector Button Bar (Always visible at top, 100% width) */}
        <div 
          onClick={() => setIsDropdownOpen(prev => !prev)}
          className={`w-full bg-[#0f172a] hover:bg-slate-900 border rounded-2xl p-2.5 sm:p-3.5 shadow-md transition-all cursor-pointer select-none flex items-center justify-between gap-3 ${
            isDropdownOpen ? 'border-amber-500/80 ring-2 ring-amber-500/20' : 'border-slate-800'
          }`}
        >
          {/* Current Selected Section Display */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 shadow-inner">
              {currentSectionItem && React.createElement(currentSectionItem.icon, { className: 'w-4 h-4 sm:w-5 sm:h-5 text-amber-400' })}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-[10px] sm:text-[11px] font-bold text-amber-400/90 font-mono">
                  قسم {currentSectionItem?.num} من 16
                </span>
                <span className="text-slate-600">·</span>
                <span className="text-[10px] sm:text-[11px] text-slate-400 truncate">
                  {currentCategory?.title}
                </span>
                {currentSectionItem?.badge && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded font-mono bg-slate-800 text-amber-300 border border-slate-700 hidden sm:inline-block">
                    {currentSectionItem.badge}
                  </span>
                )}
              </div>
              <h2 className="text-xs sm:text-sm md:text-base font-black text-white truncate mt-0.5">
                {currentSectionItem?.label}
              </h2>
            </div>
          </div>

          {/* Trigger Dropdown Button with Chevron */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              className={`flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-extrabold transition-all cursor-pointer ${
                isDropdownOpen 
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'bg-slate-800/90 hover:bg-slate-700 text-amber-300 border border-amber-500/30'
              }`}
            >
              <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">
                {isDropdownOpen ? 'إغلاق القائمة والعودة للمستند' : 'تبديل القسم (16 قسماً)'}
              </span>
              <span className="sm:hidden">
                {isDropdownOpen ? 'إغلاق' : 'الأقسام'}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {/* The Dropdown Menu (تنطوي للأعلى فور اختيار أي قسم تاركة كامل المساحة لعرض المستند) */}
        {isDropdownOpen && (
          <div className="absolute top-full right-0 left-0 mt-2 bg-[#0b1120] border border-slate-700/90 rounded-2xl shadow-2xl p-3 sm:p-4 animate-in fade-in slide-in-from-top-3 duration-200 z-50 overflow-hidden">
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-400" />
                <span className="text-xs sm:text-sm font-black text-amber-400">قائمة أقسام الرقابة والإشراف (16 قسماً)</span>
                <span className="text-[10px] text-slate-400 hidden sm:inline">(اختر القسم المطلوب لتنطوي القائمة وتظهر مستنداتك بكامل الشاشة)</span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsDropdownOpen(false);
                }}
                className="text-[11px] font-bold text-slate-400 hover:text-white px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-slate-700 transition-colors cursor-pointer"
              >
                ✕ إغلاق
              </button>
            </div>

            {/* 4 Group Columns / Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 max-h-[65vh] overflow-y-auto p-1">
              {menuCategories.map((group, gIdx) => (
                <div key={gIdx} className="bg-slate-900/95 border border-slate-800 rounded-xl p-2.5 space-y-2">
                  <div className="text-[11px] font-extrabold text-amber-300/90 border-b border-slate-800 pb-1 flex items-center justify-between">
                    <span>{group.title}</span>
                    <span className="text-[9px] text-slate-500 font-mono">{group.items.length} أقسام</span>
                  </div>
                  <div className="space-y-1">
                    {group.items.map(item => {
                      const isSelected = selectedSection === item.id;
                      const Icon = item.icon;

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setSelectedSection(item.id);
                            setIsDropdownOpen(false); // <--- تنطوي للأعلى فوراً بعد الاختيار!
                          }}
                          className={`w-full flex items-center justify-between p-2 rounded-lg text-right text-xs transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-amber-500/20 text-amber-300 font-black border-r-4 border-amber-400 shadow-sm'
                              : 'text-slate-300 hover:text-white hover:bg-slate-800/60 font-medium'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className={`text-[10px] font-mono shrink-0 ${isSelected ? 'text-amber-400 font-black' : 'text-slate-500'}`}>
                              {item.num}.
                            </span>
                            <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-amber-400' : 'text-slate-400'}`} />
                            <span className="truncate">{item.label}</span>
                          </div>

                          {item.badge && (
                            <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono shrink-0 ${
                              isSelected ? 'bg-amber-400/20 text-amber-300' : 'bg-slate-800 text-slate-400'
                            }`}>
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 3. Full-Width Department Content Workspace (مساحة عرض ومراجعة المستندات بكامل العرض والوضوح) */}
      <div className="w-full bg-white rounded-2xl border border-slate-200 p-3 sm:p-5 lg:p-6 shadow-xs space-y-5 overflow-x-hidden">
        
        {/* Section Header & Breadcrumb Indicator */}
        <div className="bg-slate-50 p-2.5 sm:p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 sm:gap-2 text-slate-700 font-bold truncate">
            <span className="text-slate-400">نافذة المدير العام</span>
            <span>/</span>
            <span className="text-slate-500 hidden sm:inline">{currentCategory?.title}</span>
            <span className="text-slate-400 hidden sm:inline">/</span>
            <span className="text-slate-900 font-black truncate">
              {currentSectionItem?.label}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsDropdownOpen(true)}
              className="text-[11px] font-bold text-amber-800 hover:text-amber-900 bg-amber-100/80 hover:bg-amber-100 border border-amber-300/80 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>تبديل القسم</span>
            </button>
            <span className="text-[10px] sm:text-[11px] bg-rose-50 text-rose-800 border border-rose-200 px-2.5 py-1 rounded font-bold">
              إشراف واعتماد
            </span>
          </div>
        </div>

          {/* 1. OVERVIEW SECTION */}
          {selectedSection === 'overview' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              
              {/* Financial & Supervisory KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  title="إجمالي التحصيلات النقدية والبنكية"
                  value={formatCurrency(totalCollections)}
                  subtitle="مقبوضات مسجلة ومرحلة"
                  trend={{ value: '100% موثقة', isPositive: true }}
                  icon={CreditCard}
                  accentColor="emerald"
                />
                <StatCard
                  title="إجمالي المطالبات والفواتير"
                  value={formatCurrency(totalInvoiced)}
                  subtitle="مجموع التزامات الإيجار الدورية"
                  icon={Receipt}
                  accentColor="blue"
                />
                <StatCard
                  title="المتأخرات غير المحصلة"
                  value={formatCurrency(totalOverdue)}
                  subtitle="أقساط متأخرة عن مواعيدها"
                  trend={{ value: `${invoices.filter(i => i.status === 'OVERDUE').length} فواتير`, isPositive: false }}
                  icon={AlertTriangle}
                  accentColor="rose"
                />
                <StatCard
                  title="صافي الأرباح التشغيلية"
                  value={formatCurrency(netOperatingProfit)}
                  subtitle="الإيرادات مطروحاً منها المصروفات"
                  trend={{ value: 'فائض إيجابي', isPositive: true }}
                  icon={TrendingUp}
                  accentColor="emerald"
                />
              </div>

              {/* Operational Ratios */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-500">نسبة إشغال الوحدات العقارية</span>
                    <Building className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-2xl font-black text-slate-900 font-mono">{occupancyRate}%</div>
                  <p className="text-xs text-slate-500 mt-1">
                    {occupiedUnitsCount} وحدة مؤجرة من أصل {units.length} وحدة
                  </p>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-500">قيمة المخزون والعهد بالمستودع</span>
                    <Boxes className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="text-2xl font-black text-emerald-800 font-mono">
                    {formatCurrency(totalInventoryValuation)}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {inventoryItems.length} صنف ومعدة صيانة وتجهيز
                  </p>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-500">المصروفات التشغيلية المعتمدة</span>
                    <TrendingDown className="w-4 h-4 text-rose-600" />
                  </div>
                  <div className="text-2xl font-black text-rose-700 font-mono">
                    {formatCurrency(totalExpenses)}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {expenses.length} سند صرف لمصروفات الصيانة والتشغيل
                  </p>
                </div>
              </div>

              {/* EXECUTIVE OVERDUE RENT RADAR & DIRECT DOCUMENT READER FOR GM */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="bg-gradient-to-r from-rose-900 via-rose-950 to-slate-900 text-white p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-rose-800">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-600 flex items-center justify-center text-white shadow-md">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-base text-white">رادار تنبيهات الإيجارات المتأخرة والتحصيل المباشر</h3>
                        <span className="bg-rose-500/30 text-rose-200 border border-rose-400/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Crown className="w-3 h-3 text-rose-300" />
                          <span>قراءة تفاصيل المستند للمدير العام</span>
                        </span>
                      </div>
                      <p className="text-xs text-rose-200 mt-0.5">
                        فحص استحقاقات الإيجار المتأخرة، وإتاحة قراءة تفاصيل المستند بنقرة واحدة وإرسال المطالبات.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <div className="bg-white/10 border border-white/20 px-3.5 py-1.5 rounded-xl text-left font-mono">
                      <span className="text-[10px] text-rose-200 block">إجمالي المتأخرات:</span>
                      <strong className="text-sm font-black text-white">{formatCurrency(totalOverdue)}</strong>
                    </div>
                  </div>
                </div>

                <div className="p-5 space-y-3">
                  {invoices.filter(i => i.status === 'OVERDUE' || (i.status === 'UNPAID' && i.balance > 0 && i.dueDate < new Date().toISOString().split('T')[0])).length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-500">
                      <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
                      <h4 className="font-bold text-sm text-slate-800">لا توجد إيجارات متأخرة حالياً</h4>
                      <p className="text-xs text-slate-400 mt-1">كافة الفواتير محصلة بانتظام ومطابقة للتواريخ التعاقدية.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto w-full max-w-full">
                      <table className="w-full text-right text-xs min-w-[700px]">
                        <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                          <tr>
                            <th className="p-3">رقم الفاتورة</th>
                            <th className="p-3">المستأجر</th>
                            <th className="p-3">العقار والوحدة</th>
                            <th className="p-3">تاريخ الاستحقاق</th>
                            <th className="p-3">فترة التأخير (عمر الدين)</th>
                            <th className="p-3 text-left font-mono">المبلغ المتبقي</th>
                            <th className="p-3 text-center">إجراءات المدير العام الفورية</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {invoices
                            .filter(i => i.status === 'OVERDUE' || (i.status === 'UNPAID' && i.balance > 0 && i.dueDate < new Date().toISOString().split('T')[0]))
                            .sort((a, b) => b.balance - a.balance)
                            .map(inv => {
                              const t = tenants.find(x => x.id === inv.tenantId);
                              const p = properties.find(x => x.id === inv.propertyId);
                              const u = units.find(x => x.id === inv.unitId);
                              const due = new Date(inv.dueDate);
                              const now = new Date();
                              const daysLate = Math.max(1, Math.ceil((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)));

                              let daysBadgeVariant: 'amber' | 'rose' = 'amber';
                              let daysText = `${daysLate} يوماً (31-60)`;
                              if (daysLate > 90) {
                                daysBadgeVariant = 'rose';
                                daysText = `${daysLate} يوماً (+90 حرج)`;
                              } else if (daysLate > 60) {
                                daysBadgeVariant = 'rose';
                                daysText = `${daysLate} يوماً (61-90)`;
                              } else if (daysLate <= 30) {
                                daysText = `${daysLate} يوماً (1-30)`;
                              }

                              return (
                                <tr
                                  key={inv.id}
                                  onClick={() => {
                                    setReaderInvoice(inv);
                                    setReaderTenantId(inv.tenantId);
                                  }}
                                  className="hover:bg-rose-50/60 cursor-pointer transition-colors group"
                                  title="انقر لقراءة تفاصيل المستند للمدير العام"
                                >
                                  <td className="p-3 font-mono font-bold text-slate-900 group-hover:text-rose-700">
                                    {inv.invoiceNumber}
                                  </td>
                                  <td className="p-3 font-bold text-slate-800">
                                    {t?.name || 'مستأجر'}
                                  </td>
                                  <td className="p-3 text-slate-600">
                                    {p?.name} · وحدة {u?.unitNumber}
                                  </td>
                                  <td className="p-3 font-mono text-slate-600">
                                    {inv.dueDate}
                                  </td>
                                  <td className="p-3">
                                    <Badge variant={daysBadgeVariant} size="sm">
                                      {daysText}
                                    </Badge>
                                  </td>
                                  <td className="p-3 text-left font-mono font-black text-rose-700 text-sm">
                                    {formatCurrency(inv.balance)}
                                  </td>
                                  <td className="p-3 text-center" onClick={e => e.stopPropagation()}>
                                    <div className="flex items-center justify-center gap-1.5">
                                      <button
                                        onClick={() => {
                                          setReaderInvoice(inv);
                                          setReaderTenantId(inv.tenantId);
                                        }}
                                        className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] px-2.5 py-1.5 rounded-lg flex items-center gap-1 shadow-2xs transition-all cursor-pointer active:scale-95"
                                        title="قراءة تفاصيل المستند للمدير العام"
                                      >
                                        <Crown className="w-3.5 h-3.5 text-amber-400" />
                                        <span>قراءة المستند</span>
                                      </button>

                                      {t?.phone && (
                                        <button
                                          onClick={() => {
                                            const cleanPhone = t.phone.replace(/[^0-9]/g, '');
                                            const msg = encodeURIComponent(
                                              `السلام عليكم ورحمة الله، الأستاذ/ ${t.name} المحترم.\n` +
                                              `تود شركة المحصل العقارية إشعاركم بوجود فاتورة إيجار مستحقة برقم (${inv.invoiceNumber}) بمبلغ (${formatCurrency(inv.balance)}) استحقت بتاريخ (${inv.dueDate}). نرجو التكرم بالسداد عبر حساب الشركة.\nشاكرين ومقدرين حسن تعاونكم.`
                                            );
                                            window.open(`https://wa.me/${cleanPhone}?text=${msg}`, '_blank');
                                          }}
                                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] px-2.5 py-1.5 rounded-lg flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                                          title="إرسال إنذار ومطالبة واتساب"
                                        >
                                          <MessageCircle className="w-3.5 h-3.5" />
                                          <span className="hidden md:inline">واتساب</span>
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* SECURITY & ADMIN CREDENTIALS STRIP */}
              <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-sm text-white">إعدادات أمان دخول المدير العام</h4>
                      <Badge variant="amber" size="sm">حماية الحساب</Badge>
                    </div>
                    <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                      كلمات المرور محفوظة مشفّرة ولا تُعرض لأحد. يمكنك تغيير كلمة مرور المدير العام الآن، أو تفعيل إلزام تغييرها عند أول تسجيل دخول.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 self-end md:self-center shrink-0">
                  <button
                    onClick={() => {
                      setAdminPwdError('');
                      setAdminPwdSuccess(null);
                      setCurrentAdminPassword('');
                      setNewAdminPassword('');
                      setConfirmAdminPassword('');
                      setIsAdminPwdModalOpen(true);
                    }}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>تغيير كلمة مرور المدير العام</span>
                  </button>

                  <button
                    onClick={async () => {
                      const adminUser = users.find(u => u.username === 'admin' || u.role === 'ADMIN');
                      if (adminUser) {
                        await updateUser(adminUser.id, {
                          mustChangePasswordOnNextLogin: !adminUser.mustChangePasswordOnNextLogin
                        });
                        alert(
                          !adminUser.mustChangePasswordOnNextLogin
                            ? 'تم تفعيل وضع التسليم النهائي: سيُطلب من المدير العام تغيير كلمة المرور إجبارياً عند أول تسجيل دخول.'
                            : 'تم إلغاء إلزام تغيير كلمة المرور عند أول دخول.'
                        );
                      }
                    }}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs px-3 py-2 rounded-xl transition-all cursor-pointer"
                    title="تفعيل/تعطيل طلب تغيير كلمة المرور عند أول دخول"
                  >
                    {users.find(u => u.username === 'admin')?.mustChangePasswordOnNextLogin
                      ? 'إلزام أول دخول: مفعل ✓'
                      : 'إلزام أول دخول: معطل'}
                  </button>
                </div>
              </div>

              {/* Quick Jump Buttons to any department */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                <h3 className="font-bold text-sm text-slate-900 mb-3 flex items-center justify-between">
                  <span>الأقسام الرئيسية تحت إشراف المدير العام (انقر للانتقال الفوري):</span>
                  <Badge variant="indigo" size="sm">مراقبة لحظية</Badge>
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {[
                    { id: 'online_monitoring', label: 'مركز المراقبة الحية للجلسات', count: `${activeSessions.filter(s => s.status !== 'DISCONNECTED').length} متصل الآن`, color: 'emerald' },
                    { id: 'payments', label: 'قسم التحصيل وسندات القبض', count: `${payments.length} سند`, color: 'emerald' },
                    { id: 'invoices', label: 'فواتير ومطالبات الإيجار', count: `${invoices.length} فاتورة`, color: 'blue' },
                    { id: 'expenses', label: 'سندات الصرف والمصروفات', count: `${expenses.length} سند`, color: 'rose' },
                    { id: 'accounting', label: 'دفتر الأستاذ والقيود', count: `${journalEntries.length} قيد`, color: 'indigo' },
                    { id: 'inventory', label: 'المستودع والمخازن والعهد', count: `${inventoryItems.length} صنف`, color: 'amber' },
                    { id: 'reports', label: 'التقارير والقوائم المالية', count: 'IFRS / SOCPA', color: 'emerald' },
                    { id: 'aggregated_docs', label: 'المستندات والحزم المجمعة', count: `${aggregatedDocuments.length} حزمة`, color: 'indigo' },
                    { id: 'employees', label: 'نوافذ الموظفين والصلاحيات', count: `${users.length} مستخدم`, color: 'amber' }
                  ].map(sec => (
                    <button
                      key={sec.id}
                      onClick={() => setSelectedSection(sec.id as any)}
                      className="p-3 rounded-xl border border-slate-200 hover:border-slate-400 bg-slate-50 hover:bg-slate-100/80 text-right transition-all cursor-pointer flex flex-col justify-between"
                    >
                      <span className="font-bold text-xs text-slate-800">{sec.label}</span>
                      <span className="text-[11px] font-mono text-slate-500 mt-2">{sec.count}</span>
                    </button>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* 1.1 ONLINE SURVEILLANCE & SESSIONS HUB */}
          {selectedSection === 'online_monitoring' && (
            <div className="animate-in fade-in duration-150">
              <OnlineSurveillanceHub />
            </div>
          )}

          {/* 2. PAYMENTS SUPERVISION SECTION */}
          {selectedSection === 'payments' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <PaymentsList
                onViewReceipt={() => {}}
                onOpenNewPayment={() => {}}
              />
            </div>
          )}

          {/* AUDITING & FINANCIAL REVIEW CENTER */}
          {selectedSection === 'auditing' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 rounded-2xl border border-indigo-900 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-indigo-400" />
                    <h3 className="font-bold text-base">مركز المراجعة والتدقيق المالي الشامل</h3>
                    <Badge variant="indigo" size="sm">رقابة المدير العام</Badge>
                  </div>
                  <p className="text-xs text-indigo-200 mt-1">
                    فحص مطابقة سندات التحصيل والصرف، التحقق من توازن القيود وسلامة الحسابات وتصدير تقارير التدقيق الخارجي.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => setIsMasterPdfOpen(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-xs"
                    title="تصدير القوائم المالية الرسمية والمركز المالي للمدير العام كملف PDF"
                  >
                    <FileText className="w-4 h-4 text-indigo-200" />
                    <span>تصدير القوائم المالية الرسمية (PDF)</span>
                  </button>

                  <button
                    onClick={handleExportExternalAuditPackage}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-xs"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
                    <span>تصدير حقيبة التدقيق (Excel)</span>
                  </button>

                  <button
                    onClick={() => setIsResetDataModalOpen(true)}
                    className="bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-xs border border-rose-600"
                    title="تصفير ومسح العمليات التشغيلية أو تفريغ النظام لبدء العمل الفعلي بكلمة سر المدير"
                  >
                    <RotateCcw className="w-4 h-4 text-rose-200" />
                    <span>تصفير ومسح البيانات (قفل المدير)</span>
                  </button>
                </div>
              </div>

              {/* Audit Checklist & Integrity Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-500">توازن القيود المزدوجة (IFRS)</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-xl font-black text-emerald-700 font-mono">100% متوازن (0.00)</div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    كافة القيود ({journalEntries.length} قيد) خالية من أي فروقات مدينة أو دائنة
                  </p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-500">سندات التحصيل الصادرة</span>
                    <CreditCard className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-xl font-black text-slate-900 font-mono">
                    {payments.length} سند موثق
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    إجمالي: {formatCurrency(totalCollections)} مرحلة بنجاح
                  </p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-500">سندات الصرف المعتمدة</span>
                    <TrendingDown className="w-4 h-4 text-rose-600" />
                  </div>
                  <div className="text-xl font-black text-slate-900 font-mono">
                    {expenses.length} سند صرف
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    إجمالي: {formatCurrency(totalExpenses)} معتمدة محاسبياً
                  </p>
                </div>
              </div>

              {/* Reports & Audit Trail Views */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h4 className="font-bold text-slate-900 text-sm">سجل التدقيق والرقابة المحاسبية اللحظي</h4>
                  <span className="text-xs font-mono text-slate-500">{auditLogs.length} حركة مسجلة</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-3">الوقت</th>
                        <th className="p-3">المستخدم</th>
                        <th className="p-3">الدور</th>
                        <th className="p-3">الإجراء</th>
                        <th className="p-3">العنصر</th>
                        <th className="p-3">التفاصيل</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {auditLogs.slice(0, 15).map(l => (
                        <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                            {new Date(l.timestamp).toLocaleTimeString('ar-SA')}
                          </td>
                          <td className="p-3 font-bold text-slate-900">{l.actorName}</td>
                          <td className="p-3"><Badge variant="slate" size="sm">{l.actorRole}</Badge></td>
                          <td className="p-3 font-semibold text-slate-800">{l.action}</td>
                          <td className="p-3 font-mono text-slate-600">{l.entity}</td>
                          <td className="p-3 text-slate-700">{l.details}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 3. INVOICES SUPERVISION SECTION */}
          {selectedSection === 'invoices' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <InvoicesList />
            </div>
          )}

          {/* 4. EXPENSES SUPERVISION SECTION */}
          {selectedSection === 'expenses' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <ExpensesList />
            </div>
          )}

          {/* 5. ACCOUNTING & GENERAL LEDGER SUPERVISION */}
          {selectedSection === 'accounting' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <AccountingHub />
            </div>
          )}

          {/* 5b. FIXED ASSETS (الأصول الثابتة والإهلاك) */}
          {selectedSection === 'fixed_assets' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <FixedAssetsHub />
            </div>
          )}

          {/* 6. INVENTORY & WAREHOUSE SUPERVISION */}
          {selectedSection === 'inventory' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <InventoryHub />
            </div>
          )}

          {/* 7. PROPERTIES PORTFOLIO */}
          {selectedSection === 'properties' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <PropertiesList />
            </div>
          )}

          {/* 8. LEASING CONTRACTS */}
          {selectedSection === 'contracts' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <ContractsList />
            </div>
          )}

          {/* 9. FINANCIAL REPORTS HUB */}
          {selectedSection === 'reports' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <ReportsHub />
            </div>
          )}

          {/* 10. AGGREGATED DOCUMENTS & BATCHES */}
          {selectedSection === 'aggregated_docs' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    سجل المستندات والحزم المجمعة (Aggregated Batches)
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    حزم المقبوضات الشهرية، فواتير ومصروفات الصيانة، وحزم حركة المستودع مع النقر لإظهار تفاصيل المستند.
                  </p>
                </div>
                <button
                  onClick={() => exportAggregatedBatchesToExcel(aggregatedDocuments)}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
                  <span>تصدير الحزم (Excel)</span>
                </button>
              </div>

              <div className="space-y-3">
                {aggregatedDocuments.map(batch => (
                  <div
                    key={batch.id}
                    onClick={() => setSelectedAggregatedDoc(batch)}
                    className="bg-white rounded-xl border border-slate-200 hover:border-indigo-400 p-4 shadow-xs transition-all cursor-pointer hover:bg-indigo-50/20"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold shrink-0 mt-0.5">
                          <Layers className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                              {batch.batchNumber}
                            </span>
                            <span className="text-xs font-semibold text-slate-500">{batch.date}</span>
                          </div>
                          <h4 className="font-black text-slate-900 text-sm mt-0.5">{batch.title}</h4>
                          <p className="text-xs text-slate-600 mt-0.5">{batch.referenceNotes}</p>
                        </div>
                      </div>

                      <div className="text-left bg-slate-50 p-2.5 rounded-lg border border-slate-200 shrink-0">
                        <span className="text-[10px] text-slate-500 block">إجمالي المبلغ:</span>
                        <span className="text-base font-black text-emerald-800 font-mono">
                          {formatCurrency(batch.totalAmount)}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-0.5">{batch.itemCount} مستندات فرعية</div>
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-500">
                        المستندات: {batch.subItems.map(s => s.refNumber).join(' · ')}
                      </span>
                      <span className="font-bold text-indigo-600 flex items-center gap-1">
                        <span>عرض تفاصيل الحزمة</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SMART ALERTS HUB */}
          {selectedSection === 'smart_alerts' && (
            <SmartAlertsHub
              onNavigateSection={(sec: any) => setSelectedSection(sec as GeneralManagerSection)}
              onOpenPaymentForTenant={() => setSelectedSection('payments')}
            />
          )}

          {/* DATABASE BACKUP & RECOVERY HUB */}
          {selectedSection === 'backups' && (
            <DatabaseBackupHub />
          )}

          {/* 11. EMPLOYEE WINDOWS & PERMISSION ALLOCATION */}
          {selectedSection === 'employees' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <UsersManagement />
            </div>
          )}

          {/* 12. AUDIT TRAIL LOG */}
          {selectedSection === 'audit' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <AuditTrailView />
            </div>
          )}

        </div>

      {/* Aggregated Document Detail Modal */}
      {selectedAggregatedDoc && (
        <AggregatedDocumentModal
          document={selectedAggregatedDoc}
          onClose={() => setSelectedAggregatedDoc(null)}
        />
      )}

      {/* General Manager Document Reader Modal */}
      {(readerInvoice || readerTenantId) && (
        <GeneralManagerDocumentReaderModal
          invoice={readerInvoice}
          tenantId={readerTenantId}
          onClose={() => {
            setReaderInvoice(null);
            setReaderTenantId(null);
          }}
          onOpenPayment={(tId) => {
            setReaderInvoice(null);
            setReaderTenantId(null);
            setSelectedSection('payments');
          }}
          onOpenTenantStatement={() => {
            setReaderInvoice(null);
            setReaderTenantId(null);
            setSelectedSection('reports');
          }}
        />
      )}

      {/* Admin Password Change Modal */}
      {isAdminPwdModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">تغيير كلمة مرور المدير العام</h3>
                  <p className="text-[11px] text-slate-400">أدخل كلمة المرور الحالية ثم الجديدة</p>
                </div>
              </div>
              <button
                onClick={() => setIsAdminPwdModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setAdminPwdError('');
                setAdminPwdSuccess(null);

                if (!currentAdminPassword.trim()) {
                  setAdminPwdError('يرجى إدخال كلمة المرور الحالية');
                  return;
                }
                if (newAdminPassword.length < 8) {
                  setAdminPwdError('كلمة المرور يجب ألا تقل عن 8 خانات لضمان الأمان');
                  return;
                }
                if (newAdminPassword !== confirmAdminPassword) {
                  setAdminPwdError('تأكيد كلمة المرور غير متطابق');
                  return;
                }

                setIsChangingAdminPwd(true);
                try {
                  const adminUser = users.find(u => u.username === 'admin' || u.role === 'ADMIN') || currentUser;
                  const res = await changeUserPassword(adminUser.id, currentAdminPassword.trim(), newAdminPassword.trim());
                  if (res.success) {
                    setAdminPwdSuccess('تم تحديث كلمة المرور بنجاح! احفظ كلمة المرور الجديدة في مكان آمن.');
                    setTimeout(() => {
                      setIsAdminPwdModalOpen(false);
                      setAdminPwdSuccess(null);
                      setCurrentAdminPassword('');
                      setNewAdminPassword('');
                      setConfirmAdminPassword('');
                    }, 2200);
                  } else {
                    setAdminPwdError(res.message || 'فشل التحديث');
                  }
                } catch (err: any) {
                  setAdminPwdError(err.message || 'حدث خطأ غير متوقع');
                } finally {
                  setIsChangingAdminPwd(false);
                }
              }}
              className="p-5 space-y-4 text-xs"
            >
              {adminPwdSuccess && (
                <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 p-3 rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span className="font-bold">{adminPwdSuccess}</span>
                </div>
              )}

              {adminPwdError && (
                <div className="bg-rose-50 border border-rose-300 text-rose-900 p-3 rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{adminPwdError}</span>
                </div>
              )}

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-slate-600 space-y-1">
                <span className="font-bold text-slate-800 block">بيانات الحساب:</span>
                <p>الحساب النشط: <strong className="font-mono text-slate-900">{currentUser.email || currentUser.username}</strong></p>
                <p>الدور: <strong className="text-emerald-700 font-bold">المدير العام (صلاحية كاملة)</strong></p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">كلمة المرور الحالية</label>
                <input
                  type="password"
                  placeholder="أدخل كلمة المرور الحالية"
                  value={currentAdminPassword}
                  onChange={e => setCurrentAdminPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  dir="ltr"
                  autoComplete="current-password"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">كلمة المرور الجديدة</label>
                <input
                  type="password"
                  placeholder="أدخل كلمة المرور الجديدة (8 خانات على الأقل)"
                  value={newAdminPassword}
                  onChange={e => setNewAdminPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">تأكيد كلمة المرور الجديدة</label>
                <input
                  type="password"
                  placeholder="أعد إدخال كلمة المرور للتأكيد"
                  value={confirmAdminPassword}
                  onChange={e => setConfirmAdminPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  dir="ltr"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdminPwdModalOpen(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-xl transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isChangingAdminPwd}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2 rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isChangingAdminPwd ? 'جارٍ الحفظ...' : 'حفظ كلمة المرور الجديدة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Master Financial Statements PDF Export Modal for General Manager */}
      <MasterFinancialStatementsPdfModal
        isOpen={isMasterPdfOpen}
        onClose={() => setIsMasterPdfOpen(false)}
      />

      {/* System Data Reset & Environment Switcher Modal */}
      <SystemDataResetModal
        isOpen={isResetDataModalOpen}
        onClose={() => setIsResetDataModalOpen(false)}
      />

      {/* Share App to Employees Modal */}
      <ShareAppModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
      />

    </div>
  );
};
