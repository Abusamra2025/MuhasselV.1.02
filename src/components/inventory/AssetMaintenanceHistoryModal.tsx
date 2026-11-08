// تصميم م. أبو أحمد — مصمم ومنفذ Claude — © الحقوق محفوظة
import React, { useState } from 'react';
import {
  Wrench,
  X,
  QrCode,
  Calendar,
  Building,
  User,
  ShieldCheck,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Package,
  PlusCircle,
  FileText,
  Printer,
  ChevronLeft,
  DollarSign,
  Tag,
  Boxes,
  Camera,
  Activity
} from 'lucide-react';
import { InventoryItem, AssetMaintenanceLog, InventoryTransaction, PropertyExpense } from '../../types';
import { formatCurrency } from '../../lib/numberToArabicWords';
import { Badge } from '../common/Badge';

interface AssetMaintenanceHistoryModalProps {
  item: InventoryItem | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenQrBadge: (item: InventoryItem) => void;
  onOpenScannerAgain: () => void;
  transactions: InventoryTransaction[];
  expenses: PropertyExpense[];
  onAddMaintenanceLog: (itemId: string, log: Omit<AssetMaintenanceLog, 'id'>, nextDate?: string) => void;
}

export const AssetMaintenanceHistoryModal: React.FC<AssetMaintenanceHistoryModalProps> = ({
  item,
  isOpen,
  onClose,
  onOpenQrBadge,
  onOpenScannerAgain,
  transactions,
  expenses,
  onAddMaintenanceLog
}) => {
  const [activeTab, setActiveTab] = useState<'maintenance' | 'transactions' | 'financial'>('maintenance');
  const [showAddLogForm, setShowAddLogForm] = useState(false);

  // New Maintenance Log form state
  const [logTitle, setLogTitle] = useState('');
  const [logType, setLogType] = useState<AssetMaintenanceLog['type']>('PREVENTIVE');
  const [logPerformedBy, setLogPerformedBy] = useState('');
  const [logCost, setLogCost] = useState<number>(0);
  const [logStatus, setLogStatus] = useState<AssetMaintenanceLog['status']>('COMPLETED');
  const [logPartsUsed, setLogPartsUsed] = useState('');
  const [logNotes, setLogNotes] = useState('');
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [nextMntDate, setNextMntDate] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  if (!isOpen || !item) return null;

  // Filter relevant warehouse transactions
  const itemTransactions = transactions.filter(t => t.itemId === item.id);

  // Filter relevant property maintenance expenses if item is assigned to a property
  const relevantExpenses = item.assignedPropertyId
    ? expenses.filter(e => e.propertyId === item.assignedPropertyId && e.category === 'MAINTENANCE')
    : [];

  const handleSaveLog = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!logTitle.trim()) {
      setFormError('يرجى كتابة عنوان مختصر لعملية الصيانة أو الفحص');
      return;
    }
    if (!logPerformedBy.trim()) {
      setFormError('يرجى تحديد اسم الفني أو جهة الصيانة المنفذة');
      return;
    }

    onAddMaintenanceLog(
      item.id,
      {
        date: logDate,
        title: logTitle.trim(),
        type: logType,
        performedBy: logPerformedBy.trim(),
        cost: Number(logCost) || 0,
        status: logStatus,
        notes: logNotes.trim(),
        partsUsed: logPartsUsed.trim() || undefined
      },
      nextMntDate || undefined
    );

    // Reset form
    setShowAddLogForm(false);
    setLogTitle('');
    setLogPerformedBy('');
    setLogCost(0);
    setLogPartsUsed('');
    setLogNotes('');
    setNextMntDate('');
  };

  const getConditionBadge = (status?: InventoryItem['conditionStatus']) => {
    switch (status) {
      case 'EXCELLENT':
        return <Badge variant="emerald" size="sm">ممتازة (جاهز للعمل)</Badge>;
      case 'GOOD':
        return <Badge variant="blue" size="sm">جيدة</Badge>;
      case 'NEEDS_MAINTENANCE':
        return <Badge variant="amber" size="sm">بحاجة لصيانة دورية</Badge>;
      case 'OUT_OF_SERVICE':
        return <Badge variant="rose" size="sm">خارج الخدمة / معطل</Badge>;
      default:
        return <Badge variant="slate" size="sm">نشط</Badge>;
    }
  };

  const getLogTypeBadge = (type: AssetMaintenanceLog['type']) => {
    switch (type) {
      case 'PREVENTIVE':
        return <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">صيانة وقائية</span>;
      case 'CORRECTIVE':
        return <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full">صيانة تصحيحية/عطل</span>;
      case 'INSPECTION':
        return <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full">فحص ومعايرة</span>;
      case 'PARTS_REPLACEMENT':
        return <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">استبدال قطع غيار</span>;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto" dir="rtl">
      <div className="bg-white rounded-3xl max-w-4xl w-full my-auto overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        
        {/* Top Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-5 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 shadow-inner">
              <Wrench className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="font-mono text-xs font-black bg-emerald-950 text-emerald-400 border border-emerald-700/60 px-2 py-0.5 rounded-md">
                  {item.itemCode}
                </span>
                {getConditionBadge(item.conditionStatus)}
                <span className="text-[11px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                  {item.category === 'MAINTENANCE_PARTS' ? 'قطع صيانة' :
                   item.category === 'FIXTURES' ? 'أصل وتجهيز عقاري' :
                   item.category === 'TOOLS' ? 'عدة فنية' : 'مستهلكات'}
                </span>
              </div>
              <h3 className="font-black text-base sm:text-lg text-white">
                {item.name}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5 flex flex-wrap items-center gap-3">
                {item.assignedPropertyName && (
                  <span className="flex items-center gap-1 text-emerald-400">
                    <Building className="w-3.5 h-3.5" />
                    <span>{item.assignedPropertyName} {item.assignedUnitNumber ? `(${item.assignedUnitNumber})` : ''}</span>
                  </span>
                )}
                {item.custodianName && (
                  <span className="flex items-center gap-1 text-slate-300">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>المسؤول: {item.custodianName}</span>
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenQrBadge(item)}
              className="bg-slate-800 hover:bg-slate-700 text-emerald-300 hover:text-white border border-slate-700 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              title="عرض وطباعة ملصق كود QR"
            >
              <QrCode className="w-4 h-4" />
              <span className="hidden sm:inline">كود QR</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Specs Strip */}
        <div className="bg-slate-50 border-b border-slate-200 p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          
          <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
            <span className="text-[10px] text-slate-400 font-semibold block">الماركة والموديل:</span>
            <span className="font-bold text-slate-800 truncate block mt-0.5">
              {item.brand || '—'} {item.model ? `(${item.model})` : ''}
            </span>
            <span className="text-[10px] text-slate-500 font-mono block mt-0.5 truncate">
              سيريال: {item.serialNumber || 'غير محدد'}
            </span>
          </div>

          <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
            <span className="text-[10px] text-slate-400 font-semibold block">تاريخ آخر صيانة:</span>
            <div className="flex items-center gap-1 text-slate-800 font-bold mt-0.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>{item.lastMaintenanceDate || 'لا توجد سابقة'}</span>
            </div>
            {item.nextMaintenanceDate && (
              <span className="text-[10px] text-amber-700 font-semibold block mt-0.5">
                القادمة: {item.nextMaintenanceDate}
              </span>
            )}
          </div>

          <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
            <span className="text-[10px] text-slate-400 font-semibold block">الموقع والرصيد:</span>
            <span className="font-bold text-slate-800 block mt-0.5 truncate">
              {item.warehouseLocation}
            </span>
            <span className="text-[10px] text-slate-600 block mt-0.5">
              المتاح بالمخزن: <strong className="text-emerald-700">{item.quantityOnHand} قطعة</strong>
            </span>
          </div>

          <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
            <span className="text-[10px] text-slate-400 font-semibold block">القيمة والضمان:</span>
            <span className="font-black text-emerald-700 block mt-0.5">
              {formatCurrency(item.unitPrice)}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5 truncate">
              {item.warrantyExpiryDate ? `ينتهي الضمان: ${item.warrantyExpiryDate}` : 'بدون ضمان مسجل'}
            </span>
          </div>

        </div>

        {/* Tab Navigation & Action Controls */}
        <div className="px-5 pt-3 border-b border-slate-200 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('maintenance')}
              className={`py-2 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'maintenance'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Wrench className="w-4 h-4" />
              <span>سجل الصيانات الدورية والطارئة ({item.maintenanceLogs?.length || 0})</span>
            </button>

            <button
              onClick={() => setActiveTab('transactions')}
              className={`py-2 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'transactions'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Boxes className="w-4 h-4" />
              <span>حركات المستودع والعهد ({itemTransactions.length})</span>
            </button>

            {item.assignedPropertyId && (
              <button
                onClick={() => setActiveTab('financial')}
                className={`py-2 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'financial'
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <DollarSign className="w-4 h-4" />
                <span>مصروفات صيانة العقار ({relevantExpenses.length})</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 pb-2">
            <button
              type="button"
              onClick={() => setShowAddLogForm(prev => !prev)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{showAddLogForm ? 'إلغاء الإدخال' : 'تسجيل صيانة جديدة'}</span>
            </button>

            <button
              type="button"
              onClick={onOpenScannerAgain}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 border border-slate-300 transition-colors cursor-pointer"
              title="مسح أصل أو كود QR آخر"
            >
              <Camera className="w-4 h-4 text-slate-600" />
              <span className="hidden sm:inline">مسح أصل آخر</span>
            </button>
          </div>
        </div>

        {/* Tab Content Area */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          
          {/* Form: Add New Maintenance Log */}
          {showAddLogForm && (
            <form onSubmit={handleSaveLog} className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 space-y-3 animate-in fade-in zoom-in-95 duration-150 text-xs">
              <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                <span className="font-extrabold text-emerald-900 flex items-center gap-1.5 text-sm">
                  <Wrench className="w-4 h-4 text-emerald-700" />
                  <span>تسجيل عملية صيانة / فحص فني جديد للأصل</span>
                </span>
                <span className="text-[11px] text-emerald-700">تحديث فوري للسجل</span>
              </div>

              {formError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">تاريخ الصيانة:</label>
                  <input
                    type="date"
                    value={logDate}
                    onChange={e => setLogDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-emerald-600"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">نوع العملية:</label>
                  <select
                    value={logType}
                    onChange={e => setLogType(e.target.value as any)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-emerald-600"
                  >
                    <option value="PREVENTIVE">صيانة وقائية دورية</option>
                    <option value="CORRECTIVE">صيانة تصحيحية وإصلاح عطل</option>
                    <option value="INSPECTION">فحص فني ومعايرة</option>
                    <option value="PARTS_REPLACEMENT">استبدال قطع غيار واستهلاكيات</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">الفني / الجهة المنفذة:</label>
                  <input
                    type="text"
                    value={logPerformedBy}
                    onChange={e => setLogPerformedBy(e.target.value)}
                    placeholder="مثال: م. سالم القحطاني / ورشة الصيانة"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-emerald-600"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-700 font-bold mb-1">عنوان الفحص / وصف العملية:</label>
                  <input
                    type="text"
                    value={logTitle}
                    onChange={e => setLogTitle(e.target.value)}
                    placeholder="مثال: تنظيف فلاتر التكييف وشحن الفريون وضبط الترموستات"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-emerald-600"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">التكلفة (ريال):</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={logCost}
                    onChange={e => setLogCost(Number(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">حالة الإنجاز:</label>
                  <select
                    value={logStatus}
                    onChange={e => setLogStatus(e.target.value as any)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-emerald-600"
                  >
                    <option value="COMPLETED">مكتمل وتم الفحص بنجاح</option>
                    <option value="IN_PROGRESS">قيد التنفيذ / جاري العمل</option>
                    <option value="SCHEDULED">مجدول لموعد لاحق</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">موعد الصيانة القادمة (اختياري):</label>
                  <input
                    type="date"
                    value={nextMntDate}
                    onChange={e => setNextMntDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">القطع والمواد المستهلكة:</label>
                  <input
                    type="text"
                    value={logPartsUsed}
                    onChange={e => setLogPartsUsed(e.target.value)}
                    placeholder="مثال: طقم فلاتر 24 + غاز تبريد"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-slate-700 font-bold mb-1">الملاحظات الفنية والتوصيات:</label>
                  <textarea
                    rows={2}
                    value={logNotes}
                    onChange={e => setLogNotes(e.target.value)}
                    placeholder="أدخل أي ملاحظات فنية حول حالة المحرك أو الضغط أو التوصيات التشغيلية..."
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddLogForm(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-200 rounded-xl font-bold cursor-pointer transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs cursor-pointer transition-colors"
                >
                  حفظ عملية الصيانة في سجل الأصل
                </button>
              </div>
            </form>
          )}

          {/* TAB 1: Maintenance Timeline */}
          {activeTab === 'maintenance' && (
            <div className="space-y-3">
              {(!item.maintenanceLogs || item.maintenanceLogs.length === 0) ? (
                <div className="text-center py-10 bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-6">
                  <Wrench className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <h4 className="font-bold text-slate-700 text-sm">لا توجد عمليات صيانة مسجلة حتى الآن</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    يمكن للموظف تسجيل أول عملية صيانة وقائية أو فحص دوري للأصل بالنقر على زر "تسجيل صيانة جديدة" أعلاه.
                  </p>
                </div>
              ) : (
                <div className="relative border-r-2 border-emerald-500/40 mr-3 pr-4 space-y-4">
                  {item.maintenanceLogs.map(log => (
                    <div
                      key={log.id}
                      className="relative bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs hover:border-emerald-300 transition-colors"
                    >
                      {/* Timeline dot */}
                      <span className="absolute -right-[23px] top-4 w-3.5 h-3.5 rounded-full bg-emerald-600 border-2 border-white shadow-xs" />

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                            {log.title}
                          </h4>
                          {getLogTypeBadge(log.type)}
                        </div>

                        <div className="flex items-center gap-2 text-slate-500 text-xs">
                          <span className="flex items-center gap-1 font-mono">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>{log.date}</span>
                          </span>
                          {log.workOrderNumber && (
                            <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[10px] text-slate-600">
                              {log.workOrderNumber}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2.5 text-xs text-slate-600">
                        <div>
                          <span className="text-[10px] text-slate-400 block">الجهة / الفني:</span>
                          <span className="font-semibold text-slate-800">{log.performedBy}</span>
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-400 block">التكلفة:</span>
                          <span className="font-black text-emerald-700">{formatCurrency(log.cost)}</span>
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-400 block">الحالة:</span>
                          <span className="font-bold text-slate-700">
                            {log.status === 'COMPLETED' ? 'مكتمل ومعتمد' : log.status === 'IN_PROGRESS' ? 'قيد التنفيذ' : 'مجدول'}
                          </span>
                        </div>
                      </div>

                      {log.partsUsed && (
                        <div className="mt-2 text-xs bg-slate-50 p-2 rounded-lg border border-slate-100 text-slate-700">
                          <span className="font-bold text-slate-900">القطع والمواد: </span>
                          <span>{log.partsUsed}</span>
                        </div>
                      )}

                      {log.notes && (
                        <p className="mt-2 text-xs text-slate-600 leading-relaxed bg-amber-50/50 p-2 rounded-lg border border-amber-100/60">
                          <strong className="text-amber-950 font-bold">ملاحظات الفحص: </strong>
                          {log.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Warehouse Transactions & Custody */}
          {activeTab === 'transactions' && (
            <div className="space-y-3">
              {itemTransactions.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-6">
                  <Boxes className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <h4 className="font-bold text-slate-700 text-sm">لا توجد حركات مستودع أو عهد مسجلة</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    لم يتم تسجيل أي سند صرف أو توريد أو نقل عهدة لهذا الصنف حتى الآن.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-3">رقم السند</th>
                        <th className="p-3">نوع الحركة</th>
                        <th className="p-3">التاريخ</th>
                        <th className="p-3">الكمية</th>
                        <th className="p-3">المستلم / الفني</th>
                        <th className="p-3">العقار المستفيد</th>
                        <th className="p-3">الملاحظات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {itemTransactions.map(tx => (
                        <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3 font-mono font-bold text-slate-900">{tx.documentNumber}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              tx.type === 'INBOUND' ? 'bg-emerald-100 text-emerald-800' :
                              tx.type === 'OUTBOUND' ? 'bg-blue-100 text-blue-800' :
                              'bg-amber-100 text-amber-800'
                            }`}>
                              {tx.type === 'INBOUND' ? 'توريد واستلام' : tx.type === 'OUTBOUND' ? 'صرف لموقع' : 'تسليم عهدة'}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-slate-600">{tx.date}</td>
                          <td className="p-3 font-bold text-slate-900">{tx.quantity} وحدة</td>
                          <td className="p-3 text-slate-800">{tx.recipientName}</td>
                          <td className="p-3 text-slate-600">{tx.propertyName || '—'}</td>
                          <td className="p-3 text-slate-500 text-[11px] max-w-xs truncate">{tx.notes || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Financial Maintenance Expenses */}
          {activeTab === 'financial' && item.assignedPropertyId && (
            <div className="space-y-3">
              {relevantExpenses.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-6">
                  <DollarSign className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <h4 className="font-bold text-slate-700 text-sm">لا توجد سندات صرف صيانة مالية مرتبطة</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    لم تسجل سندات صرف تحت بند الصيانة والترميم (5100) لهذا العقار.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-3">رقم السند</th>
                        <th className="p-3">التاريخ</th>
                        <th className="p-3">المبلغ</th>
                        <th className="p-3">البيان والتفاصيل</th>
                        <th className="p-3">طريقة الدفع</th>
                        <th className="p-3">الحالة المحاسبية</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {relevantExpenses.map(exp => (
                        <tr key={exp.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3 font-mono font-bold text-slate-900">{exp.voucherNumber}</td>
                          <td className="p-3 font-mono text-slate-600">{exp.date}</td>
                          <td className="p-3 font-black text-rose-700">{formatCurrency(exp.amount)}</td>
                          <td className="p-3 text-slate-800">{exp.description}</td>
                          <td className="p-3 text-slate-600">{exp.paymentMethod === 'BANK_TRANSFER' ? 'تحويل بنكي' : 'نقداً'}</td>
                          <td className="p-3">
                            <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold">
                              مُرحّل بالدفتر
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-emerald-600" />
            <span>نظام الفحص الميداني الفوري عبر كاميرا الجوال وكود QR</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenQrBadge(item)}
              className="px-3 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              <span>طباعة ملصق الباركود</span>
            </button>

            <button
              onClick={onClose}
              className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer shadow-xs"
            >
              إغلاق
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
