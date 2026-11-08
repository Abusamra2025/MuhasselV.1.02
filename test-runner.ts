// تصميم م. أبو أحمد — مصمم ومنفذ Claude — © الحقوق محفوظة
/**
 * CLI Test Runner for Mouhassil Accounting & Verification System
 */

import {
  INITIAL_USERS,
  INITIAL_CHART_OF_ACCOUNTS,
  INITIAL_PROPERTIES,
  INITIAL_UNITS,
  INITIAL_TENANTS,
  INITIAL_CONTRACTS,
  INITIAL_INVOICES,
  INITIAL_PAYMENTS,
  INITIAL_EXPENSES,
  INITIAL_JOURNAL_ENTRIES,
  INITIAL_ACCOUNTING_PERIODS
} from './src/lib/initialData';
import { runFullAccountingTestSuite } from './src/lib/testSuite';

console.log('================================================================');
console.log('🚀 MOUHASSIL ACCOUNTING ENGINE — AUTOMATED AUDIT TEST SUITE');
console.log('================================================================');

const summary = runFullAccountingTestSuite({
  accounts: INITIAL_CHART_OF_ACCOUNTS,
  properties: INITIAL_PROPERTIES,
  units: INITIAL_UNITS,
  tenants: INITIAL_TENANTS,
  contracts: INITIAL_CONTRACTS,
  invoices: INITIAL_INVOICES,
  payments: INITIAL_PAYMENTS,
  expenses: INITIAL_EXPENSES,
  journalEntries: INITIAL_JOURNAL_ENTRIES,
  periods: INITIAL_ACCOUNTING_PERIODS,
  currentUser: INITIAL_USERS[0]
});

console.log(`Executed At: ${summary.executedAt}`);
console.log(`Total Scenarios: ${summary.total} | Passed: ${summary.passed} | Failed: ${summary.failed}\n`);

summary.results.forEach((r, idx) => {
  const icon = r.status === 'PASSED' ? '✅' : '❌';
  console.log(`${icon} [${r.id}] ${idx + 1}. ${r.nameAr} (${r.durationMs}ms)`);
  console.log(`   ${r.assertionMessage}`);
  if (r.details) console.log(`   Details: ${r.details}`);
  console.log('');
});

if (summary.allPassed) {
  console.log('🎉 ALL 14 ACCOUNTING & VERIFICATION INVARIANTS PASSED PERFECTLY!');
  process.exit(0);
} else {
  console.error('❌ SOME AUDIT TESTS FAILED!');
  process.exit(1);
}
