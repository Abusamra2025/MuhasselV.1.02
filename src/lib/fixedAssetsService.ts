/**
 * تصميم م. أبو أحمد — مصمم ومنفذ Claude — © الحقوق محفوظة
 *
 * fixedAssetsService — منطق الأصول الثابتة (مباني، أراضي، مولدات، معدات، أثاث، مركبات).
 *
 * دوال نقية يستخدمها العميل والخادم معًا:
 *  - التحقق من المدخلات.
 *  - قيد الاقتناء:  من حـ/ حساب الأصل  إلى حـ/ (صندوق | بنك | دائنون | رأس مال)
 *  - قيد الإهلاك الشهري (القسط الثابت): من حـ/ مصروف الإهلاك (5700) إلى حـ/ مجمع الإهلاك (1290)
 *  - الأرض لا تُهلَك.
 *  - ترحيل شجرة الحسابات القديمة بإضافة الحسابات الناقصة فقط دون المساس بالموجود.
 */

import type {
  Account,
  FixedAsset,
  FixedAssetType,
  JournalEntry,
  JournalLine
} from '../types';
import { ROUND, validateJournalBalance } from './accountingEngine';
import { isValidISODate } from './propertyService';

export const ACCUMULATED_DEPRECIATION_ACCOUNT = '1290';
export const DEPRECIATION_EXPENSE_ACCOUNT = '5700';

export interface FixedAssetTypeMeta {
  label: string;
  accountCode: string;
  depreciable: boolean;
  /** عمر إنتاجي مقترح بالأشهر (قابل للتعديل من المستخدم) */
  defaultLifeMonths: number;
}

export const FIXED_ASSET_TYPE_META: Record<FixedAssetType, FixedAssetTypeMeta> = {
  BUILDING: { label: 'مبنى / عقار', accountCode: '1210', depreciable: true, defaultLifeMonths: 480 },
  LAND: { label: 'أرض', accountCode: '1220', depreciable: false, defaultLifeMonths: 0 },
  GENERATOR: { label: 'مولد كهرباء', accountCode: '1230', depreciable: true, defaultLifeMonths: 120 },
  EQUIPMENT: { label: 'معدات وأجهزة', accountCode: '1230', depreciable: true, defaultLifeMonths: 60 },
  FURNITURE: { label: 'أثاث وتجهيزات', accountCode: '1240', depreciable: true, defaultLifeMonths: 84 },
  VEHICLE: { label: 'مركبة', accountCode: '1250', depreciable: true, defaultLifeMonths: 60 },
  OTHER: { label: 'أصل ثابت آخر', accountCode: '1260', depreciable: true, defaultLifeMonths: 60 }
};

/** حسابات التمويل المسموحة عند الاقتناء */
export const FUNDING_ACCOUNTS: { code: string; label: string }[] = [
  { code: '1110', label: 'نقدًا من الصندوق' },
  { code: '1120', label: 'من الحساب البنكي' },
  { code: '2130', label: 'شراء آجل (دائنون وموردون)' },
  { code: '3100', label: 'أصل مملوك مسبقًا / رأس مال الملاك (رصيد افتتاحي)' }
];

// ──────────────────────────────────────────────
// أدوات التواريخ (YYYY-MM)
// ──────────────────────────────────────────────

export function monthOf(date: string): string {
  return date.slice(0, 7);
}

export function nextMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(Date.UTC(y, m, 1)); // m هو الشهر التالي (0-based)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function lastDayOfMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(Date.UTC(y, m, 0));
  return d.toISOString().slice(0, 10);
}

function isValidMonth(ym: unknown): ym is string {
  return typeof ym === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(ym);
}

// ──────────────────────────────────────────────
// التحقق وبناء الأصل
// ──────────────────────────────────────────────

export interface FixedAssetInput {
  name: string;
  assetType: FixedAssetType;
  propertyId?: string;
  purchaseDate: string;
  cost: number;
  salvageValue?: number;
  usefulLifeMonths?: number;
  fundingAccountCode: string;
  notes?: string;
}

