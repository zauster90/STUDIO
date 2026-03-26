import { verifySession } from './api/_lib.js';

function parseCookies(header) {
  const cookies = {};
  if (!header) return cookies;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    cookies[key] = part.slice(eq + 1).trim();
  }
  return cookies;
}

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/$/, '') || '/';

  const cookies = parseCookies(request.headers.get('Cookie'));
  const payload = cookies.admin_session
    ? await verifySession(cookies.admin_session, env.SESSION_SECRET).catch(() => null)
    : null;
  const isAuthenticated = !!payload;

  // Login page — let through unauthenticated; redirect authenticated to dashboard
  if (path === '/admin/login') {
    if (isAuthenticated) {
      return Response.redirect(new URL('/admin/', request.url), 302);
    }
    return next();
  }

  // All other /admin/* — require auth
  if (!isAuthenticated) {
    if (path.startsWith('/admin/api/')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return Response.redirect(new URL('/admin/login', request.url), 302);
  }

  return next();
}
