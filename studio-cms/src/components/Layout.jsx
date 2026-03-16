import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { clearToken } from '../auth/github';

export default function Layout({ children }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    clearToken();
    window.location.reload();
  };

  return (
    <div className="cms-layout">
      <aside className="cms-sidebar">
        <div className="cms-sidebar-header">
          <h1 className="cms-site-name">Studio CMS</h1>
          <p className="cms-site-tagline">Content Manager</p>
        </div>

        <nav className="cms-nav">
          <NavLink to="/" end className="cms-nav-item">
            Works
          </NavLink>
          <NavLink to="/media" className="cms-nav-item">
            Media Library
          </NavLink>
          <a
            href="https://zach-miller-studio.com"
            target="_blank"
            rel="noopener noreferrer"
            className="cms-nav-item cms-nav-external"
          >
            View Site &rarr;
          </a>
        </nav>

        <div className="cms-sidebar-footer">
          <button onClick={handleLogout} className="cms-logout-btn">
            Sign Out
          </button>
        </div>
      </aside>

      <main className="cms-main">{children}</main>
    </div>
  );
}
