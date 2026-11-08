// تصميم م. أبو أحمد — مصمم ومنفذ Claude — © الحقوق محفوظة
import React from 'react';
import { X, FileSpreadsheet, Scale, BookOpen, Calendar, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { Account, JournalEntry } from '../../types';
import { useStore } from '../../lib/store';
import { formatCurrency } from '../../lib/numberToArabicWords';
import { Badge } from './Badge';

interface AccountLedgerModalProps {
  accountCode: string | null;
  onClose: () => void;
  onSelectJournalEntry?: (entry: JournalEntry) => void;
}

export const AccountLedgerModal: React.FC<AccountLedgerModalProps> = ({
  accountCode,
  onClose,
  onSelectJournalEntry
}) => {
  const { accounts, journalEntries } = useStore();

  if (!accountCode) return null;

  const account = accounts.find(a => a.code === accountCode);
  if (!account) return null;

  // Find all journal lines affecting this account
  const matchingEntries = journalEntries
    .filter(j => j.status === 'POSTED')
    .sort((a, b) => a.date.localeCompare(b.date));

  let runningBalance = 0;
  const ledgerLines: Array<{
    date: string;
    entryNumber: string;
    description: string;
    debit: number;
    credit: number;
    runningBalance: number;
    entry: JournalEntry;
  }> = [];

  matchingEntries.forEach(entry => {
    entry.lines.forEach(line => {
      if (line.accountCode === account.code) {
        if (account.normalBalance === 'DEBIT') {
          runningBalance += line.debit - line.credit;
        } else {
          runningBalance += line.credit - line.debit;
        }

        ledgerLines.push({
          date: entry.date,
          entryNumber: entry.entryNumber,
          description: line.description || entry.description,
          debit: line.debit,
          credit: line.credit,
          runningBalance: Math.round(runningBalance * 100) / 100,
          entry
        });
      }
    });
  });

  const totalDebits = ledgerLines.reduce((sum, l) => sum + l.debit, 0);
  const totalCredits = ledgerLines.reduce((sum, l) => sum + l.credit, 0);

  const getAccountTypeArabic = (type: string) => {
    switch (type) {
      case 'ASSET': return 'أصول (Assets)';
      case 'LIABILITY': return 'خصوم والتزامات (Liabilities)';
      case 'EQUITY': return 'حقوق ملكية (Equity)';
      case 'REVENUE': return 'إيرادات (Revenues)';
      case 'EXPENSE': return 'مصروفات (Expenses)';
      default: return type;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono bg-slate-800 px-2 py-0.5 rounded text-emerald-400 font-bold">
                  {account.code}
                </span>
                <h3 className="text-base font-bold">{account.nameAr}</h3>
                <Badge variant="slate" size="sm">
                  {getAccountTypeArabic(account.type)}
                </Badge>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                دفتر الأستاذ العام للحساب وحركة القيود والترحيل
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-xs max-h-[80vh] overflow-y-auto">
          
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
              <span className="text-slate-500 block mb-1">طبيعة الحساب (Normal Balance)</span>
              <p className="text-base font-bold text-slate-800">
                {account.normalBalance === 'DEBIT' ? 'مدين طبيعي (Debit)' : 'دائن طبيعي (Credit)'}
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
              <span className="text-slate-500 block mb-1">إجمالي الحركات (مدين / دائن)</span>
              <p className="text-xs font-mono font-bold text-slate-700">
                مدين: {formatCurrency(totalDebits)} · دائن: {formatCurrency(totalCredits)}
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
              <span className="text-slate-500 block mb-1">الرصيد الختامي الحالي</span>
              <p className="text-lg font-black font-mono text-emerald-700">
                {formatCurrency(runningBalance)}
              </p>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-2.5">التاريخ</th>
                  <th className="p-2.5">رقم القيد</th>
                  <th className="p-2.5">البيان والشرح</th>
                  <th className="p-2.5 text-left font-mono">حركة مدين</th>
                  <th className="p-2.5 text-left font-mono">حركة دائن</th>
                  <th className="p-2.5 text-left font-mono">الرصيد المستمر</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ledgerLines.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      لا توجد أي قيود مرحلة على هذا الحساب حتى الآن
                    </td>
                  </tr>
                ) : (
                  ledgerLines.map((row, idx) => (
                    <tr
                      key={idx}
                      onClick={() => onSelectJournalEntry && onSelectJournalEntry(row.entry)}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                      title="انقر لعرض تفاصيل قيد اليومية"
                    >
                      <td className="p-2.5 font-mono text-slate-600">{row.date}</td>
                      <td className="p-2.5 font-mono font-bold text-indigo-700 hover:underline">
                        {row.entryNumber}
                      </td>
                      <td className="p-2.5 text-slate-800">{row.description}</td>
                      <td className="p-2.5 text-left font-mono font-bold text-slate-900">
                        {row.debit > 0 ? formatCurrency(row.debit) : '—'}
                      </td>
                      <td className="p-2.5 text-left font-mono font-bold text-slate-900">
                        {row.credit > 0 ? formatCurrency(row.credit) : '—'}
                      </td>
                      <td className="p-2.5 text-left font-mono font-black text-emerald-700">
                        {formatCurrency(row.runningBalance)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="bg-slate-100 font-bold font-mono border-t-2 border-slate-300">
                <tr>
                  <td colSpan={3} className="p-2.5 text-slate-900">إجمالي حركة الحساب</td>
                  <td className="p-2.5 text-left text-slate-900">{formatCurrency(totalDebits)}</td>
                  <td className="p-2.5 text-left text-slate-900">{formatCurrency(totalCredits)}</td>
                  <td className="p-2.5 text-left text-emerald-800 font-black">{formatCurrency(runningBalance)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs px-5 py-2 rounded-lg transition-colors cursor-pointer"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
};
