/**
 * تصميم م. أبو أحمد — مصمم ومنفذ Claude — © الحقوق محفوظة
 *
 * FixedAssetsHub — شاشة الأصول الثابتة: مباني، أراضي، مولدات، معدات، أثاث، مركبات.
 * كل أصل جديد يُرحَّل له قيد اقتناء متوازن، والإهلاك الشهري يُرحَّل بقيد لكل شهر.
 */

import React, { useMemo, useState } from 'react';
import { Building2, Plus, X, TrendingDown, Landmark, Calculator, AlertCircle, CheckCircle2, Search } from 'lucide-react';
import { useStore } from '../../lib/store';
import { formatCurrency } from '../../lib/numberToArabicWords';
import { Badge } from '../common/Badge';
import { StatCard } from '../common/StatCard';
import { todayISO } from '../../lib/propertyService';
import {
  FIXED_ASSET_TYPE_META,
  FUNDING_ACCOUNTS,
  bookValue,
  monthlyDepreciation,
  monthOf
} from '../../lib/fixedAssetsService';
import type { FixedAssetType } from '../../types';

const TYPE_ORDER: FixedAssetType[] = ['BUILDING', 'LAND', 'GENERATOR', 'EQUIPMENT', 'FURNITURE', 'VEHICLE', 'OTHER'];

const typeBadge: Record<FixedAssetType, 'indigo' | 'emerald' | 'amber' | 'blue' | 'purple' | 'rose' | 'slate'> = {
  BUILDING: 'indigo',
  LAND: 'emerald',
  GENERATOR: 'amber',
  EQUIPMENT: 'blue',
  FURNITURE: 'purple',
  VEHICLE: 'rose',
  OTHER: 'slate'
};

