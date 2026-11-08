// تصميم م. أبو أحمد — مصمم ومنفذ Claude — © الحقوق محفوظة
import React, { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';
import {
  QrCode,
  Printer,
  Download,
  X,
  Building,
  CheckCircle2,
  Tag,
  Wrench,
  ShieldCheck,
  Share2
} from 'lucide-react';
import { InventoryItem } from '../../types';

interface AssetQrBadgeModalProps {
  item: InventoryItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const AssetQrBadgeModal: React.FC<AssetQrBadgeModalProps> = ({
  item,
  isOpen,
  onClose
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!item) return;

    // Standard QR payload: JSON with asset code and quick metadata, fallback to plain itemCode
    const payload = JSON.stringify({
      app: 'mouhassil',
      type: 'asset',
      code: item.itemCode,
      id: item.id,
      name: item.name
    });

    QRCode.toDataURL(payload, {
      width: 320,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      },
      errorCorrectionLevel: 'M'
    })
      .then(url => setQrDataUrl(url))
      .catch(err => {
        console.error('Error generating QR code:', err);
        // Fallback with just code
        QRCode.toDataURL(item.itemCode, { width: 320, margin: 1 })
          .then(url => setQrDataUrl(url))
          .catch(() => {});
      });
  }, [item]);

  if (!isOpen || !item) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `QR-${item.itemCode}.png`;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto" dir="rtl">
      <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-sm">ملصق كود QR للأصل والمعدات</h3>
              <p className="text-[11px] text-slate-400 font-mono">{item.itemCode}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Asset Tag Sticker Preview */}
        <div className="p-6 flex flex-col items-center">
          
          <div
            ref={printRef}
            className="w-full max-w-xs border-2 border-slate-900 rounded-2xl p-4 bg-white text-slate-900 shadow-sm flex flex-col items-center text-center space-y-3 print:border-2 print:border-black print:m-0"
          >
            {/* Header / Brand */}
            <div className="w-full border-b border-slate-200 pb-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-right">
                <div className="w-6 h-6 rounded-md bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                  م
                </div>
                <div>
                  <div className="text-[11px] font-black leading-tight text-slate-900">نظام مُحصّل</div>
                  <div className="text-[9px] text-slate-500">إدارة الأصول والصيانة</div>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                {item.itemCode}
              </span>
            </div>

            {/* QR Image */}
            <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-2xs">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`QR code for ${item.itemCode}`}
                  className="w-44 h-44 object-contain"
                />
              ) : (
                <div className="w-44 h-44 flex items-center justify-center text-slate-400 text-xs">
                  جاري توليد الكود...
                </div>
              )}
            </div>

            {/* Asset Info on Label */}
            <div className="w-full space-y-1 text-right">
              <h4 className="font-extrabold text-xs text-slate-900 line-clamp-2">
                {item.name}
              </h4>
              
              {item.assignedPropertyName && (
                <div className="flex items-center gap-1 text-[11px] text-slate-600">
                  <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{item.assignedPropertyName} {item.assignedUnitNumber ? `· ${item.assignedUnitNumber}` : ''}</span>
                </div>
              )}

              {item.serialNumber && (
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                  <span>الرقم التسلسلي:</span>
                  <span className="font-bold text-slate-700">{item.serialNumber}</span>
                </div>
              )}
            </div>

            {/* Footer scan hint */}
            <div className="w-full pt-2 border-t border-dashed border-slate-200 text-[10px] text-slate-500 flex items-center justify-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              <span>امسح الكود عبر كاميرا التطبيق لاستعراض سجل الصيانة</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 text-center mt-3 no-print">
            يمكن طباعة هذا الملصق ولصقه مباشرة على المكيف، المضخة، لوحة المصعد أو الأجهزة الميدانية.
          </p>

        </div>

        {/* Modal Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2 no-print">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            إغلاق
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="px-3 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>تحميل الصورة</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            >
              <Printer className="w-4 h-4 text-emerald-100" />
              <span>طباعة الملصق</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
