/**
 * تصميم م. أبو أحمد — مصمم ومنفذ Claude — © الحقوق محفوظة
 * اختبار تكاملي للخادم الحقيقي: يشغّل الخادم على بيانات مؤقتة ويختبر الدخول والعقود والأصول وكلمات المرور.
 * التشغيل: npm run test:api
 */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PORT = 3917;
const BASE = `http://127.0.0.1:${PORT}`;
const ADMIN_PWD = 'Test-Admin-Pass-1';
let passed = 0;

async function t(name: string, fn: () => Promise<void>) {
  try { await fn(); passed++; console.log('  ✓', name); }
  catch (e: any) { console.error('  ✗', name, '\n   ', e.message); process.exitCode = 1; }
}
let TOKEN = '';   // رمز المدير العام
let ACC = '';     // رمز المحاسب
const auth = (tok: string): Record<string, string> => (tok ? { Authorization: 'Bearer ' + tok } : {});
const post = async (url: string, body: any, tok: string = TOKEN) => {
  const r = await fetch(BASE + url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...auth(tok) }, body: JSON.stringify(body) });
  return { status: r.status, json: await r.json().catch(() => ({})) as any };
};
const get = async (url: string, tok: string = TOKEN) => { const r = await fetch(BASE + url, { headers: auth(tok) }); const text = await r.text(); let json: any = {}; try { json = JSON.parse(text); } catch {} return { status: r.status, json, text }; };

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'muhassil-api-'));
const root = process.cwd();
// نشغّل الخادم من نسخة مؤقتة لمجلد data كي لا نمسّ بيانات حقيقية
const child = spawn(process.execPath, ['--import', 'tsx', 'src/server/app.ts'], {
  cwd: root,
  env: { ...process.env, PORT: String(PORT), ADMIN_INITIAL_PASSWORD: ADMIN_PWD, MUHASSIL_DATA_DIR: tmp, NODE_ENV: 'test' },
  stdio: ['ignore', 'pipe', 'pipe']
});
let log = '';
child.stdout.on('data', d => (log += d));
child.stderr.on('data', d => (log += d));

async function waitUp() {
  for (let i = 0; i < 80; i++) {
    try { const r = await fetch(BASE + '/api/health'); if (r.ok) return; } catch {}
    await new Promise(r => setTimeout(r, 250));
  }
  throw new Error('الخادم لم يبدأ:\n' + log.slice(-1500));
}

