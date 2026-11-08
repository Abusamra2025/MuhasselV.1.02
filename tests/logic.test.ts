/**
 * تصميم م. أبو أحمد — مصمم ومنفذ Claude — © الحقوق محفوظة
 * اختبارات منطق الشواغر والأصول الثابتة وكلمات المرور (تشغيل: npm run test:logic)
 */
import assert from 'node:assert/strict';
import type { Contract, Unit, Property } from '../src/types';
import {
  reconcileUnits, validateNewContract, applyTermination, validateTermination,
  computeVacancyStats, isUnitAvailable, findOverlappingContract
} from '../src/lib/propertyService';
import {
  buildAcquisition, generateDepreciation, monthlyDepreciation, validateFixedAssetInput,
  mergeMissingAccounts, bookValue
} from '../src/lib/fixedAssetsService';
import { generateBalanceSheet, generateProfitLoss, generateTrialBalance } from '../src/lib/accountingEngine';
import { INITIAL_CHART_OF_ACCOUNTS } from '../src/lib/initialData';
import { hashPassword, verifyPassword, sanitizeUser } from '../src/server/passwords';

let passed = 0;
function t(name: string, fn: () => void) {
  try { fn(); passed++; console.log('  ✓', name); }
  catch (e: any) { console.error('  ✗', name, '\n   ', e.message); process.exitCode = 1; }
}

const props: Property[] = [{ id: 'p1', code: 'P1', name: 'برج أ', address: '', city: '', type: 'RESIDENTIAL', totalUnits: 3, createdAt: '2026-01-01' }];
const mkUnit = (id: string, status: Unit['status'] = 'VACANT', rent = 1000): Unit => ({ id, propertyId: 'p1', unitNumber: id, floor: 1, type: 'APARTMENT', monthlyRent: rent, status });
const mkContract = (id: string, unitId: string, s: string, e: string, status: Contract['status'] = 'ACTIVE'): Contract => ({
  id, contractNumber: id, tenantId: 't1', propertyId: 'p1', unitId, startDate: s, endDate: e,
  annualRent: 12000, paymentFrequency: 'MONTHLY', installmentAmount: 1000, securityDeposit: 0, status, createdAt: '2026-01-01'
});

