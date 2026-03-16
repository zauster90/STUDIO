/**
 * GitHub OAuth flow using the existing Sveltia CMS Auth Cloudflare Worker.
 *
 * The worker at sveltia-cms-auth.zauster-art.workers.dev implements the
 * standard OAuth proxy pattern that Decap/Sveltia CMS uses:
 *   1. GET /auth  → redirects to GitHub OAuth authorize URL
 *   2. GET /callback → exchanges code for token, posts message to opener
 *
 * We reuse the same worker so no new infrastructure is needed.
 */

const OAUTH_BASE = import.meta.env.VITE_OAUTH_BASE_URL;
const TOKEN_KEY = 'studio_cms_github_token';

/**
 * Start the GitHub OAuth flow by opening a popup to the auth worker.
 * Returns a promise that resolves with the access token.
 */
export function startOAuthFlow() {
  return new Promise((resolve, reject) => {
    // Open popup to the auth endpoint
    const authUrl = `${OAUTH_BASE}/auth`;
    const popup = window.open(authUrl, 'github-oauth', 'width=600,height=700');

    if (!popup) {
      reject(new Error('Popup blocked — please allow popups for this site.'));
      return;
    }

    // Listen for the token message from the popup
    const handler = (event) => {
      // Sveltia/Decap auth workers post a message with the token
      if (event.data && event.data === 'authorizing:github') {
        // Initial handshake message, ignore
        return;
      }

      if (event.data && typeof event.data === 'string') {
        try {
          const data = JSON.parse(event.data);
          if (data.token) {
            window.removeEventListener('message', handler);
            saveToken(data.token);
            resolve(data.token);
            return;
          }
        } catch {
          // Not JSON, try other format
        }
      }

      // Decap CMS format: { provider: 'github', token: '...' }
      if (event.data?.provider === 'github' && event.data?.token) {
        window.removeEventListener('message', handler);
        saveToken(event.data.token);
        resolve(event.data.token);
        return;
      }

      // Sveltia format: authorization:github:success:{"token":"..."}
      if (typeof event.data === 'string' && event.data.startsWith('authorization:github:success:')) {
        const payload = JSON.parse(event.data.replace('authorization:github:success:', ''));
        window.removeEventListener('message', handler);
        saveToken(payload.token);
        resolve(payload.token);
        return;
      }

      if (typeof event.data === 'string' && event.data.startsWith('authorization:github:error:')) {
        window.removeEventListener('message', handler);
        reject(new Error(event.data.replace('authorization:github:error:', '')));
      }
    };

    window.addEventListener('message', handler);

    // Poll for popup close (user cancelled)
    const pollClose = setInterval(() => {
      if (popup.closed) {
        clearInterval(pollClose);
        window.removeEventListener('message', handler);
        reject(new Error('OAuth popup was closed'));
      }
    }, 500);
  });
}

export function saveToken(token) {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function getToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function clearToken() {
  sessionStorage.removeItem(TOKEN_KEY);
}

export function isAuthenticated() {
  return !!getToken();
}
