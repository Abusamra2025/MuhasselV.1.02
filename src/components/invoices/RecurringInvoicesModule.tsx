// تصميم م. أبو أحمد — مصمم ومنفذ Claude — © الحقوق محفوظة
import React, { useState, useMemo } from 'react';
import {
  Repeat,
  Calendar,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  Play,
  RefreshCw,
  Search,
  Filter,
  ArrowUpRight,
  ShieldCheck,
  Check,
  Settings,
  History,
  FileSpreadsheet,
  Building,
  User,
  CreditCard,
  ChevronLeft,
  X,
  Layers,
  Zap,
  Info
} from 'lucide-react';
import { useStore } from '../../lib/store';
import { Contract, Invoice } from '../../types';
import { formatCurrency } from '../../lib/numberToArabicWords';
import { Badge } from '../common/Badge';

interface RecurringInvoicesModuleProps {
  onSelectInvoice?: (invoice: Invoice) => void;
  onNavigateToLedger?: () => void;
}

interface BatchHistoryItem {
  id: string;
  runDate: string;
  targetMonth: string;
  monthNameAr: string;
  generatedCount: number;
  totalAmount: number;
  executedBy: string;
  invoiceNumbers: string[];
}

const MONTHS_LIST = [
  { value: '2026-10', nameAr: 'أكتوبر 2026', days: 31 },
  { value: '2026-11', nameAr: 'نوفمبر 2026', days: 30 },
  { value: '2026-12', nameAr: 'ديسمبر 2026', days: 31 },
  { value: '2027-01', nameAr: 'يناير 2027', days: 31 },
  { value: '2027-02', nameAr: 'فبراير 2027', days: 28 },
  { value: '2027-03', nameAr: 'مارس 2027', days: 31 },
  { value: '2027-04', nameAr: 'أبريل 2027', days: 30 },
  { value: '2027-05', nameAr: 'مايو 2027', days: 31 }
];

