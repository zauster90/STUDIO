import { verifyPassword, signSession } from './api/_lib.js';

function loginPage(error = '') {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin Login — ZM Studio</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Karla', -apple-system, BlinkMacSystemFont, sans-serif;
      background: #f5f5f0;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      color: #1a1a1a;
    }
    .login-card {
      background: #fff;
      border: 1px solid #e0e0d8;
      padding: 2.5rem 2rem;
      width: 100%;
      max-width: 360px;
    }
    h1 {
      font-size: 1.1rem;
      font-weight: 500;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      margin-bottom: 0.25rem;
    }
    .subtitle {
      font-size: 0.8rem;
      color: #888;
      margin-bottom: 2rem;
    }
    .error {
      background: #fde8e8;
      border: 1px solid #f5c6c6;
      color: #c0392b;
      padding: 0.6rem 0.8rem;
      font-size: 0.85rem;
      margin-bottom: 1rem;
    }
    input[type="password"] {
      width: 100%;
      padding: 0.65rem 0.75rem;
      border: 1px solid #d0d0c8;
      font-size: 0.9rem;
      font-family: inherit;
      background: #fafaf8;
      margin-bottom: 1rem;
      outline: none;
      transition: border-color 0.15s;
    }
    input[type="password"]:focus { border-color: #1a1a1a; background: #fff; }
    button {
      width: 100%;
      padding: 0.65rem;
      background: #1a1a1a;
      color: #fff;
      border: none;
      font-family: inherit;
      font-size: 0.9rem;
      font-weight: 500;
      letter-spacing: 0.03em;
      cursor: pointer;
      transition: background 0.15s;
    }
    button:hover { background: #333; }
  </style>
</head>
<body>
  <div class="login-card">
    <h1>ZM Studio</h1>
    <p class="subtitle">Content Manager</p>
    ${error ? `<div class="error">${error}</div>` : ''}
    <form method="POST" action="/admin/login">
      <input type="password" name="password" placeholder="Password" required autofocus autocomplete="current-password">
      <button type="submit">Sign in</button>
    </form>
  </div>
</body>
</html>`;
}

export async function onRequestGet() {
  return new Response(loginPage(), { headers: { 'Content-Type': 'text/html;charset=UTF-8' } });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  let password = '';
  try {
    const form = await request.formData();
    password = form.get('password') || '';
  } catch {
    return new Response(loginPage('Invalid request.'), {
      status: 400,
      headers: { 'Content-Type': 'text/html;charset=UTF-8' },
    });
  }

  const valid = await verifyPassword(password, env.ADMIN_PASSWORD_HASH);
  if (!valid) {
    return new Response(loginPage('Incorrect password.'), {
      status: 401,
      headers: { 'Content-Type': 'text/html;charset=UTF-8' },
    });
  }

  const sessionValue = await signSession({ loggedIn: true, ts: Date.now() }, env.SESSION_SECRET);
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toUTCString();

  return new Response(null, {
    status: 302,
    headers: {
      Location: '/admin/',
      'Set-Cookie': `admin_session=${sessionValue}; HttpOnly; Secure; SameSite=Lax; Path=/; Expires=${expires}`,
    },
  });
}
