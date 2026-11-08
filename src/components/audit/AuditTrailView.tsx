// تصميم م. أبو أحمد — مصمم ومنفذ Claude — © الحقوق محفوظة
import React, { useState, useRef } from 'react';
import { History, Shield, Search, Filter, UserCheck, Calendar, Download, Loader2, CheckCircle2, Printer } from 'lucide-react';
import { useStore } from '../../lib/store';
import { Badge } from '../common/Badge';
import { exportElementToPdf } from '../../lib/pdfExportUtil';

export const AuditTrailView: React.FC = () => {
  const { auditLogs, currentUser } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const auditContainerRef = useRef<HTMLDivElement>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  const filteredLogs = auditLogs.filter(log => {
    if (roleFilter !== 'ALL' && log.actorRole !== roleFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        log.action.toLowerCase().includes(term) ||
        log.details.toLowerCase().includes(term) ||
        log.actorName.toLowerCase().includes(term) ||
        log.entityId.toLowerCase().includes(term)
      );
    }
    return true;
  });

  const handleExportPdf = async () => {
    if (!auditContainerRef.current || isExportingPdf) return;
    try {
      setIsExportingPdf(true);
      const filename = `تقرير_سجل_التدقيق_والرقابة_المالية_${new Date().toISOString().split('T')[0]}`;
      await exportElementToPdf(auditContainerRef.current, filename, {
        orientation: 'portrait',
        scale: 2
      });
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    } catch (err) {
      console.error('Error exporting audit trail to PDF:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">سجل التدقيق والرقابة المالية (Audit Trail)</h2>
            <Badge variant="indigo" size="sm">سجل تدقيق غير قابل للحذف</Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            توثيق تاريخي إلزامي لكافة الحركات المالية وتعديلات العقود وسندات الصرف والقبض
          </p>
        </div>

        <div className="flex items-center gap-2">
          {exportSuccess && (
            <span className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-300 px-2.5 py-1.5 rounded-lg flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>تم تنزيل تقرير التدقيق!</span>
            </span>
          )}

          <button
            onClick={handleExportPdf}
            disabled={isExportingPdf}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            title="تصدير وتنزيل سجل التدقيق المالي كملف PDF رسمي"
          >
            {isExportingPdf ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جاري إنشاء PDF...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>تصدير سجل التدقيق إلى PDF</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
          <input
            type="text"
            placeholder="بحث في سجل العمليات والتدقيق..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pr-9 pl-3 py-2 text-slate-800"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-bold">تصفية حسب الدور:</span>
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg p-2 font-bold text-slate-700"
          >
            <option value="ALL">جميع الأدوار</option>
            <option value="ADMIN">مدير النظام (ADMIN)</option>
            <option value="ACCOUNTANT">محاسب (ACCOUNTANT)</option>
            <option value="CASHIER">أمين صندوق (CASHIER)</option>
          </select>
        </div>
      </div>

      {/* Audit Logs Timeline */}
      {/* Audit Logs Timeline Container (captured for PDF) */}
      <div ref={auditContainerRef} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs p-5 space-y-4">
        {/* Printable/PDF Letterhead */}
        <div className="border-b-2 border-slate-900 pb-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-base font-black text-slate-900">شركة المحصل لإدارة وتشغيل الأملاك العقارية</h2>
              <p className="text-xs text-slate-600">تقرير سجل العمليات والتدقيق المالي والرقابي (Certified Audit Trail)</p>
              <div className="flex items-center gap-3 text-[10px] text-slate-500 font-mono mt-1">
                <span>س.ت: 1010582910</span>
                <span>·</span>
                <span>الرقم الضريبي: 300984728100003</span>
              </div>
            </div>
            <div className="text-left font-mono text-[11px] bg-slate-50 border border-slate-200 p-2 rounded-lg">
              <p>تاريخ التقرير: <strong>{new Date().toISOString().split('T')[0]}</strong></p>
              <p>المستخرج: <strong>{currentUser?.name || 'المدقق العام'}</strong></p>
              <p>إجمالي الحركات: <strong>{filteredLogs.length}</strong></p>
            </div>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {filteredLogs.map(log => (
            <div key={log.id} className="py-3 hover:bg-slate-50 transition-colors flex items-start justify-between gap-4 text-xs">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 shrink-0 mt-0.5">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{log.action}</span>
                    <Badge variant="slate" size="sm">{log.entity}: {log.entityId}</Badge>
                  </div>
                  <p className="text-slate-600 mt-1 leading-relaxed">
                    {log.details}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1 font-mono">
                    بواسطة: <strong>{log.actorName}</strong> ({log.actorRole})
                  </p>
                </div>
              </div>

              <div className="text-left font-mono text-[11px] text-slate-400 shrink-0">
                {new Date(log.timestamp).toLocaleString('ar-SA')}
              </div>
            </div>
          ))}
        </div>

        {/* Audit Sign-off Footer */}
        <div className="pt-6 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <span>سجل نظام محصل المشفر · تقرير تدقيق رسمي غير قابل للتعديل</span>
          <span>صفحة 1 · معتمد</span>
        </div>
      </div>

    </div>
  );
};
