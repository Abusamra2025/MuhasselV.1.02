// تصميم م. أبو أحمد — مصمم ومنفذ Claude — © الحقوق محفوظة
/**
 * Initial Seed Data for Mouhassil System
 * Provides standard Saudi/Arab Chart of Accounts, realistic properties,
 * units, tenants, contracts, invoices, and balanced journal entries.
 */

import {
  Account,
  Property,
  Unit,
  Tenant,
  Contract,
  Invoice,
  Payment,
  PropertyExpense,
  JournalEntry,
  UserProfile,
  AccountingPeriod,
  InventoryItem,
  InventoryTransaction,
  AggregatedDocument,
  MaintenanceWorkOrder,
  MoveOutSettlement
} from '../types';

export const INITIAL_USERS: UserProfile[] = [
  {
    id: 'usr_admin',
    username: 'admin',
    name: 'المدير العام',
    role: 'ADMIN',
    titleAr: 'المدير العام (إشراف ورقابة شاملة وتخصيص الصلاحيات)',
    email: 'ebow2012@gmail.com',
    mustChangePasswordOnNextLogin: false,
    isActive: true,
    permissions: {
      allowedSections: [
        'manager_portal',
        'dashboard',
        'properties',
        'contracts',
        'invoices',
        'payments',
        'expenses',
        'accounting',
        'inventory',
        'reports',
        'users',
        'audit',
        'tests'
      ],
      canInput: false,                // دور المدير رقابي فقط لا يدخل حركات محاسبية
      canReviewReports: true,         // حق المراجعة والاطلاع على كل شيء
      canPrintDocs: true,             // حق طباعة ومعاينة كافة التقارير والمستندات
      canIssueReceipts: false,        // المدير رقابي فقط - لا يصدر حركات
      canReverseReceipts: false,
      canRecordExpenses: false,       // لا يسجل مصروفات
      canCreateJournalEntries: false, // لا يصدر قيود
      canManageContracts: false,
      canManageProperties: false,
      canManageInventory: false,
      canClosePeriods: true,          // صلاحية إقفال وفتح الفترات
      canExportReports: true,         // استعراض وتصدير التقارير للرقابة
      canManageUsers: true            // منح الصلاحيات وفتح الأقسام وتعيين كلمات المرور للموظفين
    }
  }
];

