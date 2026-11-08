// تصميم م. أبو أحمد — مصمم ومنفذ Claude — © الحقوق محفوظة
// روابط مشاركة النظام مع الموظفين: تُحسب من عنوان التشغيل الفعلي بدل رابط ثابت قديم.
import { useCallback, useEffect, useState } from 'react';

const KEY = 'muhassil_public_url';

export const isLocalHost = (host: string) =>
  host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]';

const readSaved = (): string => {
  try { return localStorage.getItem(KEY) || ''; } catch { return ''; }
};

export function normalizeUrl(raw: string): string {
  let u = (raw || '').trim();
  if (!u) return '';
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
  return u.replace(/\/+$/, '');
}

export function useShareUrl() {
  const [lanUrl, setLanUrl] = useState('');
  const [customUrl, setCustomUrlState] = useState<string>(readSaved);

  useEffect(() => {
    let alive = true;
    fetch('/api/network-info')
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (alive && d?.lan?.length) setLanUrl(`http://${d.lan[0]}:${d.port}`);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const setCustomUrl = useCallback((v: string) => {
    setCustomUrlState(v);
    try { localStorage.setItem(KEY, normalizeUrl(v)); } catch {}
  }, []);

  const { origin, hostname } = window.location;
  const originIsPublic = !isLocalHost(hostname);
  const custom = normalizeUrl(customUrl);

  // الرابط العام: ما أدخله المدير، أو عنوان الصفحة الحالي إن كانت منشورة على الإنترنت
  const publicUrl = custom || (originIsPublic ? origin : '');
  // رابط الشبكة المحلية (نفس الواي فاي)
  const networkUrl = originIsPublic ? '' : lanUrl;
  // الرابط الذي يُرسل للموظفين
  const inviteUrl = publicUrl || networkUrl || origin;

  return { publicUrl, networkUrl, inviteUrl, customUrl, setCustomUrl, originIsPublic };
}
