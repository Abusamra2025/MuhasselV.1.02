/**
 * تصميم م. أبو أحمد — مصمم ومنفذ Claude — © الحقوق محفوظة
 *
 * VacancyPanel — لوحة الشواغر: العدد، النسبة، مدة الشغور، الخسارة الإيجارية التقديرية،
 * مع تصفية حسب العقار. تعتمد على propertyService (مصدر الحقيقة الوحيد لحالة الوحدات).
 */

import React, { useMemo, useState } from 'react';
import { DoorOpen, TrendingDown, Clock, AlertTriangle, CalendarClock } from 'lucide-react';
import { useStore } from '../../lib/store';
import { computeVacancyStats } from '../../lib/propertyService';
import { formatCurrency } from '../../lib/numberToArabicWords';
import { Badge } from '../common/Badge';
import { StatCard } from '../common/StatCard';

export const VacancyPanel: React.FC = () => {
  const { units, contracts, properties } = useStore();
  const [propertyId, setPropertyId] = useState<string>('');

  const stats = useMemo(
    () => computeVacancyStats({ units, contracts, properties, propertyId: propertyId || undefined }),
    [units, contracts, properties, propertyId]
  );

  const totalLossToDate = useMemo(
    () => stats.vacantUnits.reduce((s, v) => s + v.estimatedLossToDate, 0),
    [stats.vacantUnits]
  );
  const needsAction = stats.vacantUnits.filter(v => v.recentlyExpiredContract).length;

  if (units.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4" dir="rtl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <DoorOpen className="w-5 h-5 text-blue-600" />
            لوحة الشواغر
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            الحالة محسوبة تلقائيًا من العقود الساريّة اليوم ({stats.date}) — لا تحديث يدوي.
          </p>
        </div>
        <select
          value={propertyId}
          onChange={e => setPropertyId(e.target.value)}
          className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold w-full sm:w-56"
          aria-label="تصفية حسب العقار"
        >
          <option value="">كل العقارات</option>
          {properties.map(p => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="وحدات شاغرة" value={stats.vacant} subtitle={`من ${stats.total} وحدة`} icon={DoorOpen} accentColor="blue" />
        <StatCard title="نسبة الشغور" value={`${stats.vacancyRate}%`} subtitle={`الإشغال ${stats.occupancyRate}%`} icon={Clock} accentColor="amber" />
        <StatCard title="فاقد الإيجار الشهري" value={formatCurrency(stats.estimatedMonthlyLoss)} subtitle="لو بقيت شاغرة شهرًا" icon={TrendingDown} accentColor="rose" />
        <StatCard title="خسارة منذ الشغور" value={formatCurrency(totalLossToDate)} subtitle={stats.maintenance ? `+ ${stats.maintenance} تحت الصيانة` : undefined} icon={CalendarClock} accentColor="slate" />
      </div>

      {needsAction > 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-xl p-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>
            {needsAction} وحدة لها عقد انتهت مدته ولم يُنهَ رسميًا. جدّد العقد أو أنهِه من شاشة العقود لتصفية المطالبات.
          </span>
        </div>
      )}

      {stats.vacantUnits.length === 0 ? (
        <div className="text-center text-xs text-slate-400 py-6">لا توجد وحدات شاغرة حاليًا 🎉</div>
      ) : (
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-xs text-right min-w-[640px]">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="p-3">العقار</th>
                <th className="p-3">الوحدة</th>
                <th className="p-3">الإيجار الشهري</th>
                <th className="p-3">شاغرة منذ</th>
                <th className="p-3">المدة</th>
                <th className="p-3">الخسارة التقديرية</th>
                <th className="p-3">ملاحظة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stats.vacantUnits.map(v => (
                <tr key={v.unit.id} className="hover:bg-slate-50/70">
                  <td className="p-3 text-slate-700">{v.property?.name || '—'}</td>
                  <td className="p-3 font-bold text-slate-900">{v.unit.unitNumber}</td>
                  <td className="p-3 font-mono">{v.monthlyRent ? formatCurrency(v.monthlyRent) : <span className="text-slate-400">غير محدد</span>}</td>
                  <td className="p-3 font-mono text-slate-600">{v.vacantSince || '—'}</td>
                  <td className="p-3">{v.neverRented ? <Badge variant="slate" size="sm">لم تؤجَّر بعد</Badge> : `${v.vacantDays} يوم`}</td>
                  <td className="p-3 font-mono text-rose-700">{v.estimatedLossToDate ? formatCurrency(v.estimatedLossToDate) : '—'}</td>
                  <td className="p-3">
                    {v.upcomingContract ? (
                      <Badge variant="blue" size="sm">حجز قادم {v.upcomingContract.startDate}</Badge>
                    ) : v.recentlyExpiredContract ? (
                      <Badge variant="amber" size="sm">عقد منتهٍ يحتاج إجراء</Badge>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