export const INITIAL_CHART_OF_ACCOUNTS: Account[] = [
  // 1000 - الأصول (ASSETS)
  {
    code: '1000',
    nameAr: 'الأصول',
    nameEn: 'Assets',
    type: 'ASSET',
    normalBalance: 'DEBIT',
    isActive: true,
    systemAccount: true
  },
  {
    code: '1100',
    nameAr: 'الأصول المتداولة',
    nameEn: 'Current Assets',
    type: 'ASSET',
    normalBalance: 'DEBIT',
    parentCode: '1000',
    isActive: true,
    systemAccount: true
  },
  {
    code: '1110',
    nameAr: 'الصندوق والخزينة النقدية',
    nameEn: 'Cash on Hand',
    type: 'ASSET',
    normalBalance: 'DEBIT',
    parentCode: '1100',
    description: 'النقدية المتوفرة لدى المحصلين وأمين الصندوق',
    isActive: true,
    systemAccount: true
  },
  {
    code: '1120',
    nameAr: 'البنك - الحساب الجاري التشغيلي',
    nameEn: 'Bank Operating Account',
    type: 'ASSET',
    normalBalance: 'DEBIT',
    parentCode: '1100',
    description: 'الحساب البنكي الرئيسي للتحصيلات والتحويلات',
    isActive: true,
    systemAccount: true
  },
  {
    code: '1130',
    nameAr: 'مدينو الإيجارات (ذمم المستأجرين)',
    nameEn: 'Tenant Accounts Receivable',
    type: 'ASSET',
    normalBalance: 'DEBIT',
    parentCode: '1100',
    description: 'حساب مراقبة المستحقات والديون على المستأجرين',
    isActive: true,
    systemAccount: true
  },
  {
    code: '1140',
    nameAr: 'تأمينات وودائع لدى الغير',
    nameEn: 'Deposits with Others',
    type: 'ASSET',
    normalBalance: 'DEBIT',
    parentCode: '1100',
    isActive: true
  },
  {
    code: '1200',
    nameAr: 'الأصول الثابتة',
    nameEn: 'Fixed Assets',
    type: 'ASSET',
    normalBalance: 'DEBIT',
    parentCode: '1000',
    isActive: true
  },
  {
    code: '1210',
    nameAr: 'العقارات والمباني الاستثمارية',
    nameEn: 'Investment Properties & Buildings',
    type: 'ASSET',
    normalBalance: 'DEBIT',
    parentCode: '1200',
    isActive: true
  },
  {
    code: '1220',
    nameAr: 'الأراضي',
    nameEn: 'Land',
    type: 'ASSET',
    normalBalance: 'DEBIT',
    parentCode: '1200',
    isActive: true
  },
  {
    code: '1230',
    nameAr: 'الآلات والمعدات والمولدات',
    nameEn: 'Machinery, Equipment & Generators',
    type: 'ASSET',
    normalBalance: 'DEBIT',
    parentCode: '1200',
    isActive: true
  },
  {
    code: '1240',
    nameAr: 'الأثاث والتجهيزات',
    nameEn: 'Furniture & Fixtures',
    type: 'ASSET',
    normalBalance: 'DEBIT',
    parentCode: '1200',
    isActive: true
  },
  {
    code: '1250',
    nameAr: 'المركبات',
    nameEn: 'Vehicles',
    type: 'ASSET',
    normalBalance: 'DEBIT',
    parentCode: '1200',
    isActive: true
  },
  {
    code: '1260',
    nameAr: 'أصول ثابتة أخرى',
    nameEn: 'Other Fixed Assets',
    type: 'ASSET',
    normalBalance: 'DEBIT',
    parentCode: '1200',
    isActive: true
  },
  {
    code: '1290',
    nameAr: 'مجمع إهلاك الأصول الثابتة',
    nameEn: 'Accumulated Depreciation',
    type: 'ASSET',
    normalBalance: 'CREDIT',
    parentCode: '1200',
    description: 'حساب مقابل (Contra-Asset) يُطرح من الأصول الثابتة',
    isActive: true
  },

  // 2000 - الالتزامات (LIABILITIES)
  {
    code: '2000',
    nameAr: 'الالتزامات والخصوم',
    nameEn: 'Liabilities',
    type: 'LIABILITY',
    normalBalance: 'CREDIT',
    isActive: true,
    systemAccount: true
  },
  {
    code: '2100',
    nameAr: 'الالتزامات المتداولة',
    nameEn: 'Current Liabilities',
    type: 'LIABILITY',
    normalBalance: 'CREDIT',
    parentCode: '2000',
    isActive: true,
    systemAccount: true
  },
  {
    code: '2110',
    nameAr: 'تأمينات المستأجرين المستردة',
    nameEn: 'Tenant Security Deposits Payable',
    type: 'LIABILITY',
    normalBalance: 'CREDIT',
    parentCode: '2100',
    description: 'مبالغ الضمان والتأمين المحصلة - التزام يعاد عند الإخلاء وليس إيراداً',
    isActive: true,
    systemAccount: true
  },
  {
    code: '2120',
    nameAr: 'إيرادات إيجار مقبوضة مقدماً (غير مكتسبة)',
    nameEn: 'Unearned / Advance Rental Income',
    type: 'LIABILITY',
    normalBalance: 'CREDIT',
    parentCode: '2100',
    description: 'دفعات نقدية مستلمة قبل استحقاق الفاتورة الفعلية',
    isActive: true,
    systemAccount: true
  },
  {
    code: '2130',
    nameAr: 'دائنو النشاط وذمم الموردين',
    nameEn: 'Accounts Payable',
    type: 'LIABILITY',
    normalBalance: 'CREDIT',
    parentCode: '2100',
    isActive: true
  },
  {
    code: '2140',
    nameAr: 'أمانات الضرائب وضريبة القيمة المضافة',
    nameEn: 'VAT / Tax Payable',
    type: 'LIABILITY',
    normalBalance: 'CREDIT',
    parentCode: '2100',
    isActive: true
  },

  // 3000 - حقوق الملكية (EQUITY)
  {
    code: '3000',
    nameAr: 'حقوق الملكية',
    nameEn: 'Equity',
    type: 'EQUITY',
    normalBalance: 'CREDIT',
    isActive: true,
    systemAccount: true
  },
  {
    code: '3100',
    nameAr: 'رأس مال الملاك والمستثمرين',
    nameEn: "Owner's Capital",
    type: 'EQUITY',
    normalBalance: 'CREDIT',
    parentCode: '3000',
    isActive: true,
    systemAccount: true
  },
  {
    code: '3200',
    nameAr: 'الأرباح المدورة والمرحلة',
    nameEn: 'Retained Earnings',
    type: 'EQUITY',
    normalBalance: 'CREDIT',
    parentCode: '3000',
    isActive: true,
    systemAccount: true
  },
  {
    code: '3300',
    nameAr: 'أرباح / (خسائر) الفترة الحالية',
    nameEn: 'Current Period Profit / Loss',
    type: 'EQUITY',
    normalBalance: 'CREDIT',
    parentCode: '3000',
    isActive: true,
    systemAccount: true
  },

  // 4000 - الإيرادات (REVENUE)
  {
    code: '4000',
    nameAr: 'الإيرادات',
    nameEn: 'Revenue',
    type: 'REVENUE',
    normalBalance: 'CREDIT',
    isActive: true,
    systemAccount: true
  },
  {
    code: '4100',
    nameAr: 'إيرادات تأجير العقارات',
    nameEn: 'Rental Income',
    type: 'REVENUE',
    normalBalance: 'CREDIT',
    parentCode: '4000',
    description: 'الإيراد المحقق من عقود الإيجار المفوترة',
    isActive: true,
    systemAccount: true
  },
  {
    code: '4200',
    nameAr: 'إيرادات خدمات ومرافق وصيانة',
    nameEn: 'Facility & Service Income',
    type: 'REVENUE',
    normalBalance: 'CREDIT',
    parentCode: '4000',
    isActive: true
  },
  {
    code: '4300',
    nameAr: 'غرامات تأخير ورسوم إدارية',
    nameEn: 'Late Fees & Admin Charges',
    type: 'REVENUE',
    normalBalance: 'CREDIT',
    parentCode: '4000',
    isActive: true
  },

  // 5000 - المصروفات (EXPENSES)
  {
    code: '5000',
    nameAr: 'المصروفات التشغيلية والعمومية',
    nameEn: 'Operating & General Expenses',
    type: 'EXPENSE',
    normalBalance: 'DEBIT',
    isActive: true,
    systemAccount: true
  },
  {
    code: '5100',
    nameAr: 'مصاريف الصيانة والترميم',
    nameEn: 'Repairs & Maintenance',
    type: 'EXPENSE',
    normalBalance: 'DEBIT',
    parentCode: '5000',
    description: 'صيانة السباكة، الكهرباء، التكييف، والمصاعد',
    isActive: true,
    systemAccount: true
  },
  {
    code: '5200',
    nameAr: 'فواتير الخدمات والكهرباء والمياه',
    nameEn: 'Utilities (Electricity & Water)',
    type: 'EXPENSE',
    normalBalance: 'DEBIT',
    parentCode: '5000',
    description: 'استهلاك الخدمات للمرافق المشتركة والعدادات العامة',
    isActive: true
  },
  {
    code: '5300',
    nameAr: 'مصاريف النظافة والأمن والحراسة',
    nameEn: 'Cleaning & Security',
    type: 'EXPENSE',
    normalBalance: 'DEBIT',
    parentCode: '5000',
    isActive: true
  },
  {
    code: '5400',
    nameAr: 'أتعاب إدارة الأملاك والتحصيل',
    nameEn: 'Property Management Fees',
    type: 'EXPENSE',
    normalBalance: 'DEBIT',
    parentCode: '5000',
    isActive: true
  },
  {
    code: '5500',
    nameAr: 'التأمين العقاري والتراخيص الحكومية',
    nameEn: 'Insurance & Permits',
    type: 'EXPENSE',
    normalBalance: 'DEBIT',
    parentCode: '5000',
    isActive: true
  },
  {
    code: '5600',
    nameAr: 'مصاريف إدارية وعمومية متفرقة',
    nameEn: 'General & Admin Expenses',
    type: 'EXPENSE',
    normalBalance: 'DEBIT',
    parentCode: '5000',
    isActive: true
  },
  {
    code: '5700',
    nameAr: 'مصروف إهلاك الأصول الثابتة',
    nameEn: 'Depreciation Expense',
    type: 'EXPENSE',
    normalBalance: 'DEBIT',
    parentCode: '5000',
    isActive: true
  }
];

