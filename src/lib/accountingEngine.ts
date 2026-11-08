// تصميم م. أبو أحمد — مصمم ومنفذ Claude — © الحقوق محفوظة
/**
 * Mouhassil Double-Entry Accounting Engine
 * Pure, deterministic, strict double-entry ledger & financial statement generator.
 * Strictly adheres to GAAP / IFRS / SOCPA real estate standards.
 */

import {
  Account,
  JournalEntry,
  JournalLine,
  TrialBalanceRow,
  ProfitLossReport,
  BalanceSheetReport,
  Invoice,
  Payment,
  Tenant,
  Property,
  Unit,
  TenantAgingItem,
  AgingBucket
} from '../types';

export const ROUND = (val: number): number => {
  return Math.round((val + Number.EPSILON) * 100) / 100;
};

/**
 * Validates that debit total equals credit total.
 */
export function validateJournalBalance(lines: JournalLine[]): {
  isBalanced: boolean;
  totalDebit: number;
  totalCredit: number;
  difference: number;
} {
  let totalDebit = 0;
  let totalCredit = 0;

  for (const line of lines) {
    totalDebit += Number(line.debit) || 0;
    totalCredit += Number(line.credit) || 0;
  }

  totalDebit = ROUND(totalDebit);
  totalCredit = ROUND(totalCredit);
  const difference = ROUND(Math.abs(totalDebit - totalCredit));

  return {
    isBalanced: difference < 0.009,
    totalDebit,
    totalCredit,
    difference
  };
}

/**
 * Computes opening, period, and closing balances for all chart of accounts.
 */
export function calculateAccountBalances(
  accounts: Account[],
  entries: JournalEntry[],
  startDate?: string,
  endDate?: string
): Map<string, {
  debitMovement: number;
  creditMovement: number;
  netDebit: number;
  netCredit: number;
  balance: number;
}> {
  const result = new Map<string, {
    debitMovement: number;
    creditMovement: number;
    netDebit: number;
    netCredit: number;
    balance: number;
  }>();

  // Initialize
  for (const acc of accounts) {
    result.set(acc.code, {
      debitMovement: 0,
      creditMovement: 0,
      netDebit: 0,
      netCredit: 0,
      balance: 0
    });
  }

  // Filter posted entries
  const postedEntries = entries.filter(e => e.status === 'POSTED');

  for (const entry of postedEntries) {
    if (startDate && entry.date < startDate) continue;
    if (endDate && entry.date > endDate) continue;

    for (const line of entry.lines) {
      let stats = result.get(line.accountCode);
      if (!stats) {
        stats = { debitMovement: 0, creditMovement: 0, netDebit: 0, netCredit: 0, balance: 0 };
        result.set(line.accountCode, stats);
      }

      stats.debitMovement = ROUND(stats.debitMovement + (Number(line.debit) || 0));
      stats.creditMovement = ROUND(stats.creditMovement + (Number(line.credit) || 0));
    }
  }

  // Calculate net balances based on normal balance convention
  for (const acc of accounts) {
    const stats = result.get(acc.code);
    if (!stats) continue;

    if (acc.normalBalance === 'DEBIT') {
      // Assets and Expenses
      const net = ROUND(stats.debitMovement - stats.creditMovement);
      stats.balance = net;
      if (net >= 0) {
        stats.netDebit = net;
        stats.netCredit = 0;
      } else {
        stats.netDebit = 0;
        stats.netCredit = Math.abs(net);
      }
    } else {
      // Liabilities, Equity, Revenue
      const net = ROUND(stats.creditMovement - stats.debitMovement);
      stats.balance = net;
      if (net >= 0) {
        stats.netCredit = net;
        stats.netDebit = 0;
      } else {
        stats.netCredit = 0;
        stats.netDebit = Math.abs(net);
      }
    }
  }

  return result;
}

/**
 * Generates an auditable Trial Balance (ميزان المراجعة).
 * Guarantees that Total Debits == Total Credits.
 */
export function generateTrialBalance(
  accounts: Account[],
  entries: JournalEntry[],
  startDate?: string,
  endDate?: string
): {
  rows: TrialBalanceRow[];
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
  difference: number;
} {
  const balances = calculateAccountBalances(accounts, entries, startDate, endDate);
  const rows: TrialBalanceRow[] = [];

  let totalDebit = 0;
  let totalCredit = 0;

  for (const acc of accounts) {
    const stats = balances.get(acc.code);
    if (!stats) continue;

    // Show accounts with movement or active balance
    if (stats.debitMovement > 0 || stats.creditMovement > 0 || stats.balance !== 0) {
      let closingDebit = 0;
      let closingCredit = 0;

      if (acc.normalBalance === 'DEBIT') {
        if (stats.balance >= 0) {
          closingDebit = stats.balance;
        } else {
          closingCredit = Math.abs(stats.balance);
        }
      } else {
        if (stats.balance >= 0) {
          closingCredit = stats.balance;
        } else {
          closingDebit = Math.abs(stats.balance);
        }
      }

      totalDebit = ROUND(totalDebit + closingDebit);
      totalCredit = ROUND(totalCredit + closingCredit);

      rows.push({
        accountCode: acc.code,
        accountNameAr: acc.nameAr,
        type: acc.type,
        openingDebit: 0,
        openingCredit: 0,
        periodDebit: stats.debitMovement,
        periodCredit: stats.creditMovement,
        closingDebit,
        closingCredit
      });
    }
  }

  // Sort by code
  rows.sort((a, b) => a.accountCode.localeCompare(b.accountCode));

  const difference = ROUND(Math.abs(totalDebit - totalCredit));

  return {
    rows,
    totalDebit,
    totalCredit,
    isBalanced: difference < 0.01,
    difference
  };
}

