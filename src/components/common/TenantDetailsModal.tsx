// تصميم م. أبو أحمد — مصمم ومنفذ Claude — © الحقوق محفوظة
import React from 'react';
import { X, User, Phone, CreditCard, Building, Calendar, Receipt, Shield, Clock } from 'lucide-react';
import { Tenant, Invoice, Payment } from '../../types';
import { useStore } from '../../lib/store';
import { formatCurrency } from '../../lib/numberToArabicWords';
import { calculateTenantStatement } from '../../lib/accountingEngine';
import { Badge } from './Badge';

interface TenantDetailsModalProps {
  tenantId: string | null;
  onClose: () => void;
  onViewInvoice?: (invoice: Invoice) => void;
  onViewPayment?: (payment: Payment) => void;
}

export const TenantDetailsModal: React.FC<TenantDetailsModalProps> = ({
  tenantId,
  onClose,
  onViewInvoice,
  onViewPayment
}) => {
  const { tenants, properties, units, contracts, invoices, payments } = useStore();

  if (!tenantId) return null;

  const tenant = tenants.find(t => t.id === tenantId);
  if (!tenant) return null;

  const tenantContracts = contracts.filter(c => c.tenantId === tenant.id);
  const activeContract = tenantContracts.find(c => c.status === 'ACTIVE') || tenantContracts[0];
  const unit = activeContract ? units.find(u => u.id === activeContract.unitId) : undefined;
  const property = activeContract ? properties.find(p => p.id === activeContract.propertyId) : undefined;

  const statement = calculateTenantStatement(tenant.id, invoices, payments);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white">
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold">{tenant.name}</h3>
                <Badge variant={tenant.balance > 0 ? 'rose' : tenant.balance < 0 ? 'blue' : 'emerald'} size="sm">
                  {tenant.balance > 0 ? 'عليه مديونية' : tenant.balance < 0 ? 'رصيد دائن' : 'مسدد بالكامل'}
                </Badge>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                بطاقة تفاصيل المستأجر وكشف الحساب التحليلي
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto text-xs">
          
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
              <span className="text-slate-500 block mb-1">الرصيد القائم الحالي</span>
              <p className={`text-lg font-black font-mono ${tenant.balance > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                {formatCurrency(tenant.balance)}
              </p>
              <span className="text-[10px] text-slate-400">
                {tenant.balance > 0 ? 'مستحق السداد' : 'لا توجد متأخرات'}
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
              <span className="text-slate-500 block mb-1">التأمين المحتجز</span>
              <p className="text-lg font-black font-mono text-blue-700">
                {formatCurrency(tenant.securityDepositHeld)}
              </p>
              <span className="text-[10px] text-slate-400">أمانات مستردة (2110)</span>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
              <span className="text-slate-500 block mb-1">رقم الهوية الوطنية</span>
              <p className="text-sm font-bold font-mono text-slate-800">
                {tenant.nationalId || '—'}
              </p>
              <span className="text-[10px] text-slate-400">سجل مدني موثق</span>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
              <span className="text-slate-500 block mb-1">رقم الجوال</span>
              <p className="text-sm font-bold font-mono text-slate-800" dir="ltr">
                {tenant.phone || '—'}
              </p>
              <span className="text-[10px] text-slate-400">للاتصال والمطالبات</span>
            </div>
          </div>

          {/* Active Lease & Unit Info */}
          {activeContract ? (
            <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Building className="w-5 h-5 text-emerald-700" />
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">
                    {property?.name || 'العقار'} — الوحدة {unit?.unitNumber || '—'}
                  </h4>
                  <p className="text-slate-600 mt-0.5">
                    رقم العقد: <span className="font-mono font-bold">{activeContract.contractNumber}</span> · الإيجار السنوي: <span className="font-mono font-bold">{formatCurrency(activeContract.annualRent)}</span>
                  </p>
                </div>
              </div>

              <div className="text-left text-xs">
                <span className="text-slate-500 block">مدة العقد:</span>
                <span className="font-mono font-bold text-slate-800">
                  من {activeContract.startDate} إلى {activeContract.endDate}
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-500 text-center">
              لا يوجد عقد نشط حالياً لهذا المستأجر
            </div>
          )}

          {/* Detailed Statement Ledger */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-emerald-600" />
                <span>كشف الحساب والعمليات المحاسبية</span>
              </h4>
              <span className="text-slate-500 font-mono">
                {statement.length} حركات مسجلة
              </span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">التاريخ</th>
                    <th className="p-2.5">النوع</th>
                    <th className="p-2.5">الرقم المرجعي</th>
                    <th className="p-2.5">البيان</th>
                    <th className="p-2.5 text-left font-mono">مدين</th>
                    <th className="p-2.5 text-left font-mono">دائن</th>
                    <th className="p-2.5 text-left font-mono">الرصيد المستمر</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {statement.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-400">
                        لا توجد حركات مسجلة في كشف الحساب
                      </td>
                    </tr>
                  ) : (
                    statement.map((row, i) => {
                      const isInv = row.type === 'INVOICE';
                      const isPay = row.type === 'PAYMENT';
                      return (
                        <tr key={i} className="hover:bg-slate-50 transition-colors">
                          <td className="p-2.5 font-mono text-slate-600">{row.date}</td>
                          <td className="p-2.5">
                            <Badge variant={isInv ? 'blue' : isPay ? 'emerald' : 'rose'} size="sm">
                              {isInv ? 'فاتورة' : isPay ? 'سند قبض' : 'عكس سند'}
                            </Badge>
                          </td>
                          <td className="p-2.5 font-mono font-bold text-slate-900">
                            {row.refNumber}
                          </td>
                          <td className="p-2.5 text-slate-700 max-w-xs truncate">{row.description}</td>
                          <td className="p-2.5 text-left font-mono font-bold text-rose-700">
                            {row.debit > 0 ? formatCurrency(row.debit) : '—'}
                          </td>
                          <td className="p-2.5 text-left font-mono font-bold text-emerald-700">
                            {row.credit > 0 ? formatCurrency(row.credit) : '—'}
                          </td>
                          <td className="p-2.5 text-left font-mono font-black text-slate-900">
                            {formatCurrency(row.balance)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs px-5 py-2 rounded-lg transition-colors cursor-pointer"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
};
