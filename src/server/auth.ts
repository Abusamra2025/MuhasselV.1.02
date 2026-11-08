// تصميم م. أبو أحمد — مصمم ومنفذ Claude — © الحقوق محفوظة
// رموز الجلسة الموقّعة (HMAC) + تحديد محاولات الدخول الفاشلة.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const b64 = (b: Buffer) => b.toString('base64url');

/** سرّ التوقيع: يُولَّد مرة واحدة ويُحفظ في مجلد البيانات (أو من SESSION_SECRET). */
export function loadSecret(dataDir: string): Buffer {
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 16) {
    return Buffer.from(process.env.SESSION_SECRET, 'utf8');
  }
  const file = path.join(dataDir, 'session_secret.key');
  try {
    if (fs.existsSync(file)) {
      const v = fs.readFileSync(file);
      if (v.length >= 32) return v;
    }
  } catch { /* نولّد سرًا جديدًا */ }
  const secret = crypto.randomBytes(48);
  try {
    fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(file, secret, { mode: 0o600 });
  } catch (e) {
    console.warn('[Auth] تعذّر حفظ سرّ الجلسات؛ ستنتهي الجلسات عند إعادة التشغيل');
  }
  return secret;
}

export const TOKEN_TTL_MS = 14 * 24 * 60 * 60 * 1000;

export function signToken(secret: Buffer, uid: string, ttlMs = TOKEN_TTL_MS): string {
  const payload = b64(Buffer.from(JSON.stringify({ uid, exp: Date.now() + ttlMs })));
  const sig = b64(crypto.createHmac('sha256', secret).update(payload).digest());
  return `${payload}.${sig}`;
}

export function verifyToken(secret: Buffer, token: string | undefined | null): { uid: string } | null {
  if (!token || typeof token !== 'string') return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest();
  let given: Buffer;
  try { given = Buffer.from(sig, 'base64url'); } catch { return null; }
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data?.uid || typeof data.exp !== 'number' || data.exp < Date.now()) return null;
    return { uid: String(data.uid) };
  } catch { return null; }
}

/** محدِّد محاولات الدخول الفاشلة: 8 محاولات لكل (عنوان + مستخدم) خلال 15 دقيقة. */
export class LoginLimiter {
  private fails = new Map<string, { n: number; until: number; first: number }>();
  constructor(private max = 8, private windowMs = 15 * 60 * 1000) {}
  retryAfterMs(key: string): number {
    const e = this.fails.get(key);
    if (!e) return 0;
    if (Date.now() - e.first > this.windowMs && e.until < Date.now()) { this.fails.delete(key); return 0; }
    return Math.max(0, e.until - Date.now());
  }
  fail(key: string) {
    const now = Date.now();
    let e = this.fails.get(key);
    if (!e || now - e.first > this.windowMs) e = { n: 0, until: 0, first: now };
    e.n++;
    if (e.n >= this.max) e.until = now + this.windowMs;
    this.fails.set(key, e);
  }
  success(key: string) { this.fails.delete(key); }
}