console.log('الشواغر');
t('وحدة بعقد ساري اليوم = مؤجرة', () => {
  const u = reconcileUnits([mkUnit('u1')], [mkContract('c1', 'u1', '2026-01-01', '2026-12-31')], '2026-11-05');
  assert.equal(u[0].status, 'OCCUPIED'); assert.equal(u[0].currentContractId, 'c1');
});
t('عقد منتهي المدة → الوحدة شاغرة تلقائيًا', () => {
  const u = reconcileUnits([mkUnit('u1', 'OCCUPIED')], [mkContract('c1', 'u1', '2025-01-01', '2025-12-31')], '2026-11-05');
  assert.equal(u[0].status, 'VACANT'); assert.equal(u[0].currentContractId, undefined);
});
t('عقد منتهٍ رسميًا (TERMINATED) لا يشغل الوحدة', () => {
  const u = reconcileUnits([mkUnit('u1', 'OCCUPIED')], [mkContract('c1', 'u1', '2026-01-01', '2026-12-31', 'TERMINATED')], '2026-11-05');
  assert.equal(u[0].status, 'VACANT');
});
t('عقد مسودة لا يشغل الوحدة', () => {
  const u = reconcileUnits([mkUnit('u1')], [mkContract('c1', 'u1', '2026-01-01', '2026-12-31', 'DRAFT')], '2026-11-05');
  assert.equal(u[0].status, 'VACANT');
});
t('عقد يبدأ مستقبلًا: الوحدة شاغرة الآن ولها حجز قادم', () => {
  const units = reconcileUnits([mkUnit('u1')], [mkContract('c1', 'u1', '2027-01-01', '2027-12-31')], '2026-11-05');
  assert.equal(units[0].status, 'VACANT');
  const st = computeVacancyStats({ units, contracts: [mkContract('c1', 'u1', '2027-01-01', '2027-12-31')], properties: props, date: '2026-11-05' });
  assert.ok(st.vacantUnits[0].upcomingContract);
});
t('الصيانة تبقى صيانة ما لم يغطّها عقد', () => {
  assert.equal(reconcileUnits([mkUnit('u1', 'MAINTENANCE')], [], '2026-11-05')[0].status, 'MAINTENANCE');
});
t('نفس المرجع يُعاد عند عدم التغيير (أداء)', () => {
  const us = [mkUnit('u1')]; assert.equal(reconcileUnits(us, [], '2026-11-05'), us);
});
t('منع تداخل عقدين على نفس الوحدة', () => {
  const v = validateNewContract({ units: [mkUnit('u1')], contracts: [mkContract('c1', 'u1', '2026-01-01', '2026-12-31')], unitId: 'u1', startDate: '2026-06-01', endDate: '2027-05-31', today: '2026-11-05' });
  assert.equal(v.ok, false);
});
t('السماح بعقد متتابع بعد انتهاء السابق', () => {
  const v = validateNewContract({ units: [mkUnit('u1')], contracts: [mkContract('c1', 'u1', '2026-01-01', '2026-12-31')], unitId: 'u1', startDate: '2027-01-01', endDate: '2027-12-31', today: '2026-11-05' });
  assert.equal(v.ok, true);
});
t('منع تأجير وحدة قيد الصيانة', () => {
  const v = validateNewContract({ units: [mkUnit('u1', 'MAINTENANCE')], contracts: [], unitId: 'u1', startDate: '2026-11-05', endDate: '2027-11-04', today: '2026-11-05' });
  assert.equal(v.ok, false);
});
t('رفض تواريخ غير صحيحة ونهاية قبل البداية', () => {
  assert.equal(validateNewContract({ units: [mkUnit('u1')], contracts: [], unitId: 'u1', startDate: '2026-13-01', endDate: '2027-01-01' }).ok, false);
  assert.equal(validateNewContract({ units: [mkUnit('u1')], contracts: [], unitId: 'u1', startDate: '2026-05-01', endDate: '2026-04-01' }).ok, false);
});
t('إنهاء العقد يُخلي الوحدة ويقصّ تاريخ النهاية', () => {
  const c = mkContract('c1', 'u1', '2026-01-01', '2026-12-31');
  assert.equal(validateTermination(c, '2026-10-01').ok, true);
  const term = applyTermination(c, { date: '2026-10-01', reason: 'إخلاء' });
  assert.equal(term.status, 'TERMINATED'); assert.equal(term.endDate, '2026-10-01');
  assert.equal(reconcileUnits([mkUnit('u1', 'OCCUPIED')], [term], '2026-11-05')[0].status, 'VACANT');
});
t('لا يمكن إنهاء عقد منتهٍ مسبقًا', () => {
  assert.equal(validateTermination(mkContract('c1', 'u1', '2026-01-01', '2026-12-31', 'TERMINATED'), '2026-10-01').ok, false);
});
t('إحصاءات الشواغر: المدة والخسارة (بدون رقم 2500 الثابت)', () => {
  const contracts = [mkContract('c1', 'u1', '2025-01-01', '2026-09-30')];
  const st = computeVacancyStats({ units: [mkUnit('u1', 'OCCUPIED', 3000), mkUnit('u2', 'VACANT', 0)], contracts, properties: props, date: '2026-11-05' });
  assert.equal(st.vacant, 2);
  const u1 = st.vacantUnits.find(v => v.unit.id === 'u1')!;
  assert.equal(u1.vacantSince, '2026-10-01'); assert.equal(u1.vacantDays, 35);
  assert.equal(u1.estimatedLossToDate, Math.round(3000 * 35 / 30));
  assert.equal(st.estimatedMonthlyLoss, 3000);
  assert.equal(st.vacantUnits.find(v => v.unit.id === 'u2')!.neverRented, true);
});
t('عقد ساري انتهت مدته مؤخرًا يظهر كتنبيه إجراء', () => {
  const st = computeVacancyStats({ units: [mkUnit('u1')], contracts: [mkContract('c1', 'u1', '2025-01-01', '2026-10-20')], properties: props, date: '2026-11-05' });
  assert.ok(st.vacantUnits[0].recentlyExpiredContract);
});
t('isUnitAvailable', () => {
  assert.equal(isUnitAvailable(mkUnit('u1'), [mkContract('c1', 'u1', '2026-01-01', '2026-12-31')], '2026-11-05'), false);
  assert.equal(isUnitAvailable(mkUnit('u1'), [], '2026-11-05'), true);
  assert.equal(findOverlappingContract([], 'u1', '2026-01-01', '2026-02-01'), undefined);
});