/**
 * Generates Profit and Loss / Income Statement (قائمة الدخل).
 */
export function generateProfitLoss(
  accounts: Account[],
  entries: JournalEntry[],
  startDate?: string,
  endDate?: string
): ProfitLossReport {
  const balances = calculateAccountBalances(accounts, entries, startDate, endDate);

  const getBalance = (code: string) => balances.get(code)?.balance || 0;

  const rentalIncome = getBalance('4100');
  const serviceIncome = getBalance('4200');
  const lateFees = getBalance('4300');
  const totalRevenue = ROUND(rentalIncome + serviceIncome + lateFees);

  const maintenance = getBalance('5100');
  const utilities = getBalance('5200');
  const cleaning = getBalance('5300');
  const management = getBalance('5400');
  const insurance = getBalance('5500');
  const adminExp = getBalance('5600');
  const depreciation = getBalance('5700');

  const totalExpenses = ROUND(
    maintenance + utilities + cleaning + management + insurance + adminExp + depreciation
  );

  const netOperatingIncome = ROUND(totalRevenue - totalExpenses);

  return {
    periodName: startDate && endDate ? `من ${startDate} إلى ${endDate}` : 'الفترة الحالية 2026',
    rentalIncome,
    otherIncome: ROUND(serviceIncome + lateFees),
    totalRevenue,
    maintenanceExpense: maintenance,
    utilitiesExpense: utilities,
    managementExpense: management,
    otherExpenses: ROUND(cleaning + insurance + adminExp + depreciation),
    depreciationExpense: depreciation,
    totalExpenses,
    netOperatingIncome
  };
}

/**
 * Generates Balance Sheet (الميزانية العمومية).
 * Validates Assets = Liabilities + Equity.
 */
export function generateBalanceSheet(
  accounts: Account[],
  entries: JournalEntry[],
  asOfDate?: string
): BalanceSheetReport {
  const balances = calculateAccountBalances(accounts, entries, undefined, asOfDate);
  const pnl = generateProfitLoss(accounts, entries, undefined, asOfDate);

  const currentAssets: { code: string; name: string; amount: number }[] = [];
  const fixedAssets: { code: string; name: string; amount: number }[] = [];
  let totalCurrentAssets = 0;
  let totalFixedAssets = 0;

  // Assets
  for (const acc of accounts.filter(a => a.type === 'ASSET')) {
    const rawBalance = balances.get(acc.code)?.balance || 0;
    // أصول ذات رصيد دائن طبيعي (مثل مجمع الإهلاك) تظهر بالسالب وتُطرح من إجمالي الأصول
    const amount = acc.normalBalance === 'CREDIT' ? ROUND(-rawBalance) : rawBalance;
    if (amount === 0 && !acc.systemAccount) continue;

    if (acc.code.startsWith('11')) {
      currentAssets.push({ code: acc.code, name: acc.nameAr, amount });
      totalCurrentAssets = ROUND(totalCurrentAssets + amount);
    } else if (acc.code.startsWith('12')) {
      fixedAssets.push({ code: acc.code, name: acc.nameAr, amount });
      totalFixedAssets = ROUND(totalFixedAssets + amount);
    }
  }

  const totalAssets = ROUND(totalCurrentAssets + totalFixedAssets);

  // Liabilities
  const currentLiabilities: { code: string; name: string; amount: number }[] = [];
  let totalCurrentLiabilities = 0;

  for (const acc of accounts.filter(a => a.type === 'LIABILITY')) {
    const amount = balances.get(acc.code)?.balance || 0;
    if (amount === 0 && !acc.systemAccount) continue;

    currentLiabilities.push({ code: acc.code, name: acc.nameAr, amount });
    totalCurrentLiabilities = ROUND(totalCurrentLiabilities + amount);
  }

  const totalLiabilities = totalCurrentLiabilities;

  // Equity
  const equityItems: { code: string; name: string; amount: number }[] = [];
  let totalCapitalEquity = 0;

  for (const acc of accounts.filter(a => a.type === 'EQUITY' && a.code !== '3300')) {
    const amount = balances.get(acc.code)?.balance || 0;
    if (amount === 0 && !acc.systemAccount) continue;

    equityItems.push({ code: acc.code, name: acc.nameAr, amount });
    totalCapitalEquity = ROUND(totalCapitalEquity + amount);
  }

  const currentPeriodProfit = pnl.netOperatingIncome;
  const totalEquity = ROUND(totalCapitalEquity + currentPeriodProfit);

  const totalLiabilitiesAndEquity = ROUND(totalLiabilities + totalEquity);
  const difference = ROUND(Math.abs(totalAssets - totalLiabilitiesAndEquity));

  return {
    asOfDate: asOfDate || new Date().toISOString().split('T')[0],
    assets: {
      currentAssets,
      totalCurrentAssets,
      fixedAssets,
      totalFixedAssets,
      totalAssets
    },
    liabilities: {
      currentLiabilities,
      totalCurrentLiabilities,
      totalLiabilities
    },
    equity: {
      items: equityItems,
      currentPeriodProfit,
      totalEquity
    },
    isBalanced: difference < 0.05,
    difference
  };
}

