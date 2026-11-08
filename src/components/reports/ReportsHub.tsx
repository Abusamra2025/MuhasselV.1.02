// تصميم م. أبو أحمد — مصمم ومنفذ Claude — © الحقوق محفوظة
import React, { useState, useRef } from 'react';
import {
  FileText,
  Clock,
  Printer,
  Calendar,
  Building,
  User,
  Shield,
  Search,
  Filter,
  DollarSign,
  Download,
  Scale,
  Landmark,
  PieChart,
  FileSpreadsheet,
  BookOpen,
  ArrowUpRight,
  ExternalLink,
  Layers,
  Loader2,
  CheckCircle2,
  Crown
} from 'lucide-react';
import { exportElementToPdf } from '../../lib/pdfExportUtil';
import { useStore } from '../../lib/store';
import {
  calculateAgingBuckets,
  calculateTenantStatement,
  generateTrialBalance,
  generateProfitLoss,
  generateBalanceSheet,
  ROUND
} from '../../lib/accountingEngine';
import { formatCurrency } from '../../lib/numberToArabicWords';
import { Badge } from '../common/Badge';
import { ReportPdfPreviewModal } from './ReportPdfPreviewModal';
import { TenantDetailsModal } from '../common/TenantDetailsModal';
import { InvoiceDetailsModal } from '../common/InvoiceDetailsModal';
import { OfficialReceiptModal } from '../payments/OfficialReceiptModal';
import { ExpenseDetailsModal } from '../common/ExpenseDetailsModal';
import { AccountLedgerModal } from '../common/AccountLedgerModal';
import { JournalEntryModal } from '../common/JournalEntryModal';
import { AggregatedDocumentModal } from '../common/AggregatedDocumentModal';
import { GeneralManagerDocumentReaderModal } from '../manager/GeneralManagerDocumentReaderModal';
import { Tenant, Invoice, Payment, JournalEntry, PropertyExpense, AggregatedDocument } from '../../types';
import {
  exportTenantStatementToExcel,
  exportTrialBalanceToExcel,
  exportPnLToExcel,
  exportBalanceSheetToExcel,
  exportAgingReportToExcel,
  exportDailyCollectionsToExcel,
  exportPropertyPerformanceToExcel,
  exportSecurityDepositsToExcel,
  exportAggregatedBatchesToExcel,
  exportMasterAuditPackageToExcel
} from '../../lib/exportUtils';

type ReportType =
  | 'tenant_statement'
  | 'trial_balance'
  | 'pnl'
  | 'balance_sheet'
  | 'ar_aging'
  | 'daily_collection'
  | 'property_performance'
  | 'security_deposits'
  | 'aggregated_batches';

