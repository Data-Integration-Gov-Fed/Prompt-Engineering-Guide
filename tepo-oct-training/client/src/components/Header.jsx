import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Header() {
  const navigate = useNavigate();
  const raw = localStorage.getItem('tepo_tech');
  const tech = raw ? JSON.parse(raw) : null;

  function logout() {
    localStorage.removeItem('tepo_tech');
    navigate('/');
  }

  return (
    <header className="header">
      <div className="header-brand">
        <span className="header-icon">👁️</span>
        <div>
          <span className="header-subtitle">The Eye Place Optometry</span>
          <span className="header-title">T.E.P.O. OCT Training</span>
        </div>
      </div>
      {tech && (
        <div className="header-right">
          <div className="header-tech">
            <div className="header-tech-name">{tech.name}</div>
            <div className="header-tech-type">
              {tech.training_type === 'new_hire' ? 'New Hire' : 'Quarterly Review'}
            </div>
          </div>
          <button className="btn-logout" onClick={logout}>Logout</button>
        </div>
      )}
    </header>
  );
}
