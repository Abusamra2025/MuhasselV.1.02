// تصميم م. أبو أحمد — مصمم ومنفذ Claude — © الحقوق محفوظة
import React from 'react';
import { X, Building, MapPin, Layers, CheckCircle2, AlertCircle, Wrench } from 'lucide-react';
import { Property, Unit } from '../../types';
import { useStore } from '../../lib/store';
import { formatCurrency } from '../../lib/numberToArabicWords';
import { Badge } from './Badge';

interface PropertyDetailsModalProps {
  property: Property | null;
  onClose: () => void;
}

export const PropertyDetailsModal: React.FC<PropertyDetailsModalProps> = ({
  property,
  onClose
}) => {
  const { units } = useStore();

  if (!property) return null;

  const propUnits = units.filter(u => u.propertyId === property.id);
  const occupiedCount = propUnits.filter(u => u.status === 'OCCUPIED').length;
  const vacantCount = propUnits.filter(u => u.status === 'VACANT').length;
  const maintenanceCount = propUnits.filter(u => u.status === 'MAINTENANCE').length;
  const occupancyRate = propUnits.length > 0 ? Math.round((occupiedCount / propUnits.length) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-right"
        onClick={e => e.stopPropagation()}
        dir="rtl"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-lg">{property.name}</h3>
                <span className="font-mono text-xs bg-slate-200 text-slate-800 px-2 py-0.5 rounded font-bold">
                  {property.code}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {property.city} - {property.address}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
              <p className="text-xs text-slate-500 font-medium">إجمالي الوحدات</p>
              <p className="text-lg font-black text-slate-900 mt-1">{propUnits.length}</p>
            </div>
            <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-center">
              <p className="text-xs text-emerald-700 font-medium">الوحدات المؤجرة</p>
              <p className="text-lg font-black text-emerald-800 mt-1">{occupiedCount}</p>
            </div>
            <div className="bg-blue-50 p-3 rounded-xl border border-blue-200 text-center">
              <p className="text-xs text-blue-700 font-medium">نسبة الإشغال</p>
              <p className="text-lg font-black text-blue-800 mt-1">{occupancyRate}%</p>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-700 mb-2">وحدات العقار المسجلة:</h4>
            <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
              {propUnits.map(unit => (
                <div
                  key={unit.id}
                  className="p-2.5 rounded-lg border border-slate-200 bg-white flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800">{unit.unitNumber}</span>
                    <span className="text-slate-400">الدور {unit.floor}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-700">
                      {formatCurrency(unit.monthlyRent)}/شهرياً
                    </span>
                    <Badge
                      variant={
                        unit.status === 'OCCUPIED'
                          ? 'emerald'
                          : unit.status === 'VACANT'
                          ? 'blue'
                          : 'amber'
                      }
                      size="sm"
                    >
                      {unit.status === 'OCCUPIED'
                        ? 'مؤجرة'
                        : unit.status === 'VACANT'
                        ? 'شاغرة'
                        : 'صيانة'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
