import React, { useState } from 'react';
import { startOAuthFlow } from '../auth/github';

export default function LoginScreen({ onLogin }) {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await startOAuthFlow();
      onLogin();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        <h1 className="login-title">Studio CMS</h1>
        <p className="login-subtitle">Zach Miller Studio</p>
        <button
          className="login-button"
          onClick={handleLogin}
          disabled={loading}
        >
          {loading ? 'Connecting...' : 'Sign in with GitHub'}
        </button>
        {error && <p className="login-error">{error}</p>}
        <p className="login-hint">
          Authenticates via your Cloudflare Worker OAuth proxy
        </p>
      </div>
    </div>
  );
}