export const INITIAL_PROPERTIES: Property[] = [];
export const INITIAL_UNITS: Unit[] = [];
export const INITIAL_TENANTS: Tenant[] = [];
export const INITIAL_CONTRACTS: Contract[] = [];
export const INITIAL_INVOICES: Invoice[] = [];
export const INITIAL_PAYMENTS: Payment[] = [];
export const INITIAL_EXPENSES: PropertyExpense[] = [];
export const INITIAL_JOURNAL_ENTRIES: JournalEntry[] = [];
export const INITIAL_ACCOUNTING_PERIODS: AccountingPeriod[] = [];
export const INITIAL_INVENTORY_ITEMS: InventoryItem[] = [
  {
    id: 'itm_hvac_101',
    itemCode: 'AST-HVAC-101',
    name: 'وحدة تكييف سبليت 24 وحدة - ماندو بلس إنفرتر',
    category: 'FIXTURES',
    quantityOnHand: 4,
    unitPrice: 2850,
    totalValue: 11400,
    warehouseLocation: 'مستودع أ - رف 12',
    minimumThreshold: 2,
    assignedPropertyId: 'prop_al_yasmin',
    assignedPropertyName: 'برج الياسمين السكني',
    assignedUnitNumber: 'شقة 302',
    custodianName: 'م. سالم القحطاني (فني التكييف)',
    lastRestockedDate: '2026-09-15',
    serialNumber: 'MND-24INV-88912',
    brand: 'Mando Plus',
    model: 'MP-24-INV-2025',
    installationDate: '2025-06-10',
    warrantyExpiryDate: '2028-06-10',
    lastMaintenanceDate: '2026-10-12',
    nextMaintenanceDate: '2026-12-12',
    conditionStatus: 'EXCELLENT',
    maintenanceLogs: [
      {
        id: 'mnt_log_001',
        date: '2026-10-12',
        title: 'صيانة دورية واستبدال فلتر الهواء وشحن غاز الفريون R410A',
        type: 'PREVENTIVE',
        performedBy: 'مؤسسة إتقان التكييف للصيانة',
        cost: 220,
        status: 'COMPLETED',
        notes: 'تم فحص ضغط الكمبروسور وتنظيف المبخر والوحدة الخارجية بالكامل، الكفاءة ممتازة 100%.',
        workOrderNumber: 'WO-2026-104',
        partsUsed: 'فلتر هواء أصلي + غاز R410A (1.2 كجم)'
      },
      {
        id: 'mnt_log_002',
        date: '2026-06-05',
        title: 'فحص فصلي قبل دخول موسم الصيف واختبار الترموستات الرقمي',
        type: 'INSPECTION',
        performedBy: 'م. سالم القحطاني',
        cost: 80,
        status: 'COMPLETED',
        notes: 'جميع الأسلاك الكهربائية ولوحة التحكم بحالة جيدة جداً.',
        workOrderNumber: 'WO-2026-048'
      }
    ]
  },
  {
    id: 'itm_pump_204',
    itemCode: 'AST-PUMP-204',
    name: 'مضخة مياه مركزية غاطسة 5.5 حصان - جراندفوس إيطالي',
    category: 'FIXTURES',
    quantityOnHand: 2,
    unitPrice: 4600,
    totalValue: 9200,
    warehouseLocation: 'غرفة المضخات المركزية - قبو 1',
    minimumThreshold: 1,
    assignedPropertyId: 'prop_al_rehab',
    assignedPropertyName: 'عمارة الرحاب التجارية',
    assignedUnitNumber: 'الخزان الأرضي الرئيسي',
    custodianName: 'فني السباكة إبراهيم المنصور',
    lastRestockedDate: '2026-08-20',
    serialNumber: 'GRD-55HP-44109',
    brand: 'Grundfos',
    model: 'CR-15-5-A',
    installationDate: '2024-11-15',
    warrantyExpiryDate: '2027-11-15',
    lastMaintenanceDate: '2026-10-01',
    nextMaintenanceDate: '2026-11-01',
    conditionStatus: 'GOOD',
    maintenanceLogs: [
      {
        id: 'mnt_log_003',
        date: '2026-10-01',
        title: 'تبديل ربلات موانع التسريب الميكانيكية وتشحيم كراسي المحور',
        type: 'CORRECTIVE',
        performedBy: 'ورشة التقنية الهيدروليكية',
        cost: 450,
        status: 'COMPLETED',
        notes: 'تم حل مشكلة الاهتزاز الطفيف واستعادة ضغط الشبكة إلى 4.5 بار بصورة طبيعية.',
        workOrderNumber: 'WO-2026-092',
        partsUsed: 'Mechanical Seal Set + بلي محاور SKF'
      }
    ]
  },
  {
    id: 'itm_elev_03',
    itemCode: 'AST-ELEV-03',
    name: 'لوحة التحكم والمحرك الرئيسي للمصعد - ميتسوبيشي VVVF',
    category: 'FIXTURES',
    quantityOnHand: 1,
    unitPrice: 18500,
    totalValue: 18500,
    warehouseLocation: 'غرفة محركات المصاعد - السطح',
    minimumThreshold: 1,
    assignedPropertyId: 'prop_al_yasmin',
    assignedPropertyName: 'برج الياسمين السكني',
    assignedUnitNumber: 'مصعد رقم 1 (الرئيسي)',
    custodianName: 'شركة مصاعد الخليج المعتمدة',
    lastRestockedDate: '2026-05-10',
    serialNumber: 'MIT-VVVF-99214-K',
    brand: 'Mitsubishi Electric',
    model: 'NEXIEZ-MRL',
    installationDate: '2023-01-20',
    warrantyExpiryDate: '2028-01-20',
    lastMaintenanceDate: '2026-10-20',
    nextMaintenanceDate: '2026-11-20',
    conditionStatus: 'EXCELLENT',
    maintenanceLogs: [
      {
        id: 'mnt_log_004',
        date: '2026-10-20',
        title: 'الفحص الشهري الإلزامي واختبار جهاز الباراشوت وحساسات الأبواب',
        type: 'PREVENTIVE',
        performedBy: 'فريق صيانة مصاعد الخليج',
        cost: 600,
        status: 'COMPLETED',
        notes: 'تم فحص حبال الجر، تنظيف مجاري الأبواب، واختبار الطوارئ والبطاريات الاحتياطية بنجاح.',
        workOrderNumber: 'WO-2026-118'
      }
    ]
  },
  {
    id: 'itm_fire_system',
    itemCode: 'AST-FIRE-10',
    name: 'محبس تدفق شبكة الإطفاء ومضخة جوكي 3 حصان مع لوحة الإنذار',
    category: 'FIXTURES',
    quantityOnHand: 2,
    unitPrice: 5200,
    totalValue: 10400,
    warehouseLocation: 'غرفة السلامة ومكافحة الحريق',
    minimumThreshold: 1,
    assignedPropertyId: 'prop_al_rehab',
    assignedPropertyName: 'عمارة الرحاب التجارية',
    assignedUnitNumber: 'الشبكة العامة',
    custodianName: 'فريق الدفاع المدني والسلامة',
    lastRestockedDate: '2026-07-01',
    serialNumber: 'FIR-JCK-7712',
    brand: 'Bristol Fire',
    model: 'BF-300-J',
    installationDate: '2024-03-10',
    warrantyExpiryDate: '2027-03-10',
    lastMaintenanceDate: '2026-09-28',
    nextMaintenanceDate: '2026-12-28',
    conditionStatus: 'EXCELLENT',
    maintenanceLogs: [
      {
        id: 'mnt_log_005',
        date: '2026-09-28',
        title: 'اختبار ضغط شبكة الرشاشات الآلية والتحقق من لوحة كواشف الدخان',
        type: 'INSPECTION',
        performedBy: 'مؤسسة درع الأمان للحريق',
        cost: 350,
        status: 'COMPLETED',
        notes: 'الشبكة تعمل بكفاءة تامة ومعايرة الحساسات مطابقة للمواصفات القياسية.',
        workOrderNumber: 'WO-2026-088'
      }
    ]
  },
  {
    id: 'itm_gas_filter',
    itemCode: 'PARTS-FLT-24',
    name: 'فلاتر هواء تكييف أصلية مقاومة للبكتيريا (طقم 10 قطع)',
    category: 'MAINTENANCE_PARTS',
    quantityOnHand: 25,
    unitPrice: 45,
    totalValue: 1125,
    warehouseLocation: 'مستودع ب - رف 4',
    minimumThreshold: 10,
    custodianName: 'أمين المستودع فهد السبيعي',
    lastRestockedDate: '2026-10-05'
  },
  {
    id: 'itm_tool_drill',
    itemCode: 'TOOL-HILTI-TE30',
    name: 'مثقاب تكسير وخرسانة هيلتي احترافي Hilti TE 30-AVR',
    category: 'TOOLS',
    quantityOnHand: 3,
    unitPrice: 3200,
    totalValue: 9600,
    warehouseLocation: 'غرفة العدد الفنية والعهد',
    minimumThreshold: 1,
    custodianName: 'فني الكهرباء ماجد الحربي',
    lastRestockedDate: '2026-03-12',
    serialNumber: 'HLT-TE30-55910',
    brand: 'Hilti',
    conditionStatus: 'EXCELLENT',
    maintenanceLogs: [
      {
        id: 'mnt_log_006',
        date: '2026-08-14',
        title: 'استبدال الفحمات الكربونية وتزييت صندوق التروس الهيدروليكي',
        type: 'CORRECTIVE',
        performedBy: 'وكيل هيلتي المعتمد',
        cost: 160,
        status: 'COMPLETED',
        notes: 'الأداء ممتاز والاهتزاز ضمن المعدلات الطبيعية.',
        workOrderNumber: 'WO-2026-071'
      }
    ]
  }
];

