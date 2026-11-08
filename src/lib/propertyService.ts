/**
 * تصميم م. أبو أحمد — مصمم ومنفذ Claude — © الحقوق محفوظة
 *
 * propertyService — مصدر الحقيقة الوحيد لحالة الوحدات والعقود والشواغر.
 *
 * دوال نقية (بدون أي اعتماد على React أو Express) يستخدمها العميل والخادم معًا،
 * حتى لا يختلف منطق الإشغال بين الطرفين.
 *
 * القاعدة: حالة الوحدة تُشتق من العقود، ولا تُحدَّث يدويًا في أكثر من مكان.
 *   - مؤجرة (OCCUPIED): يوجد عقد ACTIVE يغطي تاريخ اليوم.
 *   - صيانة (MAINTENANCE): علامة يدوية، تُحفظ ما لم يغطِّ الوحدةَ عقدٌ ساري.
 *   - شاغرة (VACANT): ما عدا ذلك.
 */

import type { Contract, Property, Unit, UnitStatus } from '../types';

/**
 * عدد أيام السماح بعد تاريخ نهاية العقد قبل اعتبار الوحدة شاغرة.
 * 0 = تصبح الوحدة شاغرة في اليوم التالي لتاريخ النهاية مباشرة.
 */
export const EXPIRY_GRACE_DAYS = 0;

