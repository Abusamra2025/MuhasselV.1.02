// تصميم م. أبو أحمد — مصمم ومنفذ Claude — © الحقوق محفوظة
import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  X,
  User,
  Building,
  Receipt,
  FileText,
  ArrowRight,
  ChevronLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Phone,
  Hash,
  ExternalLink
} from 'lucide-react';
import { useStore } from '../../lib/store';
import { Tenant, Property, Invoice } from '../../types';
import { formatCurrency } from '../../lib/numberToArabicWords';
import { Badge } from './Badge';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTenant?: (tenant: Tenant) => void;
  onSelectProperty?: (property: Property) => void;
  onSelectInvoice?: (invoice: Invoice) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectTenant,
  onSelectProperty,
  onSelectInvoice
}) => {
  const { tenants, properties, units, invoices, contracts } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'TENANTS' | 'PROPERTIES' | 'INVOICES'>('ALL');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const cleanQuery = searchTerm.trim().toLowerCase();

  // Search Tenants
  const matchingTenants = cleanQuery
    ? tenants.filter(t =>
        t.name.toLowerCase().includes(cleanQuery) ||
        t.nationalId.includes(cleanQuery) ||
        t.phone.includes(cleanQuery) ||
        (t.email && t.email.toLowerCase().includes(cleanQuery))
      )
    : tenants.slice(0, 5);

  // Search Properties
  const matchingProperties = cleanQuery
    ? properties.filter(p =>
        p.name.toLowerCase().includes(cleanQuery) ||
        p.code.toLowerCase().includes(cleanQuery) ||
        p.city.toLowerCase().includes(cleanQuery) ||
        p.address.toLowerCase().includes(cleanQuery)
      )
    : properties.slice(0, 5);

  // Search Invoices
  const matchingInvoices = cleanQuery
    ? invoices.filter(inv => {
        const tenant = tenants.find(t => t.id === inv.tenantId);
        const prop = properties.find(p => p.id === inv.propertyId);
        return (
          inv.invoiceNumber.toLowerCase().includes(cleanQuery) ||
          inv.dueDate.includes(cleanQuery) ||
          (tenant && tenant.name.toLowerCase().includes(cleanQuery)) ||
          (prop && prop.name.toLowerCase().includes(cleanQuery))
        );
      })
    : invoices.slice(0, 5);

  const totalResults =
    (filterType === 'ALL' || filterType === 'TENANTS' ? matchingTenants.length : 0) +
    (filterType === 'ALL' || filterType === 'PROPERTIES' ? matchingProperties.length : 0) +
    (filterType === 'ALL' || filterType === 'INVOICES' ? matchingInvoices.length : 0);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-start justify-center p-4 pt-12 sm:pt-20">
      <div
        className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-right flex flex-col max-h-[85vh]"
        onClick={e => e.stopPropagation()}
        dir="rtl"
      >
        {/* Top Input Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/50 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <Search className="w-5 h-5" />
          </div>

          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="ابحث في النظام عن مستأجر، عقار، أو رقم فاتورة..."
              className="w-full bg-white border border-slate-300 text-slate-900 text-sm sm:text-base rounded-xl px-4 py-2.5 pl-10 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-hidden font-medium placeholder-slate-400"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                title="مسح"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer shrink-0"
            title="إغلاق (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Badges & Results Counter */}
        <div className="px-4 py-2.5 bg-white border-b border-slate-100 flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500 font-medium ml-1">تصفية:</span>
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                filterType === 'ALL'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              الكل ({matchingTenants.length + matchingProperties.length + matchingInvoices.length})
            </button>
            <button
              onClick={() => setFilterType('TENANTS')}
              className={`px-3 py-1 rounded-lg font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                filterType === 'TENANTS'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>المستأجرين ({matchingTenants.length})</span>
            </button>
            <button
              onClick={() => setFilterType('PROPERTIES')}
              className={`px-3 py-1 rounded-lg font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                filterType === 'PROPERTIES'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              <Building className="w-3.5 h-3.5" />
              <span>العقارات ({matchingProperties.length})</span>
            </button>
            <button
              onClick={() => setFilterType('INVOICES')}
              className={`px-3 py-1 rounded-lg font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                filterType === 'INVOICES'
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>الفواتير ({matchingInvoices.length})</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-400 font-medium shrink-0 hidden sm:block">
            {cleanQuery ? 'نتائج مطابقة لحظية' : 'أحدث السجلات النشطة'}
          </div>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {totalResults === 0 ? (
            <div className="text-center py-12 text-slate-500 space-y-2">
              <Search className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="font-bold text-slate-700 text-base">لا توجد نتائج مطابقة لبحثك</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                جرّب إدخال اسم المستأجر أو رقم هويته، أو رمز العقار أو المدينة، أو رقم الفاتورة (مثل INV-2026).
              </p>
            </div>
          ) : (
            <>
              {/* SECTION: TENANTS */}
              {(filterType === 'ALL' || filterType === 'TENANTS') && matchingTenants.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 pb-1 border-b border-slate-100">
                    <span className="flex items-center gap-1.5 text-indigo-700">
                      <User className="w-4 h-4" />
                      <span>المستأجرين ({matchingTenants.length})</span>
                    </span>
                    <span className="text-[10px] text-slate-400">انقر لعرض الملف والبيان</span>
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    {matchingTenants.map(tenant => {
                      const activeCon = contracts.find(c => c.tenantId === tenant.id && c.status === 'ACTIVE');
                      const prop = activeCon ? properties.find(p => p.id === activeCon.propertyId) : undefined;
                      const unit = activeCon ? units.find(u => u.id === activeCon.unitId) : undefined;

                      return (
                        <div
                          key={tenant.id}
                          onClick={() => {
                            if (onSelectTenant) onSelectTenant(tenant);
                            onClose();
                          }}
                          className="p-3 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 transition-all flex items-center justify-between gap-3 group cursor-pointer"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 group-hover:bg-indigo-200 transition-colors">
                              <User className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-slate-900 group-hover:text-indigo-700">
                                  {tenant.name}
                                </span>
                                <Badge variant={tenant.balance > 0 ? 'rose' : 'emerald'} size="sm">
                                  {tenant.balance > 0 ? `رصيد مدين: ${formatCurrency(tenant.balance)}` : 'خالص الحساب'}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3 h-3 text-slate-400" />
                                  <span dir="ltr">{tenant.phone}</span>
                                </span>
                                <span className="flex items-center gap-1">
                                  <Hash className="w-3 h-3 text-slate-400" />
                                  <span>الهوية: {tenant.nationalId}</span>
                                </span>
                                {prop && unit && (
                                  <span className="flex items-center gap-1 text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                                    <Building className="w-3 h-3 text-slate-400" />
                                    <span>{prop.name} - {unit.unitNumber}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:-translate-x-1 transition-transform shrink-0" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SECTION: PROPERTIES */}
              {(filterType === 'ALL' || filterType === 'PROPERTIES') && matchingProperties.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 pb-1 border-b border-slate-100">
                    <span className="flex items-center gap-1.5 text-emerald-700">
                      <Building className="w-4 h-4" />
                      <span>العقارات ({matchingProperties.length})</span>
                    </span>
                    <span className="text-[10px] text-slate-400">انقر للتفاصيل والوحدات</span>
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    {matchingProperties.map(property => {
                      const propUnits = units.filter(u => u.propertyId === property.id);
                      const occupiedCount = propUnits.filter(u => u.status === 'OCCUPIED').length;
                      const occRate = propUnits.length > 0 ? Math.round((occupiedCount / propUnits.length) * 100) : 0;

                      return (
                        <div
                          key={property.id}
                          onClick={() => {
                            if (onSelectProperty) onSelectProperty(property);
                            onClose();
                          }}
                          className="p-3 rounded-xl border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/40 transition-all flex items-center justify-between gap-3 group cursor-pointer"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 group-hover:bg-emerald-200 transition-colors">
                              <Building className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-slate-900 group-hover:text-emerald-700">
                                  {property.name}
                                </span>
                                <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono font-bold">
                                  {property.code}
                                </span>
                                <Badge variant="blue" size="sm">
                                  {property.type === 'COMMERCIAL' ? 'تجاري' : property.type === 'MIXED' ? 'مختلط' : 'سكني'}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                                <span>{property.city} - {property.address}</span>
                                <span className="text-slate-400">•</span>
                                <span>{propUnits.length} وحدة</span>
                                <span className="text-slate-400">•</span>
                                <span className="text-emerald-700 font-semibold">إشغال {occRate}%</span>
                              </div>
                            </div>
                          </div>

                          <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:-translate-x-1 transition-transform shrink-0" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SECTION: INVOICES */}
              {(filterType === 'ALL' || filterType === 'INVOICES') && matchingInvoices.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 pb-1 border-b border-slate-100">
                    <span className="flex items-center gap-1.5 text-amber-700">
                      <Receipt className="w-4 h-4" />
                      <span>فواتير الإيجار والمستحقات ({matchingInvoices.length})</span>
                    </span>
                    <span className="text-[10px] text-slate-400">انقر لمعاينة الفاتورة</span>
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    {matchingInvoices.map(invoice => {
                      const tenant = tenants.find(t => t.id === invoice.tenantId);
                      const prop = properties.find(p => p.id === invoice.propertyId);

                      return (
                        <div
                          key={invoice.id}
                          onClick={() => {
                            if (onSelectInvoice) onSelectInvoice(invoice);
                            onClose();
                          }}
                          className="p-3 rounded-xl border border-slate-200 hover:border-amber-400 hover:bg-amber-50/40 transition-all flex items-center justify-between gap-3 group cursor-pointer"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 group-hover:bg-amber-200 transition-colors">
                              <Receipt className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-sm text-slate-900 group-hover:text-amber-800">
                                  {invoice.invoiceNumber}
                                </span>
                                <Badge
                                  variant={
                                    invoice.status === 'PAID'
                                      ? 'emerald'
                                      : invoice.status === 'PARTIAL'
                                      ? 'amber'
                                      : 'rose'
                                  }
                                  size="sm"
                                >
                                  {invoice.status === 'PAID'
                                    ? 'مسددة'
                                    : invoice.status === 'PARTIAL'
                                    ? 'مسددة جزئياً'
                                    : 'مستحقة السداد'}
                                </Badge>
                                <span className="text-xs font-bold text-slate-800">
                                  {formatCurrency(invoice.amount)}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                                {tenant && <span>المستأجر: {tenant.name}</span>}
                                {prop && <span>العقار: {prop.name}</span>}
                                <span className="flex items-center gap-1 text-slate-400">
                                  <Calendar className="w-3 h-3" />
                                  <span>تاريخ الاستحقاق: {invoice.dueDate}</span>
                                </span>
                                {invoice.balance > 0 && (
                                  <span className="text-rose-600 font-semibold">
                                    المتبقي: {formatCurrency(invoice.balance)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:text-amber-600 group-hover:-translate-x-1 transition-transform shrink-0" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span>اختصارات: اضغط <kbd className="bg-white border border-slate-300 px-1.5 py-0.5 rounded text-[10px] font-mono shadow-2xs">Esc</kbd> للإغلاق</span>
          </div>
          <div className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>بحث مباشر في قاعدة البيانات المتكاملة</span>
          </div>
        </div>
      </div>
    </div>
  );
};
