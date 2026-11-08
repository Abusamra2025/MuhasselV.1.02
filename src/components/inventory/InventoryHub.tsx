// تصميم م. أبو أحمد — مصمم ومنفذ Claude — © الحقوق محفوظة
import React, { useState } from 'react';
import {
  Boxes,
  PlusCircle,
  Package,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  Search,
  Filter,
  Printer,
  Download,
  AlertTriangle,
  Building,
  User,
  Calendar,
  CheckCircle2,
  FileText,
  X,
  Layers,
  Wrench,
  Clock,
  FileSpreadsheet,
  Camera,
  QrCode,
  Sparkles
} from 'lucide-react';
import { useStore } from '../../lib/store';
import { InventoryItem, InventoryTransaction } from '../../types';
import { formatCurrency } from '../../lib/numberToArabicWords';
import { Badge } from '../common/Badge';
import { StatCard } from '../common/StatCard';
import { ReportPdfPreviewModal } from '../reports/ReportPdfPreviewModal';
import { exportInventoryToExcel } from '../../lib/exportUtils';
import { QRScannerModal } from './QRScannerModal';
import { AssetMaintenanceHistoryModal } from './AssetMaintenanceHistoryModal';
import { AssetQrBadgeModal } from './AssetQrBadgeModal';

type InventoryTab = 'items' | 'transactions' | 'reports';

