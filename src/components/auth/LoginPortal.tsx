import React, { useState } from 'react';
import {
  Building2,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  X,
  ArrowLeft,
  Loader2
} from 'lucide-react';
import { useStore } from '../../lib/store';
import { useAuth } from '../../context/AuthContext';

interface LoginPortalProps {
  isOpenAsModal?: boolean;
  onCloseModal?: () => void;
}

export const LoginPortal: React.FC<LoginPortalProps> = ({
  isOpenAsModal = false,
  onCloseModal
}) => {
  const { setCurrentUser, setIsLoggedIn } = useStore();
  const { login, isFirebaseActive } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const trimmedInput = email.trim();
    if (!trimmedInput) {
      setErrorMsg('يرجى إدخال اسم المستخدم أو البريد الإلكتروني');
      return;
    }

    if (!password) {
      setErrorMsg('يرجى إدخال كلمة المرور');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await login(trimmedInput, password);

      if (res.success && res.user) {
        setCurrentUser(res.user);
        setIsLoggedIn(true);
        setIsSubmitting(false);
        if (onCloseModal) onCloseModal();
      } else {
        setIsSubmitting(false);
        setErrorMsg(res.error || 'تعذر تسجيل الدخول، يرجى التحقق من صحة البيانات والمحاولة مجدداً');
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMsg(err?.message || 'حدث خطأ غير متوقع أثناء تسجيل الدخول');
    }
  };

  const content = (
    <div className="w-full max-w-md mx-auto bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      
      {/* Brand Header */}
      <div className="bg-slate-900 text-white p-6 relative">
        {isOpenAsModal && onCloseModal && (
          <button
            onClick={onCloseModal}
            className="absolute left-4 top-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md">
            <Building2 className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-black tracking-tight">نظام مُحصّل العقاري</h2>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs text-slate-400">بوابة تسجيل الدخول المركزية</p>
              {isFirebaseActive ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  سحابي (Firebase Auth)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  بانتظار مفاتيح Firebase
                </span>
              )}
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed mt-2 pt-2 border-t border-slate-800">
          تسجيل دخول رسمي للمدير العام والمحاسبين الماليين وفريق العمل لتحديد الصلاحيات تلقائياً.
        </p>
      </div>

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        
        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-rose-800 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <p className="font-semibold leading-relaxed">{errorMsg}</p>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            اسم المستخدم أو البريد الإلكتروني *
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
            <input
              type="text"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="مثال: مدير أو abusamrafordesign@gmail.com"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl pr-10 pl-3 py-2.5 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-sans"
              dir="auto"
              required
              autoComplete="username"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            كلمة المرور *
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl pr-10 pl-10 py-2.5 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono"
              dir="ltr"
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute left-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs py-3 rounded-xl transition-all shadow-sm active:scale-98 cursor-pointer flex items-center justify-center gap-2 mt-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>جاري التحقق وقراءة الصلاحيات...</span>
            </>
          ) : (
            <>
              <span>تسجيل الدخول</span>
              <ArrowLeft className="w-4 h-4" />
            </>
          )}
        </button>

      </form>

      {/* Security Guidance Note */}
      <div className="bg-slate-50 border-t border-slate-200 p-4 space-y-1.5">
        <div className="flex items-center gap-2 text-slate-800 text-xs font-bold">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>حماية وتشفير الصلاحيات (Role-Based Access):</span>
        </div>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          يتم استرداد صلاحيات ودور المستخدم (<span className="font-mono text-slate-700">admin</span> أو <span className="font-mono text-slate-700">accountant</span>) مباشرة من قاعدة بيانات Firestore عند تسجيل الدخول، وتوجيهه إلى نافذته المخصصة بشكل آمن.
        </p>
      </div>

      {/* Copyright Footer */}
      <div className="bg-slate-50 border-t border-slate-100 p-3.5 text-center text-xs text-slate-600">
        <p className="font-bold text-slate-800">
          <span className="text-emerald-700 font-extrabold">تصميم م. أبو أحمد — مصمم ومنفذ Claude — © الحقوق محفوظة</span>
        </p>
        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
          @Alrights reserved
        </p>
      </div>

    </div>
  );

  if (isOpenAsModal) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        {content}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
      {content}

      <div className="mt-4 text-center text-xs text-slate-400 space-y-0.5">
        <p className="font-medium text-emerald-400">تصميم م. أبو أحمد — مصمم ومنفذ Claude — © الحقوق محفوظة</p>
        <p className="text-[10px] text-slate-500 font-mono">@Alrights reserved</p>
      </div>
    </div>
  );
};
