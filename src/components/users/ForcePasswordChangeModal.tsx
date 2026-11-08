// تصميم م. أبو أحمد — مصمم ومنفذ Claude — © الحقوق محفوظة
import React, { useState } from 'react';
import { KeyRound, ShieldAlert, CheckCircle2, Lock, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { useStore } from '../../lib/store';
import { Badge } from '../common/Badge';

export const ForcePasswordChangeModal: React.FC = () => {
  const { currentUser, changeUserPassword } = useStore();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // If user does not require password change, do not render
  if (!currentUser || !currentUser.mustChangePasswordOnNextLogin) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!currentPassword.trim()) {
      setErrorMsg('يرجى إدخال كلمة المرور الأولية المؤقتة المستلمة من المدير');
      return;
    }

    if (newPassword.length < 8) {
      setErrorMsg('كلمة المرور الجديدة يجب ألا تقل عن 8 خانات لضمان الأمان');
      return;
    }

    if (newPassword === currentPassword) {
      setErrorMsg('يجب أن تكون كلمة المرور الجديدة مختلفة تماماً عن كلمة المرور الأولية');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('تأكيد كلمة المرور غير متطابق مع كلمة المرور الجديدة');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await changeUserPassword(currentUser.id, currentPassword.trim(), newPassword.trim());
      if (res.success) {
        setIsSuccess(true);
      } else {
        setErrorMsg(res.message || 'فشل تغيير كلمة المرور');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'حدث خطأ أثناء حفظ كلمة المرور الجديدة');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Banner */}
        <div className="bg-slate-900 text-white p-6 text-center relative">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-400/30 text-amber-400 flex items-center justify-center mx-auto mb-3 shadow-inner">
            <KeyRound className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-black tracking-tight">
            تغيير كلمة المرور الأولية (إلزامي)
          </h3>
          <p className="text-xs text-slate-300 mt-1 max-w-xs mx-auto">
            مرحباً بك <strong className="text-white">{currentUser.name}</strong> ({currentUser.titleAr})
          </p>
        </div>

        {/* Content & Form */}
        <div className="p-6">
          
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 mb-5 flex items-start gap-2.5 text-xs text-amber-900">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">إلزام أمني عند أول تسجيل دخول:</p>
              <p className="text-amber-800 mt-0.5 leading-relaxed">
                قام مدير النظام بتعيين كلمة مرور أولية مؤقتة لحسابك. يتطلب النظام استبدالها بكلمة مرور سرية خاصة بك قبل المتابعة.
              </p>
              {currentUser.initialPassword && (
                <p className="mt-2 text-[11px] bg-white/80 border border-amber-300 rounded px-2 py-1 font-mono text-slate-800">
                  كلمة المرور الأولية الحالية: <span className="font-bold text-amber-900">{currentUser.initialPassword}</span>
                </p>
              )}
            </div>
          </div>

          {errorMsg && (
            <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {isSuccess ? (
            <div className="py-6 text-center space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
              <h4 className="text-base font-bold text-slate-900">
                تم تغيير كلمة المرور بنجاح!
              </h4>
              <p className="text-xs text-slate-600">
                تم تفعيل حسابك وحفظ كلمة المرور السرية الجديدة. يمكنك الآن البدء في استخدام النظام.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              
              {/* Current Initial Password */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  كلمة المرور الأولية المؤقتة المستلمة:
                </label>
                <div className="relative">
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    required
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    placeholder="أدخل كلمة المرور الأولية..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg pr-3 pl-10 py-2.5 font-mono text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute left-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  كلمة المرور السرية الجديدة:
                </label>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="اختر كلمة مرور جديدة (8 خانات على الأقل)..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg pr-3 pl-10 py-2.5 font-mono text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute left-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  تأكيد كلمة المرور الجديدة:
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="أعد كتابة كلمة المرور الجديدة..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2.5 font-mono text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl transition-all shadow-md mt-2 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Lock className="w-4 h-4 text-emerald-400" />
                <span>{isSubmitting ? 'جاري الحفظ والتحقق...' : 'حفظ كلمة المرور وتفعيل الحساب'}</span>
              </button>

            </form>
          )}

        </div>

      </div>
    </div>
  );
};
