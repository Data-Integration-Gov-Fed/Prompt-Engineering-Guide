import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', training_type: 'new_hire' });
  const [error, setError] = useState('');

  useEffect(() => {
    if (localStorage.getItem('tepo_tech')) navigate('/modules');
  }, [navigate]);

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError('Please enter a valid email address.');
      return;
    }
    localStorage.setItem('tepo_tech', JSON.stringify({
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      training_type: form.training_type
    }));
    navigate('/modules');
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.logoWrap}>
          <span style={styles.logoIcon}>👁️</span>
          <span style={styles.logoSub}>The Eye Place Optometry</span>
          <span style={styles.logoTitle}>T.E.P.O. OCT Training</span>
        </div>

        <div className="card" style={styles.card}>
          <h2 style={styles.cardTitle}>Welcome</h2>
          <p style={styles.cardSubtitle}>Enter your details to begin training</p>

          <form onSubmit={handleSubmit} style={styles.form}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                className="form-input"
                type="text"
                placeholder="Jane Smith"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Work Email</label>
              <input
                className="form-input"
                type="email"
                placeholder="jane@theeyeplace.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Training Type</label>
              <select
                className="form-select"
                value={form.training_type}
                onChange={e => setForm(f => ({ ...f, training_type: e.target.value }))}
              >
                <option value="new_hire">New Hire</option>
                <option value="quarterly">Quarterly Review</option>
              </select>
            </div>

            {error && <p style={styles.error}>{error}</p>}

            <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: 8 }}>
              Start Training →
            </button>
          </form>
        </div>

        <p style={styles.supervisorLink}>
          Supervisor?{' '}
          <a href="/supervisor" style={styles.link}>Access Dashboard</a>
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(160deg, #0a1628 0%, #0f2040 50%, #0a1628 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 16px',
  },
  container: {
    width: '100%',
    maxWidth: 440,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 24,
  },
  logoWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
  },
  logoIcon: { fontSize: '3rem' },
  logoSub: {
    fontSize: '0.7rem',
    fontWeight: 700,
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    color: '#0d9488',
  },
  logoTitle: {
    fontSize: '1.5rem',
    fontWeight: 800,
    color: '#ffffff',
  },
  card: { width: '100%' },
  cardTitle: { fontSize: '1.3rem', fontWeight: 800, color: '#0a1628', marginBottom: 4 },
  cardSubtitle: { fontSize: '0.88rem', color: '#4b5563', marginBottom: 20 },
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
  error: { color: '#dc2626', fontSize: '0.85rem', fontWeight: 600 },
  supervisorLink: { color: '#94a3b8', fontSize: '0.85rem' },
  link: { color: '#0d9488', fontWeight: 700 },
};