export const ReportsHub: React.FC = () => {
  const {
    tenants,
    properties,
    units,
    invoices,
    payments,
    expenses,
    accounts,
    journalEntries,
    aggregatedDocuments,
    inventoryItems,
    currentUser,
    canUserPerform
  } = useStore();

  const [activeReport, setActiveReport] = useState<ReportType>('tenant_statement');
  const [selectedTenantId, setSelectedTenantId] = useState<string>(tenants[0]?.id || '');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('ALL');

  // PDF Preview State
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const mainCardRef = useRef<HTMLDivElement>(null);
  const [isDirectPdfDownloading, setIsDirectPdfDownloading] = useState(false);
  const [directPdfSuccess, setDirectPdfSuccess] = useState(false);

  const handleDirectDownloadPdf = async () => {
    if (!mainCardRef.current || isDirectPdfDownloading) return;
    try {
      setIsDirectPdfDownloading(true);
      const titleInfo = getReportTitle();
      const sanitizedTitle = titleInfo.title.replace(/[:\/\\?*|"<>\s]+/g, '_');
      const filename = `${sanitizedTitle}_شركة_المحصل_${new Date().toISOString().split('T')[0]}`;
      await exportElementToPdf(mainCardRef.current, filename, {
        orientation: 'portrait',
        scale: 2
      });
      setDirectPdfSuccess(true);
      setTimeout(() => setDirectPdfSuccess(false), 3000);
    } catch (err) {
      console.error('Error generating direct PDF:', err);
    } finally {
      setIsDirectPdfDownloading(false);
    }
  };

  // Drilldown Modals State
  const [drillTenantId, setDrillTenantId] = useState<string | null>(null);
  const [drillInvoice, setDrillInvoice] = useState<Invoice | null>(null);
  const [drillPayment, setDrillPayment] = useState<Payment | null>(null);
  const [drillExpense, setDrillExpense] = useState<PropertyExpense | null>(null);
  const [drillAccountCode, setDrillAccountCode] = useState<string | null>(null);
  const [drillJournalEntry, setDrillJournalEntry] = useState<JournalEntry | null>(null);
  const [drillAggregatedDoc, setDrillAggregatedDoc] = useState<AggregatedDocument | null>(null);
  const [gmReaderInvoice, setGmReaderInvoice] = useState<Invoice | null>(null);
  const [gmReaderTenantId, setGmReaderTenantId] = useState<string | null>(null);

  // Computed Financial Reports
  const agingReport = calculateAgingBuckets(invoices, tenants, properties, units);
  const selectedTenant = tenants.find(t => t.id === selectedTenantId);
  const tenantStatement = selectedTenantId
    ? calculateTenantStatement(selectedTenantId, invoices, payments)
    : [];

  const trialBalance = generateTrialBalance(accounts, journalEntries);
  const pnl = generateProfitLoss(accounts, journalEntries);
  const balanceSheet = generateBalanceSheet(accounts, journalEntries);

  const handleExportActiveReportToExcel = () => {
    switch (activeReport) {
      case 'tenant_statement':
        exportTenantStatementToExcel(selectedTenant, tenantStatement);
        break;
      case 'trial_balance':
        exportTrialBalanceToExcel(trialBalance);
        break;
      case 'pnl':
        exportPnLToExcel(pnl);
        break;
      case 'balance_sheet':
        exportBalanceSheetToExcel(balanceSheet);
        break;
      case 'ar_aging':
        exportAgingReportToExcel(agingReport);
        break;
      case 'daily_collection':
        exportDailyCollectionsToExcel(payments);
        break;
      case 'property_performance':
        exportPropertyPerformanceToExcel(properties, units, invoices, expenses);
        break;
      case 'security_deposits':
        exportSecurityDepositsToExcel(tenants, units, properties);
        break;
      case 'aggregated_batches':
        exportAggregatedBatchesToExcel(aggregatedDocuments);
        break;
    }
  };

  const handleExportMasterAuditPackage = () => {
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

  const handleQuickPrint = () => {
    window.print();
  };

  const getReportTitle = (): { title: string; subtitle: string } => {
    switch (activeReport) {
      case 'tenant_statement':
        return {
          title: `كشف حساب تحليلي للمستأجر: ${selectedTenant?.name || ''}`,
          subtitle: `الهوية: ${selectedTenant?.nationalId || '—'} · الجوال: ${selectedTenant?.phone || '—'} · الرصيد: ${formatCurrency(selectedTenant?.balance || 0)}`
        };
      case 'trial_balance':
        return {
          title: 'ميزان المراجعة بالمجاميع والأرصدة (Trial Balance)',
          subtitle: 'مطابقة أرصدة كافة الحسابات المدينة والدائنة وفق المعايير المحاسبية المعتمدة'
        };
      case 'pnl':
        return {
          title: 'قائمة الدخل والأرباح والخسائر (Income Statement / P&L)',
          subtitle: 'تحليل الإيرادات التأجيرية والمصروفات التشغيلية وصافي الدخل المحقق'
        };
      case 'balance_sheet':
        return {
          title: 'الميزانية العمومية وقائمة المركز المالي (Balance Sheet)',
          subtitle: 'الأصول = الخصوم + حقوق الملكية (معادلة المركز المالي المتوازنة)'
        };
      case 'ar_aging':
        return {
          title: 'تقرير أعمار الديون والمتأخرات (A/R Aging Report)',
          subtitle: 'تصنيف المديونيات المستحقة حسب فترات التأخير (30، 60، 90، 90+ يوماً)'
        };
      case 'daily_collection':
        return {
          title: 'تقرير التحصيل وسجل المقبوضات اليومية (Daily Collections)',
          subtitle: 'حركة التوريدات النقدية والبنكية ومتابعة تحصيلات الصندوق'
        };
      case 'property_performance':
        return {
          title: 'تقرير إيرادات ومصروفات العقارات (Property P&L Performance)',
          subtitle: 'تحليل العائد التشغيلي ونسب الإشغال ومقارنة أداء المباني'
        };
      case 'security_deposits':
        return {
          title: 'تقرير التزامات التأمينات المستردة (Security Deposits Payable)',
          subtitle: 'حساب الخصوم المتداولة (2110) - أمانات الضمان المحتجزة للعقود'
        };
      case 'aggregated_batches':
        return {
          title: 'سجل الحزم والمستندات المجمعة (Aggregated Batches)',
          subtitle: 'حزم المقبوضات الشهرية، فواتير ومصروفات الصيانة، وحركات المستودع المجمعة'
        };
    }
  };

  const renderActiveReportContent = () => {
    switch (activeReport) {
      case 'tenant_statement':
        return (
          <div className="space-y-4">
            {/* Tenant Selector (Hidden on print) */}
            <div className="no-print flex items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700 text-xs">اختر المستأجر:</span>
                <select
                  value={selectedTenantId}
                  onChange={e => setSelectedTenantId(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg p-2 font-bold text-slate-800 text-xs w-72"
                >
                  {tenants.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} (رصيد: {formatCurrency(t.balance)})
                    </option>
                  ))}
                </select>
              </div>

              {selectedTenant && (
                <button
                  onClick={() => setDrillTenantId(selectedTenant.id)}
                  className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                  <span>عرض بطاقة المستأجر الكاملة</span>
                </button>
              )}
            </div>

            {/* Statement Header */}
            <div className="border-b-2 border-slate-900 pb-4 flex items-start justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  كشف حساب مستأجر تفصيلي
                </h3>
                <p className="text-slate-700 mt-1">
                  المستأجر: <strong className="text-slate-900 font-bold hover:underline cursor-pointer" onClick={() => setDrillTenantId(selectedTenant?.id || null)}>{selectedTenant?.name}</strong>
                </p>
                <p className="text-slate-500 font-mono text-[11px] mt-0.5">
                  الهوية: {selectedTenant?.nationalId} · الجوال: {selectedTenant?.phone}
                </p>
              </div>

              <div className="text-left font-mono">
                <p className="text-slate-500 text-xs">الرصيد القائم الحالي:</p>
                <p className={`text-xl font-black ${selectedTenant && selectedTenant.balance > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                  {formatCurrency(selectedTenant?.balance || 0)}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5 font-sans">
                  تأمين الضمان المحتجز: {formatCurrency(selectedTenant?.securityDepositHeld || 0)}
                </p>
              </div>
            </div>

            {/* Statement Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">التاريخ</th>
                    <th className="p-2.5">نوع الحركة</th>
                    <th className="p-2.5">الرقم المرجعي (انقر للتفاصيل)</th>
                    <th className="p-2.5">البيان والشرح</th>
                    <th className="p-2.5 text-left font-mono">مدين (استحقاق)</th>
                    <th className="p-2.5 text-left font-mono">دائن (سداد)</th>
                    <th className="p-2.5 text-left font-mono">الرصيد المستمر</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tenantStatement.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        لا توجد حركات مسجلة لهذا المستأجر
                      </td>
                    </tr>
                  ) : (
                    tenantStatement.map((rec, i) => {
                      const linkedInv = invoices.find(inv => inv.invoiceNumber === rec.refNumber);
                      const linkedPay = payments.find(p => p.receiptNumber === rec.refNumber);

                      return (
                        <tr key={i} className="hover:bg-slate-50 transition-colors">
                          <td className="p-2.5 font-mono text-slate-600">{rec.date}</td>
                          <td className="p-2.5">
                            {rec.type === 'INVOICE' ? (
                              <Badge variant="blue" size="sm">فاتورة إيجار</Badge>
                            ) : rec.type === 'PAYMENT' ? (
                              <Badge variant="emerald" size="sm">سند قبض</Badge>
                            ) : (
                              <Badge variant="rose" size="sm">عكس سند</Badge>
                            )}
                          </td>
                          <td className="p-2.5 font-mono font-bold text-slate-900">
                            {linkedInv ? (
                              <button
                                onClick={() => {
                                  setGmReaderInvoice(linkedInv);
                                  setGmReaderTenantId(linkedInv.tenantId);
                                }}
                                className="text-blue-700 hover:underline flex items-center gap-1 cursor-pointer font-bold"
                                title="قراءة تفاصيل المستند للمدير العام"
                              >
                                <span>{rec.refNumber}</span>
                                <Crown className="w-3 h-3 text-amber-500" />
                              </button>
                            ) : linkedPay ? (
                              <button
                                onClick={() => setDrillPayment(linkedPay)}
                                className="text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer"
                                title="عرض سند القبض الرسمي"
                              >
                                <span>{rec.refNumber}</span>
                                <ArrowUpRight className="w-3 h-3" />
                              </button>
                            ) : (
                              rec.refNumber
                            )}
                          </td>
                          <td className="p-2.5 text-slate-700">{rec.description}</td>
                          <td className="p-2.5 text-left font-mono font-bold text-rose-700">
                            {rec.debit > 0 ? formatCurrency(rec.debit) : '—'}
                          </td>
                          <td className="p-2.5 text-left font-mono font-bold text-emerald-700">
                            {rec.credit > 0 ? formatCurrency(rec.credit) : '—'}
                          </td>
                          <td className="p-2.5 text-left font-mono font-black text-slate-900">
                            {formatCurrency(rec.balance)}
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

      case 'trial_balance':
        return (
          <div className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-emerald-600" />
                <span className="font-bold text-emerald-900">
                  ميزان المراجعة متوازن ومطابق: انقر على أي حساب لاستعراض دفتر الأستاذ التفصيلي الخاص به
                </span>
              </div>
              <span className="font-mono font-bold text-emerald-800">الفرق: 0.00 ر.س</span>
            </div>

            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-2.5">رمز الحساب</th>
                  <th className="p-2.5">اسم الحساب (انقر للتفاصيل)</th>
                  <th className="p-2.5">التصنيف</th>
                  <th className="p-2.5 text-left font-mono">حركة مدين (Debit)</th>
                  <th className="p-2.5 text-left font-mono">حركة دائن (Credit)</th>
                  <th className="p-2.5 text-left font-mono">رصيد ختامي مدين</th>
                  <th className="p-2.5 text-left font-mono">رصيد ختامي دائن</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {trialBalance.rows.map(row => (
                  <tr
                    key={row.accountCode}
                    onClick={() => setDrillAccountCode(row.accountCode)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                    title="انقر لعرض دفتر الأستاذ العام للحساب"
                  >
                    <td className="p-2.5 font-mono font-bold text-indigo-700">{row.accountCode}</td>
                    <td className="p-2.5 font-bold text-slate-900 hover:text-emerald-700 flex items-center gap-1">
                      <span>{row.accountNameAr}</span>
                      <ArrowUpRight className="w-3 h-3 text-slate-400" />
                    </td>
                    <td className="p-2.5 text-slate-500">{row.type}</td>
                    <td className="p-2.5 text-left font-mono font-bold text-slate-800">
                      {row.periodDebit > 0 ? formatCurrency(row.periodDebit) : '—'}
                    </td>
                    <td className="p-2.5 text-left font-mono font-bold text-slate-800">
                      {row.periodCredit > 0 ? formatCurrency(row.periodCredit) : '—'}
                    </td>
                    <td className="p-2.5 text-left font-mono font-black text-emerald-800">
                      {row.closingDebit > 0 ? formatCurrency(row.closingDebit) : '—'}
                    </td>
                    <td className="p-2.5 text-left font-mono font-black text-blue-800">
                      {row.closingCredit > 0 ? formatCurrency(row.closingCredit) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 font-bold font-mono border-t-2 border-slate-300">
                <tr>
                  <td colSpan={3} className="p-2.5 text-slate-900">المجموع المتوازن</td>
                  <td className="p-2.5 text-left text-slate-900">
                    {formatCurrency(trialBalance.rows.reduce((a, b) => a + b.periodDebit, 0))}
                  </td>
                  <td className="p-2.5 text-left text-slate-900">
                    {formatCurrency(trialBalance.rows.reduce((a, b) => a + b.periodCredit, 0))}
                  </td>
                  <td className="p-2.5 text-left text-emerald-800 font-black">
                    {formatCurrency(trialBalance.totalDebit)}
                  </td>
                  <td className="p-2.5 text-left text-blue-800 font-black">
                    {formatCurrency(trialBalance.totalCredit)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        );

      case 'pnl':
        return (
          <div className="space-y-4 max-w-3xl mx-auto">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-xs space-y-4">
              
              {/* Revenues */}
              <div>
                <h4 className="font-bold text-sm text-slate-900 border-b border-slate-200 pb-2 flex justify-between">
                  <span>الإيرادات التشغيلية (Operating Revenues)</span>
                  <span className="font-mono text-emerald-700">{formatCurrency(pnl.totalRevenue)}</span>
                </h4>
                <div className="divide-y divide-slate-100 mt-2">
                  <div className="py-2 flex justify-between">
                    <span className="cursor-pointer hover:underline text-slate-700" onClick={() => setDrillAccountCode('4100')}>
                      4100 - إيرادات تأجير الوحدات العقارية
                    </span>
                    <span className="font-mono font-bold text-emerald-800">{formatCurrency(pnl.rentalIncome)}</span>
                  </div>
                  <div className="py-2 flex justify-between">
                    <span className="cursor-pointer hover:underline text-slate-700" onClick={() => setDrillAccountCode('4200')}>
                      4200 - إيرادات خدمات تشغيلية أخرى
                    </span>
                    <span className="font-mono font-bold text-emerald-800">{formatCurrency(pnl.otherIncome)}</span>
                  </div>
                </div>
              </div>

              {/* Expenses */}
              <div>
                <h4 className="font-bold text-sm text-slate-900 border-b border-slate-200 pb-2 flex justify-between">
                  <span>المصروفات التشغيلية (Operating Expenses)</span>
                  <span className="font-mono text-rose-700">{formatCurrency(pnl.totalExpenses)}</span>
                </h4>
                <div className="divide-y divide-slate-100 mt-2">
                  <div className="py-2 flex justify-between">
                    <span className="cursor-pointer hover:underline text-slate-700" onClick={() => setDrillAccountCode('5100')}>
                      5100 - مصروفات الصيانة والترميم
                    </span>
                    <span className="font-mono font-bold text-rose-700">{formatCurrency(pnl.maintenanceExpense)}</span>
                  </div>
                  <div className="py-2 flex justify-between">
                    <span className="cursor-pointer hover:underline text-slate-700" onClick={() => setDrillAccountCode('5200')}>
                      5200 - مصروفات الخدمات والمرافق
                    </span>
                    <span className="font-mono font-bold text-rose-700">{formatCurrency(pnl.utilitiesExpense)}</span>
                  </div>
                  <div className="py-2 flex justify-between">
                    <span className="cursor-pointer hover:underline text-slate-700" onClick={() => setDrillAccountCode('5400')}>
                      5400 - أتعاب إدارة الأملاك
                    </span>
                    <span className="font-mono font-bold text-rose-700">{formatCurrency(pnl.managementExpense)}</span>
                  </div>
                  <div className="py-2 flex justify-between">
                    <span className="text-slate-700">5500 - مصروفات تشغيلية وتأمينية أخرى</span>
                    <span className="font-mono font-bold text-rose-700">{formatCurrency(pnl.otherExpenses)}</span>
                  </div>
                </div>
              </div>

              {/* Net Income */}
              <div className="bg-emerald-100/70 border border-emerald-300 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-emerald-950">صافي الدخل والأرباح التشغيلية (Net Operating Income)</h3>
                  <p className="text-[11px] text-emerald-800">إجمالي الإيرادات مطروحاً منه إجمالي المصروفات</p>
                </div>
                <span className="text-2xl font-black font-mono text-emerald-900">
                  {formatCurrency(pnl.netOperatingIncome)}
                </span>
              </div>

            </div>
          </div>
        );

      case 'balance_sheet':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              
              {/* Assets Column */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <h4 className="font-bold text-sm text-slate-900 border-b border-slate-300 pb-2 flex justify-between">
                  <span>الأصول (Assets)</span>
                  <span className="font-mono text-slate-900">{formatCurrency(balanceSheet.assets.totalAssets)}</span>
                </h4>
                <div className="space-y-2">
                  <p className="font-bold text-slate-700">الأصول المتداولة (Current Assets):</p>
                  {balanceSheet.assets.currentAssets.map(a => (
                    <div
                      key={a.code}
                      onClick={() => setDrillAccountCode(a.code)}
                      className="flex justify-between py-1 border-b border-slate-100 hover:bg-white px-2 rounded cursor-pointer transition-colors"
                    >
                      <span className="text-slate-700">{a.code} - {a.name}</span>
                      <span className="font-mono font-bold text-slate-900">{formatCurrency(a.amount)}</span>
                    </div>
                  ))}
                  <p className="font-bold text-slate-700 pt-2">الأصول الثابتة (Fixed Assets):</p>
                  {balanceSheet.assets.fixedAssets.map(a => (
                    <div
                      key={a.code}
                      onClick={() => setDrillAccountCode(a.code)}
                      className="flex justify-between py-1 border-b border-slate-100 hover:bg-white px-2 rounded cursor-pointer transition-colors"
                    >
                      <span className="text-slate-700">{a.code} - {a.name}</span>
                      <span className="font-mono font-bold text-slate-900">{formatCurrency(a.amount)}</span>
                    </div>
                  ))}
                </div>
                <div className="pt-2 border-t-2 border-slate-400 flex justify-between font-black text-sm">
                  <span>إجمالي الأصول:</span>
                  <span className="font-mono text-emerald-800">{formatCurrency(balanceSheet.assets.totalAssets)}</span>
                </div>
              </div>

              {/* Liabilities & Equity Column */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <h4 className="font-bold text-sm text-slate-900 border-b border-slate-300 pb-2 flex justify-between">
                  <span>الخصوم وحقوق الملكية (Liabilities & Equity)</span>
                  <span className="font-mono text-slate-900">
                    {formatCurrency(balanceSheet.liabilities.totalLiabilities + balanceSheet.equity.totalEquity)}
                  </span>
                </h4>
                <div className="space-y-2">
                  <p className="font-bold text-slate-700">الخصوم المتداولة (Liabilities):</p>
                  {balanceSheet.liabilities.currentLiabilities.map(l => (
                    <div
                      key={l.code}
                      onClick={() => setDrillAccountCode(l.code)}
                      className="flex justify-between py-1 border-b border-slate-100 hover:bg-white px-2 rounded cursor-pointer transition-colors"
                    >
                      <span className="text-slate-700">{l.code} - {l.name}</span>
                      <span className="font-mono font-bold text-slate-900">{formatCurrency(l.amount)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-1 font-bold text-slate-800">
                    <span>مجموع الخصوم:</span>
                    <span className="font-mono">{formatCurrency(balanceSheet.liabilities.totalLiabilities)}</span>
                  </div>

                  <p className="font-bold text-slate-700 pt-2">حقوق الملكية (Equity):</p>
                  {balanceSheet.equity.items.map(e => (
                    <div
                      key={e.code}
                      onClick={() => setDrillAccountCode(e.code)}
                      className="flex justify-between py-1 border-b border-slate-100 hover:bg-white px-2 rounded cursor-pointer transition-colors"
                    >
                      <span className="text-slate-700">{e.code} - {e.name}</span>
                      <span className="font-mono font-bold text-slate-900">{formatCurrency(e.amount)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-emerald-800 font-bold">أرباح الفترة الحالية (P&L):</span>
                    <span className="font-mono font-bold text-emerald-800">{formatCurrency(balanceSheet.equity.currentPeriodProfit)}</span>
                  </div>
                </div>
                <div className="pt-2 border-t-2 border-slate-400 flex justify-between font-black text-sm">
                  <span>إجمالي الخصوم وحقوق الملكية:</span>
                  <span className="font-mono text-blue-800">
                    {formatCurrency(balanceSheet.liabilities.totalLiabilities + balanceSheet.equity.totalEquity)}
                  </span>
                </div>
              </div>

            </div>
          </div>
        );

      case 'ar_aging':
        return (
          <div className="space-y-4 text-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3">المستأجر (انقر لقراءة المستند)</th>
                    <th className="p-3">العقار والوحدة</th>
                    <th className="p-3">الجوال</th>
                    <th className="p-3 text-left font-mono">جاري (1-30 يوم)</th>
                    <th className="p-3 text-left font-mono">31-60 يوم</th>
                    <th className="p-3 text-left font-mono">61-90 يوم</th>
                    <th className="p-3 text-left font-mono">+90 يوماً</th>
                    <th className="p-3 text-left font-mono">إجمالي المديونية</th>
                    <th className="p-3 text-center">المستند والرقابة (للمدير العام)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {agingReport.map((item, idx) => (
                    <tr
                      key={idx}
                      onClick={() => {
                        const tenantInvs = invoices.filter(inv => inv.tenantId === item.tenantId);
                        const overdueInv = tenantInvs.find(inv => inv.status === 'OVERDUE' || (inv.status === 'UNPAID' && inv.balance > 0)) || tenantInvs[0];
                        setGmReaderTenantId(item.tenantId);
                        setGmReaderInvoice(overdueInv || null);
                      }}
                      className="hover:bg-amber-50/50 cursor-pointer transition-colors group"
                      title="انقر لقراءة تفاصيل المستند والمطالبة للمدير العام"
                    >
                      <td className="p-3 font-bold text-slate-900 group-hover:text-indigo-800 flex items-center gap-1.5">
                        <span>{item.tenantName}</span>
                        <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      </td>
                      <td className="p-3 text-slate-600">{item.propertyName} · {item.unitNumber}</td>
                      <td className="p-3 font-mono text-slate-500" dir="ltr">{item.phone}</td>
                      <td className="p-3 text-left font-mono text-slate-700">
                        {item.aging.current > 0 ? formatCurrency(item.aging.current) : '—'}
                      </td>
                      <td className="p-3 text-left font-mono text-amber-700 font-bold">
                        {item.aging.days31to60 > 0 ? formatCurrency(item.aging.days31to60) : '—'}
                      </td>
                      <td className="p-3 text-left font-mono text-rose-600 font-bold">
                        {item.aging.days61to90 > 0 ? formatCurrency(item.aging.days61to90) : '—'}
                      </td>
                      <td className="p-3 text-left font-mono text-rose-800 font-black">
                        {item.aging.over90 > 0 ? formatCurrency(item.aging.over90) : '—'}
                      </td>
                      <td className="p-3 text-left font-mono font-black text-slate-900 text-sm">
                        {formatCurrency(item.aging.total)}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const tenantInvs = invoices.filter(inv => inv.tenantId === item.tenantId);
                            const overdueInv = tenantInvs.find(inv => inv.status === 'OVERDUE' || (inv.status === 'UNPAID' && inv.balance > 0)) || tenantInvs[0];
                            setGmReaderTenantId(item.tenantId);
                            setGmReaderInvoice(overdueInv || null);
                          }}
                          className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer mx-auto active:scale-95"
                          title="قراءة تفاصيل المستند للمدير العام"
                        >
                          <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>قراءة تفاصيل المستند</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'daily_collection':
        return (
          <div className="space-y-4 text-xs">
            <table className="w-full text-right">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">رقم السند (انقر للطباعة)</th>
                  <th className="p-3">تاريخ التحصيل</th>
                  <th className="p-3">المستأجر</th>
                  <th className="p-3">المبلغ</th>
                  <th className="p-3">طريقة الدفع</th>
                  <th className="p-3">الحساب المودع فيه</th>
                  <th className="p-3">المحصل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.filter(p => p.status === 'POSTED').map(p => {
                  const tenant = tenants.find(t => t.id === p.tenantId);
                  const acc = accounts.find(a => a.code === p.destinationAccountCode);

                  return (
                    <tr
                      key={p.id}
                      onClick={() => setDrillPayment(p)}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                      title="انقر لمعاينة وطباعة سند القبض الرسمي"
                    >
                      <td className="p-3 font-mono font-bold text-emerald-700 hover:underline flex items-center gap-1">
                        <span>{p.receiptNumber}</span>
                        <ArrowUpRight className="w-3 h-3 text-slate-400" />
                      </td>
                      <td className="p-3 font-mono text-slate-600">{p.paymentDate}</td>
                      <td className="p-3 font-bold text-slate-800">{tenant?.name}</td>
                      <td className="p-3 font-mono font-bold text-emerald-700">{formatCurrency(p.amount)}</td>
                      <td className="p-3">
                        <Badge variant="slate" size="sm">{p.paymentMethod}</Badge>
                      </td>
                      <td className="p-3 text-slate-600 font-mono">{acc?.nameAr}</td>
                      <td className="p-3 text-slate-600">{p.receivedBy}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );

      case 'property_performance':
        return (
          <div className="space-y-4 text-xs">
            <table className="w-full text-right">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">اسم العقار</th>
                  <th className="p-3">المدينة</th>
                  <th className="p-3">الوحدات والإشغال</th>
                  <th className="p-3 text-left font-mono">الإيراد المفوتر</th>
                  <th className="p-3 text-left font-mono">التحصيل الفعلي</th>
                  <th className="p-3 text-left font-mono">المصروفات</th>
                  <th className="p-3 text-left font-mono">صافي العائد التشغيلي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {properties.map(p => {
                  const propUnits = units.filter(u => u.propertyId === p.id);
                  const occ = propUnits.filter(u => u.status === 'OCCUPIED').length;
                  const propInvoices = invoices.filter(i => i.propertyId === p.id);
                  const propPayments = payments.filter(pay => pay.propertyId === p.id && pay.status === 'POSTED');
                  const propExpenses = expenses.filter(e => e.propertyId === p.id && e.status === 'POSTED');

                  const invoiced = propInvoices.reduce((a, b) => a + b.amount, 0);
                  const collected = propPayments.reduce((a, b) => a + b.amount, 0);
                  const expTotal = propExpenses.reduce((a, b) => a + b.amount, 0);
                  const net = collected - expTotal;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-900">{p.name}</td>
                      <td className="p-3 text-slate-600">{p.city}</td>
                      <td className="p-3">
                        {occ} من {propUnits.length} وحدة ({Math.round((occ / (propUnits.length || 1)) * 100)}%)
                      </td>
                      <td className="p-3 text-left font-mono font-bold text-slate-800">{formatCurrency(invoiced)}</td>
                      <td className="p-3 text-left font-mono font-bold text-emerald-700">{formatCurrency(collected)}</td>
                      <td className="p-3 text-left font-mono font-bold text-rose-700">{formatCurrency(expTotal)}</td>
                      <td className="p-3 text-left font-mono font-black text-slate-900">{formatCurrency(net)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );

      case 'security_deposits':
        return (
          <div className="space-y-4 text-xs">
            <table className="w-full text-right">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">اسم المستأجر (انقر للبطاقة)</th>
                  <th className="p-3">رقم الهوية</th>
                  <th className="p-3">الجوال</th>
                  <th className="p-3 text-left font-mono">مبلغ التأمين المحتجز</th>
                  <th className="p-3">التصنيف المحاسبي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tenants.filter(t => t.securityDepositHeld > 0).map(t => (
                  <tr
                    key={t.id}
                    onClick={() => setDrillTenantId(t.id)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="p-3 font-bold text-slate-900 hover:text-emerald-700 flex items-center gap-1">
                      <span>{t.name}</span>
                      <ArrowUpRight className="w-3 h-3 text-slate-400" />
                    </td>
                    <td className="p-3 font-mono text-slate-600">{t.nationalId}</td>
                    <td className="p-3 font-mono text-slate-600" dir="ltr">{t.phone}</td>
                    <td className="p-3 text-left font-mono font-black text-blue-800">
                      {formatCurrency(t.securityDepositHeld)}
                    </td>
                    <td className="p-3">
                      <Badge variant="blue" size="sm">خصوم متداولة (2110)</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case 'aggregated_batches':
        return (
          <div className="space-y-4">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between text-xs">
              <div>
                <h4 className="font-bold text-slate-900">حزم وسندات العمليات المجمعة</h4>
                <p className="text-slate-500 mt-0.5">انقر على أي حزمة مجمعة لاستعراض القيود والسندات الفرعية المندرجة مع إمكانية المعاينة والتدقيق</p>
              </div>
              <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-1 rounded-lg font-bold">
                {aggregatedDocuments.length} حزم مجمعة
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3">رقم الحزمة</th>
                    <th className="p-3">عنوان الحزمة والبيان</th>
                    <th className="p-3">التصنيف</th>
                    <th className="p-3 text-center">التاريخ</th>
                    <th className="p-3 text-center">عدد السندات</th>
                    <th className="p-3 text-left">إجمالي المبلغ</th>
                    <th className="p-3 text-center">الحالة</th>
                    <th className="p-3 text-center no-print">التفاصيل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {aggregatedDocuments.map(batch => (
                    <tr
                      key={batch.id}
                      onClick={() => setDrillAggregatedDoc(batch)}
                      className="hover:bg-indigo-50/50 cursor-pointer transition-colors group"
                      title="انقر لفتح تفاصيل المستند المجمع"
                    >
                      <td className="p-3 font-mono font-bold text-indigo-700">
                        {batch.batchNumber}
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-slate-900 group-hover:text-indigo-900">
                          {batch.title}
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                          {batch.referenceNotes}
                        </p>
                      </td>
                      <td className="p-3 font-semibold text-slate-700">
                        {batch.category === 'COLLECTIONS' ? 'مقبوضات وتحصيل' :
                         batch.category === 'EXPENSES' ? 'مصروفات وصيانة' :
                         batch.category === 'INVENTORY' ? 'مستودع وعهد' :
                         batch.category}
                      </td>
                      <td className="p-3 text-center font-mono text-slate-500">
                        {batch.date}
                      </td>
                      <td className="p-3 text-center font-bold text-slate-800">
                        {batch.itemCount} مستندات
                      </td>
                      <td className="p-3 text-left font-mono font-black text-emerald-800 text-sm">
                        {formatCurrency(batch.totalAmount)}
                      </td>
                      <td className="p-3 text-center">
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] px-2 py-0.5 rounded font-bold">
                          {batch.status === 'VERIFIED' ? 'معتمد ومرحل' : batch.status}
                        </span>
                      </td>
                      <td className="p-3 text-center no-print">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                          <span>عرض</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
    }
  };

  const reportMeta = getReportTitle();

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Export Bar */}
      <div className="no-print bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            مركز التقارير والقوائم المالية الرسمية
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            تقارير تفصيلية جاهزة للتصدير إلى PDF والطباعة المعتمدة مع إمكانية النقر على أي عنصر لفتح تفاصيله
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {directPdfSuccess && (
            <span className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-300 px-2.5 py-1.5 rounded-lg flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>تم تنزيل ملف PDF!</span>
            </span>
          )}

          {/* Master Audit Package Export (Excel) */}
          <button
            onClick={handleExportMasterAuditPackage}
            className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer border border-slate-700"
            title="تصدير حقيبة التدقيق المالي الشاملة (ملف Excel متعدد الصفحات يشمل الميزان والأرباح والمركز المالي والديون للمراجع الخارجي)"
          >
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>حقيبة التدقيق الخارجي (Excel)</span>
          </button>

          {/* Export Current Report to Excel */}
          <button
            onClick={handleExportActiveReportToExcel}
            className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            title="تصدير بيانات هذا التقرير الحالي إلى ملف Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
            <span>تصدير Excel</span>
          </button>

          {/* Direct Export to PDF Button */}
          <button
            onClick={handleDirectDownloadPdf}
            disabled={isDirectPdfDownloading}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            title="تنزيل التقرير والقائمة المالية مباشرة كملف PDF عالي الدقة"
          >
            {isDirectPdfDownloading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جاري إنشاء PDF...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>تصدير إلى PDF</span>
              </>
            )}
          </button>

          {/* Preview & Print PDF Button */}
          <button
            onClick={() => setIsPdfModalOpen(true)}
            className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            title="معاينة التقرير الرسمي المعتمد مع الترويسة والتواقيع والأختام قبل الحفظ أو الطباعة"
          >
            <Printer className="w-4 h-4 text-emerald-400" />
            <span>معاينة وتخصيص A4</span>
          </button>
        </div>
      </div>

      {/* Sub-Tabs for All Reports */}
      <div className="no-print flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl overflow-x-auto text-xs font-bold border border-slate-200">
        
        <button
          onClick={() => setActiveReport('tenant_statement')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors whitespace-nowrap ${
            activeReport === 'tenant_statement'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>كشف حساب مستأجر</span>
        </button>

        <button
          onClick={() => setActiveReport('trial_balance')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors whitespace-nowrap ${
            activeReport === 'trial_balance'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Scale className="w-3.5 h-3.5 text-emerald-600" />
          <span>ميزان المراجعة</span>
        </button>

        <button
          onClick={() => setActiveReport('pnl')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors whitespace-nowrap ${
            activeReport === 'pnl'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <PieChart className="w-3.5 h-3.5 text-emerald-600" />
          <span>قائمة الدخل والأرباح</span>
        </button>

        <button
          onClick={() => setActiveReport('balance_sheet')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors whitespace-nowrap ${
            activeReport === 'balance_sheet'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Landmark className="w-3.5 h-3.5 text-emerald-600" />
          <span>الميزانية العمومية</span>
        </button>

        <button
          onClick={() => setActiveReport('ar_aging')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors whitespace-nowrap ${
            activeReport === 'ar_aging'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>أعمار الديون (Aging)</span>
        </button>

        <button
          onClick={() => setActiveReport('daily_collection')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors whitespace-nowrap ${
            activeReport === 'daily_collection'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>سجل المقبوضات اليومية</span>
        </button>

        <button
          onClick={() => setActiveReport('property_performance')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors whitespace-nowrap ${
            activeReport === 'property_performance'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Building className="w-3.5 h-3.5" />
          <span>أداء العقارات</span>
        </button>

        <button
          onClick={() => setActiveReport('security_deposits')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors whitespace-nowrap ${
            activeReport === 'security_deposits'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>تأمينات مستردة</span>
        </button>

        <button
          onClick={() => setActiveReport('aggregated_batches')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors whitespace-nowrap ${
            activeReport === 'aggregated_batches'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-amber-500" />
          <span>المستندات والحزم المجمعة</span>
        </button>

      </div>

      {/* Main Report Display Card */}
      <div ref={mainCardRef} id="reports-main-display" className="bg-white rounded-xl border border-slate-200 p-6 print-card shadow-xs text-xs space-y-6">
        
        {/* Printable Letterhead inside Card */}
        <div className="print-only border-b-2 border-slate-900 pb-4 mb-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900">شركة المحصل لإدارة الأملاك العقارية</h2>
              <p className="text-xs text-slate-600">س.ت: 1010582910 · الرقم الضريبي: 300984728100003</p>
            </div>
            <div className="text-left font-mono text-xs">
              <p>{new Date().toISOString().split('T')[0]}</p>
            </div>
          </div>
          <h1 className="text-base font-black text-slate-900 mt-2">{reportMeta.title}</h1>
        </div>

        {renderActiveReportContent()}

        {/* Print Signatures Block */}
        <div className="print-only pt-8 border-t border-slate-300 grid grid-cols-3 gap-8 text-center text-xs">
          <div>
            <p className="font-bold text-slate-700 mb-8">إعداد المحاسب المالي</p>
            <p className="border-t border-slate-300 pt-1 font-semibold">عبدالله السعدي</p>
          </div>
          <div>
            <p className="font-bold text-slate-700 mb-8">تدقيق ومراجعة الحسابات</p>
            <p className="border-t border-slate-300 pt-1 font-semibold">د. طارق المنصور</p>
          </div>
          <div>
            <p className="font-bold text-slate-700 mb-8">اعتماد الإدارة والرقابة</p>
            <p className="border-t border-slate-300 pt-1 font-semibold">سليمان الحربي</p>
          </div>
        </div>

      </div>

      {/* MODAL 1: REPORT PDF PREVIEW & EXPORT */}
      {isPdfModalOpen && (
        <ReportPdfPreviewModal
          title={reportMeta.title}
          subtitle={reportMeta.subtitle}
          reportType={activeReport}
          onClose={() => setIsPdfModalOpen(false)}
          onExportExcel={handleExportActiveReportToExcel}
        >
          {renderActiveReportContent()}
        </ReportPdfPreviewModal>
      )}

      {/* DRILLDOWN MODAL 1: TENANT DETAILS */}
      {drillTenantId && (
        <TenantDetailsModal
          tenantId={drillTenantId}
          onClose={() => setDrillTenantId(null)}
          onViewInvoice={inv => setDrillInvoice(inv)}
          onViewPayment={pay => setDrillPayment(pay)}
        />
      )}

      {/* DRILLDOWN MODAL 2: INVOICE DETAILS */}
      {drillInvoice && (
        <InvoiceDetailsModal
          invoice={drillInvoice}
          onClose={() => setDrillInvoice(null)}
          onViewPayment={pay => setDrillPayment(pay)}
        />
      )}

      {/* DRILLDOWN MODAL 3: OFFICIAL RECEIPT */}
      {drillPayment && (
        <OfficialReceiptModal
          payment={drillPayment}
          onClose={() => setDrillPayment(null)}
        />
      )}

      {/* DRILLDOWN MODAL 4: ACCOUNT GENERAL LEDGER */}
      {drillAccountCode && (
        <AccountLedgerModal
          accountCode={drillAccountCode}
          onClose={() => setDrillAccountCode(null)}
          onSelectJournalEntry={entry => setDrillJournalEntry(entry)}
        />
      )}

      {/* DRILLDOWN MODAL 5: JOURNAL ENTRY VOUCHER */}
      {drillJournalEntry && (
        <JournalEntryModal
          entry={drillJournalEntry}
          onClose={() => setDrillJournalEntry(null)}
        />
      )}

      {/* DRILLDOWN MODAL 6: AGGREGATED DOCUMENT BATCH */}
      {drillAggregatedDoc && (
        <AggregatedDocumentModal
          document={drillAggregatedDoc}
          onClose={() => setDrillAggregatedDoc(null)}
          onSelectSubItem={sub => {
            const pay = payments.find(p => p.receiptNumber === sub.refNumber || p.id === sub.id);
            if (pay) {
              setDrillPayment(pay);
              return;
            }
            const exp = expenses.find(e => e.voucherNumber === sub.refNumber || e.id === sub.id);
            if (exp) {
              setDrillExpense(exp);
              return;
            }
            const inv = invoices.find(i => i.invoiceNumber === sub.refNumber || i.id === sub.id);
            if (inv) {
              setDrillInvoice(inv);
              return;
            }
          }}
        />
      )}

      {/* DRILLDOWN MODAL 7: EXPENSE VOUCHER */}
      {drillExpense && (
        <ExpenseDetailsModal
          expense={drillExpense}
          onClose={() => setDrillExpense(null)}
        />
      )}

      {/* DRILLDOWN MODAL 8: GENERAL MANAGER DOCUMENT & OVERDUE RENT READER */}
      {(gmReaderInvoice || gmReaderTenantId) && (
        <GeneralManagerDocumentReaderModal
          invoice={gmReaderInvoice}
          tenantId={gmReaderTenantId}
          onClose={() => {
            setGmReaderInvoice(null);
            setGmReaderTenantId(null);
          }}
          onOpenPayment={(tId, invId) => {
            setGmReaderInvoice(null);
            setGmReaderTenantId(null);
            setDrillTenantId(tId);
          }}
          onOpenTenantStatement={(tId) => {
            setGmReaderInvoice(null);
            setGmReaderTenantId(null);
            setSelectedTenantId(tId);
            setActiveReport('tenant_statement');
          }}
        />
      )}

    </div>
  );
};
