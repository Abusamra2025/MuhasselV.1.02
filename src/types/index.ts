// تصميم م. أبو أحمد — مصمم ومنفذ Claude — © الحقوق محفوظة
/**
 * Mouhassil — Rental Collection & Property Accounting System
 * Core Data Models & Financial Types
 */

export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
export type NormalBalance = 'DEBIT' | 'CREDIT';

export interface Account {
  code: string;
  nameAr: string;
  nameEn: string;
  type: AccountType;
  normalBalance: NormalBalance;
  parentCode?: string;
  description?: string;
  isActive: boolean;
  systemAccount?: boolean;
}

export type JournalStatus = 'DRAFT' | 'POSTED' | 'REVERSED';
export type JournalRefType = 
  | 'INVOICE' 
  | 'PAYMENT' 
  | 'PAYMENT_REVERSAL' 
  | 'SECURITY_DEPOSIT' 
  | 'EXPENSE' 
  | 'MANUAL' 
  | 'PERIOD_CLOSE'
  | 'FIXED_ASSET'    // قيد اقتناء أصل ثابت
  | 'DEPRECIATION';  // قيد إهلاك دوري

export interface JournalLine {
  id: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  description: string;
  propertyId?: string;
  unitId?: string;
  tenantId?: string;
}

export interface JournalEntry {
  id: string;
  entryNumber: string; // e.g. JV-2026-0001
  date: string; // YYYY-MM-DD
  postingDate: string;
  status: JournalStatus;
  refType: JournalRefType;
  refId?: string;
  description: string;
  lines: JournalLine[];
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
  createdBy: string;
  createdAt: string;
  reversedByEntryId?: string;
  reversalReason?: string;
}

export type PropertyType = 'RESIDENTIAL' | 'COMMERCIAL' | 'MIXED';

export interface Property {
  id: string;
  code: string;
  name: string;
  address: string;
  city: string;
  type: PropertyType;
  totalUnits: number;
  notes?: string;
  createdAt: string;
}

export type UnitType = 'APARTMENT' | 'OFFICE' | 'SHOP' | 'WAREHOUSE' | 'VILLA';
export type UnitStatus = 'OCCUPIED' | 'VACANT' | 'MAINTENANCE';

export interface Unit {
  id: string;
  propertyId: string;
  unitNumber: string;
  floor: number;
  type: UnitType;
  monthlyRent: number;
  status: UnitStatus;
  currentTenantId?: string;
  currentContractId?: string;
  notes?: string;
}

export interface Tenant {
  id: string;
  name: string;
  nationalId: string;
  phone: string;
  email?: string;
  employer?: string;
  emergencyContact?: string;
  notes?: string;
  balance: number; // Positive = owes rent (Debit balance); Negative = advance credit
  securityDepositHeld: number; // Liability held
  createdAt: string;
}

export type PaymentFrequency = 'MONTHLY' | 'QUARTERLY' | 'SEMI_ANNUAL' | 'ANNUAL';
export type ContractStatus = 'ACTIVE' | 'EXPIRED' | 'TERMINATED' | 'DRAFT';

export interface Contract {
  id: string;
  contractNumber: string; // e.g. CON-2026-101
  tenantId: string;
  propertyId: string;
  unitId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  annualRent: number;
  paymentFrequency: PaymentFrequency;
  installmentAmount: number;
  securityDeposit: number;
  status: ContractStatus;
  notes?: string;
  createdAt: string;
  terminationDate?: string; // تاريخ الإنهاء المبكر/الإخلاء (YYYY-MM-DD)
  terminationReason?: string;
}

export type InvoiceStatus = 'UNPAID' | 'PARTIAL' | 'PAID' | 'OVERDUE';

export interface Invoice {
  id: string;
  invoiceNumber: string; // e.g. INV-2026-0001
  contractId: string;
  tenantId: string;
  propertyId: string;
  unitId: string;
  dueDate: string; // YYYY-MM-DD
  periodStart: string;
  periodEnd: string;
  amount: number;
  paidAmount: number;
  balance: number;
  status: InvoiceStatus;
  journalEntryId?: string;
  createdAt: string;
}

