// تصميم م. أبو أحمد — مصمم ومنفذ Claude — © الحقوق محفوظة
import React, { useState, useEffect } from 'react';
import { TrendingDown, Plus, AlertCircle, CheckCircle2, Building, DollarSign, X, ShieldCheck, FileSpreadsheet } from 'lucide-react';
import { useStore } from '../../lib/store';
import { PropertyExpense, ExpenseCategory, PaymentMethod } from '../../types';
import { formatCurrency } from '../../lib/numberToArabicWords';
import { Badge } from '../common/Badge';
import { exportExpensesToExcel } from '../../lib/exportUtils';

export const ExpensesList: React.FC = () => {
  const { expenses, properties, accounts, recordExpense, isSupervisoryOnly, canUserPerform } = useStore();

  const [showAddModal, setShowAddModal] = useState(false);
  const [propertyId, setPropertyId] = useState(properties[0]?.id || '');
  const [category, setCategory] = useState<ExpenseCategory>('MAINTENANCE');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('BANK_TRANSFER');
  const [paymentAccountCode, setPaymentAccountCode] = useState('1120'); // Bank
  const [payee, setPayee] = useState('');
  const [description, setDescription] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!propertyId && properties.length > 0) {
      setPropertyId(properties[0].id);
    }
  }, [properties, propertyId]);

  const numAmount = parseFloat(amount) || 0;

  const getCategoryAccount = (cat: ExpenseCategory): string => {
    switch (cat) {
      case 'MAINTENANCE': return '5100';
      case 'UTILITIES': return '5200';
      case 'CLEANING':
      case 'SECURITY': return '5300';
      case 'MANAGEMENT': return '5400';
      case 'INSURANCE': return '5500';
      default: return '5600';
    }
  };

  const handleCreateExpense = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!propertyId || numAmount <= 0 || !payee.trim() || !description.trim()) {
      setErrorMsg('يرجى تعبئة كافة الحقول الإلزامية وتحديد مبلغ صحيح');
      return;
    }

    const expAccountCode = getCategoryAccount(category);

    const res = recordExpense({
      propertyId,
      category,
      expenseAccountCode: expAccountCode,
      paymentAccountCode,
      amount: numAmount,
      paymentMethod,
      date,
      payee: payee.trim(),
      description: description.trim()
    });

    if (res.success) {
      setShowAddModal(false);
      setAmount('');
      setPayee('');
      setDescription('');
    } else {
      setErrorMsg(res.error || 'فشل تسجيل المصروف');
    }
  };

  const getCategoryArabic = (cat: ExpenseCategory) => {
    switch (cat) {
      case 'MAINTENANCE': return 'صيانة وترميم';
      case 'UTILITIES': return 'خدمات وكهرباء';
      case 'CLEANING': return 'نظافة';
      case 'SECURITY': return 'أمن وحراسة';
      case 'MANAGEMENT': return 'أتعاب إدارة';
      case 'INSURANCE': return 'تأمين ورخص';
      default: return 'مصاريف أخرى';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900">سجل مصروفات العقارات وسندات الصرف</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            متابعة تكاليف الصيانة والتشغيل والخدمات المشتركة مع الترحيل الآلي
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => exportExpensesToExcel(expenses)}
            className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            title="تصدير جدول المصروفات إلى ملف Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
            <span>تصدير المصروفات (Excel)</span>
          </button>

          {isSupervisoryOnly ? (
            <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs px-3 py-2 rounded-lg font-bold flex items-center gap-1.5 shadow-2xs">
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              <span>وظيفة المدير رقابية فقط (سندات الصرف تسجل بواسطة المحاسب)</span>
            </div>
          ) : canUserPerform('canRecordExpenses') ? (
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>تسجيل سند صرف جديد</span>
            </button>
          ) : null}
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3.5">رقم السند</th>
                <th className="p-3.5">التاريخ</th>
                <th className="p-3.5">العقار</th>
                <th className="p-3.5">التصنيف</th>
                <th className="p-3.5">المستفيد / المورد</th>
                <th className="p-3.5">الوصف والبيان</th>
                <th className="p-3.5 text-left font-mono">المبلغ</th>
                <th className="p-3.5">طريقة الدفع</th>
                <th className="p-3.5">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {expenses.map(exp => {
                const prop = properties.find(p => p.id === exp.propertyId);

                return (
                  <tr key={exp.id} className="hover:bg-slate-50">
                    <td className="p-3.5 font-mono font-bold text-slate-900">
                      {exp.voucherNumber}
                    </td>
                    <td className="p-3.5 font-mono text-slate-600">
                      {exp.date}
                    </td>
                    <td className="p-3.5 font-bold text-slate-800">
                      {prop?.name}
                    </td>
                    <td className="p-3.5">
                      <Badge variant="amber" size="sm">{getCategoryArabic(exp.category)}</Badge>
                    </td>
                    <td className="p-3.5 text-slate-800">
                      {exp.payee}
                    </td>
                    <td className="p-3.5 text-slate-600 max-w-xs truncate">
                      {exp.description}
                    </td>
                    <td className="p-3.5 text-left font-mono font-bold text-rose-700 text-sm">
                      {formatCurrency(exp.amount)}
                    </td>
                    <td className="p-3.5 text-slate-600">
                      {exp.paymentMethod === 'BANK_TRANSFER' ? 'تحويل بنكي' : 'نقدي'}
                    </td>
                    <td className="p-3.5">
                      <Badge variant="emerald" size="sm">مرحل بالقيد</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Expense Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">تسجيل وترحيل سند صرف مصروف عقار</h3>
                <p className="text-slate-500 mt-0.5">مدين حساب المصروف (5xxx) / دائن البنك أو الصندوق</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateExpense} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">العقار المرتبط (مركز التكلفة)</label>
                <select
                  value={propertyId}
                  onChange={e => setPropertyId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium"
                  required
                >
                  {properties.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.city})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">تصنيف المصروف</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as ExpenseCategory)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-bold"
                  >
                    <option value="MAINTENANCE">صيانة وترميم (5100)</option>
                    <option value="UTILITIES">كهرباء وخدمات (5200)</option>
                    <option value="CLEANING">نظافة (5300)</option>
                    <option value="SECURITY">أمن وحراسة (5300)</option>
                    <option value="MANAGEMENT">إدارة أملاك (5400)</option>
                    <option value="INSURANCE">تأمين وتراخيص (5500)</option>
                    <option value="OTHER">مصاريف عمومية (5600)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">تاريخ الصرف</label>
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">المستفيد أو المورد (Payee)</label>
                <input
                  type="text"
                  placeholder="مثال: شركة الكهرباء أو مقاول الصيانة"
                  value={payee}
                  onChange={e => setPayee(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">مبلغ المصروف (ر.س)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono font-bold text-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">حساب الدفع</label>
                  <select
                    value={paymentAccountCode}
                    onChange={e => setPaymentAccountCode(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium"
                  >
                    <option value="1120">1120 - البنك التشغيلي</option>
                    <option value="1110">1110 - الصندوق النقدي</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">بيان وشرح المصروف</label>
                <textarea
                  placeholder="تفاصيل الفاتورة وأعمال الصيانة المنفذة..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 h-16"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 rounded-lg font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold"
                >
                  ترحيل سند الصرف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
