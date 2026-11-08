// تصميم م. أبو أحمد — مصمم ومنفذ Claude — © الحقوق محفوظة
import React from 'react';
import { X, Receipt, Building, Calendar, DollarSign, CheckCircle2, AlertCircle, BookOpen, Printer, Crown, Eye } from 'lucide-react';
import { Invoice, Payment } from '../../types';
import { useStore } from '../../lib/store';
import { formatCurrency, tafqeet } from '../../lib/numberToArabicWords';
import { Badge } from './Badge';

interface InvoiceDetailsModalProps {
  invoice: Invoice | null;
  onClose: () => void;
  onViewPayment?: (payment: Payment) => void;
}

export const InvoiceDetailsModal: React.FC<InvoiceDetailsModalProps> = ({
  invoice,
  onClose,
  onViewPayment
}) => {
  const { tenants, properties, units, contracts, payments, journalEntries, currentUser } = useStore();

  if (!invoice) return null;

  const tenant = tenants.find(t => t.id === invoice.tenantId);
  const property = properties.find(p => p.id === invoice.propertyId);
  const unit = units.find(u => u.id === invoice.unitId);
  const contract = contracts.find(c => c.id === invoice.contractId);
  const journalEntry = journalEntries.find(j => j.id === invoice.journalEntryId || j.refId === invoice.id);

  // Find payments allocated to this invoice
  const relatedPayments = payments.filter(p =>
    p.status === 'POSTED' && p.allocations?.some(a => a.invoiceId === invoice.id)
  );

  const getStatusBadge = () => {
    switch (invoice.status) {
      case 'PAID':
        return <Badge variant="emerald" size="sm">مسددة بالكامل</Badge>;
      case 'PARTIAL':
        return <Badge variant="amber" size="sm">مسددة جزئياً</Badge>;
      case 'OVERDUE':
        return <Badge variant="rose" size="sm">متأخرة عن موعدها</Badge>;
      default:
        return <Badge variant="slate" size="sm">مستحقة غير مسددة</Badge>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold font-mono">{invoice.invoiceNumber}</h3>
                {getStatusBadge()}
                {currentUser?.role === 'ADMIN' && (
                  <span className="bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Crown className="w-3 h-3 text-rose-400" />
                    <span>تفاصيل المستند (قراءة وتدقيق للمدير العام)</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                فاتورة استحقاق إيجار دوري رسمية · معاينة رقابية شاملة
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-xs">
          
          {/* Summary Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-3 gap-4 text-center">
            <div>
              <span className="text-slate-500 block mb-1">إجمالي الفاتورة</span>
              <p className="text-lg font-black font-mono text-slate-900">
                {formatCurrency(invoice.amount)}
              </p>
            </div>
            <div>
              <span className="text-slate-500 block mb-1">المسدد حتى الآن</span>
              <p className="text-lg font-black font-mono text-emerald-700">
                {formatCurrency(invoice.paidAmount)}
              </p>
            </div>
            <div>
              <span className="text-slate-500 block mb-1">المتبقي المطلوب</span>
              <p className={`text-lg font-black font-mono ${invoice.balance > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                {formatCurrency(invoice.balance)}
              </p>
            </div>
          </div>

          {/* Details Table */}
          <div className="border border-slate-200 rounded-xl divide-y divide-slate-100">
            <div className="p-3 flex justify-between">
              <span className="text-slate-500">اسم المستأجر:</span>
              <span className="font-bold text-slate-900">{tenant?.name || '—'}</span>
            </div>
            <div className="p-3 flex justify-between">
              <span className="text-slate-500">العقار والوحدة:</span>
              <span className="font-bold text-slate-900">
                {property?.name} · وحدة {unit?.unitNumber}
              </span>
            </div>
            <div className="p-3 flex justify-between">
              <span className="text-slate-500">رقم العقد المرتبط:</span>
              <span className="font-mono font-bold text-slate-800">{contract?.contractNumber || '—'}</span>
            </div>
            <div className="p-3 flex justify-between">
              <span className="text-slate-500">فترة الاستحقاق:</span>
              <span className="font-mono text-slate-800">
                من {invoice.periodStart} إلى {invoice.periodEnd}
              </span>
            </div>
            <div className="p-3 flex justify-between">
              <span className="text-slate-500">تاريخ الاستحقاق (Due Date):</span>
              <span className="font-mono font-bold text-slate-900">{invoice.dueDate}</span>
            </div>
            <div className="p-3 flex justify-between">
              <span className="text-slate-500">المبلغ كتابة:</span>
              <span className="font-medium text-emerald-800">{tafqeet(invoice.amount)}</span>
            </div>
          </div>

          {/* Linked Journal Entry */}
          {journalEntry && (
            <div className="bg-indigo-50/60 border border-indigo-200 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                <div>
                  <span className="font-bold text-indigo-900">القيد المحاسبي المرتبط:</span>
                  <span className="font-mono font-bold text-indigo-800 mr-1.5">{journalEntry.entryNumber}</span>
                </div>
              </div>
              <span className="font-mono text-xs text-indigo-700">تاريخ الترحيل: {journalEntry.postingDate}</span>
            </div>
          )}

          {/* Related Payments */}
          <div>
            <h4 className="font-bold text-slate-900 mb-2">سندات القبض المسددة لهذه الفاتورة:</h4>
            {relatedPayments.length === 0 ? (
              <p className="text-slate-400 bg-slate-50 p-3 rounded-lg text-center">
                لم يتم تسجيل أي سندات سداد على هذه الفاتورة حتى الآن
              </p>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-100 font-bold text-slate-700">
                    <tr>
                      <th className="p-2.5">رقم السند</th>
                      <th className="p-2.5">تاريخ التحصيل</th>
                      <th className="p-2.5">طريقة الدفع</th>
                      <th className="p-2.5 text-left font-mono">المبلغ المخصص</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {relatedPayments.map(p => {
                      const alloc = p.allocations?.find(a => a.invoiceId === invoice.id);
                      return (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="p-2.5 font-mono font-bold text-slate-900">{p.receiptNumber}</td>
                          <td className="p-2.5 font-mono text-slate-600">{p.paymentDate}</td>
                          <td className="p-2.5"><Badge variant="slate" size="sm">{p.paymentMethod}</Badge></td>
                          <td className="p-2.5 text-left font-mono font-bold text-emerald-700">
                            {formatCurrency(alloc?.amount || p.amount)}
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

        {/* Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs px-5 py-2 rounded-lg transition-colors cursor-pointer"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
};
