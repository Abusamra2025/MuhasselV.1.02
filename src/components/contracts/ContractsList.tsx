// تصميم م. أبو أحمد — مصمم ومنفذ Claude — © الحقوق محفوظة
import React, { useState } from 'react';
import { FileText, Plus, Calendar, DollarSign, User, Building, X, CheckCircle2, ShieldCheck, LogOut, AlertCircle } from 'lucide-react';
import { useStore } from '../../lib/store';
import { Contract, PaymentFrequency } from '../../types';
import { formatCurrency } from '../../lib/numberToArabicWords';
import { Badge } from '../common/Badge';
import {
  isUnitAvailable,
  todayISO,
  addDaysISO,
  nextContractNumber,
  contractDisplayState
} from '../../lib/propertyService';

export const ContractsList: React.FC = () => {
  const { contracts, tenants, properties, units, createContract, terminateContract, isSupervisoryOnly, canUserPerform, currentUser } = useStore();

  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [tenantId, setTenantId] = useState<string>(tenants[0]?.id || '');
  const [propertyId, setPropertyId] = useState<string>(properties[0]?.id || '');
  const [unitId, setUnitId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>(todayISO());
  const [endDate, setEndDate] = useState<string>(addDaysISO(todayISO(), 364));
  const [annualRent, setAnnualRent] = useState<string>('60000');
  const [paymentFrequency, setPaymentFrequency] = useState<PaymentFrequency>('QUARTERLY');
  const [securityDeposit, setSecurityDeposit] = useState<string>('5000');
  const [notes, setNotes] = useState<string>('');
  const [formError, setFormError] = useState<string>('');

  // إنهاء عقد
  const [terminatingId, setTerminatingId] = useState<string | null>(null);
  const [termDate, setTermDate] = useState<string>(todayISO());
  const [termReason, setTermReason] = useState<string>('');
  const [termError, setTermError] = useState<string>('');
  const terminatingContract = contracts.find(c => c.id === terminatingId);
  const canManage = !isSupervisoryOnly && currentUser.role === 'ACCOUNTANT' && canUserPerform('canManageContracts');

  const vacantUnits = units.filter(u => u.propertyId === propertyId && isUnitAvailable(u, contracts));

  const numAnnual = parseFloat(annualRent) || 0;
  const numDep = parseFloat(securityDeposit) || 0;

  const installmentAmount = paymentFrequency === 'MONTHLY'
    ? Math.round((numAnnual / 12) * 100) / 100
    : paymentFrequency === 'QUARTERLY'
    ? Math.round((numAnnual / 4) * 100) / 100
    : paymentFrequency === 'SEMI_ANNUAL'
    ? Math.round((numAnnual / 2) * 100) / 100
    : numAnnual;

  const handleCreateContract = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId || !propertyId || !unitId || numAnnual <= 0) return;

    setFormError('');
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
      notes: notes || 'عقد إيجار موثق'
    });

    if (!res.success) {
      setFormError(res.error || 'تعذّر إبرام العقد');
      return;
    }
    setShowAddModal(false);
  };

  const handleTerminate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!terminatingId) return;
    setTermError('');
    const res = terminateContract(terminatingId, { date: termDate, reason: termReason });
    if (!res.success) {
      setTermError(res.error || 'تعذّر إنهاء العقد');
      return;
    }
    setTerminatingId(null);
    setTermReason('');
  };

  const stateBadge = (con: Contract) => {
    switch (contractDisplayState(con)) {
      case 'ACTIVE': return <Badge variant="emerald" size="sm">ساري ونشط</Badge>;
      case 'UPCOMING': return <Badge variant="blue" size="sm">قادم (لم يبدأ)</Badge>;
      case 'EXPIRED_UNRESOLVED': return <Badge variant="amber" size="sm">انتهت مدته — يحتاج إنهاء/تجديد</Badge>;
      case 'EXPIRED': return <Badge variant="slate" size="sm">منتهٍ</Badge>;
      case 'TERMINATED': return <Badge variant="rose" size="sm">مُنهى / مُخلى</Badge>;
      case 'DRAFT': return <Badge variant="slate" size="sm">مسودة</Badge>;
    }
  };

  const getFreqArabic = (freq: PaymentFrequency) => {
    switch (freq) {
      case 'MONTHLY': return 'شهري';
      case 'QUARTERLY': return 'ربع سنوي (3 أشهر)';
      case 'SEMI_ANNUAL': return 'نصف سنوي (6 أشهر)';
      case 'ANNUAL': return 'دفعة سنوية واحدة';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900">سجل عقود الإيجار</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            إدارة تواريخ البداية والنهاية، دورية السداد، وتأمينات الضمان المعتمدة
          </p>
        </div>

        {isSupervisoryOnly || currentUser.role !== 'ACCOUNTANT' ? (
          <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 shadow-2xs">
            <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
            <span>صلاحية تحرير وإبرام عقود الإيجار مسندة حصراً للمحاسب المالي (حساب رقابي/استعراض)</span>
          </div>
        ) : canUserPerform('canManageContracts') ? (
          <button
            onClick={() => {
              setShowAddModal(true);
              if (vacantUnits[0]) setUnitId(vacantUnits[0].id);
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إبرام عقد إيجار جديد</span>
          </button>
        ) : null}
      </div>

      {/* Contracts Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3.5">رقم العقد</th>
                <th className="p-3.5">المستأجر</th>
                <th className="p-3.5">العقار والوحدة</th>
                <th className="p-3.5">فترة العقد</th>
                <th className="p-3.5 text-left font-mono">القيمة السنوية</th>
                <th className="p-3.5">دورية السداد</th>
                <th className="p-3.5 text-left font-mono">قيمة القسط</th>
                <th className="p-3.5 text-left font-mono">تأمين الضمان</th>
                <th className="p-3.5">حالة العقد</th>
                {canManage && <th className="p-3.5">إجراء</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {contracts.map(con => {
                const tenant = tenants.find(t => t.id === con.tenantId);
                const prop = properties.find(p => p.id === con.propertyId);
                const unit = units.find(u => u.id === con.unitId);

                return (
                  <tr key={con.id} className="hover:bg-slate-50">
                    <td className="p-3.5 font-mono font-bold text-slate-900">
                      {con.contractNumber}
                    </td>
                    <td className="p-3.5 font-bold text-slate-800">
                      {tenant?.name || '---'}
                    </td>
                    <td className="p-3.5 text-slate-600">
                      {prop?.name} · {unit?.unitNumber}
                    </td>
                    <td className="p-3.5 font-mono text-slate-500 text-[11px]">
                      {con.startDate} إلى {con.endDate}
                    </td>
                    <td className="p-3.5 text-left font-mono font-bold text-slate-900">
                      {formatCurrency(con.annualRent)}
                    </td>
                    <td className="p-3.5 text-slate-700">
                      {getFreqArabic(con.paymentFrequency)}
                    </td>
                    <td className="p-3.5 text-left font-mono font-bold text-emerald-700">
                      {formatCurrency(con.installmentAmount)}
                    </td>
                    <td className="p-3.5 text-left font-mono font-bold text-blue-700">
                      {formatCurrency(con.securityDeposit)}
                    </td>
                    <td className="p-3.5">
                      {stateBadge(con)}
                      {con.terminationDate && (
                        <div className="text-[10px] text-slate-500 mt-1 font-mono">بتاريخ {con.terminationDate}</div>
                      )}
                    </td>
                    {canManage && (
                      <td className="p-3.5">
                        {con.status === 'ACTIVE' ? (
                          <button
                            type="button"
                            onClick={() => {
                              setTerminatingId(con.id);
                              setTermDate(todayISO());
                              setTermReason('');
                              setTermError('');
                            }}
                            className="text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer"
                          >
                            <LogOut className="w-3 h-3" />
                            <span>إنهاء وإخلاء</span>
                          </button>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Contract Modal */}
      {showAddModal && canUserPerform('canManageContracts') && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 text-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">إبرام وتوثيق عقد إيجار جديد</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateContract} className="space-y-3">
              {formError && (
                <div className="bg-rose-50 border border-rose-300 text-rose-900 p-3 rounded-xl flex items-start gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}
              <div>
                <label className="block font-bold text-slate-700 mb-1">المستأجر</label>
                <select
                  value={tenantId}
                  onChange={e => setTenantId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium"
                  required
                >
                  {tenants.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.phone})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">العقار</label>
                  <select
                    value={propertyId}
                    onChange={e => {
                      setPropertyId(e.target.value);
                      const matching = units.filter(u => u.propertyId === e.target.value && isUnitAvailable(u, contracts));
                      if (matching[0]) setUnitId(matching[0].id);
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium"
                    required
                  >
                    {properties.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">الوحدة الشاغرة</label>
                  <select
                    value={unitId}
                    onChange={e => setUnitId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium"
                    required
                  >
                    {vacantUnits.length === 0 ? (
                      <option value="">(لا توجد وحدات شاغرة)</option>
                    ) : (
                      vacantUnits.map(u => (
                        <option key={u.id} value={u.id}>{u.unitNumber} - {formatCurrency(u.monthlyRent)}/شهر</option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">تاريخ البداية</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">تاريخ النهاية</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">القيمة الإيجارية السنوية (ر.س)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={annualRent}
                    onChange={e => setAnnualRent(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono font-bold text-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">دورية السداد</label>
                  <select
                    value={paymentFrequency}
                    onChange={e => setPaymentFrequency(e.target.value as PaymentFrequency)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-bold"
                  >
                    <option value="MONTHLY">شهري (12 قسط)</option>
                    <option value="QUARTERLY">ربع سنوي (4 أقساط)</option>
                    <option value="SEMI_ANNUAL">نصف سنوي (قسطان)</option>
                    <option value="ANNUAL">سنوي (قسط واحد)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">مبلغ تأمين الضمان المسترد (ر.س)</label>
                <input
                  type="number"
                  step="0.01"
                  value={securityDeposit}
                  onChange={e => setSecurityDeposit(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono font-bold text-blue-900"
                  required
                />
              </div>

              {/* Installment calculation summary */}
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 flex justify-between font-bold">
                <span>قيمة القسط الواحد المحتسبة:</span>
                <span className="font-mono text-emerald-800">{formatCurrency(installmentAmount)}</span>
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
                  disabled={!unitId}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg font-bold"
                >
                  إبرام العقد وتسكين الوحدة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Terminate Contract Modal */}
      {terminatingContract && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">إنهاء العقد {terminatingContract.contractNumber}</h3>
              <button type="button" onClick={() => setTerminatingId(null)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-slate-600 leading-relaxed">
              سيُنهى العقد وتصبح الوحدة شاغرة وجاهزة لإيجار جديد. الفواتير والقيود المحاسبية السابقة تبقى كما هي، ولا تُحذف.
              التسوية المالية للمستأجر (التأمين والأرصدة) تتم بالطرق المعتادة.
            </p>
            {termError && (
              <div className="bg-rose-50 border border-rose-300 text-rose-900 p-3 rounded-xl flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{termError}</span>
              </div>
            )}
            <form onSubmit={handleTerminate} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">تاريخ الإنهاء والإخلاء</label>
                <input
                  type="date"
                  value={termDate}
                  onChange={e => setTermDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono"
                  dir="ltr"
                  required
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">السبب (اختياري)</label>
                <input
                  value={termReason}
                  onChange={e => setTermReason(e.target.value)}
                  placeholder="مثال: إخلاء بطلب المستأجر / فسخ لعدم السداد"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setTerminatingId(null)} className="px-4 py-2 bg-slate-100 rounded-lg font-bold cursor-pointer">
                  تراجع
                </button>
                <button type="submit" className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold cursor-pointer">
                  تأكيد الإنهاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
