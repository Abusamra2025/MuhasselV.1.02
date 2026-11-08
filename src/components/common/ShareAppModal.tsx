// تصميم م. أبو أحمد — مصمم ومنفذ Claude — © الحقوق محفوظة
import React, { useState } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  Globe,
  ExternalLink,
  MessageCircle,
  Radio,
  Users,
  ShieldCheck,
  Smartphone,
  Laptop,
  CheckCircle2,
  Lock,
  ArrowRight,
  AlertTriangle
} from 'lucide-react';
import { useStore } from '../../lib/store';
import { useShareUrl } from '../../lib/shareUrl';

interface ShareAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShareAppModal: React.FC<ShareAppModalProps> = ({ isOpen, onClose }) => {
  const { onlineCount, isServerConnected, currentUser } = useStore();
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);

  const [copiedDevLink, setCopiedDevLink] = useState(false);
  const { publicUrl, networkUrl, inviteUrl, customUrl, setCustomUrl } = useShareUrl();

  if (!isOpen) return null;

  // الروابط تُحسب من عنوان التشغيل الفعلي (لا روابط ثابتة قديمة)
  const sharedUrl = publicUrl;
  const devUrl = networkUrl;

  // Ready-to-send invite message for employees
  const inviteMessage = `السلام عليكم ورحمة الله وبركاته،
زميلنا العزيز،
تم إطلاق نظام "مُحصّل" السحابي الموحد لإدارة الأملاك وتحصيل الإيجارات والمحاسبة العقارية.

🌐 رابط الدخول المباشر للنظام:
${inviteUrl}

🔐 تعليمات الدخول:
1. ادخل عبر الرابط من أي جهاز (كمبيوتر، لابتوب، أو هاتف ذكي).
2. استخدم اسم المستخدم وكلمة المرور المحددة لك من قِبل المدير العام.
3. النظام يعمل سحابياً أونلاين بمزامنة فورية لجميع الحركات والبيانات المالية.

شركة المحصل لإدارة الأملاك العقارية`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(sharedUrl || inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyDevLink = () => {
    navigator.clipboard.writeText(devUrl || inviteUrl);
    setCopiedDevLink(true);
    setTimeout(() => setCopiedDevLink(false), 2500);
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(inviteMessage);
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 2500);
  };

  const handleWhatsAppShare = () => {
    const encodedText = encodeURIComponent(inviteMessage);
    window.open(`https://api.whatsapp.com/send?text=${encodedText}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden text-right flex flex-col max-h-[92vh] my-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shadow-inner">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold flex items-center gap-2">
                <span>مشاركة رابط البرنامج والمزامنة السحابية</span>
                <span className="text-[10px] font-bold bg-emerald-500 text-slate-950 px-2 py-0.5 rounded-full">
                  أونلاين مباشر
                </span>
              </h3>
              <p className="text-xs text-slate-300">
                إرسال الرابط للموظفين للعمل المتزامن اللحظي على نفس قاعدة البيانات
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-700">
          
          {/* Real-time Server Sync Status Card */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-600"></span>
              </div>
              <div>
                <p className="font-bold text-slate-900 text-sm">
                  السيرفر السحابي متصل والمزامنة الحية نشطة (SSE Real-Time)
                </p>
                <p className="text-[11px] text-slate-600">
                  عدد الجلسات النشطة الآن في النظام: <strong className="text-emerald-700">{onlineCount} مستخدم متصل</strong>
                </p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 bg-white border border-emerald-200 px-3 py-1.5 rounded-lg shadow-2xs">
              <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
              <span>مزامنة تلقائية 100%</span>
            </div>
          </div>

          {/* Cloud Run Activation Alert */}
          <div className="bg-amber-50/90 border border-amber-300 rounded-xl p-3.5 text-xs text-amber-950 flex items-start gap-3 shadow-xs">
            <div className="w-8 h-8 rounded-lg bg-amber-200/80 text-amber-900 flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle className="w-4 h-4 text-amber-700" />
            </div>
            <div className="space-y-1">
              <p className="font-black text-amber-900 text-xs">
                كيف يدخل الموظفون؟
              </p>
              <p className="text-[11px] leading-relaxed text-amber-800 font-medium">
                <strong>على نفس الواي فاي:</strong> شغّل البرنامج على جهازك وأرسل «رابط الشبكة المحلية» أدناه (يجب أن يبقى جهازك شغالًا، وإن سأل ويندوز عن جدار الحماية فاختر السماح). <strong>من أي مكان:</strong> انشر النظام على استضافة (مثل Manus) والصق رابطه العام في الخانة الثانية.</p>
            </div>
          </div>

          {/* Direct Link Section 1: For Manager (Live Now) */}
          <div className="space-y-2 bg-indigo-50/60 p-3.5 rounded-xl border border-indigo-200">
            <label className="block text-xs font-bold text-slate-800 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-indigo-600" />
                <span className="text-indigo-950 font-bold">1. رابط الشبكة المحلية (نفس الواي فاي):</span>
              </span>
              <span className="text-[10px] text-indigo-700 font-bold bg-indigo-100 px-2 py-0.5 rounded-full">
                {devUrl ? 'جاهز ✅' : 'غير متاح'}
              </span>
            </label>
            <p className="text-[11px] text-slate-600">
              يعمل لأي جهاز متصل بنفس الشبكة (واي فاي المنزل أو المكتب) ما دام البرنامج شغالًا على هذا الجهاز:
            </p>
            <div className="flex items-center gap-2 bg-white border border-indigo-300 rounded-xl p-2 focus-within:border-indigo-500 transition-all shadow-2xs">
              <input
                type="text"
                readOnly
                value={devUrl || 'لا يتوفر عنوان شبكة (أنت لست على شبكة، أو الصفحة منشورة أصلًا)'}
                className="w-full bg-transparent border-none text-left font-mono text-xs text-slate-800 outline-none select-all px-2 font-medium"
                dir="ltr"
              />
              <button
                onClick={handleCopyDevLink}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  copiedDevLink
                    ? 'bg-emerald-600 text-white'
                    : 'bg-indigo-700 hover:bg-indigo-800 text-white shadow-xs'
                }`}
              >
                {copiedDevLink ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>تم النسخ!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>نسخ رابط المعاينة</span>
                  </>
                )}
              </button>
              <a
                href={devUrl || undefined}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                title="فتح الرابط في نافذة جديدة"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Direct Link Section 2: Shared URL for all Employees */}
          <div className="space-y-2 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200">
            <label className="block text-xs font-bold text-slate-800 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-emerald-600" />
                <span className="text-slate-900 font-bold">2. الرابط العام (بعد نشر النظام على الإنترنت):</span>
              </span>
              <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-full">
                لكافة الموظفين
              </span>
            </label>
            <p className="text-[11px] text-slate-600">
              ألصق هنا عنوان النظام بعد نشره على الاستضافة (مثل https://اسم-موقعك.manus.space)، فيدخل منه الموظفون من أي مكان:
            </p>
            
            <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-xl p-2 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100 transition-all shadow-2xs">
              <input
                type="text"
                value={customUrl || sharedUrl}
                onChange={e => setCustomUrl(e.target.value)}
                placeholder="https://..."
                className="w-full bg-transparent border-none text-left font-mono text-xs text-slate-800 outline-none select-all px-2 font-medium"
                dir="ltr"
              />
              <button
                onClick={handleCopyLink}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  copiedLink
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-900 hover:bg-slate-800 text-white shadow-xs'
                }`}
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>تم النسخ!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>نسخ الرابط</span>
                  </>
                )}
              </button>
              <a
                href={sharedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200/70 rounded-lg transition-colors cursor-pointer"
                title="فتح الرابط في نافذة جديدة"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Ready-to-Send Template for WhatsApp / Email */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <MessageCircle className="w-4 h-4 text-teal-600" />
                <span>رسالة دعوة الموظفين جاهزة للإرسال الفوري (واتساب / إيميل):</span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleWhatsAppShare}
                  className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                  title="إرسال عبر تطبيق واتساب"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>واتساب مباشر</span>
                </button>
                <button
                  onClick={handleCopyMessage}
                  className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold px-2.5 py-1 rounded-lg transition-colors border border-slate-200 cursor-pointer"
                >
                  {copiedMessage ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedMessage ? 'تم النسخ!' : 'نسخ النص'}</span>
                </button>
              </div>
            </div>

            <textarea
              readOnly
              rows={6}
              value={inviteMessage}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-700 outline-none select-all font-sans leading-relaxed resize-none focus:border-emerald-500"
            />
          </div>

          {/* How It Works & Online Synchronization Explanation */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
            <h4 className="font-bold text-slate-900 text-xs flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>كيف تعمل المزامنة وضبط أمان الدخول بين الموظفين؟</span>
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-1">
                <div className="flex items-center gap-1.5 text-slate-900 font-bold text-[11px]">
                  <Lock className="w-3.5 h-3.5 text-blue-600" />
                  <span>1. الدخول الفردي الآمن</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-normal">
                  كل موظف يدخل باسم مستخدم وكلمة مرور مستقلة دون أي قائمة منسدلة أو كشف لحسابات الآخرين.
                </p>
              </div>

              <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-1">
                <div className="flex items-center gap-1.5 text-slate-900 font-bold text-[11px]">
                  <Radio className="w-3.5 h-3.5 text-emerald-600" />
                  <span>2. مزامنة لحظية فورية</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-normal">
                  أي سند أو حركة مالية يسجلها المحاسب أو أمين الصندوق تُحفظ في الخادم السحابي وتظهر فوراً لدى المدير والموظفين.
                </p>
              </div>

              <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-1">
                <div className="flex items-center gap-1.5 text-slate-900 font-bold text-[11px]">
                  <Users className="w-3.5 h-3.5 text-indigo-600" />
                  <span>3. رقابة المدير العام الحية</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-normal">
                  المدير العام يرى في شاشة الرقابة الحية جميع الموظفين المتصلين، الشاشات المفتوحة، مع إمكانية التنبيه أو فصل الجلسة.
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-between">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>الدخول بحساب الموظف وكلمة مروره الخاصة فقط</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
};