console.log('الأصول الثابتة');
const accounts = INITIAL_CHART_OF_ACCOUNTS;
const acq = (over: any = {}) => buildAcquisition({
  input: { name: 'مبنى الإدارة', assetType: 'BUILDING', purchaseDate: '2026-01-15', cost: 4_800_000, salvageValue: 0, usefulLifeMonths: 480, fundingAccountCode: '1120', ...over },
  accounts, existingAssets: [], existingEntries: [], createdBy: 'test'
});
t('الشجرة تحوي حسابات الأصول والإهلاك الجديدة', () => {
  for (const c of ['1210', '1220', '1230', '1240', '1250', '1260', '1290', '5700']) assert.ok(accounts.some(a => a.code === c), c);
});
t('المباني تُقبل كأصل ثابت وقيد الاقتناء متوازن', () => {
  const { asset, entry } = acq();
  assert.equal(entry.isBalanced, true); assert.equal(entry.totalDebit, 4_800_000);
  assert.equal(asset.assetAccountCode, '1210'); assert.equal(entry.lines[0].debit, 4_800_000);
});
t('المولّد والأرض والمركبة مقبولة', () => {
  for (const [type, code] of [['GENERATOR', '1230'], ['LAND', '1220'], ['VEHICLE', '1250'], ['FURNITURE', '1240']] as const) {
    const input: any = { name: 'x', assetType: type, purchaseDate: '2026-01-01', cost: 1000, usefulLifeMonths: 60, fundingAccountCode: '1110' };
    assert.equal(validateFixedAssetInput(input, accounts).ok, true, type);
    assert.equal(buildAcquisition({ input, accounts, existingAssets: [], existingEntries: [], createdBy: 't' }).asset.assetAccountCode, code);
  }
});
t('رفض مدخلات خاطئة', () => {
  const base: any = { name: 'x', assetType: 'GENERATOR', purchaseDate: '2026-01-01', cost: 1000, usefulLifeMonths: 60, fundingAccountCode: '1110' };
  assert.equal(validateFixedAssetInput({ ...base, cost: 0 }, accounts).ok, false);
  assert.equal(validateFixedAssetInput({ ...base, salvageValue: 1000 }, accounts).ok, false);
  assert.equal(validateFixedAssetInput({ ...base, usefulLifeMonths: 0 }, accounts).ok, false);
  assert.equal(validateFixedAssetInput({ ...base, fundingAccountCode: '4100' }, accounts).ok, false);
  assert.equal(validateFixedAssetInput({ ...base, purchaseDate: '2026-02-30' }, accounts).ok, false);
});
t('الأرض لا تُهلَك', () => {
  const { asset, entry } = buildAcquisition({ input: { name: 'أرض', assetType: 'LAND', purchaseDate: '2026-01-01', cost: 1_000_000, fundingAccountCode: '1120' }, accounts, existingAssets: [], existingEntries: [], createdBy: 't' });
  assert.equal(monthlyDepreciation(asset), 0);
  const r = generateDepreciation({ assets: [asset], accounts, existingEntries: [entry], throughMonth: '2026-12', createdBy: 't' });
  assert.equal(r.entries.length, 0);
});
t('الإهلاك الشهري بالقسط الثابت وبدون ترحيل مكرر', () => {
  const { asset, entry } = buildAcquisition({ input: { name: 'مولد', assetType: 'GENERATOR', purchaseDate: '2026-01-10', cost: 120_000, salvageValue: 12_000, usefulLifeMonths: 108, fundingAccountCode: '1120' }, accounts, existingAssets: [], existingEntries: [], createdBy: 't' });
  assert.equal(monthlyDepreciation(asset), 1000);
  const r1 = generateDepreciation({ assets: [asset], accounts, existingEntries: [entry], throughMonth: '2026-03', createdBy: 't' });
  assert.equal(r1.entries.length, 3); assert.equal(r1.totalAmount, 3000);
  assert.ok(r1.entries.every(e => e.isBalanced && e.totalDebit === 1000));
  assert.equal(r1.assets[0].accumulatedDepreciation, 3000);
  const r2 = generateDepreciation({ assets: r1.assets, accounts, existingEntries: [entry, ...r1.entries], throughMonth: '2026-03', createdBy: 't' });
  assert.equal(r2.entries.length, 0);
  const r3 = generateDepreciation({ assets: r1.assets, accounts, existingEntries: [entry, ...r1.entries], throughMonth: '2026-04', createdBy: 't' });
  assert.equal(r3.entries.length, 1); assert.equal(r3.assets[0].accumulatedDepreciation, 4000);
  assert.equal(bookValue(r3.assets[0]), 116_000);
});
t('الإهلاك يتوقف عند القيمة التخريدية', () => {
  const { asset, entry } = buildAcquisition({ input: { name: 'جهاز', assetType: 'EQUIPMENT', purchaseDate: '2026-01-01', cost: 1000, salvageValue: 100, usefulLifeMonths: 3, fundingAccountCode: '1110' }, accounts, existingAssets: [], existingEntries: [], createdBy: 't' });
  const r = generateDepreciation({ assets: [asset], accounts, existingEntries: [entry], throughMonth: '2027-12', createdBy: 't' });
  assert.equal(r.assets[0].accumulatedDepreciation, 900); assert.equal(r.entries.length, 3);
});
t('الإهلاك يتوقف عند فترة مقفلة', () => {
  const { asset, entry } = buildAcquisition({ input: { name: 'مولد', assetType: 'GENERATOR', purchaseDate: '2026-01-10', cost: 12_000, usefulLifeMonths: 12, fundingAccountCode: '1120' }, accounts, existingAssets: [], existingEntries: [], createdBy: 't' });
  const r = generateDepreciation({ assets: [asset], accounts, existingEntries: [entry], throughMonth: '2026-06', createdBy: 't', isDateClosed: d => d >= '2026-03-01' });
  assert.equal(r.entries.length, 2); assert.equal(r.blockedMonth, '2026-03');
});
t('الميزانية: الأصول = الخصوم + الملكية مع الإهلاك ومجمعه', () => {
  const cap = acq({ fundingAccountCode: '3100' });
  const gen = buildAcquisition({ input: { name: 'مولد', assetType: 'GENERATOR', purchaseDate: '2026-01-10', cost: 120_000, salvageValue: 12_000, usefulLifeMonths: 108, fundingAccountCode: '1120' }, accounts, existingAssets: [cap.asset], existingEntries: [cap.entry], createdBy: 't' });
  const dep = generateDepreciation({ assets: [cap.asset, gen.asset], accounts, existingEntries: [cap.entry, gen.entry], throughMonth: '2026-06', createdBy: 't' });
  const entries = [cap.entry, gen.entry, ...dep.entries];
  const tb = generateTrialBalance(accounts, entries);
  assert.equal(tb.isBalanced, true);
  const bs = generateBalanceSheet(accounts, entries, '2026-12-31');
  assert.equal(bs.isBalanced, true, `فرق ${bs.difference}`);
  assert.ok(bs.assets.fixedAssets.some(a => a.code === '1290' && a.amount < 0));
  const pl = generateProfitLoss(accounts, entries);
  assert.ok(pl.totalExpenses > 0 && (pl.depreciationExpense ?? 0) > 0);
});
t('ترحيل الشجرة القديمة: إضافة الناقص فقط', () => {
  const old = accounts.filter(a => !['1220', '1290', '5700'].includes(a.code)).map(a => a.code === '1210' ? { ...a, nameAr: 'اسم معدّل' } : a);
  const merged = mergeMissingAccounts(old, accounts);
  assert.equal(merged.length, accounts.length);
  assert.equal(merged.find(a => a.code === '1210')!.nameAr, 'اسم معدّل');
  assert.equal(mergeMissingAccounts(accounts, accounts), accounts);
});

