// تصميم م. أبو أحمد — مصمم ومنفذ Claude — © الحقوق محفوظة
import React, { useState } from 'react';
import {
  Calendar,
  Lock,
  Unlock,
  Plus,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  Clock,
  Search,
  Filter,
  Trash2,
  Edit,
  Eye,
  Info,
  Scale,
  Sparkles,
  HelpCircle,
  X
} from 'lucide-react';
import { useStore } from '../../lib/store';
import { AccountingPeriod, FiscalPeriodType } from '../../types';
import { formatCurrency } from '../../lib/numberToArabicWords';
import { Badge } from '../common/Badge';

export const FiscalPeriodsManager: React.FC = () => {
  const {
    periods,
    journalEntries,
    payments,
    expenses,
    invoices,
    currentUser,
    createFiscalPeriod,
    updateFiscalPeriod,
    closeAccountingPeriod,
    reopenAccountingPeriod,
    deleteFiscalPeriod,
    checkDatePostingStatus
  } = useStore();

  // Filters & State
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'CLOSED'>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [editingPeriod, setEditingPeriod] = useState<AccountingPeriod | null>(null);
  const [closingTarget, setClosingTarget] = useState<AccountingPeriod | null>(null);
  const [reopeningTarget, setReopeningTarget] = useState<AccountingPeriod | null>(null);

  // Form states for Create/Edit
  const [formName, setFormName] = useState<string>('');
  const [formYear, setFormYear] = useState<number>(2026);
  const [formType, setFormType] = useState<FiscalPeriodType>('QUARTERLY');
  const [formStartDate, setFormStartDate] = useState<string>('2026-10-01');
  const [formEndDate, setFormEndDate] = useState<string>('2026-12-31');
  const [formNotes, setFormNotes] = useState<string>('');
  const [formError, setFormError] = useState<string>('');

  // Closing / Reopening reasons
  const [closeReason, setCloseReason] = useState<string>('تم تدقيق ميزان المراجعة واعتماد الحسابات الختامية للفترة');
  const [reopenReason, setReopenReason] = useState<string>('');
  const [actionError, setActionError] = useState<string>('');

  // Interactive Date Simulator
  const [testDate, setTestDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const dateCheckResult = checkDatePostingStatus(testDate);

  // Extract unique fiscal years
  const availableYears = Array.from(new Set(periods.map(p => p.fiscalYear || new Date(p.startDate).getFullYear()))).sort();

  // Filtered periods
  const filteredPeriods = periods.filter(p => {
    const year = p.fiscalYear || new Date(p.startDate).getFullYear();
    if (selectedYear !== 'ALL' && String(year) !== selectedYear) return false;
    if (statusFilter === 'OPEN' && p.isClosed) return false;
    if (statusFilter === 'CLOSED' && !p.isClosed) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return p.name.toLowerCase().includes(term) || (p.notes && p.notes.toLowerCase().includes(term));
    }
    return true;
  });

  // Calculate statistics for each period
  const getPeriodStats = (period: AccountingPeriod) => {
    const periodEntries = journalEntries.filter(
      j => j.date >= period.startDate && j.date <= period.endDate && j.status === 'POSTED'
    );
    const totalVolume = periodEntries.reduce((sum, j) => sum + j.totalDebit, 0);
    const periodPayments = payments.filter(
      p => p.paymentDate >= period.startDate && p.paymentDate <= period.endDate && p.status === 'POSTED'
    );
    const totalCollections = periodPayments.reduce((sum, p) => sum + p.amount, 0);
    const periodExpenses = expenses.filter(
      e => e.date >= period.startDate && e.date <= period.endDate && e.status === 'POSTED'
    );
    const totalExpenses = periodExpenses.reduce((sum, e) => sum + e.amount, 0);

    return {
      entriesCount: periodEntries.length,
      totalVolume,
      totalCollections,
      totalExpenses
    };
  };

  // Preset Date Range Helper
  const applyPresetType = (type: FiscalPeriodType, year: number) => {
    setFormType(type);
    if (type === 'ANNUAL') {
      setFormStartDate(`${year}-01-01`);
      setFormEndDate(`${year}-12-31`);
      setFormName(`السنة المالية ${year}`);
    } else if (type === 'QUARTERLY') {
      setFormStartDate(`${year}-01-01`);
      setFormEndDate(`${year}-03-31`);
      setFormName(`الربع الأول ${year}`);
    } else if (type === 'MONTHLY') {
      setFormStartDate(`${year}-01-01`);
      setFormEndDate(`${year}-01-31`);
      setFormName(`شهر يناير ${year}`);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingPeriod(null);
    setFormYear(2026);
    applyPresetType('QUARTERLY', 2026);
    setFormNotes('');
    setFormError('');
    setShowCreateModal(true);
  };

  const handleOpenEditModal = (p: AccountingPeriod) => {
    setEditingPeriod(p);
    setFormName(p.name);
    setFormYear(p.fiscalYear || new Date(p.startDate).getFullYear());
    setFormType(p.periodType || 'QUARTERLY');
    setFormStartDate(p.startDate);
    setFormEndDate(p.endDate);
    setFormNotes(p.notes || '');
    setFormError('');
    setShowCreateModal(true);
  };

  const handleSavePeriod = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (editingPeriod) {
      const res = updateFiscalPeriod(editingPeriod.id, {
        name: formName,
        fiscalYear: formYear,
        periodType: formType,
        startDate: formStartDate,
        endDate: formEndDate,
        notes: formNotes
      });
      if (res.success) {
        setShowCreateModal(false);
      } else {
        setFormError(res.error || 'فشل تحديث الفترة المالية');
      }
    } else {
      const res = createFiscalPeriod({
        name: formName,
        fiscalYear: formYear,
        periodType: formType,
        startDate: formStartDate,
        endDate: formEndDate,
        notes: formNotes
      });
      if (res.success) {
        setShowCreateModal(false);
      } else {
        setFormError(res.error || 'فشل إنشاء الفترة المالية');
      }
    }
  };

  const handleConfirmClose = () => {
    if (!closingTarget) return;
    setActionError('');
    const res = closeAccountingPeriod(closingTarget.id, closeReason);
    if (res.success) {
      setClosingTarget(null);
    } else {
      setActionError(res.error || 'فشل إقفال الفترة');
    }
  };

  const handleConfirmReopen = () => {
    if (!reopeningTarget) return;
    setActionError('');
    if (!reopenReason.trim()) {
      setActionError('يرجى تقديم مبرر رسمي معتمد لفك قفل الفترة المالية');
      return;
    }
    const res = reopenAccountingPeriod(reopeningTarget.id, reopenReason);
    if (res.success) {
      setReopeningTarget(null);
      setReopenReason('');
    } else {
      setActionError(res.error || 'فشل إعادة فتح الفترة');
    }
  };

  const handleDelete = (p: AccountingPeriod) => {
    if (confirm(`هل أنت متأكد من حذف الفترة المالية "${p.name}"؟`)) {
      const res = deleteFiscalPeriod(p.id);
      if (!res.success) {
        alert(res.error);
      }
    }
  };

  const openPeriodsCount = periods.filter(p => !p.isClosed).length;
  const closedPeriodsCount = periods.filter(p => p.isClosed).length;

  return (
    <div className="space-y-6">
      
      {/* Header and Controls */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">
              إدارة الفترات المالية وحماية الترحيل (Fiscal Periods & Period Lock)
            </h2>
            <Badge variant="emerald" size="sm">
              معيار الرقابة المالية SOCPA
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            تعريف السنوات والفترات الدورية، وتفعيل الإقفال المحكم لمنع تسجيل أو تعديل أي حركات بأثر رجعي في الفترات المقفلة
          </p>
        </div>

        <div className="flex items-center gap-2">
          {currentUser.role !== 'CASHIER' && currentUser.role !== 'AUDITOR' && (
            <button
              onClick={handleOpenCreateModal}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold px-4 py-2.5 rounded-lg flex items-center gap-2 transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>تعريف فترة مالية جديدة</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards & Posting Date Simulator Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* Total Periods */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-medium">إجمالي الفترات المعرفة</p>
            <h3 className="text-2xl font-black font-mono text-slate-900 mt-1">{periods.length}</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">سنوية، ربع سنوية، وشهرية</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        {/* Active Open Periods */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs text-emerald-700 font-medium">الفترات النشطة المفتوحة</p>
            <h3 className="text-2xl font-black font-mono text-emerald-700 mt-1">{openPeriodsCount}</h3>
            <p className="text-[11px] text-emerald-600 mt-0.5">يُسمح بالترحيل والتحصيل</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
            <Unlock className="w-5 h-5" />
          </div>
        </div>

        {/* Locked Periods */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs text-rose-700 font-medium">الفترات المقفلة والمحمية</p>
            <h3 className="text-2xl font-black font-mono text-rose-700 mt-1">{closedPeriodsCount}</h3>
            <p className="text-[11px] text-rose-600 mt-0.5">محظورة ضد التعديل الرجعي</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600">
            <Lock className="w-5 h-5" />
          </div>
        </div>

        {/* Posting Date Checker Simulator Card */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-4 rounded-xl shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-300 mb-1">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>أداة التحقق من تاريخ الترحيل</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mb-2">
              اختبر أي تاريخ لمعرفة هل النظام يسمح بالترحيل فيه أم يحظره:
            </p>
            <input
              type="date"
              value={testDate}
              onChange={e => setTestDate(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-1.5 text-xs font-mono text-white focus:outline-hidden focus:ring-1 focus:ring-emerald-400"
            />
          </div>

          <div className="mt-2.5 pt-2 border-t border-slate-700/60 flex items-center gap-1.5 text-[11px]">
            {dateCheckResult.allowed ? (
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>الترحيل مسموح</span>
              </span>
            ) : (
              <span className="text-rose-400 font-bold flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5 shrink-0" />
                <span>الترحيل محظور (فترة مقفلة)</span>
              </span>
            )}
          </div>
        </div>

      </div>

      {/* Date Checker Alert Banner when tested */}
      <div className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
        dateCheckResult.allowed
          ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
          : 'bg-rose-50/80 border-rose-200 text-rose-950'
      }`}>
        <Info className={`w-4 h-4 shrink-0 mt-0.5 ${dateCheckResult.allowed ? 'text-emerald-600' : 'text-rose-600'}`} />
        <div className="flex-1">
          <span className="font-bold">نتيجة فحص التاريخ ({testDate}): </span>
          <span>{dateCheckResult.message}</span>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
          <input
            type="text"
            placeholder="بحث باسم الفترة أو الملاحظات..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pr-9 pl-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Year Filter */}
          <div className="flex items-center gap-1">
            <span className="text-slate-500 font-semibold">السنة:</span>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-bold text-slate-700"
            >
              <option value="ALL">جميع السنوات</option>
              {availableYears.map(yr => (
                <option key={yr} value={String(yr)}>{yr}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1 rounded-md font-bold transition-colors ${
                statusFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              الكل ({periods.length})
            </button>
            <button
              onClick={() => setStatusFilter('OPEN')}
              className={`px-3 py-1 rounded-md font-bold transition-colors ${
                statusFilter === 'OPEN' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              مفتوحة ({openPeriodsCount})
            </button>
            <button
              onClick={() => setStatusFilter('CLOSED')}
              className={`px-3 py-1 rounded-md font-bold transition-colors ${
                statusFilter === 'CLOSED' ? 'bg-white text-rose-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              مقفلة ({closedPeriodsCount})
            </button>
          </div>
        </div>

      </div>

      {/* Fiscal Periods Cards Grid */}
      <div className="space-y-3">
        {filteredPeriods.length === 0 ? (
          <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-400">
            <Calendar className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-bold text-slate-700">لا توجد فترات مالية مطابقة لخيارات التصفية</p>
            <p className="text-xs text-slate-400 mt-1">يمكنك تعريف فترة مالية جديدة بالضغط على الزر أعلاه</p>
          </div>
        ) : (
          filteredPeriods.map(period => {
            const stats = getPeriodStats(period);
            const periodYear = period.fiscalYear || new Date(period.startDate).getFullYear();

            return (
              <div
                key={period.id}
                className={`bg-white rounded-xl border p-4.5 transition-all shadow-xs ${
                  period.isClosed
                    ? 'border-slate-200 bg-slate-50/40'
                    : 'border-emerald-200 bg-white ring-1 ring-emerald-500/10'
                }`}
              >
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                  
                  {/* Left: Period Info */}
                  <div className="flex items-start gap-3.5">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      period.isClosed
                        ? 'bg-rose-50 text-rose-600 border border-rose-200/60'
                        : 'bg-emerald-50 text-emerald-600 border border-emerald-200/60'
                    }`}>
                      {period.isClosed ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900">{period.name}</h4>
                        <span className="text-slate-300">·</span>
                        <span className="font-mono text-xs font-bold text-slate-600">
                          السنة المالية {periodYear}
                        </span>

                        {period.isClosed ? (
                          <Badge variant="rose" size="sm">
                            مقفلة ومحمية ضد الترحيل
                          </Badge>
                        ) : (
                          <Badge variant="emerald" size="sm">
                            مفتوحة ونشطة (يُسمح بالترحيل)
                          </Badge>
                        )}

                        <span className="text-[11px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded font-medium">
                          {period.periodType === 'MONTHLY' ? 'شهرية' : period.periodType === 'ANNUAL' ? 'سنوية' : period.periodType === 'CUSTOM' ? 'مخصصة' : 'ربع سنوية'}
                        </span>
                      </div>

                      {/* Date Range */}
                      <p className="text-xs text-slate-500 font-mono mt-1 flex items-center gap-2">
                        <span>من: <strong className="text-slate-800">{period.startDate}</strong></span>
                        <span>إلى: <strong className="text-slate-800">{period.endDate}</strong></span>
                      </p>

                      {/* Audit Details */}
                      {period.isClosed ? (
                        <div className="mt-2 text-[11px] text-rose-800 bg-rose-50/70 p-2 rounded-lg border border-rose-200/60 max-w-2xl">
                          <span className="font-bold">بيانات الإقفال: </span>
                          <span>أقفلت بتاريخ {period.closedAt} بواسطة <strong>{period.closedBy}</strong>. السبب: {period.closeReason || 'إقفال دوري معتمد'}.</span>
                        </div>
                      ) : period.unlockedAt ? (
                        <div className="mt-2 text-[11px] text-amber-800 bg-amber-50/70 p-2 rounded-lg border border-amber-200/60 max-w-2xl">
                          <span className="font-bold">سجل إعادة الفتح: </span>
                          <span>أعيد فتحها بتاريخ {period.unlockedAt} بواسطة <strong>{period.unlockedBy}</strong>. المبرر: {period.unlockReason}.</span>
                        </div>
                      ) : null}

                      {period.notes && (
                        <p className="text-[11px] text-slate-400 mt-1 italic">
                          ملاحظات: {period.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Middle: Financial Activity Statistics */}
                  <div className="flex items-center gap-6 text-xs border-y lg:border-y-0 lg:border-x border-slate-100 py-2 lg:py-0 lg:px-6 w-full lg:w-auto justify-between lg:justify-start">
                    <div className="text-center">
                      <p className="text-[10px] text-slate-400">القيود المسجلة</p>
                      <p className="font-mono font-bold text-slate-900 mt-0.5">{stats.entriesCount} قيد</p>
                    </div>

                    <div className="text-center">
                      <p className="text-[10px] text-slate-400">حجم الحركات</p>
                      <p className="font-mono font-bold text-slate-900 mt-0.5">{formatCurrency(stats.totalVolume)}</p>
                    </div>

                    <div className="text-center">
                      <p className="text-[10px] text-slate-400">المحصل الفعلي</p>
                      <p className="font-mono font-bold text-emerald-700 mt-0.5">{formatCurrency(stats.totalCollections)}</p>
                    </div>

                    <div className="text-center">
                      <p className="text-[10px] text-slate-400">المصروفات</p>
                      <p className="font-mono font-bold text-rose-700 mt-0.5">{formatCurrency(stats.totalExpenses)}</p>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 shrink-0 w-full lg:w-auto justify-end">
                    {period.isClosed ? (
                      currentUser.role === 'ADMIN' || currentUser.role === 'ACCOUNTANT' ? (
                        <button
                          onClick={() => {
                            setReopeningTarget(period);
                            setReopenReason('');
                            setActionError('');
                          }}
                          className="bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                          title="إلغاء القفل وإعادة فتح الفترة للتسويات الاستثنائية"
                        >
                          <Unlock className="w-3.5 h-3.5" />
                          <span>إعادة فتح الفترة</span>
                        </button>
                      ) : null
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setClosingTarget(period);
                            setCloseReason('تم تدقيق ميزان المراجعة واعتماد الحسابات الختامية للفترة');
                            setActionError('');
                          }}
                          className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                          title="إقفال الفترة وحظر الحركات بأثر رجعي"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>إقفال وحماية الفترة</span>
                        </button>

                        <button
                          onClick={() => handleOpenEditModal(period)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                          title="تعديل بيانات الفترة"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        {stats.entriesCount === 0 && currentUser.role === 'ADMIN' && (
                          <button
                            onClick={() => handleDelete(period)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                            title="حذف الفترة الفارغة"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </>
                    )}
                  </div>

                </div>
              </div>
            );
          })
        )}
      </div>

      {/* CREATE / EDIT FISCAL PERIOD MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 text-xs space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">
                  {editingPeriod ? 'تعديل بيانات الفترة المالية' : 'تعريف فترة مالية جديدة'}
                </h3>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSavePeriod} className="space-y-3.5">
              
              {/* Name & Fiscal Year */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">
                    اسم الفترة المالية <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    placeholder="مثال: الربع الأول 2027 أو شهر يناير 2027"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-bold text-slate-900 focus:ring-1 focus:ring-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    السنة المالية <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formYear}
                    onChange={e => {
                      const yr = parseInt(e.target.value) || 2026;
                      setFormYear(yr);
                      applyPresetType(formType, yr);
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-mono font-bold text-slate-900"
                    required
                  />
                </div>
              </div>

              {/* Period Type Buttons */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  نوع ودورية الفترة
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['QUARTERLY', 'MONTHLY', 'ANNUAL', 'CUSTOM'] as FiscalPeriodType[]).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => applyPresetType(t, formYear)}
                      className={`p-2 rounded-lg font-bold border transition-colors ${
                        formType === t
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {t === 'QUARTERLY' ? 'ربع سنوية' : t === 'MONTHLY' ? 'شهرية' : t === 'ANNUAL' ? 'سنوية كاملة' : 'نطاق مخصص'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date Ranges */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    تاريخ بداية الفترة <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formStartDate}
                    onChange={e => setFormStartDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    تاريخ نهاية الفترة <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formEndDate}
                    onChange={e => setFormEndDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono"
                    required
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  ملاحظات وتوجيهات محاسبية
                </label>
                <textarea
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  placeholder="ملاحظات توجيهية لفريق المحاسبة والتحصيل..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 h-16"
                />
              </div>

              {/* Actions */}
              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-100 rounded-lg font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-xs cursor-pointer"
                >
                  {editingPeriod ? 'حفظ التعديلات' : 'إنشاء وحفظ الفترة'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* CLOSE PERIOD CONFIRMATION MODAL */}
      {closingTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 text-xs space-y-4">
            
            <div className="flex items-center gap-2.5 text-rose-600 border-b border-slate-100 pb-3">
              <Lock className="w-5 h-5 shrink-0" />
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  إقفال وحماية الفترة المحاسبية: {closingTarget.name}
                </h3>
                <p className="text-[11px] text-slate-500">من {closingTarget.startDate} إلى {closingTarget.endDate}</p>
              </div>
            </div>

            {actionError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
                {actionError}
              </div>
            )}

            {/* Pre-Closing Audit Checklist Box */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
              <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>مراجعة ضوابط ما قبل الإقفال (Pre-Closing Audit):</span>
              </h4>
              
              {(() => {
                const stats = getPeriodStats(closingTarget);
                return (
                  <div className="space-y-1.5 text-slate-600 pt-1">
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span>إجمالي القيود المرحلة في الفترة:</span>
                      <strong className="font-mono text-slate-900">{stats.entriesCount} قيد مرحل</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span>إجمالي حجم التداول والحركات:</span>
                      <strong className="font-mono text-slate-900">{formatCurrency(stats.totalVolume)}</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span>المقبوضات المحصلة:</span>
                      <strong className="font-mono text-emerald-700">{formatCurrency(stats.totalCollections)}</strong>
                    </div>
                    <div className="flex justify-between py-1">
                      <span>مصروفات العقارات في الفترة:</span>
                      <strong className="font-mono text-rose-700">{formatCurrency(stats.totalExpenses)}</strong>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Warning Message */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>تحذير رقابي مهم:</span>
              </div>
              <p className="leading-relaxed">
                بمجرد إقفال الفترة، سيقوم النظام تلقائياً برفض وحظر أي محاولة لترحيل سند قبض، فاتورة، مصروف، أو قيد يدوي يقع تاريخه بين <strong>{closingTarget.startDate}</strong> و <strong>{closingTarget.endDate}</strong> منعاً لأي تلاعب أو تعديل بأثر رجعي.
              </p>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                سبب / قرار الإقفال المالي المعتمد <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={closeReason}
                onChange={e => setCloseReason(e.target.value)}
                placeholder="مثال: تم تدقيق ميزان المراجعة واعتماد القوائم الختامية من الإدارة المالية..."
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-800 h-16"
                required
              />
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setClosingTarget(null)}
                className="px-4 py-2 bg-slate-100 rounded-lg font-bold"
              >
                تراجع
              </button>
              <button
                type="button"
                onClick={handleConfirmClose}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Lock className="w-4 h-4" />
                <span>تأكيد الإقفال وتفعيل الحماية</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* REOPEN PERIOD MODAL */}
      {reopeningTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 text-xs space-y-4">
            
            <div className="flex items-center gap-2.5 text-amber-600 border-b border-slate-100 pb-3">
              <Unlock className="w-5 h-5 shrink-0" />
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  إعادة فتح فترة مقفلة: {reopeningTarget.name}
                </h3>
                <p className="text-[11px] text-slate-500">إلغاء قفل الحماية للعمليات الاستثنائية</p>
              </div>
            </div>

            {actionError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
                {actionError}
              </div>
            )}

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>تنبيه تدقيق محاسبي:</span>
              </p>
              <p className="leading-relaxed">
                إعادة فتح فترة مقفلة يُسجل مباشرة في سجل التدقيق المالي مع اسم المستخدم وتاريخ الإجراء. يرجى توضيح المبرر الإداري أو قرار التسوية المعتمد بدقة.
              </p>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                المبرر الإداري الإلزامي لإعادة الفتح <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={reopenReason}
                onChange={e => setReopenReason(e.target.value)}
                placeholder="مثال: الحاجة لتسوية قيد مقاصة بنكي معتمد أو تصحيح خطأ إداري بموجب محضر رقم 102..."
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800 h-20"
                required
              />
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setReopeningTarget(null)}
                className="px-4 py-2 bg-slate-100 rounded-lg font-bold"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmReopen}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Unlock className="w-4 h-4" />
                <span>إعادة الفتح واعتماد المبرر</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