export const RecurringInvoicesModule: React.FC<RecurringInvoicesModuleProps> = ({
  onSelectInvoice,
  onNavigateToLedger
}) => {
  const {
    contracts,
    invoices,
    tenants,
    properties,
    units,
    generateContractInvoice,
    generateRecurringInvoicesBatch,
    currentUser,
    isSupervisoryOnly,
    canUserPerform
  } = useStore();

  // Sub-tabs
  const [subTab, setSubTab] = useState<'schedules' | 'rules' | 'history'>('schedules');

  // Month & Billing period selection (Default to current operational month: November 2026)
  const [selectedMonth, setSelectedMonth] = useState('2026-11');
  const [customDueDate, setCustomDueDate] = useState(`${selectedMonth}-01`);

  // Search & Filtering
  const [searchTerm, setSearchTerm] = useState('');
  const [scheduleFilter, setScheduleFilter] = useState<'ALL' | 'PENDING' | 'GENERATED'>('ALL');

  // Selected contracts for batch generation
  const [selectedContractIds, setSelectedContractIds] = useState<string[]>([]);

  // Confirmation Modal & Results State
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [batchResult, setBatchResult] = useState<{
    success: boolean;
    generatedCount: number;
    skippedCount: number;
    totalAmount: number;
    message: string;
    invoices: Invoice[];
  } | null>(null);

  // Single Quick-Generate Modal/Toast
  const [quickGenNotice, setQuickGenNotice] = useState<string | null>(null);

  // Batch History state (stored in localStorage)
  const [batchHistory, setBatchHistory] = useState<BatchHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('mouhassil_recurring_history');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return [
      {
        id: 'hist_initial_1',
        runDate: '2026-10-01 08:30:00',
        targetMonth: '2026-10',
        monthNameAr: 'أكتوبر 2026',
        generatedCount: 3,
        totalAmount: 75000,
        executedBy: 'المحاسب المالي',
        invoiceNumbers: ['INV-2026-001', 'INV-2026-002', 'INV-2026-003']
      }
    ];
  });

  // Automation Settings state
  const [autoSettings, setAutoSettings] = useState({
    defaultDueDay: 1,
    leadDays: 3,
    autoNotifyTenant: true,
    autoPostJournals: true,
    strictDuplicateGuard: true
  });
  const [savedSettingsNotice, setSavedSettingsNotice] = useState(false);

  // Derive Period Start & Period End dates
  const currentMonthInfo = MONTHS_LIST.find(m => m.value === selectedMonth) || MONTHS_LIST[1];
  const periodStart = `${selectedMonth}-01`;
  const periodEnd = `${selectedMonth}-${String(currentMonthInfo.days).padStart(2, '0')}`;
  const effectiveDueDate = customDueDate || periodStart;

  // Active Contracts eligible for recurring billing
  const activeContracts = useMemo(() => {
    return contracts.filter(c => c.status === 'ACTIVE');
  }, [contracts]);

  // Contracts schedule analysis for selected month
  const contractsAnalysis = useMemo(() => {
    return activeContracts.map(c => {
      const tenant = tenants.find(t => t.id === c.tenantId);
      const property = properties.find(p => p.id === c.propertyId);
      const unit = units.find(u => u.id === c.unitId);

      // Check if invoice exists for this period
      const existingInvoice = invoices.find(
        inv => inv.contractId === c.id &&
               inv.periodStart === periodStart &&
               inv.periodEnd === periodEnd
      );

      // Check if within contract lifespan
      const isWithinContract = c.startDate <= periodEnd && c.endDate >= periodStart;

      return {
        contract: c,
        tenant,
        property,
        unit,
        existingInvoice,
        isWithinContract,
        isGenerated: !!existingInvoice,
        amount: c.installmentAmount
      };
    });
  }, [activeContracts, invoices, periodStart, periodEnd, tenants, properties, units]);

  // Filtered schedules for table
  const filteredSchedules = useMemo(() => {
    return contractsAnalysis.filter(item => {
      if (scheduleFilter === 'PENDING' && item.isGenerated) return false;
      if (scheduleFilter === 'GENERATED' && !item.isGenerated) return false;

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const tName = item.tenant?.name.toLowerCase() || '';
        const cNum = item.contract.contractNumber.toLowerCase();
        const pName = item.property?.name.toLowerCase() || '';
        const uNum = item.unit?.unitNumber.toLowerCase() || '';
        return tName.includes(term) || cNum.includes(term) || pName.includes(term) || uNum.includes(term);
      }

      return true;
    });
  }, [contractsAnalysis, scheduleFilter, searchTerm]);

  // Statistics for the selected month
  const stats = useMemo(() => {
    const totalActive = contractsAnalysis.length;
    const generated = contractsAnalysis.filter(c => c.isGenerated);
    const pending = contractsAnalysis.filter(c => !c.isGenerated && c.isWithinContract);

    const totalGeneratedAmount = generated.reduce((s, c) => s + c.amount, 0);
    const totalPendingAmount = pending.reduce((s, c) => s + c.amount, 0);
    const completionPercent = totalActive > 0 ? Math.round((generated.length / totalActive) * 100) : 0;

    return {
      totalActive,
      generatedCount: generated.length,
      generatedAmount: totalGeneratedAmount,
      pendingCount: pending.length,
      pendingAmount: totalPendingAmount,
      completionPercent
    };
  }, [contractsAnalysis]);

  // Select all pending contracts
  const handleSelectAllPending = () => {
    const pendingIds = contractsAnalysis
      .filter(item => !item.isGenerated && item.isWithinContract)
      .map(item => item.contract.id);

    if (selectedContractIds.length === pendingIds.length && pendingIds.length > 0) {
      setSelectedContractIds([]);
    } else {
      setSelectedContractIds(pendingIds);
    }
  };

  // Toggle single contract checkbox
  const toggleSelectContract = (contractId: string) => {
    setSelectedContractIds(prev =>
      prev.includes(contractId) ? prev.filter(id => id !== contractId) : [...prev, contractId]
    );
  };

  // Run Batch Generation
  const handleExecuteBatch = () => {
    setIsProcessing(true);
    setBatchResult(null);

    const idsToRun = selectedContractIds.length > 0 ? selectedContractIds : undefined;

    const res = generateRecurringInvoicesBatch({
      targetMonth: selectedMonth,
      dueDate: effectiveDueDate,
      periodStart,
      periodEnd,
      contractIds: idsToRun
    });

    setIsProcessing(false);

    if (res.success && res.generatedCount > 0) {
      // Add to batch history
      const newHistoryItem: BatchHistoryItem = {
        id: `batch_run_${Date.now()}`,
        runDate: new Date().toLocaleString('ar-SA'),
        targetMonth: selectedMonth,
        monthNameAr: currentMonthInfo.nameAr,
        generatedCount: res.generatedCount,
        totalAmount: res.totalAmount,
        executedBy: currentUser.name,
        invoiceNumbers: res.invoices.map(i => i.invoiceNumber)
      };

      const updatedHistory = [newHistoryItem, ...batchHistory];
      setBatchHistory(updatedHistory);
      try {
        localStorage.setItem('mouhassil_recurring_history', JSON.stringify(updatedHistory));
      } catch {
        // ignore
      }

      setBatchResult({
        success: true,
        generatedCount: res.generatedCount,
        skippedCount: res.skippedCount,
        totalAmount: res.totalAmount,
        message: `تم توليد وترحيل ${res.generatedCount} فاتورة دورية بنجاح لشهر ${currentMonthInfo.nameAr} بإجمالي ${formatCurrency(res.totalAmount)}`,
        invoices: res.invoices
      });

      setSelectedContractIds([]);
      setShowConfirmModal(false);
    } else {
      setBatchResult({
        success: false,
        generatedCount: 0,
        skippedCount: res.skippedCount,
        totalAmount: 0,
        message: res.error || 'لم يتم توليد أي فواتير (قد تكون مصدرة مسبقاً)',
        invoices: []
      });
      setShowConfirmModal(false);
    }
  };

  // Instant Single Invoice Generation
  const handleGenerateSingle = (contract: Contract) => {
    const res = generateContractInvoice({
      contractId: contract.id,
      dueDate: effectiveDueDate,
      periodStart,
      periodEnd,
      amount: contract.installmentAmount
    });

    if (res.success && res.invoice) {
      setQuickGenNotice(`تم إصدار الفاتورة ${res.invoice.invoiceNumber} بنجاح للعقد ${contract.contractNumber}`);
      setTimeout(() => setQuickGenNotice(null), 4000);
    } else {
      alert(res.error || 'تعذر إصدار الفاتورة');
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSettingsNotice(true);
    setTimeout(() => setSavedSettingsNotice(false), 3000);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Mode Tabs */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-5 shadow-sm border border-slate-700">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shrink-0">
              <Repeat className="w-6 h-6 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold tracking-tight">
                  نظام الفواتير الدورية وأتمتة استحقاقات الإيجار
                </h2>
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 px-2 py-0.5 rounded-md font-bold">
                  جدولة آلية
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                توليد ودفع فواتير الإيجار الشهرية المستحقة على المستأجرين مع الترحيل المحاسبي المزدوج الآلي ومنع التكرار
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onNavigateToLedger && (
              <button
                onClick={onNavigateToLedger}
                className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>العودة لسجل الفواتير العام</span>
              </button>
            )}
          </div>
        </div>

        {/* Sub Navigation Strip */}
        <div className="mt-4 pt-3 border-t border-slate-700/60 flex flex-wrap items-center gap-2 text-xs font-bold">
          <button
            onClick={() => setSubTab('schedules')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
              subTab === 'schedules'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-300 hover:bg-white/10'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>جدولة واستحقاق العقود ({stats.totalActive})</span>
          </button>

          <button
            onClick={() => setSubTab('rules')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
              subTab === 'rules'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-300 hover:bg-white/10'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>قواعد وضوابط الأتمتة</span>
          </button>

          <button
            onClick={() => setSubTab('history')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
              subTab === 'history'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-300 hover:bg-white/10'
            }`}
          >
            <History className="w-4 h-4" />
            <span>سجل دورات التوليد السابقة ({batchHistory.length})</span>
          </button>
        </div>
      </div>

      {/* Quick Notice Toast */}
      {quickGenNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold flex items-center justify-between shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{quickGenNotice}</span>
          </div>
          <button onClick={() => setQuickGenNotice(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Batch Result Banner */}
      {batchResult && (
        <div className={`p-4 rounded-xl text-xs font-bold border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs animate-in fade-in duration-200 ${
          batchResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-amber-50 border-amber-200 text-amber-900'
        }`}>
          <div className="flex items-center gap-2.5">
            {batchResult.success ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            )}
            <div>
              <p className="text-sm font-black">{batchResult.message}</p>
              {batchResult.success && batchResult.generatedCount > 0 && (
                <p className="text-slate-600 font-normal mt-0.5">
                  تم قيد المبالغ في حسابات المستأجرين، وترحيل قيود الاستحقاق (1130 مدين / 4100 دائن) بدفتر الأستاذ.
                </p>
              )}
            </div>
          </div>

          <button
            onClick={() => setBatchResult(null)}
            className="px-3 py-1 bg-white/80 hover:bg-white border rounded-lg text-slate-700 shrink-0"
          >
            إغلاق الإشعار
          </button>
        </div>
      )}

      {/* SUB-TAB 1: SCHEDULES & BATCH GENERATION */}
      {subTab === 'schedules' && (
        <div className="space-y-6">
          
          {/* Month Selector & KPIs Bar */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            
            {/* Top Row: Target Month Selector & Due Date */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex flex-wrap items-center gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    الشهر المستهدف للتوليد الدوري:
                  </label>
                  <select
                    value={selectedMonth}
                    onChange={e => {
                      setSelectedMonth(e.target.value);
                      setCustomDueDate(`${e.target.value}-01`);
                    }}
                    className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  >
                    {MONTHS_LIST.map(m => (
                      <option key={m.value} value={m.value}>
                        {m.nameAr} ({m.value})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    تاريخ استحقاق الفواتير:
                  </label>
                  <input
                    type="date"
                    value={customDueDate}
                    onChange={e => setCustomDueDate(e.target.value)}
                    className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    الفترة الإيجارية المعتمدة:
                  </label>
                  <div className="bg-slate-100 border border-slate-200 px-3 py-2 rounded-xl text-xs font-mono text-slate-700 font-semibold">
                    {periodStart} إلى {periodEnd}
                  </div>
                </div>
              </div>

              {/* Action: Run Batch Button */}
              <div>
                {isSupervisoryOnly ? (
                  <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs px-3.5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-2xs">
                    <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>وظيفة رقابية للمدير: إصدار الدفعات يتم من صلاحية المحاسب المالي</span>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowConfirmModal(true)}
                    disabled={stats.pendingCount === 0}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs ${
                      stats.pendingCount > 0
                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white ring-2 ring-indigo-500/20 active:scale-98'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                    }`}
                  >
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>
                      {selectedContractIds.length > 0
                        ? `تشغيل دورة الاستحقاق (${selectedContractIds.length} فواتير مختارة)`
                        : stats.pendingCount > 0
                        ? `توليد كافة فواتير شهر ${currentMonthInfo.nameAr} (${stats.pendingCount} فاتورة)`
                        : `كافة فواتير شهر ${currentMonthInfo.nameAr} تم إصدارها`}
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* KPI Cards Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
                  <span>العقود النشطة المجدولة</span>
                  <Building className="w-4 h-4 text-slate-400" />
                </div>
                <div className="text-2xl font-black text-slate-900 mt-2 font-mono">
                  {stats.totalActive} عقود
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  إجمالي قيمة الاستحقاق الشهري
                </div>
              </div>

              <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3.5 flex flex-col justify-between">
                <div className="flex items-center justify-between text-emerald-800 text-xs font-bold">
                  <span>فواتير تم إصدارها لشهر {currentMonthInfo.nameAr.split(' ')[0]}</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-black text-emerald-800 mt-2 font-mono">
                  {stats.generatedCount} <span className="text-xs font-normal">من {stats.totalActive}</span>
                </div>
                <div className="text-[11px] font-bold text-emerald-700 font-mono mt-1">
                  {formatCurrency(stats.generatedAmount)}
                </div>
              </div>

              <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3.5 flex flex-col justify-between">
                <div className="flex items-center justify-between text-amber-800 text-xs font-bold">
                  <span>فواتير معلقة جاهزة للإصدار</span>
                  <Clock className="w-4 h-4 text-amber-600" />
                </div>
                <div className="text-2xl font-black text-amber-900 mt-2 font-mono">
                  {stats.pendingCount} <span className="text-xs font-normal">فواتير</span>
                </div>
                <div className="text-[11px] font-bold text-amber-700 font-mono mt-1">
                  {formatCurrency(stats.pendingAmount)}
                </div>
              </div>

              <div className="bg-indigo-50/60 border border-indigo-200 rounded-xl p-3.5 flex flex-col justify-between">
                <div className="flex items-center justify-between text-indigo-900 text-xs font-bold">
                  <span>اكتمال دورة شهر {currentMonthInfo.nameAr.split(' ')[0]}</span>
                  <Repeat className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="text-2xl font-black text-indigo-950 mt-2 font-mono">
                  {stats.completionPercent}%
                </div>
                <div className="w-full bg-indigo-200 rounded-full h-2 mt-2 overflow-hidden">
                  <div
                    className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${stats.completionPercent}%` }}
                  />
                </div>
              </div>

            </div>
          </div>

          {/* Schedules Table Toolbar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
            
            <div className="flex items-center gap-2 flex-1">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  placeholder="بحث بالمستأجر أو رقم العقد أو الوحدة..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pr-9 pl-3 py-2 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {stats.pendingCount > 0 && !isSupervisoryOnly && (
                <button
                  onClick={handleSelectAllPending}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold transition-colors shrink-0 cursor-pointer"
                >
                  {selectedContractIds.length === stats.pendingCount
                    ? 'إلغاء التحديد'
                    : `تحديد كافة المعلقة (${stats.pendingCount})`}
                </button>
              )}
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg shrink-0">
              <button
                onClick={() => setScheduleFilter('ALL')}
                className={`px-3 py-1.5 rounded-md font-bold transition-colors ${
                  scheduleFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                الكل ({contractsAnalysis.length})
              </button>
              <button
                onClick={() => setScheduleFilter('PENDING')}
                className={`px-3 py-1.5 rounded-md font-bold transition-colors ${
                  scheduleFilter === 'PENDING' ? 'bg-white text-amber-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                المعلقة ({stats.pendingCount})
              </button>
              <button
                onClick={() => setScheduleFilter('GENERATED')}
                className={`px-3 py-1.5 rounded-md font-bold transition-colors ${
                  scheduleFilter === 'GENERATED' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                المصدرة ({stats.generatedCount})
              </button>
            </div>

          </div>

          {/* Contracts Schedule Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    {!isSupervisoryOnly && <th className="p-3 w-10 text-center">اختيار</th>}
                    <th className="p-3">رقم العقد</th>
                    <th className="p-3">المستأجر</th>
                    <th className="p-3">العقار والوحدة</th>
                    <th className="p-3">الدورية</th>
                    <th className="p-3 text-left font-mono">القسط الدوري</th>
                    <th className="p-3">حالة استحقاق شهر {currentMonthInfo.nameAr.split(' ')[0]}</th>
                    <th className="p-3 text-center">الإجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSchedules.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        لا توجد عقود مطابقة لمعايير البحث الحالية
                      </td>
                    </tr>
                  ) : (
                    filteredSchedules.map(item => {
                      const isPending = !item.isGenerated && item.isWithinContract;
                      const isChecked = selectedContractIds.includes(item.contract.id);

                      return (
                        <tr
                          key={item.contract.id}
                          className={`hover:bg-slate-50 transition-colors ${
                            isChecked ? 'bg-indigo-50/40' : ''
                          }`}
                        >
                          {!isSupervisoryOnly && (
                            <td className="p-3 text-center">
                              {isPending ? (
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleSelectContract(item.contract.id)}
                                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                                />
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                          )}

                          <td className="p-3 font-mono font-bold text-slate-900">
                            <div className="flex items-center gap-1.5">
                              <span>{item.contract.contractNumber}</span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono block">
                              {item.contract.startDate} إلى {item.contract.endDate}
                            </span>
                          </td>

                          <td className="p-3 font-bold text-slate-800">
                            {item.tenant?.name || '---'}
                            <span className="text-[10px] text-slate-500 font-mono block">
                              {item.tenant?.phone}
                            </span>
                          </td>

                          <td className="p-3 text-slate-600">
                            <span className="font-semibold text-slate-800">{item.property?.name}</span>
                            <span className="text-slate-500 text-[11px] block">وحدة: {item.unit?.unitNumber}</span>
                          </td>

                          <td className="p-3">
                            <Badge variant="slate" size="sm">
                              {item.contract.paymentFrequency === 'MONTHLY' ? 'شهري' :
                               item.contract.paymentFrequency === 'QUARTERLY' ? 'ربع سنوي' :
                               item.contract.paymentFrequency === 'SEMI_ANNUAL' ? 'نصف سنوي' : 'سنوي'}
                            </Badge>
                          </td>

                          <td className="p-3 text-left font-mono font-black text-slate-900">
                            {formatCurrency(item.amount)}
                          </td>

                          <td className="p-3">
                            {item.isGenerated ? (
                              <div className="flex items-center gap-1.5">
                                <Badge variant="emerald" size="sm">
                                  تم الإصدار ({item.existingInvoice?.invoiceNumber})
                                </Badge>
                              </div>
                            ) : item.isWithinContract ? (
                              <Badge variant="amber" size="sm">
                                مستحق الإصدار
                              </Badge>
                            ) : (
                              <Badge variant="slate" size="sm">
                                خارج مدة العقد
                              </Badge>
                            )}
                          </td>

                          <td className="p-3 text-center">
                            {item.isGenerated && item.existingInvoice ? (
                              <button
                                onClick={() => onSelectInvoice?.(item.existingInvoice!)}
                                className="px-2.5 py-1 text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1 mx-auto"
                              >
                                <span>عرض الفاتورة</span>
                                <ArrowUpRight className="w-3 h-3" />
                              </button>
                            ) : isPending && !isSupervisoryOnly ? (
                              <button
                                onClick={() => handleGenerateSingle(item.contract)}
                                className="px-2.5 py-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1 mx-auto shadow-2xs"
                                title="إصدار فاتورة شهر هذا العقد فورياً وترحيل القيد المحاسبي"
                              >
                                <Zap className="w-3 h-3 text-amber-300" />
                                <span>إصدار فوري</span>
                              </button>
                            ) : (
                              <span className="text-slate-400 text-[11px]">مكتمل</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* SUB-TAB 2: AUTOMATION RULES & PREFERENCES */}
      {subTab === 'rules' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Settings className="w-5 h-5 text-indigo-600" />
              <span>قواعد وسياسات التوليد الدوري الآلي (Automation Policies)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              ضبط معايير استحقاق الإيجارات، وتوقيت توليد الفواتير، والترحيل المحاسبي اللحظي وفق معايير المحاسبة المعتمدة
            </p>
          </div>

          {savedSettingsNotice && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>تم حفظ وتحديث قواعد الجدولة الدورية بنجاح</span>
            </div>
          )}

          <form onSubmit={handleSaveSettings} className="space-y-4 max-w-2xl text-xs">
            
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <h4 className="font-bold text-slate-800">1. توقيت الاستحقاق والجدولة:</h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">يوم الاستحقاق الشهري الافتراضي</label>
                  <select
                    value={autoSettings.defaultDueDay}
                    onChange={e => setAutoSettings({ ...autoSettings, defaultDueDay: Number(e.target.value) })}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 font-bold"
                  >
                    <option value={1}>اليوم الأول من كل شهر (1)</option>
                    <option value={5}>اليوم الخامس من كل شهر (5)</option>
                    <option value={10}>اليوم العاشر من كل شهر (10)</option>
                    <option value={15}>منتصف الشهر (15)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">أيام إصدار الفاتورة قبل موعدها</label>
                  <select
                    value={autoSettings.leadDays}
                    onChange={e => setAutoSettings({ ...autoSettings, leadDays: Number(e.target.value) })}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 font-bold"
                  >
                    <option value={0}>في نفس يوم الاستحقاق</option>
                    <option value={3}>قبل 3 أيام من بداية الشهر</option>
                    <option value={5}>قبل 5 أيام من بداية الشهر</option>
                    <option value={7}>قبل أسبوع من بداية الشهر</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <h4 className="font-bold text-slate-800">2. الأمان الرقابي والترحيل المحاسبي:</h4>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoSettings.autoPostJournals}
                  onChange={e => setAutoSettings({ ...autoSettings, autoPostJournals: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300"
                />
                <div>
                  <span className="font-bold text-slate-800 block">ترحيل القيود المزدوجة المتوازنة تلقائياً (IFRS)</span>
                  <span className="text-[11px] text-slate-500">
                    توليد قيد يومية متوازن لكل فاتورة (مدين ذمم مستأجرين 1130 / دائن إيرادات إيجار 4100)
                  </span>
                </div>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoSettings.strictDuplicateGuard}
                  onChange={e => setAutoSettings({ ...autoSettings, strictDuplicateGuard: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300"
                />
                <div>
                  <span className="font-bold text-slate-800 block">منع الازدواجية والتكرار الصارم (Anti-Duplicate Check)</span>
                  <span className="text-[11px] text-slate-500">
                    حظر إصدار أكثر من فاتورة لنفس العقد والفترة الإيجارية لتجنب الفوترة المزدوجة للمستأجر
                  </span>
                </div>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoSettings.autoNotifyTenant}
                  onChange={e => setAutoSettings({ ...autoSettings, autoNotifyTenant: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300"
                />
                <div>
                  <span className="font-bold text-slate-800 block">إشعار المستأجر آلياً بالفاتورة الصادرة</span>
                  <span className="text-[11px] text-slate-500">
                    إرسال رسالة نصية وتجهيز المطالبة الرسمية فور اعتماد التوليد
                  </span>
                </div>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="submit"
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-xs transition-colors"
              >
                حفظ السياسات والقواعد
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SUB-TAB 3: BATCH RUN HISTORY */}
      {subTab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-600" />
                <span>سجل دورات التوليد الدورية المنفذة (Batch Execution Log)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                توثيق كامل لكافة دورات إصدار الفواتير الآلية والدفعية المنفذة وتواريخها والمستخدم المسؤول
              </p>
            </div>

            <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg">
              {batchHistory.length} دورات مسجلة
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">تاريخ ووقت التنفيذ</th>
                  <th className="p-3">الشهر المستهدف</th>
                  <th className="p-3 text-center">عدد الفواتير المولدة</th>
                  <th className="p-3 text-left font-mono">إجمالي المبالغ المستحقة</th>
                  <th className="p-3">المستخدم المنفذ</th>
                  <th className="p-3">أرقام الفواتير</th>
                  <th className="p-3 text-center">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {batchHistory.map(batch => (
                  <tr key={batch.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-mono font-bold text-slate-800">
                      {batch.runDate}
                    </td>
                    <td className="p-3 font-bold text-indigo-900">
                      {batch.monthNameAr} ({batch.targetMonth})
                    </td>
                    <td className="p-3 text-center font-mono font-black text-slate-900">
                      {batch.generatedCount} فاتورة
                    </td>
                    <td className="p-3 text-left font-mono font-black text-emerald-700">
                      {formatCurrency(batch.totalAmount)}
                    </td>
                    <td className="p-3 text-slate-700 font-medium">
                      {batch.executedBy}
                    </td>
                    <td className="p-3 text-slate-500 font-mono text-[11px]">
                      {batch.invoiceNumbers.slice(0, 3).join(' ، ')}
                      {batch.invoiceNumbers.length > 3 ? ` (+${batch.invoiceNumbers.length - 3})` : ''}
                    </td>
                    <td className="p-3 text-center">
                      <Badge variant="emerald" size="sm">
                        مرحل ومكتمل
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL BEFORE BATCH RUN */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 text-xs space-y-4 animate-in zoom-in-95 duration-150">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    تأكيد تشغيل دورة الفواتير الدورية
                  </h3>
                  <p className="text-slate-500">
                    شهر {currentMonthInfo.nameAr} ({periodStart} إلى {periodEnd})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between text-slate-700">
                <span>تاريخ استحقاق الفواتير:</span>
                <span className="font-mono font-bold text-slate-900">{effectiveDueDate}</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>عدد الفواتير التي سيتم إصدارها:</span>
                <span className="font-mono font-black text-indigo-700">
                  {selectedContractIds.length > 0 ? selectedContractIds.length : stats.pendingCount} فاتورة
                </span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>إجمالي قيمة الدورة الاستحقاقية:</span>
                <span className="font-mono font-black text-emerald-700 text-sm">
                  {formatCurrency(
                    selectedContractIds.length > 0
                      ? contractsAnalysis.filter(c => selectedContractIds.includes(c.contract.id)).reduce((s, c) => s + c.amount, 0)
                      : stats.pendingAmount
                  )}
                </span>
              </div>
            </div>

            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-900 text-[11px] leading-relaxed flex items-start gap-2">
              <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <span>
                <strong>الآثار المحاسبية والرقابية:</strong> سيقوم النظام تلقائياً بإنشاء قيد يومية متوازن لكل فاتورة (مدين ذمم المستأجرين 1130 / دائن إيرادات الإيجار 4100)، وتحديث رصيد كل مستأجر، وتسجيل العملية في سجل التدقيق الرقابي.
              </span>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer transition-colors"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleExecuteBatch}
                disabled={isProcessing}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center gap-2 shadow-xs cursor-pointer transition-colors"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>جارٍ ترحيل الفواتير والقيود...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white" />
                    <span>تأكيد وتشغيل الدورة الآن</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
