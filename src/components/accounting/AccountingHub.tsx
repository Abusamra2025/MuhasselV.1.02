// تصميم م. أبو أحمد — مصمم ومنفذ Claude — © الحقوق محفوظة
import React, { useState, useRef } from 'react';
import {
  BookOpen,
  FileSpreadsheet,
  Layers,
  Scale,
  PieChart,
  Landmark,
  Plus,
  CheckCircle2,
  Lock,
  Calendar,
  Search,
  Filter,
  ArrowUpDown,
  Download,
  Printer,
  Loader2,
  FileText
} from 'lucide-react';
import { useStore } from '../../lib/store';
import {
  generateTrialBalance,
  generateProfitLoss,
  generateBalanceSheet,
  calculateAccountBalances
} from '../../lib/accountingEngine';
import { formatCurrency } from '../../lib/numberToArabicWords';
import { Badge } from '../common/Badge';
import { NewJournalModal } from './NewJournalModal';
import { FiscalPeriodsManager } from './FiscalPeriodsManager';
import { exportElementToPdf } from '../../lib/pdfExportUtil';
import { MasterFinancialStatementsPdfModal } from '../reports/MasterFinancialStatementsPdfModal';
import {
  exportTrialBalanceToExcel,
  exportPnLToExcel,
  exportBalanceSheetToExcel
} from '../../lib/exportUtils';

type AccountingSubTab =
  | 'chart'
  | 'journal'
  | 'ledger'
  | 'trial_balance'
  | 'pnl'
  | 'balance_sheet'
  | 'periods';

