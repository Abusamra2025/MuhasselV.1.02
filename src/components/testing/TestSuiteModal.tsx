// تصميم م. أبو أحمد — مصمم ومنفذ Claude — © الحقوق محفوظة
import React, { useState } from 'react';
import { ShieldCheck, CheckCircle2, XCircle, Play, RotateCcw, X, Clock, AlertTriangle } from 'lucide-react';
import { useStore } from '../../lib/store';
import { runFullAccountingTestSuite, TestSuiteSummary } from '../../lib/testSuite';
import { Badge } from '../common/Badge';

interface TestSuiteModalProps {
  onClose?: () => void;
  isStandaloneTab?: boolean;
}

export const TestSuiteModal: React.FC<TestSuiteModalProps> = ({
  onClose,
  isStandaloneTab = false
}) => {
  const store = useStore();

  const [testSummary, setTestSummary] = useState<TestSuiteSummary>(() =>
    runFullAccountingTestSuite(store)
  );
  const [isRunning, setIsRunning] = useState<boolean>(false);

  const handleRunTests = () => {
    setIsRunning(true);
    setTimeout(() => {
      const summary = runFullAccountingTestSuite(store);
      setTestSummary(summary);
      setIsRunning(false);
    }, 400);
  };

  const content = (
    <div className="space-y-5 text-xs">
      
      {/* Test Suite Summary Banner */}
      <div className={`p-5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
        testSummary.allPassed
          ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
          : 'bg-rose-50/90 border-rose-300 text-rose-950'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
            testSummary.allPassed ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
          }`}>
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold">
                {testSummary.allPassed
                  ? 'تم اجتياز جميع اختبارات التدقيق المحاسبي بنجاح تام'
                  : 'تم رصد إخفاقات في اختبارات المحاسبة!'}
              </h3>
              <Badge variant={testSummary.allPassed ? 'emerald' : 'rose'} size="sm">
                {testSummary.passed}/{testSummary.total} ناجح
              </Badge>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              تم فحص سلامة القيد المزدوج، منع تكرار سندات القبض، فصل أمانات التأمين، وتوازن القوائم المالية.
            </p>
          </div>
        </div>

        <button
          onClick={handleRunTests}
          disabled={isRunning}
          className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold px-4 py-2.5 rounded-lg flex items-center gap-2 transition-colors shadow-xs cursor-pointer shrink-0"
        >
          <Play className="w-4 h-4 text-emerald-400 fill-emerald-400" />
          <span>{isRunning ? 'جاري الفحص والتدقيق...' : 'إعادة تشغيل الاختبارات الآلية'}</span>
        </button>
      </div>

      {/* Tests Results List */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs divide-y divide-slate-100">
        {testSummary.results.map((res, idx) => (
          <div key={res.id} className="p-4 hover:bg-slate-50 transition-colors flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                {res.status === 'PASSED' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-600" />
                )}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-sm">
                    {idx + 1}. {res.nameAr}
                  </span>
                  <Badge variant={res.status === 'PASSED' ? 'emerald' : 'rose'} size="sm">
                    {res.status === 'PASSED' ? 'ناجح' : 'راسب'}
                  </Badge>
                </div>
                <p className="text-slate-500 text-[11px] font-sans">
                  {res.scenario}
                </p>
                <p className="text-slate-800 font-medium text-xs bg-slate-50 p-2 rounded-lg border border-slate-100">
                  {res.assertionMessage}
                </p>
                {res.details && (
                  <p className="text-slate-400 text-[10px] font-mono">
                    تفاصيل: {res.details}
                  </p>
                )}
              </div>
            </div>

            <div className="text-left font-mono text-[11px] text-slate-400 shrink-0 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>{res.durationMs}ms</span>
            </div>
          </div>
        ))}
      </div>

    </div>
  );

  if (isStandaloneTab) {
    return (
      <div className="space-y-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              مختبر التدقيق المحاسبي والفحص الآلي (Test Suite)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              تنفيذ سيناريوهات القيد المزدوج، منع التكرار، والتحقق الرياضي من معادلة الميزانية وميزان المراجعة
            </p>
          </div>
        </div>
        {content}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-base font-bold">مختبر التدقيق المحاسبي والفحص الآلي</h3>
              <p className="text-xs text-slate-400">14 سيناريو تدقيق معتمد متطابق مع متطلبات النظام</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {content}
        </div>

      </div>
    </div>
  );
};
