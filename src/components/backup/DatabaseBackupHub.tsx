// تصميم م. أبو أحمد — مصمم ومنفذ Claude — © الحقوق محفوظة
import { withToken } from '../../lib/apiAuth';
import React, { useState } from 'react';
import {
  Database,
  ShieldCheck,
  ShieldAlert,
  Download,
  Upload,
  RefreshCw,
  PlusCircle,
  Clock,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  FileJson,
  Trash2,
  RotateCcw,
  Settings,
  Sparkles,
  Layers,
  Calendar,
  Lock,
  ArrowRight,
  Info,
  Check,
  X
} from 'lucide-react';
import { useStore } from '../../lib/store';
import { DatabaseBackupRecord, BackupTrigger } from '../../types';
import { formatCurrency } from '../../lib/numberToArabicWords';
import { Badge } from '../common/Badge';

export const DatabaseBackupHub: React.FC = () => {
  const {
    backups,
    backupSettings,
    isBackupLoading,
    refreshBackups,
    createInstantBackup,
    restoreDatabaseBackup,
    updateBackupSettings,
    deleteBackup,
    uploadAndRestoreBackup,
    properties,
    units,
    tenants,
    contracts,
    invoices,
    payments,
    expenses,
    journalEntries,
    auditLogs
  } = useStore();

  const [isCreating, setIsCreating] = useState(false);
  const [customNote, setCustomNote] = useState('');
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [selectedBackupForRestore, setSelectedBackupForRestore] = useState<DatabaseBackupRecord | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Settings form state
  const [settingsForm, setSettingsForm] = useState({
    autoBackupEnabled: backupSettings?.autoBackupEnabled ?? true,
    intervalMinutes: backupSettings?.intervalMinutes ?? 30,
    maxRetentionCount: backupSettings?.maxRetentionCount ?? 30,
    autoBackupOnPeriodClose: backupSettings?.autoBackupOnPeriodClose ?? true,
    autoBackupOnReset: backupSettings?.autoBackupOnReset ?? true
  });

  const notify = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotificationMessage({ text, type });
    setTimeout(() => setNotificationMessage(null), 5000);
  };

  const handleCreateInstant = async () => {
    setIsCreating(true);
    setShowNoteModal(false);
    const result = await createInstantBackup(customNote.trim() || undefined);
    setIsCreating(false);
    setCustomNote('');
    if (result.success) {
      notify('تم أخذ نسخة احتياطية فورية لقاعدة البيانات بنجاح، وتوثيقها في مركز الأمان.');
    } else {
      notify(result.error || 'فشل إنشاء النسخة الاحتياطية', 'error');
    }
  };

  const handleConfirmRestore = async () => {
    if (!selectedBackupForRestore) return;
    const backupId = selectedBackupForRestore.id;
    setSelectedBackupForRestore(null);
    setIsCreating(true);
    const result = await restoreDatabaseBackup(backupId);
    setIsCreating(false);
    if (result.success) {
      notify(`تمت استعادة قاعدة البيانات بنجاح من النسخة (${backupId})، وتم أخذ نسخة أمان احترازية.`);
    } else {
      notify(result.error || 'فشل استعادة النسخة الاحتياطية', 'error');
    }
  };

  const handleDelete = async (backupId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه النسخة الاحتياطية من السجل؟ لا يمكن التراجع عن هذا الإجراء.')) return;
    const result = await deleteBackup(backupId);
    if (result.success) {
      notify('تم حذف النسخة الاحتياطية بنجاح.');
    } else {
      notify(result.error || 'فشل حذف النسخة', 'error');
    }
  };

  const handleSaveSettings = async () => {
    const res = await updateBackupSettings(settingsForm);
    setShowSettingsModal(false);
    if (res.success) {
      notify('تم تحديث إعدادات النسخ الاحتياطي التلقائي بنجاح.');
      await refreshBackups();
    } else {
      notify(res.error || 'فشل حفظ الإعدادات', 'error');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        const shouldRestore = window.confirm('تم قراءة الملف بنجاح!\n\nهل ترغب في تطبيق واستعادة هذه النسخة فوراً على النظام؟\n(سيتم أخذ نسخة أمان تلقائية من الوضع الحالي أولاً).');
        const res = await uploadAndRestoreBackup(parsed, shouldRestore);
        if (res.success) {
          notify(shouldRestore ? 'تم استيراد واستعادة قاعدة البيانات بنجاح!' : 'تم حفظ النسخة المستوردة في السجل السحابي بنجاح.');
        } else {
          notify(res.error || 'فشل استيراد الملف', 'error');
        }
      } catch (err: any) {
        notify('الملف المحدد غير صالح أو تالف: ' + err.message, 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const getTriggerBadge = (trigger: BackupTrigger) => {
    switch (trigger) {
      case 'AUTOMATIC_SCHEDULED':
        return <Badge variant="emerald">تلقائي مجدول</Badge>;
      case 'MANUAL_USER':
        return <Badge variant="indigo">يدوي فوري</Badge>;
      case 'PRE_RESTORE_SAFETY':
        return <Badge variant="amber">أمان قبل استعادة</Badge>;
      case 'CRITICAL_OPERATION':
        return <Badge variant="rose">أمان عملية حرجة</Badge>;
      default:
        return <Badge variant="slate">{trigger}</Badge>;
    }
  };

  const latestBackup = backups[0];
  const totalSizeBytes = backups.reduce((sum, b) => sum + (b.sizeBytes || 0), 0);
  const totalSizeKb = Math.round(totalSizeBytes / 1024);

  return (
    <div className="space-y-6">

      {/* Toast Notification */}
      {notificationMessage && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-sm font-bold shadow-md transition-all ${
            notificationMessage.type === 'success'
              ? 'bg-emerald-600 text-white'
              : notificationMessage.type === 'error'
              ? 'bg-rose-600 text-white'
              : 'bg-indigo-600 text-white'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{notificationMessage.text}</span>
          </div>
          <button
            onClick={() => setNotificationMessage(null)}
            className="text-white/80 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Banner: Cloud Database Protection Center */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-5 sm:p-6 shadow-md border border-indigo-900/50">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white shadow-lg shrink-0">
              <Database className="w-8 h-8" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                  مركز النسخ الاحتياطي والأمان السحابي لقاعدة البيانات
                </h1>
                <span className="text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  حماية البيانات المالية نشطة 100%
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1.5 leading-relaxed max-w-3xl">
                نظام آلي متكامل يضمن السلامة الدائمة للبيانات المحاسبية والعقود وسندات القبض، مع جدولة دورية تلقائية، ونقاط استعادة فورية، وإمكانية تنزيل واستيراد قواعد البيانات في أي وقت.
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            <button
              onClick={() => setShowNoteModal(true)}
              disabled={isCreating || isBackupLoading}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{isCreating ? 'جارٍ النسخ...' : 'إنشاء نسخة احتياطية فورية الآن'}</span>
            </button>

            <button
              onClick={() => setShowSettingsModal(true)}
              className="bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-bold px-3.5 py-2.5 rounded-xl flex items-center gap-2 border border-slate-700 shadow-xs transition-all cursor-pointer"
            >
              <Settings className="w-4 h-4 text-indigo-400" />
              <span>إعدادات الجدولة</span>
            </button>

            <label className="bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-bold px-3.5 py-2.5 rounded-xl flex items-center gap-2 border border-slate-700 shadow-xs transition-all cursor-pointer">
              <Upload className="w-4 h-4 text-amber-400" />
              <span>استيراد ملف (.json)</span>
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            <button
              onClick={() => refreshBackups()}
              disabled={isBackupLoading}
              className="bg-slate-800/90 hover:bg-slate-700 text-slate-300 p-2.5 rounded-xl border border-slate-700 transition-all cursor-pointer"
              title="تحديث السجل"
            >
              <RefreshCw className={`w-4 h-4 ${isBackupLoading ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Status & Health Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Last Backup */}
        <div className="bg-white rounded-2xl p-4.5 border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold">آخر نسخة احتياطية</span>
            <Clock className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-base font-black text-slate-900 truncate">
            {latestBackup ? new Date(latestBackup.createdAt).toLocaleDateString('ar-SA', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            }) : 'لم يتم تسجيل نسخ بعد'}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 mt-2">
            <span>المنفذ: {latestBackup?.actorName || 'النظام'}</span>
            <span className="font-mono text-emerald-700 font-bold">{latestBackup ? Math.round(latestBackup.sizeBytes / 1024) + ' KB' : '-'}</span>
          </div>
        </div>

        {/* Card 2: Automatic Schedule Status */}
        <div className="bg-white rounded-2xl p-4.5 border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold">الجدولة التلقائية</span>
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-block w-2.5 h-2.5 rounded-full ${backupSettings?.autoBackupEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            <span className="text-base font-black text-slate-900">
              {backupSettings?.autoBackupEnabled ? `تلقائي كل ${backupSettings.intervalMinutes} دقيقة` : 'متوقف'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            الاحتفاظ بآخر <strong className="text-slate-800 font-bold">{backupSettings?.maxRetentionCount || 30}</strong> نسخة تلقائياً
          </p>
        </div>

        {/* Card 3: Total Saved Snapshots */}
        <div className="bg-white rounded-2xl p-4.5 border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold">النسخ المحفوظة بالسجل</span>
            <HardDrive className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-black text-slate-900">
            {backups.length} <span className="text-xs font-semibold text-slate-500">نقطة استعادة</span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 mt-2">
            <span>إجمالي المساحة المستخدمة:</span>
            <span className="font-mono text-indigo-700 font-bold">{totalSizeKb} KB</span>
          </div>
        </div>

        {/* Card 4: Protected Records Overview */}
        <div className="bg-white rounded-2xl p-4.5 border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold">إجمالي السجلات المؤمنة</span>
            <Layers className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-xl font-black text-slate-900">
            {properties.length + contracts.length + invoices.length + payments.length + journalEntries.length}
            <span className="text-xs font-semibold text-slate-500"> سجل محاسبي وعقاري</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-2">
            <span>{invoices.length} فاتورة</span>
            <span>·</span>
            <span>{payments.length} سند قبض</span>
            <span>·</span>
            <span>{journalEntries.length} قيد</span>
          </div>
        </div>
      </div>

      {/* Main Database Snapshots Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <FileJson className="w-5 h-5 text-indigo-600" />
              <span>سجل النسخ الاحتياطية ونقاط الاستعادة التاريخية</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              يمكنك استعادة أي نسخة سابقة بأمان، حيث يقوم النظام بأخذ نسخة احترازية فورية قبل أي عملية استرجاع.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href={withToken("/api/download/source-code")}
              download="mouhassil_complete_source.zip"
              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-2 rounded-xl border border-emerald-200 flex items-center gap-1.5 transition-colors shadow-2xs"
              title="تحميل كود البرنامج المصدري بالكامل بصيغة ZIP"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>تحميل كود المشروع (ZIP)</span>
            </a>

            {latestBackup && (
              <a
                href={withToken(`/api/backups/${latestBackup.id}/download`)}
                download={`Mouhassil_Backup_Latest.json`}
                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold px-3 py-2 rounded-xl border border-indigo-200 flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>تحميل أحدث نسخة بيانات (.json)</span>
              </a>
            )}
          </div>
        </div>

        {backups.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Database className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-700">لا توجد نسخ احتياطية مسجلة حالياً</h3>
            <p className="text-xs text-slate-400 mt-1">انقر على زر "إنشاء نسخة احتياطية فورية الآن" أعلاه لإنشاء أول نسخة.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">تاريخ ووقت النسخة</th>
                  <th className="py-3 px-4">نوع المشغّل</th>
                  <th className="py-3 px-4">المنفّذ</th>
                  <th className="py-3 px-4">حجم الملف</th>
                  <th className="py-3 px-4">إحصائيات السجلات</th>
                  <th className="py-3 px-4">ملاحظات</th>
                  <th className="py-3 px-4 text-left">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {backups.map(bkp => {
                  const bDate = new Date(bkp.createdAt);
                  const formattedDate = bDate.toLocaleDateString('ar-SA', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  });
                  const formattedTime = bDate.toLocaleTimeString('ar-SA', {
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  return (
                    <tr key={bkp.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span>{formattedDate}</span>
                          <span className="text-[11px] text-slate-400 font-normal">{formattedTime}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getTriggerBadge(bkp.trigger)}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap font-semibold">
                        {bkp.actorName || 'النظام'}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {Math.round((bkp.sizeBytes || 0) / 1024)} KB
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded font-bold">{bkp.stats?.invoicesCount || 0} فواتير</span>
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded font-bold">{bkp.stats?.paymentsCount || 0} سندات</span>
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded font-bold">{bkp.stats?.contractsCount || 0} عقود</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate" title={bkp.notes}>
                        {bkp.notes || '-'}
                      </td>

                      <td className="py-3.5 px-4 text-left whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedBackupForRestore(bkp)}
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold px-2.5 py-1.5 rounded-lg border border-emerald-200 flex items-center gap-1 transition-colors cursor-pointer"
                            title="استعادة هذه النسخة"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>استعادة</span>
                          </button>

                          <a
                            href={withToken(`/api/backups/${bkp.id}/download`)}
                            download={`Mouhassil_${bkp.filename}`}
                            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold px-2.5 py-1.5 rounded-lg border border-indigo-200 flex items-center gap-1 transition-colors"
                            title="تحميل ملف النسخة للكمبيوتر"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>تحميل</span>
                          </a>

                          <button
                            onClick={() => handleDelete(bkp.id)}
                            className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                            title="حذف من السجل"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Custom Note for Instant Backup */}
      {showNoteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2 text-indigo-700 font-black">
                <Database className="w-5 h-5" />
                <span>إنشاء نسخة احتياطية فورية</span>
              </div>
              <button
                onClick={() => setShowNoteModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              سيتم إنشاء لقطة فورية كاملة لقاعدة البيانات المحاسبية والعقارية وحفظها بشكل آمن على السيرفر السحابي.
            </p>

            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700">
                ملاحظة توضيحية للنسخة (اختياري):
              </label>
              <input
                type="text"
                placeholder="مثال: نسخة قبل جرد نهاية الشهر أو قبل إدخال عقود جديدة"
                value={customNote}
                onChange={e => setCustomNote(e.target.value)}
                className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-slate-100">
              <button
                onClick={() => setShowNoteModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                إلغاء
              </button>
              <button
                onClick={handleCreateInstant}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>إنشاء النسخة الآن</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirm Restore */}
      {selectedBackupForRestore && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600 font-black text-lg pb-3 border-b border-slate-100">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <span>تأكيد استعادة قاعدة البيانات</span>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 my-4 space-y-1.5">
              <p className="font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                إجراء الأمان الوقائي المزدوج:
              </p>
              <p>
                سيقوم النظام تلقائياً بإنشاء نسخة أمان احتياطية من الحالة الحالية الحية قبل تطبيق هذه النسخة، لتتمكن من الرجوع إليها في أي وقت.
              </p>
            </div>

            <div className="text-xs text-slate-600 space-y-2 mb-6">
              <p>
                أنت على وشك استعادة بيانات النظام إلى النسخة المؤرخة في:
              </p>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 font-mono text-slate-800 font-bold">
                {new Date(selectedBackupForRestore.createdAt).toLocaleString('ar-SA')} ({selectedBackupForRestore.id})
              </div>
              <p className="text-[11px] text-slate-500">
                ملاحظات النسخة: {selectedBackupForRestore.notes || 'لا توجد'}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
              <button
                onClick={() => setSelectedBackupForRestore(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                إلغاء التراجع
              </button>
              <button
                onClick={handleConfirmRestore}
                className="bg-rose-600 hover:bg-rose-700 text-white px-5 py-2 text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                <span>تأكيد الاستعادة الآن</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Auto Backup Settings */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2 text-slate-900 font-black">
                <Settings className="w-5 h-5 text-indigo-600" />
                <span>إعدادات النسخ الاحتياطي التلقائي والجدولة</span>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              
              {/* Toggle 1: Auto Backup Enabled */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                <div>
                  <h4 className="font-bold text-slate-800">تفعيل النسخ الاحتياطي التلقائي الدوري</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">يقوم الخادم بأخذ لقطات تلقائية في الخلفية دون تدخل المستخدم.</p>
                </div>
                <input
                  type="checkbox"
                  checked={settingsForm.autoBackupEnabled}
                  onChange={e => setSettingsForm({ ...settingsForm, autoBackupEnabled: e.target.checked })}
                  className="w-5 h-5 accent-emerald-600 cursor-pointer"
                />
              </div>

              {/* Interval Selection */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  فترة التكرار للنسخ التلقائي:
                </label>
                <select
                  value={settingsForm.intervalMinutes}
                  onChange={e => setSettingsForm({ ...settingsForm, intervalMinutes: Number(e.target.value) })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                >
                  <option value={15}>كل 15 دقيقة (أقصى حماية للعمليات الكثيفة)</option>
                  <option value={30}>كل 30 دقيقة (موصى به للتشغيل اليومي)</option>
                  <option value={60}>كل ساعة واحدة</option>
                  <option value={360}>كل 6 ساعات</option>
                  <option value={1440}>مرة واحدة يومياً (كل 24 ساعة)</option>
                </select>
              </div>

              {/* Max Retention Count */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  الحد الأقصى لعدد النسخ المحفوظة (تدوير تلقائي):
                </label>
                <select
                  value={settingsForm.maxRetentionCount}
                  onChange={e => setSettingsForm({ ...settingsForm, maxRetentionCount: Number(e.target.value) })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                >
                  <option value={10}>الاحتفاظ بآخر 10 نسخ</option>
                  <option value={20}>الاحتفاظ بآخر 20 نسخة</option>
                  <option value={30}>الاحتفاظ بآخر 30 نسخة (الافتراضي)</option>
                  <option value={50}>الاحتفاظ بآخر 50 نسخة</option>
                </select>
              </div>

              {/* Toggle 2: Safety Backup on Period Close */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                <div>
                  <h4 className="font-bold text-slate-800">نسخة أمان فورية عند إقفال أي فترة محاسبية</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">أخذ نسخة تلقائية قبل منع التعديل بأثر رجعي للفترات المقفلة.</p>
                </div>
                <input
                  type="checkbox"
                  checked={settingsForm.autoBackupOnPeriodClose}
                  onChange={e => setSettingsForm({ ...settingsForm, autoBackupOnPeriodClose: e.target.checked })}
                  className="w-5 h-5 accent-emerald-600 cursor-pointer"
                />
              </div>

              {/* Toggle 3: Safety Backup on Reset */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                <div>
                  <h4 className="font-bold text-slate-800">نسخة أمان فورية قبل أي إعادة ضبط تجريبي</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">حماية البيانات الحقيقية قبل استرجاع الداتا التجريبية.</p>
                </div>
                <input
                  type="checkbox"
                  checked={settingsForm.autoBackupOnReset}
                  onChange={e => setSettingsForm({ ...settingsForm, autoBackupOnReset: e.target.checked })}
                  className="w-5 h-5 accent-emerald-600 cursor-pointer"
                />
              </div>

            </div>

            <div className="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-slate-100">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                إلغاء
              </button>
              <button
                onClick={handleSaveSettings}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>حفظ التعديلات</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