export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'POS';
export type PaymentStatus = 'POSTED' | 'REVERSED';
export type PaymentPurpose = 'RENT_INVOICE' | 'ADVANCE_RENT' | 'SECURITY_DEPOSIT';

export interface PaymentAllocation {
  invoiceId: string;
  amount: number;
}

export interface Payment {
  id: string;
  receiptNumber: string; // e.g. REC-2026-0001
  contractId?: string;
  tenantId: string;
  propertyId?: string;
  unitId?: string;
  purpose: PaymentPurpose;
  amount: number;
  paymentDate: string; // YYYY-MM-DD
  paymentMethod: PaymentMethod;
  destinationAccountCode: string; // 1110 (Cash) or 1120 (Bank)
  checkNumber?: string;
  bankReference?: string;
  receivedBy: string;
  status: PaymentStatus;
  notes?: string;
  journalEntryId?: string;
  allocations: PaymentAllocation[];
  idempotencyKey?: string;
  createdAt: string;
  reversedAt?: string;
  reversedBy?: string;
  reversalReason?: string;
  reversalEntryId?: string;
}

export type ExpenseCategory = 
  | 'MAINTENANCE' 
  | 'UTILITIES' 
  | 'CLEANING' 
  | 'SECURITY' 
  | 'MANAGEMENT' 
  | 'INSURANCE' 
  | 'TAXES' 
  | 'OTHER';

export interface PropertyExpense {
  id: string;
  voucherNumber: string; // e.g. EXP-2026-0001
  propertyId: string;
  unitId?: string;
  category: ExpenseCategory;
  expenseAccountCode: string; // e.g. 5100
  paymentAccountCode: string; // e.g. 1110 or 1120
  amount: number;
  paymentMethod: PaymentMethod;
  date: string; // YYYY-MM-DD
  payee: string; // Supplier / Vendor
  description: string;
  status: 'POSTED' | 'REVERSED';
  journalEntryId?: string;
  createdBy: string;
  createdAt: string;
}

export type UserRole = 
  | 'ADMIN'        // مدير عام / مشرف رقابي - رقابة وتدقيق وإدارة مستخدمين
  | 'ACCOUNTANT'   // محاسب مالي - قيود ومصروفات وتقارير
  | 'CASHIER'      // محصل / أمين صندوق - سندات قبض ومستأجرين
  | 'STOREKEEPER'  // محاسب مخازن ومستودعات وعهد
  | 'AUDITOR'      // مدقق حسابات - فحص وسجلات تدقيق وقوائم
  | 'EXECUTIVE';   // إدارة عليا - لوحات مؤشرات وتقارير

export type SystemSection =
  | 'manager_portal'
  | 'dashboard'
  | 'properties'
  | 'contracts'
  | 'invoices'
  | 'payments'
  | 'expenses'
  | 'accounting'
  | 'inventory'
  | 'maintenance'
  | 'settlements'
  | 'analytics'
  | 'reports'
  | 'users'
  | 'audit'
  | 'tests'
  | 'alerts'
  | 'backups'
  | 'fixed_assets';

export interface UserPermissions {
  // الأقسام والنوافذ المصرح بها للموظف بواسطة المدير العام
  allowedSections: SystemSection[];

  // الصلاحيات الإجرائية الممنوحة
  canInput: boolean;                 // صلاحية إدخال حركات جديدة
  canReviewReports: boolean;         // صلاحية مراجعة تقاريره وسجلاته الخاصة
  canPrintDocs: boolean;             // صلاحية طباعة المستندات المصرح له بها

