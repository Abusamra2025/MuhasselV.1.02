// تصميم م. أبو أحمد — مصمم ومنفذ Claude — © الحقوق محفوظة
import React, { useState, useMemo } from 'react';
import {
  Bell,
  Calendar,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  CreditCard,
  FileText,
  Building,
  User,
  ExternalLink,
  Filter,
  Sparkles,
  ShieldAlert
} from 'lucide-react';
import { useStore } from '../../lib/store';
import { formatCurrency } from '../../lib/numberToArabicWords';
import { Badge } from '../common/Badge';

interface UpcomingDuesAndExpiryAlertsProps {
  onOpenPaymentModalWithTenant?: (tenantId: string) => void;
  onNavigateTab?: (tab: string) => void;
  isManagerView?: boolean;
}

type AlertFilterType = 'ALL' | 'UPCOMING_RENT' | 'EXPIRING_CONTRACTS' | 'EXPIRED_CONTRACTS';

export const UpcomingDuesAndExpiryAlerts: React.FC<UpcomingDuesAndExpiryAlertsProps> = ({
  onOpenPaymentModalWithTenant,
  onNavigateTab,
  isManagerView = false
}) => {
  const { contracts, invoices, tenants, properties, units } = useStore();

  const [activeFilter, setActiveFilter] = useState<AlertFilterType>('ALL');
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Helper maps for O(1) lookups
  const tenantMap = useMemo(() => new Map(tenants.map(t => [t.id, t])), [tenants]);
  const propertyMap = useMemo(() => new Map(properties.map(p => [p.id, p])), [properties]);
  const unitMap = useMemo(() => new Map(units.map(u => [u.id, u])), [units]);

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  // 1. Calculate Upcoming Rent Invoices Due in next 30 days
  const upcomingRentDues = useMemo(() => {
    return invoices
      .filter(inv => {
        if (inv.status !== 'UNPAID' && inv.status !== 'PARTIAL') return false;
        if (inv.balance <= 0) return false;
        
        const dueDate = new Date(inv.dueDate);
        const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        // Due today or in the next 30 days
        return diffDays >= 0 && diffDays <= 30;
      })
      .map(inv => {
        const dueDate = new Date(inv.dueDate);
        const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const tenant = tenantMap.get(inv.tenantId);
        const property = propertyMap.get(inv.propertyId);
        const unit = unitMap.get(inv.unitId);

        return {
          id: inv.id,
          type: 'RENT_DUE' as const,
          invoiceNumber: inv.invoiceNumber,
          tenantId: inv.tenantId,
          tenantName: tenant?.name || 'مستأجر',
          tenantPhone: tenant?.phone || '',
          propertyName: property?.name || 'عقار',
          unitNumber: unit?.unitNumber || '',
          dueDate: inv.dueDate,
          amount: inv.balance,
          diffDays,
          contractId: inv.contractId
        };
      })
      .sort((a, b) => a.diffDays - b.diffDays);
  }, [invoices, tenantMap, propertyMap, unitMap, now]);

  // 2. Calculate Contracts Expiring in next 30 days (and expired ones)
  const expiringContracts = useMemo(() => {
    return contracts
      .filter(c => {
        if (c.status !== 'ACTIVE') return false;
        const endDate = new Date(c.endDate);
        const diffDays = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        // Expired without renewal (diffDays < 0) or expiring within next 30 days
        return diffDays <= 30;
      })
      .map(c => {
        const endDate = new Date(c.endDate);
        const diffDays = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const tenant = tenantMap.get(c.tenantId);
        const property = propertyMap.get(c.propertyId);
        const unit = unitMap.get(c.unitId);

        return {
          id: c.id,
          type: (diffDays < 0 ? 'EXPIRED_CONTRACT' : 'EXPIRING_CONTRACT') as 'EXPIRED_CONTRACT' | 'EXPIRING_CONTRACT',
          contractNumber: c.contractNumber,
          tenantId: c.tenantId,
          tenantName: tenant?.name || 'مستأجر',
          tenantPhone: tenant?.phone || '',
          propertyName: property?.name || 'عقار',
          unitNumber: unit?.unitNumber || '',
          endDate: c.endDate,
          rentAmount: c.annualRent,
          diffDays
        };
      })
      .sort((a, b) => a.diffDays - b.diffDays);
  }, [contracts, tenantMap, propertyMap, unitMap, now]);

  // Total stats
  const totalUpcomingAmount = upcomingRentDues.reduce((s, i) => s + i.amount, 0);
  const totalExpiringCount = expiringContracts.filter(c => c.diffDays >= 0).length;
  const totalExpiredCount = expiringContracts.filter(c => c.diffDays < 0).length;
  const totalAlertsCount = upcomingRentDues.length + expiringContracts.length;

  // Filtered list based on active tab
  const displayedItems = useMemo(() => {
    if (activeFilter === 'UPCOMING_RENT') {
      return upcomingRentDues;
    }
    if (activeFilter === 'EXPIRING_CONTRACTS') {
      return expiringContracts.filter(c => c.diffDays >= 0);
    }
    if (activeFilter === 'EXPIRED_CONTRACTS') {
      return expiringContracts.filter(c => c.diffDays < 0);
    }
    // ALL: Combine and sort by urgency
    const all = [
      ...upcomingRentDues,
      ...expiringContracts
    ];
    return all.sort((a, b) => a.diffDays - b.diffDays);
  }, [activeFilter, upcomingRentDues, expiringContracts]);

  // WhatsApp handler for rent payment reminder
  const handleSendPaymentReminderWhatsApp = (item: typeof upcomingRentDues[0]) => {
    const cleanPhone = item.tenantPhone.replace(/[^0-9]/g, '');
    const msg = `السلام عليكم ورحمة الله وبركاته،\nالأخ الفاضل/ ${item.tenantName}،\nنود إحاطتكم بحلول موعد سداد دفعة الإيجار القادمة لوحدتكم (${item.unitNumber}) في (${item.propertyName}).\n\n📅 تاريخ الاستحقاق: ${item.dueDate} (${item.diffDays === 0 ? 'اليوم' : `متبقي ${item.diffDays} أيام`})\n💰 المبلغ المستحق: ${formatCurrency(item.amount)}\n\nشاكرين ومقدرين لكم حرصكم الدائم على السداد في الموعد.\nشركة المحصل لإدارة الأملاك العقارية`;
    const url = cleanPhone 
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(msg)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  // WhatsApp handler for contract renewal notice
  const handleSendContractRenewalWhatsApp = (item: typeof expiringContracts[0]) => {
    const cleanPhone = item.tenantPhone.replace(/[^0-9]/g, '');
    const isExpired = item.diffDays < 0;
    const msg = isExpired
      ? `السلام عليكم ورحمة الله وبركاته،\nالأخ الفاضل/ ${item.tenantName}،\nنحيطكم علماً بأن عقد إيجار وحدتكم (${item.unitNumber}) في (${item.propertyName}) قد انتهى بتاريخ (${item.endDate}).\nيرجى التكرم بمراجعة إدارة الأملاك لتوقيع ملحق التجديد السنوي أو تسليم الوحدة وإجراء مخالصة الإخلاء.\n\nشركة المحصل لإدارة الأملاك العقارية`
      : `السلام عليكم ورحمة الله وبركاته،\nالأخ الفاضل/ ${item.tenantName}،\nنود تذكيركم بأن عقد إيجار وحدتكم (${item.unitNumber}) في (${item.propertyName}) شارف على الانتهاء بتاريخ (${item.endDate}) (متبقي ${item.diffDays} يوماً).\nيرجى التنسيق معنا لتجهيز عقد الفترة الإيجارية القادمة وتثبيت حجز الوحدة.\n\nشركة المحصل لإدارة الأملاك العقارية`;
    const url = cleanPhone
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(msg)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden text-right" dir="rtl">
      
      {/* Component Header with Quick Summary Badges */}
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-4 sm:p-5 border-b border-amber-200/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-700 flex items-center justify-center shrink-0 shadow-inner">
            <Bell className="w-5 h-5 text-amber-600 animate-pulse" />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-black text-slate-900">
                نظام التنبيهات الذكي: العقود ومواعيد الإيجار القادمة (خلال 30 يوماً)
              </h3>
              {totalAlertsCount > 0 ? (
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                  {totalAlertsCount} استحقاق وموعد متابعة
                </span>
              ) : (
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                  كافة الحسابات مستقرة ✓
                </span>
              )}
            </div>

            <p className="text-xs text-slate-600 mt-0.5">
              متابعة استباقية للمدير والموظفين لمواعيد دفع الإيجار والتجديد لتفادي التعثر وتأخر التدفقات النقدية
            </p>
          </div>
        </div>

        {/* Header Right Action & Collapse Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 text-xs font-mono">
            <span className="bg-amber-100/90 text-amber-950 font-bold px-2.5 py-1 rounded-lg border border-amber-200 text-[11px]">
              استحقاقات قادمة: {formatCurrency(totalUpcomingAmount)}
            </span>
          </div>

          <button
            onClick={() => setIsCollapsed(prev => !prev)}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title={isCollapsed ? 'توسيع عرض التنبيهات' : 'طي العرض'}
          >
            {isCollapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Collapsible Content */}
      {!isCollapsed && (
        <div className="p-4 sm:p-5 space-y-4">
          
          {/* Segmented Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-bold select-none">
            <button
              onClick={() => setActiveFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 border ${
                activeFilter === 'ALL'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              <span>جميع التنبيهات</span>
              <span className="font-mono text-[11px] bg-white/20 px-1.5 py-0.2 rounded">
                {totalAlertsCount}
              </span>
            </button>

            <button
              onClick={() => setActiveFilter('UPCOMING_RENT')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 border ${
                activeFilter === 'UPCOMING_RENT'
                  ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-emerald-800 border-slate-200'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>مواعيد دفع الإيجار القادمة (خلال 30 يوماً)</span>
              <span className="font-mono text-[11px] bg-white/20 px-1.5 py-0.2 rounded">
                {upcomingRentDues.length}
              </span>
            </button>

            <button
              onClick={() => setActiveFilter('EXPIRING_CONTRACTS')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 border ${
                activeFilter === 'EXPIRING_CONTRACTS'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-amber-800 border-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>عقود تنتهي قريباً (خلال 30 يوماً)</span>
              <span className="font-mono text-[11px] bg-white/20 px-1.5 py-0.2 rounded">
                {totalExpiringCount}
              </span>
            </button>

            {totalExpiredCount > 0 && (
              <button
                onClick={() => setActiveFilter('EXPIRED_CONTRACTS')}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 border ${
                  activeFilter === 'EXPIRED_CONTRACTS'
                    ? 'bg-rose-700 text-white border-rose-700 shadow-2xs'
                    : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-200'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                <span>عقود منتهية لم تجدد ({totalExpiredCount})</span>
              </button>
            )}
          </div>

          {/* Alert Cards Grid */}
          {displayedItems.length === 0 ? (
            <div className="py-8 px-4 text-center bg-slate-50 rounded-xl border border-slate-200/80">
              <CheckCircle2 className="w-9 h-9 text-emerald-500 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-slate-800">لا توجد تنبيهات عاجلة في هذا التصنيف</h4>
              <p className="text-xs text-slate-500 mt-0.5">
                كافة العقود سارية واستحقاقات الإيجار القادمة خلال الـ 30 يوماً منتظمة بشكل كامل
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {displayedItems.map((item) => {
                const isRent = item.type === 'RENT_DUE';
                const isExpired = item.type === 'EXPIRED_CONTRACT';

                return (
                  <div
                    key={`${item.type}_${item.id}`}
                    className={`p-4 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                      isExpired
                        ? 'bg-rose-50/40 border-rose-200 hover:border-rose-300'
                        : item.diffDays <= 7
                        ? 'bg-amber-50/40 border-amber-200 hover:border-amber-300'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-2xs'
                    }`}
                  >
                    {/* Item Top: Header & Badges */}
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            isExpired
                              ? 'bg-rose-100 text-rose-700'
                              : isRent
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}>
                            {isExpired ? (
                              <AlertTriangle className="w-4 h-4" />
                            ) : isRent ? (
                              <Calendar className="w-4 h-4" />
                            ) : (
                              <Clock className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <span className="text-[10px] font-bold block text-slate-500">
                              {isRent ? 'استحقاق دفعة إيجار' : isExpired ? 'عقد منتهي الصلاحية' : 'عقد إيجار شارف على الانتهاء'}
                            </span>
                            <h4 className="font-bold text-xs sm:text-sm text-slate-900 leading-tight">
                              {item.tenantName}
                            </h4>
                          </div>
                        </div>

                        {/* Urgency Badge */}
                        <div className="text-left shrink-0">
                          {isExpired ? (
                            <Badge variant="rose" size="sm">
                              منتهي منذ {Math.abs(item.diffDays)} يوم
                            </Badge>
                          ) : item.diffDays === 0 ? (
                            <span className="bg-rose-600 text-white font-bold text-[10px] px-2 py-0.5 rounded-full animate-pulse shadow-2xs">
                              يستحق اليوم 🔔
                            </span>
                          ) : item.diffDays <= 7 ? (
                            <Badge variant="amber" size="sm">
                              متبقي {item.diffDays} أيام (عاجل)
                            </Badge>
                          ) : (
                            <Badge variant="indigo" size="sm">
                              متبقي {item.diffDays} يوماً
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Details row: Property, Unit & Date */}
                      <div className="bg-slate-50/80 rounded-lg p-2.5 text-xs space-y-1 border border-slate-100">
                        <div className="flex items-center justify-between text-slate-700">
                          <span className="flex items-center gap-1.5 text-slate-500">
                            <Building className="w-3.5 h-3.5 text-slate-400" />
                            <span>العقار والوحدة:</span>
                          </span>
                          <span className="font-bold text-slate-800">
                            {item.propertyName} · وحدة {item.unitNumber}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-slate-700">
                          <span className="flex items-center gap-1.5 text-slate-500">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>{isRent ? 'موعد الاستحقاق:' : 'تاريخ انتهاء العقد:'}</span>
                          </span>
                          <span className="font-mono font-bold text-slate-800">
                            {isRent ? item.dueDate : (item as any).endDate}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-slate-700 pt-0.5 border-t border-slate-200/60">
                          <span className="text-slate-500 font-semibold">
                            {isRent ? 'المبلغ المستحق:' : 'الإيجار السنوي للعقد:'}
                          </span>
                          <span className={`font-mono font-black ${isRent ? 'text-emerald-700 text-xs sm:text-sm' : 'text-slate-900'}`}>
                            {formatCurrency(isRent ? item.amount : (item as any).rentAmount)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons Toolbar */}
                    <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 text-xs">
                      {/* WhatsApp Reminder Button */}
                      <button
                        type="button"
                        onClick={() => {
                          if (isRent) {
                            handleSendPaymentReminderWhatsApp(item as any);
                          } else {
                            handleSendContractRenewalWhatsApp(item as any);
                          }
                        }}
                        className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 font-bold transition-colors cursor-pointer text-[11px]"
                        title="إرسال رسالة تذكير وتنسيق رسمية للمستأجر عبر تطبيق WhatsApp"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{isRent ? 'تذكير واتساب' : 'إشعار التجديد'}</span>
                      </button>

                      {/* Direct Operational Action: Payment or Renewal */}
                      {isRent ? (
                        onOpenPaymentModalWithTenant && (
                          <button
                            type="button"
                            onClick={() => onOpenPaymentModalWithTenant(item.tenantId)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer text-[11px]"
                            title="تسجيل وتحصيل سند قبض فوري لهذا المستأجر"
                          >
                            <CreditCard className="w-3.5 h-3.5 text-emerald-200" />
                            <span>تحصيل فوري</span>
                          </button>
                        )
                      ) : (
                        onNavigateTab && (
                          <button
                            type="button"
                            onClick={() => onNavigateTab('contracts')}
                            className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer text-[11px]"
                            title="الانتقال لجدول العقود لإجراء التجديد الرسمي"
                          >
                            <FileText className="w-3.5 h-3.5 text-amber-200" />
                            <span>تجديد العقد</span>
                          </button>
                        )
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

    </div>
  );
};
