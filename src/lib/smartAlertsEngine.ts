// تصميم م. أبو أحمد — مصمم ومنفذ Claude — © الحقوق محفوظة
import {
  Contract,
  Invoice,
  Payment,
  PropertyExpense,
  Tenant,
  Property,
  Unit,
  Account,
  AccountingPeriod,
  JournalEntry,
  DatabaseBackupRecord,
  BackupSettings,
  UserProfile,
  SmartAlertItem,
  SmartAlertSeverity,
  SmartAlertCategory
} from '../types';
import { formatCurrency } from './numberToArabicWords';
import { calculateAccountBalances } from './accountingEngine';

export interface SmartAlertsInput {
  contracts: Contract[];
  invoices: Invoice[];
  payments: Payment[];
  expenses: PropertyExpense[];
  tenants: Tenant[];
  properties: Property[];
  units: Unit[];
  accounts: Account[];
  periods: AccountingPeriod[];
  users: UserProfile[];
  journalEntries?: JournalEntry[];
  backupSettings?: BackupSettings | null;
  lastBackup?: DatabaseBackupRecord | null;
}

export function generateSmartAlerts(input: SmartAlertsInput): SmartAlertItem[] {
  const alerts: SmartAlertItem[] = [];
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  // Helper map for quick tenant lookup
  const tenantMap = new Map<string, Tenant>();
  input.tenants.forEach(t => tenantMap.set(t.id, t));

  // Helper map for properties
  const propertyMap = new Map<string, Property>();
  input.properties.forEach(p => propertyMap.set(p.id, p));

  // Helper map for units
  const unitMap = new Map<string, Unit>();
  input.units.forEach(u => unitMap.set(u.id, u));

  // ========================================================
  // 1. تنبيهات النسخ الاحتياطي وسلامة السجلات المالية
  // ========================================================
  if (input.backupSettings && !input.backupSettings.autoBackupEnabled) {
    alerts.push({
      id: 'alert_backup_disabled',
      category: 'BACKUP',
      severity: 'HIGH',
      title: 'النسخ الاحتياطي التلقائي معطل حالياً',
      description: 'نظام النسخ الآلي المجدول متوقف، مما يعرض البيانات المالية لمخاطر الفقدان عند حدوث أي خلل تقني مفاجئ.',
      metric: 'متوقف',
      actionLabel: 'تفعيل النسخ الاحتياطي التلقائي',
      actionType: 'RUN_BACKUP',
      timestamp: todayStr
    });
  }

  if (input.lastBackup) {
    const backupTime = new Date(input.lastBackup.createdAt).getTime();
    const hoursSinceBackup = Math.floor((now.getTime() - backupTime) / (1000 * 60 * 60));
    if (hoursSinceBackup >= 24) {
      alerts.push({
        id: 'alert_backup_stale',
        category: 'BACKUP',
        severity: 'CRITICAL',
        title: 'تحذير سلامة: لم يتم أخذ نسخة احتياطية منذ أكثر من 24 ساعة',
        description: `آخر نسخة احتياطية مسجلة كانت قبل ${hoursSinceBackup} ساعة. يُرجى أخذ نسخة احتياطية فورية لضمان سلامة العمليات المحاسبية الأخيرة.`,
        metric: `منذ ${hoursSinceBackup} ساعة`,
        actionLabel: 'أخذ نسخة احتياطية فورية الآن',
        actionType: 'RUN_BACKUP',
        timestamp: todayStr
      });
    }
  } else {
    alerts.push({
      id: 'alert_backup_missing',
      category: 'BACKUP',
      severity: 'CRITICAL',
      title: 'قاعدة البيانات بحاجة لنسخة احتياطية أساسية',
      description: 'لم يتم العثور على أي نسخ احتياطية مسجلة في مركز الأمان السحابي. بادر بأخذ نسخة فورية لحماية الحسابات.',
      metric: 'لا توجد نسخ',
      actionLabel: 'إنشاء أول نسخة احتياطية',
      actionType: 'RUN_BACKUP',
      timestamp: todayStr
    });
  }

  // ========================================================
  // 2. تنبيهات العقود المنتهية والمشارفة على الانتهاء
  // ========================================================
  input.contracts.forEach(contract => {
    const tenant = tenantMap.get(contract.tenantId);
    const tenantName = tenant ? tenant.name : 'مستأجر غير معروف';
    const property = propertyMap.get(contract.propertyId);
    const propName = property ? property.name : 'عقار غير محدد';
    const unit = unitMap.get(contract.unitId);
    const unitNum = unit ? unit.unitNumber : '';

    const endDate = new Date(contract.endDate);
    const diffDays = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // Contract expired while marked active
    if (contract.status === 'ACTIVE' && diffDays < 0) {
      alerts.push({
        id: `alert_contract_expired_${contract.id}`,
        category: 'CONTRACTS',
        severity: 'CRITICAL',
        title: `عقد منتهي الصلاحية دون تجديد (${contract.contractNumber})`,
        description: `انتهت مدة العقد للمستأجر (${tenantName}) في ${propName} وحدة (${unitNum}) منذ ${Math.abs(diffDays)} يوم، ويتطلب تجديداً رسمياً أو إجراء إخلاء وتسوية نهائية.`,
        metric: `منتهي منذ ${Math.abs(diffDays)} يوم`,
        entityType: 'CONTRACT',
        entityId: contract.id,
        entityName: tenantName,
        actionLabel: 'تجديد العقد أو التسوية',
        actionType: 'RENEW_CONTRACT',
        timestamp: contract.endDate
      });
    } else if (contract.status === 'ACTIVE' && diffDays >= 0 && diffDays <= 7) {
      alerts.push({
        id: `alert_contract_exp_soon_7_${contract.id}`,
        category: 'CONTRACTS',
        severity: 'CRITICAL',
        title: `عقد قارب على الانتهاء خلال ${diffDays} أيام (${contract.contractNumber})`,
        description: `العقد ينتهي بتاريخ ${contract.endDate}. المستأجر: (${tenantName}) - العقار: ${propName} (${unitNum}). بادر بالتواصل لتوقيع ملحق التجديد.`,
        metric: `${diffDays} أيام متبقية`,
        entityType: 'CONTRACT',
        entityId: contract.id,
        entityName: tenantName,
        actionLabel: 'إرسال إشعار تجديد',
        actionType: 'REMIND_TENANT',
        timestamp: contract.endDate
      });
    } else if (contract.status === 'ACTIVE' && diffDays > 7 && diffDays <= 30) {
      alerts.push({
        id: `alert_contract_exp_soon_30_${contract.id}`,
        category: 'CONTRACTS',
        severity: 'HIGH',
        title: `تنبيه مبكر: عقد ينتهي خلال ${diffDays} يوماً (${contract.contractNumber})`,
        description: `ينتهي عقد المستأجر (${tenantName}) في ${contract.endDate}. يُوصى ببدء التفاوض وتجهيز شروط الفترة الإيجارية القادمة.`,
        metric: `${diffDays} يوم`,
        entityType: 'CONTRACT',
        entityId: contract.id,
        entityName: tenantName,
        actionLabel: 'مراجعة بيانات العقد',
        actionType: 'RENEW_CONTRACT',
        timestamp: contract.endDate
      });
    }
  });

  // ========================================================
  // 3. تنبيهات فواتير الإيجار المتأخرة والتحصيل والرقابة الإدارية
  // ========================================================
  const overdueInvoices = input.invoices.filter(inv => {
    return inv.status === 'OVERDUE' || (inv.status === 'UNPAID' && inv.dueDate < todayStr && inv.balance > 0);
  });

  const totalOverdueBalance = overdueInvoices.reduce((sum, inv) => sum + inv.balance, 0);

  // 3.1 تنبيه محفظة متأخرات الإيجار الإجمالية
  if (overdueInvoices.length > 0) {
    alerts.push({
      id: 'alert_portfolio_total_overdue',
      category: 'COLLECTIONS',
      severity: totalOverdueBalance > 30000 ? 'CRITICAL' : 'HIGH',
      title: `إجمالي متأخرات الإيجار في المحفظة: ${formatCurrency(totalOverdueBalance)} (${overdueInvoices.length} فواتير)`,
      description: `يوجد ${overdueInvoices.length} استحقاق إيجاري متأخر السداد بإجمالي ${formatCurrency(totalOverdueBalance)}. يتطلب من الإدارة العامة تفعيل خطة التحصيل والاطلاع على تفاصيل المستندات لاتخاذ الإجراءات النظامية.`,
      metric: formatCurrency(totalOverdueBalance),
      entityType: 'SYSTEM',
      actionLabel: 'مراجعة تقرير أعمار الديون والمستندات',
      actionType: 'VIEW_REPORT',
      timestamp: todayStr
    });
  }

  // 3.2 فحص الديون المتأخرة لأكثر من 60 يوماً (إنذار قانوني للمدير العام)
  const criticalLateInvoices = overdueInvoices.filter(inv => {
    const dueDate = new Date(inv.dueDate);
    const daysLate = Math.ceil((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysLate >= 60;
  });

  if (criticalLateInvoices.length > 0) {
    const criticalSum = criticalLateInvoices.reduce((sum, i) => sum + i.balance, 0);
    alerts.push({
      id: 'alert_critical_60days_overdue',
      category: 'COLLECTIONS',
      severity: 'CRITICAL',
      title: `تنبيه قضائي ورقابي: ${criticalLateInvoices.length} فواتير متأخرة تجاوزت 60 يوماً`,
      description: `تراكمت مديونيات إيجارية بقيمة ${formatCurrency(criticalSum)} تجاوزت مهلة السداد النظامية بأكثر من شهرين. يُوصى المدير العام بقراءة المستندات واعتماد إرسال إنذار رسمي أو توجيه المحامي.`,
      metric: `حرجة (+60 يوم) | ${formatCurrency(criticalSum)}`,
      entityType: 'INVOICE',
      entityId: criticalLateInvoices[0]?.id,
      actionLabel: 'قراءة تفاصيل المستند للمدير العام',
      actionType: 'VIEW_DOCUMENT_DETAILS',
      timestamp: todayStr
    });
  }

  // 3.3 تنبيهات فواتير الإيجار المتأخرة الفردية لكل مستأجر
  // Sort by highest balance then days late
  const topOverdue = [...overdueInvoices].sort((a, b) => b.balance - a.balance);

  topOverdue.slice(0, 15).forEach(inv => {
    const tenant = tenantMap.get(inv.tenantId);
    const tenantName = tenant ? tenant.name : 'مستأجر غير محدد';
    const property = propertyMap.get(inv.propertyId);
    const propName = property ? property.name : 'عقار';
    const unit = unitMap.get(inv.unitId);
    const unitNum = unit ? unit.unitNumber : '';
    const dueDate = new Date(inv.dueDate);
    const daysLate = Math.max(1, Math.ceil((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));

    let severity: SmartAlertSeverity = 'HIGH';
    let agingCategory = '1-30 يوم';
    if (daysLate > 90) {
      severity = 'CRITICAL';
      agingCategory = '+90 يوماً';
    } else if (daysLate > 60) {
      severity = 'CRITICAL';
      agingCategory = '61-90 يوم';
    } else if (daysLate > 30) {
      severity = 'HIGH';
      agingCategory = '31-60 يوم';
    }

    alerts.push({
      id: `alert_inv_overdue_${inv.id}`,
      category: 'COLLECTIONS',
      severity,
      title: `متأخرات إيجار: ${tenantName} (${formatCurrency(inv.balance)}) · ${propName} وحدة ${unitNum}`,
      description: `فاتورة استحقاق (${inv.invoiceNumber}) متأخرة منذ ${daysLate} يوماً (فئة: ${agingCategory}). موعد الاستحقاق كان ${inv.dueDate}. الرصيد المتبقي الواجب تحصيله: ${formatCurrency(inv.balance)}. انقر لقراءة تفاصيل المستند ومطالبة المستأجر.`,
      metric: `${formatCurrency(inv.balance)} | تأخير ${daysLate} يوم`,
      entityType: 'INVOICE',
      entityId: inv.id,
      entityName: tenantName,
      actionLabel: 'قراءة تفاصيل المستند للمدير العام',
      actionType: 'VIEW_DOCUMENT_DETAILS',
      timestamp: inv.dueDate
    });
  });

  // Invoices due in next 30 days (Upcoming Rent Dues within 30 days)
  const upcomingInvoices30Days = input.invoices.filter(inv => {
    if (inv.status !== 'UNPAID' && inv.status !== 'PARTIAL') return false;
    if (inv.balance <= 0) return false;
    const due = new Date(inv.dueDate);
    const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff >= 0 && diff <= 30;
  });

  if (upcomingInvoices30Days.length > 0) {
    const totalUpcoming = upcomingInvoices30Days.reduce((sum, i) => sum + i.balance, 0);
    const dueIn7Days = upcomingInvoices30Days.filter(inv => {
      const due = new Date(inv.dueDate);
      const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return diff <= 7;
    });

    alerts.push({
      id: 'alert_upcoming_dues_30days',
      category: 'COLLECTIONS',
      severity: dueIn7Days.length > 0 ? 'HIGH' : 'MEDIUM',
      title: `دفعات إيجارية تستحق خلال 30 يوماً القادمة (${upcomingInvoices30Days.length} دفعة)`,
      description: `إجمالي مبالغ الإيجار المستحقة للتحصيل خلال الشهر القادم: ${formatCurrency(totalUpcoming)} (منها ${dueIn7Days.length} دفعات تستحق خلال أسبوع). يُوصى بتجهيز الإشعارات ومتابعة المستأجرين.`,
      metric: `${formatCurrency(totalUpcoming)} | ${upcomingInvoices30Days.length} فاتورة`,
      entityType: 'INVOICE',
      actionLabel: 'عرض ومتابعة الفواتير المستحقة',
      actionType: 'COLLECT_INVOICE',
      timestamp: todayStr
    });

    // Individual alerts for payments due in 7 days or less
    dueIn7Days.slice(0, 5).forEach(inv => {
      const tenant = tenantMap.get(inv.tenantId);
      const tenantName = tenant ? tenant.name : 'مستأجر';
      const property = propertyMap.get(inv.propertyId);
      const propName = property ? property.name : 'عقار';
      const due = new Date(inv.dueDate);
      const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      alerts.push({
        id: `alert_inv_due_soon_${inv.id}`,
        category: 'COLLECTIONS',
        severity: diff <= 2 ? 'HIGH' : 'MEDIUM',
        title: diff === 0
          ? `استحقاق إيجار اليوم: ${tenantName} (${formatCurrency(inv.balance)})`
          : `استحقاق إيجار بعد ${diff} أيام: ${tenantName} (${formatCurrency(inv.balance)})`,
        description: `دفعة إيجار تستحق بتاريخ ${inv.dueDate} لعقار ${propName}. الرصيد المطلوب: ${formatCurrency(inv.balance)}. انقر للمعاينة وتأكيد التحصيل.`,
        metric: diff === 0 ? 'يستحق اليوم' : `متبقي ${diff} يوم`,
        entityType: 'INVOICE',
        entityId: inv.id,
        entityName: tenantName,
        actionLabel: 'تحصيل الفاتورة',
        actionType: 'COLLECT_INVOICE',
        timestamp: inv.dueDate
      });
    });
  }

  // ========================================================
  // 4. تنبيهات الوحدات الشاغرة وهدر الدخل الإيجاري
  // ========================================================
  const vacantUnits = input.units.filter(u => u.status === 'VACANT');
  if (vacantUnits.length > 0) {
    const totalEstimatedLoss = vacantUnits.reduce((acc, u) => acc + (Number(u.monthlyRent) || 0), 0);
    alerts.push({
      id: 'alert_vacant_units_summary',
      category: 'PROPERTIES',
      severity: vacantUnits.length >= 3 ? 'HIGH' : 'OPPORTUNITY',
      title: `فرصة تشغيلية: ${vacantUnits.length} وحدة شاغرة بحاجة للتأجير`,
      description: `يوجد حالياً ${vacantUnits.length} وحدة شاغرة تولد فقداً إيجارياً شهرياً يقدّر بنحو ${formatCurrency(Math.round(totalEstimatedLoss))} ر.س شهرياً. يُنصح بعرضها للتسويق وإبرام عقود جديدة.`,
      metric: `${vacantUnits.length} وحدة شاغرة`,
      actionLabel: 'إبرام عقد جديد وتأجير',
      actionType: 'RENEW_CONTRACT',
      timestamp: todayStr
    });
  }

  // ========================================================
  // 5. المؤشرات المالية والسيولة النقدية وفترات الحسابات
  // ========================================================
  let totalCashAndBank = 0;
  if (input.journalEntries && input.journalEntries.length > 0) {
    const balances = calculateAccountBalances(input.accounts, input.journalEntries);
    for (const [code, data] of balances.entries()) {
      if (code.startsWith('111') || code.startsWith('112')) {
        totalCashAndBank += data.balance;
      }
    }
  } else {
    const postedCol = input.payments.filter(p => p.status === 'POSTED').reduce((sum, p) => sum + p.amount, 0);
    const postedExp = input.expenses.filter(e => e.status === 'POSTED').reduce((sum, e) => sum + e.amount, 0);
    totalCashAndBank = postedCol - postedExp;
  }

  if (totalCashAndBank < 15000) {
    alerts.push({
      id: 'alert_low_cash_reserves',
      category: 'FINANCIAL',
      severity: totalCashAndBank < 0 ? 'CRITICAL' : 'HIGH',
      title: 'تحذير سيولة نقدية منخفضة في الصناديق والبنوك',
      description: `الرصيد النقدي والبنكي الإجمالي الحالي (${formatCurrency(totalCashAndBank)}) منخفض، مما قد يؤثر على القدرة على سداد مصروفات الصيانة والفواتير التشغيلية الطارئة.`,
      metric: formatCurrency(totalCashAndBank),
      actionLabel: 'مراجعة دفتر النقدية والأستاذ',
      actionType: 'VIEW_JOURNAL',
      timestamp: todayStr
    });
  }

  // Check unclosed past accounting periods
  const pastUnclosedPeriods = input.periods.filter(p => !p.isClosed && p.endDate < todayStr);
  pastUnclosedPeriods.forEach(p => {
    alerts.push({
      id: `alert_unclosed_period_${p.id}`,
      category: 'FINANCIAL',
      severity: 'MEDIUM',
      title: `فترة محاسبية منتهية لم يتم إقفالها (${p.name})`,
      description: `انتهت الفترة في تاريخ (${p.endDate}) ولا تزال مفتوحة للترحيل. يُنصح بإجراء التسويات الختامية وإقفال الفترة لحماية القوائم المالية من أي تعديلات بأثر رجعي.`,
      metric: `انتهت في ${p.endDate}`,
      actionLabel: 'إقفال وحماية الفترة',
      actionType: 'VIEW_REPORT',
      timestamp: p.endDate
    });
  });

  // ========================================================
  // 6. الأمان وكلمات المرور والمستخدمين
  // ========================================================
  const defaultPwUsers = input.users.filter(u => u.mustChangePasswordOnNextLogin && u.role !== 'ADMIN');
  if (defaultPwUsers.length > 0) {
    alerts.push({
      id: 'alert_default_passwords',
      category: 'SECURITY',
      severity: 'MEDIUM',
      title: `تنبيه أمان: ${defaultPwUsers.length} موظف لم يقم بتغيير كلمة المرور المؤقتة بعد`,
      description: `يوجد موظفون لا زالوا مسجلين بكلمات مرور أولية افتراضية (${defaultPwUsers.map(u => u.name).join('، ')}). يلزم النظام تغييرها عند الدخول لتعزيز سرية الحسابات.`,
      metric: `${defaultPwUsers.length} حساب`,
      actionLabel: 'مراجعة شاشة إدارة المستخدمين',
      actionType: 'VIEW_REPORT',
      timestamp: todayStr
    });
  }

  // Sort alerts by severity order: CRITICAL -> HIGH -> MEDIUM -> OPPORTUNITY -> INFO
  const severityScore: Record<SmartAlertSeverity, number> = {
    CRITICAL: 5,
    HIGH: 4,
    MEDIUM: 3,
    OPPORTUNITY: 2,
    INFO: 1
  };

  return alerts.sort((a, b) => severityScore[b.severity] - severityScore[a.severity]);
}
