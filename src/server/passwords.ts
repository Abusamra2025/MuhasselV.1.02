/**
 * تصميم م. أبو أحمد — مصمم ومنفذ Claude — © الحقوق محفوظة
 *
 * أدوات كلمات المرور في الخادم:
 *  - تشفير كلمات المرور بخوارزمية scrypt مع ملح عشوائي (بدون أي تبعيات خارجية).
 *  - التحقق بزمن ثابت.
 *  - دعم الحسابات القديمة المخزّنة بنص صريح (تُرقّى تلقائيًا إلى مشفّرة عند أول دخول ناجح).
 *  - تنقية بيانات المستخدمين قبل إرسالها للمتصفح.
 */

import crypto from 'node:crypto';
import type { UserProfile } from '../types';

const PREFIX = 'scrypt$';

export function isHashedPassword(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith(PREFIX);
}

export function hashPassword(plain: string): string {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(plain, salt, 64);
  return `${PREFIX}${salt.toString('hex')}$${key.toString('hex')}`;
}

/** يتحقق من كلمة مرور مقابل قيمة مخزّنة (مشفّرة أو نص صريح قديم) */
export function verifyPassword(plain: string, stored?: string | null): boolean {
  if (!plain || !stored) return false;

  if (isHashedPassword(stored)) {
    const parts = stored.split('$');
    if (parts.length !== 3) return false;
    try {
      const salt = Buffer.from(parts[1], 'hex');
      const expected = Buffer.from(parts[2], 'hex');
      const actual = crypto.scryptSync(plain, salt, expected.length);
      return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
    } catch {
      return false;
    }
  }

  // حساب قديم بنص صريح: مقارنة بزمن ثابت
  const a = Buffer.from(plain.trim());
  const b = Buffer.from(String(stored).trim());
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

/** كلمة مرور عشوائية قوية (بدون أحرف ملتبسة مثل O/0 و l/1) */
export function generatePassword(length = 14): string {
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

/**
 * نسخة المستخدم الآمنة للإرسال للمتصفح:
 *  - لا تُرسل كلمة المرور (المشفّرة أو القديمة) أبدًا.
 *  - كلمة المرور المؤقتة (initialPassword) تُرسل فقط لغير المدير العام وما دام مطلوبًا منه تغييرها،
 *    لتتمكن الإدارة من تسليمها للموظف.
 */
export function sanitizeUser(user: UserProfile): UserProfile {
  const { password: _password, initialPassword, ...rest } = user as UserProfile & { password?: string };
  const keepTemp = user.role !== 'ADMIN' && user.mustChangePasswordOnNextLogin === true && !!initialPassword;
  return keepTemp ? ({ ...rest, initialPassword } as UserProfile) : (rest as UserProfile);
}

export function sanitizeUsers(users: UserProfile[]): UserProfile[] {
  return users.map(sanitizeUser);
}
