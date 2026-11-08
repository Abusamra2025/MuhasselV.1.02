/**
 * تصميم م. أبو أحمد — مصمم ومنفذ Claude — © الحقوق محفوظة
 *
 * lazyViews — تحميل كسول (code splitting) للشاشات الثقيلة: لا تُحمَّل الشاشة إلا عند فتحها،
 * فتصغر الحزمة الأولى ويبدأ التطبيق أسرع. الأسماء نفسها تُستخدم في JSX دون أي تغيير آخر.
 */

import React, { Suspense, lazy } from 'react';

const ViewFallback: React.FC = () => (
  <div className="flex items-center justify-center py-16 text-xs text-slate-400" role="status" aria-live="polite">
    <span className="animate-pulse">جارٍ تحميل الشاشة...</span>
  </div>
);

function withSuspense<P extends object>(Lazy: React.LazyExoticComponent<React.ComponentType<P>>): React.FC<P> {
  const Wrapped: React.FC<P> = props => (
    <Suspense fallback={<ViewFallback />}>
      <Lazy {...(props as any)} />
    </Suspense>
  );
  return Wrapped;
}

export const DashboardOverview = withSuspense(lazy(() => import('../dashboard/DashboardOverview').then(m => ({ default: m.DashboardOverview }))));
export const PaymentsList = withSuspense(lazy(() => import('../payments/PaymentsList').then(m => ({ default: m.PaymentsList }))));
export const InvoicesList = withSuspense(lazy(() => import('../invoices/InvoicesList').then(m => ({ default: m.InvoicesList }))));
export const ExpensesList = withSuspense(lazy(() => import('../expenses/ExpensesList').then(m => ({ default: m.ExpensesList }))));
export const AccountingHub = withSuspense(lazy(() => import('../accounting/AccountingHub').then(m => ({ default: m.AccountingHub }))));
export const InventoryHub = withSuspense(lazy(() => import('../inventory/InventoryHub').then(m => ({ default: m.InventoryHub }))));
export const FixedAssetsHub = withSuspense(lazy(() => import('../fixedAssets/FixedAssetsHub').then(m => ({ default: m.FixedAssetsHub }))));
export const PropertiesList = withSuspense(lazy(() => import('../properties/PropertiesList').then(m => ({ default: m.PropertiesList }))));
export const ContractsList = withSuspense(lazy(() => import('../contracts/ContractsList').then(m => ({ default: m.ContractsList }))));
export const ReportsHub = withSuspense(lazy(() => import('../reports/ReportsHub').then(m => ({ default: m.ReportsHub }))));
export const AuditTrailView = withSuspense(lazy(() => import('../audit/AuditTrailView').then(m => ({ default: m.AuditTrailView }))));
export const UsersManagement = withSuspense(lazy(() => import('../users/UsersManagement').then(m => ({ default: m.UsersManagement }))));
export const SmartAlertsHub = withSuspense(lazy(() => import('../alerts/SmartAlertsHub').then(m => ({ default: m.SmartAlertsHub }))));
export const DatabaseBackupHub = withSuspense(lazy(() => import('../backup/DatabaseBackupHub').then(m => ({ default: m.DatabaseBackupHub }))));
