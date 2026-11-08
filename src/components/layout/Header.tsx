import React, { useState, useRef, useEffect } from 'react';
import {
  Building2,
  Receipt,
  PlusCircle,
  ShieldCheck,
  RotateCcw,
  UserCheck,
  Calendar,
  Layers,
  Sparkles,
  LogOut,
  Zap,
  ChevronDown,
  Building,
  FileText,
  BarChart3,
  TrendingUp,
  Percent,
  CheckCircle2,
  ChevronLeft,
  Search,
  Share2,
  Database,
  Bell,
  X,
  Menu,
  UserPlus
} from 'lucide-react';
import { useStore } from '../../lib/store';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../common/Badge';
import { CreatePropertyModal } from '../properties/CreatePropertyModal';
import { DraftContractModal } from '../contracts/DraftContractModal';
import { GlobalSearchModal } from '../common/GlobalSearchModal';
import { TenantDetailsModal } from '../common/TenantDetailsModal';
import { InvoiceDetailsModal } from '../common/InvoiceDetailsModal';
import { PropertyDetailsModal } from '../common/PropertyDetailsModal';
import { ShareAppModal } from '../common/ShareAppModal';
import { SmartAlertsHub } from '../alerts/SmartAlertsHub';
import { DatabaseBackupHub } from '../backup/DatabaseBackupHub';
import { Tenant, Property, Invoice } from '../../types';
import { formatCurrency } from '../../lib/numberToArabicWords';
import { ROUND } from '../../lib/accountingEngine';

