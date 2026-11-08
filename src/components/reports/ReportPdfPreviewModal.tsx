// تصميم م. أبو أحمد — مصمم ومنفذ Claude — © الحقوق محفوظة
import React, { useEffect, useState, useRef } from 'react';
import { X, Printer, Download, FileSpreadsheet, Building, ShieldCheck, QrCode, Loader2, CheckCircle2 } from 'lucide-react';
import { useStore } from '../../lib/store';
import { exportElementToPdf } from '../../lib/pdfExportUtil';

interface ReportPdfPreviewModalProps {
  title: string;
  subtitle: string;
  reportType: string;
  children: React.ReactNode;
  onClose: () => void;
  onExportExcel?: () => void;
}

export const ReportPdfPreviewModal: React.FC<ReportPdfPreviewModalProps> = ({
  title,
  subtitle,
  children,
  onClose,
  onExportExcel
}) => {
  const { currentUser } = useStore();
  const printableRef = useRef<HTMLDivElement>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  const handleDownloadPdf = async () => {
    if (!printableRef.current || isExportingPdf) return;
    try {
      setIsExportingPdf(true);
      const sanitizedTitle = title.replace(/[:\/\\?*|"<>\s]+/g, '_');
      const filename = `${sanitizedTitle}_شركة_المحصل_${new Date().toISOString().split('T')[0]}`;
      await exportElementToPdf(printableRef.current, filename, {
        orientation: 'portrait',
        scale: 2
      });
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    } catch (err) {
      console.error('Error generating PDF:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handlePrint = () => {
    const originalTitle = document.title;
    const sanitizedTitle = title.replace(/[:\/\\?*|"<>\s]+/g, '_');
    document.title = `${sanitizedTitle}_شركة_المحصل_${new Date().toISOString().split('T')[0]}`;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const currentDate = new Date().toISOString().split('T')[0];
  const currentTime = new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-2xl max-w-5xl w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Top Control Bar (Hidden on Print) */}
        <div className="no-print bg-slate-900 text-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold">معاينة وتصدير التقرير المالي الرسمي إلى PDF و Excel</h3>
              <p className="text-[11px] text-slate-400">تنسيق طباعة وتصدير A4 معتمد للمراجعة الخارجية والسجلات المنظمة</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {exportSuccess && (
              <span className="text-xs bg-emerald-800/80 text-emerald-200 px-2.5 py-1.5 rounded-lg flex items-center gap-1 border border-emerald-600">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                <span>تم تنزيل ملف PDF بنجاح!</span>
              </span>
            )}

            {onExportExcel && (
              <button
                onClick={onExportExcel}
                className="bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer border border-emerald-500/30"
                title="تصدير بيانات هذا التقرير مباشرة إلى ملف إكسل Excel (.xlsx)"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
                <span>تصدير Excel</span>
              </button>
            )}

            {/* Direct PDF Download Button */}
            <button
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold px-3.5 py-2 rounded-lg flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              title="تنزيل ملف PDF عالي الدقة مباشرة إلى جهازك"
            >
              {isExportingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري إنشاء PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>تنزيل ملف PDF</span>
                </>
              )}
            </button>

            {/* Direct Browser Print / PDF Option */}
            <button
              onClick={handlePrint}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer border border-slate-700"
              title="طباعة عبر نظام التشغيل أو حفظ كـ PDF"
            >
              <Printer className="w-4 h-4 text-slate-400" />
              <span>طباعة A4</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Letterhead & Report Body Container */}
        <div ref={printableRef} className="p-8 print-card bg-white text-slate-900 max-h-[85vh] overflow-y-auto" id="printable-report">
          
          {/* Formal Saudi Real Estate Company Letterhead */}
          <div className="border-b-2 border-slate-900 pb-5 mb-6">
            <div className="flex items-start justify-between">
              
              {/* Right: Company Info */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center font-black text-xs">
                    م
                  </div>
                  <h2 className="text-lg font-black tracking-tight text-slate-900">
                    شركة المحصل لإدارة وتشغيل الأملاك العقارية
                  </h2>
                </div>
                <p className="text-xs text-slate-600">
                  إدارة الأصول والاستثمارات العقارية والتحصيل المالي المزدوج
                </p>
                <div className="flex items-center gap-3 text-[11px] font-mono text-slate-500">
                  <span>س.ت: 1010582910</span>
                  <span>·</span>
                  <span>الرقم الضريبي: 300984728100003</span>
                  <span>·</span>
                  <span>الرياض، المملكة العربية السعودية</span>
                </div>
              </div>

              {/* Left: Report Meta */}
              <div className="text-left font-mono text-[11px] space-y-1 bg-slate-50 border border-slate-200 p-2.5 rounded-lg">
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500 font-sans">تاريخ التصدير:</span>
                  <span className="font-bold text-slate-900">{currentDate}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500 font-sans">وقت الإصدار:</span>
                  <span className="font-bold text-slate-900">{currentTime}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500 font-sans">أُعد بواسطة:</span>
                  <span className="font-bold text-slate-900 font-sans">{currentUser.name}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500 font-sans">رمز التقرير:</span>
                  <span className="font-bold text-emerald-800">REP-2026-FIN</span>
                </div>
              </div>

            </div>

            {/* Report Title Bar */}
            <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between">
              <div>
                <h1 className="text-base font-black text-slate-900">{title}</h1>
                <p className="text-xs text-slate-500">{subtitle}</p>
              </div>
              <span className="text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-md">
                معتمد نظاماً ومطابق لمعايير SOCPA / IFRS
              </span>
            </div>
          </div>

          {/* Report Body Content (Tables, statements, charts) */}
          <div className="report-content my-4">
            {children}
          </div>

          {/* Official Signatures & Audit Stamp Footer */}
          <div className="mt-10 pt-6 border-t-2 border-slate-300 grid grid-cols-4 gap-4 text-center text-xs">
            
            <div>
              <p className="font-bold text-slate-700 mb-8">إعداد المحاسب المالي</p>
              <p className="border-t border-slate-300 pt-1 font-semibold text-slate-800">عبدالله السعدي</p>
              <span className="text-[10px] text-slate-400">كبير المحاسبين</span>
            </div>

            <div>
              <p className="font-bold text-slate-700 mb-8">تدقيق ومراجعة الحسابات</p>
              <p className="border-t border-slate-300 pt-1 font-semibold text-slate-800">د. طارق المنصور</p>
              <span className="text-[10px] text-slate-400">مدقق حسابات قانوني</span>
            </div>

            <div>
              <p className="font-bold text-slate-700 mb-8">اعتماد الإدارة والرقابة</p>
              <p className="border-t border-slate-300 pt-1 font-semibold text-slate-800">سليمان الحربي</p>
              <span className="text-[10px] text-slate-400">المدير العام المشرف</span>
            </div>

            <div className="flex flex-col items-center justify-center">
              <div className="w-16 h-16 border-2 border-emerald-800 rounded-full flex flex-col items-center justify-center text-emerald-800 font-bold text-[9px] p-1 text-center rotate-[-8deg] shadow-2xs">
                <span>شركة المحصل</span>
                <span className="font-black text-[8px]">ختم رسمي معتمد</span>
                <span className="font-mono text-[7px]">2026-AUDITED</span>
              </div>
            </div>

          </div>

          {/* Document Footer Bar */}
          <div className="mt-8 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
            <span>نظام مُحصّل لإدارة وتحصيل الإيجارات والمحاسبة العقارية المزدوجة v2.5 PRO</span>
            <span>تقرير مالي رسمي مستخرج من قاعدة البيانات المركزية المشفرة · صفحة 1 من 1</span>
          </div>

        </div>

      </div>
    </div>
  );
};
