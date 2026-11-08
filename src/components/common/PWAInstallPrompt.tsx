// تصميم م. أبو أحمد — مصمم ومنفذ Claude — © الحقوق محفوظة
import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Share, CheckCircle2 } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already running in standalone mode (installed PWA)
    const isInStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (isInStandaloneMode) {
      setIsStandalone(true);
      return;
    }

    // Check if iOS device
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Check if dismissed before in this session
    const dismissed = sessionStorage.getItem('muhassil_pwa_dismissed');
    if (dismissed) return;

    // Listen for Chromium beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // If on iOS and not standalone, show prompt after a short delay
    if (isIosDevice && !isInStandaloneMode) {
      const timer = setTimeout(() => setShowPrompt(true), 3000);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setShowPrompt(false);
        setDeferredPrompt(null);
      }
    } catch (err) {
      console.warn('PWA install prompt error:', err);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    sessionStorage.setItem('muhassil_pwa_dismissed', 'true');
  };

  if (!showPrompt || isStandalone) return null;

  return (
    <div className="no-print fixed bottom-16 sm:bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 bg-gradient-to-r from-slate-900 to-emerald-950 text-white p-4 rounded-2xl shadow-2xl border border-emerald-500/30 animate-in slide-in-from-bottom duration-300">
      <div className="flex items-start justify-between gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center shrink-0 shadow-md">
          <Smartphone className="w-5 h-5 text-white" />
        </div>

        <div className="flex-1 min-w-0 text-right">
          <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-emerald-300 mb-0.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>تثبيت تطبيق مُحصّل على هاتفك (PWA)</span>
          </div>

          <p className="text-[11px] text-slate-300 leading-relaxed">
            {isIOS ? (
              <span>
                لتثبيت التطبيق على الآيفون: اضغط على زر المشاركة <Share className="w-3 h-3 inline mx-0.5" /> ثم اختر <strong>«إضافة إلى الشاشة الرئيسية»</strong> للعمل كأيقونة مستقلة سريعة.
              </span>
            ) : (
              <span>
                ثبّت التطبيق الآن للعمل كأيقونة مستقلة على هاتفك بدون شريط المتصفح، مع مزامنة سحابية فورية بين المدير والموظفين.
              </span>
            )}
          </p>

          {!isIOS && deferredPrompt && (
            <div className="mt-2.5 flex items-center gap-2">
              <button
                onClick={handleInstallClick}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>تثبيت الآن</span>
              </button>
              <button
                onClick={handleDismiss}
                className="text-slate-400 hover:text-slate-200 text-xs px-2 py-1 transition-colors"
              >
                لاحقاً
              </button>
            </div>
          )}
        </div>

        <button
          onClick={handleDismiss}
          className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          title="إغلاق"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