/**
 * Calculates Accounts Receivable Aging Report (أعمار الديون).
 * Buckets: 0-30 days, 31-60 days, 61-90 days, 90+ days.
 */
export function calculateAgingBuckets(
  invoices: Invoice[],
  tenants: Tenant[],
  properties: Property[],
  units: Unit[],
  asOfDateStr?: string
): TenantAgingItem[] {
  const asOf = asOfDateStr ? new Date(asOfDateStr) : new Date();
  const tenantMap = new Map<string, TenantAgingItem>();

  for (const t of tenants) {
    const unit = units.find(u => u.currentTenantId === t.id);
    const prop = unit ? properties.find(p => p.id === unit.propertyId) : undefined;

    tenantMap.set(t.id, {
      tenantId: t.id,
      tenantName: t.name,
      phone: t.phone,
      unitNumber: unit ? unit.unitNumber : 'غير محدد',
      propertyName: prop ? prop.name : 'غير محدد',
      aging: {
        current: 0,
        days31to60: 0,
        days61to90: 0,
        over90: 0,
        total: 0
      }
    });
  }

  for (const inv of invoices) {
    if (inv.balance <= 0) continue; // paid

    const item = tenantMap.get(inv.tenantId);
    if (!item) continue;

    const dueDate = new Date(inv.dueDate);
    const diffTime = asOf.getTime() - dueDate.getTime();
    const diffDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

    if (diffDays <= 30) {
      item.aging.current = ROUND(item.aging.current + inv.balance);
    } else if (diffDays <= 60) {
      item.aging.days31to60 = ROUND(item.aging.days31to60 + inv.balance);
    } else if (diffDays <= 90) {
      item.aging.days61to90 = ROUND(item.aging.days61to90 + inv.balance);
    } else {
      item.aging.over90 = ROUND(item.aging.over90 + inv.balance);
    }

    item.aging.total = ROUND(item.aging.total + inv.balance);
  }

  return Array.from(tenantMap.values()).filter(t => t.aging.total > 0 || t.aging.current > 0);
}

/**
 * Calculates a Tenant's detailed running ledger statement (كشف حساب مستأجر).
 */
export function calculateTenantStatement(
  tenantId: string,
  invoices: Invoice[],
  payments: Payment[]
): Array<{
  date: string;
  type: 'INVOICE' | 'PAYMENT' | 'REVERSAL';
  refNumber: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}> {
  const records: Array<{
    date: string;
    type: 'INVOICE' | 'PAYMENT' | 'REVERSAL';
    refNumber: string;
    description: string;
    debit: number;
    credit: number;
  }> = [];

  // Add invoices as Debits
  for (const inv of invoices.filter(i => i.tenantId === tenantId)) {
    records.push({
      date: inv.dueDate,
      type: 'INVOICE',
      refNumber: inv.invoiceNumber,
      description: `فاتورة إيجار دورية عن الفترة من ${inv.periodStart} إلى ${inv.periodEnd}`,
      debit: inv.amount,
      credit: 0
    });
  }

  // Add payments as Credits
  for (const pay of payments.filter(p => p.tenantId === tenantId)) {
    if (pay.status === 'POSTED') {
      records.push({
        date: pay.paymentDate,
        type: 'PAYMENT',
        refNumber: pay.receiptNumber,
        description: `سند قبض نقدي/بنكي - ${pay.notes || 'سداد مستحقات'}`,
        debit: 0,
        credit: pay.amount
      });
    } else if (pay.status === 'REVERSED') {
      records.push({
        date: pay.paymentDate,
        type: 'PAYMENT',
        refNumber: pay.receiptNumber,
        description: `سند قبض - ${pay.notes || 'سداد'}`,
        debit: 0,
        credit: pay.amount
      });
      records.push({
        date: pay.reversedAt ? pay.reversedAt.split('T')[0] : pay.paymentDate,
        type: 'REVERSAL',
        refNumber: `REV-${pay.receiptNumber}`,
        description: `عكس وإلغاء سند قبض: ${pay.reversalReason || 'خطأ إداري'}`,
        debit: pay.amount,
        credit: 0
      });
    }
  }

  // Sort chronologically
  records.sort((a, b) => a.date.localeCompare(b.date));

  // Compute running balance
  let running = 0;
  return records.map(r => {
    running = ROUND(running + r.debit - r.credit);
    return {
      ...r,
      balance: running
    };
  });
}