export function validateFixedAssetInput(
  input: FixedAssetInput,
  accounts: Account[]
): { ok: boolean; error?: string } {
  const meta = FIXED_ASSET_TYPE_META[input.assetType];
  if (!meta) return { ok: false, error: 'نوع الأصل غير صحيح' };
  if (!input.name || !input.name.trim()) return { ok: false, error: 'اسم الأصل مطلوب' };
  if (!isValidISODate(input.purchaseDate)) return { ok: false, error: 'تاريخ الاقتناء غير صحيح' };

  const cost = Number(input.cost);
  if (!Number.isFinite(cost) || cost <= 0) return { ok: false, error: 'تكلفة الأصل يجب أن تكون رقمًا أكبر من صفر' };

  const salvage = Number(input.salvageValue ?? 0);
  if (!Number.isFinite(salvage) || salvage < 0 || salvage >= cost) {
    return { ok: false, error: 'القيمة التخريدية يجب أن تكون صفرًا أو أقل من التكلفة' };
  }

  if (meta.depreciable) {
    const life = Number(input.usefulLifeMonths);
    if (!Number.isInteger(life) || life < 1 || life > 1200) {
      return { ok: false, error: 'العمر الإنتاجي بالأشهر يجب أن يكون عددًا صحيحًا بين 1 و1200' };
    }
  }

  if (!FUNDING_ACCOUNTS.some(f => f.code === input.fundingAccountCode)) {
    return { ok: false, error: 'حساب التمويل غير مسموح به' };
  }

  const need = [meta.accountCode, input.fundingAccountCode];
  for (const code of need) {
    if (!accounts.some(a => a.code === code)) {
      return { ok: false, error: `الحساب ${code} غير موجود في شجرة الحسابات` };
    }
  }

  return { ok: true };
}

