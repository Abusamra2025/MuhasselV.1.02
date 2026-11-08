// تصميم م. أبو أحمد — مصمم ومنفذ Claude — © الحقوق محفوظة
import React, { useState } from 'react';
import { FileText, X, Calendar, DollarSign, User, Building, CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react';
import { useStore } from '../../lib/store';
import { Contract, PaymentFrequency } from '../../types';
import { formatCurrency } from '../../lib/numberToArabicWords';
import { isUnitAvailable, todayISO, addDaysISO, nextContractNumber } from '../../lib/propertyService';

interface DraftContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (contract: Contract) => void;
}

export const DraftContractModal: React.FC<DraftContractModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { contracts, tenants, properties, units, createContract, currentUser, canUserPerform } = useStore();

  const [tenantId, setTenantId] = useState<string>(tenants[0]?.id || '');
  const [propertyId, setPropertyId] = useState<string>(properties[0]?.id || '');
  
  // Vacant units for selected property
  const vacantUnits = units.filter(u => u.propertyId === propertyId && isUnitAvailable(u, contracts));
  const [unitId, setUnitId] = useState<string>(vacantUnits[0]?.id || '');

  // Dates
  const today = todayISO();
  const nextYear = addDaysISO(today, 364);
  const [startDate, setStartDate] = useState<string>(today);
  const [endDate, setEndDate] = useState<string>(nextYear);

  // Financial terms
  const [annualRent, setAnnualRent] = useState<string>('60000');
  const [paymentFrequency, setPaymentFrequency] = useState<PaymentFrequency>('QUARTERLY');
  const [securityDeposit, setSecurityDeposit] = useState<string>('5000');
  const [notes, setNotes] = useState<string>('');
  
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  if (currentUser.role !== 'ACCOUNTANT' || !canUserPerform('canManageContracts')) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto no-print" dir="rtl">
        <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-center space-y-4 animate-in fade-in zoom-in-95">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <h3 className="font-bold text-base text-slate-900">صلاحية محصورة بالمحاسب المالي</h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              تحرير وإبرام عقود الإيجار وتوليد جداول الدفعات مسندة حصراً للمحاسب المالي المعتمد لضمان الانضباط المحاسبي والقانوني، وهي معزولة عن باقي المستخدمين والمشرفين.
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

  const numAnnual = parseFloat(annualRent) || 0;
  const numDep = parseFloat(securityDeposit) || 0;

  const installmentAmount = paymentFrequency === 'MONTHLY'
    ? Math.round((numAnnual / 12) * 100) / 100
    : paymentFrequency === 'QUARTERLY'
    ? Math.round((numAnnual / 4) * 100) / 100
    : paymentFrequency === 'SEMI_ANNUAL'
    ? Math.round((numAnnual / 2) * 100) / 100
    : numAnnual;

  const installmentsCount = paymentFrequency === 'MONTHLY' ? 12 : paymentFrequency === 'QUARTERLY' ? 4 : paymentFrequency === 'SEMI_ANNUAL' ? 2 : 1;

  const handlePropertyChange = (newPropId: string) => {
    setPropertyId(newPropId);
    const matching = units.filter(u => u.propertyId === newPropId && isUnitAvailable(u, contracts));
    if (matching.length > 0) {
      setUnitId(matching[0].id);
      // Auto-set suggested rent based on unit monthly rent * 12
      if (matching[0].monthlyRent) {
        setAnnualRent(String(matching[0].monthlyRent * 12));
      }
    } else {
      setUnitId('');
    }
  };

  const handleUnitChange = (newUnitId: string) => {
    setUnitId(newUnitId);
    const targetUnit = units.find(u => u.id === newUnitId);
    if (targetUnit && targetUnit.monthlyRent) {
      setAnnualRent(String(targetUnit.monthlyRent * 12));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!tenantId) {
      setErrorMsg('يرجى اختيار المستأجر');
      return;
    }
    if (!propertyId) {
      setErrorMsg('يرجى اختيار العقار');
      return;
    }
    if (!unitId) {
      setErrorMsg('يرجى اختيار وحدة شاغرة من العقار المحدد');
      return;
    }
    if (numAnnual <= 0) {
      setErrorMsg('يرجى إدخال قيمة إيجارية سنوية صحيحة');
      return;
    }
    if (!startDate || !endDate) {
      setErrorMsg('يرجى تحديد تواريخ بداية ونهاية العقد');
      return;
    }

    setIsSubmitting(true);

    try {
      const nextConNum = nextContractNumber(contracts);

      const res = createContract({
        contractNumber: nextConNum,
        tenantId,
        propertyId,
        unitId,
        startDate,
        endDate,
        annualRent: numAnnual,
        paymentFrequency,
        installmentAmount,
        securityDeposit: numDep,
        status: 'ACTIVE',
        notes: notes.trim() || 'عقد إيجار موثق عبر الإجراءات السريعة'
      });

      setIsSubmitting(false);

      if (res.success && res.contract) {
        if (onSuccess) onSuccess(res.contract);
        onClose();
      } else {
        setErrorMsg(res.error || 'حدث خطأ أثناء إبرام العقد');
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMsg(err?.message || 'حدث خطأ غير متوقع');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto no-print" dir="rtl">
      <div className="bg-white rounded-2xl max-w-xl w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">تحرير وإبرام عقد إيجار (إجراء سريع)</h3>
              <p className="text-xs text-slate-400">توثيق عقد جديد وربطه بالمستأجر والوحدة واحتساب الأقساط</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl font-bold flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Tenant Selector */}
          <div>
            <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-blue-600" />
              <span>طرف العقد الثاني (المستأجر):</span>
            </label>
            <select
              value={tenantId}
              onChange={e => setTenantId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
              required
            >
              {tenants.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} (هوية: {t.nationalId}) — رصيد قائم: {t.balance} ر.س
                </option>
              ))}
            </select>
          </div>

          {/* Property and Unit Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-emerald-600" />
                <span>العقار:</span>
              </label>
              <select
                value={propertyId}
                onChange={e => handlePropertyChange(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
                required
              >
                {properties.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.city})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">الوحدة الشاغرة:</label>
              <select
                value={unitId}
                onChange={e => handleUnitChange(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
                required
              >
                {vacantUnits.length === 0 ? (
                  <option value="">(لا توجد وحدات شاغرة بهذا العقار)</option>
                ) : (
                  vacantUnits.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.unitNumber} (طابق {u.floor}) — {formatCurrency(u.monthlyRent)}/شهر
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* Contract Period */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>تاريخ بداية العقد:</span>
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-mono text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>تاريخ نهاية العقد:</span>
              </label>
              <input
                type="date"
                required
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-mono text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Rent and Payment Frequency */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">القيمة الإيجارية السنوية (ر.س):</label>
              <input
                type="number"
                step="0.01"
                min="1"
                required
                value={annualRent}
                onChange={e => setAnnualRent(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-mono font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">دورية السداد والأقساط:</label>
              <select
                value={paymentFrequency}
                onChange={e => setPaymentFrequency(e.target.value as PaymentFrequency)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="MONTHLY">شهري (12 قسطاً في السنة)</option>
                <option value="QUARTERLY">ربع سنوي (4 أقساط - كل 3 أشهر)</option>
                <option value="SEMI_ANNUAL">نصف سنوي (قسطان - كل 6 أشهر)</option>
                <option value="ANNUAL">دفعة سنوية واحدة (قسط واحد)</option>
              </select>
            </div>
          </div>

          {/* Security Deposit */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">مبلغ تأمين الضمان المسترد (ر.س):</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={securityDeposit}
              onChange={e => setSecurityDeposit(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-mono font-bold text-blue-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Automatic Calculation Preview Box */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-blue-950">قيمة القسط الواحد المحتسبة:</span>
              <span className="font-mono font-black text-blue-900 text-sm">
                {formatCurrency(installmentAmount)}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-600 text-[11px] pt-1 border-t border-blue-100">
              <span>عدد الأقساط الدورية:</span>
              <span className="font-bold text-slate-800">{installmentsCount} أقساط / سنة</span>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">شروط وملاحظات إضافية للعقد:</label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="مثال: يلتزم المستأجر بسداد فواتير الكهرباء والمياه..."
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex items-center gap-2 text-slate-700 text-[11px]">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>فور الحفظ، سيتم تحويل حالة الوحدة إلى (مؤجرة OCCUPIED) وتوثيق العقد في سجل التدقيق المالي.</span>
          </div>

          {/* Action buttons */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting || vacantUnits.length === 0}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-bold transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <FileText className="w-4 h-4" />
              <span>{isSubmitting ? 'جاري التوثيق...' : 'توثيق وإبرام العقد'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
