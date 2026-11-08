// تصميم م. أبو أحمد — مصمم ومنفذ Claude — © الحقوق محفوظة
import React from 'react';
import {
  LayoutDashboard,
  Building,
  FileText,
  Receipt,
  CreditCard,
  TrendingDown,
  BookOpen,
  PieChart,
  History,
  ShieldCheck,
  CheckCircle2,
  Users,
  Boxes,
  Landmark,
  Crown,
  Eye,
  ChevronRight,
  ChevronLeft,
  X
} from 'lucide-react';
import { useStore } from '../../lib/store';

export type ActiveTab =
  | 'manager_portal'
  | 'dashboard'
  | 'properties'
  | 'contracts'
  | 'invoices'
  | 'payments'
  | 'expenses'
  | 'accounting'
  | 'fixed_assets'
  | 'inventory'
  | 'reports'
  | 'users'
  | 'audit'
  | 'tests';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isCollapsed = false,
  onToggleCollapse,
  isOpenMobile = false,
  onCloseMobile
}) => {
  const {
    invoices,
    payments,
    contracts,
    properties,
    expenses,
    journalEntries,
    fixedAssets,
    users,
    inventoryItems,
    currentUser,
    isSectionAllowed
  } = useStore();

  const overdueInvoicesCount = invoices.filter(i => i.status === 'OVERDUE').length;
  const activeContractsCount = contracts.filter(c => c.status === 'ACTIVE').length;

  const allNavItems = [
    ...(currentUser.role === 'ADMIN'
      ? [
          {
            id: 'manager_portal' as ActiveTab,
            label: 'مركز المدير العام الرقابي',
            icon: Crown,
            badge: 'إشراف شامل',
            badgeColor: 'rose'
          }
        ]
      : []),
    {
      id: 'dashboard' as ActiveTab,
      label: 'لوحة التحكم والمؤشرات',
      icon: LayoutDashboard,
      badge: null
    },
    {
      id: 'properties' as ActiveTab,
      label: 'العقارات والوحدات',
      icon: Building,
      badge: properties.length
    },
    {
      id: 'contracts' as ActiveTab,
      label: 'عقود الإيجار',
      icon: FileText,
      badge: activeContractsCount
    },
    {
      id: 'invoices' as ActiveTab,
      label: 'فواتير الإيجار والمطالبات',
      icon: Receipt,
      badge: overdueInvoicesCount > 0 ? `${overdueInvoicesCount} متأخرة` : null,
      badgeColor: 'rose'
    },
    {
      id: 'payments' as ActiveTab,
      label: 'سجل التحصيل وسندات القبض',
      icon: CreditCard,
      badge: payments.length
    },
    {
      id: 'expenses' as ActiveTab,
      label: 'مصروفات وسندات الصرف',
      icon: TrendingDown,
      badge: expenses.length
    },
    {
      id: 'accounting' as ActiveTab,
      label: 'المحاسبة ودفتر الأستاذ',
      icon: BookOpen,
      badge: `${journalEntries.length} قيد`,
      badgeColor: 'emerald'
    },
    {
      id: 'fixed_assets' as ActiveTab,
      label: 'الأصول الثابتة والإهلاك',
      icon: Landmark,
      badge: `${fixedAssets?.length || 0} أصل`,
      badgeColor: 'emerald'
    },
    {
      id: 'inventory' as ActiveTab,
      label: 'المستودع والمخازن والعهد',
      icon: Boxes,
      badge: `${inventoryItems?.length || 0} صنف`,
      badgeColor: 'amber'
    },
    {
      id: 'reports' as ActiveTab,
      label: 'التقارير والقوائم المالية',
      icon: PieChart,
      badge: null
    },
    {
      id: 'users' as ActiveTab,
      label: 'المستخدمون والصلاحيات',
      icon: Users,
      badge: `${users.length} مستخدم`,
      badgeColor: 'amber'
    },
    {
      id: 'audit' as ActiveTab,
      label: 'سجل التدقيق والرقابة',
      icon: History,
      badge: null
    },
    {
      id: 'tests' as ActiveTab,
      label: 'مختبر التدقيق والفحص الآلي',
      icon: ShieldCheck,
      badge: '14 اختبار',
      badgeColor: 'indigo'
    }
  ];

  const visibleNavItems = allNavItems.filter(item => {
    if (currentUser.role === 'ADMIN') return true;
    if (item.id === 'manager_portal') return false;
    return isSectionAllowed(item.id as any);
  });

  const renderNavList = (collapsed: boolean) => (
    <div className="flex-1 py-2 px-2 space-y-1 overflow-y-auto overflow-x-hidden">
      {!collapsed && (
        <div className="px-3 pb-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
          <span>{currentUser.role === 'ADMIN' ? 'أقسام النظام والرقابة' : 'نوافذ العمل المصرح بها'}</span>
          <span className="text-[10px] text-slate-500 font-mono">({visibleNavItems.length})</span>
        </div>
      )}

      {visibleNavItems.map(item => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        const isManagerTab = item.id === 'manager_portal';

        return (
          <button
            key={item.id}
            type="button"
            title={item.label}
            onClick={() => {
              setActiveTab(item.id);
              if (onCloseMobile) onCloseMobile();
            }}
            className={`w-full flex items-center ${collapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2.5'} rounded-xl text-sm font-medium transition-all text-right cursor-pointer group ${
              isActive
                ? isManagerTab 
                  ? 'bg-rose-600 text-white shadow-xs' 
                  : 'bg-emerald-600 text-white shadow-xs'
                : isManagerTab
                ? 'bg-rose-950/40 hover:bg-rose-900/40 text-rose-300 border border-rose-800/50'
                : 'hover:bg-slate-800 hover:text-white text-slate-300'
            }`}
          >
            <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'} min-w-0`}>
              <Icon className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : isManagerTab ? 'text-rose-400' : 'text-slate-400'}`} />
              {!collapsed && (
                <span className={`truncate ${isManagerTab ? 'font-bold' : ''}`}>{item.label}</span>
              )}
            </div>

            {!collapsed && item.badge !== null && item.badge !== undefined && (
              <span
                className={`text-[11px] px-2 py-0.5 rounded-md font-semibold shrink-0 ${
                  isActive
                    ? 'bg-black/30 text-white'
                    : item.badgeColor === 'rose'
                    ? 'bg-rose-950/70 text-rose-300 border border-rose-800/60'
                    : item.badgeColor === 'emerald'
                    ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-800/60'
                    : item.badgeColor === 'amber'
                    ? 'bg-amber-950/70 text-amber-300 border border-amber-800/60'
                    : item.badgeColor === 'indigo'
                    ? 'bg-indigo-950/70 text-indigo-300 border border-indigo-800/60'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Collapsible Sidebar */}
      <aside
        className={`bg-slate-900 text-slate-300 flex-col shrink-0 min-h-[calc(100vh-4rem)] hidden md:flex no-print border-l border-slate-800 transition-all duration-300 ease-in-out select-none ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Toggle Collapse Bar */}
        <div className={`p-2.5 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} border-b border-slate-800/80`}>
          {!isCollapsed && (
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300 px-2 truncate">
              {currentUser.role === 'ADMIN' ? (
                <>
                  <Crown className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="truncate">لوحة الرقابة والإشراف</span>
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="truncate">نافذة المهام المخصصة</span>
                </>
              )}
            </div>
          )}

          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title={isCollapsed ? 'توسيع القائمة الجانبية' : 'طي القائمة الجانبية لتوسيع الشاشة'}
            >
              {isCollapsed ? (
                <ChevronLeft className="w-4 h-4 text-amber-400" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          )}
        </div>

        {/* User Scope Indicator Card */}
        {!isCollapsed ? (
          <div className="p-3 m-3 mb-1 rounded-xl border text-xs bg-slate-800/60 border-slate-700/80">
            {currentUser.role === 'ADMIN' ? (
              <div>
                <div className="flex items-center gap-1.5 font-bold text-rose-400 mb-1">
                  <Crown className="w-4 h-4" />
                  <span>تبويب المدير العام الشامل</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  رقابة كاملة واطلاع على كافة التقارير ومراجعة أعمال الموظفين ومنح الصلاحيات.
                </p>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-emerald-400 flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" />
                    <span>نافذة عمل الموظف</span>
                  </span>
                  <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800/60 px-1.5 py-0.5 rounded font-mono">
                    مخصصة
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 leading-snug">
                  الأقسام المفتوحة لك بقرار المدير العام.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="p-2 my-2 flex justify-center">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs shadow-inner ${
                currentUser.role === 'ADMIN'
                  ? 'bg-rose-950 text-rose-400 border border-rose-800/60'
                  : 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
              }`}
              title={currentUser.role === 'ADMIN' ? 'صلاحية المدير العام' : 'نافذة عمل الموظف'}
            >
              {currentUser.role === 'ADMIN' ? <Crown className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </div>
          </div>
        )}

        {/* Navigation Links */}
        {renderNavList(isCollapsed)}

        {/* Real-time Status Card (Collapsed vs Expanded) */}
        {!isCollapsed && (
          <div className="p-3 m-3 bg-slate-800/80 rounded-xl border border-slate-700/60 text-xs">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-1">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>فصل الصلاحيات والمهام</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              تخطيط متجاوب مرن يوفر مساحة كاملة لعرض الجداول والمستندات بوضوح.
            </p>
          </div>
        )}
      </aside>

      {/* Mobile Drawer (When Opened on Small Screens) */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 md:hidden flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={onCloseMobile}
          />

          {/* Drawer Content */}
          <div className="relative w-72 max-w-[85vw] bg-slate-900 text-slate-300 h-full shadow-2xl flex flex-col border-l border-slate-800 animate-in slide-in-from-right duration-200 z-10">
            <div className="p-3.5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Crown className="w-4 h-4 text-amber-400" />
                <span>قائمة التنقل والأقسام</span>
              </div>
              <button
                type="button"
                onClick={onCloseMobile}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {renderNavList(false)}
          </div>
        </div>
      )}
    </>
  );
};
