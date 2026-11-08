// تصميم م. أبو أحمد — مصمم ومنفذ Claude — © الحقوق محفوظة
import * as XLSX from 'xlsx';
import {
  Tenant,
  Invoice,
  Payment,
  PropertyExpense,
  Property,
  Unit,
  InventoryItem,
  InventoryTransaction,
  AggregatedDocument,
  TrialBalanceRow,
  ProfitLossReport,
  BalanceSheetReport,
  TenantAgingItem
} from '../types';

export interface TrialBalanceResult {
  rows: TrialBalanceRow[];
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
  difference: number;
}

// Header details for official accounting documents
const COMPANY_NAME = 'شركة المحصل لإدارة وتشغيل الأملاك العقارية';
const CR_NUMBER = 'س.ت: 1010582910';
const VAT_NUMBER = 'الرقم الضريبي: 300984728100003';
const CURRENCY_LABEL = 'العملة: ريال سعودي (SAR)';

/**
 * Utility to download an XLSX workbook with proper RTL direction
 */
export function downloadWorkbook(wb: XLSX.WorkBook, fileName: string) {
  // Ensure RTL on all sheets
  wb.SheetNames.forEach(sheetName => {
    const ws = wb.Sheets[sheetName];
    if (ws) {
      if (!ws['!views']) {
        ws['!views'] = [];
      }
      ws['!views'].push({ RTL: true });
    }
  });

  const fullFileName = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
  XLSX.writeFile(wb, fullFileName, { compression: true });
}

/**
 * Format date for file names
 */
function getTimestamp(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

/**
 * 1. Export Tenant Statement to Excel
 */
export function exportTenantStatementToExcel(
  tenant: Tenant | undefined,
  statement: Array<{
    date: string;
    type: 'INVOICE' | 'PAYMENT' | 'REVERSAL' | string;
    refNumber: string;
    description: string;
    debit: number;
    credit: number;
    balance: number;
  }>
) {
  const wb = XLSX.utils.book_new();

  const titleRows = [
    [COMPANY_NAME],
    [`${CR_NUMBER} · ${VAT_NUMBER} · ${CURRENCY_LABEL}`],
    [`كشف حساب تحليلي للمستأجر: ${tenant?.name || '—'}`],
    [
      `الهوية: ${tenant?.nationalId || '—'}`,
      `الجوال: ${tenant?.phone || '—'}`,
      `الرصيد القائم: ${(tenant?.balance || 0).toLocaleString()} ر.س`,
      `تأمين الضمان: ${(tenant?.securityDepositHeld || 0).toLocaleString()} ر.س`
    ],
    [`تاريخ الاستخراج: ${new Date().toLocaleDateString('ar-SA')} ${new Date().toLocaleTimeString('ar-SA')}`],
    [] // Blank row
  ];

  const headers = ['التاريخ', 'نوع الحركة', 'الرقم المرجعي', 'البيان والشرح', 'مدين (استحقاق)', 'دائن (سداد)', 'الرصيد المستمر'];

  const dataRows = statement.map(row => [
    row.date,
    row.type === 'INVOICE' ? 'فاتورة إيجار' : row.type === 'PAYMENT' ? 'سند قبض' : 'عكس سند',
    row.refNumber,
    row.description,
    row.debit || 0,
    row.credit || 0,
    row.balance || 0
  ]);

  // Summary Row
  const totalDebit = statement.reduce((s, r) => s + (r.debit || 0), 0);
  const totalCredit = statement.reduce((s, r) => s + (r.credit || 0), 0);
  const summaryRow = ['المجموع الإجمالي', '', '', '', totalDebit, totalCredit, (tenant?.balance || 0)];

  const ws = XLSX.utils.aoa_to_sheet([...titleRows, headers, ...dataRows, summaryRow]);

  // Set column widths
  ws['!cols'] = [
    { wch: 14 }, // Date
    { wch: 14 }, // Type
    { wch: 18 }, // Ref
    { wch: 38 }, // Desc
    { wch: 16 }, // Debit
    { wch: 16 }, // Credit
    { wch: 18 }  // Balance
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'كشف الحساب');
  const safeName = tenant?.name ? tenant.name.replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '_') : 'مستأجر';
  downloadWorkbook(wb, `كشف_حساب_${safeName}_${getTimestamp()}`);
}

/**
 * 2. Export Trial Balance to Excel
 */
