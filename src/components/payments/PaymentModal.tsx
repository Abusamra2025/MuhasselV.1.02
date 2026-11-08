// تصميم م. أبو أحمد — مصمم ومنفذ Claude — © الحقوق محفوظة
import React, { useState, useEffect } from 'react';
import { X, Receipt, AlertCircle, CheckCircle2, DollarSign, CreditCard, Lock } from 'lucide-react';
import { useStore } from '../../lib/store';
import { PaymentMethod, PaymentPurpose, Payment, PaymentAllocation } from '../../types';
import { formatCurrency, tafqeet } from '../../lib/numberToArabicWords';

interface PaymentModalProps {
  initialTenantId?: string;
  onClose: () => void;
  onSuccess: (payment: Payment) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  initialTenantId,
  onClose,
  onSuccess
}) => {
  const { tenants, invoices, contracts, accounts, recordPayment } = useStore();

  const [tenantId, setTenantId] = useState<string>(initialTenantId || (tenants[0]?.id || ''));
  const [purpose, setPurpose] = useState<PaymentPurpose>('RENT_INVOICE');
  const [amount, setAmount] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('BANK_TRANSFER');
  const [destinationAccountCode, setDestinationAccountCode] = useState<string>('1120'); // Bank
  const [bankReference, setBankReference] = useState<string>('');
  const [checkNumber, setCheckNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Selected invoice allocations
  const [allocatedInvoices, setAllocatedInvoices] = useState<Record<string, number>>({});
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Idempotency token generated per form session
  const [idempotencyKey] = useState<string>(() => `idem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);

  // Open invoices for selected tenant
  const tenantOpenInvoices = invoices.filter(
    i => i.tenantId === tenantId && i.balance > 0
  );

  const totalDueForTenant = tenantOpenInvoices.reduce((acc, i) => acc + i.balance, 0);

  // When tenant changes, reset or pre-populate amount
  useEffect(() => {
    if (tenantOpenInvoices.length > 0 && purpose === 'RENT_INVOICE') {
      const firstInv = tenantOpenInvoices[0];
      setAmount(String(firstInv.balance));
      setAllocatedInvoices({ [firstInv.id]: firstInv.balance });
    } else {
      setAllocatedInvoices({});
    }
  }, [tenantId, purpose]);

  // Adjust destination account when method changes
  useEffect(() => {
    if (paymentMethod === 'CASH') {
      setDestinationAccountCode('1110'); // Cash on hand
    } else {
      setDestinationAccountCode('1120'); // Bank Operating
    }
  }, [paymentMethod]);

  const numAmount = parseFloat(amount) || 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (numAmount <= 0) {
      setErrorMsg('يرجى إدخال مبلغ دفع صالح أكبر من الصفر');
      return;
    }

    if (!tenantId) {
      setErrorMsg('يرجى اختيار المستأجر');
      return;
    }

    // Build allocations if purpose is RENT_INVOICE
    const allocationsList: PaymentAllocation[] = [];
    if (purpose === 'RENT_INVOICE') {
      let sumAlloc = 0;
      for (const [invId, allocAmt] of Object.entries(allocatedInvoices)) {
        if (allocAmt > 0) {
          allocationsList.push({ invoiceId: invId, amount: allocAmt });
          sumAlloc += allocAmt;
        }
      }

      if (allocationsList.length === 0 && tenantOpenInvoices.length > 0) {
        // Auto allocate
        allocationsList.push({
          invoiceId: tenantOpenInvoices[0].id,
          amount: Math.min(numAmount, tenantOpenInvoices[0].balance)
        });
      }
    }

    setIsSubmitting(true);

    const result = recordPayment({
      tenantId,
      purpose,
      amount: numAmount,
      paymentDate,
      paymentMethod,
      destinationAccountCode,
      bankReference: bankReference || undefined,
      checkNumber: checkNumber || undefined,
      notes: notes || undefined,
      allocations: allocationsList.length > 0 ? allocationsList : undefined,
      idempotencyKey
    });

    setIsSubmitting(false);

    if (result.success && result.payment) {
      onSuccess(result.payment);
    } else {
      setErrorMsg(result.error || 'تعذر تسجيل سند القبض');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full overflow-hidden shadow-2xl border border-slate-200">
        
        {/* Header */}
        <div className="bg-emerald-700 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Receipt className="w-5 h-5 text-emerald-200" />
            <div>
              <h3 className="text-base font-bold">إصدار وترحيل سند قبض مالي جديد</h3>
              <p className="text-xs text-emerald-100">
                قيد مزدوج فوري، منع التكرار، وتحديث ذمة المستأجر
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-emerald-200 hover:text-white rounded-lg hover:bg-emerald-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Tenant Selection */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              المستأجر الطرف المدين <span className="text-rose-500">*</span>
            </label>
            <select
              value={tenantId}
              onChange={e => setTenantId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-medium text-slate-800 focus:ring-1 focus:ring-emerald-500"
              required
            >
              {tenants.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.phone}) — الرصيد: {formatCurrency(t.balance)}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Purpose */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setPurpose('RENT_INVOICE')}
              className={`p-2 rounded-lg font-bold border transition-colors ${
                purpose === 'RENT_INVOICE'
                  ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              سداد فاتورة إيجار
            </button>
            <button
              type="button"
              onClick={() => setPurpose('ADVANCE_RENT')}
              className={`p-2 rounded-lg font-bold border transition-colors ${
                purpose === 'ADVANCE_RENT'
                  ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              دفعة إيجار مقدمة
            </button>
            <button
              type="button"
              onClick={() => setPurpose('SECURITY_DEPOSIT')}
              className={`p-2 rounded-lg font-bold border transition-colors ${
                purpose === 'SECURITY_DEPOSIT'
                  ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              تأمين ضمان مسترد
            </button>
          </div>

          {/* Open Invoices Section if RENT_INVOICE */}
          {purpose === 'RENT_INVOICE' && (
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-slate-700 font-bold">
                <span>الفواتير المستحقة على المستأجر:</span>
                <span className="text-rose-600 font-mono">
                  إجمالي المتأخر: {formatCurrency(totalDueForTenant)}
                </span>
              </div>

              {tenantOpenInvoices.length === 0 ? (
                <p className="text-slate-400 py-1">لا توجد فواتير مفتوحة على هذا المستأجر (يمكن السداد كدفعة مقدمة)</p>
              ) : (
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {tenantOpenInvoices.map(inv => (
                    <div
                      key={inv.id}
                      className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200"
                    >
                      <div>
                        <span className="font-bold font-mono text-slate-800">{inv.invoiceNumber}</span>
                        <span className="text-slate-400 mx-1.5">|</span>
                        <span className="text-slate-500">استحقاق: {inv.dueDate}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-rose-600 font-mono font-bold">
                          {formatCurrency(inv.balance)}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setAmount(String(inv.balance));
                            setAllocatedInvoices({ [inv.id]: inv.balance });
                          }}
                          className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-bold"
                        >
                          تخصيص كامل
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Amount & Date Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                مبلغ التحصيل (ر.س) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-mono text-base font-bold text-slate-900 focus:ring-1 focus:ring-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                تاريخ القبض والترحيل <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={e => setPaymentDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-mono text-slate-800 focus:ring-1 focus:ring-emerald-500"
                required
              />
            </div>
          </div>

          {/* Tafqeet preview */}
          {numAmount > 0 && (
            <div className="bg-emerald-50/60 p-2.5 rounded-lg border border-emerald-200/80 text-emerald-800">
              <span className="font-bold">المبلغ تفقيطاً: </span>
              <span>{tafqeet(numAmount)}</span>
            </div>
          )}

          {/* Payment Method & Destination Account */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                طريقة الدفع <span className="text-rose-500">*</span>
              </label>
              <select
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-medium text-slate-800 focus:ring-1 focus:ring-emerald-500"
              >
                <option value="BANK_TRANSFER">تحويل بنكي</option>
                <option value="POS">بطاقة مدى / نقاط بيع</option>
                <option value="CASH">نقداً بالخزينة</option>
                <option value="CHEQUE">شيك مصرفي</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                الحساب المودع فيه (GL Account) <span className="text-rose-500">*</span>
              </label>
              <select
                value={destinationAccountCode}
                onChange={e => setDestinationAccountCode(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-medium text-slate-800 focus:ring-1 focus:ring-emerald-500"
              >
                {accounts
                  .filter(a => a.code === '1110' || a.code === '1120')
                  .map(a => (
                    <option key={a.code} value={a.code}>
                      {a.code} - {a.nameAr}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Bank Ref / Cheque No */}
          {paymentMethod === 'BANK_TRANSFER' || paymentMethod === 'POS' ? (
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                رقم الإشعار أو المرجع البنكي
              </label>
              <input
                type="text"
                value={bankReference}
                onChange={e => setBankReference(e.target.value)}
                placeholder="مثال: TRF-2026-98124"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-mono text-slate-800"
              />
            </div>
          ) : paymentMethod === 'CHEQUE' ? (
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                رقم الشيك والبنك المسحوب عليه
              </label>
              <input
                type="text"
                value={checkNumber}
                onChange={e => setCheckNumber(e.target.value)}
                placeholder="مثال: CHQ-554421 - الراجحي"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-mono text-slate-800"
              />
            </div>
          ) : null}

          {/* Notes */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              بيان وملاحظات السند
            </label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="مثال: سداد إيجار شهر أكتوبر شقة 101"
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>معاملة محمية ضد التكرار (Idempotency Protected)</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-lg transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold px-5 py-2 rounded-lg transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSubmitting ? 'جاري الترحيل...' : 'ترحيل وإصدار السند'}</span>
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
