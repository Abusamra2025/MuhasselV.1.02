// تصميم م. أبو أحمد — مصمم ومنفذ Claude — © الحقوق محفوظة
import React, { useState } from 'react';
import {
  ShieldAlert,
  Lock,
  KeyRound,
  AlertTriangle,
  RotateCcw,
  Trash2,
  Database,
  Sparkles,
  CheckCircle2,
  X,
  Loader2,
  Layers,
  FileSpreadsheet,
  Building,
  Receipt,
  Eye,
  EyeOff,
  Zap,
  Info
} from 'lucide-react';
import { useStore } from '../../lib/store';
import { SystemClearDataMode, SystemEnvironmentMode } from '../../types';
import { Badge } from '../common/Badge';

interface SystemDataResetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SystemDataResetModal: React.FC<SystemDataResetModalProps> = ({
  isOpen,
  onClose
}) => {
  const {
    currentUser,
    clearSystemData,
    properties,
    units,
    tenants,
    contracts,
    invoices,
    payments,
    expenses,
    journalEntries,
    systemMode,
    isSupervisoryOnly
  } = useStore();

  const [selectedMode, setSelectedMode] = useState<SystemClearDataMode>('TRANSACTIONS_ONLY');
  const [adminPassword, setAdminPassword] = useState('');
  const [confirmationWord, setConfirmationWord] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  if (!isOpen) return null;

  const currentMode: SystemEnvironmentMode = systemMode || 'DEMO';

  const handleResetAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!adminPassword.trim()) {
      setErrorMessage('يرجى إدخال كلمة سر المدير العام للمتابعة');
      return;
    }

    if (selectedMode === 'FULL_WIPE' && confirmationWord.trim() !== 'تصفير') {
      setErrorMessage('يرجى كتابة كلمة (تصفير) في حقل التأكيد للموافقة على إعادة ضبط المصنع الكاملة');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await clearSystemData({
        mode: selectedMode,
        adminPassword: adminPassword.trim()
      });

      if (result.success) {
        setSuccessMessage(
          selectedMode === 'TRANSACTIONS_ONLY'
            ? 'تم بنجاح تصفير العمليات التشغيلية والمحاسبية وتجهيز النظام لبدء العمل الحقيقي'
            : selectedMode === 'SEED_DEMO'
            ? 'تم تحميل حزمة البيانات التجريبية النموذجية بنجاح للتدريب'
            : selectedMode === 'FULL_WIPE'
            ? 'تمت إعادة ضبط المصنع الشاملة وتفريغ النظام بالكامل بنجاح'
            : 'تم تغيير بيئة النظام التشغيلية بنجاح'
        );
        setAdminPassword('');
        setConfirmationWord('');
        setTimeout(() => {
          onClose();
          setSuccessMessage('');
        }, 2200);
      } else {
        setErrorMessage(result.error || 'فشل تنفيذ العملية. تأكد من صحة كلمة مرور المدير.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'حدث خطأ غير متوقع أثناء معالجة الطلب');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div 
        className="bg-white border border-slate-200 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden my-auto text-right"
        dir="rtl"
      >
        {/* Modal Top Header with Security Amber/Red Ribbon */}
        <div className="bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 text-white p-5 flex items-center justify-between border-b border-rose-900/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600/30 border border-rose-500/50 flex items-center justify-center shadow-inner">
              <ShieldAlert className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base sm:text-lg">
                  إدارة تصفير البيانات والبيئة التشغيلية للنظام
                </h3>
                <Badge variant={currentMode === 'PRODUCTION' ? 'emerald' : 'amber'} size="sm">
                  {currentMode === 'PRODUCTION' ? 'بيئة العمل الحقيقية' : 'البيئة التجريبية (Demo)'}
                </Badge>
              </div>
              <p className="text-xs text-rose-200/80 mt-0.5">
                عملية سيادية محمية بكلمة سر المدير العام مع إنشاء نسخة احتياطية فورية قبل التنفيذ
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white hover:bg-white/10 p-2 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Database Content Statistics Summary */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-700 font-bold">
            <Database className="w-4 h-4 text-slate-500" />
            <span>السجلات الموجودة حالياً في قاعدة البيانات:</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-mono text-slate-600">
            <span>{properties.length} عقار</span>
            <span>•</span>
            <span>{units.length} وحدة</span>
            <span>•</span>
            <span>{contracts.length} عقد</span>
            <span>•</span>
            <span>{invoices.length} فاتورة</span>
            <span>•</span>
            <span>{payments.length} سند قبض</span>
            <span>•</span>
            <span>{expenses.length} سند صرف</span>
            <span>•</span>
            <span>{journalEntries.length} قيد</span>
          </div>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleResetAction} className="p-6 space-y-6">

          {/* Mode Selection Cards */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-900">
              اختر نوع الإجراء المطلوب لتجهيز أو تصفير النظام:
            </label>

            <div className="grid grid-cols-1 gap-3">
              {/* Option 1: Clear Operations & Start Production */}
              <div
                onClick={() => setSelectedMode('TRANSACTIONS_ONLY')}
                className={`p-4 rounded-xl border-2 transition-all cursor-pointer relative ${
                  selectedMode === 'TRANSACTIONS_ONLY'
                    ? 'border-emerald-600 bg-emerald-50/40 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    selectedMode === 'TRANSACTIONS_ONLY' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    <RotateCcw className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-black text-xs sm:text-sm text-slate-900">
                        تصفير العمليات التشغيلية والمحاسبية (بدء العمل الفعلي الحقيقي)
                      </h4>
                      <Badge variant="emerald" size="sm">موصى به للبدء الفعلي</Badge>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      يمسح كافة الفواتير، سندات القبض والصرف، القيود المحاسبية، حركات المستودع، وبلاغات الصيانة.
                      يصفر أرصدة المستأجرين ويرجع الوحدات لشاغرة.
                    </p>
                    <div className="mt-2 text-[11px] text-emerald-800 font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>يحافظ تماماً على: دليل الحسابات الشجري (SOCPA)، حسابات الموظفين، وبيانات العقارات والوحدات التأسيسية.</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Option 2: Seed Demonstration Package */}
              <div
                onClick={() => setSelectedMode('SEED_DEMO')}
                className={`p-4 rounded-xl border-2 transition-all cursor-pointer relative ${
                  selectedMode === 'SEED_DEMO'
                    ? 'border-indigo-600 bg-indigo-50/40 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    selectedMode === 'SEED_DEMO' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-black text-xs sm:text-sm text-slate-900">
                        تحميل حزمة البيانات التجريبية النموذجية (Sandbox Demo)
                      </h4>
                      <Badge variant="indigo" size="sm">بيئة تدريب واختبار</Badge>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      يقوم بتحميل أمثلة نموذجية كاملة (عقارات، مستأجرين، عقود سارية، فواتير، وسندات تحصيل) لتدريب الكادر واختبار التقارير دون المساس بالبيانات الواقعية.
                    </p>
                  </div>
                </div>
              </div>

              {/* Option 3: Full Factory Reset */}
              <div
                onClick={() => setSelectedMode('FULL_WIPE')}
                className={`p-4 rounded-xl border-2 transition-all cursor-pointer relative ${
                  selectedMode === 'FULL_WIPE'
                    ? 'border-rose-600 bg-rose-50/40 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    selectedMode === 'FULL_WIPE' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    <Trash2 className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-black text-xs sm:text-sm text-slate-900">
                        إعادة ضبط المصنع الكاملة (مسح كافة البيانات من الصفر)
                      </h4>
                      <Badge variant="rose" size="sm">إجراء حاسم</Badge>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      تفريغ شامل ومطلق لكافة العقارات والوحدات والمستأجرين والعمليات من القاعدة بالكامل.
                      يبقى فقط حساب المدير العام ودليل الحسابات الشجري الافتراضي.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Safety Backup Notice Banner */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-start gap-3 text-xs text-amber-900">
            <Zap className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">إجراء أمان تلقائي معتمد:</span>
              <p className="text-amber-800 text-[11px] mt-0.5">
                يقوم الخادم آلياً بأخذ نسخة احتياطية مشفرة وفورية لقاعدة البيانات قبل تنفيذ هذا الإجراء وحفظها في مجلد النسخ الاحتياطية للرجوع إليها في أي وقت عند الحاجة.
              </p>
            </div>
          </div>

          {/* Manager Password Authentication */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-slate-700" />
              <h4 className="font-bold text-xs text-slate-900">
                التحقق الأمني: إدخال كلمة سر المدير العام
              </h4>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                كلمة سر المدير العام المشرف ({currentUser?.name || 'المدير العام'}):
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={adminPassword}
                  onChange={e => setAdminPassword(e.target.value)}
                  placeholder="أدخل كلمة مرور المدير للتأكيد"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 font-mono text-xs focus:ring-2 focus:ring-rose-500 focus:outline-hidden pl-10"
                  dir="ltr"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* If Full Wipe, Require Confirmation Word */}
            {selectedMode === 'FULL_WIPE' && (
              <div className="pt-1 border-t border-slate-200">
                <label className="block text-[11px] font-bold text-rose-800 mb-1">
                  اكتب كلمة <span className="font-mono bg-rose-100 text-rose-900 px-1.5 py-0.5 rounded">تصفير</span> في الحقل أدناه لتأكيد مسح كافة البيانات:
                </label>
                <input
                  type="text"
                  value={confirmationWord}
                  onChange={e => setConfirmationWord(e.target.value)}
                  placeholder="اكتب كلمة تصفير هنا"
                  className="w-full bg-white border border-rose-300 rounded-xl px-3.5 py-2 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                />
              </div>
            )}
          </div>

          {/* Feedback Alerts */}
          {errorMessage && (
            <div className="bg-rose-50 border border-rose-300 text-rose-800 rounded-xl p-3 text-xs flex items-center gap-2 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl p-3 text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Modal Action Buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
            >
              إلغاء التراجع
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`text-white text-xs font-bold px-6 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50 ${
                selectedMode === 'FULL_WIPE'
                  ? 'bg-rose-700 hover:bg-rose-800'
                  : selectedMode === 'SEED_DEMO'
                  ? 'bg-indigo-600 hover:bg-indigo-700'
                  : 'bg-emerald-700 hover:bg-emerald-800'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>جارٍ التحقق والتنفيذ...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>
                    {selectedMode === 'TRANSACTIONS_ONLY'
                      ? 'تصفير العمليات وبدء العمل الفعلي'
                      : selectedMode === 'SEED_DEMO'
                      ? 'تنشيط وتحميل البيانات التجريبية'
                      : 'تأكيد إعادة ضبط المصنع الكاملة'}
                  </span>
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