  // الصلاحيات الدقيقة
  canIssueReceipts: boolean;         // إصدار سندات القبض
  canReverseReceipts: boolean;       // عكس وإلغاء السندات
  canRecordExpenses: boolean;        // تسجيل سندات الصرف
  canCreateJournalEntries: boolean;  // تسجيل قيود اليومية اليدوية
  canManageContracts: boolean;       // إدارة وتوثيق العقود والفواتير
  canManageProperties: boolean;      // إدارة العقارات والوحدات
  canManageInventory: boolean;       // إدارة المخازن والمستودعات والعهد
  canClosePeriods: boolean;          // إقفال وفتح الفترات المالية (للمدير فقط)
  canExportReports: boolean;         // تصدير وطباعة التقارير المالية
  canManageUsers: boolean;           // إدارة المستخدمين والصلاحيات (للمدير فقط)
}

export interface AssetMaintenanceLog {
  id: string;
  date: string;
  title: string;
  type: 'PREVENTIVE' | 'CORRECTIVE' | 'INSPECTION' | 'PARTS_REPLACEMENT';
  performedBy: string;
  cost: number;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'SCHEDULED';
  notes: string;
  workOrderNumber?: string;
  partsUsed?: string;
}

// ──────────────────────────────────────────────
// الأصول الثابتة (مباني، أراضي، مولدات، معدات، أثاث، مركبات)
// ──────────────────────────────────────────────
export type FixedAssetType =
  | 'BUILDING'
  | 'LAND'
  | 'GENERATOR'
  | 'EQUIPMENT'
  | 'FURNITURE'
  | 'VEHICLE'
  | 'OTHER';

export type DepreciationMethod = 'STRAIGHT_LINE' | 'NONE';

export interface FixedAsset {
  id: string;
  assetCode: string;              // FA-0001
  name: string;
  assetType: FixedAssetType;
  propertyId?: string;            // ربط اختياري بعقار مسجل في النظام
  purchaseDate: string;           // YYYY-MM-DD
  cost: number;                   // تكلفة الاقتناء
  salvageValue: number;           // القيمة التخريدية
  usefulLifeMonths: number;       // العمر الإنتاجي بالأشهر (0 للأرض)
  depreciationMethod: DepreciationMethod;
  assetAccountCode: string;       // حساب الأصل في الشجرة
  fundingAccountCode: string;     // الحساب الدائن عند الاقتناء (صندوق/بنك/دائنون/رأس مال)
  accumulatedDepreciation: number;
  depreciatedThroughMonth?: string; // آخر شهر أُهلك (YYYY-MM)
  acquisitionJournalId?: string;
  notes?: string;
  createdAt: string;
  createdBy?: string;
}

export interface InventoryItem {
  id: string;
  itemCode: string; // e.g. ITM-201 or AST-HVAC-101
  name: string; // e.g. مكيف سبليت 24 وحدة ماندو
  category: 'MAINTENANCE_PARTS' | 'FIXTURES' | 'TOOLS' | 'SUPPLIES';
  quantityOnHand: number;
  unitPrice: number;
  totalValue: number;
  warehouseLocation: string;
  minimumThreshold: number;
  assignedPropertyId?: string;
  assignedPropertyName?: string;
  assignedUnitId?: string;
  assignedUnitNumber?: string;
  custodianName?: string;
  lastRestockedDate: string;
  serialNumber?: string;
  brand?: string;
  model?: string;
  installationDate?: string;
  warrantyExpiryDate?: string;
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
  conditionStatus?: 'EXCELLENT' | 'GOOD' | 'NEEDS_MAINTENANCE' | 'OUT_OF_SERVICE';
  maintenanceLogs?: AssetMaintenanceLog[];
}

export interface InventoryTransaction {
  id: string;
  documentNumber: string; // e.g. TR-2026-001
  type: 'INBOUND' | 'OUTBOUND' | 'CUSTODY_ASSIGN';
  date: string;
  itemId: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  propertyId?: string;
  propertyName?: string;
  recipientName: string;
  issuedBy: string;
  notes: string;
}

