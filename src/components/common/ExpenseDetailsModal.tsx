// تصميم م. أبو أحمد — مصمم ومنفذ Claude — © الحقوق محفوظة
import React from 'react';
import { X, TrendingDown, Printer, Building, Calendar, DollarSign, BookOpen, UserCheck } from 'lucide-react';
import { PropertyExpense } from '../../types';
import { useStore } from '../../lib/store';
import { formatCurrency, tafqeet } from '../../lib/numberToArabicWords';
import { Badge } from './Badge';

interface ExpenseDetailsModalProps {
  expense: PropertyExpense | null;
  onClose: () => void;
}

export const ExpenseDetailsModal: React.FC<ExpenseDetailsModalProps> = ({
  expense,
  onClose
}) => {
  const { properties, units, accounts, journalEntries } = useStore();

  if (!expense) return null;

  const property = properties.find(p => p.id === expense.propertyId);
  const unit = units.find(u => u.id === expense.unitId);
  const expAccount = accounts.find(a => a.code === expense.expenseAccountCode);
  const payAccount = accounts.find(a => a.code === expense.paymentAccountCode);
  const journalEntry = journalEntries.find(j => j.id === expense.journalEntryId || j.refId === expense.id);

  const handlePrint = () => {
    window.print();
  };

  const getCategoryArabic = (cat: string) => {
    switch (cat) {
      case 'MAINTENANCE': return 'صيانة وترميم';
      case 'UTILITIES': return 'خدمات وكهرباء ومياه';
      case 'CLEANING': return 'نظافة ومرافق';
      case 'SECURITY': return 'أمن وحراسة';
      case 'MANAGEMENT': return 'أتعاب إدارة';
      case 'INSURANCE': return 'تأمين ورخص';
      default: return 'مصاريف تشغيلية أخرى';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="no-print bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600 flex items-center justify-center text-white">
              <TrendingDown className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold font-mono">{expense.voucherNumber}</h3>
                <Badge variant={expense.status === 'POSTED' ? 'emerald' : 'rose'} size="sm">
                  {expense.status === 'POSTED' ? 'سند مرحل ومعتمد' : 'سند ملغي'}
                </Badge>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                سند صرف مالي رسمي لمصروفات العقار
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-xs print-card">
          
          {/* Print Letterhead */}
          <div className="print-only border-b-2 border-slate-900 pb-4 mb-4">
            <h2 className="text-lg font-black text-slate-900">سند صرف مالي رسمي (Payment Voucher)</h2>
            <p className="text-xs text-slate-600">شركة المحصل لإدارة وتشغيل العقارات والأملاك</p>
          </div>

          {/* Amount Box */}
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center justify-between">
            <div>
              <span className="text-rose-700 text-xs block mb-0.5">مبلغ سند الصرف المدفوع</span>
              <p className="text-xl font-black font-mono text-rose-800">
                {formatCurrency(expense.amount)}
              </p>
              <p className="text-[11px] text-rose-700 font-medium mt-1">
                فقط {tafqeet(expense.amount)} لا غير
              </p>
            </div>
            <div className="text-left font-mono text-xs">
              <span className="text-slate-500 block">تاريخ السند:</span>
              <span className="font-bold text-slate-900">{expense.date}</span>
            </div>
          </div>

          {/* Key Info Table */}
          <div className="border border-slate-200 rounded-xl divide-y divide-slate-100">
            <div className="p-3 flex justify-between">
              <span className="text-slate-500">يُصرف إلى السيد / المؤسسة (المستفيد):</span>
              <span className="font-bold text-slate-900">{expense.payee}</span>
            </div>
            <div className="p-3 flex justify-between">
              <span className="text-slate-500">العقار المحمل عليه التكلفة:</span>
              <span className="font-bold text-slate-900">
                {property?.name || '—'} {unit ? `(الوحدة ${unit.unitNumber})` : '(عام لكامل العقار)'}
              </span>
            </div>
            <div className="p-3 flex justify-between">
              <span className="text-slate-500">تصنيف المصروف التشغيلي:</span>
              <span className="font-bold text-slate-800">{getCategoryArabic(expense.category)}</span>
            </div>
            <div className="p-3 flex justify-between">
              <span className="text-slate-500">حساب المصروف (الجانب المدين Dr):</span>
              <span className="font-mono font-bold text-slate-900">
                {expense.expenseAccountCode} — {expAccount?.nameAr || 'مصروفات تشغيلية'}
              </span>
            </div>
            <div className="p-3 flex justify-between">
              <span className="text-slate-500">حساب الدفع / الخزينة (الجانب الدائن Cr):</span>
              <span className="font-mono font-bold text-slate-900">
                {expense.paymentAccountCode} — {payAccount?.nameAr || 'البنك الجاري'}
              </span>
            </div>
            <div className="p-3 flex justify-between">
              <span className="text-slate-500">طريقة الصرف:</span>
              <span className="font-bold text-slate-800">{expense.paymentMethod}</span>
            </div>
            <div className="p-3 flex justify-between">
              <span className="text-slate-500">البيان والشرح التفصيلي:</span>
              <span className="font-medium text-slate-900">{expense.description}</span>
            </div>
          </div>

          {/* Linked Journal Entry */}
          {journalEntry && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-600" />
                <span className="font-bold text-slate-800">
                  قيد اليومية المسجل: <span className="font-mono">{journalEntry.entryNumber}</span>
                </span>
              </div>
              <span className="font-mono text-slate-500">تم الترحيل آلياً إلى دفتر الأستاذ</span>
            </div>
          )}

          {/* Signatures for Print */}
          <div className="pt-6 border-t border-slate-200 grid grid-cols-3 gap-4 text-center text-[11px]">
            <div>
              <p className="text-slate-500 mb-6">المستلم / المستفيد</p>
              <p className="border-t border-slate-300 pt-1 font-semibold">{expense.payee}</p>
            </div>
            <div>
              <p className="text-slate-500 mb-6">إعداد المحاسب المالي</p>
              <p className="border-t border-slate-300 pt-1 font-semibold">{expense.createdBy || 'عبدالله السعدي'}</p>
            </div>
            <div>
              <p className="text-slate-500 mb-6">اعتماد الإدارة والختم</p>
              <p className="border-t border-slate-300 pt-1 font-semibold">سليمان الحربي</p>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="no-print bg-slate-50 p-4 border-t border-slate-200 flex justify-end">
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
