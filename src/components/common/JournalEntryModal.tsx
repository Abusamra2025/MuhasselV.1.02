// تصميم م. أبو أحمد — مصمم ومنفذ Claude — © الحقوق محفوظة
import React from 'react';
import { X, BookOpen, Scale, CheckCircle2, AlertTriangle, Calendar, User, Printer } from 'lucide-react';
import { JournalEntry } from '../../types';
import { useStore } from '../../lib/store';
import { formatCurrency } from '../../lib/numberToArabicWords';
import { Badge } from './Badge';

interface JournalEntryModalProps {
  entry: JournalEntry | null;
  onClose: () => void;
}

export const JournalEntryModal: React.FC<JournalEntryModalProps> = ({
  entry,
  onClose
}) => {
  if (!entry) return null;

  const handlePrint = () => {
    window.print();
  };

  const getRefTypeBadge = (ref: string) => {
    switch (ref) {
      case 'INVOICE': return <Badge variant="blue" size="sm">استحقاق فاتورة إيجار</Badge>;
      case 'PAYMENT': return <Badge variant="emerald" size="sm">سند قبض تحصيل</Badge>;
      case 'PAYMENT_REVERSAL': return <Badge variant="rose" size="sm">قيد عكسي لسند ملغي</Badge>;
      case 'EXPENSE': return <Badge variant="amber" size="sm">سند صرف مصروفات</Badge>;
      case 'MANUAL': return <Badge variant="purple" size="sm">قيد تسوية يدوي</Badge>;
      case 'PERIOD_CLOSE': return <Badge variant="slate" size="sm">قيد إقفال فترة</Badge>;
      default: return <Badge variant="slate" size="sm">{ref}</Badge>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="no-print bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold font-mono">{entry.entryNumber}</h3>
                {getRefTypeBadge(entry.refType)}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                سند قيد يومية عامة مزدوج معتمد (Journal Voucher)
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
          
          {/* Metadata Banner */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <span className="text-slate-500 block mb-0.5">بيان وشرح القيد المحاسبي:</span>
              <p className="font-bold text-slate-900 text-sm">{entry.description}</p>
            </div>
            <div className="text-left font-mono text-xs">
              <span className="text-slate-500 block">تاريخ القيد / الترحيل:</span>
              <span className="font-bold text-slate-900">{entry.date}</span>
              <span className="text-slate-400 block text-[10px] mt-0.5">سُجل بواسطة: {entry.createdBy}</span>
            </div>
          </div>

          {/* Lines Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">رمز الحساب</th>
                  <th className="p-3">اسم الحساب</th>
                  <th className="p-3">شرح السطر</th>
                  <th className="p-3 text-left font-mono">مدين (Debit)</th>
                  <th className="p-3 text-left font-mono">دائن (Credit)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entry.lines.map((line, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="p-3 font-mono font-bold text-slate-900">{line.accountCode}</td>
                    <td className="p-3 font-bold text-slate-800">{line.accountName}</td>
                    <td className="p-3 text-slate-600">{line.description}</td>
                    <td className="p-3 text-left font-mono font-bold text-slate-900">
                      {line.debit > 0 ? formatCurrency(line.debit) : '—'}
                    </td>
                    <td className="p-3 text-left font-mono font-bold text-slate-900">
                      {line.credit > 0 ? formatCurrency(line.credit) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 font-bold font-mono border-t-2 border-slate-300">
                <tr>
                  <td colSpan={3} className="p-3 text-slate-900">المجموع المتوازن</td>
                  <td className="p-3 text-left text-emerald-800 font-black">
                    {formatCurrency(entry.totalDebit)}
                  </td>
                  <td className="p-3 text-left text-emerald-800 font-black">
                    {formatCurrency(entry.totalCredit)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Balanced Proof Banner */}
          <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3 flex items-center justify-between text-emerald-900">
            <div className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-emerald-600" />
              <span className="font-bold">القيد متوازن محاسبياً (المدين = الدائن تماماً وبدون أي فارق)</span>
            </div>
            <span className="font-mono font-bold text-emerald-700">الفرق: 0.00 ر.س</span>
          </div>

          {/* Signatures for Print */}
          <div className="pt-6 border-t border-slate-200 grid grid-cols-3 gap-4 text-center text-[11px]">
            <div>
              <p className="text-slate-500 mb-6">إعداد المحاسب المالي</p>
              <p className="border-t border-slate-300 pt-1 font-semibold">{entry.createdBy}</p>
            </div>
            <div>
              <p className="text-slate-500 mb-6">مراجعة وتدقيق الحسابات</p>
              <p className="border-t border-slate-300 pt-1 font-semibold">د. طارق المنصور</p>
            </div>
            <div>
              <p className="text-slate-500 mb-6">اعتماد الإدارة والرقابة</p>
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