(async () => {
  await waitUp();
  console.log('الدخول وكلمات المرور');

  await t('رفض كلمات المرور الافتراضية القديمة', async () => {
    for (const p of ['admin', '123456', 'admin1234', 'admin123']) {
      const r = await post('/api/auth/login', { identifier: 'admin', password: p });
      assert.equal(r.status, 401, p);
    }
  });
  let adminId = '';
  await t('دخول المدير بكلمة ADMIN_INITIAL_PASSWORD وإلزامه بالتغيير', async () => {
    const r = await post('/api/auth/login', { identifier: 'admin', password: ADMIN_PWD });
    assert.equal(r.status, 200); assert.equal(r.json.success, true);
    assert.equal(r.json.user.password, undefined);
    assert.equal(r.json.user.mustChangePasswordOnNextLogin, true);
    adminId = r.json.user.id;
    assert.ok(r.json.token, 'لم يُصدر رمز جلسة');
    TOKEN = r.json.token;
  });
  await t('/api/state لا يحتوي أي حقل password', async () => {
    const { text } = await get('/api/state');
    assert.ok(!/"password"/.test(text), 'تسريب حقل password');
    assert.ok(!text.includes(ADMIN_PWD));
  });

  await t('تغيير كلمة المرور يتطلب الحالية ويرفض القصيرة', async () => {
    assert.equal((await post(`/api/users/${adminId}/change-password`, { currentPassword: 'wrong', newPassword: 'NewPass-12345' })).status, 400);
    assert.equal((await post(`/api/users/${adminId}/change-password`, { currentPassword: ADMIN_PWD, newPassword: 'short' })).status, 400);
    assert.equal((await post(`/api/users/${adminId}/change-password`, { currentPassword: ADMIN_PWD, newPassword: 'NewPass-12345' })).status, 200);
    assert.equal((await post('/api/auth/login', { identifier: 'admin', password: ADMIN_PWD })).status, 401);
    const ok = await post('/api/auth/login', { identifier: 'admin', password: 'NewPass-12345' });
    assert.equal(ok.status, 200); assert.equal(ok.json.user.mustChangePasswordOnNextLogin, false);
    TOKEN = ok.json.token;
  });

  console.log('رموز الجلسة والصلاحيات');
  await t('طلب بلا رمز أو برمز مزوّر يُرفض 401', async () => {
    assert.equal((await get('/api/state', '')).status, 401);
    assert.equal((await get('/api/state', 'abc.def')).status, 401);
    assert.equal((await get('/api/state', TOKEN.slice(0, -3) + 'AAA')).status, 401);
    assert.equal((await post('/api/payments', { actorRole: 'ADMIN' }, '')).status, 401);
    assert.equal((await get('/api/health', '')).status, 200);
  });
  const accEmail = 'acc.test@example.com';
  await t('المدير ينشئ محاسبًا ويدخل بكلمته المؤقتة', async () => {
    const c = await post('/api/users', { user: { name: 'محاسب اختبار', email: accEmail, role: 'ACCOUNTANT', initialPassword: 'Acc-Temp-12345' } });
    assert.ok([200, 201].includes(c.status), String(c.status));
    const l = await post('/api/auth/login', { identifier: accEmail, password: 'Acc-Temp-12345' }, '');
    assert.equal(l.status, 200); ACC = l.json.token; assert.ok(ACC);
  });
  await t('المحاسب لا يستطيع إدارة المستخدمين أو النسخ الاحتياطي حتى لو ادّعى أنه مدير', async () => {
    const fake = { actorRole: 'ADMIN', actorName: 'x' };
    assert.equal((await post('/api/users', { user: { name: 'مخترق', email: 'h@x.com', role: 'ADMIN', ...fake }, ...fake }, ACC)).status, 403);
    assert.equal((await post('/api/system/clear-data', { mode: 'ALL', adminPassword: 'NewPass-12345', ...fake }, ACC)).status, 403);
    assert.equal((await post('/api/backups/restore', { ...fake }, ACC)).status, 403);
    assert.equal((await post('/api/reset', { ...fake }, ACC)).status, 403);
  });
  await t('محاولات الدخول الخاطئة المتكررة تُحجب مؤقتًا (429)', async () => {
    let last = 0;
    for (let i = 0; i < 10; i++) last = (await post('/api/auth/login', { identifier: 'victim@example.com', password: 'bad-' + i }, '')).status;
    assert.equal(last, 429);
  });
  await t('ملف كلمة المرور الأولى لا يُنشأ عند استخدام المتغير', async () => {
    assert.equal(fs.existsSync(path.join(tmp, 'FIRST_RUN_ADMIN_PASSWORD.txt')), false);
  });
  await t('تصفير البيانات يرفض كلمة مرور خاطئة', async () => {
    const r = await post('/api/system/clear-data', { mode: 'TRANSACTIONS_ONLY', adminPassword: 'x', actorName: 'a', actorRole: 'ADMIN' });
    assert.equal(r.status, 401);
  });

  console.log('الشواغر والعقود');
  const actor = { actorName: 'محاسب', actorRole: 'ACCOUNTANT' };
  const apost = (u: string, b: any) => post(u, b, ACC);
  const st = (await get('/api/state')).json;
  const propId = 'prop_t1', u1 = 'unit_t1', u2 = 'unit_t2';
  await apost('/api/properties', { property: { id: propId, code: 'T1', name: 'برج الاختبار', address: 'x', city: 'x', type: 'RESIDENTIAL', totalUnits: 0 }, ...actor });
  await apost('/api/units', { unit: { id: u1, propertyId: propId, unitNumber: '101', floor: 1, type: 'APARTMENT', monthlyRent: 2000, status: 'VACANT' }, ...actor });
  await apost('/api/units', { unit: { id: u2, propertyId: propId, unitNumber: '102', floor: 1, type: 'APARTMENT', monthlyRent: 2500, status: 'MAINTENANCE' }, ...actor });
  await apost('/api/tenants', { tenant: { name: 'مستأجر', nationalId: '1', phone: '0500000000' }, ...actor });
  const tenantId = (await get('/api/state')).json.tenants[0].id;
  const today = new Date(); const iso = (d: Date) => d.toISOString().slice(0, 10);
  const start = iso(new Date(today.getTime() - 30 * 864e5)), end = iso(new Date(today.getTime() + 300 * 864e5));
  const contract = (id: string, unitId: string, s = start, e = end) => ({ id, contractNumber: id, tenantId, propertyId: propId, unitId, startDate: s, endDate: e, annualRent: 24000, paymentFrequency: 'MONTHLY', installmentAmount: 2000, securityDeposit: 0, status: 'ACTIVE' });

  await t('إنشاء عقد يبقي المعرّف نفسه ويشغل الوحدة', async () => {
    const r = await apost('/api/contracts', { contractData: contract('con_t1', u1), ...actor });
    assert.equal(r.status, 200); assert.equal(r.json.contract.id, 'con_t1');
    const unit = (await get('/api/state')).json.units.find((u: any) => u.id === u1);
    assert.equal(unit.status, 'OCCUPIED'); assert.equal(unit.currentContractId, 'con_t1');
  });
  await t('تكرار نفس الطلب لا ينشئ عقدًا ثانيًا', async () => {
    const r = await apost('/api/contracts', { contractData: contract('con_t1', u1), ...actor });
    assert.equal(r.json.duplicate, true);
    assert.equal((await get('/api/state')).json.contracts.filter((c: any) => c.id === 'con_t1').length, 1);
  });
  await t('رفض عقد متداخل على نفس الوحدة', async () => {
    const r = await apost('/api/contracts', { contractData: contract('con_t2', u1), ...actor });
    assert.equal(r.status, 409);
  });
  await t('رفض تأجير وحدة قيد الصيانة', async () => {
    assert.equal((await apost('/api/contracts', { contractData: contract('con_t3', u2), ...actor })).status, 409);
  });
  await t('إنهاء العقد يُخلي الوحدة', async () => {
    assert.equal((await post('/api/contracts/con_t1/terminate', { date: iso(today), reason: 'اختبار', actorName: 'م', actorRole: 'ADMIN' })).status, 403);
    const r = await apost('/api/contracts/con_t1/terminate', { date: iso(today), reason: 'اختبار', ...actor });
    assert.equal(r.status, 200); assert.equal(r.json.contract.status, 'TERMINATED');
    const unit = (await get('/api/state')).json.units.find((u: any) => u.id === u1);
    assert.equal(unit.status, 'VACANT'); assert.equal(unit.currentContractId, undefined);
    assert.equal((await apost('/api/contracts/con_t1/terminate', { date: iso(today), ...actor })).status, 400);
  });
  await t('يمكن تأجير الوحدة بعد الإخلاء', async () => {
    const r = await apost('/api/contracts', { contractData: contract('con_t4', u1, iso(new Date(today.getTime() + 864e5)), end), ...actor });
    assert.equal(r.status, 200);
  });

  console.log('الأصول الثابتة');
  const input = (over: any = {}) => ({ name: 'مبنى الإدارة', assetType: 'BUILDING', purchaseDate: '2026-01-15', cost: 1200000, salvageValue: 0, usefulLifeMonths: 240, fundingAccountCode: '1120', propertyId: propId, ...over });
  let assetId = '';
  await t('تسجيل مبنى كأصل ثابت مع قيد متوازن', async () => {
    const r = await apost('/api/fixed-assets', { input: input(), ...actor });
    assert.equal(r.status, 201); assert.equal(r.json.entry.isBalanced, true); assert.equal(r.json.entry.totalDebit, 1200000);
    assetId = r.json.asset.id;
  });
  await t('المدير لا يسجل أصولًا، والمدخلات الخاطئة مرفوضة', async () => {
    assert.equal((await post('/api/fixed-assets', { input: input(), actorName: 'م', actorRole: 'ADMIN' })).status, 403);
    assert.equal((await apost('/api/fixed-assets', { input: input({ cost: -5 }), ...actor })).status, 400);
    assert.equal((await apost('/api/fixed-assets', { input: input({ fundingAccountCode: '4100' }), ...actor })).status, 400);
  });
  await t('ادّعاء الدور في الجسم لا يغيّر هوية صاحب الرمز', async () => {
    // محاسب يدّعي أنه مدير: يُعامل كمحاسب (يُقبل)، ومدير يدّعي أنه محاسب: يُعامل كمدير (يُرفض)
    assert.equal((await post('/api/fixed-assets', { input: input({ name: 'أثاث' , assetType: 'FURNITURE', cost: 5000, usefulLifeMonths: 60 }), actorName: 'x', actorRole: 'ADMIN' }, ACC)).status, 201);
    assert.equal((await post('/api/fixed-assets', { input: input(), actorName: 'x', actorRole: 'ACCOUNTANT' }, TOKEN)).status, 403);
  });
  await t('تسجيل مولد وأرض', async () => {
    assert.equal((await apost('/api/fixed-assets', { input: input({ name: 'مولد', assetType: 'GENERATOR', cost: 60000, usefulLifeMonths: 120 }), ...actor })).status, 201);
    assert.equal((await apost('/api/fixed-assets', { input: input({ name: 'أرض', assetType: 'LAND', cost: 500000, usefulLifeMonths: 0 }), ...actor })).status, 201);
  });
  await t('ترحيل الإهلاك مرة واحدة فقط لكل شهر', async () => {
    const r1 = await apost('/api/fixed-assets/depreciation', { throughMonth: '2026-03', ...actor });
    assert.equal(r1.status, 200); assert.equal(r1.json.monthsPosted.length, 3);
    assert.ok(r1.json.entries.every((e: any) => e.isBalanced));
    const r2 = await apost('/api/fixed-assets/depreciation', { throughMonth: '2026-03', ...actor });
    assert.equal(r2.json.entries.length, 0);
    const land = r1.json.assets.find((a: any) => a.assetType === 'LAND'); assert.equal(land.accumulatedDepreciation, 0);
  });
  await t('الميزانية في الحالة المخزّنة متوازنة (مجموع المدين = الدائن)', async () => {
    const s = (await get('/api/state')).json;
    let d = 0, c = 0;
    for (const e of s.journalEntries) for (const l of e.lines) { d += l.debit; c += l.credit; }
    assert.ok(Math.abs(d - c) < 0.01, `${d} vs ${c}`);
    assert.ok(s.accounts.some((a: any) => a.code === '1290') && s.accounts.some((a: any) => a.code === '5700'));
  });

  console.log('الاستمرارية');
  await t('الحفظ يصل إلى القرص ولا يبقى ملف مؤقت', async () => {
    await new Promise(r => setTimeout(r, 600));
    const f = path.join(tmp, 'mouhassil_db.json');
    assert.ok(fs.existsSync(f)); assert.ok(!fs.existsSync(f + '.tmp'));
    const disk = JSON.parse(fs.readFileSync(f, 'utf-8'));
    assert.equal(disk.fixedAssets.length, 4);
    assert.ok(disk.users.every((u: any) => !u.password || String(u.password).startsWith('scrypt$')), 'كلمة مرور بنص صريح على القرص');
  });

  console.log(`\n${passed} اختبارًا ناجحًا${process.exitCode ? ' — مع إخفاقات' : ''}`);
})().catch(e => { console.error(e.message); process.exitCode = 1; }).finally(() => { child.kill(); fs.rmSync(tmp, { recursive: true, force: true }); });
