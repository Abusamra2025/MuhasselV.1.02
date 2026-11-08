// تصميم م. أبو أحمد — مصمم ومنفذ Claude — © الحقوق محفوظة
import React, { useState } from 'react';
import {
  Bell,
  AlertTriangle,
  AlertOctagon,
  Flame,
  CheckCircle2,
  Clock,
  ExternalLink,
  MessageCircle,
  FileText,
  CreditCard,
  Building,
  HardDrive,
  ShieldAlert,
  ShieldCheck,
  Search,
  Filter,
  Check,
  X,
  RefreshCw,
  Sparkles,
  Zap,
  ArrowRight,
  TrendingDown,
  Layers,
  ChevronLeft,
  Crown
} from 'lucide-react';
import { useStore } from '../../lib/store';
import { SmartAlertItem, SmartAlertSeverity, SmartAlertCategory, Invoice } from '../../types';
import { formatCurrency } from '../../lib/numberToArabicWords';
import { Badge } from '../common/Badge';
import { GeneralManagerDocumentReaderModal } from '../manager/GeneralManagerDocumentReaderModal';

interface SmartAlertsHubProps {
  onNavigateSection?: (section: string) => void;
  onOpenPaymentForTenant?: (tenantId: string) => void;
}

export const SmartAlertsHub: React.FC<SmartAlertsHubProps> = ({
  onNavigateSection,
  onOpenPaymentForTenant
}) => {
  const {
    smartAlerts,
    dismissSmartAlert,
    createInstantBackup,
    tenants,
    contracts,
    invoices
  } = useStore();

  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [isActionRunning, setIsActionRunning] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // General Manager Document Reader state
  const [selectedReaderInvoice, setSelectedReaderInvoice] = useState<Invoice | null>(null);
  const [selectedReaderTenantId, setSelectedReaderTenantId] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  // Severity counts
  const criticalCount = smartAlerts.filter(a => a.severity === 'CRITICAL').length;
  const highCount = smartAlerts.filter(a => a.severity === 'HIGH').length;
  const mediumCount = smartAlerts.filter(a => a.severity === 'MEDIUM').length;
  const opportunityCount = smartAlerts.filter(a => a.severity === 'OPPORTUNITY').length;

  // Filter alerts
  const filteredAlerts = smartAlerts.filter(alert => {
    if (selectedCategory !== 'ALL' && alert.category !== selectedCategory) return false;
    if (selectedSeverity !== 'ALL' && alert.severity !== selectedSeverity) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchTitle = alert.title.toLowerCase().includes(q);
      const matchDesc = alert.description.toLowerCase().includes(q);
      const matchName = alert.entityName?.toLowerCase().includes(q) || false;
      if (!matchTitle && !matchDesc && !matchName) return false;
    }
    return true;
  });

  const handleAction = async (alert: SmartAlertItem) => {
    setIsActionRunning(alert.id);

    try {
      if (alert.actionType === 'RUN_BACKUP') {
        const res = await createInstantBackup('نسخة احتياطية فورية تم تشغيلها استجابة لتنبيه ذكي');
        if (res.success) {
          showToast('تم أخذ النسخة الاحتياطية وتأمين البيانات بنجاح!');
          dismissSmartAlert(alert.id);
        } else {
          showToast(res.error || 'فشل أخذ النسخة الاحتياطية');
        }
      } else if (alert.actionType === 'COLLECT_INVOICE') {
        if (alert.entityType === 'INVOICE') {
          const inv = invoices.find(i => i.id === alert.entityId);
          if (inv && onOpenPaymentForTenant) {
            onOpenPaymentForTenant(inv.tenantId);
          } else if (onNavigateSection) {
            onNavigateSection('payments');
          }
        } else if (onNavigateSection) {
          onNavigateSection('payments');
        }
      } else if (alert.actionType === 'RENEW_CONTRACT') {
        if (onNavigateSection) onNavigateSection('contracts');
      } else if (alert.actionType === 'REMIND_TENANT') {
        // Send WhatsApp Reminder
        if (alert.entityType === 'CONTRACT') {
          const contract = contracts.find(c => c.id === alert.entityId);
          const tenant = tenants.find(t => t.id === contract?.tenantId);
          if (tenant && tenant.phone) {
            const rawPhone = tenant.phone.replace(/[^0-9]/g, '');
            const msg = encodeURIComponent(
              `مرحباً ${tenant.name}، نود تذكيركم بقرب انتهاء عقد الإيجار رقم (${contract?.contractNumber}) بتاريخ (${contract?.endDate}). يُرجى التواصل معنا لتنسيق التجديد. شكراً لتعاونكم.`
            );
            window.open(`https://wa.me/${rawPhone}?text=${msg}`, '_blank');
            showToast(`تم فتح تطبيق واتساب لمراسلة ${tenant.name}`);
          } else {
            showToast('رقم هاتف المستأجر غير متوفر');
          }
        }
      } else if (alert.actionType === 'VIEW_JOURNAL') {
        if (onNavigateSection) onNavigateSection('accounting');
      } else if (alert.actionType === 'VIEW_REPORT') {
        if (onNavigateSection) onNavigateSection('reports');
      } else if (alert.actionType === 'VIEW_DOCUMENT_DETAILS') {
        if (alert.entityType === 'INVOICE') {
          const inv = invoices.find(i => i.id === alert.entityId);
          if (inv) {
            setSelectedReaderInvoice(inv);
            setSelectedReaderTenantId(inv.tenantId);
          }
        } else if (alert.entityType === 'TENANT') {
          setSelectedReaderTenantId(alert.entityId || null);
        }
      }
    } finally {
      setIsActionRunning(null);
    }
  };

  const handleSendWhatsAppInvoiceReminder = (alert: SmartAlertItem) => {
    if (alert.entityType === 'INVOICE') {
      const inv = invoices.find(i => i.id === alert.entityId);
      const tenant = tenants.find(t => t.id === inv?.tenantId);
      if (tenant && tenant.phone) {
        const rawPhone = tenant.phone.replace(/[^0-9]/g, '');
        const msg = encodeURIComponent(
          `السلام عليكم ورحمة الله، الأستاذ/ ${tenant.name} المحترم.\nنحيطكم علماً بوجود فاتورة إيجار مستحقة برقم (${inv?.invoiceNumber}) بمبلغ (${formatCurrency(inv?.balance || 0)}) استحقت بتاريخ (${inv?.dueDate}). يُرجى سداد المبلغ أو تحويله لتجنب غرامات التأخير. شاكرين ومقدرين حسن تعاونكم.`
        );
        window.open(`https://wa.me/${rawPhone}?text=${msg}`, '_blank');
        showToast(`تم فتح تطبيق واتساب لمراسلة ${tenant.name}`);
      } else {
        showToast('رقم هاتف المستأجر غير مسجل');
      }
    }
  };

  const getSeverityStyle = (severity: SmartAlertSeverity) => {
    switch (severity) {
      case 'CRITICAL':
        return {
          cardBg: 'bg-rose-50/70 border-rose-200/90 hover:border-rose-300',
          iconColor: 'text-rose-600',
          badgeVariant: 'rose' as const,
          badgeLabel: 'حرج للغاية'
        };
      case 'HIGH':
        return {
          cardBg: 'bg-amber-50/70 border-amber-200/90 hover:border-amber-300',
          iconColor: 'text-amber-600',
          badgeVariant: 'amber' as const,
          badgeLabel: 'مرتفع'
        };
      case 'MEDIUM':
        return {
          cardBg: 'bg-sky-50/70 border-sky-200/90 hover:border-sky-300',
          iconColor: 'text-sky-600',
          badgeVariant: 'blue' as const,
          badgeLabel: 'متوسط'
        };
      case 'OPPORTUNITY':
        return {
          cardBg: 'bg-purple-50/70 border-purple-200/90 hover:border-purple-300',
          iconColor: 'text-purple-600',
          badgeVariant: 'indigo' as const,
          badgeLabel: 'فرصة تحسينية'
        };
      default:
        return {
          cardBg: 'bg-slate-50 border-slate-200',
          iconColor: 'text-slate-600',
          badgeVariant: 'slate' as const,
          badgeLabel: 'معلوماتي'
        };
    }
  };

  const getCategoryLabel = (category: SmartAlertCategory) => {
    switch (category) {
      case 'CONTRACTS':
        return 'العقود والمستأجرين';
      case 'COLLECTIONS':
        return 'التحصيل والفواتير';
      case 'FINANCIAL':
        return 'السيولة والمالية';
      case 'PROPERTIES':
        return 'الوحدات الشاغرة';
      case 'BACKUP':
        return 'النسخ الاحتياطي والأمان';
      case 'SECURITY':
        return 'أمان الحسابات';
      default:
        return category;
    }
  };

  return (
    <div className="space-y-6">

      {/* Toast Notification */}
      {successToast && (
        <div className="bg-emerald-600 text-white p-4 rounded-xl flex items-center justify-between text-xs sm:text-sm font-bold shadow-md animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{successToast}</span>
          </div>
          <button onClick={() => setSuccessToast(null)} className="p-1 text-white/80 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner: Smart Intelligence Radar */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-5 sm:p-6 shadow-md border border-slate-700/80">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-500 to-rose-700 flex items-center justify-center text-white shadow-lg shrink-0">
              <Zap className="w-8 h-8" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                  لوحة التنبيهات والرقابة الذكية (Smart Alerts Hub)
                </h1>
                <span className="text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-rose-400" />
                  رادار التحليل المالي والتشغيلي المباشر
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1.5 leading-relaxed max-w-3xl">
                يقوم محرك الذكاء التشغيلي بفحص كافة العقود، الفواتير المتأخرة، السيولة النقدية، حالة النسخ الاحتياطي، وحركات النظام، وتقديم توصيات وإجراءات فورية بنقرة واحدة.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="bg-slate-800/90 border border-slate-700 px-4 py-2.5 rounded-xl text-center">
              <div className="text-xs text-slate-400 font-medium">إجمالي التنبيهات النشطة</div>
              <div className="text-xl font-black text-white">{smartAlerts.length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Summary Counter Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        
        <div
          onClick={() => setSelectedSeverity(selectedSeverity === 'CRITICAL' ? 'ALL' : 'CRITICAL')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            selectedSeverity === 'CRITICAL'
              ? 'bg-rose-100/80 border-rose-400 shadow-sm'
              : 'bg-white border-slate-200/90 hover:border-rose-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-rose-600 mb-1.5">
            <span>تنبيهات حرجة</span>
            <AlertOctagon className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-rose-700">{criticalCount}</div>
          <p className="text-[11px] text-slate-500 mt-1">تتطلب تدخلاً فورياً لحماية الإيرادات</p>
        </div>

        <div
          onClick={() => setSelectedSeverity(selectedSeverity === 'HIGH' ? 'ALL' : 'HIGH')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            selectedSeverity === 'HIGH'
              ? 'bg-amber-100/80 border-amber-400 shadow-sm'
              : 'bg-white border-slate-200/90 hover:border-amber-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-amber-600 mb-1.5">
            <span>تنبيهات مرتفعة الأهمية</span>
            <Flame className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-amber-700">{highCount}</div>
          <p className="text-[11px] text-slate-500 mt-1">استحقاقات قريبة ومتأخرات</p>
        </div>

        <div
          onClick={() => setSelectedSeverity(selectedSeverity === 'MEDIUM' ? 'ALL' : 'MEDIUM')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            selectedSeverity === 'MEDIUM'
              ? 'bg-sky-100/80 border-sky-400 shadow-sm'
              : 'bg-white border-slate-200/90 hover:border-sky-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-sky-600 mb-1.5">
            <span>تنبيهات متوسطة ومعلوماتية</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-sky-700">{mediumCount}</div>
          <p className="text-[11px] text-slate-500 mt-1">فترات محاسبية ومتابعات</p>
        </div>

        <div
          onClick={() => setSelectedSeverity(selectedSeverity === 'OPPORTUNITY' ? 'ALL' : 'OPPORTUNITY')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            selectedSeverity === 'OPPORTUNITY'
              ? 'bg-purple-100/80 border-purple-400 shadow-sm'
              : 'bg-white border-slate-200/90 hover:border-purple-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-purple-600 mb-1.5">
            <span>فرص تحسين الدخل</span>
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-purple-700">{opportunityCount}</div>
          <p className="text-[11px] text-slate-500 mt-1">وحدات شاغرة وهدر إيجاري</p>
        </div>

      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-3.5">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {[
              { id: 'ALL', label: 'كافة التنبيهات' },
              { id: 'CONTRACTS', label: 'العقود والمستأجرين' },
              { id: 'COLLECTIONS', label: 'التحصيل والفواتير' },
              { id: 'FINANCIAL', label: 'السيولة والمالية' },
              { id: 'PROPERTIES', label: 'الوحدات الشاغرة' },
              { id: 'BACKUP', label: 'النسخ الاحتياطي والأمان' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedCategory(tab.id)}
                className={`text-xs font-bold px-3 py-1.5 rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === tab.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="بحث في التنبيهات..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full text-xs pr-9 pl-3 py-2 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ×
              </button>
            )}
          </div>

        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        {filteredAlerts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/90 p-12 text-center text-slate-500 shadow-2xs">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">لا توجد تنبيهات مطابقة حالياً</h3>
            <p className="text-xs text-slate-400 mt-1">كافة الحسابات والعقود والنسخ الاحتياطي تعمل بانتظام وسلاسة.</p>
          </div>
        ) : (
          filteredAlerts.map(alert => {
            const style = getSeverityStyle(alert.severity);

            return (
              <div
                key={alert.id}
                className={`rounded-2xl border p-4 sm:p-5 transition-all shadow-2xs ${style.cardBg}`}
              >
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  
                  {/* Left Column: Icon & Content */}
                  <div className="flex items-start gap-3.5 flex-1">
                    <div className={`w-10 h-10 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-xs border border-slate-200/60 ${style.iconColor}`}>
                      {alert.severity === 'CRITICAL' ? (
                        <AlertOctagon className="w-5 h-5" />
                      ) : alert.severity === 'HIGH' ? (
                        <AlertTriangle className="w-5 h-5" />
                      ) : alert.category === 'BACKUP' ? (
                        <HardDrive className="w-5 h-5" />
                      ) : alert.severity === 'OPPORTUNITY' ? (
                        <Sparkles className="w-5 h-5" />
                      ) : (
                        <Bell className="w-5 h-5" />
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-black text-slate-900">
                          {alert.title}
                        </h3>
                        <Badge variant={style.badgeVariant}>
                          {style.badgeLabel}
                        </Badge>
                        <span className="text-[11px] font-semibold text-slate-500 bg-white/80 px-2 py-0.5 rounded-md border border-slate-200">
                          {getCategoryLabel(alert.category)}
                        </span>
                        {alert.metric && (
                          <span className="text-[11px] font-mono font-bold text-rose-700 bg-rose-100/60 px-2 py-0.5 rounded-md border border-rose-200">
                            {alert.metric}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
                        {alert.description}
                      </p>
                    </div>
                  </div>

                  {/* Right Column: Actions */}
                  <div className="flex flex-wrap items-center gap-2 self-end md:self-center shrink-0">
                    
                    {/* Read Document button for Invoices / Late Rent alerts */}
                    {alert.entityType === 'INVOICE' && (
                      <button
                        onClick={() => {
                          const inv = invoices.find(i => i.id === alert.entityId);
                          if (inv) {
                            setSelectedReaderInvoice(inv);
                            setSelectedReaderTenantId(inv.tenantId);
                          }
                        }}
                        className="bg-indigo-900 hover:bg-indigo-800 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                        title="قراءة تفاصيل المستند للمدير العام"
                      >
                        <Crown className="w-3.5 h-3.5 text-amber-400" />
                        <span>قراءة المستند</span>
                      </button>
                    )}

                    {/* WhatsApp button for overdue invoices */}
                    {alert.category === 'COLLECTIONS' && alert.entityType === 'INVOICE' && (
                      <button
                        onClick={() => handleSendWhatsAppInvoiceReminder(alert)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                        title="إرسال رسالة مطالبة رسمية للمستأجر عبر واتساب"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>مطالبة واتساب</span>
                      </button>
                    )}

                    {/* Main Action Button */}
                    {alert.actionLabel && (
                      <button
                        onClick={() => handleAction(alert)}
                        disabled={isActionRunning === alert.id}
                        className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                      >
                        <span>{isActionRunning === alert.id ? 'جارٍ التنفيذ...' : alert.actionLabel}</span>
                        <ChevronLeft className="w-3.5 h-3.5 text-slate-400" />
                      </button>
                    )}

                    {/* Dismiss Button */}
                    <button
                      onClick={() => dismissSmartAlert(alert.id)}
                      className="text-slate-400 hover:text-slate-600 hover:bg-white/80 p-2 rounded-xl transition-colors cursor-pointer"
                      title="إخفاء التنبيه / تمت المعالجة"
                    >
                      <Check className="w-4 h-4 text-emerald-600" />
                    </button>
                  </div>

                </div>
              </div>
            );
          })
        )}
      </div>

      {/* General Manager Document Reader Modal */}
      {(selectedReaderInvoice || selectedReaderTenantId) && (
        <GeneralManagerDocumentReaderModal
          invoice={selectedReaderInvoice}
          tenantId={selectedReaderTenantId}
          onClose={() => {
            setSelectedReaderInvoice(null);
            setSelectedReaderTenantId(null);
          }}
          onOpenPayment={(tId) => {
            setSelectedReaderInvoice(null);
            setSelectedReaderTenantId(null);
            if (onOpenPaymentForTenant) onOpenPaymentForTenant(tId);
            else if (onNavigateSection) onNavigateSection('payments');
          }}
          onOpenTenantStatement={() => {
            setSelectedReaderInvoice(null);
            setSelectedReaderTenantId(null);
            if (onNavigateSection) onNavigateSection('reports');
          }}
        />
      )}

    </div>
  );
};
