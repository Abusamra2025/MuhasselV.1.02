// تصميم م. أبو أحمد — مصمم ومنفذ Claude — © الحقوق محفوظة
// رمز الجلسة: يُحفظ عند الدخول ويُرفق تلقائيًا بكل طلب إلى /api.
const KEY = 'muhassil_token';

export const getToken = (): string => {
  try { return localStorage.getItem(KEY) || ''; } catch { return ''; }
};
export const setToken = (t: string) => { try { localStorage.setItem(KEY, t); } catch {} };
export const clearToken = () => { try { localStorage.removeItem(KEY); } catch {} };

/** يضيف الرمز إلى رابط (للتنزيلات والبث الحي التي لا تقبل ترويسات) */
export const withToken = (url: string): string => {
  const t = getToken();
  if (!t) return url;
  return url + (url.includes('?') ? '&' : '?') + 'token=' + encodeURIComponent(t);
};

let installed = false;
export function installFetchAuth() {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  const orig = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.pathname : (input as Request).url;
    const isApi = typeof url === 'string' && (url.startsWith('/api/') || url.includes(location.origin + '/api/'));
    const isLogin = typeof url === 'string' && url.includes('/api/auth/login');
    if (!isApi || isLogin) return orig(input, init);
    const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
    const t = getToken();
    if (t && !headers.has('Authorization')) headers.set('Authorization', 'Bearer ' + t);
    const res = await orig(input, { ...init, headers });
    if (res.status === 401 && t) {
      // انتهت الجلسة أو أُلغيت: نعيد المستخدم إلى شاشة الدخول
      clearToken();
      try { localStorage.removeItem('muhassil_current_user'); } catch {}
      if (!sessionStorage.getItem('muhassil_reloading')) {
        sessionStorage.setItem('muhassil_reloading', '1');
        location.reload();
      }
    } else if (res.ok) {
      try { sessionStorage.removeItem('muhassil_reloading'); } catch {}
    }
    return res;
  };
}
