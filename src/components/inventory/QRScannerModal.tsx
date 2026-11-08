// تصميم م. أبو أحمد — مصمم ومنفذ Claude — © الحقوق محفوظة
import React, { useState, useEffect, useRef } from 'react';
import jsQR from 'jsqr';
import {
  Camera,
  X,
  FlipHorizontal,
  Zap,
  ZapOff,
  Upload,
  AlertCircle,
  Search,
  CheckCircle2,
  Package,
  Wrench,
  Sparkles,
  QrCode
} from 'lucide-react';
import { InventoryItem } from '../../types';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssetFound: (item: InventoryItem) => void;
  inventoryItems: InventoryItem[];
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  onAssetFound,
  inventoryItems
}) => {
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [torchSupported, setTorchSupported] = useState<boolean>(false);
  const [manualCode, setManualCode] = useState<string>('');
  const [scanStatus, setScanStatus] = useState<'scanning' | 'detected' | 'not_found'>('scanning');
  const [detectedCode, setDetectedCode] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Play a pleasant beep chime on successful scan
  const playScanBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
      osc.frequency.exponentialRampToValueAtTime(1320, audioCtx.currentTime + 0.12); // E6
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.12);
    } catch {}
  };

  // Match raw string to inventory item
  const findItemByCode = (rawText: string): InventoryItem | null => {
    if (!rawText) return null;
    const clean = rawText.trim();

    // Check if payload is JSON
    try {
      if (clean.startsWith('{') && clean.endsWith('}')) {
        const parsed = JSON.parse(clean);
        if (parsed.code) {
          const match = inventoryItems.find(i => i.itemCode.toLowerCase() === parsed.code.toLowerCase());
          if (match) return match;
        }
        if (parsed.id) {
          const match = inventoryItems.find(i => i.id === parsed.id);
          if (match) return match;
        }
      }
    } catch {}

    // Match by itemCode (case-insensitive)
    const byCode = inventoryItems.find(
      i => i.itemCode.toLowerCase() === clean.toLowerCase()
    );
    if (byCode) return byCode;

    // Match by id
    const byId = inventoryItems.find(i => i.id.toLowerCase() === clean.toLowerCase());
    if (byId) return byId;

    // Match by serial number
    const bySerial = inventoryItems.find(
      i => i.serialNumber && i.serialNumber.toLowerCase() === clean.toLowerCase()
    );
    if (bySerial) return bySerial;

    // Partial match in URL or free text containing itemCode
    const bySubstring = inventoryItems.find(i =>
      clean.toLowerCase().includes(i.itemCode.toLowerCase())
    );
    if (bySubstring) return bySubstring;

    return null;
  };

  // Handle scanned raw payload
  const handleDecodedText = (code: string) => {
    if (!code) return;
    setDetectedCode(code);
    playScanBeep();

    const matched = findItemByCode(code);
    if (matched) {
      setScanStatus('detected');
      setTimeout(() => {
        onAssetFound(matched);
      }, 500);
    } else {
      setScanStatus('not_found');
    }
  };

  // Start Camera
  const startCamera = async (mode: 'environment' | 'user') => {
    stopCamera();
    setCameraError(null);
    setScanStatus('scanning');

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('متصفحك لا يدعم الوصول المباشر لكاميرا الويب');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      streamRef.current = stream;

      // Check torch capability
      const track = stream.getVideoTracks()[0];
      if (track) {
        const capabilities: any = track.getCapabilities ? track.getCapabilities() : {};
        if (capabilities.torch) {
          setTorchSupported(true);
        }
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Wait for video to be ready then start scanning loop
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().then(() => {
            setCameraActive(true);
            requestScanFrame();
          }).catch(err => {
            console.warn('Video play notice:', err);
            setCameraActive(true);
            requestScanFrame();
          });
        };
      }
    } catch (err: any) {
      console.warn('Camera access issue:', err);
      setCameraActive(false);
      let msg = 'تعذر تشغيل الكاميرا. يرجى التأكد من منح الإذن لاستخدام الكاميرا.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'تم رفض إذن الكاميرا من المتصفح. يمكنك مسح صورة الكود أو إدخال الرمز يدوياً أدناه.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'لم يتم العثور على كاميرا في هذا الجهاز.';
      }
      setCameraError(msg);
    }
  };

  // Stop Camera
  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        try {
          track.stop();
        } catch {}
      });
      streamRef.current = null;
    }
    setCameraActive(false);
    setTorchOn(false);
  };

  // Scan Video Frame Loop
  const requestScanFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert'
        });

        if (code && code.data) {
          handleDecodedText(code.data);
          return; // Stop scanning once detected
        }
      }
    }

    animationFrameRef.current = requestAnimationFrame(requestScanFrame);
  };

  // Toggle Torch
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track && (track as any).applyConstraints) {
      try {
        const nextState = !torchOn;
        await (track as any).applyConstraints({
          advanced: [{ torch: nextState }]
        });
        setTorchOn(nextState);
      } catch (e) {
        console.warn('Torch toggle failed:', e);
      }
    }
  };

  // Toggle Camera Front / Back
  const toggleCameraFacing = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  // Handle Image File Upload for QR Decoding
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code && code.data) {
            handleDecodedText(code.data);
          } else {
            setScanStatus('not_found');
            setDetectedCode('لم يتم التعرف على كود QR صالح في الصورة');
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Start on open, stop on close
  useEffect(() => {
    if (isOpen) {
      startCamera(facingMode);
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto" dir="rtl">
      <div className="bg-slate-900 text-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-800 animate-in fade-in zoom-in-95 duration-150 flex flex-col my-auto max-h-[92vh]">
        
        {/* Top Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-white">
                ماسح كود QR للأصول والمعدات
              </h3>
              <p className="text-[11px] text-slate-400">
                وجّه الكاميرا نحو ملصق الأصل لعرض سجل الصيانة فورياً
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewfinder Camera Area */}
        <div className="relative w-full aspect-4/3 sm:aspect-square max-h-72 sm:max-h-80 bg-black flex items-center justify-center overflow-hidden">
          
          {/* Live Video */}
          <video
            ref={videoRef}
            playsInline
            muted
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              cameraActive ? 'opacity-100' : 'opacity-0'
            }`}
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* Viewfinder Overlay */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
            
            {/* Dark vignette border */}
            <div className="relative w-56 h-56 sm:w-64 sm:h-64 border-2 border-emerald-400/80 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] flex items-center justify-center overflow-hidden">
              
              {/* Corner Accents */}
              <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl" />
              <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl" />
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl" />
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-xl" />

              {/* Animated Laser Scanning Line */}
              {scanStatus === 'scanning' && cameraActive && (
                <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399] animate-bounce duration-1000" />
              )}

              {/* Success Detected Ring */}
              {scanStatus === 'detected' && (
                <div className="absolute inset-0 bg-emerald-500/30 flex items-center justify-center animate-in zoom-in-50 duration-200">
                  <div className="bg-emerald-600 text-white rounded-full p-3 shadow-lg">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                </div>
              )}

              {/* Center Crosshair / Target hint */}
              {scanStatus === 'scanning' && (
                <div className="text-center px-4 pointer-events-none">
                  <QrCode className="w-10 h-10 mx-auto text-emerald-400/40 mb-1" />
                  <span className="text-[11px] font-bold text-white/90 drop-shadow">
                    ضع الكود داخل الإطار
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Camera controls toolbar on top of video */}
          <div className="absolute top-3 inset-x-4 flex items-center justify-between z-10 pointer-events-auto">
            <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-700/80 px-2.5 py-1 rounded-full text-[10px] text-slate-300 flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${cameraActive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span>{cameraActive ? 'الكاميرا نشطة' : 'جاري التهيئة...'}</span>
            </div>

            <div className="flex items-center gap-1.5">
              {torchSupported && (
                <button
                  type="button"
                  onClick={toggleTorch}
                  className={`p-2 rounded-xl backdrop-blur-sm border transition-colors cursor-pointer ${
                    torchOn
                      ? 'bg-amber-500/30 border-amber-400 text-amber-300'
                      : 'bg-slate-900/80 border-slate-700 text-slate-300 hover:text-white'
                  }`}
                  title={torchOn ? 'إطفاء الفلاش' : 'تشغيل الفلاش (الكشاف)'}
                >
                  {torchOn ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
                </button>
              )}

              <button
                type="button"
                onClick={toggleCameraFacing}
                className="p-2 rounded-xl bg-slate-900/80 backdrop-blur-sm border border-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="تبديل الكاميرا (الأمامية / الخلفية)"
              >
                <FlipHorizontal className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* If Camera has error */}
          {cameraError && (
            <div className="absolute inset-4 bg-slate-900/95 border border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-center text-center space-y-2 z-20">
              <AlertCircle className="w-8 h-8 text-amber-400" />
              <p className="text-xs text-slate-300 max-w-xs">{cameraError}</p>
              <button
                type="button"
                onClick={() => startCamera(facingMode)}
                className="mt-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                إعادة محاولة الاتصال بالكاميرا
              </button>
            </div>
          )}
        </div>

        {/* Scan Status & Feedback Bar */}
        {scanStatus === 'not_found' && (
          <div className="bg-amber-500/20 border-y border-amber-500/30 px-4 py-2.5 text-xs text-amber-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
              <span>لم يتم العثور على أصل مسجل بالكود: <strong className="font-mono">{detectedCode}</strong></span>
            </div>
            <button
              onClick={() => {
                setScanStatus('scanning');
                requestScanFrame();
              }}
              className="text-[11px] underline font-bold cursor-pointer hover:text-white"
            >
              مسح كود آخر
            </button>
          </div>
        )}

        {/* Alternative Input Methods: Upload Image + Manual Search + Quick Demo Chips */}
        <div className="p-4 space-y-3.5 bg-slate-900/90 overflow-y-auto">
          
          {/* Option A: Image Upload Button */}
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Upload className="w-4 h-4 text-emerald-400" />
              <span>اختيار صورة كود QR من الاستديو</span>
            </button>
          </div>

          {/* Option B: Manual Search / Code Entry */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1">
              أو ابحث برقم الأصل / السيريال يدوياً:
            </label>
            <div className="relative">
              <input
                type="text"
                value={manualCode}
                onChange={e => setManualCode(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && manualCode.trim()) {
                    e.preventDefault();
                    const item = findItemByCode(manualCode);
                    if (item) {
                      onAssetFound(item);
                    } else {
                      setScanStatus('not_found');
                      setDetectedCode(manualCode);
                    }
                  }
                }}
                placeholder="مثال: AST-HVAC-101 أو MND-24INV..."
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono text-left"
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => {
                  if (!manualCode.trim()) return;
                  const item = findItemByCode(manualCode);
                  if (item) {
                    onAssetFound(item);
                  } else {
                    setScanStatus('not_found');
                    setDetectedCode(manualCode);
                  }
                }}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
              >
                بحث
              </button>
            </div>
          </div>

          {/* Option C: One-Click Quick Sample Test Assets */}
          <div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
              <span className="flex items-center gap-1 font-bold">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>أكواد تجريبية فورية للفحص الميداني:</span>
              </span>
              <span className="text-[10px] text-slate-500">انقر لتجربة الفحص الفوري</span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {inventoryItems.slice(0, 5).map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    playScanBeep();
                    setScanStatus('detected');
                    setDetectedCode(item.itemCode);
                    setTimeout(() => {
                      onAssetFound(item);
                    }, 350);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700/80 hover:border-emerald-500/60 text-slate-200 text-[11px] flex items-center gap-1.5 transition-all cursor-pointer group"
                  title={`فحص سجل صيانة ${item.name}`}
                >
                  <Package className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
                  <span className="font-mono font-bold text-white">{item.itemCode}</span>
                  <span className="text-slate-400 text-[10px] truncate max-w-[110px]">
                    ({item.name.split(' ')[0]} {item.name.split(' ')[1] || ''})
                  </span>
                </button>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