/** الفترة (بالأيام) التي يُنبَّه فيها إلى عقد انتهت مدته ولم يُنهَ رسميًا */
export const RECENT_EXPIRY_WINDOW_DAYS = 30;

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidISODate(value: unknown): value is string {
  if (typeof value !== 'string' || !ISO_RE.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** تاريخ اليوم محليًا بصيغة YYYY-MM-DD */
export function todayISO(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** عدد الأيام من a إلى b (موجب إذا كان b بعد a) */
export function daysBetween(a: string, b: string): number {
  const [ya, ma, da] = a.split('-').map(Number);
  const [yb, mb, db] = b.split('-').map(Number);
  return Math.round((Date.UTC(yb, mb - 1, db) - Date.UTC(ya, ma - 1, da)) / 86400000);
}

/** هل يغطي العقد (الساري) هذا التاريخ؟ */
export function isContractCoveringDate(
  contract: Contract,
  date: string,
  graceDays: number = EXPIRY_GRACE_DAYS
): boolean {
  if (contract.status !== 'ACTIVE') return false;
  if (!isValidISODate(contract.startDate) || !isValidISODate(contract.endDate)) return false;
  if (contract.startDate > date) return false;
  return date <= addDaysISO(contract.endDate, graceDays);
}

function groupByUnit(contracts: Contract[]): Map<string, Contract[]> {
  const map = new Map<string, Contract[]>();
  for (const c of contracts) {
    const list = map.get(c.unitId);
    if (list) list.push(c);
    else map.set(c.unitId, [c]);
  }
  return map;
}

function pickCovering(list: Contract[] | undefined, date: string, graceDays: number): Contract | undefined {
  if (!list) return undefined;
  let best: Contract | undefined;
  for (const c of list) {
    if (isContractCoveringDate(c, date, graceDays) && (!best || c.startDate > best.startDate)) best = c;
  }
  return best;
}

/** العقد الساري الذي يغطي الوحدة اليوم (إن وُجد) */
export function findCoveringContract(
  unitId: string,
  contracts: Contract[],
  date: string = todayISO(),
  graceDays: number = EXPIRY_GRACE_DAYS
): Contract | undefined {
  return pickCovering(contracts.filter(c => c.unitId === unitId), date, graceDays);
}

/** أقرب عقد ساري يبدأ في المستقبل (حجز قادم) */
export function findUpcomingContract(
  unitId: string,
  contracts: Contract[],
  date: string = todayISO()
): Contract | undefined {
  let best: Contract | undefined;
  for (const c of contracts) {
    if (c.unitId !== unitId || c.status !== 'ACTIVE' || !isValidISODate(c.startDate)) continue;
    if (c.startDate > date && (!best || c.startDate < best.startDate)) best = c;
  }
  return best;
}

function resolveUnitWith(
  unit: Unit,
  list: Contract[] | undefined,
  date: string,
  graceDays: number
): Unit {
  const covering = pickCovering(list, date, graceDays);

  if (covering) {
    if (
      unit.status === 'OCCUPIED' &&
      unit.currentContractId === covering.id &&
      unit.currentTenantId === covering.tenantId
    ) {
      return unit;
    }
    return {
      ...unit,
      status: 'OCCUPIED',
      currentTenantId: covering.tenantId,
      currentContractId: covering.id
    };
  }

  const status: UnitStatus = unit.status === 'MAINTENANCE' ? 'MAINTENANCE' : 'VACANT';
  if (unit.status === status && !unit.currentTenantId && !unit.currentContractId) return unit;

  const next: Unit = { ...unit, status };
  delete next.currentTenantId;
  delete next.currentContractId;
  return next;
}

/** الحالة الفعلية لوحدة واحدة */
export function resolveUnit(
  unit: Unit,
  contracts: Contract[],
  date: string = todayISO(),
  graceDays: number = EXPIRY_GRACE_DAYS
): Unit {
  return resolveUnitWith(unit, contracts.filter(c => c.unitId === unit.id), date, graceDays);
}

/**
 * يعيد حساب حالة كل الوحدات من العقود.
 * يعيد نفس المصفوفة (نفس المرجع) إن لم يتغير شيء، لتفادي إعادة الرسم بلا داعٍ.
 */
export function reconcileUnits(
  units: Unit[],
  contracts: Contract[],
  date: string = todayISO(),
  graceDays: number = EXPIRY_GRACE_DAYS
): Unit[] {
  const byUnit = groupByUnit(contracts);
  let changed = false;
  const next = units.map(u => {
    const r = resolveUnitWith(u, byUnit.get(u.id), date, graceDays);
    if (r !== u) changed = true;
    return r;
  });
  return changed ? next : units;
}

/** أول عقد ساري يتداخل مع الفترة المطلوبة لنفس الوحدة */
export function findOverlappingContract(
  contracts: Contract[],
  unitId: string,
  startDate: string,
  endDate: string,
  excludeContractId?: string
): Contract | undefined {
  return contracts.find(
    c =>
      c.unitId === unitId &&
      c.id !== excludeContractId &&
      c.status === 'ACTIVE' &&
      c.startDate <= endDate &&
      startDate <= c.endDate
  );
}

export interface ContractValidation {
  ok: boolean;
  error?: string;
}

/** تحقق موحد قبل إبرام عقد جديد (يُستدعى في العميل والخادم) */
export function validateNewContract(params: {
  units: Unit[];
  contracts: Contract[];
  unitId: string;
  startDate: string;
  endDate: string;
  excludeContractId?: string;
  today?: string;
}): ContractValidation {
  const today = params.today ?? todayISO();
  const unit = params.units.find(u => u.id === params.unitId);
  if (!unit) return { ok: false, error: 'الوحدة المحددة غير موجودة' };

  if (!isValidISODate(params.startDate) || !isValidISODate(params.endDate)) {
    return { ok: false, error: 'تاريخ بداية أو نهاية العقد غير صحيح' };
  }
  if (params.endDate < params.startDate) {
    return { ok: false, error: 'تاريخ نهاية العقد يجب أن يكون بعد تاريخ البداية' };
  }

  const overlap = findOverlappingContract(
    params.contracts,
    params.unitId,
    params.startDate,
    params.endDate,
    params.excludeContractId
  );
  if (overlap) {
    return {
      ok: false,
      error: `الوحدة ${unit.unitNumber} لها عقد ساري (${overlap.contractNumber}) من ${overlap.startDate} إلى ${overlap.endDate} يتداخل مع الفترة المطلوبة`
    };
  }

  if (unit.status === 'MAINTENANCE' && params.startDate <= today) {
    return { ok: false, error: `الوحدة ${unit.unitNumber} قيد الصيانة ولا يمكن تأجيرها قبل إعادتها للخدمة` };
  }

  return { ok: true };
}

/** هل الوحدة متاحة لعقد يبدأ اليوم؟ (للقوائم المنسدلة) */
export function isUnitAvailable(unit: Unit, contracts: Contract[], date: string = todayISO()): boolean {
  if (unit.status === 'MAINTENANCE') return false;
  return !findCoveringContract(unit.id, contracts, date);
}

/** إنهاء عقد: ينقله إلى TERMINATED ويقصّ تاريخ نهايته على تاريخ الإنهاء */
export function applyTermination(
  contract: Contract,
  params: { date: string; reason?: string }
): Contract {
  let end = contract.endDate;
  if (params.date < contract.startDate) end = contract.startDate;
  else if (params.date < contract.endDate) end = params.date;

  return {
    ...contract,
    status: 'TERMINATED',
    endDate: end,
    terminationDate: params.date,
    terminationReason: params.reason?.trim() || undefined
  };
}

export function validateTermination(contract: Contract | undefined, date: string): ContractValidation {
  if (!contract) return { ok: false, error: 'العقد غير موجود' };
  if (contract.status !== 'ACTIVE') {
    return { ok: false, error: 'لا يمكن إنهاء عقد غير ساري (حالته الحالية ليست ACTIVE)' };
  }
  if (!isValidISODate(date)) return { ok: false, error: 'تاريخ الإنهاء غير صحيح' };
  return { ok: true };
}

// ──────────────────────────────────────────────
// إحصاءات الشواغر
// ──────────────────────────────────────────────

export interface VacantUnitInfo {
  unit: Unit;
  property?: Property;
  /** تاريخ أول يوم شغور (اليوم التالي لنهاية آخر عقد) — غير معرّف إن لم تؤجَّر الوحدة من قبل */
  vacantSince?: string;
  vacantDays?: number;
  neverRented: boolean;
  monthlyRent: number;
  /** الخسارة التقديرية منذ بدء الشغور (إيجار شهري × الأيام ÷ 30) */
  estimatedLossToDate: number;
  upcomingContract?: Contract;
  /** عقد ساري الحالة انتهت مدته مؤخرًا ولم يُنهَ رسميًا — يحتاج إجراءً */
  recentlyExpiredContract?: Contract;
}

export interface VacancyStats {
  date: string;
  total: number;
  occupied: number;
  vacant: number;
  maintenance: number;
  occupancyRate: number;
  vacancyRate: number;
  estimatedMonthlyLoss: number;
  vacantUnits: VacantUnitInfo[];
}

export function computeVacancyStats(params: {
  units: Unit[];
  contracts: Contract[];
  properties: Property[];
  date?: string;
  propertyId?: string;
}): VacancyStats {
  const date = params.date ?? todayISO();
  const scoped = params.propertyId
    ? params.units.filter(u => u.propertyId === params.propertyId)
    : params.units;

  const resolved = reconcileUnits(scoped, params.contracts, date);
  const byUnit = groupByUnit(params.contracts);
  const propById = new Map(params.properties.map(p => [p.id, p]));

  let occupied = 0;
  let maintenance = 0;
  const vacantUnits: VacantUnitInfo[] = [];

  for (const unit of resolved) {
    if (unit.status === 'OCCUPIED') {
      occupied++;
      continue;
    }
    if (unit.status === 'MAINTENANCE') {
      maintenance++;
      continue;
    }

    const list = byUnit.get(unit.id) ?? [];

    // آخر يوم إشغال: أحدث تاريخ نهاية بين العقود التي بدأت فعلًا (غير المسودة)
    let lastEnd: string | undefined;
    let recentlyExpired: Contract | undefined;
    for (const c of list) {
      if (c.status === 'DRAFT' || !isValidISODate(c.endDate) || !isValidISODate(c.startDate)) continue;
      if (c.startDate > date) continue;
      if (!lastEnd || c.endDate > lastEnd) lastEnd = c.endDate;
      if (
        c.status === 'ACTIVE' &&
        c.endDate < date &&
        daysBetween(c.endDate, date) <= RECENT_EXPIRY_WINDOW_DAYS &&
        (!recentlyExpired || c.endDate > recentlyExpired.endDate)
      ) {
        recentlyExpired = c;
      }
    }

    const vacantSince = lastEnd ? addDaysISO(lastEnd, 1) : undefined;
    const vacantDays = vacantSince ? Math.max(0, daysBetween(vacantSince, date)) : undefined;
    const monthlyRent = Number(unit.monthlyRent) > 0 ? Number(unit.monthlyRent) : 0;

    vacantUnits.push({
      unit,
      property: propById.get(unit.propertyId),
      vacantSince,
      vacantDays,
      neverRented: !lastEnd,
      monthlyRent,
      estimatedLossToDate: vacantDays ? Math.round((monthlyRent * vacantDays) / 30) : 0,
      upcomingContract: findUpcomingContract(unit.id, params.contracts, date),
      recentlyExpiredContract: recentlyExpired
    });
  }

  vacantUnits.sort((a, b) => (b.vacantDays ?? -1) - (a.vacantDays ?? -1));

  const total = resolved.length;
  const vacant = vacantUnits.length;
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

  return {
    date,
    total,
    occupied,
    vacant,
    maintenance,
    occupancyRate: pct(occupied),
    vacancyRate: pct(vacant),
    estimatedMonthlyLoss: vacantUnits.reduce((s, v) => s + v.monthlyRent, 0),
    vacantUnits
  };
}

// ──────────────────────────────────────────────
// ترقيم وتصنيف العقود
// ──────────────────────────────────────────────

/** رقم عقد فريد بصيغة CON-YYYY-NN (السنة من تاريخ اليوم، لا رقم ثابت) */
export function nextContractNumber(contracts: Contract[], now: string = todayISO()): string {
  const year = now.slice(0, 4);
  const used = new Set(contracts.map(c => c.contractNumber));
  let n = contracts.filter(c => c.contractNumber.startsWith(`CON-${year}-`)).length + 1;
  let candidate = `CON-${year}-${String(n).padStart(2, '0')}`;
  while (used.has(candidate)) {
    n++;
    candidate = `CON-${year}-${String(n).padStart(2, '0')}`;
  }
  return candidate;
}

export type ContractDisplayState = 'ACTIVE' | 'UPCOMING' | 'EXPIRED_UNRESOLVED' | 'EXPIRED' | 'TERMINATED' | 'DRAFT';

/** الحالة المعروضة للعقد حسب حالته وتواريخه (بدل عرض كل العقود «ساري ونشط») */
export function contractDisplayState(contract: Contract, date: string = todayISO()): ContractDisplayState {
  if (contract.status === 'TERMINATED') return 'TERMINATED';
  if (contract.status === 'DRAFT') return 'DRAFT';
  if (contract.status === 'EXPIRED') return 'EXPIRED';
  if (contract.endDate < date) return 'EXPIRED_UNRESOLVED';
  if (contract.startDate > date) return 'UPCOMING';
  return 'ACTIVE';
}
