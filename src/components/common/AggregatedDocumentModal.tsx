// تصميم م. أبو أحمد — مصمم ومنفذ Claude — © الحقوق محفوظة
import React, { useState } from 'react';
import {
  X,
  Printer,
  Download,
  Layers,
  FileText,
  Calendar,
  Building,
  CheckCircle2,
  ExternalLink,
  ChevronLeft,
  ArrowUpRight,
  Receipt,
  CreditCard,
  TrendingDown,
  Boxes
} from 'lucide-react';
import { AggregatedDocument } from '../../types';
import { formatCurrency } from '../../lib/numberToArabicWords';
import { Badge } from './Badge';
import { downloadWorkbook } from '../../lib/exportUtils';
import * as XLSX from 'xlsx';
import { FileSpreadsheet } from 'lucide-react';

interface AggregatedDocumentModalProps {
  document: AggregatedDocument;
  onClose: () => void;
  onSelectSubItem?: (item: AggregatedDocument['subItems'][0]) => void;
}

export const AggregatedDocumentModal: React.FC<AggregatedDocumentModalProps> = ({
  document,
  onClose,
  onSelectSubItem
}) => {
  const [selectedSubItem, setSelectedSubItem] = useState<AggregatedDocument['subItems'][0] | null>(null);

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();
    const titleRows = [
      ['شركة المحصل لإدارة وتشغيل الأملاك العقارية'],
      [`س.ت: 1010582910 · الرقم الضريبي: 300984728100003`],
      [`تفاصيل المستند المجمع والحزمة: ${document.title} (${document.batchNumber})`],
      [`التاريخ: ${document.date} · إجمالي المبلغ: ${document.totalAmount} ر.س · الملاحظات: ${document.referenceNotes}`],
      []
    ];
    const headers = ['الرقم المرجعي', 'التاريخ', 'الطرف / المستفيد', 'البيان والتفاصيل', 'المبلغ (SAR)', 'الحالة'];
    const rows = document.subItems.map(s => [
      s.refNumber,
      s.date,
      s.partyName || '—',
      s.title,
      s.amount,
      s.status || 'معتمد'
    ]);
    const summaryRow = ['المجموع الإجمالي', '', '', '', document.totalAmount, ''];
    const ws = XLSX.utils.aoa_to_sheet([...titleRows, headers, ...rows, summaryRow]);
    ws['!cols'] = [{ wch: 18 }, { wch: 14 }, { wch: 24 }, { wch: 34 }, { wch: 16 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, ws, 'المستند المجمع');
    downloadWorkbook(wb, `حزمة_${document.batchNumber}_${document.date}`);
  };

  const getCategoryBadgeVariant = (cat: AggregatedDocument['category']) => {
    switch (cat) {
      case 'COLLECTIONS': return 'emerald';
      case 'EXPENSES': return 'rose';
      case 'INVOICES': return 'indigo';
      case 'INVENTORY': return 'amber';
      case 'JOURNALS': return 'slate';
      default: return 'slate';
    }
  };

  const getCategoryLabel = (cat: AggregatedDocument['category']) => {
    switch (cat) {
      case 'COLLECTIONS': return 'حزمة مقبوضات وتحصيل';
      case 'EXPENSES': return 'حزمة مصروفات وصيانة';
      case 'INVOICES': return 'حزمة مطالبات وفواتير';
      case 'INVENTORY': return 'حزمة مستودع وعهد';
      case 'JOURNALS': return 'حزمة تسويات وقيود';
      default: return cat;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="no-print bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-xs">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold">تفاصيل المستند المجمع والحزمة التشغيلية</h3>
                <span className="text-[10px] font-mono bg-slate-800 text-indigo-300 border border-indigo-700/50 px-2 py-0.5 rounded">
                  {document.batchNumber}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                استعراض القيود والسندات الفرعية المجمعة مع إمكانية المعاينة والطباعة والتدقيق
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer border border-emerald-500/30"
              title="تصدير جدول عناصر هذه الحزمة إلى ملف Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
              <span>تصدير Excel</span>
            </button>
            <button
              onClick={handlePrint}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              title="طباعة تقرير الحزمة المجمعة"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة المستند المجمع</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body / Printable Container */}
        <div className="p-6 sm:p-8 space-y-6 max-h-[82vh] overflow-y-auto print-card">
          
          {/* Header Summary Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={getCategoryBadgeVariant(document.category)} size="md">
                    {getCategoryLabel(document.category)}
                  </Badge>
                  <span className="text-xs font-bold text-slate-500">·</span>
                  <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>تاريخ الحزمة: {document.date}</span>
                  </span>
                </div>
                <h2 className="text-lg font-black text-slate-900 mt-1">
                  {document.title}
                </h2>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  {document.referenceNotes}
                </p>
              </div>

              {/* Total Card */}
              <div className="bg-white border border-slate-200 rounded-xl p-3.5 sm:text-left min-w-[200px] shadow-2xs">
                <span className="text-[11px] font-semibold text-slate-500 block">إجمالي مبلغ الحزمة المجمعة:</span>
                <span className="text-xl font-black text-slate-900 font-mono text-emerald-800">
                  {formatCurrency(document.totalAmount)}
                </span>
                <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                  <span>عدد المستندات:</span>
                  <span className="font-bold text-slate-800">{document.itemCount} مستندات</span>
                </div>
              </div>
            </div>

            {/* Status & Verification */}
            <div className="mt-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-emerald-800 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>حزمة معتمدة ومطابقة محاسبياً ومقيدة بالدفاتر المركزية</span>
              </div>
              <span className="text-slate-500 font-mono text-[11px]">
                رقم الاعتماد: BATCH-VERIFIED-2026
              </span>
            </div>
          </div>

          {/* Sub Items Interactive Table */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>المستندات والسندات الفرعية المندرجة تحت هذه الحزمة</span>
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                  {document.subItems.length}
                </span>
              </h3>
              <p className="text-xs text-indigo-600 font-semibold hidden sm:block">
                انقر على أي مستند لمعاينة تفاصيله الفردية الكاملة
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3">رقم المستند</th>
                    <th className="p-3">النوع والبيان</th>
                    <th className="p-3">الطرف / العميل / المستفيد</th>
                    <th className="p-3 text-center">التاريخ</th>
                    <th className="p-3 text-left">المبلغ</th>
                    <th className="p-3 text-center">الحالة</th>
                    <th className="p-3 text-center no-print">التفاصيل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {document.subItems.map(item => (
                    <tr
                      key={item.id}
                      onClick={() => {
                        setSelectedSubItem(item);
                        if (onSelectSubItem) onSelectSubItem(item);
                      }}
                      className="hover:bg-indigo-50/50 cursor-pointer transition-colors group"
                    >
                      <td className="p-3 font-mono font-bold text-indigo-700">
                        {item.refNumber}
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-slate-900 group-hover:text-indigo-900">
                          {item.title}
                        </div>
                        <span className="text-[10px] text-slate-500 font-medium bg-slate-100 px-1.5 py-0.5 rounded inline-block mt-0.5">
                          {item.type}
                        </span>
                      </td>
                      <td className="p-3 text-slate-700 font-medium">
                        {item.partyName}
                      </td>
                      <td className="p-3 text-center font-mono text-slate-500 text-[11px]">
                        {item.date}
                      </td>
                      <td className="p-3 text-left font-mono font-bold text-slate-900 text-sm">
                        {formatCurrency(item.amount)}
                      </td>
                      <td className="p-3 text-center">
                        <span className="inline-block bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] px-2 py-0.5 rounded font-semibold">
                          {item.status}
                        </span>
                      </td>
                      <td className="p-3 text-center no-print">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 group-hover:text-indigo-800 bg-indigo-50 px-2 py-1 rounded-md">
                          <span>عرض</span>
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 font-bold text-slate-900 border-t border-slate-200">
                  <tr>
                    <td colSpan={4} className="p-3 text-right">
                      الإجمالي المجمع لكافة السندات المندرجة
                    </td>
                    <td className="p-3 text-left font-mono text-base text-emerald-800">
                      {formatCurrency(document.totalAmount)}
                    </td>
                    <td colSpan={2} className="p-3 text-center text-slate-500 text-[11px]">
                      {document.subItems.length} سندات فرعية
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Sub Item Detailed Inspector Card if clicked */}
          {selectedSubItem && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 animate-in fade-in duration-150">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  <div>
                    <h4 className="text-sm font-bold text-indigo-950">
                      مستند فرعي محدد: {selectedSubItem.title} ({selectedSubItem.refNumber})
                    </h4>
                    <p className="text-xs text-indigo-800 mt-0.5">
                      الطرف: {selectedSubItem.partyName} · المبلغ: {formatCurrency(selectedSubItem.amount)} · التاريخ: {selectedSubItem.date}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedSubItem(null)}
                  className="text-indigo-400 hover:text-indigo-700 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Formal Audit & Signatures Footer on Print */}
          <div className="mt-8 pt-6 border-t border-slate-300 grid grid-cols-3 gap-4 text-center text-xs">
            <div>
              <p className="font-bold text-slate-600 mb-6">مسؤول الإعداد والفرز</p>
              <p className="border-t border-slate-300 pt-1 font-semibold text-slate-800">قسم المحاسبة والعمليات</p>
            </div>
            <div>
              <p className="font-bold text-slate-600 mb-6">المراجعة والتدقيق المالي</p>
              <p className="border-t border-slate-300 pt-1 font-semibold text-slate-800">إدارة الرقابة المالية</p>
            </div>
            <div>
              <p className="font-bold text-slate-600 mb-6">اعتماد المدير العام</p>
              <p className="border-t border-slate-300 pt-1 font-semibold text-slate-800">سليمان الحربي (مشرف رقابي)</p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
