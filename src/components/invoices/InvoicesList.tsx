// تصميم م. أبو أحمد — مصمم ومنفذ Claude — © الحقوق محفوظة
import React, { useState } from 'react';
import { Receipt, Plus, AlertCircle, CheckCircle2, Search, Filter, ShieldCheck, ArrowUpRight, FileSpreadsheet, Repeat } from 'lucide-react';
import { useStore } from '../../lib/store';
import { Invoice, InvoiceStatus } from '../../types';
import { formatCurrency } from '../../lib/numberToArabicWords';
import { Badge } from '../common/Badge';
import { InvoiceDetailsModal } from '../common/InvoiceDetailsModal';
import { exportInvoicesToExcel } from '../../lib/exportUtils';
import { RecurringInvoicesModule } from './RecurringInvoicesModule';

interface InvoicesListProps {
  onOpenPaymentForInvoice?: (invoice: Invoice) => void;
  initialTab?: 'ledger' | 'recurring';
}

export const InvoicesList: React.FC<InvoicesListProps> = ({
  onOpenPaymentForInvoice,
  initialTab = 'ledger'
}) => {
  const { invoices, tenants, properties, units, contracts, generateContractInvoice, isSupervisoryOnly, canUserPerform } = useStore();

  const [activeView, setActiveView] = useState<'ledger' | 'recurring'>(initialTab);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | InvoiceStatus>('ALL');
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedInvoiceForDetails, setSelectedInvoiceForDetails] = useState<Invoice | null>(null);

  // Generate Invoice Form State
  const [selectedContractId, setSelectedContractId] = useState(contracts[0]?.id || '');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [periodStart, setPeriodStart] = useState('2026-11-01');
  const [periodEnd, setPeriodEnd] = useState('2026-11-30');
  const [customAmount, setCustomAmount] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const selectedContract = contracts.find(c => c.id === selectedContractId);
  const targetAmount = customAmount ? parseFloat(customAmount) : (selectedContract?.installmentAmount || 0);

  const filteredInvoices = invoices.filter(inv => {
    if (statusFilter !== 'ALL' && inv.status !== statusFilter) return false;

    if (searchTerm) {
      const tenant = tenants.find(t => t.id === inv.tenantId);
      const term = searchTerm.toLowerCase();
      return (
        inv.invoiceNumber.toLowerCase().includes(term) ||
        tenant?.name.toLowerCase().includes(term)
      );
    }

    return true;
  });

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!selectedContractId || targetAmount <= 0) {
      setErrorMsg('يرجى اختيار العقد وتحديد مبلغ صالح');
      return;
    }

    const res = generateContractInvoice({
      contractId: selectedContractId,
      dueDate,
      periodStart,
      periodEnd,
      amount: targetAmount
    });

    if (res.success) {
      setShowGenerateModal(false);
      setCustomAmount('');
    } else {
      setErrorMsg(res.error || 'فشل توليد الفاتورة');
    }
  };

  const getStatusBadge = (status: InvoiceStatus) => {
    switch (status) {
      case 'PAID':
        return <Badge variant="emerald" size="sm">مسددة بالكامل</Badge>;
      case 'PARTIAL':
        return <Badge variant="amber" size="sm">سداد جزئي</Badge>;
      case 'OVERDUE':
        return <Badge variant="rose" size="sm">متأخرة عن السداد</Badge>;
      case 'UNPAID':
        return <Badge variant="blue" size="sm">مستحقة غير مسددة</Badge>;
    }
  };

  const activeContractsCount = contracts.filter(c => c.status === 'ACTIVE').length;

  return (
    <div className="space-y-6">
      
      {/* View Switcher: Ledger vs Recurring Automation */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold w-full sm:w-auto">
          <button
            onClick={() => setActiveView('ledger')}
            className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeView === 'ledger'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Receipt className="w-4 h-4 text-emerald-600" />
            <span>سجل الفواتير والمطالبات</span>
            <span className="bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded-md text-[10px] font-mono">
              {invoices.length}
            </span>
          </button>

          <button
            onClick={() => setActiveView('recurring')}
            className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeView === 'recurring'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Repeat className={`w-4 h-4 ${activeView === 'recurring' ? 'text-indigo-200' : 'text-indigo-600'}`} />
            <span>الفواتير الدورية والجدولة الآلية</span>
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono ${
              activeView === 'recurring' ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
            }`}>
              {activeContractsCount} عقود
            </span>
          </button>
        </div>

        {activeView === 'ledger' && (
          <div className="flex items-center gap-2 px-1">
            <button
              onClick={() => setActiveView('recurring')}
              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer w-full sm:w-auto justify-center"
            >
              <Repeat className="w-3.5 h-3.5" />
              <span>إدارة وتوليد الفواتير الدورية (شهرياً)</span>
            </button>
          </div>
        )}
      </div>

      {/* VIEW 1: RECURRING INVOICES MODULE */}
      {activeView === 'recurring' ? (
        <RecurringInvoicesModule
          onSelectInvoice={setSelectedInvoiceForDetails}
          onNavigateToLedger={() => setActiveView('ledger')}
        />
      ) : (
        /* VIEW 2: STANDARD INVOICES LEDGER */
        <div className="space-y-6">
          {/* Title & Toolbar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div>
              <h2 className="text-xl font-bold text-slate-900">سجل فواتير الإيجار والمطالبات</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                استحقاقات الإيجار الدورية ومتابعة التحصيل الجزئي والتأخيرات
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => exportInvoicesToExcel(filteredInvoices)}
                className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                title="تصدير جدول الفواتير المعروضة إلى ملف Excel (.xlsx)"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
                <span>تصدير Excel (.xlsx)</span>
              </button>

              {isSupervisoryOnly ? (
                <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs px-3 py-2 rounded-lg font-bold flex items-center gap-1.5 shadow-2xs">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  <span>وظيفة المدير رقابية فقط (إصدار الفواتير من صلاحية المحاسب)</span>
                </div>
              ) : canUserPerform('canManageContracts') ? (
                <button
                  onClick={() => setShowGenerateModal(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>إصدار فاتورة إيجار جديدة</span>
                </button>
              ) : null}
            </div>
          </div>

          {/* Filters Bar */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
              <input
                type="text"
                placeholder="بحث برقم الفاتورة أو المستأجر..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pr-9 pl-3 py-2 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg w-full sm:w-auto">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1.5 rounded-md font-bold transition-colors ${
                  statusFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                الكل ({invoices.length})
              </button>
              <button
                onClick={() => setStatusFilter('OVERDUE')}
                className={`px-3 py-1.5 rounded-md font-bold transition-colors ${
                  statusFilter === 'OVERDUE' ? 'bg-white text-rose-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                متأخرة ({invoices.filter(i => i.status === 'OVERDUE').length})
              </button>
              <button
                onClick={() => setStatusFilter('UNPAID')}
                className={`px-3 py-1.5 rounded-md font-bold transition-colors ${
                  statusFilter === 'UNPAID' ? 'bg-white text-blue-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                غير مسددة ({invoices.filter(i => i.status === 'UNPAID').length})
              </button>
              <button
                onClick={() => setStatusFilter('PAID')}
                className={`px-3 py-1.5 rounded-md font-bold transition-colors ${
                  statusFilter === 'PAID' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                مسددة ({invoices.filter(i => i.status === 'PAID').length})
              </button>
            </div>
          </div>

          {/* Invoices Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">رقم الفاتورة</th>
                    <th className="p-3.5">المستأجر</th>
                    <th className="p-3.5">العقار والوحدة</th>
                    <th className="p-3.5">تاريخ الاستحقاق</th>
                    <th className="p-3.5">الفترة الإيجارية</th>
                    <th className="p-3.5 text-left font-mono">قيمة الفاتورة</th>
                    <th className="p-3.5 text-left font-mono">المحصل</th>
                    <th className="p-3.5 text-left font-mono">المتبقي</th>
                    <th className="p-3.5">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInvoices.map(inv => {
                    const tenant = tenants.find(t => t.id === inv.tenantId);
                    const prop = properties.find(p => p.id === inv.propertyId);
                    const unit = units.find(u => u.id === inv.unitId);

                    return (
                      <tr
                        key={inv.id}
                        onClick={() => setSelectedInvoiceForDetails(inv)}
                        className="hover:bg-slate-50 cursor-pointer transition-colors"
                        title="انقر لعرض تفاصيل الفاتورة وسندات السداد المرتبطة"
                      >
                        <td className="p-3.5 font-mono font-bold text-blue-700 hover:underline flex items-center gap-1">
                          <span>{inv.invoiceNumber}</span>
                          <ArrowUpRight className="w-3 h-3 text-slate-400" />
                        </td>
                        <td className="p-3.5 font-bold text-slate-800">
                          {tenant?.name || '---'}
                        </td>
                        <td className="p-3.5 text-slate-600">
                          {prop?.name} · {unit?.unitNumber}
                        </td>
                        <td className="p-3.5 font-mono text-slate-600">
                          {inv.dueDate}
                        </td>
                        <td className="p-3.5 font-mono text-[11px] text-slate-500">
                          {inv.periodStart} إلى {inv.periodEnd}
                        </td>
                        <td className="p-3.5 text-left font-mono font-bold text-slate-900">
                          {formatCurrency(inv.amount)}
                        </td>
                        <td className="p-3.5 text-left font-mono font-bold text-emerald-700">
                          {inv.paidAmount > 0 ? formatCurrency(inv.paidAmount) : '0.00 ر.س'}
                        </td>
                        <td className="p-3.5 text-left font-mono font-black text-rose-700">
                          {formatCurrency(inv.balance)}
                        </td>
                        <td className="p-3.5">
                          {getStatusBadge(inv.status)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Generate Periodic Invoice Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-xs space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                إصدار فاتورة إيجار وترحيل قيد الاستحقاق
              </h3>
              <p className="text-slate-500 mt-0.5">
                توليد القيد: مدين ذمم المستأجرين (1130) / دائن إيرادات إيجار (4100)
              </p>
            </div>

            {errorMsg && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleGenerate} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">عقد الإيجار النشط</label>
                <select
                  value={selectedContractId}
                  onChange={e => setSelectedContractId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium"
                  required
                >
                  {contracts.filter(c => c.status === 'ACTIVE').map(con => {
                    const ten = tenants.find(t => t.id === con.tenantId);
                    return (
                      <option key={con.id} value={con.id}>
                        {con.contractNumber} — {ten?.name} ({formatCurrency(con.installmentAmount)})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">تاريخ استحقاق الفاتورة</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">بداية الفترة</label>
                  <input
                    type="date"
                    value={periodStart}
                    onChange={e => setPeriodStart(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">نهاية الفترة</label>
                  <input
                    type="date"
                    value={periodEnd}
                    onChange={e => setPeriodEnd(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">مبلغ الفاتورة (ر.س)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder={String(selectedContract?.installmentAmount || 0)}
                  value={customAmount}
                  onChange={e => setCustomAmount(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono font-bold text-slate-900"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  (اتركه فارغاً لاعتماد قيمة قسط العقد الافتراضية: {formatCurrency(selectedContract?.installmentAmount || 0)})
                </span>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowGenerateModal(false)}
                  className="px-4 py-2 bg-slate-100 rounded-lg font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold"
                >
                  ترحيل الفاتورة والقيد
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice Details Drilldown Modal */}
      {selectedInvoiceForDetails && (
        <InvoiceDetailsModal
          invoice={selectedInvoiceForDetails}
          onClose={() => setSelectedInvoiceForDetails(null)}
        />
      )}

    </div>
  );
};