export interface AggregatedDocument {
  id: string;
  batchNumber: string;
  title: string;
  category: 'COLLECTIONS' | 'INVOICES' | 'EXPENSES' | 'JOURNALS' | 'INVENTORY';
  date: string;
  totalAmount: number;
  itemCount: number;
  referenceNotes: string;
  status: 'VERIFIED' | 'PENDING' | 'SETTLED';
  subItems: Array<{
    id: string;
    refNumber: string;
    title: string;
    date: string;
    amount: number;
    partyName: string;
    status: string;
    type: string;
  }>;
}

export interface UserProfile {
  id: string;
  username?: string;
  name: string;
  role: UserRole;
  titleAr: string;
  email: string;
  phone?: string;
  password?: string;
  initialPassword?: string;
  mustChangePasswordOnNextLogin: boolean; // إلزامي تغيير كلمة المرور عند أول دخول
  isActive: boolean;
  permissions: UserPermissions;
  lastLoginAt?: string;
  passwordChangedAt?: string;
  createdAt?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  entity: string;
  entityId: string;
  details: string;
  oldValue?: string;
  newValue?: string;
}

export interface UserSession {
  sessionId: string;
  userId: string;
  username: string;
  userName: string;
  userRole: UserRole;
  titleAr: string;
  loginTime: string;
  lastActiveTime: string;
  currentWindow: string; // النافذة أو الشاشة الحالية المفتوحة
  ipAddress?: string;
  deviceType?: string;   // نوع المتصفح أو الجهاز
  status: 'ONLINE' | 'IDLE' | 'DISCONNECTED';
  totalActionsCount?: number;
}

export interface AdminAlertMessage {
  id: string;
  timestamp: string;
  targetUserId?: string | null; // إذا كان فارغاً يرسل للجميع
  targetUserName?: string;
  senderName: string;
  message: string;
  urgency: 'NORMAL' | 'URGENT' | 'CRITICAL';
}

export type FiscalPeriodType = 'MONTHLY' | 'QUARTERLY' | 'ANNUAL' | 'CUSTOM';

export interface AccountingPeriod {
  id: string;
  name: string; // e.g. "فترة 2026 - الربع الأول"
  fiscalYear: number;
  periodType: FiscalPeriodType;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  isClosed: boolean;
  closedAt?: string;
  closedBy?: string;
  closeReason?: string;
  unlockedAt?: string;
  unlockedBy?: string;
  unlockReason?: string;
  notes?: string;
}

// Financial Statement Line Types
export interface TrialBalanceRow {
  accountCode: string;
  accountNameAr: string;
  type: AccountType;
  openingDebit: number;
  openingCredit: number;
  periodDebit: number;
  periodCredit: number;
  closingDebit: number;
  closingCredit: number;
}

export interface ProfitLossReport {
  periodName: string;
  rentalIncome: number;
  otherIncome: number;
  totalRevenue: number;
  maintenanceExpense: number;
  utilitiesExpense: number;
  managementExpense: number;
  otherExpenses: number;
  depreciationExpense?: number; // مصروف الإهلاك (مشمول ضمن otherExpenses والإجمالي)
  totalExpenses: number;
  netOperatingIncome: number; // Net Profit
}

export interface BalanceSheetReport {
  asOfDate: string;
  assets: {
    currentAssets: { code: string; name: string; amount: number }[];
    totalCurrentAssets: number;
    fixedAssets: { code: string; name: string; amount: number }[];
    totalFixedAssets: number;
    totalAssets: number;
  };
  liabilities: {
    currentLiabilities: { code: string; name: string; amount: number }[];
    totalCurrentLiabilities: number;
    totalLiabilities: number;
  };
  equity: {
    items: { code: string; name: string; amount: number }[];
    currentPeriodProfit: number;
    totalEquity: number;
  };
  isBalanced: boolean;
  difference: number;
}

export interface AgingBucket {
  current: number;    // 0 - 30 days
  days31to60: number; // 31 - 60 days
  days61to90: number; // 61 - 90 days
  over90: number;     // 91+ days
  total: number;
}

