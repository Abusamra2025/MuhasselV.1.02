// تصميم م. أبو أحمد — مصمم ومنفذ Claude — © الحقوق محفوظة
import React from 'react';
import { X, Printer, CheckCircle2, Building, ShieldCheck, QrCode } from 'lucide-react';
import { Payment } from '../../types';
import { useStore } from '../../lib/store';
import { tafqeet, formatCurrency } from '../../lib/numberToArabicWords';

interface OfficialReceiptModalProps {
  payment: Payment | null;
  onClose: () => void;
}

export const OfficialReceiptModal: React.FC<OfficialReceiptModalProps> = ({
  payment,
  onClose
}) => {
  const { tenants, properties, units, invoices, accounts } = useStore();

  if (!payment) return null;

  const tenant = tenants.find(t => t.id === payment.tenantId);
  const property = properties.find(p => p.id === payment.propertyId);
  const unit = units.find(u => u.id === payment.unitId);
  const destAccount = accounts.find(a => a.code === payment.destinationAccountCode);

  const tafqeetText = tafqeet(payment.amount);

  const handlePrint = () => {
    window.print();
  };

  const getMethodArabic = (method: string) => {
    switch (method) {
      case 'CASH':
        return 'نقداً بالخزينة';
      case 'BANK_TRANSFER':
        return 'تحويل بنكي مباشر';
      case 'CHEQUE':
        return 'شيك بنكي مصدق';
      case 'POS':
        return 'بطاقة مدى / نقاط بيع';
      default:
        return method;
    }
  };

  const getPurposeArabic = (purpose: string) => {
    switch (purpose) {
      case 'RENT_INVOICE':
        return 'سداد قسط إيجار دوري';
      case 'SECURITY_DEPOSIT':
        return 'تأمين ضمان مستأجر مسترد (أمانات)';
      case 'ADVANCE_RENT':
        return 'دفعة إيجار مقدمة (إيراد غير مكتسب)';
      default:
        return 'سداد مستحقات';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      
      {/* Modal Container */}
      <div className="bg-white rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl border border-slate-200">
        
        {/* Action Header (Hidden on print) */}
        <div className="no-print bg-slate-800 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold">معاينة وطباعة سند القبض المالي الرسمي</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة السند (A4)</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Official Receipt Body */}
        <div className="p-8 print-card bg-white text-slate-900" id="official-receipt">
          
          {/* Header & Logo */}
          <div className="border-b-2 border-slate-900 pb-5 mb-6 flex items-start justify-between">
            <div className="space-y-1">
              <h2 className="text-xl font-black tracking-tight text-slate-900">
                شركة المحصل لإدارة الأملاك العقارية
              </h2>
              <p className="text-xs text-slate-600">
                إدارة الأملاك والاستثمارات والتطوير العقاري
              </p>
              <p className="text-xs text-slate-500 font-mono">
                سجل تجاري: 1010839281 · الرقم الضريبي: 300928374600003
              </p>
            </div>

            <div className="text-left font-mono">
              <div className="inline-block bg-slate-100 border border-slate-300 rounded-lg p-2 text-center min-w-44">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-sans font-bold">
                  سند قبض رسمي
                </p>
                <p className="text-base font-black text-slate-900 tracking-wider">
                  {payment.receiptNumber}
                </p>
                <p className="text-xs text-slate-600 mt-0.5 font-sans">
                  التاريخ: {payment.paymentDate}
                </p>
              </div>
            </div>
          </div>

          {/* Amount Badge */}
          <div className="bg-emerald-50/70 border border-emerald-200/90 rounded-xl p-4 mb-6 flex items-center justify-between">
            <div>
              <p className="text-xs text-emerald-800 font-semibold mb-0.5">المبلغ المستلم رقماً:</p>
              <p className="text-2xl font-black font-mono text-emerald-700 tracking-tight">
                {formatCurrency(payment.amount)}
              </p>
            </div>
            <div className="text-left">
              <span className="inline-flex items-center gap-1 bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded-md">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>سند قبض مرحل ومعتمد</span>
              </span>
            </div>
          </div>

          {/* Tafqeet Arabic Words */}
          <div className="bg-slate-50 rounded-lg p-3.5 border border-slate-200 mb-6">
            <span className="text-xs font-bold text-slate-500 block mb-1">المبلغ كتابة وفقط:</span>
            <p className="text-sm font-bold text-slate-900 leading-relaxed font-serif">
              « {tafqeetText} »
            </p>
          </div>

          {/* Data Grid */}
          <div className="grid grid-cols-2 gap-4 text-xs mb-6 border border-slate-200 rounded-xl p-4 bg-white">
            <div>
              <span className="text-slate-500 block font-medium">استلمنا من السيد / السادة:</span>
              <p className="text-sm font-bold text-slate-900 mt-0.5">{tenant?.name || '---'}</p>
              <p className="text-slate-500 font-mono mt-0.5">الهوية / الإقامة: {tenant?.nationalId || '---'}</p>
              <p className="text-slate-500 font-mono mt-0.5">الجوال: {tenant?.phone || '---'}</p>
            </div>

            <div>
              <span className="text-slate-500 block font-medium">بيان العقار والوحدة:</span>
              <p className="text-sm font-bold text-slate-900 mt-0.5">{property?.name || '---'}</p>
              <p className="text-slate-600 mt-0.5">الوحدة: {unit?.unitNumber || '---'} ({property?.city})</p>
              <p className="text-slate-500 mt-0.5">الغرض: {getPurposeArabic(payment.purpose)}</p>
            </div>

            <div className="pt-3 border-t border-slate-100">
              <span className="text-slate-500 block font-medium">طريقة السداد:</span>
              <p className="text-xs font-bold text-slate-800 mt-0.5">{getMethodArabic(payment.paymentMethod)}</p>
              {payment.bankReference && (
                <p className="text-slate-500 font-mono mt-0.5">المرجع البنكي: {payment.bankReference}</p>
              )}
              {payment.checkNumber && (
                <p className="text-slate-500 font-mono mt-0.5">رقم الشيك: {payment.checkNumber}</p>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100">
              <span className="text-slate-500 block font-medium">الحساب المودع فيه:</span>
              <p className="text-xs font-bold text-slate-800 mt-0.5">{destAccount?.nameAr || 'البنك / الصندوق'}</p>
              <p className="text-slate-500 font-mono mt-0.5">كود الحساب: {payment.destinationAccountCode}</p>
            </div>
          </div>

          {/* Allocations breakdown if available */}
          {payment.allocations && payment.allocations.length > 0 && (
            <div className="mb-6">
              <h4 className="text-xs font-bold text-slate-700 mb-2">تسوية وتخصيص الفواتير المربوطة:</h4>
              <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
                <table className="w-full text-right">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-2">رقم الفاتورة</th>
                      <th className="p-2">المبلغ المخصص</th>
                      <th className="p-2">تاريخ الاستحقاق</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payment.allocations.map((alloc, i) => {
                      const inv = invoices.find(invItem => invItem.id === alloc.invoiceId);
                      return (
                        <tr key={i}>
                          <td className="p-2 font-mono font-bold">{inv?.invoiceNumber || alloc.invoiceId}</td>
                          <td className="p-2 font-mono text-emerald-700 font-bold">{formatCurrency(alloc.amount)}</td>
                          <td className="p-2 text-slate-500">{inv?.dueDate || '---'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Notes */}
          {payment.notes && (
            <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200 mb-6">
              <span className="font-bold text-slate-700">ملاحظات وبيان إضافي: </span>
              {payment.notes}
            </div>
          )}

          {/* Signatures & Stamps Footer */}
          <div className="pt-6 border-t-2 border-slate-900 grid grid-cols-3 gap-6 text-center text-xs">
            <div>
              <p className="font-bold text-slate-700 mb-8">المحصل / أمين الصندوق</p>
              <p className="font-semibold text-slate-900 border-t border-dashed border-slate-300 pt-1">
                {payment.receivedBy || 'فيصل الشمري'}
              </p>
            </div>

            <div className="flex flex-col items-center justify-center">
              <div className="w-20 h-20 rounded-full border-2 border-emerald-600 border-dashed flex flex-col items-center justify-center text-[10px] font-bold text-emerald-700 rotate-[-8deg] p-1 shadow-xs">
                <ShieldCheck className="w-5 h-5 text-emerald-600 mb-0.5" />
                <span>معتمد رسمياً</span>
                <span className="font-mono text-[9px]">{payment.receiptNumber}</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">الختم المالي المعتمد</p>
            </div>

            <div>
              <p className="font-bold text-slate-700 mb-8">المحاسب المالي</p>
              <p className="font-semibold text-slate-900 border-t border-dashed border-slate-300 pt-1">
                عبدالله السعدي
              </p>
            </div>
          </div>

          {/* Print Watermark / Compliance note */}
          <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
            <span>سند مالي إلكتروني معتمد صادر من نظام مُحصّل لإدارة وتحصيل الإيجارات</span>
            <span className="font-mono">رمز التدقيق: SHA256-{(payment.id || '').slice(-8)}</span>
          </div>

        </div>

      </div>

    </div>
  );
};
