// تصميم م. أبو أحمد — مصمم ومنفذ Claude — © الحقوق محفوظة
import React, { useState } from 'react';
import { Building, Plus, Home, MapPin, CheckCircle2, AlertCircle, Wrench, X, ShieldCheck } from 'lucide-react';
import { useStore } from '../../lib/store';
import { Property, Unit, UnitStatus, PropertyType, UnitType } from '../../types';
import { formatCurrency } from '../../lib/numberToArabicWords';
import { Badge } from '../common/Badge';
import { VacancyPanel } from './VacancyPanel';

export const PropertiesList: React.FC = () => {
  const { properties, units, tenants, createProperty, createUnit, canUserPerform, isSupervisoryOnly, currentUser } = useStore();

  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(properties[0]?.id || '');
  const [unitStatusFilter, setUnitStatusFilter] = useState<'ALL' | UnitStatus>('ALL');
  
  const [showAddPropertyModal, setShowAddPropertyModal] = useState<boolean>(false);
  const [showAddUnitModal, setShowAddUnitModal] = useState<boolean>(false);

  // New Property Form State
  const [newPropCode, setNewPropCode] = useState('');
  const [newPropName, setNewPropName] = useState('');
  const [newPropAddress, setNewPropAddress] = useState('');
  const [newPropCity, setNewPropCity] = useState('الرياض');
  const [newPropType, setNewPropType] = useState<PropertyType>('RESIDENTIAL');

  // New Unit Form State
  const [newUnitNum, setNewUnitNum] = useState('');
  const [newUnitFloor, setNewUnitFloor] = useState('1');
  const [newUnitType, setNewUnitType] = useState<UnitType>('APARTMENT');
  const [newUnitRent, setNewUnitRent] = useState('');

  const currentProp = properties.find(p => p.id === selectedPropertyId);
  const currentUnits = units.filter(u => u.propertyId === selectedPropertyId);

  const filteredUnits = currentUnits.filter(u => {
    if (unitStatusFilter === 'ALL') return true;
    return u.status === unitStatusFilter;
  });

  const occupiedCount = currentUnits.filter(u => u.status === 'OCCUPIED').length;
  const vacantCount = currentUnits.filter(u => u.status === 'VACANT').length;
  const maintenanceCount = currentUnits.filter(u => u.status === 'MAINTENANCE').length;
  const occupancyRate = currentUnits.length > 0 ? Math.round((occupiedCount / currentUnits.length) * 100) : 0;

  const handleCreateProperty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPropName || !newPropCode) return;
    createProperty({
      code: newPropCode,
      name: newPropName,
      address: newPropAddress || 'حي تجاري',
      city: newPropCity,
      type: newPropType,
      totalUnits: 0
    });
    setShowAddPropertyModal(false);
    setNewPropCode('');
    setNewPropName('');
    setNewPropAddress('');
  };

  const handleCreateUnit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUnitNum || !newUnitRent || !selectedPropertyId) return;
    createUnit({
      propertyId: selectedPropertyId,
      unitNumber: newUnitNum,
      floor: parseInt(newUnitFloor) || 1,
      type: newUnitType,
      monthlyRent: parseFloat(newUnitRent) || 0,
      status: 'VACANT'
    });
    setShowAddUnitModal(false);
    setNewUnitNum('');
    setNewUnitRent('');
  };

  return (
    <div className="space-y-6">
      
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900">إدارة العقارات والوحدات التأجيرية</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            متابعة نسب الإشغال، والوحدات الشاغرة والمؤجرة لكل عقار
          </p>
        </div>

        {canUserPerform('canManageProperties') ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddPropertyModal(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة عقار جديد</span>
            </button>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs px-3.5 py-2 rounded-xl font-bold flex items-center gap-2 shadow-2xs">
            <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
            <span>صلاحية إضافة العقارات مسندة حصراً للمحاسب المالي (حساب رقابي/استعراض)</span>
          </div>
        )}
      </div>

      {/* لوحة الشواغر (محسوبة من العقود) */}
      <VacancyPanel />

      {/* Property Cards Selector */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {properties.map(prop => {
          const pUnits = units.filter(u => u.propertyId === prop.id);
          const pOccupied = pUnits.filter(u => u.status === 'OCCUPIED').length;
          const isSelected = prop.id === selectedPropertyId;

          return (
            <div
              key={prop.id}
              onClick={() => setSelectedPropertyId(prop.id)}
              className={`p-4 rounded-xl border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-white border-emerald-500 shadow-sm ring-1 ring-emerald-500'
                  : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                    {prop.code}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 mt-2">{prop.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{prop.city} · {prop.address}</span>
                  </p>
                </div>
                <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                  <Building className="w-5 h-5" />
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                <span>الوحدات: <strong className="text-slate-900">{pUnits.length}</strong></span>
                <span>الإشغال: <strong className="text-emerald-700 font-bold">{pOccupied}/{pUnits.length}</strong></span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Property Details & Unit Grid */}
      {currentProp && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-5">
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">{currentProp.name}</h3>
                <Badge variant="slate" size="sm">{currentProp.type === 'RESIDENTIAL' ? 'سكني' : 'تجاري'}</Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                معدل الإشغال الإجمالي: <strong>{occupancyRate}%</strong> (مؤجر: {occupiedCount} · شاغر: {vacantCount} · صيانة: {maintenanceCount})
              </p>
            </div>

            {canUserPerform('canManageProperties') && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAddUnitModal(true)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 border border-slate-200 cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-emerald-600" />
                  <span>إضافة وحدة لهذا العقار</span>
                </button>
              </div>
            )}
          </div>

          {/* Unit Status Filter Pills */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-bold w-fit">
            <button
              onClick={() => setUnitStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                unitStatusFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              جميع الوحدات ({currentUnits.length})
            </button>
            <button
              onClick={() => setUnitStatusFilter('OCCUPIED')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                unitStatusFilter === 'OCCUPIED' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              مؤجرة ({occupiedCount})
            </button>
            <button
              onClick={() => setUnitStatusFilter('VACANT')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                unitStatusFilter === 'VACANT' ? 'bg-white text-blue-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              شاغرة جاهزة ({vacantCount})
            </button>
            <button
              onClick={() => setUnitStatusFilter('MAINTENANCE')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                unitStatusFilter === 'MAINTENANCE' ? 'bg-white text-amber-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              تحت الصيانة ({maintenanceCount})
            </button>
          </div>

          {/* Units Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {filteredUnits.map(unit => {
              const currentTenant = tenants.find(t => t.id === unit.currentTenantId);

              return (
                <div
                  key={unit.id}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-slate-900 text-sm">{unit.unitNumber}</span>
                      {unit.status === 'OCCUPIED' ? (
                        <Badge variant="emerald" size="sm">مؤجرة</Badge>
                      ) : unit.status === 'VACANT' ? (
                        <Badge variant="blue" size="sm">شاغرة</Badge>
                      ) : (
                        <Badge variant="amber" size="sm">صيانة</Badge>
                      )}
                    </div>

                    <p className="text-slate-500 text-[11px]">
                      الطابق {unit.floor} · {unit.type === 'APARTMENT' ? 'شقة سكنية' : unit.type === 'SHOP' ? 'معرض تجاري' : unit.type === 'OFFICE' ? 'مكتب تجاري' : 'فيلا'}
                    </p>

                    {unit.status === 'OCCUPIED' && currentTenant ? (
                      <div className="mt-2 p-2 bg-white rounded-lg border border-slate-100">
                        <span className="text-[10px] text-slate-400 block">المستأجر الحالي:</span>
                        <p className="font-bold text-slate-800 truncate">{currentTenant.name}</p>
                      </div>
                    ) : (
                      <div className="mt-2 p-2 bg-white rounded-lg border border-slate-100 text-slate-400 text-[11px]">
                        جاهزة لإبرام عقد جديد
                      </div>
                    )}
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-200/80 flex items-center justify-between font-mono">
                    <span className="text-slate-500 text-[11px]">الإيجار الشهري:</span>
                    <span className="font-bold text-slate-900">{formatCurrency(unit.monthlyRent)}</span>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* Add Property Modal */}
      {showAddPropertyModal && canUserPerform('canManageProperties') && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">إضافة عقار أو مجمع جديد</h3>
              <button onClick={() => setShowAddPropertyModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProperty} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">كود العقار</label>
                <input
                  type="text"
                  placeholder="مثال: BLD-404"
                  value={newPropCode}
                  onChange={e => setNewPropCode(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">اسم العقار / البرج</label>
                <input
                  type="text"
                  placeholder="مثال: مجمع الروضة السكني"
                  value={newPropName}
                  onChange={e => setNewPropName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">المدينة</label>
                  <input
                    type="text"
                    value={newPropCity}
                    onChange={e => setNewPropCity(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">نوع العقار</label>
                  <select
                    value={newPropType}
                    onChange={e => setNewPropType(e.target.value as PropertyType)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-bold"
                  >
                    <option value="RESIDENTIAL">سكني</option>
                    <option value="COMMERCIAL">تجاري / مكاتب</option>
                    <option value="MIXED">مختلط</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">العنوان والشارع</label>
                <input
                  type="text"
                  placeholder="حي الروضة، طريق خريص"
                  value={newPropAddress}
                  onChange={e => setNewPropAddress(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddPropertyModal(false)}
                  className="px-4 py-2 bg-slate-100 rounded-lg font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold"
                >
                  حفظ العقار
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Unit Modal */}
      {showAddUnitModal && canUserPerform('canManageProperties') && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">إضافة وحدة عقارية جديدة</h3>
              <button onClick={() => setShowAddUnitModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUnit} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">رقم أو اسم الوحدة</label>
                <input
                  type="text"
                  placeholder="مثال: شقة 501 أو مكتب 302"
                  value={newUnitNum}
                  onChange={e => setNewUnitNum(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">الطابق</label>
                  <input
                    type="number"
                    value={newUnitFloor}
                    onChange={e => setNewUnitFloor(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">نوع الوحدة</label>
                  <select
                    value={newUnitType}
                    onChange={e => setNewUnitType(e.target.value as UnitType)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-bold"
                  >
                    <option value="APARTMENT">شقة سكنية</option>
                    <option value="OFFICE">مكتب إداري</option>
                    <option value="SHOP">معرض تجاري</option>
                    <option value="VILLA">فيلا</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">الإيجار الشهري التقديري (ر.س)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="5000"
                  value={newUnitRent}
                  onChange={e => setNewUnitRent(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono font-bold"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddUnitModal(false)}
                  className="px-4 py-2 bg-slate-100 rounded-lg font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold"
                >
                  إضافة الوحدة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