export interface TenantAgingItem {
  tenantId: string;
  tenantName: string;
  phone: string;
  unitNumber: string;
  propertyName: string;
  aging: AgingBucket;
}

// ==========================================
// Database Backup & Disaster Recovery Types
// ==========================================
export type BackupTrigger = 
  | 'AUTOMATIC_SCHEDULED' // نسخ احتياطي دوري مجدول تلقائياً
  | 'MANUAL_USER'          // نسخ احتياطي يدوي فوري
  | 'PRE_RESTORE_SAFETY'   // نسخة أمان تلقائية قبل استعادة أي نسخة
  | 'CRITICAL_OPERATION';  // نسخ احتياطي تلقائي قبل عملية حرجة (إغلاق فترة أو إعادة ضبط)

export interface BackupStatsSummary {
  propertiesCount: number;
  unitsCount: number;
  tenantsCount: number;
  contractsCount: number;
  invoicesCount: number;
  paymentsCount: number;
  expensesCount: number;
  journalEntriesCount: number;
  inventoryItemsCount: number;
  auditLogsCount: number;
  totalCollections: number;
  totalInvoiced: number;
}

export interface DatabaseBackupRecord {
  id: string;
  filename: string;
  createdAt: string;
  sizeBytes: number;
  trigger: BackupTrigger;
  actorName: string;
  notes?: string;
  stats: BackupStatsSummary;
  checksum?: string;
}

export interface BackupSettings {
  autoBackupEnabled: boolean;
  intervalMinutes: number; // e.g. 15, 30, 60, 360, 1440
  maxRetentionCount: number; // default: 30
  autoBackupOnPeriodClose: boolean;
  autoBackupOnReset: boolean;
  lastBackupTime?: string;
  nextScheduledBackup?: string;
}

// ==========================================
// Smart Alerts & Intelligence Dashboard Types
// ==========================================
export type SmartAlertSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'INFO' | 'OPPORTUNITY';

export type SmartAlertCategory = 
  | 'CONTRACTS'    // عقود منتهية أو قاربت على الانتهاء
  | 'COLLECTIONS'  // فواتير متأخرة، شيكات، متأخرات مستأجرين
  | 'FINANCIAL'    // سيولة منخفضة، مصروفات غير معتادة، ميزان المراجعة
  | 'PROPERTIES'   // شغور طويل الأمد، هدر إيجاري، صيانة ملحة
  | 'SECURITY'     // حركات غير مصرح بها، فشل دخول، جلسات غير نشطة
  | 'BACKUP';      // حالة النسخ الاحتياطي وسلامة البيانات

export interface SmartAlertItem {
  id: string;
  category: SmartAlertCategory;
  severity: SmartAlertSeverity;
  title: string;
  description: string;
  metric?: string; // e.g. "45,000 ر.س" or "7 أيام"
  entityType?: 'CONTRACT' | 'INVOICE' | 'TENANT' | 'PROPERTY' | 'ACCOUNT' | 'BACKUP' | 'SYSTEM';
  entityId?: string;
  entityName?: string;
  actionLabel?: string; // e.g. "إرسال إشعار للمستأجر" or "تجديد العقد" or "أخذ نسخة احتياطية الآن"
  actionType?: 'RENEW_CONTRACT' | 'REMIND_TENANT' | 'COLLECT_INVOICE' | 'INSPECT_UNIT' | 'RUN_BACKUP' | 'VIEW_JOURNAL' | 'VIEW_REPORT' | 'VIEW_DOCUMENT_DETAILS';
  timestamp: string;
  isDismissed?: boolean;
  dismissedAt?: string;
  resolvedAt?: string;
}

// ==========================================
// Maintenance & Work Orders Types
// ==========================================
export type WorkOrderCategory =
  | 'PLUMBING'     // سباكة وصحي
  | 'ELECTRICAL'   // كهرباء وإنارة
  | 'HVAC'         // تكييف وتهوية
  | 'ELEVATOR'     // مصاعد
  | 'PAINTING'     // دهان وتشطيبات
  | 'CARPENTRY'    // نجارة وأبواب
  | 'CLEANING'     // نظافة عامة
  | 'GENERAL';     // صيانة عامة وترميم