export const INITIAL_INVENTORY_TRANSACTIONS: InventoryTransaction[] = [
  {
    id: 'tr_2026_001',
    documentNumber: 'TR-2026-001',
    type: 'OUTBOUND',
    date: '2026-10-12',
    itemId: 'itm_hvac_101',
    itemName: 'وحدة تكييف سبليت 24 وحدة - ماندو بلس إنفرتر',
    quantity: 1,
    unitPrice: 2850,
    totalAmount: 2850,
    propertyId: 'prop_al_yasmin',
    propertyName: 'برج الياسمين السكني',
    recipientName: 'م. سالم القحطاني (فني التكييف)',
    issuedBy: 'أمين المستودع فهد السبيعي',
    notes: 'صرف لغرض الصيانة واستبدال وحدة تالفة بشقة 302 بعد اعتماد طلب الصيانة'
  },
  {
    id: 'tr_2026_002',
    documentNumber: 'TR-2026-002',
    type: 'CUSTODY_ASSIGN',
    date: '2026-08-14',
    itemId: 'itm_tool_drill',
    itemName: 'مثقاب تكسير وخرسانة هيلتي احترافي Hilti TE 30-AVR',
    quantity: 1,
    unitPrice: 3200,
    totalAmount: 3200,
    recipientName: 'فني الكهرباء ماجد الحربي',
    issuedBy: 'أمين المستودع فهد السبيعي',
    notes: 'تسليم عهدة دائمة لأعمال صيانة التمديدات الكهربائية بموجب سند استلام رسمي'
  },
  {
    id: 'tr_2026_003',
    documentNumber: 'TR-2026-003',
    type: 'INBOUND',
    date: '2026-10-05',
    itemId: 'itm_gas_filter',
    itemName: 'فلاتر هواء تكييف أصلية مقاومة للبكتيريا (طقم 10 قطع)',
    quantity: 30,
    unitPrice: 45,
    totalAmount: 1350,
    recipientName: 'المستودع المركزي',
    issuedBy: 'أمين المستودع فهد السبيعي',
    notes: 'توريد دفعة مخزنية جديدة من شركة التوريدات الهندسية'
  }
];
export const INITIAL_AGGREGATED_DOCUMENTS: AggregatedDocument[] = [];
export const INITIAL_WORK_ORDERS: MaintenanceWorkOrder[] = [];
export const INITIAL_SETTLEMENTS: MoveOutSettlement[] = [];