interface HeaderProps {
  onOpenPaymentModal: () => void;
  onOpenExpenseModal: () => void;
  onOpenAuditModal: () => void;
  onOpenLoginModal?: () => void;
  onToggleSidebar?: () => void;
  onNavigateTab?: (tab: any) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenPaymentModal,
  onOpenExpenseModal,
  onOpenAuditModal,
  onOpenLoginModal,
  onToggleSidebar,
  onNavigateTab
}) => {
  const {
    currentUser,
    users,
    setCurrentUser,
    resetToDefaultData,
    periods,
    isServerConnected,
    onlineCount,
    lastSyncMessage,
    canUserPerform,
    isSupervisoryOnly,
    logoutUser,
    payments,
    units,
    properties,
    smartAlerts,
    backups,
    backupSettings
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

  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);
  const [showQuickReportPopover, setShowQuickReportPopover] = useState(false);
  const [isCreatePropertyModalOpen, setIsCreatePropertyModalOpen] = useState(false);
  const [isDraftContractModalOpen, setIsDraftContractModalOpen] = useState(false);
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
  const [selectedTenantForModal, setSelectedTenantForModal] = useState<string | null>(null);
  const [selectedPropertyForModal, setSelectedPropertyForModal] = useState<Property | null>(null);
  const [selectedInvoiceForModal, setSelectedInvoiceForModal] = useState<Invoice | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isSmartAlertsOpen, setIsSmartAlertsOpen] = useState(false);
  const [isBackupHubOpen, setIsBackupHubOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const quickActionsRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut: Ctrl+K or / to open global search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsGlobalSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (quickActionsRef.current && !quickActionsRef.current.contains(event.target as Node)) {
        setIsQuickActionsOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    if (isQuickActionsOpen || isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isQuickActionsOpen, isUserMenuOpen]);

  const currentPeriod = periods.find(p => !p.isClosed) || periods[periods.length - 1];



  // Quick Report Calculations
  // 1. Current Month Collections (based on current date or current period)
  const now = new Date();
  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  // Calculate total collections for the current active month
  const postedPayments = payments.filter(p => p.status === 'POSTED');
  const thisMonthPayments = postedPayments.filter(p => p.paymentDate.startsWith(currentYearMonth));
  
  // If no transactions in current system calendar month yet, take the latest available month from posted payments
  const latestPaymentMonth = postedPayments.length > 0
    ? [...postedPayments].sort((a, b) => b.paymentDate.localeCompare(a.paymentDate))[0].paymentDate.slice(0, 7)
    : currentYearMonth;

  const targetMonth = thisMonthPayments.length > 0 ? currentYearMonth : latestPaymentMonth;
  const targetMonthPayments = postedPayments.filter(p => p.paymentDate.startsWith(targetMonth));
  const totalMonthlyCollections = ROUND(targetMonthPayments.reduce((acc, p) => acc + p.amount, 0));

  // 2. Current Occupancy Rate
  const totalUnitsCount = units.length;
  const occupiedUnitsCount = units.filter(u => u.status === 'OCCUPIED').length;
  const vacantUnitsCount = units.filter(u => u.status === 'VACANT').length;
  const occupancyRate = totalUnitsCount > 0 ? Math.round((occupiedUnitsCount / totalUnitsCount) * 100) : 0;

  // Month display label in Arabic
  const monthDate = new Date(`${targetMonth}-01T00:00:00`);
  const monthNameAr = monthDate.toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' });

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'rose';
      case 'ACCOUNTANT':
        return 'emerald';
      case 'CASHIER':
        return 'amber';
      case 'AUDITOR':
        return 'indigo';
      default:
        return 'slate';
    }
  };

  return (
    <header className="bg-white border-b border-slate-200/90 sticky top-0 z-30 shadow-xs no-print w-full max-w-full">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 w-full">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2 sm:gap-4 w-full min-w-0">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {onToggleSidebar && (
              <button
                type="button"
                onClick={onToggleSidebar}
                className="p-1.5 sm:p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                title="فتح / طي القائمة الجانبية"
              >
                <Menu className="w-5 h-5 text-slate-700" />
              </button>
            )}
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-xs shrink-0">
              <Building2 className="w-4 h-4 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-1 sm:gap-2">
                <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  مُحصّل
                </h1>
                <span className="text-[9px] sm:text-[10px] font-semibold tracking-wider text-emerald-800 bg-emerald-100/70 border border-emerald-200 px-1 sm:px-1.5 py-0.5 rounded">
                  v2.5
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden md:block">
                نظام إدارة وتحصيل الإيجارات والمحاسبة العقارية المزدوجة
              </p>
            </div>
          </div>

          {/* Center: Global Search & Real-Time Server Indicator (Hidden on small mobile) */}
          <div className="hidden md:flex items-center gap-2 sm:gap-3 flex-1 max-w-md mx-2 sm:mx-4">
            {/* Global Search Bar Trigger */}
            <div className="relative w-full">
              <button
                type="button"
                onClick={() => setIsGlobalSearchOpen(true)}
                className="w-full bg-slate-100/80 hover:bg-slate-100 text-slate-500 hover:text-slate-800 border border-slate-200/90 hover:border-emerald-300 rounded-xl px-3 py-1.5 text-xs flex items-center justify-between gap-2 transition-all cursor-pointer shadow-2xs group text-right"
                title="البحث السريع في النظام (مستأجرين، عقارات، فواتير) - اضغط Ctrl+K"
              >
                <div className="flex items-center gap-2 truncate">
                  <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 transition-colors shrink-0" />
                  <span className="truncate">بحث شامل (مستأجر، عقار، فاتورة)...</span>
                </div>
                <div className="hidden sm:flex items-center gap-1 shrink-0">
                  <kbd className="bg-white border border-slate-200 text-slate-400 group-hover:text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-mono shadow-2xs">
                    Ctrl+K
                  </kbd>
                </div>
              </button>
            </div>

            {/* Server Status Indicator (Compact) */}
            <div className={`hidden lg:flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs border shrink-0 ${
              isServerConnected 
                ? 'bg-emerald-50/80 border-emerald-200 text-emerald-800' 
                : 'bg-amber-50/80 border-amber-200 text-amber-800'
            }`} title="نظام الخادم والعميل المتصل المباشر - مراقبة الجلسات الحية">
              <span className="relative flex h-2 w-2">
                {isServerConnected && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                )}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${isServerConnected ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
              </span>
              <span className="font-semibold text-[10px]">
                {isServerConnected ? `أونلاين (${onlineCount})` : 'محلي'}
              </span>
            </div>
          </div>

          {/* Right: Actions, Quick Menu & Role Switcher */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Quick Actions Dropdown Menu */}
            <div className="relative" ref={quickActionsRef}>
              <button
                onClick={() => setIsQuickActionsOpen(!isQuickActionsOpen)}
                className="inline-flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs sm:text-sm font-bold px-3 py-2 rounded-xl transition-all shadow-xs active:scale-95 cursor-pointer"
                title="قائمة الإجراءات السريعة الفورية"
              >
                <Zap className="w-4 h-4 text-amber-300" />
                <span>إجراءات سريعة</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isQuickActionsOpen ? 'rotate-180' : ''}`} />
              </button>

              {isQuickActionsOpen && (
                <div className="absolute left-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95 duration-150 text-right">
                  <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                      <span>قائمة الإجراءات السريعة</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">بدون مغادرة الصفحة</span>
                  </div>

                  <div className="p-1 space-y-1">
                    {/* Action 1: Create New Property - محصورة فقط بالمحاسب المالي */}
                    {canUserPerform('canManageProperties') && (
                      <button
                        onClick={() => {
                          setIsQuickActionsOpen(false);
                          setIsCreatePropertyModalOpen(true);
                        }}
                        className="w-full text-right p-2.5 rounded-xl hover:bg-emerald-50/60 transition-colors flex items-center gap-3 group cursor-pointer"
                      >
                        <div className="w-9 h-9 rounded-xl bg-emerald-100 group-hover:bg-emerald-200 text-emerald-800 flex items-center justify-center shrink-0 transition-colors">
                          <Building className="w-5 h-5 text-emerald-700" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-slate-900 group-hover:text-emerald-700">إضافة عقار جديد</span>
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-semibold">عقار</span>
                          </div>
                          <p className="text-[11px] text-slate-500 truncate">تسجيل عقار وتحديده في الدليل</p>
                        </div>
                      </button>
                    )}

                    {/* Action 2: Draft Lease Contract - محصورة فقط بالمحاسب المالي */}
                    {canUserPerform('canManageContracts') && (
                      <button
                        onClick={() => {
                          setIsQuickActionsOpen(false);
                          setIsDraftContractModalOpen(true);
                        }}
                        className="w-full text-right p-2.5 rounded-xl hover:bg-blue-50/60 transition-colors flex items-center gap-3 group cursor-pointer"
                      >
                        <div className="w-9 h-9 rounded-xl bg-blue-100 group-hover:bg-blue-200 text-blue-800 flex items-center justify-center shrink-0 transition-colors">
                          <FileText className="w-5 h-5 text-blue-700" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-slate-900 group-hover:text-blue-700">تحرير عقد إيجار</span>
                            <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-semibold">عقد</span>
                          </div>
                          <p className="text-[11px] text-slate-500 truncate">إبرام عقد واحتساب الأقساط</p>
                        </div>
                      </button>
                    )}

                    {/* Action 3: New Payment Receipt */}
                    {canUserPerform('canIssueReceipts') && (
                      <button
                        onClick={() => {
                          setIsQuickActionsOpen(false);
                          onOpenPaymentModal();
                        }}
                        className="w-full text-right p-2.5 rounded-xl hover:bg-amber-50/60 transition-colors flex items-center gap-3 group cursor-pointer"
                      >
                        <div className="w-9 h-9 rounded-xl bg-amber-100 group-hover:bg-amber-200 text-amber-800 flex items-center justify-center shrink-0 transition-colors">
                          <Receipt className="w-5 h-5 text-amber-700" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-slate-900 group-hover:text-amber-700">سند قبض جديد</span>
                            <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-semibold">تحصيل</span>
                          </div>
                          <p className="text-[11px] text-slate-500 truncate">قبض إيجار وطباعة سند رسمي</p>
                        </div>
                      </button>
                    )}

                    {/* Action 4: New Expense Voucher */}
                    {canUserPerform('canRecordExpenses') && (
                      <button
                        onClick={() => {
                          setIsQuickActionsOpen(false);
                          onOpenExpenseModal();
                        }}
                        className="w-full text-right p-2.5 rounded-xl hover:bg-rose-50/60 transition-colors flex items-center gap-3 group cursor-pointer"
                      >
                        <div className="w-9 h-9 rounded-xl bg-rose-100 group-hover:bg-rose-200 text-rose-800 flex items-center justify-center shrink-0 transition-colors">
                          <PlusCircle className="w-5 h-5 text-rose-700" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-slate-900 group-hover:text-rose-700">سند صرف مصروفات</span>
                            <span className="text-[10px] bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded font-semibold">صرف</span>
                          </div>
                          <p className="text-[11px] text-slate-500 truncate">تسجيل مصروفات وصيانة العقارات</p>
                        </div>
                      </button>
                    )}

                    {/* Action 5: Add / Manage Users (مفعل للمدير العام ومن يملك صلاحية إدارة المستخدمين) */}
                    {(currentUser.role === 'ADMIN' || (currentUser.role as any) === 'admin' || currentUser.email?.toLowerCase() === 'ebow2012@gmail.com' || canUserPerform('canManageUsers')) && (
                      <button
                        onClick={() => {
                          setIsQuickActionsOpen(false);
                          onNavigateTab?.('users');
                        }}
                        className="w-full text-right p-2.5 rounded-xl hover:bg-amber-50/60 transition-colors flex items-center gap-3 group cursor-pointer"
                      >
                        <div className="w-9 h-9 rounded-xl bg-amber-100 group-hover:bg-amber-200 text-amber-800 flex items-center justify-center shrink-0 transition-colors">
                          <UserPlus className="w-5 h-5 text-amber-700" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-slate-900 group-hover:text-amber-700">إضافة مستخدم ومنح الصلاحيات</span>
                            <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-semibold">مستخدم جديد</span>
                          </div>
                          <p className="text-[11px] text-slate-500 truncate">تعريف موظف وتخصيص نوافذ العمل</p>
                        </div>
                      </button>
                    )}

                    {!canUserPerform('canManageProperties') && !canUserPerform('canManageContracts') && !canUserPerform('canIssueReceipts') && !canUserPerform('canRecordExpenses') && !canUserPerform('canManageUsers') && (
                      <div className="p-3 bg-amber-50/90 border border-amber-200/90 rounded-xl text-amber-900 text-[11px] font-medium flex items-start gap-2">
                        <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="block text-amber-950 font-bold mb-0.5">الحساب في وضع الإشراف والرقابة:</strong>
                          صلاحيات إدخال الحركات (إضافة العقارات، تحرير العقود، السندات) محصورة بالموظفين والمحاسب المالي.
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Section Divider */}
                  <div className="pt-2 mt-1 border-t border-slate-100">
                    <div className="flex items-center justify-between px-2 py-1 text-slate-500">
                      <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                        <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
                        <span>الملخص الفوري (Quick Report)</span>
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowQuickReportPopover(!showQuickReportPopover);
                        }}
                        className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-0.5 cursor-pointer"
                      >
                        {showQuickReportPopover ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}
                        <ChevronLeft className={`w-3 h-3 transition-transform ${showQuickReportPopover ? '-rotate-90' : ''}`} />
                      </button>
                    </div>

                    {/* Compact Quick Summary Card */}
                    <div className="mt-1 bg-gradient-to-br from-slate-50 to-indigo-50/30 rounded-xl p-2.5 border border-slate-200/80 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        {/* Metric 1: Monthly Collections */}
                        <div className="bg-white p-2 rounded-lg border border-slate-100 shadow-2xs">
                          <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
                            <TrendingUp className="w-3 h-3 text-emerald-600" />
                            <span>تحصيلات الشهر</span>
                          </div>
                          <div className="text-xs font-black text-emerald-700 mt-1 truncate" title={formatCurrency(totalMonthlyCollections)}>
                            {formatCurrency(totalMonthlyCollections)}
                          </div>
                          <div className="text-[9px] text-slate-400 mt-0.5 truncate">
                            {monthNameAr}
                          </div>
                        </div>

                        {/* Metric 2: Occupancy Rate */}
                        <div className="bg-white p-2 rounded-lg border border-slate-100 shadow-2xs">
                          <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
                            <Percent className="w-3 h-3 text-blue-600" />
                            <span>نسبة الإشغال</span>
                          </div>
                          <div className="flex items-baseline gap-1 mt-1">
                            <span className="text-xs font-black text-blue-700">{occupancyRate}%</span>
                            <span className="text-[9px] text-slate-400">({occupiedUnitsCount}/{totalUnitsCount})</span>
                          </div>
                          {/* Mini Progress Bar */}
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1">
                            <div
                              className="bg-blue-600 h-full rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(100, Math.max(0, occupancyRate))}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Small Popover / Expanded Breakdown */}
                      {showQuickReportPopover && (
                        <div className="pt-2 border-t border-slate-200/80 space-y-2 animate-in fade-in duration-150">
                          <div className="text-[10px] font-bold text-slate-700 flex items-center justify-between">
                            <span>تفاصيل الرقابة الفورية:</span>
                            <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1 py-0.2 rounded font-semibold">مباشر وموثق</span>
                          </div>

                          <div className="bg-white rounded-lg p-2 border border-slate-200 space-y-1.5 text-[10px]">
                            <div className="flex justify-between items-center text-slate-600">
                              <span>سندات قبض هذا الشهر:</span>
                              <span className="font-bold text-slate-900">{targetMonthPayments.length} سند</span>
                            </div>
                            <div className="flex justify-between items-center text-slate-600">
                              <span>الوحدات المؤجرة (نشطة):</span>
                              <span className="font-bold text-emerald-700">{occupiedUnitsCount} وحدة</span>
                            </div>
                            <div className="flex justify-between items-center text-slate-600">
                              <span>الوحدات الشاغرة (متاحة):</span>
                              <span className="font-bold text-amber-600">{vacantUnitsCount} وحدة</span>
                            </div>
                            <div className="flex justify-between items-center text-slate-600">
                              <span>إجمالي العقارات المدارة:</span>
                              <span className="font-bold text-slate-900">{properties.length} عقار</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* System Design & Execution Credits */}
                    <div className="pt-2 mt-2 border-t border-slate-100 text-center text-[10px] text-slate-500 leading-tight">
                      <p className="font-semibold text-emerald-700">تصميم م. أبو أحمد — مصمم ومنفذ Claude — © الحقوق محفوظة</p>
                      <p className="text-slate-400 font-mono text-[9px] mt-0.5">@Alrights reserved</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Actions according to permissions and supervisory role */}
            {isSupervisoryOnly ? (
              <div className="hidden lg:flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onNavigateTab?.('users')}
                  className="inline-flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-2.5 py-1.5 rounded-xl transition-all shadow-xs active:scale-95 cursor-pointer"
                  title="إضافة موظف جديد وإدارة الصلاحيات"
                >
                  <UserPlus className="w-4 h-4 text-amber-100" />
                  <span>إضافة مستخدم</span>
                </button>

                <div 
                  className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs px-2 py-1 rounded-lg font-bold"
                  title="وظيفة المدير رقابية فقط - لا يصدر حركات محاسبية، بل يمارس الرقابة والتدقيق وإدارة الصلاحيات"
                >
                  <ShieldCheck className="w-4 h-4 text-rose-600" />
                  <span>وضع الرقابة والإشراف</span>
                </div>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-1.5">
                {canUserPerform('canIssueReceipts') && (
                  <button
                    onClick={onOpenPaymentModal}
                    className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors shadow-xs active:scale-95 cursor-pointer"
                    title="إصدار سند قبض فوري"
                  >
                    <Receipt className="w-4 h-4" />
                    <span>سند قبض</span>
                  </button>
                )}

                {canUserPerform('canRecordExpenses') && (
                  <button
                    onClick={onOpenExpenseModal}
                    className="hidden md:inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors border border-slate-200 active:scale-95 cursor-pointer"
                    title="تسجيل سند صرف لمصروف عقار"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>سند صرف</span>
                  </button>
                )}
              </div>
            )}

            {/* Smart Alerts Notification Bell */}
            <button
              onClick={() => setIsSmartAlertsOpen(true)}
              className="relative p-1.5 sm:p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
              title="لوحة التنبيهات والرقابة الذكية"
            >
              <Bell className="w-4 h-4 text-slate-700" />
              {smartAlerts.length > 0 && (
                <span className={`absolute -top-1 -right-1 w-4 h-4 rounded-full text-[10px] font-black text-white flex items-center justify-center shadow-xs ${
                  smartAlerts.some(a => a.severity === 'CRITICAL') ? 'bg-rose-600 animate-pulse' : 'bg-amber-600'
                }`}>
                  {smartAlerts.length > 9 ? '9+' : smartAlerts.length}
                </span>
              )}
            </button>

            {/* Mobile Search Icon Trigger */}
            <button
              type="button"
              onClick={() => setIsGlobalSearchOpen(true)}
              className="md:hidden p-1.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200"
              title="البحث السريع (Ctrl+K)"
            >
              <Search className="w-4 h-4 text-slate-600" />
            </button>

            {/* Desktop Quick Tools */}
            <button
              onClick={() => setIsBackupHubOpen(true)}
              className="hidden xl:inline-flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 transition-colors cursor-pointer"
              title="مركز النسخ الاحتياطي والأمان السحابي"
            >
              <Database className="w-4 h-4 text-indigo-600" />
              <span>النسخ الاحتياطي</span>
              <span className={`w-2 h-2 rounded-full ${backupSettings?.autoBackupEnabled ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            </button>

            <button
              onClick={onOpenAuditModal}
              className="hidden lg:inline-flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-indigo-200 transition-colors cursor-pointer"
              title="تشغيل فحص النظام والتدقيق المحاسبي الآلي"
            >
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>فحص النظام</span>
            </button>

            {/* Share App Link & Sync Modal Trigger */}
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="hidden md:inline-flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-1.5 rounded-lg border border-emerald-300 transition-colors cursor-pointer shadow-2xs"
              title="مشاركة رابط البرنامج مع الموظفين وتفعيل المزامنة السحابية"
            >
              <Share2 className="w-4 h-4 text-emerald-600" />
              <span className="hidden lg:inline">مشاركة الرابط للموظفين</span>
              <span className="lg:hidden">مشاركة</span>
            </button>

            {/* User Profile & Interactive Mobile Menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-1 sm:gap-2 p-1 sm:px-2 sm:py-1 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer border border-transparent hover:border-slate-200"
                title="قائمة المستخدم والأدوات"
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs text-white shadow-2xs shrink-0 ${
                  currentUser.role === 'ADMIN' ? 'bg-rose-600' :
                  currentUser.role === 'ACCOUNTANT' ? 'bg-emerald-600' :
                  currentUser.role === 'CASHIER' ? 'bg-amber-600' :
                  currentUser.role === 'STOREKEEPER' ? 'bg-indigo-600' :
                  'bg-blue-600'
                }`}>
                  {currentUser.name.slice(0, 1)}
                </div>
                <div className="text-right hidden sm:block">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-slate-800 truncate max-w-[90px]">{currentUser.name}</span>
                    <Badge variant={getRoleBadgeVariant(currentUser.role)} size="sm">
                      {currentUser.titleAr}
                    </Badge>
                  </div>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* User Dropdown Menu (Unified for Mobile & Desktop) */}
              {isUserMenuOpen && (
                <div className="absolute left-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95 duration-150 text-right">
                  <div className="p-2.5 border-b border-slate-100">
                    <p className="font-bold text-xs text-slate-900">{currentUser.name}</p>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5 truncate">{currentUser.email}</p>
                    <div className="mt-1.5">
                      <Badge variant={getRoleBadgeVariant(currentUser.role)} size="sm">
                        {currentUser.titleAr}
                      </Badge>
                    </div>
                  </div>

                  <div className="py-1 space-y-0.5">
                    {/* Add User */}
                    {(currentUser.role === 'ADMIN' || (currentUser.role as any) === 'admin' || currentUser.email?.toLowerCase() === 'ebow2012@gmail.com') && (
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          onNavigateTab?.('users');
                        }}
                        className="w-full text-right px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl flex items-center gap-2 cursor-pointer"
                      >
                        <UserPlus className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>إضافة مستخدم وإدارة الصلاحيات</span>
                      </button>
                    )}

                    {/* Share App Link */}
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        setIsShareModalOpen(true);
                      }}
                      className="w-full text-right px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl flex items-center gap-2 cursor-pointer"
                    >
                      <Share2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>مشاركة رابط البرنامج للموظفين</span>
                    </button>

                    {/* Backup Hub */}
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        setIsBackupHubOpen(true);
                      }}
                      className="w-full text-right px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl flex items-center gap-2 cursor-pointer"
                    >
                      <Database className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span>مركز النسخ الاحتياطي والأمان</span>
                    </button>

                    {/* System Audit */}
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onOpenAuditModal();
                      }}
                      className="w-full text-right px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl flex items-center gap-2 cursor-pointer"
                    >
                      <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span>فحص وتدقيق النظام الآلي</span>
                    </button>

                    {/* Admin Reset Default Data */}
                    {currentUser.role === 'ADMIN' && (
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          if (confirm('هل ترغب في إعادة ضبط البيانات الافتراضية النموذجية للمشروع؟')) {
                            resetToDefaultData();
                          }
                        }}
                        className="w-full text-right px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-50 rounded-xl flex items-center gap-2 cursor-pointer"
                      >
                        <RotateCcw className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>استرجاع البيانات الافتراضية</span>
                      </button>
                    )}

                    <div className="pt-1 border-t border-slate-100">
                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          handleLogout();
                        }}
                        className="w-full text-right px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl flex items-center gap-2 cursor-pointer"
                      >
                        <LogOut className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>تسجيل الخروج</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Dedicated Logout Button (Desktop only) */}
            <button
              onClick={handleLogout}
              className="hidden sm:inline-flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 border border-rose-200 text-xs font-bold px-2.5 py-1.5 rounded-xl transition-all cursor-pointer shadow-2xs active:scale-95"
              title="تسجيل الخروج من النظام"
            >
              <LogOut className="w-4 h-4 text-rose-600" />
              <span>خروج</span>
            </button>

          </div>

        </div>
      </div>

      {/* Real-time Broadcast Notification Pill */}
      {lastSyncMessage && (
        <div className="bg-emerald-700 text-white text-xs px-4 py-1.5 text-center flex items-center justify-center gap-2 shadow-inner transition-all font-medium border-t border-emerald-600">
          <span className="w-2 h-2 rounded-full bg-emerald-200 animate-pulse"></span>
          <span>📡 مزامنة سحابية لحظية: {lastSyncMessage}</span>
        </div>
      )}

      {/* Quick Action Modals */}
      <CreatePropertyModal
        isOpen={isCreatePropertyModalOpen}
        onClose={() => setIsCreatePropertyModalOpen(false)}
      />

      <DraftContractModal
        isOpen={isDraftContractModalOpen}
        onClose={() => setIsDraftContractModalOpen(false)}
      />

      {/* Global Search Modal */}
      <GlobalSearchModal
        isOpen={isGlobalSearchOpen}
        onClose={() => setIsGlobalSearchOpen(false)}
        onSelectTenant={tenant => setSelectedTenantForModal(tenant.id)}
        onSelectProperty={property => setSelectedPropertyForModal(property)}
        onSelectInvoice={invoice => setSelectedInvoiceForModal(invoice)}
      />

      {/* Detail Modals triggered from Global Search */}
      <TenantDetailsModal
        tenantId={selectedTenantForModal}
        onClose={() => setSelectedTenantForModal(null)}
      />

      <PropertyDetailsModal
        property={selectedPropertyForModal}
        onClose={() => setSelectedPropertyForModal(null)}
      />

      <InvoiceDetailsModal
        invoice={selectedInvoiceForModal}
        onClose={() => setSelectedInvoiceForModal(null)}
      />

      {/* Share App Link Modal */}
      <ShareAppModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
      />

      {/* Smart Alerts Hub Modal */}
      {isSmartAlertsOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-slate-50 rounded-2xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 overflow-hidden">
            <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">لوحة التنبيهات والرقابة الذكية</h3>
                  <p className="text-xs text-slate-500">رادار المتابعة والتدخل السريع للعقود والمتأخرات والسيولة</p>
                </div>
              </div>
              <button
                onClick={() => setIsSmartAlertsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 sm:p-6 overflow-y-auto flex-1">
              <SmartAlertsHub />
            </div>
          </div>
        </div>
      )}

      {/* Database Backup Hub Modal */}
      {isBackupHubOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-slate-50 rounded-2xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 overflow-hidden">
            <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">مركز النسخ الاحتياطي والأمان السحابي</h3>
                  <p className="text-xs text-slate-500">إدارة اللقطات الآلية ونقاط الاستعادة لقاعدة البيانات</p>
                </div>
              </div>
              <button
                onClick={() => setIsBackupHubOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 sm:p-6 overflow-y-auto flex-1">
              <DatabaseBackupHub />
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