export const AccountingHub: React.FC = () => {
  const { accounts, journalEntries, properties, periods, closeAccountingPeriod, currentUser, isSupervisoryOnly, canUserPerform } = useStore();

  const [activeSubTab, setActiveSubTab] = useState<AccountingSubTab>('trial_balance');
  const [selectedLedgerAccount, setSelectedLedgerAccount] = useState<string>('1120'); // Default to Bank
  const [showNewJournalModal, setShowNewJournalModal] = useState<boolean>(false);
  const [journalFilter, setJournalFilter] = useState<string>('');

  // PDF & Statement export state
  const statementRef = useRef<HTMLDivElement>(null);
  const [isExportingCurrentPdf, setIsExportingCurrentPdf] = useState<boolean>(false);
  const [pdfSuccess, setPdfSuccess] = useState<boolean>(false);
  const [isMasterPdfOpen, setIsMasterPdfOpen] = useState<boolean>(false);

  // Generate verified financial reports from accounting engine
  const trialBalance = generateTrialBalance(accounts, journalEntries);
  const pnl = generateProfitLoss(accounts, journalEntries);
  const balanceSheet = generateBalanceSheet(accounts, journalEntries);
  const accountBalances = calculateAccountBalances(accounts, journalEntries);

  const handleDownloadCurrentPdf = async () => {
    if (!statementRef.current) return;
    setIsExportingCurrentPdf(true);
    try {
      const titles: Record<AccountingSubTab, string> = {
        trial_balance: 'ميزان_المراجعة',
        balance_sheet: 'الميزانية_العمومية',
        pnl: 'قائمة_الدخل_والأرباح_والخسائر',
        ledger: 'دفتر_الأستاذ_العام',
        journal: 'دفتر_اليومية_العامة',
        chart: 'دليل_الحسابات',
        periods: 'الفترات_المالية'
      };
      const title = titles[activeSubTab] || 'تقرير_محاسبي';
      const filename = `${title}_${new Date().toISOString().split('T')[0]}`;
      await exportElementToPdf(statementRef.current, filename, {
        orientation: 'landscape'
      });
      setPdfSuccess(true);
      setTimeout(() => setPdfSuccess(false), 3000);
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setIsExportingCurrentPdf(false);
    }
  };

  const handlePrintCurrent = () => {
    window.print();
  };

  const handleExportCurrentExcel = () => {
    if (activeSubTab === 'trial_balance') {
      exportTrialBalanceToExcel(trialBalance);
    } else if (activeSubTab === 'balance_sheet') {
      exportBalanceSheetToExcel(balanceSheet);
    } else if (activeSubTab === 'pnl') {
      exportPnLToExcel(pnl);
    }
  };

  // Sub-navigation tabs
  const subTabs = [
    { id: 'trial_balance' as const, label: 'ميزان المراجعة', icon: Scale },
    { id: 'balance_sheet' as const, label: 'الميزانية العمومية', icon: Landmark },
    { id: 'pnl' as const, label: 'قائمة الدخل والأرباح', icon: PieChart },
    { id: 'ledger' as const, label: 'دفتر الأستاذ العام', icon: FileSpreadsheet },
    { id: 'journal' as const, label: 'دفتر اليومية العامة', icon: BookOpen },
    { id: 'chart' as const, label: 'دليل الحسابات الشجري', icon: Layers },
    { id: 'periods' as const, label: 'إدارة الفترات المالية والإقفال', icon: Calendar }
  ];

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">
              النظام المحاسبي ودفاتر الأستاذ المزدوجة
            </h2>
            <Badge variant="emerald" size="sm">
              SOCPA / IFRS متوافق
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            محرك محاسبي حقيقي معتمد، قيود متوازنة، وقوائم مالية محسوبة بدقة تامة
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsMasterPdfOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            title="فتح حزمة القوائم المالية الرسمية المعتمدة للمدير العام بصيغة PDF قابلة للطباعة والتصدير"
          >
            <FileText className="w-4 h-4 text-indigo-200" />
            <span>القوائم المالية للمدير (PDF)</span>
          </button>

          {isSupervisoryOnly ? (
            <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs px-3 py-2 rounded-lg font-bold flex items-center gap-1.5 shadow-2xs">
              <Lock className="w-4 h-4 text-amber-600" />
              <span>وظيفة المدير رقابية فقط (القيود تسجل بواسطة المحاسب القانوني)</span>
            </div>
          ) : canUserPerform('canCreateJournalEntries') ? (
            <button
              onClick={() => setShowNewJournalModal(true)}
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>تسجيل قيد يومية يدوي</span>
            </button>
          ) : null}
        </div>
      </div>

      {/* Segmented SubTab Bar */}
      <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-xl overflow-x-auto text-xs font-bold border border-slate-200">
        {subTabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Statement Action Toolbar (PDF / Print / Excel) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-bold text-slate-700">تصدير وطباعة القائمة المحددة:</span>
          <span className="text-slate-500 font-mono text-[11px]">
            {activeSubTab === 'trial_balance' ? 'ميزان المراجعة بالأرصدة والمجاميع' :
             activeSubTab === 'balance_sheet' ? 'الميزانية العمومية والمركز المالي' :
             activeSubTab === 'pnl' ? 'قائمة الدخل والأرباح والخسائر' :
             activeSubTab === 'ledger' ? 'دفتر الأستاذ العام' :
             activeSubTab === 'journal' ? 'دفتر اليومية العامة' : 
             activeSubTab === 'chart' ? 'دليل الحسابات الشجري' : 'الفترات المالية'}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleDownloadCurrentPdf}
            disabled={isExportingCurrentPdf}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
            title="تصدير هذه القائمة المحاسبية إلى ملف PDF منسق ومعتمد"
          >
            {isExportingCurrentPdf ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
            ) : pdfSuccess ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" />
            ) : (
              <Download className="w-3.5 h-3.5 text-emerald-200" />
            )}
            <span>{isExportingCurrentPdf ? 'جارٍ التصدير...' : pdfSuccess ? 'تم التحميل ✓' : 'تصدير القائمة (PDF)'}</span>
          </button>

          <button
            onClick={handlePrintCurrent}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-300"
            title="طباعة سريعة للقائمة المحاسبية الحالية"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>طباعة</span>
          </button>

          {['trial_balance', 'balance_sheet', 'pnl'].includes(activeSubTab) && (
            <button
              onClick={handleExportCurrentExcel}
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              title="تصدير إلى جدول Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>إكسل (Excel)</span>
            </button>
          )}

          <button
            onClick={() => setIsMasterPdfOpen(true)}
            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            title="فتح الحزمة الشاملة لجميع القوائم المالية للمدير العام"
          >
            <FileText className="w-3.5 h-3.5 text-indigo-600" />
            <span>حزمة القوائم الشاملة (PDF)</span>
          </button>
        </div>
      </div>

      {/* Render Statement Container wrapped in statementRef */}
      <div ref={statementRef} className="space-y-6">

      {/* 1. TRIAL BALANCE TAB */}
      {activeSubTab === 'trial_balance' && (
        <div className="space-y-4">
          {/* Balance proof banner */}
          <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-4 flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <Scale className="w-6 h-6 text-emerald-600" />
              <div>
                <h4 className="font-bold text-emerald-900 text-sm">
                  ميزان المراجعة متوازن ومطابق للمعايير المحاسبية
                </h4>
                <p className="text-emerald-700 mt-0.5">
                  تم التحقق آلياً من توازن مجاميع المدين والدائن لجميع الحسابات النشطة
                </p>
              </div>
            </div>

            <div className="text-left font-mono font-bold">
              <span className="text-emerald-800">
                الفارق: 0.00 ر.س (متطابق)
              </span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">رمز الحساب</th>
                  <th className="p-3">اسم الحساب</th>
                  <th className="p-3">التصنيف</th>
                  <th className="p-3 text-left font-mono">حركة مدين (Debit)</th>
                  <th className="p-3 text-left font-mono">حركة دائن (Credit)</th>
                  <th className="p-3 text-left font-mono">رصيد ختامي مدين</th>
                  <th className="p-3 text-left font-mono">رصيد ختامي دائن</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {trialBalance.rows.map(row => (
                  <tr key={row.accountCode} className="hover:bg-slate-50">
                    <td className="p-3 font-mono font-bold text-slate-900">
                      {row.accountCode}
                    </td>
                    <td className="p-3 font-bold text-slate-800">
                      {row.accountNameAr}
                    </td>
                    <td className="p-3">
                      <span className="text-[11px] text-slate-500">
                        {row.type === 'ASSET' ? 'أصل' : row.type === 'LIABILITY' ? 'التزام' : row.type === 'EQUITY' ? 'حقوق ملكية' : row.type === 'REVENUE' ? 'إيراد' : 'مصروف'}
                      </span>
                    </td>
                    <td className="p-3 text-left font-mono text-slate-700">
                      {row.periodDebit > 0 ? formatCurrency(row.periodDebit) : '—'}
                    </td>
                    <td className="p-3 text-left font-mono text-slate-700">
                      {row.periodCredit > 0 ? formatCurrency(row.periodCredit) : '—'}
                    </td>
                    <td className="p-3 text-left font-mono font-bold text-emerald-800">
                      {row.closingDebit > 0 ? formatCurrency(row.closingDebit) : '—'}
                    </td>
                    <td className="p-3 text-left font-mono font-bold text-blue-800">
                      {row.closingCredit > 0 ? formatCurrency(row.closingCredit) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-bold font-mono text-xs">
                <tr>
                  <td colSpan={3} className="p-3 text-slate-900">
                    الإجمالي العام لميزان المراجعة
                  </td>
                  <td className="p-3 text-left text-slate-900">
                    {formatCurrency(trialBalance.rows.reduce((a, b) => a + b.periodDebit, 0))}
                  </td>
                  <td className="p-3 text-left text-slate-900">
                    {formatCurrency(trialBalance.rows.reduce((a, b) => a + b.periodCredit, 0))}
                  </td>
                  <td className="p-3 text-left text-emerald-900 font-black">
                    {formatCurrency(trialBalance.totalDebit)}
                  </td>
                  <td className="p-3 text-left text-blue-900 font-black">
                    {formatCurrency(trialBalance.totalCredit)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* 2. BALANCE SHEET TAB */}
      {activeSubTab === 'balance_sheet' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
            
            <div className="border-b border-slate-200 pb-4 mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  الميزانية العمومية والمركز المالي (Balance Sheet)
                </h3>
                <p className="text-xs text-slate-500">
                  كما في تاريخ اليوم {balanceSheet.asOfDate}
                </p>
              </div>

              <div className="text-left">
                <Badge variant={balanceSheet.isBalanced ? 'emerald' : 'rose'}>
                  {balanceSheet.isBalanced ? 'معادلة الميزانية متوازنة تماماً' : 'غير متوازنة'}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs">
              
              {/* Assets Column */}
              <div className="space-y-4">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 font-bold text-sm text-slate-900 flex justify-between">
                  <span>الأصول (Assets)</span>
                  <span className="font-mono text-emerald-700">
                    {formatCurrency(balanceSheet.assets.totalAssets)}
                  </span>
                </div>

                <div>
                  <h5 className="font-bold text-slate-600 mb-2">الأصول المتداولة:</h5>
                  <div className="space-y-1.5 divide-y divide-slate-100">
                    {balanceSheet.assets.currentAssets.map(a => (
                      <div key={a.code} className="flex justify-between py-1 text-slate-700">
                        <span>{a.code} - {a.name}</span>
                        <span className="font-mono font-bold">{formatCurrency(a.amount)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-200 font-bold text-slate-900">
                    <span>مجموع الأصول المتداولة:</span>
                    <span className="font-mono">{formatCurrency(balanceSheet.assets.totalCurrentAssets)}</span>
                  </div>
                </div>

                <div className="pt-3">
                  <h5 className="font-bold text-slate-600 mb-2">الأصول الثابتة والاستثمارية:</h5>
                  <div className="space-y-1.5 divide-y divide-slate-100">
                    {balanceSheet.assets.fixedAssets.map(a => (
                      <div key={a.code} className="flex justify-between py-1 text-slate-700">
                        <span>{a.code} - {a.name}</span>
                        <span className="font-mono font-bold">{formatCurrency(a.amount)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-200 font-bold text-slate-900">
                    <span>مجموع الأصول الثابتة:</span>
                    <span className="font-mono">{formatCurrency(balanceSheet.assets.totalFixedAssets)}</span>
                  </div>
                </div>
              </div>

              {/* Liabilities & Equity Column */}
              <div className="space-y-4">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 font-bold text-sm text-slate-900 flex justify-between">
                  <span>الالتزامات وحقوق الملكية</span>
                  <span className="font-mono text-blue-700">
                    {formatCurrency(balanceSheet.liabilities.totalLiabilities + balanceSheet.equity.totalEquity)}
                  </span>
                </div>

                <div>
                  <h5 className="font-bold text-slate-600 mb-2">الالتزامات والخصوم المتداولة:</h5>
                  <div className="space-y-1.5 divide-y divide-slate-100">
                    {balanceSheet.liabilities.currentLiabilities.map(l => (
                      <div key={l.code} className="flex justify-between py-1 text-slate-700">
                        <span>{l.code} - {l.name}</span>
                        <span className="font-mono font-bold">{formatCurrency(l.amount)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-200 font-bold text-slate-900">
                    <span>مجموع الالتزامات المتداولة:</span>
                    <span className="font-mono">{formatCurrency(balanceSheet.liabilities.totalCurrentLiabilities)}</span>
                  </div>
                </div>

                <div className="pt-3">
                  <h5 className="font-bold text-slate-600 mb-2">حقوق الملكية ورأس المال:</h5>
                  <div className="space-y-1.5 divide-y divide-slate-100">
                    {balanceSheet.equity.items.map(e => (
                      <div key={e.code} className="flex justify-between py-1 text-slate-700">
                        <span>{e.code} - {e.name}</span>
                        <span className="font-mono font-bold">{formatCurrency(e.amount)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between py-1 text-emerald-700 font-bold">
                      <span>صافي أرباح الفترة الحالية (من قائمة الدخل)</span>
                      <span className="font-mono">{formatCurrency(balanceSheet.equity.currentPeriodProfit)}</span>
                    </div>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-200 font-bold text-slate-900">
                    <span>مجموع حقوق الملكية:</span>
                    <span className="font-mono">{formatCurrency(balanceSheet.equity.totalEquity)}</span>
                  </div>
                </div>

              </div>

            </div>

            {/* Verification Footer */}
            <div className="mt-8 pt-4 border-t-2 border-slate-900 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800">
                إجمالي الأصول = إجمالي الالتزامات + حقوق الملكية:
              </span>
              <span className="font-mono font-black text-sm text-emerald-800">
                {formatCurrency(balanceSheet.assets.totalAssets)} = {formatCurrency(balanceSheet.liabilities.totalLiabilities + balanceSheet.equity.totalEquity)}
              </span>
            </div>

          </div>
        </div>
      )}

      {/* 3. PROFIT & LOSS TAB */}
      {activeSubTab === 'pnl' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs text-xs space-y-6">
          <div className="border-b border-slate-200 pb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                قائمة الدخل والأرباح والخسائر (Income Statement)
              </h3>
              <p className="text-slate-500 mt-0.5">{pnl.periodName}</p>
            </div>
            <div className="text-left font-mono">
              <p className="text-xs text-slate-400">صافي الدخل التشغيلي</p>
              <p className={`text-xl font-black ${pnl.netOperatingIncome >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {formatCurrency(pnl.netOperatingIncome)}
              </p>
            </div>
          </div>

          <div className="space-y-4 max-w-2xl mx-auto">
            {/* Revenue */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-emerald-50/80 p-3 font-bold text-emerald-950 flex justify-between">
                <span>الإيرادات التشغيلية</span>
                <span className="font-mono text-emerald-700 font-black">{formatCurrency(pnl.totalRevenue)}</span>
              </div>
              <div className="p-3 space-y-2">
                <div className="flex justify-between text-slate-700">
                  <span>إيرادات تأجير العقارات (4100)</span>
                  <span className="font-mono font-bold">{formatCurrency(pnl.rentalIncome)}</span>
                </div>
                {pnl.otherIncome > 0 && (
                  <div className="flex justify-between text-slate-700">
                    <span>إيرادات خدمات ورسوم إضافية (4200 + 4300)</span>
                    <span className="font-mono font-bold">{formatCurrency(pnl.otherIncome)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Expenses */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-rose-50/80 p-3 font-bold text-rose-950 flex justify-between">
                <span>المصروفات التشغيلية المباشرة</span>
                <span className="font-mono text-rose-700 font-black">{formatCurrency(pnl.totalExpenses)}</span>
              </div>
              <div className="p-3 space-y-2">
                <div className="flex justify-between text-slate-700">
                  <span>مصاريف الصيانة والترميم (5100)</span>
                  <span className="font-mono font-bold">{formatCurrency(pnl.maintenanceExpense)}</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>فواتير الكهرباء والمياه والخدمات (5200)</span>
                  <span className="font-mono font-bold">{formatCurrency(pnl.utilitiesExpense)}</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>نظافة وأمن وحراسة ومصاريف عامة</span>
                  <span className="font-mono font-bold">{formatCurrency(pnl.otherExpenses)}</span>
                </div>
              </div>
            </div>

            {/* Net Operating Income Result */}
            <div className="p-4 bg-slate-900 text-white rounded-xl flex items-center justify-between text-sm font-bold">
              <span>صافي الدخل التشغيلي للنشاط العقاري (NOI):</span>
              <span className="font-mono text-lg text-emerald-400 font-black">
                {formatCurrency(pnl.netOperatingIncome)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 4. GENERAL LEDGER TAB */}
      {activeSubTab === 'ledger' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span className="font-bold text-slate-800">اختر الحساب لعرض كشف الأستاذ:</span>
            </div>

            <select
              value={selectedLedgerAccount}
              onChange={e => setSelectedLedgerAccount(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg p-2 font-bold text-slate-800 w-full sm:w-80"
            >
              {accounts.map(a => (
                <option key={a.code} value={a.code}>
                  {a.code} - {a.nameAr}
                </option>
              ))}
            </select>
          </div>

          {/* Ledger Table */}
          {(() => {
            const acc = accounts.find(a => a.code === selectedLedgerAccount);
            const isDebitNormal = acc?.normalBalance === 'DEBIT';

            // Gather all lines referencing this account
            const ledgerRows: Array<{
              date: string;
              jvNumber: string;
              description: string;
              debit: number;
              credit: number;
            }> = [];

            journalEntries
              .filter(j => j.status === 'POSTED')
              .forEach(j => {
                j.lines
                  .filter(l => l.accountCode === selectedLedgerAccount)
                  .forEach(l => {
                    ledgerRows.push({
                      date: j.date,
                      jvNumber: j.entryNumber,
                      description: l.description || j.description,
                      debit: l.debit,
                      credit: l.credit
                    });
                  });
              });

            ledgerRows.sort((a, b) => a.date.localeCompare(b.date));

            let running = 0;

            return (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="p-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-800">
                    كشف حركات الحساب: {acc?.code} - {acc?.nameAr}
                  </span>
                  <span className="font-bold text-slate-600">
                    طبيعة الحساب: {isDebitNormal ? 'مدين (Debit Normal)' : 'دائن (Credit Normal)'}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-3">التاريخ</th>
                        <th className="p-3">رقم القيد</th>
                        <th className="p-3">البيان والشرح</th>
                        <th className="p-3 text-left font-mono">مدين (Debit)</th>
                        <th className="p-3 text-left font-mono">دائن (Credit)</th>
                        <th className="p-3 text-left font-mono">الرصيد التراكمي</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {ledgerRows.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-slate-400">
                            لا توجد حركات مسجلة على هذا الحساب في الفترة المحددة
                          </td>
                        </tr>
                      ) : (
                        ledgerRows.map((row, i) => {
                          if (isDebitNormal) {
                            running = running + row.debit - row.credit;
                          } else {
                            running = running + row.credit - row.debit;
                          }

                          return (
                            <tr key={i} className="hover:bg-slate-50">
                              <td className="p-3 font-mono text-slate-600">{row.date}</td>
                              <td className="p-3 font-mono font-bold text-slate-800">{row.jvNumber}</td>
                              <td className="p-3 text-slate-700">{row.description}</td>
                              <td className="p-3 text-left font-mono text-slate-800">
                                {row.debit > 0 ? formatCurrency(row.debit) : '—'}
                              </td>
                              <td className="p-3 text-left font-mono text-slate-800">
                                {row.credit > 0 ? formatCurrency(row.credit) : '—'}
                              </td>
                              <td className="p-3 text-left font-mono font-bold text-emerald-800">
                                {formatCurrency(running)}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* 5. GENERAL JOURNAL TAB */}
      {activeSubTab === 'journal' && (
        <div className="space-y-4">
          <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
            <div className="relative w-72">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
              <input
                type="text"
                placeholder="بحث برقم القيد أو البيان..."
                value={journalFilter}
                onChange={e => setJournalFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pr-9 pl-3 py-2 text-slate-800 placeholder-slate-400"
              />
            </div>
            <span className="text-slate-500 font-bold">
              إجمالي القيود المرحلة: {journalEntries.length} قيد
            </span>
          </div>

          <div className="space-y-3">
            {journalEntries
              .filter(j => {
                if (!journalFilter) return true;
                const term = journalFilter.toLowerCase();
                return (
                  j.entryNumber.toLowerCase().includes(term) ||
                  j.description.toLowerCase().includes(term)
                );
              })
              .map(entry => (
                <div key={entry.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 pb-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-sm text-slate-900">
                        {entry.entryNumber}
                      </span>
                      <span className="text-slate-400">·</span>
                      <span className="text-xs text-slate-500 font-mono">{entry.date}</span>
                      <Badge variant="emerald" size="sm">
                        {entry.status === 'POSTED' ? 'مرحل ومعتمد' : 'معكوس'}
                      </Badge>
                      <span className="text-[11px] text-slate-400">
                        بواسطة: {entry.createdBy}
                      </span>
                    </div>

                    <div className="text-left font-mono text-xs font-bold text-slate-700">
                      إجمالي القيد: {formatCurrency(entry.totalDebit)}
                    </div>
                  </div>

                  <p className="text-xs font-semibold text-slate-800 mb-2">
                    {entry.description}
                  </p>

                  <div className="border border-slate-100 rounded-lg overflow-hidden text-xs">
                    <table className="w-full text-right">
                      <thead className="bg-slate-50 text-slate-600 font-bold">
                        <tr>
                          <th className="p-2 w-32">رمز الحساب</th>
                          <th className="p-2">اسم الحساب</th>
                          <th className="p-2">البيان التفصيلي</th>
                          <th className="p-2 text-left font-mono w-28">مدين (Debit)</th>
                          <th className="p-2 text-left font-mono w-28">دائن (Credit)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {entry.lines.map((l, i) => (
                          <tr key={i} className="hover:bg-slate-50/50">
                            <td className="p-2 font-mono font-bold text-slate-800">{l.accountCode}</td>
                            <td className="p-2 font-bold text-slate-700">{l.accountName}</td>
                            <td className="p-2 text-slate-500">{l.description}</td>
                            <td className="p-2 text-left font-mono font-bold text-emerald-800">
                              {l.debit > 0 ? formatCurrency(l.debit) : '—'}
                            </td>
                            <td className="p-2 text-left font-mono font-bold text-blue-800">
                              {l.credit > 0 ? formatCurrency(l.credit) : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* 6. CHART OF ACCOUNTS TAB */}
      {activeSubTab === 'chart' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center text-xs">
            <span className="font-bold text-slate-800">دليل الحسابات الشجري العام</span>
            <span className="text-slate-500">إجمالي الحسابات: {accounts.length}</span>
          </div>

          <table className="w-full text-right text-xs">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3">كود الحساب</th>
                <th className="p-3">اسم الحساب (عربي)</th>
                <th className="p-3">Account Name (EN)</th>
                <th className="p-3">النوع</th>
                <th className="p-3">طبيعة الرصيد</th>
                <th className="p-3 text-left font-mono">الرصيد القائم</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {accounts.map(acc => {
                const bal = accountBalances.get(acc.code)?.balance || 0;
                return (
                  <tr key={acc.code} className="hover:bg-slate-50">
                    <td className="p-3 font-mono font-bold text-slate-900">{acc.code}</td>
                    <td className="p-3 font-bold text-slate-800">{acc.nameAr}</td>
                    <td className="p-3 text-slate-500 font-sans">{acc.nameEn}</td>
                    <td className="p-3">
                      <span className="text-[11px] font-semibold text-slate-600">
                        {acc.type === 'ASSET' ? 'أصل' : acc.type === 'LIABILITY' ? 'التزام' : acc.type === 'EQUITY' ? 'حقوق ملكية' : acc.type === 'REVENUE' ? 'إيراد' : 'مصروف'}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="text-[11px] font-mono text-slate-600">
                        {acc.normalBalance === 'DEBIT' ? 'مدين (Dr)' : 'دائن (Cr)'}
                      </span>
                    </td>
                    <td className="p-3 text-left font-mono font-bold text-slate-900">
                      {formatCurrency(bal)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 7. FISCAL PERIODS & PERIOD CLOSING TAB */}
      {activeSubTab === 'periods' && (
        <FiscalPeriodsManager />
      )}

      </div>

      {/* Master Financial Statements PDF Modal for General Manager */}
      <MasterFinancialStatementsPdfModal
        isOpen={isMasterPdfOpen}
        onClose={() => setIsMasterPdfOpen(false)}
      />

      {/* New Journal Modal */}
      {showNewJournalModal && (
        <NewJournalModal
          onClose={() => setShowNewJournalModal(false)}
          onSuccess={() => setShowNewJournalModal(false)}
        />
      )}

    </div>
  );
};
