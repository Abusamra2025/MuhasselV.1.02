// تصميم م. أبو أحمد — مصمم ومنفذ Claude — © الحقوق محفوظة
import React, { useState } from 'react';
import { Building, X, MapPin, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useStore } from '../../lib/store';
import { Property, PropertyType } from '../../types';

interface CreatePropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (property: Property) => void;
}

export const CreatePropertyModal: React.FC<CreatePropertyModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { properties, createProperty, currentUser, canUserPerform } = useStore();

  const nextCodeNum = String(properties.length + 1).padStart(2, '0');
  const [code, setCode] = useState(`PR-${nextCodeNum}`);
  const [name, setName] = useState('');
  const [type, setType] = useState<PropertyType>('RESIDENTIAL');
  const [city, setCity] = useState('الرياض');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  if (currentUser.role !== 'ACCOUNTANT' || !canUserPerform('canManageProperties')) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto no-print" dir="rtl">
        <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-center space-y-4 animate-in fade-in zoom-in-95">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <h3 className="font-bold text-base text-slate-900">صلاحية محصورة بالمحاسب المالي</h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              إضافة العقارات والوحدات مسندة حصراً للمحاسب المالي المعتمد لضمان دقة الترميز المحاسبي ومراكز التكلفة، وهي معزولة عن باقي المستخدمين والمشرفين.
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name.trim()) {
      setErrorMsg('يرجى إدخال اسم العقار');
      return;
    }
    if (!code.trim()) {
      setErrorMsg('يرجى إدخال رمز العقار المرجعي');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = createProperty({
        code: code.trim(),
        name: name.trim(),
        address: address.trim() || 'شارع رئيسي',
        city: city.trim(),
        type,
        totalUnits: 0,
        notes: notes.trim() || undefined
      });

      setIsSubmitting(false);

      if (res.success && res.property) {
        if (onSuccess) onSuccess(res.property);
        onClose();
      } else {
        setErrorMsg(res.error || 'حدث خطأ أثناء حفظ العقار');
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMsg(err?.message || 'حدث خطأ غير متوقع');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto no-print" dir="rtl">
      <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-xs">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">إضافة عقار جديد (إجراء سريع)</h3>
              <p className="text-xs text-slate-400">تسجيل عقار جديد وتحديده في الدليل العقاري مباشرة</p>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl font-bold animate-in fade-in">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">رمز العقار:</label>
              <input
                type="text"
                required
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder="مثال: PR-04"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-mono font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">نوع العقار:</label>
              <select
                value={type}
                onChange={e => setType(e.target.value as PropertyType)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="RESIDENTIAL">سكني (عمائر شقق وفلل)</option>
                <option value="COMMERCIAL">تجاري (معارض ومكاتب)</option>
                <option value="MIXED">مختلط (تجاري وسكني)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">اسم العقار / البرج:</label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="مثال: برج الياسمين السكني أو مجمع النخيل التجاري"
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">المدينة:</label>
              <select
                value={city}
                onChange={e => setCity(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="الرياض">الرياض</option>
                <option value="جدة">جدة</option>
                <option value="الدمام">الدمام</option>
                <option value="مكة المكرمة">مكة المكرمة</option>
                <option value="المدينة المنورة">المدينة المنورة</option>
                <option value="الخبر">الخبر</option>
                <option value="أبها">أبها</option>
                <option value="بريدة">بريدة</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">العنوان والحي:</label>
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="مثال: حي العليا، طريق الملك فهد"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">ملاحظات العقار:</label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="وصف إضافي للموقع أو المرافق..."
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl flex items-center gap-2 text-emerald-900 text-[11px]">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>سيتم توثيق العقار فوراً في قاعدة البيانات وسجل التدقيق وإتاحته لإضافة الوحدات وتأجيرها.</span>
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
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <Building className="w-4 h-4" />
              <span>{isSubmitting ? 'جاري الحفظ...' : 'حفظ وتسجيل العقار'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
