// تصميم م. أبو أحمد — مصمم ومنفذ Claude — © الحقوق محفوظة
import React, { useState, useRef } from 'react';
import {
  FileText,
  Receipt,
  Building,
  User,
  Phone,
  MessageCircle,
  Calendar,
  DollarSign,
  Clock,
  Printer,
  Download,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  BookOpen,
  Crown,
  X,
  CreditCard,
  Send,
  Eye,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  ChevronDown,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { Invoice, Payment, Tenant, Property, Unit, Contract, JournalEntry } from '../../types';
import { useStore } from '../../lib/store';
import { formatCurrency, tafqeet } from '../../lib/numberToArabicWords';
import { exportElementToPdf } from '../../lib/pdfExportUtil';
import { Badge } from '../common/Badge';

interface GeneralManagerDocumentReaderModalProps {
  invoice?: Invoice | null;
  tenantId?: string | null;
  onClose: () => void;
  onOpenPayment?: (tenantId: string, invoiceId?: string) => void;
  onOpenTenantStatement?: (tenantId: string) => void;
}

export const GeneralManagerDocumentReaderModal: React.FC<GeneralManagerDocumentReaderModalProps> = ({
  invoice: initialInvoice,
  tenantId: initialTenantId,
  onClose,
  onOpenPayment,
  onOpenTenantStatement
}) => {
  const {
    invoices,
    tenants,
    properties,
    units,
    contracts,
    payments,
    journalEntries,
    currentUser
  } = useStore();

  const printAreaRef = useRef<HTMLDivElement>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [managerNote, setManagerNote] = useState('');
  const [savedNotes, setSavedNotes] = useState<Array<{ id: string; note: string; date: string; author: string }>>([]);
  const [isFullScreen, setIsFullScreen] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Resolve target invoice(s)
  const resolvedTenantId = initialInvoice?.tenantId || initialTenantId || '';
  const tenant = tenants.find(t => t.id === resolvedTenantId);

  // Invoices for this tenant, prioritizing overdue
  const tenantInvoices = invoices.filter(inv => inv.tenantId === resolvedTenantId);
  const overdueTenantInvoices = tenantInvoices.filter(
    inv => inv.status === 'OVERDUE' || (inv.status === 'UNPAID' && inv.balance > 0)
  );

  // Currently selected invoice in reader
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>(
    initialInvoice?.id || overdueTenantInvoices[0]?.id || tenantInvoices[0]?.id || ''
  );

  const currentInvoice = invoices.find(i => i.id === selectedInvoiceId) || initialInvoice || overdueTenantInvoices[0];

  if (!currentInvoice && !tenant) {
    return null;
  }

  const property = properties.find(p => p.id === currentInvoice?.propertyId);
  const unit = units.find(u => u.id === currentInvoice?.unitId);
  const contract = contracts.find(c => c.id === currentInvoice?.contractId);
  const journalEntry = journalEntries.find(
    j => j.id === currentInvoice?.journalEntryId || j.refId === currentInvoice?.id
  );

  // Payments applied to this invoice
  const relatedPayments = payments.filter(
    p => p.status === 'POSTED' && p.allocations?.some(a => a.invoiceId === currentInvoice?.id)
  );

  // Calculate overdue days
  const now = new Date();
  const dueDate = currentInvoice?.dueDate ? new Date(currentInvoice.dueDate) : now;
  const daysOverdue = Math.max(0, Math.ceil((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));

  // Aging Bucket
  let agingBucketText = 'جاري (ضمن المهلة)';
  let agingBadgeVariant: 'emerald' | 'amber' | 'rose' = 'emerald';
  if (daysOverdue > 90) {
    agingBucketText = 'تأخير حرج (+90 يوماً) - يتطلب إجراءً قضائياً';
    agingBadgeVariant = 'rose';
  } else if (daysOverdue > 60) {
    agingBucketText = 'تأخير مرتفع (61-90 يوماً) - يتطلب إنذاراً نهائياً';
    agingBadgeVariant = 'rose';
  } else if (daysOverdue > 30) {
    agingBucketText = 'تأخير متوسط (31-60 يوماً)';
    agingBadgeVariant = 'amber';
  } else if (daysOverdue > 0) {
    agingBadgeVariant = 'amber';
    agingBucketText = `تأخير مبكر (${daysOverdue} يوماً)`;
  }

  // Handle WhatsApp Formal Legal Demand
  const handleSendWhatsAppNotice = () => {
    if (!tenant?.phone) {
      showToast('رقم هاتف المستأجر غير مسجل في النظام');
      return;
    }
    const cleanPhone = tenant.phone.replace(/[^0-9]/g, '');
    const amountStr = formatCurrency(currentInvoice?.balance || 0);
    const invoiceNum = currentInvoice?.invoiceNumber || '—';
    const contractNum = contract?.contractNumber || '—';
    const unitLabel = `${property?.name || ''} - وحدة (${unit?.unitNumber || ''})`;

    const message = encodeURIComponent(
      `السلام عليكم ورحمة الله وبركاته،\nالأستاذ/ ${tenant.name} المحترم.\n\n` +
      `تُحيطكم إدارة "شركة المحصل لإدارة وتأجير العقارات" علماً بوجود استحقاق إيجاري متأخر السداد:\n` +
      `▪ رقم الفاتورة: ${invoiceNum}\n` +
      `▪ رقم العقد: ${contractNum}\n` +
      `▪ العقار والوحدة: ${unitLabel}\n` +
      `▪ تاريخ الاستحقاق: ${currentInvoice?.dueDate}\n` +
      `▪ المبلغ المطلوب سداده: ${amountStr}\n\n` +
      `نرجو من سعادتكم التكرم بسرعة المبادرة بالسداد أو التحويل البنكي لحساب الشركة لتفادي الإجراءات النظامية وغرامات التأخير.\n` +
      `شاكرين ومقدرين حسن تعاونكم الدائم.\n\n` +
      `الإدارة العامة - شركة المحصل العقارية`
    );

    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
    showToast(`تم فتح تطبيق واتساب لمراسلة المستأجر ${tenant.name}`);
  };

  // Direct Call
  const handleDirectCall = () => {
    if (!tenant?.phone) {
      showToast('رقم الهاتف غير متوفر');
      return;
    }
    window.location.href = `tel:${tenant.phone.replace(/[^0-9+]/g, '')}`;
  };

  // Export/Print Official PDF Demand Notice
  const handlePrintPdfNotice = async () => {
    if (!printAreaRef.current || isExportingPdf) return;
    try {
      setIsExportingPdf(true);
      const filename = `إشعار_مطالبة_إيجار_${currentInvoice?.invoiceNumber || 'مستند'}_${tenant?.name || 'مستأجر'}`;
      await exportElementToPdf(printAreaRef.current, filename, {
        orientation: 'portrait',
        scale: 2
      });
      showToast('تم تصدير وطباعة إشعار المطالبة المعتمد بنجاح!');
    } catch (err) {
      console.error(err);
      showToast('حدث خطأ أثناء تصدير مستند المطالبة');
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Add Manager Follow-up Note
  const handleAddManagerNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!managerNote.trim()) return;
    setSavedNotes(prev => [
      {
        id: `note_${Date.now()}`,
        note: managerNote.trim(),
        date: new Date().toLocaleDateString('ar-SA') + ' ' + new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
        author: currentUser?.name || 'المدير العام'
      },
      ...prev
    ]);
    setManagerNote('');
    showToast('تم حفظ ملاحظة المتابعة الإدارية بنجاح في سجل المستند');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className={`bg-white rounded-2xl sm:rounded-3xl ${isFullScreen ? 'max-w-6xl w-full h-[96vh]' : 'max-w-4xl w-full max-h-[94vh]'} flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150`}>
        
        {/* Top Executive Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white p-3.5 sm:p-5 flex items-center justify-between border-b border-slate-700 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-rose-700 flex items-center justify-center text-white shadow-md shrink-0">
              <Receipt className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[9px] sm:text-[10px] font-black px-2 sm:px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Crown className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-rose-400" />
                  <span>قارئ تفاصيل المستند للمدير العام</span>
                </span>
                <span className="text-[11px] sm:text-xs font-mono font-bold text-slate-300 bg-white/10 px-2 py-0.5 rounded-md">
                  {currentInvoice?.invoiceNumber || 'مستند إيجار'}
                </span>
              </div>
              <h2 className="text-sm sm:text-base md:text-lg font-black text-white mt-1 truncate">
                تفاصيل استحقاق الإيجار: {tenant?.name}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button
              onClick={handlePrintPdfNotice}
              disabled={isExportingPdf}
              className="hidden sm:flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all cursor-pointer border border-white/15"
              title="طباعة إشعار مطالبة رسمية معتمدة PDF"
            >
              <Printer className="w-4 h-4 text-emerald-400" />
              <span>{isExportingPdf ? 'جارٍ التصدير...' : 'طباعة إشعار رسمي PDF'}</span>
            </button>
            <button
              onClick={() => setIsFullScreen(prev => !prev)}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer hidden sm:flex"
              title={isFullScreen ? 'تصغير العرض' : 'توسيع المستند لمساحة الشاشة الكاملة (عرض موسع براحته)'}
            >
              {isFullScreen ? <Minimize2 className="w-5 h-5 text-amber-300" /> : <Maximize2 className="w-5 h-5 text-amber-300" />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
              title="إغلاق"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>

        {/* Toast alert */}
        {toastMessage && (
          <div className="bg-emerald-600 text-white text-xs sm:text-sm font-bold p-3 px-5 flex items-center gap-2 shadow-inner shrink-0">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Multi-Invoice Selector if tenant has multiple invoices */}
        {tenantInvoices.length > 1 && (
          <div className="bg-slate-100 border-b border-slate-200 px-5 py-2.5 flex items-center gap-2 overflow-x-auto shrink-0 text-xs">
            <span className="font-bold text-slate-700 whitespace-nowrap">فواتير ومستندات المستأجر:</span>
            {tenantInvoices.map(inv => {
              const isSelected = inv.id === currentInvoice?.id;
              const isOverdue = inv.status === 'OVERDUE' || (inv.status === 'UNPAID' && inv.balance > 0);
              return (
                <button
                  key={inv.id}
                  onClick={() => setSelectedInvoiceId(inv.id)}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-slate-900 text-white shadow-xs'
                      : isOverdue
                      ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span>{inv.invoiceNumber}</span>
                  <span className="font-mono text-[11px]">({formatCurrency(inv.balance)})</span>
                  {isOverdue && <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />}
                </button>
              );
            })}
          </div>
        )}

        {/* Main Body - Scrollable */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-xs">

          {/* Printable Official Document Sheet Area */}
          <div
            ref={printAreaRef}
            className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-xs relative print:p-0 print:border-none"
          >
            {/* Watermark/Stamp for GM */}
            <div className="absolute left-6 top-6 opacity-10 pointer-events-none select-none text-right">
              <div className="text-4xl font-black font-serif text-slate-900 border-4 border-slate-900 p-2 rounded-2xl rotate-12">
                معتمد للمدير العام
              </div>
            </div>

            {/* Official Letterhead Header */}
            <div className="border-b-2 border-slate-900 pb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-black">
                    م
                  </div>
                  <h1 className="text-lg font-black text-slate-900">شركة المحصل لإدارة وتأجير العقارات</h1>
                </div>
                <p className="text-[11px] text-slate-500">
                  المملكة العربية السعودية · سجل تجاري معتمد · إدارة الأملاك وتحصيل الإيجارات
                </p>
                <div className="text-[10px] text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded inline-block">
                  وثيقة مطالبة وتدقيق مالي معتمدة للإدارة العامة
                </div>
              </div>

              <div className="text-left bg-slate-50 p-3 rounded-xl border border-slate-200 font-mono text-[11px] space-y-1">
                <div><span className="text-slate-400">رقم الفاتورة:</span> <strong>{currentInvoice?.invoiceNumber}</strong></div>
                <div><span className="text-slate-400">تاريخ التحرير:</span> <strong>{currentInvoice?.createdAt ? currentInvoice.createdAt.slice(0, 10) : currentInvoice?.periodStart}</strong></div>
                <div><span className="text-slate-400">تاريخ الاستحقاق:</span> <strong className="text-rose-700">{currentInvoice?.dueDate}</strong></div>
              </div>
            </div>

            {/* Status Alert Banner */}
            <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
              daysOverdue > 30 ? 'bg-rose-50 border-rose-300 text-rose-900' : 'bg-amber-50 border-amber-300 text-amber-900'
            }`}>
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  daysOverdue > 30 ? 'bg-rose-600 text-white' : 'bg-amber-600 text-white'
                }`}>
                  <AlertOctagon className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <span>حالة المستند: {agingBucketText}</span>
                    <Badge variant={agingBadgeVariant} size="sm">
                      {daysOverdue > 0 ? `متأخر منذ ${daysOverdue} يوماً` : 'مستحق'}
                    </Badge>
                  </div>
                  <p className="text-[11px] mt-0.5 opacity-90">
                    الرصيد المتبقي غير المسدد: <strong className="font-mono text-base">{formatCurrency(currentInvoice?.balance || 0)}</strong>
                    {currentInvoice?.balance ? ` (${tafqeet(currentInvoice.balance)})` : ''}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  onClick={handleSendWhatsAppNotice}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                  title="إرسال إنذار ومطالبة فورية عبر واتساب"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>مطالبة واتساب</span>
                </button>
                <button
                  onClick={handleDirectCall}
                  className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                  title="اتصال مباشر بالمستأجر"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>اتصال</span>
                </button>
              </div>
            </div>

            {/* Document Details Grid: Tenant & Unit & Contract */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Tenant Profile Box */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <User className="w-4 h-4 text-emerald-600" />
                    <span>بيانات المستأجر والطرف الثاني:</span>
                  </span>
                  <span className="font-mono text-[10px] text-slate-400">ID: {tenant?.id}</span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">اسم المستأجر:</span>
                    <strong className="text-slate-900">{tenant?.name}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">الهوية الوطنية / الإقامة:</span>
                    <strong className="font-mono text-slate-800">{tenant?.nationalId || 'غير مدخل'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">رقم الهاتف الجوال:</span>
                    <strong className="font-mono text-slate-900" dir="ltr">{tenant?.phone || 'غير مسجل'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">البريد الإلكتروني:</span>
                    <span className="font-mono text-slate-600" dir="ltr">{tenant?.email || '—'}</span>
                  </div>
                </div>
              </div>

              {/* Property & Contract Box */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Building className="w-4 h-4 text-indigo-600" />
                    <span>بيانات العقار والعقد الإيجاري:</span>
                  </span>
                  <span className="font-mono text-[10px] text-slate-400">{contract?.contractNumber || 'عقد موحد'}</span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">اسم العقار:</span>
                    <strong className="text-slate-900">{property?.name || 'عقار'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">رقم ونوع الوحدة:</span>
                    <strong className="text-slate-900">
                      وحدة {unit?.unitNumber} ({unit?.type === 'SHOP' ? 'محل تجاري' : unit?.type === 'OFFICE' ? 'مكتب' : unit?.type === 'WAREHOUSE' ? 'مستودع' : unit?.type === 'VILLA' ? 'فيلا' : 'شقة'})
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">مدة العقد:</span>
                    <span className="font-mono text-slate-700">من {contract?.startDate} إلى {contract?.endDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">دورية السداد:</span>
                    <span className="font-bold text-slate-800">
                      {contract?.paymentFrequency === 'MONTHLY' ? 'شهري' : contract?.paymentFrequency === 'QUARTERLY' ? 'ربع سنوي' : 'سنوي'}
                    </span>
                  </div>
                </div>
              </div>

            </div>

            {/* Financial Breakdown Table */}
            <div className="space-y-2">
              <h3 className="font-bold text-slate-900 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <span>البيان المالي والتفقيط التفصيلي للمستند:</span>
              </h3>

              <div className="border border-slate-200 rounded-2xl overflow-x-auto w-full">
                <table className="w-full text-right min-w-[540px]">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">بيان البند والخدمة</th>
                      <th className="p-3">الفترة الإيجارية المغطاة</th>
                      <th className="p-3 text-left font-mono">المبلغ الأساسي</th>
                      <th className="p-3 text-left font-mono">المسدد</th>
                      <th className="p-3 text-left font-mono">المتبقي المطلوب</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="p-3 font-bold text-slate-900">
                        قيمة إيجار الوحدة ({unit?.unitNumber}) - {property?.name}
                      </td>
                      <td className="p-3 font-mono text-slate-600">
                        {currentInvoice?.periodStart} إلى {currentInvoice?.periodEnd}
                      </td>
                      <td className="p-3 text-left font-mono font-bold text-slate-800">
                        {formatCurrency(currentInvoice?.amount || 0)}
                      </td>
                      <td className="p-3 text-left font-mono font-bold text-emerald-700">
                        {formatCurrency(currentInvoice?.paidAmount || 0)}
                      </td>
                      <td className="p-3 text-left font-mono font-black text-rose-700 text-sm">
                        {formatCurrency(currentInvoice?.balance || 0)}
                      </td>
                    </tr>
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-300">
                    <tr>
                      <td colSpan={2} className="p-3 text-slate-800">
                        المجموع الصافي المتأخر المطالب به:
                      </td>
                      <td colSpan={3} className="p-3 text-left font-mono text-base font-black text-rose-800">
                        {formatCurrency(currentInvoice?.balance || 0)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Tafqeet in Arabic Words */}
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-950 flex items-center justify-between">
                <div>
                  <span className="font-bold block">المبلغ بالحروف العربية (تفقيط رسمي):</span>
                  <p className="font-semibold text-emerald-900 mt-0.5">
                    فقط {tafqeet(currentInvoice?.balance || 0)} لا غير.
                  </p>
                </div>
                <span className="font-mono text-emerald-700 font-bold text-[11px] bg-white px-2.5 py-1 rounded-lg border border-emerald-300">
                  SAR {currentInvoice?.balance?.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Linked Journal Entry & Accounting Audit */}
            {journalEntry && (
              <div className="bg-indigo-50/60 border border-indigo-200 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between border-b border-indigo-200/80 pb-2">
                  <span className="font-bold text-indigo-950 flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-indigo-700" />
                    <span>التوجيه المحاسبي وقيد الاستحقاق (Journal Entry):</span>
                  </span>
                  <span className="font-mono font-bold text-indigo-800 text-[11px]">
                    قيد رقم: {journalEntry.entryNumber}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-[11px]">
                  <div>
                    <span className="text-indigo-600 block">تاريخ القيد والترحيل:</span>
                    <strong className="font-mono text-indigo-950">{journalEntry.postingDate}</strong>
                  </div>
                  <div>
                    <span className="text-indigo-600 block">الحساب المدين:</span>
                    <strong className="text-indigo-950">1102 - ذمم المستأجرين المدينين</strong>
                  </div>
                  <div>
                    <span className="text-indigo-600 block">الحساب الدائن:</span>
                    <strong className="text-indigo-950">4101 - إيرادات تأجير العقارات</strong>
                  </div>
                </div>
              </div>
            )}

            {/* Previous Payments on this Invoice */}
            {relatedPayments.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  <span>سندات القبض المسددة سابقاً على هذه الفاتورة:</span>
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-x-auto w-full">
                  <table className="w-full text-right text-xs min-w-[500px]">
                    <thead className="bg-slate-100 font-bold text-slate-700">
                      <tr>
                        <th className="p-2.5">رقم السند</th>
                        <th className="p-2.5">تاريخ التحصيل</th>
                        <th className="p-2.5">طريقة الدفع</th>
                        <th className="p-2.5">المحصل</th>
                        <th className="p-2.5 text-left font-mono">المبلغ المخصص</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {relatedPayments.map(p => (
                        <tr key={p.id}>
                          <td className="p-2.5 font-mono font-bold text-slate-900">{p.receiptNumber}</td>
                          <td className="p-2.5 font-mono text-slate-600">{p.paymentDate}</td>
                          <td className="p-2.5"><Badge variant="slate" size="sm">{p.paymentMethod}</Badge></td>
                          <td className="p-2.5 text-slate-700">{p.receivedBy}</td>
                          <td className="p-2.5 text-left font-mono font-bold text-emerald-700">
                            {formatCurrency(p.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Signature & Official Endorsement Block */}
            <div className="pt-6 border-t-2 border-slate-200 grid grid-cols-2 gap-8 text-center text-xs">
              <div>
                <span className="text-slate-500 block mb-1">المحاسب المراجع والمدقق:</span>
                <p className="font-bold text-slate-800">قسم الحسابات والتحصيل</p>
                <div className="mt-4 border-b border-dashed border-slate-300 w-36 mx-auto"></div>
                <span className="text-[10px] text-slate-400 mt-1 block">التوقيع والختم</span>
              </div>
              <div>
                <span className="text-slate-500 block mb-1">الاعتماد النهائي للمستند:</span>
                <p className="font-bold text-rose-800">المدير العام (الإدارة العليا)</p>
                <div className="mt-4 border-b border-dashed border-slate-300 w-36 mx-auto"></div>
                <span className="text-[10px] text-emerald-700 font-bold mt-1 block">معتمد رسمي للتحصيل والتنفيذ</span>
              </div>
            </div>

          </div>

          {/* General Manager Follow-up Notes Section */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
            <h4 className="font-bold text-slate-900 flex items-center justify-between">
              <span>سجل ملاحظات المتابعة الإدارية والقانونية للمدير العام:</span>
              <span className="text-slate-400 font-normal text-[11px]">خاص بالإدارة والمشرفين</span>
            </h4>

            <form onSubmit={handleAddManagerNote} className="flex gap-2">
              <input
                type="text"
                placeholder="أضف ملاحظة متابعة (مثال: تم الاتصال بالمستأجر ووعد بالتحويل البنكي يوم الخميس القادم)..."
                value={managerNote}
                onChange={e => setManagerNote(e.target.value)}
                className="flex-1 bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
              <button
                type="submit"
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                <span>حفظ الملاحظة</span>
              </button>
            </form>

            {savedNotes.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-200">
                {savedNotes.map(n => (
                  <div key={n.id} className="bg-white p-3 rounded-xl border border-slate-200 flex items-start justify-between text-xs">
                    <div>
                      <p className="text-slate-800 font-medium">{n.note}</p>
                      <span className="text-[10px] text-slate-400 mt-1 block font-mono">
                        بواسطة: {n.author} · {n.date}
                      </span>
                    </div>
                    <Badge variant="slate" size="sm">ملاحظة موثقة</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Footer Actions Suite */}
        <div className="bg-slate-900 text-white p-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            {onOpenTenantStatement && tenant && (
              <button
                onClick={() => {
                  onClose();
                  onOpenTenantStatement(tenant.id);
                }}
                className="text-xs text-indigo-300 hover:text-white font-bold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>عرض كشف الحساب الشامل للمستأجر</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleSendWhatsAppNotice}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-98"
            >
              <MessageCircle className="w-4 h-4" />
              <span>إرسال إنذار ومطالبة واتساب</span>
            </button>

            {onOpenPayment && tenant && (
              <button
                onClick={() => {
                  onClose();
                  onOpenPayment(tenant.id, currentInvoice?.id);
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-98"
              >
                <CreditCard className="w-4 h-4" />
                <span>فتح سند قبض وتحصيل فوري</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
