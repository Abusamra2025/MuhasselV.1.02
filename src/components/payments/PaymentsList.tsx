// تصميم م. أبو أحمد — مصمم ومنفذ Claude — © الحقوق محفوظة
import React, { useState } from 'react';
import {
  CreditCard,
  Printer,
  RotateCcw,
  Search,
  Filter,
  CheckCircle,
  AlertTriangle,
  FileText,
  ShieldCheck,
  FileSpreadsheet
} from 'lucide-react';
import { useStore } from '../../lib/store';
import { Payment } from '../../types';
import { formatCurrency } from '../../lib/numberToArabicWords';
import { Badge } from '../common/Badge';
import { exportDailyCollectionsToExcel } from '../../lib/exportUtils';

interface PaymentsListProps {
  onViewReceipt: (payment: Payment) => void;
  onOpenNewPayment: () => void;
}

export const PaymentsList: React.FC<PaymentsListProps> = ({
  onViewReceipt,
  onOpenNewPayment
}) => {
  const { payments, tenants, properties, reversePayment, currentUser, isSupervisoryOnly, canUserPerform } = useStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'POSTED' | 'REVERSED'>('ALL');
  const [reversalTarget, setReversalTarget] = useState<Payment | null>(null);
  const [reversalReason, setReversalReason] = useState('');
  const [actionError, setActionError] = useState('');

  const filteredPayments = payments.filter(p => {
    if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;

    if (searchTerm) {
      const tenant = tenants.find(t => t.id === p.tenantId);
      const term = searchTerm.toLowerCase();
      const matchRec = p.receiptNumber.toLowerCase().includes(term);
      const matchTenant = tenant?.name.toLowerCase().includes(term);
      const matchNotes = p.notes?.toLowerCase().includes(term);
      return matchRec || matchTenant || matchNotes;
    }

    return true;
  });

  const handleConfirmReversal = () => {
    if (!reversalTarget) return;
    if (!reversalReason.trim()) {
      setActionError('يرجى كتابة سبب الإلغاء والعكس بوضوح لأغراض التدقيق المحاسبي');
      return;
    }

    const res = reversePayment({
      paymentId: reversalTarget.id,
      reason: reversalReason.trim()
    });

    if (res.success) {
      setReversalTarget(null);
      setReversalReason('');
      setActionError('');
    } else {
      setActionError(res.error || 'فشل عكس سند القبض');
    }
  };

  const getMethodBadge = (method: string) => {
    switch (method) {
      case 'BANK_TRANSFER':
        return <Badge variant="blue" size="sm">تحويل بنكي</Badge>;
      case 'POS':
        return <Badge variant="indigo" size="sm">شبكة مدى</Badge>;
      case 'CASH':
        return <Badge variant="emerald" size="sm">نقدي</Badge>;
      case 'CHEQUE':
        return <Badge variant="purple" size="sm">شيك</Badge>;
      default:
        return <Badge variant="slate" size="sm">{method}</Badge>;
    }
  };

  return (
    <div className="space-y-5">
      
      {/* Title & Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900">سجل المقبوضات وسندات القبض</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            كافة سندات القبض المالية المرحلة وقيودها اليومية وسندات العكس المعتمدة
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => exportDailyCollectionsToExcel(filteredPayments)}
            className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            title="تصدير جدول المقبوضات المعروضة إلى ملف Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
            <span>تصدير Excel (.xlsx)</span>
          </button>

          {isSupervisoryOnly ? (
            <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs px-3 py-2 rounded-lg font-bold flex items-center gap-1.5 shadow-2xs">
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              <span>وظيفة المدير رقابية فقط (الحركات تصدر بواسطة أمين الصندوق)</span>
            </div>
          ) : canUserPerform('canIssueReceipts') ? (
            <button
              onClick={onOpenNewPayment}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            >
              <CreditCard className="w-4 h-4" />
              <span>إصدار سند قبض جديد</span>
            </button>
          ) : null}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
          <input
            type="text"
            placeholder="بحث برقم السند أو اسم المستأجر..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pr-9 pl-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {/* Status Segmented Control */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg w-full sm:w-auto">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-md font-bold transition-colors ${
              statusFilter === 'ALL'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            الكل ({payments.length})
          </button>
          <button
            onClick={() => setStatusFilter('POSTED')}
            className={`px-3 py-1.5 rounded-md font-bold transition-colors ${
              statusFilter === 'POSTED'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            المرحلة ({payments.filter(p => p.status === 'POSTED').length})
          </button>
          <button
            onClick={() => setStatusFilter('REVERSED')}
            className={`px-3 py-1.5 rounded-md font-bold transition-colors ${
              statusFilter === 'REVERSED'
                ? 'bg-white text-rose-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            المعكوسة / الملغاة ({payments.filter(p => p.status === 'REVERSED').length})
          </button>
        </div>

      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3.5">رقم السند</th>
                <th className="p-3.5">تاريخ القبض</th>
                <th className="p-3.5">المستأجر</th>
                <th className="p-3.5">العقار والوحدة</th>
                <th className="p-3.5">المبلغ</th>
                <th className="p-3.5">طريقة الدفع</th>
                <th className="p-3.5">المحصل</th>
                <th className="p-3.5">الحالة المحاسبية</th>
                <th className="p-3.5 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    لا توجد سندات قبض مطابقة لشروط البحث
                  </td>
                </tr>
              ) : (
                filteredPayments.map(pay => {
                  const tenant = tenants.find(t => t.id === pay.tenantId);
                  const prop = properties.find(p => p.id === pay.propertyId);

                  return (
                    <tr
                      key={pay.id}
                      className={`hover:bg-slate-50 transition-colors ${
                        pay.status === 'REVERSED' ? 'bg-rose-50/30' : ''
                      }`}
                    >
                      <td className="p-3.5 font-mono font-bold text-slate-900">
                        {pay.receiptNumber}
                      </td>
                      <td className="p-3.5 font-mono text-slate-600">
                        {pay.paymentDate}
                      </td>
                      <td className="p-3.5 font-bold text-slate-800">
                        {tenant?.name || '---'}
                      </td>
                      <td className="p-3.5 text-slate-600">
                        {prop?.name || '---'}
                      </td>
                      <td className="p-3.5 font-mono font-bold text-emerald-700 text-sm">
                        {formatCurrency(pay.amount)}
                      </td>
                      <td className="p-3.5">
                        {getMethodBadge(pay.paymentMethod)}
                      </td>
                      <td className="p-3.5 text-slate-600">
                        {pay.receivedBy}
                      </td>
                      <td className="p-3.5">
                        {pay.status === 'POSTED' ? (
                          <Badge variant="emerald" size="sm">مرحل بالقيد</Badge>
                        ) : (
                          <Badge variant="rose" size="sm">معكوس وملغى</Badge>
                        )}
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => onViewReceipt(pay)}
                            className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors"
                            title="معاينة وطباعة سند القبض"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {pay.status === 'POSTED' && (
                            <button
                              onClick={() => {
                                setReversalTarget(pay);
                                setActionError('');
                                setReversalReason('');
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                              title="عكس وإلغاء سند القبض (صلاحيات المحاسب)"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          )}
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

      {/* Reversal Confirmation Modal */}
      {reversalTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-2.5 text-rose-600">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="text-base font-bold text-slate-900">
                تأكيد عكس وإلغاء سند القبض
              </h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              أنت على وشك إلغاء السند <strong>{reversalTarget.receiptNumber}</strong> بمبلغ{' '}
              <strong>{formatCurrency(reversalTarget.amount)}</strong>. سيتم إنشاء قيد عكسي متوازن في دفتر اليومية، واسترجاع مديونية المستأجر والفواتير، وتسجيل مسار تدقيق معتمد.
            </p>

            {actionError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
                {actionError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                سبب الإلغاء والعكس (إلزامي لأغراض التدقيق المحاسبي) <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={reversalReason}
                onChange={e => setReversalReason(e.target.value)}
                placeholder="مثال: خطأ في إيداع الحساب البنكي، أو تسوية شيك مرتجع..."
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 focus:ring-1 focus:ring-rose-500 h-20"
                required
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                onClick={() => setReversalTarget(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-4 py-2 rounded-lg"
              >
                تراجع
              </button>
              <button
                onClick={handleConfirmReversal}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                <span>تنفيذ العكس المحاسبي</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
