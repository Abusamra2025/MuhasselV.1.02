// تصميم م. أبو أحمد — مصمم ومنفذ Claude — © الحقوق محفوظة
import React, { useState } from 'react';
import {
  TrendingUp,
  CreditCard,
  AlertTriangle,
  Building,
  CheckCircle,
  Receipt,
  ArrowUpRight,
  Printer,
  ChevronRight,
  TrendingDown,
  DollarSign,
  Calendar
} from 'lucide-react';
import { useStore } from '../../lib/store';
import { StatCard } from '../common/StatCard';
import { Badge } from '../common/Badge';
import { formatCurrency } from '../../lib/numberToArabicWords';
import { ROUND } from '../../lib/accountingEngine';
import { Payment } from '../../types';
import { UpcomingDuesAndExpiryAlerts } from './UpcomingDuesAndExpiryAlerts';

interface DashboardOverviewProps {
  onOpenPaymentModalWithTenant?: (tenantId: string) => void;
  onViewReceipt: (payment: Payment) => void;
  onNavigateTab: (tab: any) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  onOpenPaymentModalWithTenant,
  onViewReceipt,
  onNavigateTab
}) => {
  const { properties, units, tenants, contracts, invoices, payments, expenses } = useStore();
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('ALL');

  // Filter by property if selected
  const filteredInvoices = selectedPropertyId === 'ALL'
    ? invoices
    : invoices.filter(i => i.propertyId === selectedPropertyId);

  const filteredPayments = selectedPropertyId === 'ALL'
    ? payments.filter(p => p.status === 'POSTED')
    : payments.filter(p => p.status === 'POSTED' && p.propertyId === selectedPropertyId);

  const filteredExpenses = selectedPropertyId === 'ALL'
    ? expenses.filter(e => e.status === 'POSTED')
    : expenses.filter(e => e.status === 'POSTED' && e.propertyId === selectedPropertyId);

  const filteredUnits = selectedPropertyId === 'ALL'
    ? units
    : units.filter(u => u.propertyId === selectedPropertyId);

  // Exact Financial Calculations
  const totalInvoiced = ROUND(filteredInvoices.reduce((acc, i) => acc + i.amount, 0));
  const totalCollected = ROUND(filteredPayments.reduce((acc, p) => acc + p.amount, 0));
  const totalOutstanding = ROUND(filteredInvoices.reduce((acc, i) => acc + i.balance, 0));
  const totalExpenses = ROUND(filteredExpenses.reduce((acc, e) => acc + e.amount, 0));
  const netOperatingIncome = ROUND(totalCollected - totalExpenses);

  const collectionRate = totalInvoiced > 0
    ? Math.min(100, Math.round((totalCollected / totalInvoiced) * 100))
    : 0;

  const totalUnitCount = filteredUnits.length;
  const occupiedUnitCount = filteredUnits.filter(u => u.status === 'OCCUPIED').length;
  const occupancyRate = totalUnitCount > 0
    ? Math.round((occupiedUnitCount / totalUnitCount) * 100)
    : 0;

  // Urgent overdue invoices
  const overdueInvoices = filteredInvoices
    .filter(i => i.status === 'OVERDUE' || (i.balance > 0 && new Date(i.dueDate) < new Date()))
    .sort((a, b) => b.balance - a.balance);

  // Recent payments
  const recentPayments = [...filteredPayments].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  ).slice(0, 5);

  return (
    <div className="space-y-6">
      
      {/* Top Filter & Welcome Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            لوحة الإدارة والتحصيل المالي
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            مؤشرات أداء التحصيل الحقيقية المستخلصة مباشرة من القيود وسندات القبض
          </p>
        </div>

        {/* Property Filter */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Building className="w-4 h-4 text-slate-400" />
          <select
            value={selectedPropertyId}
            onChange={e => setSelectedPropertyId(e.target.value)}
            className="w-full sm:w-56 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
          >
            <option value="ALL">جميع العقارات والمشاريع ({properties.length})</option>
            {properties.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.city})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Smart Alerts System: Contracts Expiring & Rent Dues Approaching within 30 days */}
      <UpcomingDuesAndExpiryAlerts
        onOpenPaymentModalWithTenant={onOpenPaymentModalWithTenant}
        onNavigateTab={onNavigateTab}
      />

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="إجمالي المطالبات المفوترة"
          value={formatCurrency(totalInvoiced)}
          subtitle={`${filteredInvoices.length} فاتورة إيجار دورية`}
          icon={Receipt}
          accentColor="blue"
          trend={{ value: `${filteredInvoices.filter(i => i.status === 'PAID').length} مسددة بالكامل`, isPositive: true }}
        />

        <StatCard
          title="إجمالي المحصل الفعلي"
          value={formatCurrency(totalCollected)}
          subtitle={`${filteredPayments.length} سند قبض مرحل`}
          icon={CreditCard}
          accentColor="emerald"
          trend={{ value: `نسبة التحصيل: ${collectionRate}%`, isPositive: collectionRate >= 75 }}
        />

        <StatCard
          title="الذمم المتأخرة المستحقة"
          value={formatCurrency(totalOutstanding)}
          subtitle={`${overdueInvoices.length} استحقاقات متأخرة`}
          icon={AlertTriangle}
          accentColor="rose"
          trend={{ value: overdueInvoices.length > 0 ? 'تتطلب متابعة تحصيل' : 'لا توجد متأخرات', isPositive: overdueInvoices.length === 0 }}
        />

        <StatCard
          title="صافي التدفق التشغيلي"
          value={formatCurrency(netOperatingIncome)}
          subtitle={`المصروفات: ${formatCurrency(totalExpenses)}`}
          icon={TrendingUp}
          accentColor="indigo"
          trend={{ value: `إشغال العقارات: ${occupancyRate}%`, isPositive: true }}
        />
      </div>

      {/* Middle Visual Metrics & Collection Rate Bar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              كفاءة التحصيل الإجمالية مقابل المستهدف
            </h3>
            <p className="text-xs text-slate-500">
              نسبة المبالغ الموردة فعلياً في الحساب البنكي والصندوق من أصل المطالبات المستحقة
            </p>
          </div>
          <div className="text-left">
            <span className="text-xl font-black font-mono text-emerald-600">
              {collectionRate}%
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
          <div
            className="bg-emerald-500 h-full transition-all duration-500 rounded-full"
            style={{ width: `${Math.min(100, collectionRate)}%` }}
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 gap-2">
          <span>المحصل: <strong className="text-slate-800 font-mono">{formatCurrency(totalCollected)}</strong></span>
          <span>المتبقي: <strong className="text-rose-700 font-mono">{formatCurrency(totalOutstanding)}</strong></span>
          <span>الوحدات المؤجرة: <strong className="text-slate-800">{occupiedUnitCount} من أصل {totalUnitCount} وحدة</strong></span>
        </div>
      </div>

      {/* Two Column Layout: Urgent Arrears & Recent Receipts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Urgent Collection Priority List */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              <h3 className="text-sm font-bold text-slate-900">
                أولوية التحصيل والمتأخرات العاجلة
              </h3>
            </div>
            <button
              onClick={() => onNavigateTab('invoices')}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-0.5"
            >
              عرض الكل
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 flex-1 overflow-auto max-h-96">
            {overdueInvoices.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <CheckCircle className="w-8 h-8 mx-auto text-emerald-500 mb-2 opacity-80" />
                <p className="text-sm font-semibold text-slate-700">لا توجد متأخرات قائمة</p>
                <p className="text-xs text-slate-400">جميع المستأجرين منتظمون في السداد</p>
              </div>
            ) : (
              overdueInvoices.slice(0, 5).map(inv => {
                const tenant = tenants.find(t => t.id === inv.tenantId);
                const prop = properties.find(p => p.id === inv.propertyId);
                const unit = units.find(u => u.id === inv.unitId);

                return (
                  <div key={inv.id} className="p-3.5 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {tenant?.name || 'مستأجر'}
                        </p>
                        <Badge variant="rose" size="sm">
                          متأخر
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {prop?.name} · {unit?.unitNumber} · استحقاق: {inv.dueDate}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-left font-mono">
                        <p className="text-xs font-bold text-rose-600">
                          {formatCurrency(inv.balance)}
                        </p>
                        <p className="text-[10px] text-slate-400">المبلغ المتبقي</p>
                      </div>

                      {onOpenPaymentModalWithTenant && (
                        <button
                          onClick={() => onOpenPaymentModalWithTenant(inv.tenantId)}
                          className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-semibold px-2.5 py-1.5 rounded-md transition-colors"
                          title="تحصيل فوري لهذا المستأجر"
                        >
                          تحصيل
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Recent Posted Receipts */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">
                سجل سندات القبض الحديثة
              </h3>
            </div>
            <button
              onClick={() => onNavigateTab('payments')}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-0.5"
            >
              عرض سجل السندات
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 flex-1 overflow-auto max-h-96">
            {recentPayments.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <Receipt className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-medium">لم يتم تسجيل سندات قبض بعد</p>
              </div>
            ) : (
              recentPayments.map(pay => {
                const tenant = tenants.find(t => t.id === pay.tenantId);
                const prop = properties.find(p => p.id === pay.propertyId);

                return (
                  <div key={pay.id} className="p-3.5 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-800">
                          {pay.receiptNumber}
                        </span>
                        <Badge variant="emerald" size="sm">
                          مرحل
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-600 font-medium mt-0.5 truncate">
                        {tenant?.name}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {pay.paymentDate} · {pay.paymentMethod === 'BANK_TRANSFER' ? 'تحويل بنكي' : pay.paymentMethod === 'CASH' ? 'نقداً' : pay.paymentMethod === 'POS' ? 'شبكة مدى' : 'شيك'}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-left font-mono">
                        <p className="text-xs font-bold text-emerald-700">
                          {formatCurrency(pay.amount)}
                        </p>
                      </div>

                      <button
                        onClick={() => onViewReceipt(pay)}
                        className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors"
                        title="معاينة وطباعة سند القبض الرسمي"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
