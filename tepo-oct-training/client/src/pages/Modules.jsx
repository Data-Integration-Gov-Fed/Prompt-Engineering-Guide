import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';

const STATUS_LABEL = { completed: 'Completed ✓', in_progress: 'In Progress', not_started: 'Not Started' };

export default function Modules() {
  const navigate = useNavigate();
  const tech = JSON.parse(localStorage.getItem('tepo_tech') || '{}');
  const [modules, setModules] = useState([]);
  const [progressMap, setProgressMap] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/modules').then(r => r.json()),
      fetch(`/api/progress?email=${encodeURIComponent(tech.email)}`).then(r => r.json())
    ]).then(([mods, prog]) => {
      setModules(mods);
      const map = {};
      for (const p of prog) {
        if (!map[p.module_id] || p.status === 'completed') map[p.module_id] = p;
      }
      setProgressMap(map);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [tech.email]);

  const completed = modules.filter(m => progressMap[m.id]?.status === 'completed').length;
  const pct = modules.length ? Math.round((completed / modules.length) * 100) : 0;

  function statusOf(mod) {
    return progressMap[mod.id]?.status || 'not_started';
  }

  if (loading) return <div style={styles.loading}><Header /><p style={{ textAlign: 'center', marginTop: 48 }}>Loading modules…</p></div>;

  return (
    <div style={styles.page}>
      <Header />
      <main style={styles.main}>
        <div style={styles.overview}>
          <div style={styles.overviewText}>
            <h1 style={styles.overviewTitle}>Training Dashboard</h1>
            <p style={styles.overviewSub}>{completed} of {modules.length} modules completed</p>
          </div>
          <div style={styles.overviewBarWrap}>
            <div style={styles.overviewBarRow}>
              <span style={styles.pct}>{pct}%</span>
            </div>
            <div className="progress-bar-wrap" style={{ height: 12 }}>
              <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>

        <div style={styles.grid}>
          {modules.map((mod, i) => {
            const status = statusOf(mod);
            const prog = progressMap[mod.id];
            return (
              <div
                key={mod.id}
                className="card"
                style={{
                  ...styles.modCard,
                  borderTop: status === 'completed' ? '3px solid #059669'
                    : status === 'in_progress' ? '3px solid #ca8a04' : '3px solid #e2e8f0'
                }}
                onClick={() => navigate(`/module/${mod.id}`)}
              >
                <div style={styles.modCardTop}>
                  <div style={styles.modNum}>{String(i + 1).padStart(2, '0')}</div>
                  <span className={`badge badge-${status}`}>{STATUS_LABEL[status]}</span>
                </div>
                <h3 style={styles.modTitle}>{mod.title}</h3>
                <p style={styles.modDesc}>{mod.description}</p>
                {status === 'completed' && prog && (
                  <div style={styles.scoreRow}>
                    <span style={styles.scoreLabel}>Score:</span>
                    <span style={{
                      ...styles.scoreVal,
                      color: (prog.score / prog.total_questions) >= 0.7 ? '#059669' : '#dc2626'
                    }}>
                      {prog.score}/{prog.total_questions} ({Math.round((prog.score / prog.total_questions) * 100)}%)
                    </span>
                  </div>
                )}
                <div style={styles.startBtn}>
                  {status === 'not_started' ? 'Start Module →' : status === 'in_progress' ? 'Continue →' : 'Review →'}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', background: 'var(--gray-50)' },
  main: { maxWidth: 1100, margin: '0 auto', padding: '28px 20px' },
  loading: { minHeight: '100vh' },
  overview: {
    background: 'linear-gradient(135deg, #0a1628, #0f2040)',
    borderRadius: 16,
    padding: '24px 28px',
    marginBottom: 28,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 24,
    flexWrap: 'wrap',
  },
  overviewText: {},
  overviewTitle: { color: '#ffffff', fontSize: '1.4rem', fontWeight: 800 },
  overviewSub: { color: '#94a3b8', fontSize: '0.88rem', marginTop: 4 },
  overviewBarWrap: { flex: '1', minWidth: 200, maxWidth: 340 },
  overviewBarRow: { display: 'flex', justifyContent: 'flex-end', marginBottom: 6 },
  pct: { color: '#0d9488', fontWeight: 800, fontSize: '1rem' },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: 16,
  },
  modCard: { cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s', display: 'flex', flexDirection: 'column', gap: 10 },
  modCardTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  modNum: { fontSize: '0.8rem', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.05em' },
  modTitle: { fontSize: '0.97rem', fontWeight: 700, color: '#0a1628', lineHeight: 1.3 },
  modDesc: { fontSize: '0.82rem', color: '#4b5563', lineHeight: 1.5, flexGrow: 1 },
  scoreRow: { display: 'flex', gap: 6, alignItems: 'center' },
  scoreLabel: { fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600 },
  scoreVal: { fontSize: '0.85rem', fontWeight: 700 },
  startBtn: {
    marginTop: 4,
    fontSize: '0.82rem',
    fontWeight: 700,
    color: '#0d9488',
  },
};
