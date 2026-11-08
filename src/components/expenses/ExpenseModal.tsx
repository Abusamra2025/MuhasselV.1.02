// تصميم م. أبو أحمد — مصمم ومنفذ Claude — © الحقوق محفوظة
import React, { useState, useEffect } from 'react';
import {
  TrendingDown,
  X,
  AlertCircle,
  CheckCircle2,
  Building,
  DollarSign,
  Calendar,
  CreditCard,
  User,
  FileText,
  ShieldCheck,
  Printer
} from 'lucide-react';
import { useStore } from '../../lib/store';
import { PropertyExpense, ExpenseCategory, PaymentMethod } from '../../types';
import { formatCurrency, tafqeet } from '../../lib/numberToArabicWords';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (expense: PropertyExpense) => void;
  initialPropertyId?: string;
}

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialPropertyId
}) => {
  const {
    properties,
    units,
    accounts,
    recordExpense,
    canUserPerform,
    currentUser,
    isPeriodClosedForDate
  } = useStore();

  const [propertyId, setPropertyId] = useState(initialPropertyId || properties[0]?.id || '');
  const [unitId, setUnitId] = useState<string>('');
  const [category, setCategory] = useState<ExpenseCategory>('MAINTENANCE');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('BANK_TRANSFER');
  const [paymentAccountCode, setPaymentAccountCode] = useState('1120'); // 1120 = Bank, 1110 = Cash
  const [payee, setPayee] = useState('');
  const [description, setDescription] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialPropertyId) {
      setPropertyId(initialPropertyId);
    } else if (!propertyId && properties.length > 0) {
      setPropertyId(properties[0].id);
    }
  }, [initialPropertyId, properties, propertyId]);

  if (!isOpen) return null;

  // Role and permissions check
  const isAuthorized = canUserPerform('canRecordExpenses') || currentUser.role === 'ACCOUNTANT';
  if (!isAuthorized) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto no-print" dir="rtl">
        <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-center space-y-4 animate-in fade-in zoom-in-95">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <h3 className="font-bold text-base text-slate-900">صلاحية غير مصرح بها</h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              تسجيل وترحيل سندات الصرف مسندة حصراً للمحاسب المالي المعتمد لضمان الانضباط الرقابي على مراكز التكلفة والمصروفات.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            إغلاق النافذة
          </button>
        </div>
      </div>
    );
  }

  const numAmount = parseFloat(amount) || 0;
  const currentUnits = units.filter(u => u.propertyId === propertyId);

  const getCategoryAccount = (cat: ExpenseCategory): { code: string; name: string } => {
    switch (cat) {
      case 'MAINTENANCE':
        return { code: '5100', name: 'مصروفات الصيانة والتشغيل' };
      case 'UTILITIES':
        return { code: '5200', name: 'مصروفات الخدمات (كهرباء ومياه)' };
      case 'CLEANING':
        return { code: '5300', name: 'مصروفات النظافة والمرافق' };
      case 'SECURITY':
        return { code: '5300', name: 'مصروفات الأمن والحراسة' };
      case 'MANAGEMENT':
        return { code: '5400', name: 'أتعاب إدارة ومكتب' };
      case 'INSURANCE':
        return { code: '5500', name: 'تأمين ورخص حكومية' };
      default:
        return { code: '5600', name: 'مصاريف تشغيلية متنوعة' };
    }
  };

  const currentCategoryAccount = getCategoryAccount(category);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!propertyId) {
      setErrorMsg('يرجى تحديد العقار المرتبط (مركز التكلفة)');
      return;
    }
    if (numAmount <= 0) {
      setErrorMsg('يرجى إدخال مبلغ صحيح أكبر من الصفر');
      return;
    }
    if (!payee.trim()) {
      setErrorMsg('يرجى كتابة اسم المستفيد أو المورد أو المقاول');
      return;
    }
    if (!description.trim()) {
      setErrorMsg('يرجى كتابة البيان والغرض من الصرف للمستند المحاسبي');
      return;
    }
    if (isPeriodClosedForDate(date)) {
      setErrorMsg(`التاريخ (${date}) يقع ضمن فترة مالية مقفلة ومحمية ضد التعديل بأثر رجعي`);
      return;
    }

    setIsSubmitting(true);

    try {
      const res = recordExpense({
        propertyId,
        unitId: unitId || undefined,
        category,
        expenseAccountCode: currentCategoryAccount.code,
        paymentAccountCode,
        amount: numAmount,
        paymentMethod,
        date,
        payee: payee.trim(),
        description: description.trim()
      });

      setIsSubmitting(false);

      if (res.success && res.expense) {
        if (onSuccess) onSuccess(res.expense);
        onClose();
      } else {
        setErrorMsg(res.error || 'حدث خطأ أثناء ترحيل سند الصرف');
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMsg(err?.message || 'حدث خطأ غير متوقع');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto no-print" dir="rtl">
      <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-6">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-900 to-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600/90 flex items-center justify-center text-white shadow-xs">
              <TrendingDown className="w-5 h-5 text-rose-100" />
            </div>
            <div>
              <h3 className="font-bold text-base flex items-center gap-2">
                <span>تحرير وترحيل سند صرف جديد</span>
                <span className="text-[10px] bg-rose-500/30 text-rose-200 border border-rose-400/30 px-2 py-0.5 rounded-md font-bold">
                  محاسب مالي
                </span>
              </h3>
              <p className="text-xs text-rose-200/80 mt-0.5">
                توليد سند رسمي وترحيل القيد المحاسبي المزدوج آلياً
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

        {/* Error Notification */}
        {errorMsg && (
          <div className="m-5 mb-0 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-start gap-2.5 text-xs animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="font-semibold leading-relaxed">{errorMsg}</div>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          
          {/* Property & Unit Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-slate-500" />
                <span>العقار (مركز التكلفة) *</span>
              </label>
              <select
                value={propertyId}
                onChange={e => {
                  setPropertyId(e.target.value);
                  setUnitId('');
                }}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                required
              >
                {properties.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.code} - {p.city})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                الوحدة المعنية (اختياري)
              </label>
              <select
                value={unitId}
                onChange={e => setUnitId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
              >
                <option value="">— مصروف عام على كامل العقار —</option>
                {currentUnits.map(u => (
                  <option key={u.id} value={u.id}>
                    وحدة {u.unitNumber} (الطابق {u.floor})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Category & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">تصنيف المصروف *</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as ExpenseCategory)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                required
              >
                <option value="MAINTENANCE">صيانة وترميم (سباكة/كهرباء/مصاعد)</option>
                <option value="UTILITIES">خدمات كهرباء ومياه عمومية</option>
                <option value="CLEANING">نظافة ومرافق مشتركة</option>
                <option value="SECURITY">أمن وحراسة</option>
                <option value="MANAGEMENT">أتعاب إدارة وتشغيل أملاك</option>
                <option value="INSURANCE">تأمين ورخص ووثائق بلدية</option>
                <option value="OTHER">مصاريف تشغيلية أخرى</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>تاريخ سند الصرف *</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-mono text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                required
              />
            </div>
          </div>

          {/* Amount & Tafqeet */}
          <div className="bg-rose-50/70 border border-rose-200/90 rounded-2xl p-3.5 space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              <div>
                <label className="block font-bold text-rose-950 mb-1 flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-rose-600" />
                  <span>مبلغ سند الصرف (ر.س) *</span>
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full bg-white border border-rose-300 rounded-xl p-2.5 font-mono font-bold text-base text-rose-900 focus:outline-hidden focus:ring-2 focus:ring-rose-500 text-left"
                  dir="ltr"
                  required
                />
              </div>

              <div>
                <span className="block text-[11px] font-bold text-slate-500 mb-1">طريقة الصرف:</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('BANK_TRANSFER');
                      setPaymentAccountCode('1120');
                    }}
                    className={`flex-1 py-2 px-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      paymentMethod === 'BANK_TRANSFER'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    تحويل بنكي
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod('CASH');
                      setPaymentAccountCode('1110');
                    }}
                    className={`flex-1 py-2 px-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      paymentMethod === 'CASH'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    نقداً (صندوق)
                  </button>
                </div>
              </div>
            </div>

            {numAmount > 0 && (
              <div className="pt-2 border-t border-rose-200/80 text-[11px] text-rose-900">
                <span className="text-slate-500 ml-1">المبلغ كتابة:</span>
                <strong className="text-rose-950 font-black">فقط {tafqeet(numAmount)} لا غير</strong>
              </div>
            )}
          </div>

          {/* Payee / Supplier */}
          <div>
            <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-slate-500" />
              <span>يصرف إلى السيد / المؤسسة (المستفيد / المورد) *</span>
            </label>
            <input
              type="text"
              placeholder="مثال: شركة اليمامة للصيانة والتشغيل أو مؤسسة النور للمقاولات"
              value={payee}
              onChange={e => setPayee(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>البيان والغرض من الصرف *</span>
            </label>
            <textarea
              rows={2}
              placeholder="مثال: صيانة مضخات المياه وتغيير الفلاتر للعقار بموجب الفاتورة رقم 882"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
              required
            />
          </div>

          {/* Accounting Integration Summary Badge */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] space-y-1.5 text-slate-600">
            <div className="font-bold text-slate-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>القيد المحاسبي المزدوج الآلي المتولد:</span>
            </div>
            <div className="grid grid-cols-2 gap-2 font-mono text-[10px]">
              <div className="bg-white p-2 rounded-lg border border-slate-200">
                <span className="text-emerald-700 font-bold block">من حـ/ المدين (Dr):</span>
                <span>{currentCategoryAccount.code} - {currentCategoryAccount.name}</span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200">
                <span className="text-blue-700 font-bold block">إلى حـ/ الدائن (Cr):</span>
                <span>
                  {paymentAccountCode === '1120' ? '1120 - البنك التشغيلي' : '1110 - الصندوق والخزينة'}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting || numAmount <= 0}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl font-bold transition-all shadow-sm active:scale-95 cursor-pointer flex items-center gap-2"
            >
              {isSubmitting ? (
                <span>جاري الترحيل...</span>
              ) : (
                <>
                  <TrendingDown className="w-4 h-4" />
                  <span>اعتماد وترحيل سند الصرف</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