export function nextAssetCode(existing: FixedAsset[]): string {
  let max = 0;
  for (const a of existing) {
    const n = parseInt(a.assetCode.replace(/\D/g, ''), 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return `FA-${String(max + 1).padStart(4, '0')}`;
}

export function nextJournalNumber(entries: JournalEntry[], date: string): string {
  const year = date.slice(0, 4);
  const used = new Set(entries.map(e => e.entryNumber));
  let n = entries.length + 1;
  let candidate = `JV-${year}-${String(n).padStart(4, '0')}`;
  while (used.has(candidate)) {
    n++;
    candidate = `JV-${year}-${String(n).padStart(4, '0')}`;
  }
  return candidate;
}

function accountName(accounts: Account[], code: string): string {
  return accounts.find(a => a.code === code)?.nameAr || code;
}

/** يبني الأصل وقيد الاقتناء المتوازن */
export function buildAcquisition(params: {
  input: FixedAssetInput;
  accounts: Account[];
  existingAssets: FixedAsset[];
  existingEntries: JournalEntry[];
  createdBy: string;
  id?: string;
  now?: Date;
}): { asset: FixedAsset; entry: JournalEntry } {
  const { input, accounts } = params;
  const now = params.now ?? new Date();
  const meta = FIXED_ASSET_TYPE_META[input.assetType];
  const cost = ROUND(Number(input.cost));
  const salvage = meta.depreciable ? ROUND(Number(input.salvageValue ?? 0)) : 0;
  const id = params.id || `fa_${now.getTime()}`;
  const code = nextAssetCode(params.existingAssets);

  const lines: JournalLine[] = [
    {
      id: `jl_fa_${id}_1`,
      accountCode: meta.accountCode,
      accountName: accountName(accounts, meta.accountCode),
      debit: cost,
      credit: 0,
      description: `اقتناء ${input.name.trim()} (${code})`,
      propertyId: input.propertyId || undefined
    },
    {
      id: `jl_fa_${id}_2`,
      accountCode: input.fundingAccountCode,
      accountName: accountName(accounts, input.fundingAccountCode),
      debit: 0,
      credit: cost,
      description: `تمويل اقتناء ${input.name.trim()} (${code})`
    }
  ];

  const validation = validateJournalBalance(lines);
  const entry: JournalEntry = {
    id: `jv_fa_${id}`,
    entryNumber: nextJournalNumber(params.existingEntries, input.purchaseDate),
    date: input.purchaseDate,
    postingDate: now.toISOString().split('T')[0],
    status: 'POSTED',
    refType: 'FIXED_ASSET',
    refId: id,
    description: `قيد اقتناء أصل ثابت: ${input.name.trim()} (${code})`,
    lines,
    totalDebit: validation.totalDebit,
    totalCredit: validation.totalCredit,
    isBalanced: validation.isBalanced,
    createdBy: params.createdBy,
    createdAt: now.toISOString()
  };

  const asset: FixedAsset = {
    id,
    assetCode: code,
    name: input.name.trim(),
    assetType: input.assetType,
    propertyId: input.propertyId || undefined,
    purchaseDate: input.purchaseDate,
    cost,
    salvageValue: salvage,
    usefulLifeMonths: meta.depreciable ? Number(input.usefulLifeMonths) : 0,
    depreciationMethod: meta.depreciable ? 'STRAIGHT_LINE' : 'NONE',
    assetAccountCode: meta.accountCode,
    fundingAccountCode: input.fundingAccountCode,
    accumulatedDepreciation: 0,
    acquisitionJournalId: entry.id,
    notes: input.notes?.trim() || undefined,
    createdAt: now.toISOString().split('T')[0],
    createdBy: params.createdBy
  };

  return { asset, entry };
}

// ──────────────────────────────────────────────
// الإهلاك
// ──────────────────────────────────────────────

export function bookValue(asset: FixedAsset): number {
  return ROUND(asset.cost - asset.accumulatedDepreciation);
}

/** القسط الشهري الثابت */
export function monthlyDepreciation(asset: FixedAsset): number {
  if (asset.depreciationMethod !== 'STRAIGHT_LINE' || asset.usefulLifeMonths <= 0) return 0;
  return ROUND((asset.cost - asset.salvageValue) / asset.usefulLifeMonths);
}

export interface DepreciationResult {
  assets: FixedAsset[];
  entries: JournalEntry[];
  totalAmount: number;
  monthsPosted: string[];
  /** شهر توقف عنده الترحيل بسبب فترة محاسبية مقفلة */
  blockedMonth?: string;
}

/**
 * يحسب ويولّد قيود الإهلاك المستحقة حتى نهاية الشهر المحدد (YYYY-MM).
 * قيد واحد لكل شهر: مدين مصروف الإهلاك لكل أصل، ودائن مجمع الإهلاك بالإجمالي.
 * لا يُرحَّل الشهر نفسه مرتين (يُتتبَّع بـ depreciatedThroughMonth لكل أصل).
 */
export function generateDepreciation(params: {
  assets: FixedAsset[];
  accounts: Account[];
  existingEntries: JournalEntry[];
  throughMonth: string;
  createdBy: string;
  isDateClosed?: (date: string) => boolean;
  now?: Date;
}): DepreciationResult {
  const now = params.now ?? new Date();
  const through = params.throughMonth;

  const updated = new Map<string, FixedAsset>(params.assets.map(a => [a.id, { ...a }]));
  const entries: JournalEntry[] = [];
  const monthsPosted: string[] = [];
  let totalAmount = 0;
  let blockedMonth: string | undefined;

  if (!isValidMonth(through)) {
    return { assets: params.assets, entries, totalAmount: 0, monthsPosted };
  }

  // أقدم شهر مستحق بين كل الأصول
  let startMonth: string | undefined;
  for (const a of updated.values()) {
    if (a.depreciationMethod !== 'STRAIGHT_LINE') continue;
    const first = a.depreciatedThroughMonth ? nextMonth(a.depreciatedThroughMonth) : monthOf(a.purchaseDate);
    if (!startMonth || first < startMonth) startMonth = first;
  }

  const allEntries = [...params.existingEntries];

  for (let ym = startMonth; ym && ym <= through; ym = nextMonth(ym)) {
    const date = lastDayOfMonth(ym);
    const lines: JournalLine[] = [];
    let monthTotal = 0;
    const touched: FixedAsset[] = [];

    for (const a of updated.values()) {
      if (a.depreciationMethod !== 'STRAIGHT_LINE') continue;
      const first = a.depreciatedThroughMonth ? nextMonth(a.depreciatedThroughMonth) : monthOf(a.purchaseDate);
      if (first > ym) continue; // لم يبدأ إهلاكه بعد
      if (a.depreciatedThroughMonth && a.depreciatedThroughMonth >= ym) continue; // أُهلك مسبقًا

      const base = ROUND(a.cost - a.salvageValue);
      const remaining = ROUND(base - a.accumulatedDepreciation);
      if (remaining <= 0.009) continue;

      const amount = Math.min(monthlyDepreciation(a), remaining);
      if (amount <= 0) continue;

      lines.push({
        id: `jl_dep_${ym}_${a.id}_d`,
        accountCode: DEPRECIATION_EXPENSE_ACCOUNT,
        accountName: accountName(params.accounts, DEPRECIATION_EXPENSE_ACCOUNT),
        debit: amount,
        credit: 0,
        description: `إهلاك ${a.name} (${a.assetCode}) عن ${ym}`,
        propertyId: a.propertyId
      });
      monthTotal = ROUND(monthTotal + amount);
      touched.push(a);
    }

    // نمرّر شهرًا بلا أصول مستحقة (لتقدّم المؤشر) دون قيد
    if (lines.length === 0) {
      continue;
    }

    if (params.isDateClosed && params.isDateClosed(date)) {
      blockedMonth = ym;
      break;
    }

    lines.push({
      id: `jl_dep_${ym}_c`,
      accountCode: ACCUMULATED_DEPRECIATION_ACCOUNT,
      accountName: accountName(params.accounts, ACCUMULATED_DEPRECIATION_ACCOUNT),
      debit: 0,
      credit: monthTotal,
      description: `مجمع إهلاك الأصول الثابتة عن ${ym}`
    });

    const validation = validateJournalBalance(lines);
    const entry: JournalEntry = {
      id: `jv_dep_${ym}_${now.getTime().toString(36)}`,
      entryNumber: nextJournalNumber(allEntries, date),
      date,
      postingDate: now.toISOString().split('T')[0],
      status: 'POSTED',
      refType: 'DEPRECIATION',
      refId: ym,
      description: `قيد إهلاك الأصول الثابتة عن شهر ${ym}`,
      lines,
      totalDebit: validation.totalDebit,
      totalCredit: validation.totalCredit,
      isBalanced: validation.isBalanced,
      createdBy: params.createdBy,
      createdAt: now.toISOString()
    };

    entries.push(entry);
    allEntries.push(entry);
    monthsPosted.push(ym);
    totalAmount = ROUND(totalAmount + monthTotal);

    for (const a of touched) {
      const line = lines.find(l => l.id === `jl_dep_${ym}_${a.id}_d`)!;
      a.accumulatedDepreciation = ROUND(a.accumulatedDepreciation + line.debit);
      a.depreciatedThroughMonth = ym;
    }
  }

  // الأصول التي لم يكن لها شيء مستحق في الأشهر السابقة تبقى كما هي؛ أما التي اكتمل إهلاكها فلا تُلمس
  return {
    assets: params.assets.map(a => updated.get(a.id) ?? a),
    entries,
    totalAmount,
    monthsPosted,
    blockedMonth
  };
}

// ──────────────────────────────────────────────
// ترحيل شجرة الحسابات
// ──────────────────────────────────────────────

/** يضيف الحسابات الناقصة فقط (بالرمز) ويُبقي الموجود كما هو. يعيد نفس المصفوفة إن لم يُضف شيء. */
export function mergeMissingAccounts(existing: Account[], defaults: Account[]): Account[] {
  const have = new Set(existing.map(a => a.code));
  const missing = defaults.filter(a => !have.has(a.code));
  if (missing.length === 0) return existing;
  return [...existing, ...missing].sort((a, b) => a.code.localeCompare(b.code));
}