export function exportTrialBalanceToExcel(trialBalance: TrialBalanceResult) {
  const wb = XLSX.utils.book_new();

  const titleRows = [
    [COMPANY_NAME],
    [`${CR_NUMBER} · ${VAT_NUMBER} · ${CURRENCY_LABEL}`],
    ['ميزان المراجعة بالأرصدة والمجاميع (Trial Balance)'],
    [`تاريخ الاستخراج: ${new Date().toLocaleDateString('ar-SA')} ${new Date().toLocaleTimeString('ar-SA')}`],
    ['معتمد لمطابقة الدفاتر المحاسبية وأعمال التدقيق الخارجي'],
    []
  ];

  const headers = [
    'رمز الحساب',
    'اسم الحساب بالعربية',
    'تصنيف الحساب',
    'حركات مدين (Debit)',
    'حركات دائن (Credit)',
    'رصيد ختامي مدين',
    'رصيد ختامي دائن'
  ];

  const dataRows = trialBalance.rows.map((row: TrialBalanceRow) => [
    row.accountCode,
    row.accountNameAr,
    row.type,
    row.periodDebit || 0,
    row.periodCredit || 0,
    row.closingDebit || 0,
    row.closingCredit || 0
  ]);

  const totalPeriodDebit = trialBalance.rows.reduce((s: number, r: TrialBalanceRow) => s + r.periodDebit, 0);
  const totalPeriodCredit = trialBalance.rows.reduce((s: number, r: TrialBalanceRow) => s + r.periodCredit, 0);

  const summaryRow = [
    'المجموع المتوازن (Total Balance)',
    '',
    '',
    totalPeriodDebit,
    totalPeriodCredit,
    trialBalance.totalDebit,
    trialBalance.totalCredit
  ];

  const ws = XLSX.utils.aoa_to_sheet([...titleRows, headers, ...dataRows, summaryRow]);

  ws['!cols'] = [
    { wch: 12 },
    { wch: 32 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'ميزان المراجعة');
  downloadWorkbook(wb, `ميزان_المراجعة_${getTimestamp()}`);
}

/**
 * 3. Export Profit & Loss (Income Statement) to Excel
 */
export function exportPnLToExcel(pnl: ProfitLossReport) {
  const wb = XLSX.utils.book_new();

  const titleRows = [
    [COMPANY_NAME],
    [`${CR_NUMBER} · ${VAT_NUMBER} · ${CURRENCY_LABEL}`],
    ['قائمة الدخل والأرباح والخسائر (Income Statement / P&L)'],
    [`تاريخ الاستخراج: ${new Date().toLocaleDateString('ar-SA')} ${new Date().toLocaleTimeString('ar-SA')}`],
    []
  ];

  const rows: any[][] = [
    ...titleRows,
    ['البند المحاسبي', 'رمز الحساب', 'المبلغ (SAR)'],
    ['--- الإيرادات التشغيلية (Operating Revenues) ---', '', ''],
    ['إيرادات تأجير الوحدات العقارية', '4100', pnl.rentalIncome],
    ['إيرادات خدمات تشغيلية أخرى', '4200', pnl.otherIncome],
    ['إجمالي الإيرادات التشغيلية', '', pnl.totalRevenue],
    [],
    ['--- المصروفات التشغيلية (Operating Expenses) ---', '', ''],
    ['مصروفات الصيانة والترميم', '5100', pnl.maintenanceExpense],
    ['مصروفات الخدمات والمرافق', '5200', pnl.utilitiesExpense],
    ['أتعاب إدارة الأملاك', '5400', pnl.managementExpense],
    ['مصروفات تشغيلية وتأمينية أخرى', '5500', pnl.otherExpenses],
    ['إجمالي المصروفات التشغيلية', '', pnl.totalExpenses],
    [],
    ['صافي الدخل والأرباح التشغيلية (Net Operating Income)', '', pnl.netOperatingIncome]
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);

  ws['!cols'] = [
    { wch: 42 },
    { wch: 14 },
    { wch: 22 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'قائمة الدخل');
  downloadWorkbook(wb, `قائمة_الدخل_والأرباح_${getTimestamp()}`);
}

/**
 * 4. Export Balance Sheet to Excel
 */
export function exportBalanceSheetToExcel(bs: BalanceSheetReport) {
  const wb = XLSX.utils.book_new();

  const titleRows = [
    [COMPANY_NAME],
    [`${CR_NUMBER} · ${VAT_NUMBER} · ${CURRENCY_LABEL}`],
    ['الميزانية العمومية وقائمة المركز المالي (Balance Sheet)'],
    [`تاريخ الاستخراج: ${new Date().toLocaleDateString('ar-SA')} ${new Date().toLocaleTimeString('ar-SA')}`],
    ['الأصول = الخصوم + حقوق الملكية'],
    []
  ];

  const rows: any[][] = [
    ...titleRows,
    ['القسم', 'البند المحاسبي', 'المبلغ (SAR)'],
    ['الأصول (Assets)', 'الأصول المتداولة (النقد والمدينون)', bs.assets.totalCurrentAssets],
    ['الأصول (Assets)', 'الأصول الثابتة', bs.assets.totalFixedAssets],
    ['الأصول (Assets)', 'إجمالي الأصول (Total Assets)', bs.assets.totalAssets],
    [],
    ['الخصوم (Liabilities)', 'الخصوم المتداولة (التأمينات والإيرادات المقدمة)', bs.liabilities.totalCurrentLiabilities],
    ['الخصوم (Liabilities)', 'إجمالي الخصوم (Total Liabilities)', bs.liabilities.totalLiabilities],
    [],
    ['حقوق الملكية (Equity)', 'صافي أرباح الفترة التشغيلية', bs.equity.currentPeriodProfit],
    ['حقوق الملكية (Equity)', 'إجمالي حقوق الملكية (Total Equity)', bs.equity.totalEquity],
    [],
    ['المعادلة المحاسبية', 'إجمالي الخصوم وحقوق الملكية', bs.liabilities.totalLiabilities + bs.equity.totalEquity],
    ['حالة التوازن', bs.isBalanced ? 'الميزانية متوازنة 100%' : 'يوجد فارق غير متوازن', bs.difference]
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);

  ws['!cols'] = [
    { wch: 22 },
    { wch: 38 },
    { wch: 22 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'الميزانية العمومية');
  downloadWorkbook(wb, `الميزانية_العمومية_${getTimestamp()}`);
}

/**
 * 5. Export A/R Aging Report to Excel
 */
export function exportAgingReportToExcel(agingReport: TenantAgingItem[]) {
  const wb = XLSX.utils.book_new();

  const titleRows = [
    [COMPANY_NAME],
    [`${CR_NUMBER} · ${VAT_NUMBER} · ${CURRENCY_LABEL}`],
    ['تقرير أعمار الديون والمتأخرات (A/R Aging Report)'],
    [`تاريخ الاستخراج: ${new Date().toLocaleDateString('ar-SA')} ${new Date().toLocaleTimeString('ar-SA')}`],
    ['تحليل فترات تأخر سداد الإيجارات للمستأجرين (30، 60، 90، 90+ يوماً)'],
    []
  ];

  const headers = [
    'اسم المستأجر',
    'رقم الجوال',
    'العقار',
    'رقم الوحدة',
    'حالي (0 - 30 يوماً)',
    '31 - 60 يوماً',
    '61 - 90 يوماً',
    'أكثر من 90 يوماً',
    'إجمالي المتأخر'
  ];

  const dataRows = agingReport.map(row => [
    row.tenantName,
    row.phone,
    row.propertyName,
    row.unitNumber,
    row.aging.current,
    row.aging.days31to60,
    row.aging.days61to90,
    row.aging.over90,
    row.aging.total
  ]);

  const totalCurrent = agingReport.reduce((s, r) => s + r.aging.current, 0);
  const total31_60 = agingReport.reduce((s, r) => s + r.aging.days31to60, 0);
  const total61_90 = agingReport.reduce((s, r) => s + r.aging.days61to90, 0);
  const total90Plus = agingReport.reduce((s, r) => s + r.aging.over90, 0);
  const grandTotal = agingReport.reduce((s, r) => s + r.aging.total, 0);

  const summaryRow = [
    'المجموع الإجمالي',
    '',
    '',
    '',
    totalCurrent,
    total31_60,
    total61_90,
    total90Plus,
    grandTotal
  ];

  const ws = XLSX.utils.aoa_to_sheet([...titleRows, headers, ...dataRows, summaryRow]);

  ws['!cols'] = [
    { wch: 24 },
    { wch: 16 },
    { wch: 20 },
    { wch: 14 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 16 },
    { wch: 18 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'أعمار الديون');
  downloadWorkbook(wb, `أعمار_الديون_${getTimestamp()}`);
}

/**
 * 6. Export Daily Collections to Excel
 */
export function exportDailyCollectionsToExcel(payments: Payment[]) {
  const wb = XLSX.utils.book_new();

  const titleRows = [
    [COMPANY_NAME],
    [`${CR_NUMBER} · ${VAT_NUMBER} · ${CURRENCY_LABEL}`],
    ['تقرير سجل المقبوضات والتحصيل اليومي (Daily Collections Log)'],
    [`تاريخ الاستخراج: ${new Date().toLocaleDateString('ar-SA')} ${new Date().toLocaleTimeString('ar-SA')}`],
    []
  ];

  const headers = [
    'رقم السند',
    'التاريخ',
    'المبلغ المحصل',
    'طريقة التحصيل',
    'الغرض / الوصف',
    'رقم المرجع البنكي',
    'المستلم / المستخدم',
    'الحالة'
  ];

  const postedPayments = payments.filter(p => p.status === 'POSTED');

  const dataRows = postedPayments.map(p => [
    p.receiptNumber,
    p.paymentDate,
    p.amount,
    p.paymentMethod === 'BANK_TRANSFER' ? 'تحويل بنكي' :
    p.paymentMethod === 'CASH' ? 'نقدي (صندوق)' :
    p.paymentMethod === 'POS' ? 'مدى / نقاط بيع' : 'شيك مصرفي',
    p.purpose === 'RENT_INVOICE' ? 'سداد قسط إيجار' :
    p.purpose === 'SECURITY_DEPOSIT' ? 'تأمين ضمان مسترد' : 'دفعة مقدمة',
    p.bankReference || '—',
    p.receivedBy || '—',
    'معتمد ومرحل'
  ]);

  const totalAmount = postedPayments.reduce((s, p) => s + p.amount, 0);
  const summaryRow = ['المجموع الإجمالي للمقبوضات', '', totalAmount, '', '', '', '', ''];

  const ws = XLSX.utils.aoa_to_sheet([...titleRows, headers, ...dataRows, summaryRow]);

  ws['!cols'] = [
    { wch: 18 },
    { wch: 14 },
    { wch: 16 },
    { wch: 18 },
    { wch: 22 },
    { wch: 20 },
    { wch: 18 },
    { wch: 14 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'سجل المقبوضات');
  downloadWorkbook(wb, `سجل_التحصيل_والمقبوضات_${getTimestamp()}`);
}

/**
 * 7. Export Property Performance to Excel
 */
export function exportPropertyPerformanceToExcel(
  properties: Property[],
  units: Unit[],
  invoices: Invoice[],
  expenses: PropertyExpense[]
) {
  const wb = XLSX.utils.book_new();

  const titleRows = [
    [COMPANY_NAME],
    [`${CR_NUMBER} · ${VAT_NUMBER} · ${CURRENCY_LABEL}`],
    ['تقرير الأداء المالي والتشغيلي للعقارات والأبراج'],
    [`تاريخ الاستخراج: ${new Date().toLocaleDateString('ar-SA')} ${new Date().toLocaleTimeString('ar-SA')}`],
    []
  ];

  const headers = [
    'اسم العقار',
    'المدينة',
    'إجمالي الوحدات',
    'الوحدات المؤجرة',
    'نسبة الإشغال',
    'إجمالي المطالبات والفواتير',
    'إجمالي التحصيلات الفعلية',
    'إجمالي المصروفات التشغيلية',
    'صافي العائد التشغيلي (NOI)'
  ];

  const dataRows = properties.map(prop => {
    const propUnits = units.filter(u => u.propertyId === prop.id);
    const occupiedCount = propUnits.filter(u => u.status === 'OCCUPIED').length;
    const occRate = propUnits.length > 0 ? Math.round((occupiedCount / propUnits.length) * 100) : 0;

    const propInvoices = invoices.filter(inv => inv.propertyId === prop.id);
    const totalInvoiced = propInvoices.reduce((s, inv) => s + inv.amount, 0);
    const totalCollected = propInvoices.reduce((s, inv) => s + inv.paidAmount, 0);

    const propExpenses = expenses.filter(e => e.propertyId === prop.id && e.status === 'POSTED');
    const totalExp = propExpenses.reduce((s, e) => s + e.amount, 0);
    const netReturn = totalCollected - totalExp;

    return [
      prop.name,
      prop.city,
      propUnits.length,
      occupiedCount,
      `${occRate}%`,
      totalInvoiced,
      totalCollected,
      totalExp,
      netReturn
    ];
  });

  const ws = XLSX.utils.aoa_to_sheet([...titleRows, headers, ...dataRows]);

  ws['!cols'] = [
    { wch: 26 },
    { wch: 18 },
    { wch: 14 },
    { wch: 16 },
    { wch: 14 },
    { wch: 22 },
    { wch: 22 },
    { wch: 22 },
    { wch: 24 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'أداء العقارات');
  downloadWorkbook(wb, `أداء_العقارات_التشغيلي_${getTimestamp()}`);
}

/**
 * 8. Export Security Deposits (Liabilities) to Excel
 */
export function exportSecurityDepositsToExcel(tenants: Tenant[], units: Unit[], properties: Property[]) {
  const wb = XLSX.utils.book_new();

  const titleRows = [
    [COMPANY_NAME],
    [`${CR_NUMBER} · ${VAT_NUMBER} · ${CURRENCY_LABEL}`],
    ['تقرير التزامات أمانات الضمان المستردة (Security Deposits Held)'],
    ['حساب الخصوم المتداولة 2110 - أمانات مستحقة للمستأجرين عند إخلاء الوحدات'],
    [`تاريخ الاستخراج: ${new Date().toLocaleDateString('ar-SA')} ${new Date().toLocaleTimeString('ar-SA')}`],
    []
  ];

  const headers = [
    'اسم المستأجر',
    'رقم الهوية',
    'رقم الجوال',
    'مبلغ الضمان المحتجز (SAR)',
    'رصيد الإيجار القائم (SAR)',
    'صافي الذمة بعد مقاصة التأمين',
    'الحالة'
  ];

  const relevantTenants = tenants.filter(t => (t.securityDepositHeld || 0) > 0 || t.balance > 0);

  const dataRows = relevantTenants.map(t => {
    const deposit = t.securityDepositHeld || 0;
    const balance = t.balance || 0;
    const net = deposit - balance;
    return [
      t.name,
      t.nationalId,
      t.phone,
      deposit,
      balance,
      net,
      deposit >= balance ? 'مغطى بالكامل بالتأمين' : 'يوجد عجز في التأمين'
    ];
  });

  const totalDeposits = relevantTenants.reduce((s, t) => s + (t.securityDepositHeld || 0), 0);
  const totalBalances = relevantTenants.reduce((s, t) => s + (t.balance || 0), 0);
  const summaryRow = ['المجموع الإجمالي', '', '', totalDeposits, totalBalances, totalDeposits - totalBalances, ''];

  const ws = XLSX.utils.aoa_to_sheet([...titleRows, headers, ...dataRows, summaryRow]);

  ws['!cols'] = [
    { wch: 28 },
    { wch: 16 },
    { wch: 16 },
    { wch: 22 },
    { wch: 22 },
    { wch: 24 },
    { wch: 20 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'أمانات التأمين');
  downloadWorkbook(wb, `أمانات_التأمين_المستردة_${getTimestamp()}`);
}

/**
 * 9. Export Aggregated Batches & Documents to Excel
 */
export function exportAggregatedBatchesToExcel(batches: AggregatedDocument[]) {
  const wb = XLSX.utils.book_new();

  const titleRows = [
    [COMPANY_NAME],
    [`${CR_NUMBER} · ${VAT_NUMBER} · ${CURRENCY_LABEL}`],
    ['سجل الحزم والمستندات المجمعة (Aggregated Batches)'],
    [`تاريخ الاستخراج: ${new Date().toLocaleDateString('ar-SA')} ${new Date().toLocaleTimeString('ar-SA')}`],
    []
  ];

  const headers = [
    'رقم الحزمة',
    'عنوان الحزمة',
    'التصنيف',
    'التاريخ',
    'عدد المستندات الفرعية',
    'إجمالي المبلغ (SAR)',
    'ملاحظات المرجع',
    'الحالة'
  ];

  const dataRows = batches.map(b => [
    b.batchNumber,
    b.title,
    b.category === 'COLLECTIONS' ? 'حزمة مقبوضات مجمعة' :
    b.category === 'EXPENSES' ? 'حزمة مصروفات وفواتير مجمعة' :
    b.category === 'INVOICES' ? 'حزمة مطالبات إيجارية' :
    b.category === 'INVENTORY' ? 'حركة تسليم مستودع مجمعة' : 'حزمة قيود مجمعة',
    b.date,
    b.itemCount,
    b.totalAmount,
    b.referenceNotes,
    b.status === 'VERIFIED' ? 'معتمد ومحقق' : b.status === 'SETTLED' ? 'مسوى بالكامل' : 'قيد المعالجة'
  ]);

  const totalAmount = batches.reduce((s, b) => s + b.totalAmount, 0);
  const totalItems = batches.reduce((s, b) => s + b.itemCount, 0);
  const summaryRow = ['المجموع الإجمالي', '', '', '', totalItems, totalAmount, '', ''];

  const ws = XLSX.utils.aoa_to_sheet([...titleRows, headers, ...dataRows, summaryRow]);

  ws['!cols'] = [
    { wch: 18 },
    { wch: 32 },
    { wch: 22 },
    { wch: 14 },
    { wch: 18 },
    { wch: 18 },
    { wch: 30 },
    { wch: 16 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'الحزم المجمعة');
  downloadWorkbook(wb, `سجل_الحزم_المجمعة_${getTimestamp()}`);
}

/**
 * 10. Master External Audit Package (حقيبة المراجعة والتدقيق المالي الشاملة)
 * Generates a complete multi-sheet Excel workbook containing all financial schedules
 * for external auditors and the General Manager!
 */
export function exportMasterAuditPackageToExcel(params: {
  trialBalance: TrialBalanceResult;
  pnl: ProfitLossReport;
  balanceSheet: BalanceSheetReport;
  agingReport: TenantAgingItem[];
  payments: Payment[];
  expenses: PropertyExpense[];
  aggregatedDocuments: AggregatedDocument[];
  inventoryItems: InventoryItem[];
}) {
  const wb = XLSX.utils.book_new();

  // 1. Cover / Executive Summary Sheet
  const summaryWs = XLSX.utils.aoa_to_sheet([
    [COMPANY_NAME],
    [`${CR_NUMBER} · ${VAT_NUMBER} · ${CURRENCY_LABEL}`],
    ['حقيبة المراجعة والتدقيق المالي الشاملة (External Audit & Compliance Package)'],
    [`تاريخ وتوقيت التصدير: ${new Date().toLocaleDateString('ar-SA')} ${new Date().toLocaleTimeString('ar-SA')}`],
    ['إشراف ورقابة: المدير العام المشرف على النظام'],
    [],
    ['فهرس القوائم والجداول المالية المرفقة:'],
    ['1. ميزان المراجعة بالأرصدة والمجاميع (Trial Balance)'],
    ['2. قائمة الدخل والأرباح التشغيلية (Profit & Loss / P&L)'],
    ['3. الميزانية العمومية والمركز المالي (Balance Sheet)'],
    ['4. جدول أعمار الديون والمتأخرات (A/R Aging Schedule)'],
    ['5. سجل المقبوضات والتحصيل النقدي والبنكي (Receipts Log)'],
    ['6. سجل المصروفات وسندات الصرف المعتمدة (Expenses Log)'],
    ['7. سجل الحزم والمستندات المجمعة (Aggregated Batches)'],
    ['8. جرد الأصناف وتقييم المستودع (Inventory Valuation)'],
    [],
    ['ملخص المؤشرات المالية الرئيسية:'],
    ['إجمالي إيرادات التأجير والتشغيل', `${params.pnl.totalRevenue.toLocaleString()} ر.س`],
    ['إجمالي المصروفات التشغيلية', `${params.pnl.totalExpenses.toLocaleString()} ر.س`],
    ['صافي الدخل التشغيلي المحقق (NOI)', `${params.pnl.netOperatingIncome.toLocaleString()} ر.س`],
    ['إجمالي أصول المركز المالي', `${params.balanceSheet.assets.totalAssets.toLocaleString()} ر.س`],
    ['إجمالي التحصيلات النقدية المعتمدة', `${params.payments.filter(p => p.status === 'POSTED').reduce((s, p) => s + p.amount, 0).toLocaleString()} ر.س`],
    ['إجمالي المتأخرات القائمة على المستأجرين', `${params.agingReport.reduce((s, a) => s + a.aging.total, 0).toLocaleString()} ر.س`]
  ]);
  summaryWs['!cols'] = [{ wch: 38 }, { wch: 28 }];
  XLSX.utils.book_append_sheet(wb, summaryWs, 'الملخص التنفيذي');

  // 2. Trial Balance Sheet
  const tbHeaders = ['رمز الحساب', 'اسم الحساب', 'التصنيف', 'حركات مدين', 'حركات دائن', 'رصيد ختامي مدين', 'رصيد ختامي دائن'];
  const tbRows = params.trialBalance.rows.map((r: TrialBalanceRow) => [
    r.accountCode,
    r.accountNameAr,
    r.type,
    r.periodDebit,
    r.periodCredit,
    r.closingDebit,
    r.closingCredit
  ]);
  const tbSummary = [
    'المجموع المتوازن',
    '',
    '',
    params.trialBalance.rows.reduce((s: number, r: TrialBalanceRow) => s + r.periodDebit, 0),
    params.trialBalance.rows.reduce((s: number, r: TrialBalanceRow) => s + r.periodCredit, 0),
    params.trialBalance.totalDebit,
    params.trialBalance.totalCredit
  ];
  const tbWs = XLSX.utils.aoa_to_sheet([['ميزان المراجعة'], [], tbHeaders, ...tbRows, tbSummary]);
  tbWs['!cols'] = [{ wch: 12 }, { wch: 30 }, { wch: 18 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, tbWs, 'ميزان المراجعة');

  // 3. Profit & Loss Sheet
  const pnlRows = [
    ['قائمة الدخل والأرباح والخسائر'],
    [],
    ['البند', 'الرمز', 'المبلغ (SAR)'],
    ['إيرادات التأجير', '4100', params.pnl.rentalIncome],
    ['إيرادات الخدمات', '4200', params.pnl.otherIncome],
    ['إجمالي الإيرادات', '', params.pnl.totalRevenue],
    [],
    ['مصروفات الصيانة', '5100', params.pnl.maintenanceExpense],
    ['مصروفات الخدمات والمرافق', '5200', params.pnl.utilitiesExpense],
    ['أتعاب إدارة الأملاك', '5400', params.pnl.managementExpense],
    ['مصروفات أخرى', '5500', params.pnl.otherExpenses],
    ['إجمالي المصروفات', '', params.pnl.totalExpenses],
    [],
    ['صافي الدخل التشغيلي', '', params.pnl.netOperatingIncome]
  ];
  const pnlWs = XLSX.utils.aoa_to_sheet(pnlRows);
  pnlWs['!cols'] = [{ wch: 36 }, { wch: 12 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, pnlWs, 'قائمة الدخل');

  // 4. Balance Sheet
  const bsRows = [
    ['الميزانية العمومية وقائمة المركز المالي'],
    [],
    ['القسم', 'البند', 'المبلغ (SAR)'],
    ['الأصول', 'الأصول المتداولة (النقد والمدينون)', params.balanceSheet.assets.totalCurrentAssets],
    ['الأصول', 'الأصول الثابتة', params.balanceSheet.assets.totalFixedAssets],
    ['الأصول', 'إجمالي الأصول', params.balanceSheet.assets.totalAssets],
    [],
    ['الخصوم', 'الخصوم المتداولة', params.balanceSheet.liabilities.totalCurrentLiabilities],
    ['الخصوم', 'إجمالي الخصوم', params.balanceSheet.liabilities.totalLiabilities],
    [],
    ['حقوق الملكية', 'صافي أرباح الفترة', params.balanceSheet.equity.currentPeriodProfit],
    ['حقوق الملكية', 'إجمالي حقوق الملكية', params.balanceSheet.equity.totalEquity],
    [],
    ['المجموع', 'الخصوم + حقوق الملكية', params.balanceSheet.liabilities.totalLiabilities + params.balanceSheet.equity.totalEquity]
  ];
  const bsWs = XLSX.utils.aoa_to_sheet(bsRows);
  bsWs['!cols'] = [{ wch: 20 }, { wch: 34 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, bsWs, 'الميزانية العمومية');

  // 5. Aging Sheet
  const agingHeaders = ['المستأجر', 'الجوال', 'العقار', 'الوحدة', 'حالي (0-30)', '31-60', '61-90', '90+', 'الإجمالي'];
  const agingRows = params.agingReport.map(a => [
    a.tenantName,
    a.phone,
    a.propertyName,
    a.unitNumber,
    a.aging.current,
    a.aging.days31to60,
    a.aging.days61to90,
    a.aging.over90,
    a.aging.total
  ]);
  const agingWs = XLSX.utils.aoa_to_sheet([['جدول أعمار الديون والمتأخرات'], [], agingHeaders, ...agingRows]);
  agingWs['!cols'] = [{ wch: 22 }, { wch: 14 }, { wch: 20 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, agingWs, 'أعمار الديون');

  // 6. Receipts Sheet
  const payHeaders = ['رقم السند', 'التاريخ', 'المبلغ', 'طريقة السداد', 'الغرض', 'المرجع البنكي'];
  const payRows = params.payments.filter(p => p.status === 'POSTED').map(p => [
    p.receiptNumber,
    p.paymentDate,
    p.amount,
    p.paymentMethod,
    p.purpose,
    p.bankReference || '—'
  ]);
  const payWs = XLSX.utils.aoa_to_sheet([['سجل المقبوضات المعتمدة'], [], payHeaders, ...payRows]);
  payWs['!cols'] = [{ wch: 18 }, { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 20 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, payWs, 'سجل المقبوضات');

  // 7. Inventory Sheet
  const invHeaders = ['رمز الصنف', 'اسم الصنف', 'التصنيف', 'الكمية المتوفرة', 'سعر الوحدة', 'إجمالي القيمة', 'المستودع'];
  const invRows = params.inventoryItems.map(i => [
    i.itemCode,
    i.name,
    i.category,
    i.quantityOnHand,
    i.unitPrice,
    i.totalValue,
    i.warehouseLocation
  ]);
  const invWs = XLSX.utils.aoa_to_sheet([['جرد المستودع وتقييم المخزون'], [], invHeaders, ...invRows]);
  invWs['!cols'] = [{ wch: 14 }, { wch: 26 }, { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, invWs, 'جرد المستودع');

  downloadWorkbook(wb, `حقيبة_التدقيق_المالي_الشاملة_${getTimestamp()}`);
}

/**
 * 11. Export Generic Operational Tables (Invoices, Expenses, Inventory, etc.)
 */
export function exportInvoicesToExcel(invoices: Invoice[]) {
  const wb = XLSX.utils.book_new();
  const headers = ['رقم الفاتورة', 'تاريخ الاستحقاق', 'بداية الفترة', 'نهاية الفترة', 'المبلغ المستحق', 'المبلغ المسدد', 'الرصيد المتبقي', 'الحالة'];
  const rows = invoices.map(inv => [
    inv.invoiceNumber,
    inv.dueDate,
    inv.periodStart,
    inv.periodEnd,
    inv.amount,
    inv.paidAmount,
    inv.balance,
    inv.status === 'PAID' ? 'مسددة بالكامل' : inv.status === 'PARTIAL' ? 'سداد جزئي' : inv.status === 'OVERDUE' ? 'متأخرة' : 'مستحقة'
  ]);
  const ws = XLSX.utils.aoa_to_sheet([[COMPANY_NAME], ['سجل فواتير الإيجار والمطالبات المالية'], [], headers, ...rows]);
  ws['!cols'] = [{ wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, ws, 'الفواتير');
  downloadWorkbook(wb, `سجل_الفواتير_${getTimestamp()}`);
}

export function exportExpensesToExcel(expenses: PropertyExpense[]) {
  const wb = XLSX.utils.book_new();
  const headers = ['رقم سند الصرف', 'التاريخ', 'التصنيف', 'المبلغ', 'اسم المستفيد / المورد', 'طريقة الدفع', 'الشرح والبيان', 'الحالة'];
  const rows = expenses.map(e => [
    e.voucherNumber,
    e.date,
    e.category,
    e.amount,
    e.payee || '—',
    e.paymentMethod,
    e.description,
    e.status === 'POSTED' ? 'معتمد ومرحل' : 'ملغي'
  ]);
  const ws = XLSX.utils.aoa_to_sheet([[COMPANY_NAME], ['سجل المصروفات وسندات الصرف المعتمدة'], [], headers, ...rows]);
  ws['!cols'] = [{ wch: 18 }, { wch: 14 }, { wch: 18 }, { wch: 16 }, { wch: 22 }, { wch: 16 }, { wch: 34 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, ws, 'المصروفات');
  downloadWorkbook(wb, `سجل_المصروفات_${getTimestamp()}`);
}

export function exportInventoryToExcel(items: InventoryItem[], transactions: InventoryTransaction[]) {
  const wb = XLSX.utils.book_new();
  
  // Sheet 1: Stock items
  const itemHeaders = ['رمز الصنف', 'اسم الصنف', 'التصنيف', 'الرصيد المتوفر', 'حد الطلب الأدنى', 'سعر الوحدة', 'إجمالي القيمة', 'المستودع'];
  const itemRows = items.map(i => [
    i.itemCode,
    i.name,
    i.category,
    i.quantityOnHand,
    i.minimumThreshold,
    i.unitPrice,
    i.totalValue,
    i.warehouseLocation
  ]);
  const itemsWs = XLSX.utils.aoa_to_sheet([[COMPANY_NAME], ['جرد الأصناف والأرصدة المستودعية'], [], itemHeaders, ...itemRows]);
  itemsWs['!cols'] = [{ wch: 14 }, { wch: 26 }, { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, itemsWs, 'أرصدة الأصناف');

  // Sheet 2: Movement Log
  const txHeaders = ['رقم الحركة', 'التاريخ', 'اسم الصنف', 'نوع الحركة', 'الكمية', 'سعر الوحدة', 'المبلغ الإجمالي', 'المستلم', 'المسؤول', 'البيان'];
  const txRows = transactions.map(t => [
    t.documentNumber,
    t.date,
    t.itemName,
    t.type === 'INBOUND' ? 'توريد / إضافة' : t.type === 'OUTBOUND' ? 'صرف لموقع' : 'تسوية عهدة',
    t.quantity,
    t.unitPrice,
    t.totalAmount,
    t.recipientName,
    t.issuedBy,
    t.notes || '—'
  ]);
  const txWs = XLSX.utils.aoa_to_sheet([[COMPANY_NAME], ['سجل الحركات المستودعية (وارد / صادر)'], [], txHeaders, ...txRows]);
  txWs['!cols'] = [{ wch: 18 }, { wch: 14 }, { wch: 24 }, { wch: 16 }, { wch: 12 }, { wch: 14 }, { wch: 16 }, { wch: 20 }, { wch: 18 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, txWs, 'حركات المستودع');

  downloadWorkbook(wb, `سجل_المستودع_والأصناف_${getTimestamp()}`);
}

export function exportAuditTrailToExcel(auditLogs: Array<{
  timestamp: string;
  actorName: string;
  actorRole: string;
  action: string;
  entity: string;
  entityId?: string;
  details: string;
}>) {
  const wb = XLSX.utils.book_new();
  const headers = ['التاريخ والوقت', 'المستخدم / المسؤول', 'الدور الوظيفي', 'نوع الإجراء المالي', 'العنصر / الكيان', 'معرف الكيان', 'التفاصيل والشرح'];
  const rows = auditLogs.map(l => [
    new Date(l.timestamp).toLocaleString('ar-SA'),
    l.actorName,
    l.actorRole,
    l.action,
    l.entity,
    l.entityId || '—',
    l.details
  ]);
  const ws = XLSX.utils.aoa_to_sheet([
    [COMPANY_NAME],
    ['سجل النشاط والرقابة المالية اللحظي (Financial Activity Log & Audit Trail)'],
    [`تاريخ الاستخراج: ${new Date().toLocaleDateString('ar-SA')} ${new Date().toLocaleTimeString('ar-SA')}`],
    [],
    headers,
    ...rows
  ]);
  ws['!cols'] = [
    { wch: 22 },
    { wch: 20 },
    { wch: 16 },
    { wch: 26 },
    { wch: 18 },
    { wch: 16 },
    { wch: 55 }
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'سجل_النشاط_المالي');
  downloadWorkbook(wb, `سجل_النشاط_والتدقيق_المالي_${getTimestamp()}`);
}