export type WorkOrderPriority = 'EMERGENCY' | 'HIGH' | 'NORMAL' | 'LOW';

export type WorkOrderStatus =
  | 'NEW'            // بلاغ جديد
  | 'APPROVED'       // معتمد من الإدارة
  | 'IN_PROGRESS'    // قيد التنفيذ
  | 'WAITING_PARTS'  // بانتظار قطع المستودع
  | 'COMPLETED'      // مكتمل وتم الفحص
  | 'CANCELLED';     // ملغي

export interface WorkOrderItemUsed {
  itemId: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface MaintenanceWorkOrder {
  id: string;
  orderNumber: string;       // e.g. WO-2026-0001
  propertyId: string;
  unitId?: string;
  tenantId?: string;
  category: WorkOrderCategory;
  priority: WorkOrderPriority;
  title: string;
  description: string;
  assignedTo: string;         // الفني أو المقاول
  technicianPhone?: string;
  status: WorkOrderStatus;
  laborCost: number;          // تكلفة العمالة
  materialsCost: number;      // تكلفة المواد المنصرفة من المستودع
  totalCost: number;          // الإجمالي
  paidBy: 'LANDLORD' | 'TENANT'; // على حساب المالك أو المستأجر
  itemsUsed: WorkOrderItemUsed[];
  expenseId?: string;         // سند الصرف المرتبط إن وجد
  journalEntryId?: string;    // القيد المحاسبي المرتبط
  reportedDate: string;
  scheduledDate?: string;
  completedDate?: string;
  notes?: string;
}

// ==========================================
// Move-Out Settlements & Security Clearance Types
// ==========================================
export type SettlementStatus = 'DRAFT' | 'APPROVED' | 'PAID' | 'CLOSED';

export interface MoveOutSettlement {
  id: string;
  settlementNumber: string;   // e.g. SET-2026-0001
  contractId: string;
  tenantId: string;
  propertyId: string;
  unitId: string;
  moveOutDate: string;
  securityDepositHeld: number;      // مبلغ التأمين المستلم في العقد
  unpaidRentDeduction: number;      // خصم إيجارات متأخرة
  maintenanceDeduction: number;     // خصم إصلاح أضرار
  utilitiesDeduction: number;       // خصم فواتير كهرباء/ماء
  otherDeductions: number;          // خصومات أخرى
  totalDeductions: number;          // إجمالي الخصومات
  netSettlementAmount: number;      // الصافي (تأمين - خصومات)
  settlementType: 'REFUND_TO_TENANT' | 'DUE_FROM_TENANT' | 'ZERO_BALANCE';
  status: SettlementStatus;
  keyHandoverCompleted: boolean;    // استلام المفاتيح
  unitHandoverStatus: 'EXCELLENT' | 'GOOD' | 'NEEDS_MAINTENANCE' | 'DAMAGED';
  inspectionNotes?: string;
  settledBy: string;
  createdAt: string;
  closedAt?: string;
}

// ==========================================
// System Environment & Data Reset Types
// ==========================================
export type SystemEnvironmentMode = 'PRODUCTION' | 'DEMO';

export type SystemClearDataMode = 
  | 'TRANSACTIONS_ONLY' // تصفير العمليات التشغيلية والمحاسبية لبدء العمل الفعلي مع الحفاظ على العقارات ودليل الحسابات
  | 'FULL_WIPE'         // مسح كامل لقاعدة البيانات وإعادة ضبط المصنع من الصفر (حساب المدير ودليل الحسابات فقط)
  | 'SEED_DEMO'         // تنشيط وتحميل حزمة البيانات التجريبية النموذجية
  | 'TOGGLE_MODE';      // التبديل بين البيئة التجريبية والبيئة الحقيقية