export const FixedAssetsHub: React.FC = () => {
  const { fixedAssets, properties, currentUser, createFixedAsset, postDepreciation, canUserPerform } = useStore();

  const [typeFilter, setTypeFilter] = useState<'ALL' | FixedAssetType>('ALL');
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  // نموذج الإضافة
  const [name, setName] = useState('');
  const [assetType, setAssetType] = useState<FixedAssetType>('BUILDING');
  const [propertyId, setPropertyId] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(todayISO());
  const [cost, setCost] = useState('');
  const [salvage, setSalvage] = useState('0');
  const [lifeMonths, setLifeMonths] = useState(String(FIXED_ASSET_TYPE_META.BUILDING.defaultLifeMonths));
  const [funding, setFunding] = useState('1120');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  // الإهلاك
  const [throughMonth, setThroughMonth] = useState(monthOf(todayISO()));

  const isSupervisory = currentUser.role === 'ADMIN';
  const canEdit =
    !isSupervisory && currentUser.role === 'ACCOUNTANT' && canUserPerform('canCreateJournalEntries');

  const meta = FIXED_ASSET_TYPE_META[assetType];

  const totals = useMemo(() => {
    let cost = 0;
    let acc = 0;
    for (const a of fixedAssets) {
      cost += a.cost;
      acc += a.accumulatedDepreciation;
    }
    return { cost, acc, book: cost - acc };
  }, [fixedAssets]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return fixedAssets.filter(a => {
      if (typeFilter !== 'ALL' && a.assetType !== typeFilter) return false;
      if (!q) return true;
      return a.name.toLowerCase().includes(q) || a.assetCode.toLowerCase().includes(q);
    });
  }, [fixedAssets, typeFilter, search]);

  const propName = (id?: string) => properties.find(p => p.id === id)?.name;

  const onTypeChange = (t: FixedAssetType) => {
    setAssetType(t);
    setLifeMonths(String(FIXED_ASSET_TYPE_META[t].defaultLifeMonths));
    if (!FIXED_ASSET_TYPE_META[t].depreciable) setSalvage('0');
  };

  const resetForm = () => {
    setName('');
    setAssetType('BUILDING');
    setPropertyId('');
    setPurchaseDate(todayISO());
    setCost('');
    setSalvage('0');
    setLifeMonths(String(FIXED_ASSET_TYPE_META.BUILDING.defaultLifeMonths));
    setFunding('1120');
    setNotes('');
    setFormError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const res = createFixedAsset({
      name,
      assetType,
      propertyId: propertyId || undefined,
      purchaseDate,
      cost: Number(cost),
      salvageValue: meta.depreciable ? Number(salvage || 0) : 0,
      usefulLifeMonths: meta.depreciable ? Number(lifeMonths) : 0,
      fundingAccountCode: funding,
      notes
    });
    if (!res.success) {
      setFormError(res.error || 'تعذّر تسجيل الأصل');
      return;
    }
    setShowAdd(false);
    resetForm();
    setFeedback({
      ok: true,
      text: `تم تسجيل الأصل ${res.asset?.name} (${res.asset?.assetCode}) وترحيل قيد الاقتناء ${res.entry?.entryNumber}`
    });
  };

  const handleDepreciation = () => {
    const res = postDepreciation(throughMonth);
    if (!res.success) {
      setFeedback({ ok: false, text: res.error || 'تعذّر ترحيل الإهلاك' });
    } else if (res.postedCount === 0) {
      setFeedback({
        ok: !res.error,
        text: res.error || 'لا يوجد إهلاك مستحق حتى الشهر المحدد (كل ما استحق رُحِّل سابقًا)'
      });
    } else {
      setFeedback({
        ok: true,
        text: `تم ترحيل ${res.postedCount} قيد إهلاك بإجمالي ${formatCurrency(res.totalAmount)}${
          res.blockedMonth ? ` — توقف عند شهر ${res.blockedMonth} لأنه ضمن فترة مقفلة` : ''
        }`
      });
    }
  };

  return (
    <div className="space-y-5" dir="rtl">
      {/* العنوان */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <Landmark className="w-5 h-5 text-emerald-600" />
            الأصول الثابتة والإهلاك
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            المباني والأراضي والمولدات والمعدات والأثاث والمركبات — قيد اقتناء وإهلاك شهري بقيود مزدوجة متوازنة تظهر في ميزان المراجعة والميزانية.
          </p>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={() => {
              resetForm();
              setShowAdd(true);
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>تسجيل أصل ثابت</span>
          </button>
        )}
      </div>

      {isSupervisory && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-xl p-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>وظيفة المدير العام رقابية، وتسجيل الأصول وترحيل الإهلاك يتم بواسطة المحاسب المالي.</span>
        </div>
      )}

      {feedback && (
        <div
          className={`text-xs rounded-xl p-3 flex items-center gap-2 border ${
            feedback.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          {feedback.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span className="flex-1">{feedback.text}</span>
          <button type="button" onClick={() => setFeedback(null)} className="cursor-pointer opacity-60 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* المؤشرات */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard title="إجمالي تكلفة الأصول" value={formatCurrency(totals.cost)} subtitle={`${fixedAssets.length} أصل`} icon={Building2} accentColor="indigo" />
        <StatCard title="مجمع الإهلاك" value={formatCurrency(totals.acc)} icon={TrendingDown} accentColor="rose" />
        <StatCard title="صافي القيمة الدفترية" value={formatCurrency(totals.book)} icon={Landmark} accentColor="emerald" />
      </div>

      {/* ترحيل الإهلاك */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-end gap-3">
        <div className="flex items-start gap-3 flex-1">
          <div className="w-9 h-9 rounded-xl bg-slate-900 text-emerald-400 flex items-center justify-center shrink-0">
            <Calculator className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900">ترحيل الإهلاك الشهري</h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              يُرحَّل قيد لكل شهر مستحق (القسط الثابت) حتى الشهر المختار، ولا يُرحَّل الشهر نفسه مرتين، والأرض لا تُهلَك.
            </p>
          </div>
        </div>
        <div className="flex items-end gap-2">
          <label className="text-[11px] font-bold text-slate-600">
            حتى شهر
            <input
              type="month"
              value={throughMonth}
              onChange={e => setThroughMonth(e.target.value)}
              className="block mt-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              dir="ltr"
            />
          </label>
          <button
            type="button"
            disabled={!canEdit || fixedAssets.length === 0 || !throughMonth}
            onClick={handleDepreciation}
            className="bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer"
          >
            ترحيل الإهلاك المستحق
          </button>
        </div>
      </div>

      {/* الفلاتر */}
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو الرمز..."
            className="w-full bg-white border border-slate-300 rounded-xl pr-9 pl-3 py-2 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(['ALL', ...TYPE_ORDER] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setTypeFilter(t)}
              className={`text-[11px] font-bold px-3 py-1.5 rounded-lg border cursor-pointer transition-colors ${
                typeFilter === t
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {t === 'ALL' ? 'الكل' : FIXED_ASSET_TYPE_META[t].label}
            </button>
          ))}
        </div>
      </div>

      {/* الجدول */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto">
        <table className="w-full text-xs text-right min-w-[860px]">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="p-3">الرمز</th>
              <th className="p-3">الأصل</th>
              <th className="p-3">النوع</th>
              <th className="p-3">العقار</th>
              <th className="p-3">تاريخ الاقتناء</th>
              <th className="p-3">التكلفة</th>
              <th className="p-3">القسط الشهري</th>
              <th className="p-3">مجمع الإهلاك</th>
              <th className="p-3">القيمة الدفترية</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="p-8 text-center text-slate-400">
                  {fixedAssets.length === 0
                    ? 'لا توجد أصول ثابتة مسجلة بعد. اضغط «تسجيل أصل ثابت» لإضافة مبنى أو أرض أو مولد أو غيره.'
                    : 'لا نتائج مطابقة للبحث'}
                </td>
              </tr>
            )}
            {rows.map(a => (
              <tr key={a.id} className="hover:bg-slate-50/70">
                <td className="p-3 font-mono font-bold text-slate-700">{a.assetCode}</td>
                <td className="p-3 font-bold text-slate-900">{a.name}</td>
                <td className="p-3">
                  <Badge variant={typeBadge[a.assetType]} size="sm">
                    {FIXED_ASSET_TYPE_META[a.assetType].label}
                  </Badge>
                </td>
                <td className="p-3 text-slate-600">{propName(a.propertyId) || '—'}</td>
                <td className="p-3 font-mono text-slate-600">{a.purchaseDate}</td>
                <td className="p-3 font-mono">{formatCurrency(a.cost)}</td>
                <td className="p-3 font-mono text-slate-600">
                  {a.depreciationMethod === 'NONE' ? <span className="text-slate-400">لا يُهلَك</span> : formatCurrency(monthlyDepreciation(a))}
                </td>
                <td className="p-3 font-mono text-rose-700">{formatCurrency(a.accumulatedDepreciation)}</td>
                <td className="p-3 font-mono font-bold text-emerald-700">{formatCurrency(bookValue(a))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* نافذة الإضافة */}
      {showAdd && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3" role="dialog" aria-modal="true">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between rounded-t-2xl">
              <div className="flex items-center gap-2.5">
                <Landmark className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm">تسجيل أصل ثابت جديد</h3>
              </div>
              <button type="button" onClick={() => setShowAdd(false)} className="p-1 text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
              {formError && (
                <div className="bg-rose-50 border border-rose-300 text-rose-900 p-3 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block font-bold text-slate-700 sm:col-span-2">
                  اسم الأصل
                  <input
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="مثال: مبنى الإدارة / مولد كهرباء 100 كيلو"
                    className="mt-1 w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-normal focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </label>

                <label className="block font-bold text-slate-700">
                  نوع الأصل
                  <select
                    value={assetType}
                    onChange={e => onTypeChange(e.target.value as FixedAssetType)}
                    className="mt-1 w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-normal focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  >
                    {TYPE_ORDER.map(t => (
                      <option key={t} value={t}>
                        {FIXED_ASSET_TYPE_META[t].label}
                      </option>
                    ))}
                  </select>
                  <span className="block mt-1 text-[10px] font-normal text-slate-500">
                    يُسجَّل في الحساب {meta.accountCode} {meta.depreciable ? '' : '— الأرض لا تُهلَك'}
                  </span>
                </label>

                <label className="block font-bold text-slate-700">
                  العقار المرتبط (اختياري)
                  <select
                    value={propertyId}
                    onChange={e => setPropertyId(e.target.value)}
                    className="mt-1 w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-normal focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  >
                    <option value="">بدون ربط</option>
                    {properties.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block font-bold text-slate-700">
                  تاريخ الاقتناء
                  <input
                    type="date"
                    required
                    value={purchaseDate}
                    onChange={e => setPurchaseDate(e.target.value)}
                    className="mt-1 w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono font-normal focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    dir="ltr"
                  />
                </label>

                <label className="block font-bold text-slate-700">
                  تكلفة الاقتناء
                  <input
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                    value={cost}
                    onChange={e => setCost(e.target.value)}
                    className="mt-1 w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono font-normal focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    dir="ltr"
                  />
                </label>

                {meta.depreciable && (
                  <>
                    <label className="block font-bold text-slate-700">
                      القيمة التخريدية
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={salvage}
                        onChange={e => setSalvage(e.target.value)}
                        className="mt-1 w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono font-normal focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                        dir="ltr"
                      />
                    </label>
                    <label className="block font-bold text-slate-700">
                      العمر الإنتاجي (بالأشهر)
                      <input
                        type="number"
                        min="1"
                        max="1200"
                        step="1"
                        value={lifeMonths}
                        onChange={e => setLifeMonths(e.target.value)}
                        className="mt-1 w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono font-normal focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                        dir="ltr"
                      />
                      <span className="block mt-1 text-[10px] font-normal text-slate-500">
                        {lifeMonths && Number(lifeMonths) > 0 ? `≈ ${(Number(lifeMonths) / 12).toFixed(1)} سنة` : ''}
                      </span>
                    </label>
                  </>
                )}

                <label className="block font-bold text-slate-700 sm:col-span-2">
                  طريقة التمويل (الحساب الدائن في قيد الاقتناء)
                  <select
                    value={funding}
                    onChange={e => setFunding(e.target.value)}
                    className="mt-1 w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-normal focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  >
                    {FUNDING_ACCOUNTS.map(f => (
                      <option key={f.code} value={f.code}>
                        {f.label} ({f.code})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block font-bold text-slate-700 sm:col-span-2">
                  ملاحظات
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="mt-1 w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-normal focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </label>
              </div>

              {Number(cost) > 0 && meta.depreciable && Number(lifeMonths) > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-emerald-900">
                  القسط الشهري المتوقع:{' '}
                  <strong className="font-mono">
                    {formatCurrency((Number(cost) - Number(salvage || 0)) / Number(lifeMonths))}
                  </strong>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
                <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2 rounded-xl cursor-pointer shadow-xs">
                  حفظ وترحيل قيد الاقتناء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
