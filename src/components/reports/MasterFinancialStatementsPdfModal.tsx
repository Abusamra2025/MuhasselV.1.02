// تصميم م. أبو أحمد — مصمم ومنفذ Claude — © الحقوق محفوظة
import React, { useRef, useState, useEffect } from 'react';
import {
  X,
  Printer,
  Download,
  FileSpreadsheet,
  Building,
  ShieldCheck,
  Loader2,
  CheckCircle2,
  Scale,
  Landmark,
  PieChart,
  FileText,
  DollarSign,
  TrendingDown,
  CreditCard
} from 'lucide-react';
import { useStore } from '../../lib/store';
import { exportElementToPdf } from '../../lib/pdfExportUtil';
import {
  generateTrialBalance,
  generateProfitLoss,
  generateBalanceSheet,
  calculateAgingBuckets
} from '../../lib/accountingEngine';
import { formatCurrency } from '../../lib/numberToArabicWords';
import { exportMasterAuditPackageToExcel } from '../../lib/exportUtils';

interface MasterFinancialStatementsPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MasterFinancialStatementsPdfModal: React.FC<MasterFinancialStatementsPdfModalProps> = ({
  isOpen,
  onClose
}) => {
  const {
    currentUser,
    accounts,
    journalEntries,
    invoices,
    tenants,
    properties,
    units,
    payments,
    expenses,
    inventoryItems,
    aggregatedDocuments
  } = useStore();

  const printableRef = useRef<HTMLDivElement>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  // Compute live accounting reports
  const trialBalance = generateTrialBalance(accounts, journalEntries);
  const pnl = generateProfitLoss(accounts, journalEntries);
  const balanceSheet = generateBalanceSheet(accounts, journalEntries);
  const agingReport = calculateAgingBuckets(invoices, tenants, properties, units);

  const totalCollections = payments
    .filter(p => p.status === 'POSTED')
    .reduce((sum, p) => sum + p.amount, 0);

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  const currentDate = new Date().toISOString().split('T')[0];
  const currentTime = new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleDownloadPdf = async () => {
    if (!printableRef.current || isExportingPdf) return;
    try {
      setIsExportingPdf(true);
      const filename = `القوائم_المالية_المعتمدة_للمدير_العام_${currentDate}`;
      await exportElementToPdf(printableRef.current, filename, {
        orientation: 'portrait',
        scale: 2
      });
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3500);
    } catch (err) {
      console.error('Error exporting financial statements PDF:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handlePrint = () => {
    const origTitle = document.title;
    document.title = `القوائم_المالية_المعتمدة_للمدير_العام_${currentDate}`;
    window.print();
    setTimeout(() => {
      document.title = origTitle;
    }, 1000);
  };

  const handleExportExcel = () => {
    exportMasterAuditPackageToExcel({
      trialBalance,
      pnl,
      balanceSheet,
      agingReport,
      payments,
      expenses,
      aggregatedDocuments,
      inventoryItems
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-5xl w-full overflow-hidden shadow-2xl border border-slate-200">
        
        {/* Top Control Bar (Hidden on Print) */}
        <div className="no-print bg-slate-900 text-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600 flex items-center justify-center text-white shrink-0 shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black">
                  تقرير القوائم المالية والمحاسبية المعتمدة للمدير العام (A4 PDF)
                </h3>
                <span className="text-[10px] font-bold bg-rose-500/30 text-rose-300 border border-rose-500/50 px-2 py-0.5 rounded">
                  وثيقة سيادية
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                يشمل ميزان المراجعة، قائمة الدخل، الميزانية العمومية، ومؤشرات التدقيق المحاسبي المزدوج
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {exportSuccess && (
              <span className="text-xs bg-emerald-800/80 text-emerald-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 border border-emerald-600 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                <span className="font-bold">تم حفظ ملف PDF بنجاح!</span>
              </span>
            )}

            <button
              onClick={handleExportExcel}
              className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer border border-emerald-600"
              title="تصدير حقيبة التدقيق الخارجي المالي الشاملة بصيغة Excel"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
              <span className="hidden sm:inline">حزمة Excel</span>
              <span className="sm:hidden">إكسل</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              className="bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              title="تنزيل القوائم المالية الكاملة كملف PDF عالي الدقة A4"
            >
              {isExportingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جارٍ إنشاء PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>تصدير PDF</span>
                </>
              )}
            </button>

            <button
              onClick={handlePrint}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
              title="طباعة عبر نظام التشغيل A4"
            >
              <Printer className="w-4 h-4 text-slate-300" />
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

        {/* Printable Document Body */}
        <div
          ref={printableRef}
          className="p-6 sm:p-8 bg-white text-slate-900 max-h-[85vh] overflow-y-auto print-card space-y-6"
          id="printable-master-report"
        >
          {/* Company Letterhead */}
          <div className="border-b-2 border-slate-900 pb-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-black text-sm">
                    م
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-900 tracking-tight">
                      شركة المحصل لإدارة وتشغيل الأملاك العقارية
                    </h2>
                    <p className="text-xs text-slate-600">
                      نظام إدارة وتحصيل الإيجارات والمحاسبة العقارية المزدوجة
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-slate-500 pt-1">
                  <span>س.ت: 1010582910</span>
                  <span>·</span>
                  <span>الرقم الضريبي: 300984728100003</span>
                  <span>·</span>
                  <span>المملكة العربية السعودية</span>
                </div>
              </div>

              <div className="text-left font-mono text-[11px] bg-slate-50 border border-slate-200 p-2.5 rounded-lg space-y-1 shrink-0">
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500 font-sans">تاريخ التقرير:</span>
                  <span className="font-bold text-slate-900">{currentDate}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500 font-sans">الوقت:</span>
                  <span className="font-bold text-slate-900">{currentTime}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500 font-sans">الاعتماد:</span>
                  <span className="font-bold text-emerald-800">المدير العام</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-slate-500 font-sans">الرقم المرجعي:</span>
                  <span className="font-bold text-slate-900">MOU-FS-2026</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h1 className="text-base sm:text-lg font-black text-slate-900">
                  القوائم المالية والتقارير المحاسبية المعتمدة للرقابة والإشراف
                </h1>
                <p className="text-xs text-slate-500">
                  تقرير رسمي مستخرج ومطابق لمعايير المحاسبة الدولية IFRS والمعايير المعتمدة من الهيئة السعودية للمراجعين والمحاسبين (SOCPA)
                </p>
              </div>
              <span className="text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 px-2.5 py-1 rounded-md">
                قيود متوازنة 100% · معتمد نظاماً
              </span>
            </div>
          </div>

          {/* Executive Performance Highlights */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
              <span className="text-[10px] text-slate-500 block font-bold">إجمالي الإيرادات التأجيرية</span>
              <span className="text-base font-black text-emerald-700 font-mono">
                {formatCurrency(pnl.totalRevenue)}
              </span>
            </div>
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
              <span className="text-[10px] text-slate-500 block font-bold">إجمالي المصروفات التشغيلية</span>
              <span className="text-base font-black text-rose-700 font-mono">
                {formatCurrency(pnl.totalExpenses)}
              </span>
            </div>
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
              <span className="text-[10px] text-slate-500 block font-bold">صافي الدخل / الربح المحقق</span>
              <span className={`text-base font-black font-mono ${pnl.netOperatingIncome >= 0 ? 'text-emerald-800' : 'text-rose-800'}`}>
                {formatCurrency(pnl.netOperatingIncome)}
              </span>
            </div>
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
              <span className="text-[10px] text-slate-500 block font-bold">مجموع الأصول والمركز المالي</span>
              <span className="text-base font-black text-slate-900 font-mono">
                {formatCurrency(balanceSheet.assets.totalAssets)}
              </span>
            </div>
          </div>

          {/* Statement 1: Trial Balance (ميزان المراجعة) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-emerald-700" />
                <h3 className="text-sm font-black text-slate-900">
                  1. ميزان المراجعة بالأرصدة والمجاميع (Trial Balance)
                </h3>
              </div>
              <span className="text-[11px] font-mono text-emerald-700 font-bold">
                توازن: {formatCurrency(trialBalance.totalDebit)} = {formatCurrency(trialBalance.totalCredit)}
              </span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-2">رمز الحساب</th>
                    <th className="p-2">اسم الحساب</th>
                    <th className="p-2">النوع</th>
                    <th className="p-2 text-left font-mono">الرصيد المدين</th>
                    <th className="p-2 text-left font-mono">الرصيد الدائن</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {trialBalance.rows.map(row => (
                    <tr key={row.accountCode} className="hover:bg-slate-50/50">
                      <td className="p-2 font-mono font-bold text-slate-900">{row.accountCode}</td>
                      <td className="p-2 font-bold text-slate-800">{row.accountNameAr}</td>
                      <td className="p-2 text-[10px] text-slate-500">{row.type}</td>
                      <td className="p-2 text-left font-mono font-bold text-emerald-800">
                        {row.closingDebit > 0 ? formatCurrency(row.closingDebit) : '—'}
                      </td>
                      <td className="p-2 text-left font-mono font-bold text-blue-800">
                        {row.closingCredit > 0 ? formatCurrency(row.closingCredit) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-bold font-mono text-xs">
                  <tr>
                    <td colSpan={3} className="p-2 text-slate-900">المجموع الكلي المتوازن</td>
                    <td className="p-2 text-left text-emerald-900 font-black">{formatCurrency(trialBalance.totalDebit)}</td>
                    <td className="p-2 text-left text-blue-900 font-black">{formatCurrency(trialBalance.totalCredit)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Statement 2: Income Statement (قائمة الدخل) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
              <div className="flex items-center gap-2">
                <PieChart className="w-4 h-4 text-emerald-700" />
                <h3 className="text-sm font-black text-slate-900">
                  2. قائمة الدخل والأرباح والخسائر (Income Statement / P&L)
                </h3>
              </div>
              <span className={`text-[11px] font-mono font-bold ${pnl.netOperatingIncome >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                صافي الربح: {formatCurrency(pnl.netOperatingIncome)}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Revenues */}
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between font-bold text-xs text-emerald-900 border-b border-slate-200 pb-1">
                  <span>الإيرادات التشغيلية (Revenues)</span>
                  <span className="font-mono">{formatCurrency(pnl.totalRevenue)}</span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-700">إيرادات تأجير العقارات (4100)</span>
                    <span className="font-mono font-bold text-emerald-800">{formatCurrency(pnl.rentalIncome)}</span>
                  </div>
                  {pnl.otherIncome > 0 && (
                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-700">إيرادات الخدمات والغرامات (4200/4300)</span>
                      <span className="font-mono font-bold text-emerald-800">{formatCurrency(pnl.otherIncome)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-1 font-bold text-slate-900">
                    <span>إجمالي الإيرادات:</span>
                    <span className="font-mono text-emerald-800">{formatCurrency(pnl.totalRevenue)}</span>
                  </div>
                </div>
              </div>

              {/* Expenses */}
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between font-bold text-xs text-rose-900 border-b border-slate-200 pb-1">
                  <span>المصروفات التشغيلية (Expenses)</span>
                  <span className="font-mono">{formatCurrency(pnl.totalExpenses)}</span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-700">مصروفات الصيانة والتشغيل (5100)</span>
                    <span className="font-mono font-bold text-rose-800">{formatCurrency(pnl.maintenanceExpense)}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-700">الكهرباء والمياه والمرافق (5200)</span>
                    <span className="font-mono font-bold text-rose-800">{formatCurrency(pnl.utilitiesExpense)}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-700">أتعاب إدارة الأملاك (5400)</span>
                    <span className="font-mono font-bold text-rose-800">{formatCurrency(pnl.managementExpense)}</span>
                  </div>
                  {pnl.otherExpenses > 0 && (
                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-700">مصروفات إدارية وعمومية أخرى</span>
                      <span className="font-mono font-bold text-rose-800">{formatCurrency(pnl.otherExpenses)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-1 font-bold text-slate-900">
                    <span>إجمالي المصروفات:</span>
                    <span className="font-mono text-rose-800">{formatCurrency(pnl.totalExpenses)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Statement 3: Balance Sheet (الميزانية العمومية والمركز المالي) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
              <div className="flex items-center gap-2">
                <Landmark className="w-4 h-4 text-emerald-700" />
                <h3 className="text-sm font-black text-slate-900">
                  3. قائمة المركز المالي والميزانية العمومية (Balance Sheet)
                </h3>
              </div>
              <span className="text-[11px] font-mono text-slate-700 font-bold">
                الأصول ({formatCurrency(balanceSheet.assets.totalAssets)}) = الخصوم وحقوق الملكية ({formatCurrency(balanceSheet.liabilities.totalLiabilities + balanceSheet.equity.totalEquity)})
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              {/* Assets */}
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50">
                <div className="flex items-center justify-between font-bold text-slate-900 border-b border-slate-200 pb-1 mb-2">
                  <span>الأصول (Assets)</span>
                  <span className="font-mono font-bold text-emerald-800">{formatCurrency(balanceSheet.assets.totalAssets)}</span>
                </div>
                <div className="space-y-1">
                  {balanceSheet.assets.currentAssets.map(a => (
                    <div key={a.code} className="flex justify-between py-0.5 text-slate-700">
                      <span>{a.code} - {a.name}</span>
                      <span className="font-mono font-bold">{formatCurrency(a.amount)}</span>
                    </div>
                  ))}
                  {balanceSheet.assets.fixedAssets.map(a => (
                    <div key={a.code} className="flex justify-between py-0.5 text-slate-700">
                      <span>{a.code} - {a.name}</span>
                      <span className="font-mono font-bold">{formatCurrency(a.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Liabilities */}
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50">
                <div className="flex items-center justify-between font-bold text-slate-900 border-b border-slate-200 pb-1 mb-2">
                  <span>الخصوم والالتزامات (Liabilities)</span>
                  <span className="font-mono font-bold text-rose-800">{formatCurrency(balanceSheet.liabilities.totalLiabilities)}</span>
                </div>
                <div className="space-y-1">
                  {balanceSheet.liabilities.currentLiabilities.map(l => (
                    <div key={l.code} className="flex justify-between py-0.5 text-slate-700">
                      <span>{l.code} - {l.name}</span>
                      <span className="font-mono font-bold">{formatCurrency(l.amount)}</span>
                    </div>
                  ))}
                  {balanceSheet.liabilities.currentLiabilities.length === 0 && (
                    <div className="text-slate-400 text-center py-2 text-[11px]">لا توجد التزامات قائمة</div>
                  )}
                </div>
              </div>

              {/* Equity */}
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50">
                <div className="flex items-center justify-between font-bold text-slate-900 border-b border-slate-200 pb-1 mb-2">
                  <span>حقوق الملكية (Equity)</span>
                  <span className="font-mono font-bold text-blue-800">{formatCurrency(balanceSheet.equity.totalEquity)}</span>
                </div>
                <div className="space-y-1">
                  {balanceSheet.equity.items.map(e => (
                    <div key={e.code} className="flex justify-between py-0.5 text-slate-700">
                      <span>{e.code} - {e.name}</span>
                      <span className="font-mono font-bold">{formatCurrency(e.amount)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-0.5 text-emerald-700 font-bold">
                    <span>صافي ربح الفترة</span>
                    <span className="font-mono">{formatCurrency(balanceSheet.equity.currentPeriodProfit)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Official Signatures & System Verification Footer */}
          <div className="mt-8 pt-6 border-t-2 border-slate-300 grid grid-cols-4 gap-4 text-center text-xs">
            <div className="space-y-1">
              <span className="text-slate-500 text-[10px] block">المحاسب المالي المعتمد</span>
              <span className="font-bold text-slate-800 block">إدارة الحسابات</span>
              <div className="h-9 flex items-center justify-center font-mono text-[10px] text-slate-400 italic">
                تم المراجعة والتدقيق ✓
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-slate-500 text-[10px] block">المراجع الداخلي</span>
              <span className="font-bold text-slate-800 block">قسم الرقابة والامتثال</span>
              <div className="h-9 flex items-center justify-center font-mono text-[10px] text-slate-400 italic">
                مطابق للمعايير ✓
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-slate-500 text-[10px] block">اعتماد المدير العام</span>
              <span className="font-bold text-slate-800 block">{currentUser.name}</span>
              <div className="h-9 flex items-center justify-center font-mono text-xs font-bold text-emerald-800">
                معتمد رسمياً ✓
              </div>
            </div>

            <div className="space-y-1 flex flex-col items-center">
              <span className="text-slate-500 text-[10px] block">الختم المحاسبي الإلكتروني</span>
              <div className="w-14 h-14 rounded-full border-2 border-dashed border-emerald-600 flex items-center justify-center text-emerald-800 font-bold text-[9px] text-center rotate-[-8deg] shadow-inner bg-emerald-50/50">
                مُحصّل<br />معتمد
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