export const InventoryHub: React.FC = () => {
  const {
    inventoryItems,
    inventoryTransactions,
    properties,
    currentUser,
    canUserPerform,
    isSupervisoryOnly,
    recordInventoryTransaction,
    addAssetMaintenanceLog,
    expenses
  } = useStore();

  const [activeTab, setActiveTab] = useState<InventoryTab>('items');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('ALL');

  // Modals
  const [isNewTxModalOpen, setIsNewTxModalOpen] = useState(false);
  const [selectedDocForPrint, setSelectedDocForPrint] = useState<InventoryTransaction | null>(null);
  const [selectedItemDetails, setSelectedItemDetails] = useState<InventoryItem | null>(null);
  const [isPdfReportOpen, setIsPdfReportOpen] = useState(false);
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);
  const [selectedItemForMaintenance, setSelectedItemForMaintenance] = useState<InventoryItem | null>(null);
  const [selectedItemForQrBadge, setSelectedItemForQrBadge] = useState<InventoryItem | null>(null);

  // New Transaction Form State
  const [txType, setTxType] = useState<'INBOUND' | 'OUTBOUND' | 'CUSTODY_ASSIGN'>('OUTBOUND');
  const [txItemId, setTxItemId] = useState(inventoryItems[0]?.id || '');
  const [txQuantity, setTxQuantity] = useState<number>(1);
  const [txPropertyId, setTxPropertyId] = useState<string>(properties[0]?.id || '');
  const [txRecipient, setTxRecipient] = useState('');
  const [txNotes, setTxNotes] = useState('');
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);
  const [txError, setTxError] = useState<string | null>(null);

  // Stats
  const totalStockValue = inventoryItems.reduce((sum, item) => sum + item.totalValue, 0);
  const totalItemsCount = inventoryItems.reduce((sum, item) => sum + item.quantityOnHand, 0);
  const lowStockItems = inventoryItems.filter(item => item.quantityOnHand <= item.minimumThreshold);
  const custodyTransactions = inventoryTransactions.filter(t => t.type === 'CUSTODY_ASSIGN');

  // Filtered items
  const filteredItems = inventoryItems.filter(item => {
    const matchesSearch =
      item.name.includes(searchTerm) ||
      item.itemCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.warehouseLocation.includes(searchTerm);
    const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Filtered transactions
  const filteredTransactions = inventoryTransactions.filter(tx => {
    const matchesSearch =
      tx.itemName.includes(searchTerm) ||
      tx.documentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.recipientName.includes(searchTerm) ||
      tx.notes.includes(searchTerm);
    const matchesProperty = selectedPropertyId === 'ALL' || tx.propertyId === selectedPropertyId;
    return matchesSearch && matchesProperty;
  });

  const handleCreateTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    setTxError(null);

    if (!txItemId) {
      setTxError('يرجى اختيار الصنف المخزني');
      return;
    }
    if (txQuantity <= 0) {
      setTxError('يرجى تحديد كمية صحيحة أكبر من صفر');
      return;
    }
    if (!txRecipient.trim()) {
      setTxError('يرجى تحديد اسم المستلم أو الفني أو الجهة');
      return;
    }

    const res = recordInventoryTransaction({
      type: txType,
      itemId: txItemId,
      quantity: txQuantity,
      propertyId: txPropertyId || undefined,
      recipientName: txRecipient.trim(),
      notes: txNotes.trim(),
      date: txDate
    });

    if (!res.success) {
      setTxError(res.error || 'فشل تسجيل الحركة المخزنية');
      return;
    }

    setIsNewTxModalOpen(false);
    // Reset form
    setTxQuantity(1);
    setTxRecipient('');
    setTxNotes('');
    if (res.transaction) {
      setSelectedDocForPrint(res.transaction);
    }
  };

  const getItemCategoryLabel = (cat: InventoryItem['category']) => {
    switch (cat) {
      case 'MAINTENANCE_PARTS': return 'قطع صيانة وتكييف';
      case 'FIXTURES': return 'تجهيزات ومعدات';
      case 'TOOLS': return 'أجهزة وعدد فنية';
      case 'SUPPLIES': return 'مستهلكات وإنارة';
      default: return cat;
    }
  };

  const getTxTypeLabel = (type: InventoryTransaction['type']) => {
    switch (type) {
      case 'INBOUND': return 'توريد واستلام مخزني';
      case 'OUTBOUND': return 'صرف لموقع وعقار';
      case 'CUSTODY_ASSIGN': return 'تسليم ونقل عهدة';
      default: return type;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">
              المستودع والمخازن وإدارة العهد العينية
            </h2>
            <Badge variant="amber" size="sm">
              نافذة محاسب المخازن
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            إدارة أصناف الصيانة، ضبط أرصدة المستودع المركزي، إصدار سندات الصرف والتوريد وتتبع العهد المسلمة
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Scan QR Code Feature for Employees & Field Technicians */}
          <button
            onClick={() => setIsQrScannerOpen(true)}
            className="bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs sm:text-sm font-bold px-3.5 py-2 rounded-lg flex items-center gap-2 transition-all shadow-xs active:scale-95 cursor-pointer ring-2 ring-emerald-400/30"
            title="مسح كود الاستجابة السريعة (QR Code) للأصل أو المعدة عبر الكاميرا لاستعراض سجل الصيانة فورياً"
          >
            <Camera className="w-4 h-4 text-emerald-200" />
            <span>مسح كود الأصل (Scan QR)</span>
          </button>

          {canUserPerform('canReviewReports') && (
            <>
              <button
                onClick={() => exportInventoryToExcel(inventoryItems, inventoryTransactions)}
                className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-bold px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                title="تصدير جدول الأصناف وحركات المستودع إلى ملف Excel (.xlsx)"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
                <span>تصدير المستودع (Excel)</span>
              </button>

              <button
                onClick={() => setIsPdfReportOpen(true)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors border border-slate-200 cursor-pointer"
                title="طباعة وتصدير تقرير جرد المستودع"
              >
                <Printer className="w-4 h-4 text-slate-600" />
                <span>طباعة تقرير الجرد</span>
              </button>
            </>
          )}

          {isSupervisoryOnly ? (
            <div
              className="bg-rose-50 border border-rose-200 text-rose-800 text-xs px-3 py-2 rounded-lg font-bold flex items-center gap-1.5"
              title="المدير العام يملك المراجعة والاطلاع فقط؛ الإدخال لموظف المخازن"
            >
              <ShieldCheck className="w-4 h-4 text-rose-600" />
              <span>مراجعة المدير العام (حظر الإدخال)</span>
            </div>
          ) : (
            canUserPerform('canInput') && (
              <button
                onClick={() => {
                  setTxError(null);
                  setIsNewTxModalOpen(true);
                }}
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-bold px-4 py-2 rounded-lg flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>حركة مخزنية جديدة (صرف / توريد / عهدة)</span>
              </button>
            )
          )}
        </div>
      </div>

      {/* Role Segregation & Access Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-xs text-amber-900">
        <Boxes className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-bold text-amber-950 text-sm">
            نافذة عمل مستقلة وخاصة بقسم المستودع والمخازن (Segregated Department Window)
          </h4>
          <p className="mt-0.5 leading-relaxed text-amber-800">
            وفق توجيهات المدير العام، تتاح هذه النافذة حصراً للموظف المفوّض لإجراء عمليات الإدخال المخزني ومراجعة تقاريره وطباعة مستنداته الرسمية دون الاطلاع على سجلات الفروع الأخرى. يمارس المدير العام الرقابة والمراجعة والاعتماد الشامل.
          </p>
        </div>
      </div>

      {/* Quick KPI Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="قيمة المخزون الحالي"
          value={formatCurrency(totalStockValue)}
          subtitle={`${inventoryItems.length} صنف مسجل`}
          icon={Package}
          accentColor="amber"
        />
        <StatCard
          title="إجمالي القطع المتاحة"
          value={`${totalItemsCount} وحدة`}
          subtitle="رصيد فعلي بالمستودعات"
          icon={Boxes}
          accentColor="emerald"
        />
        <StatCard
          title="أصناف قاربت النفاد"
          value={`${lowStockItems.length} صنف`}
          subtitle={lowStockItems.length > 0 ? "تحت حد الطلب الأدنى" : "المستويات آمنة"}
          icon={AlertTriangle}
          accentColor={lowStockItems.length > 0 ? "rose" : "slate"}
        />
        <StatCard
          title="حركات العهد الميدانية"
          value={`${custodyTransactions.length} حركة عهدة`}
          subtitle="أجهزة ومعدات بعهدة الفنيين"
          icon={Wrench}
          accentColor="blue"
        />
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-xl px-4 pt-3 gap-6 text-sm font-bold">
        <button
          onClick={() => setActiveTab('items')}
          className={`pb-3 border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
            activeTab === 'items'
              ? 'border-amber-600 text-amber-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>أصناف المستودع والأرصدة ({inventoryItems.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('transactions')}
          className={`pb-3 border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
            activeTab === 'transactions'
              ? 'border-amber-600 text-amber-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>سجل حركات وسندات المستودع ({inventoryTransactions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`pb-3 border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
            activeTab === 'reports'
              ? 'border-amber-600 text-amber-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>تقارير المخزون والعهد الميدانية</span>
        </button>
      </div>

      {/* TAB 1: ITEMS INVENTORY */}
      {activeTab === 'items' && (
        <div className="space-y-4">
          
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row gap-3 items-center justify-between shadow-xs">
            <div className="flex items-center gap-2 w-full sm:w-auto flex-1 max-w-lg">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  placeholder="بحث برمز الأصل، السيريال، الاسم، الموقع..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-3 pr-9 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <button
                type="button"
                onClick={() => setIsQrScannerOpen(true)}
                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-2xs"
                title="مسح كود الأصل بكاميرا الجوال فورياً"
              >
                <Camera className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">مسح QR بالكاميرا</span>
                <span className="sm:hidden">مسح QR</span>
              </button>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-slate-500 font-semibold shrink-0">التصنيف:</span>
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-xs rounded-lg px-2.5 py-1.5 text-slate-700 font-medium cursor-pointer"
              >
                <option value="ALL">كافة التصنيفات</option>
                <option value="MAINTENANCE_PARTS">قطع صيانة وتكييف</option>
                <option value="FIXTURES">تجهيزات ومعدات وأصول</option>
                <option value="TOOLS">أجهزة وعدد فنية</option>
                <option value="SUPPLIES">مستهلكات وإنارة</option>
              </select>
            </div>
          </div>

          {/* Items Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">رمز الأصل / الصنف</th>
                  <th className="p-3">اسم الأصل والمواصفات</th>
                  <th className="p-3">التصنيف</th>
                  <th className="p-3 text-center">الرصيد المتاح</th>
                  <th className="p-3 text-left">سعر الوحدة</th>
                  <th className="p-3 text-left">القيمة الإجمالية</th>
                  <th className="p-3">الموقع بالعقار / المستودع</th>
                  <th className="p-3 text-center">حالة الأصل</th>
                  <th className="p-3 text-center">كود QR وسجل الصيانة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map(item => {
                  const isLow = item.quantityOnHand <= item.minimumThreshold;
                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedItemForMaintenance(item)}
                      className="hover:bg-amber-50/40 cursor-pointer transition-colors group"
                      title="انقر لمعاينة سجل الصيانة وبطاقة الأصل الفنية"
                    >
                      <td className="p-3 font-mono font-bold text-emerald-800">
                        <div className="flex items-center gap-1.5">
                          <span className="bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-200">
                            {item.itemCode}
                          </span>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-slate-900 group-hover:text-emerald-900">
                          {item.name}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-2">
                          {item.assignedPropertyName && (
                            <span className="text-emerald-700 font-medium">
                              {item.assignedPropertyName} {item.assignedUnitNumber ? `· ${item.assignedUnitNumber}` : ''}
                            </span>
                          )}
                          {item.serialNumber && (
                            <span className="font-mono text-slate-400">
                              سيريال: {item.serialNumber}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-slate-600 font-medium">
                        {getItemCategoryLabel(item.category)}
                      </td>
                      <td className="p-3 text-center font-mono font-black text-sm text-slate-900">
                        {item.quantityOnHand}
                      </td>
                      <td className="p-3 text-left font-mono font-semibold text-slate-700">
                        {formatCurrency(item.unitPrice)}
                      </td>
                      <td className="p-3 text-left font-mono font-bold text-emerald-800">
                        {formatCurrency(item.totalValue)}
                      </td>
                      <td className="p-3 text-slate-600 font-medium">
                        {item.warehouseLocation}
                      </td>
                      <td className="p-3 text-center">
                        {isLow ? (
                          <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-200 text-[10px] px-2 py-0.5 rounded font-bold">
                            <AlertTriangle className="w-3 h-3" />
                            <span>طلب عاجل (حد {item.minimumThreshold})</span>
                          </span>
                        ) : (
                          <span className="inline-block bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] px-2 py-0.5 rounded font-semibold">
                            رصيد آمن
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-center" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedItemForMaintenance(item)}
                            className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-100/80 bg-emerald-50 border border-emerald-200 transition-colors cursor-pointer"
                            title="سجل صيانة الأصل والفحوصات الدورية"
                          >
                            <Wrench className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedItemForQrBadge(item)}
                            className="p-1.5 rounded-lg text-slate-700 hover:bg-slate-100 bg-slate-50 border border-slate-200 transition-colors cursor-pointer"
                            title="عرض وطباعة ملصق كود QR للأصل"
                          >
                            <QrCode className="w-3.5 h-3.5 text-slate-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* TAB 2: TRANSACTIONS & VOUCHERS */}
      {activeTab === 'transactions' && (
        <div className="space-y-4">
          
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row gap-3 items-center justify-between shadow-xs">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
              <input
                type="text"
                placeholder="بحث برقم السند، الصنف، المستلم..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-3 pr-9 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-slate-500 font-semibold shrink-0">العقار المرتبط:</span>
              <select
                value={selectedPropertyId}
                onChange={e => setSelectedPropertyId(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-xs rounded-lg px-2.5 py-1.5 text-slate-700 font-medium cursor-pointer"
              >
                <option value="ALL">كافة العقارات</option>
                {properties.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">رقم السند</th>
                  <th className="p-3">نوع الحركة</th>
                  <th className="p-3">الصنف المنصرف / المستلم</th>
                  <th className="p-3 text-center">الكمية</th>
                  <th className="p-3 text-left">القيمة التقديرية</th>
                  <th className="p-3">الموقع / العقار</th>
                  <th className="p-3">المستلم / الفني</th>
                  <th className="p-3 text-center">التاريخ</th>
                  <th className="p-3 text-center no-print">المستند والطباعة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTransactions.map(tx => (
                  <tr
                    key={tx.id}
                    onClick={() => setSelectedDocForPrint(tx)}
                    className="hover:bg-amber-50/40 cursor-pointer transition-colors group"
                  >
                    <td className="p-3 font-mono font-bold text-amber-800">
                      {tx.documentNumber}
                    </td>
                    <td className="p-3">
                      <span className={`inline-block text-[10px] px-2 py-0.5 rounded font-bold ${
                        tx.type === 'INBOUND'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : tx.type === 'CUSTODY_ASSIGN'
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {getTxTypeLabel(tx.type)}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-slate-900 group-hover:text-amber-900">
                      {tx.itemName}
                    </td>
                    <td className="p-3 text-center font-mono font-black text-sm">
                      {tx.quantity}
                    </td>
                    <td className="p-3 text-left font-mono font-bold text-slate-800">
                      {formatCurrency(tx.totalAmount)}
                    </td>
                    <td className="p-3 text-slate-600">
                      {tx.propertyName || 'المستودع الرئيسي'}
                    </td>
                    <td className="p-3 font-medium text-slate-800">
                      {tx.recipientName}
                    </td>
                    <td className="p-3 text-center font-mono text-slate-500 text-[11px]">
                      {tx.date}
                    </td>
                    <td className="p-3 text-center no-print">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDocForPrint(tx);
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-1 rounded transition-colors"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>معاينة وطباعة</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* TAB 3: REPORTS & AUDIT */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold mb-3">
                  <Package className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">تقرير جرد المستودع الشامل</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  قائمة تفصيلية بأرصدة كافة الأصناف، قيم التكلفة، ومواقع التخزين في المستودع الرئيسي.
                </p>
              </div>
              <button
                onClick={() => setIsPdfReportOpen(true)}
                className="mt-4 w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4 text-amber-400" />
                <span>معاينة وطباعة تقرير الجرد</span>
              </button>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold mb-3">
                  <Wrench className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">سجل العهد الفنية الميدانية</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  كشف الأجهزة والمعدات الذكية المسلمة بعهدة المقاولين والفنيين مع تواريخ التسليم والمسؤولين.
                </p>
              </div>
              <button
                onClick={() => {
                  setActiveTab('transactions');
                  setSelectedPropertyId('ALL');
                }}
                className="mt-4 w-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors border border-slate-200 cursor-pointer"
              >
                <Search className="w-4 h-4 text-indigo-600" />
                <span>استعراض عهد المقاولين</span>
              </button>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center font-bold mb-3">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">تقرير النواقص وحد الطلب الأدنى</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  حصر المواد وقطع الغيار التي بلغت الحد الحرج وتستوجب إصدار طلبات شراء وتوريد عاجلة.
                </p>
              </div>
              <button
                onClick={() => {
                  setActiveTab('items');
                  setSearchTerm('');
                }}
                className="mt-4 w-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors border border-slate-200 cursor-pointer"
              >
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>متابعة {lowStockItems.length} أصناف حرجة</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 1: NEW INVENTORY TRANSACTION */}
      {isNewTxModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            
            <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-600 flex items-center justify-center text-white">
                  <Boxes className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">تسجيل حركة مخزنية جديدة</h3>
                  <p className="text-[11px] text-slate-400">سند صرف صيانة / توريد واستلام / تسليم عهدة</p>
                </div>
              </div>
              <button
                onClick={() => setIsNewTxModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTransaction} className="p-5 sm:p-6 space-y-4 text-xs">
              
              {txError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-lg flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{txError}</span>
                </div>
              )}

              {/* Transaction Type Radio Selector */}
              <div>
                <label className="font-bold text-slate-700 block mb-1.5">نوع الحركة المستودعية:</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setTxType('OUTBOUND')}
                    className={`p-2 rounded-lg border text-center font-bold cursor-pointer transition-colors ${
                      txType === 'OUTBOUND'
                        ? 'bg-rose-50 border-rose-500 text-rose-800'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    صرف صيانة
                  </button>
                  <button
                    type="button"
                    onClick={() => setTxType('INBOUND')}
                    className={`p-2 rounded-lg border text-center font-bold cursor-pointer transition-colors ${
                      txType === 'INBOUND'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    توريد واستلام
                  </button>
                  <button
                    type="button"
                    onClick={() => setTxType('CUSTODY_ASSIGN')}
                    className={`p-2 rounded-lg border text-center font-bold cursor-pointer transition-colors ${
                      txType === 'CUSTODY_ASSIGN'
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-800'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    تسليم عهدة
                  </button>
                </div>
              </div>

              {/* Item Selection */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">الصنف المخزني:</label>
                <select
                  value={txItemId}
                  onChange={e => setTxItemId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-medium focus:ring-1 focus:ring-amber-500 focus:outline-hidden"
                  required
                >
                  {inventoryItems.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.itemCode} - {item.name} (المتاح: {item.quantityOnHand} | سعر الوحدة: {formatCurrency(item.unitPrice)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">الكمية:</label>
                  <input
                    type="number"
                    min="1"
                    value={txQuantity}
                    onChange={e => setTxQuantity(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-mono font-bold focus:ring-1 focus:ring-amber-500 focus:outline-hidden"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">تاريخ الحركة:</label>
                  <input
                    type="date"
                    value={txDate}
                    onChange={e => setTxDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-mono focus:ring-1 focus:ring-amber-500 focus:outline-hidden"
                    required
                  />
                </div>
              </div>

              {/* Associated Property */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">العقار أو الموقع المستفيد:</label>
                <select
                  value={txPropertyId}
                  onChange={e => setTxPropertyId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-medium focus:ring-1 focus:ring-amber-500 focus:outline-hidden"
                >
                  <option value="">المستودع الرئيسي العام</option>
                  {properties.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Recipient */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">اسم المستلم أو الفني أو المقاول:</label>
                <input
                  type="text"
                  placeholder="مثال: فني التكييف - م. كمال الدين / شركة التيارات الحديثة"
                  value={txRecipient}
                  onChange={e => setTxRecipient(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-medium focus:ring-1 focus:ring-amber-500 focus:outline-hidden"
                  required
                />
              </div>

              {/* Notes */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">بيان وسبب الحركة:</label>
                <textarea
                  rows={2}
                  placeholder="بيان طلب الصيانة أو رقم أمر العمل وتفاصيل التركيب..."
                  value={txNotes}
                  onChange={e => setTxNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-medium focus:ring-1 focus:ring-amber-500 focus:outline-hidden"
                />
              </div>

              {/* Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewTxModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold transition-colors shadow-xs cursor-pointer"
                >
                  حفظ وترحيل السند
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* MODAL 2: PRINTABLE WAREHOUSE VOUCHER */}
      {selectedDocForPrint && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            
            <div className="no-print bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold">معاينة وطباعة سند المستودع الرسمي</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة فورية</span>
                </button>
                <button
                  onClick={() => setSelectedDocForPrint(null)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Body */}
            <div className="p-8 print-card bg-white text-slate-900 space-y-6">
              
              {/* Header Letterhead */}
              <div className="border-b-2 border-slate-900 pb-4 flex items-start justify-between">
                <div>
                  <h2 className="text-base font-black text-slate-900">
                    شركة المحصل لإدارة وتشغيل الأملاك العقارية
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    إدارة المستودعات المركزية وسندات الصرف والعهد
                  </p>
                  <span className="text-[10px] font-mono text-slate-400 block mt-1">
                    س.ت: 1010582910 · الرقم الضريبي: 300984728100003
                  </span>
                </div>
                <div className="text-left font-mono text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <div>رقم السند: <strong className="text-amber-800">{selectedDocForPrint.documentNumber}</strong></div>
                  <div>التاريخ: <strong>{selectedDocForPrint.date}</strong></div>
                </div>
              </div>

              {/* Voucher Title */}
              <div className="text-center bg-slate-50 border border-slate-200 py-2.5 rounded-xl">
                <h1 className="text-base font-black text-slate-900">
                  {selectedDocForPrint.type === 'INBOUND'
                    ? 'سند إدخال وتوريد مخزني'
                    : selectedDocForPrint.type === 'OUTBOUND'
                    ? 'سند صرف مواد صيانة وتشغيل'
                    : 'سند تسليم ونقل عهدة عينية'}
                </h1>
              </div>

              {/* Voucher Details Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-100 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">الصنف</th>
                      <th className="p-2.5 text-center">الكمية</th>
                      <th className="p-2.5 text-left">سعر التكلفة</th>
                      <th className="p-2.5 text-left">الإجمالي التقديري</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-3 font-bold text-slate-900">{selectedDocForPrint.itemName}</td>
                      <td className="p-3 text-center font-mono font-black text-sm">{selectedDocForPrint.quantity}</td>
                      <td className="p-3 text-left font-mono">{formatCurrency(selectedDocForPrint.unitPrice)}</td>
                      <td className="p-3 text-left font-mono font-bold text-emerald-800">{formatCurrency(selectedDocForPrint.totalAmount)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Beneficiary Info */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-500 font-semibold block">الموقع أو العقار المستفيد:</span>
                  <span className="font-bold text-slate-900">{selectedDocForPrint.propertyName || 'المستودع المركزي'}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block">المستلم / الجهة المنفذة:</span>
                  <span className="font-bold text-slate-900">{selectedDocForPrint.recipientName}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 font-semibold block">البيان والملاحظات:</span>
                  <span className="text-slate-700">{selectedDocForPrint.notes || 'لا توجد ملاحظات إضافية'}</span>
                </div>
              </div>

              {/* Signatures */}
              <div className="pt-8 border-t border-slate-300 grid grid-cols-3 gap-4 text-center text-xs">
                <div>
                  <p className="font-bold text-slate-700 mb-6">مسؤول المستودع</p>
                  <p className="border-t border-slate-300 pt-1 font-semibold">{selectedDocForPrint.issuedBy}</p>
                </div>
                <div>
                  <p className="font-bold text-slate-700 mb-6">المستلم / الفني</p>
                  <p className="border-t border-slate-300 pt-1 font-semibold">{selectedDocForPrint.recipientName}</p>
                </div>
                <div>
                  <p className="font-bold text-slate-700 mb-6">اعتماد الإدارة والرقابة</p>
                  <p className="border-t border-slate-300 pt-1 font-semibold">سليمان الحربي</p>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* MODAL 3: WAREHOUSE AUDIT REPORT PDF */}
      {isPdfReportOpen && (
        <ReportPdfPreviewModal
          title="تقرير جرد المخزون المركزي والعهد العينية"
          subtitle="كشف تفصيلي بالأصناف والكميات المتوفرة وقيم التكلفة ومواقع التخزين"
          reportType="inventory"
          onClose={() => setIsPdfReportOpen(false)}
          onExportExcel={() => exportInventoryToExcel(inventoryItems, inventoryTransactions)}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
              <div>
                <span className="text-slate-500">إجمالي الأصناف:</span>
                <span className="font-bold text-slate-900 mr-2">{inventoryItems.length} صنف</span>
              </div>
              <div>
                <span className="text-slate-500">إجمالي الوحدات:</span>
                <span className="font-bold text-slate-900 mr-2">{totalItemsCount} قطعة</span>
              </div>
              <div>
                <span className="text-slate-500">إجمالي القيمة:</span>
                <span className="font-bold text-emerald-800 mr-2 font-mono">{formatCurrency(totalStockValue)}</span>
              </div>
            </div>

            <table className="w-full text-right text-xs border border-slate-200">
              <thead className="bg-slate-100 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-2.5">رمز الصنف</th>
                  <th className="p-2.5">اسم الصنف والمواصفات</th>
                  <th className="p-2.5">التصنيف</th>
                  <th className="p-2.5 text-center">الرصيد</th>
                  <th className="p-2.5 text-left">التكلفة</th>
                  <th className="p-2.5 text-left">الإجمالي</th>
                  <th className="p-2.5">الموقع</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {inventoryItems.map(item => (
                  <tr key={item.id}>
                    <td className="p-2.5 font-mono font-bold">{item.itemCode}</td>
                    <td className="p-2.5 font-bold">{item.name}</td>
                    <td className="p-2.5">{getItemCategoryLabel(item.category)}</td>
                    <td className="p-2.5 text-center font-mono font-bold">{item.quantityOnHand}</td>
                    <td className="p-2.5 text-left font-mono">{formatCurrency(item.unitPrice)}</td>
                    <td className="p-2.5 text-left font-mono font-bold text-emerald-800">{formatCurrency(item.totalValue)}</td>
                    <td className="p-2.5 text-slate-600">{item.warehouseLocation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ReportPdfPreviewModal>
      )}

      {/* MODAL 4: ITEM DETAILS INSPECTOR */}
      {selectedItemDetails && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">بطاقة الصنف: {selectedItemDetails.name}</h3>
              <button onClick={() => setSelectedItemDetails(null)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-500 font-semibold block">رمز الصنف:</span>
                  <span className="font-mono font-bold text-amber-800 text-sm">{selectedItemDetails.itemCode}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block">التصنيف:</span>
                  <span className="font-bold text-slate-900">{getItemCategoryLabel(selectedItemDetails.category)}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block">الرصيد بالمستودع:</span>
                  <span className="font-mono font-black text-base text-slate-900">{selectedItemDetails.quantityOnHand} وحدة</span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block">حد الطلب الأدنى:</span>
                  <span className="font-mono font-bold text-rose-700">{selectedItemDetails.minimumThreshold} وحدة</span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block">سعر تكلفة الوحدة:</span>
                  <span className="font-mono font-bold text-slate-900">{formatCurrency(selectedItemDetails.unitPrice)}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block">إجمالي القيمة المخزنية:</span>
                  <span className="font-mono font-bold text-emerald-800">{formatCurrency(selectedItemDetails.totalValue)}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 font-semibold block">الموقع ورف التخزين:</span>
                  <span className="font-bold text-slate-800">{selectedItemDetails.warehouseLocation}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const itm = selectedItemDetails;
                      setSelectedItemDetails(null);
                      setSelectedItemForMaintenance(itm);
                    }}
                    className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer text-xs transition-colors"
                  >
                    <Wrench className="w-3.5 h-3.5 text-emerald-600" />
                    <span>سجل الصيانة</span>
                  </button>

                  <button
                    onClick={() => {
                      const itm = selectedItemDetails;
                      setSelectedItemDetails(null);
                      setSelectedItemForQrBadge(itm);
                    }}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer text-xs transition-colors"
                  >
                    <QrCode className="w-3.5 h-3.5 text-slate-600" />
                    <span>ملصق QR</span>
                  </button>
                </div>

                <button
                  onClick={() => setSelectedItemDetails(null)}
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg font-bold cursor-pointer hover:bg-slate-800 transition-colors"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: QR CAMERA SCANNER */}
      <QRScannerModal
        isOpen={isQrScannerOpen}
        onClose={() => setIsQrScannerOpen(false)}
        inventoryItems={inventoryItems}
        onAssetFound={(foundItem) => {
          setIsQrScannerOpen(false);
          setSelectedItemForMaintenance(foundItem);
        }}
      />

      {/* MODAL 6: ASSET MAINTENANCE HISTORY */}
      <AssetMaintenanceHistoryModal
        item={selectedItemForMaintenance}
        isOpen={!!selectedItemForMaintenance}
        onClose={() => setSelectedItemForMaintenance(null)}
        onOpenQrBadge={(item) => setSelectedItemForQrBadge(item)}
        onOpenScannerAgain={() => {
          setSelectedItemForMaintenance(null);
          setIsQrScannerOpen(true);
        }}
        transactions={inventoryTransactions}
        expenses={expenses}
        onAddMaintenanceLog={(itemId, logData, nextDate) => {
          addAssetMaintenanceLog(itemId, logData, nextDate);
          setSelectedItemForMaintenance(prev => {
            if (!prev || prev.id !== itemId) return prev;
            return {
              ...prev,
              lastMaintenanceDate: logData.date,
              nextMaintenanceDate: nextDate || prev.nextMaintenanceDate,
              maintenanceLogs: [{ ...logData, id: `mnt_${Date.now()}` }, ...(prev.maintenanceLogs || [])]
            };
          });
        }}
      />

      {/* MODAL 7: ASSET QR TAG PRINT MODAL */}
      <AssetQrBadgeModal
        item={selectedItemForQrBadge}
        isOpen={!!selectedItemForQrBadge}
        onClose={() => setSelectedItemForQrBadge(null)}
      />

    </div>
  );
};
