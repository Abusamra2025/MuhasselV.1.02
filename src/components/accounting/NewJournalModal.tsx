// تصميم م. أبو أحمد — مصمم ومنفذ Claude — © الحقوق محفوظة
import React, { useState } from 'react';
import { X, Plus, Trash2, CheckCircle2, AlertCircle, BookOpen } from 'lucide-react';
import { useStore } from '../../lib/store';
import { validateJournalBalance, ROUND } from '../../lib/accountingEngine';
import { formatCurrency } from '../../lib/numberToArabicWords';

interface NewJournalModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface TempLine {
  accountCode: string;
  debit: string;
  credit: string;
  description: string;
  propertyId?: string;
}

export const NewJournalModal: React.FC<NewJournalModalProps> = ({
  onClose,
  onSuccess
}) => {
  const { accounts, properties, createManualJournalEntry } = useStore();

  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState<string>('');
  const [lines, setLines] = useState<TempLine[]>([
    { accountCode: '1120', debit: '', credit: '', description: '' },
    { accountCode: '4100', debit: '', credit: '', description: '' }
  ]);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Calculate live debit/credit totals
  const mappedLines = lines.map((l, i) => ({
    id: String(i),
    accountCode: l.accountCode,
    accountName: '',
    debit: parseFloat(l.debit) || 0,
    credit: parseFloat(l.credit) || 0,
    description: l.description
  }));

  const validation = validateJournalBalance(mappedLines);

  const addLine = () => {
    setLines([...lines, { accountCode: '1110', debit: '', credit: '', description: '' }]);
  };

  const removeLine = (idx: number) => {
    if (lines.length <= 2) return;
    setLines(lines.filter((_, i) => i !== idx));
  };

  const updateLine = (idx: number, field: keyof TempLine, value: string) => {
    const updated = [...lines];
    updated[idx] = { ...updated[idx], [field]: value };
    // If debit is typed, clear credit on that line, and vice versa
    if (field === 'debit' && parseFloat(value) > 0) {
      updated[idx].credit = '';
    } else if (field === 'credit' && parseFloat(value) > 0) {
      updated[idx].debit = '';
    }
    setLines(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!description.trim()) {
      setErrorMsg('يرجى كتابة بيان ووصف القيد');
      return;
    }

    if (!validation.isBalanced) {
      setErrorMsg(`القيد غير متوازن! الفارق: ${validation.difference} ر.س. يجب أن يتساوى المدين والدائن تماماً.`);
      return;
    }

    if (validation.totalDebit <= 0) {
      setErrorMsg('يجب إدخال مبالغ صالحة في القيد');
      return;
    }

    setIsSubmitting(true);

    const res = createManualJournalEntry({
      date,
      description,
      lines: lines.map(l => ({
        accountCode: l.accountCode,
        debit: parseFloat(l.debit) || 0,
        credit: parseFloat(l.credit) || 0,
        description: l.description || description,
        propertyId: l.propertyId || undefined
      }))
    });

    setIsSubmitting(false);

    if (res.success) {
      onSuccess();
    } else {
      setErrorMsg(res.error || 'فشل ترحيل القيد');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl border border-slate-200">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-base font-bold">إنشاء وترحيل قيد يومية يدوي متوازن</h3>
              <p className="text-xs text-slate-400">
                قيد مزدوج وفق المعايير المحاسبية (Debit = Credit)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Date & Description */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                تاريخ القيد <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-mono text-slate-800"
                required
              />
            </div>
            <div className="col-span-2">
              <label className="block font-bold text-slate-700 mb-1">
                البيان العام للقيد <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="مثال: تسوية إيجارية، تسوية بنكية، إثبات أصل..."
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800"
                required
              />
            </div>
          </div>

          {/* Journal Lines Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-2.5 w-56">الحساب</th>
                  <th className="p-2.5 w-28">مدين (Debit)</th>
                  <th className="p-2.5 w-28">دائن (Credit)</th>
                  <th className="p-2.5">شرح السطر</th>
                  <th className="p-2.5 w-36">العقار (مركز التكلفة)</th>
                  <th className="p-2.5 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lines.map((line, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="p-2">
                      <select
                        value={line.accountCode}
                        onChange={e => updateLine(idx, 'accountCode', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded p-1.5 font-medium"
                      >
                        {accounts.map(a => (
                          <option key={a.code} value={a.code}>
                            {a.code} - {a.nameAr}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="p-2">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={line.debit}
                        onChange={e => updateLine(idx, 'debit', e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-white border border-slate-300 rounded p-1.5 font-mono font-bold text-slate-900"
                      />
                    </td>

                    <td className="p-2">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={line.credit}
                        onChange={e => updateLine(idx, 'credit', e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-white border border-slate-300 rounded p-1.5 font-mono font-bold text-slate-900"
                      />
                    </td>

                    <td className="p-2">
                      <input
                        type="text"
                        value={line.description}
                        onChange={e => updateLine(idx, 'description', e.target.value)}
                        placeholder="بيان خاص بالسطر"
                        className="w-full bg-white border border-slate-300 rounded p-1.5"
                      />
                    </td>

                    <td className="p-2">
                      <select
                        value={line.propertyId || ''}
                        onChange={e => updateLine(idx, 'propertyId', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded p-1.5"
                      >
                        <option value="">(عام / بدون عقار)</option>
                        {properties.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="p-2 text-center">
                      {lines.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeLine(idx)}
                          className="text-slate-400 hover:text-rose-600 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Add Line button */}
            <div className="p-2 bg-slate-50 border-t border-slate-200">
              <button
                type="button"
                onClick={addLine}
                className="text-xs text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة طرف قيد جديد</span>
              </button>
            </div>
          </div>

          {/* Balance Checker Footer */}
          <div className={`p-3 rounded-xl border flex items-center justify-between font-mono text-xs ${
            validation.isBalanced
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-rose-50 border-rose-300 text-rose-900'
          }`}>
            <div>
              <span>إجمالي المدين: <strong>{formatCurrency(validation.totalDebit)}</strong></span>
              <span className="mx-3">|</span>
              <span>إجمالي الدائن: <strong>{formatCurrency(validation.totalCredit)}</strong></span>
            </div>

            <div className="font-sans font-bold flex items-center gap-1.5">
              {validation.isBalanced ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700">القيد متوازن تماماً (الفارق 0.00 ر.س)</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  <span className="text-rose-700">الفارق: {formatCurrency(validation.difference)} (غير متوازن)</span>
                </>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-lg"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !validation.isBalanced}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold px-5 py-2 rounded-lg flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'جاري الترحيل...' : 'ترحيل القيد لدفتر الأستاذ'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