console.log('كلمات المرور');
t('تشفير والتحقق', () => {
  const h = hashPassword('Abc12345!'); assert.ok(h.startsWith('scrypt$')); assert.notEqual(h, 'Abc12345!');
  assert.equal(verifyPassword('Abc12345!', h), true); assert.equal(verifyPassword('wrong', h), false);
  assert.equal(verifyPassword('', h), false); assert.equal(verifyPassword('x', null), false);
});
t('نص صريح قديم ما زال يُقبل (للترقية)', () => { assert.equal(verifyPassword('old', 'old'), true); assert.equal(verifyPassword('old2', 'old'), false); });
t('sanitizeUser لا يُسرّب كلمة المرور', () => {
  const base: any = { id: '1', name: 'a', role: 'ACCOUNTANT', titleAr: '', email: 'a@a', isActive: true, permissions: {}, password: hashPassword('x'), initialPassword: 'Temp1234', mustChangePasswordOnNextLogin: true };
  const s1: any = sanitizeUser(base); assert.equal(s1.password, undefined); assert.equal(s1.initialPassword, 'Temp1234');
  const s2: any = sanitizeUser({ ...base, mustChangePasswordOnNextLogin: false }); assert.equal(s2.initialPassword, undefined);
  const s3: any = sanitizeUser({ ...base, role: 'ADMIN' }); assert.equal(s3.initialPassword, undefined);
});

console.log(`\n${passed} اختبارًا ناجحًا${process.exitCode ? ' — مع إخفاقات' : ''}`);
