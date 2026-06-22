import React, { useState } from 'react';

const PIN_HEADER = 'x-supervisor-pin';

function groupByTech(rows) {
  const map = {};
  for (const r of rows) {
    if (!map[r.tech_email]) {
      map[r.tech_email] = { name: r.tech_name, email: r.tech_email, modules: [] };
    }
    map[r.tech_email].modules.push(r);
  }
  return Object.values(map);
}

function techStats(tech) {
  const completed = tech.modules.filter(m => m.status === 'completed').length;
  const total = tech.modules.length;
  const scored = tech.modules.filter(m => m.score != null && m.total_questions);
  const avgScore = scored.length
    ? Math.round(scored.reduce((s, m) => s + (m.score / m.total_questions) * 100, 0) / scored.length)
    : null;
  return { completed, total, avgScore };
}

export default function Supervisor() {
  const [pin, setPin] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [expanded, setExpanded] = useState(null);

  async function handleUnlock(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/supervisor/progress', {
        headers: { [PIN_HEADER]: pin }
      });
      if (res.status === 401) { setError('Invalid PIN. Please try again.'); setLoading(false); return; }
      const rows = await res.json();
      setData(rows);
      setUnlocked(true);
    } catch {
      setError('Failed to connect to server.');
    }
    setLoading(false);
  }

  async function handleExport() {
    const res = await fetch('/api/supervisor/export', { headers: { [PIN_HEADER]: pin } });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'tepo_progress_export.csv';
    a.click(); URL.revokeObjectURL(url);
  }

  if (!unlocked) {
    return (
      <div style={styles.lockPage}>
        <div style={styles.lockBox}>
          <div style={styles.lockIcon}>👁️</div>
          <div style={styles.lockSub}>The Eye Place Optometry</div>
          <div style={styles.lockTitle}>Supervisor Dashboard</div>
          <form onSubmit={handleUnlock} style={styles.lockForm}>
            <label style={styles.lockLabel}>Enter Supervisor PIN</label>
            <input
              style={styles.lockInput}
              type="password"
              placeholder="••••••••"
              value={pin}
              onChange={e => setPin(e.target.value)}
              autoFocus
            />
            {error && <p style={styles.lockError}>{error}</p>}
            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading ? 'Verifying…' : 'Unlock Dashboard'}
            </button>
          </form>
          <a href="/" style={styles.backLink}>← Back to Training</a>
        </div>
      </div>
    );
  }

  const techs = groupByTech(data);
  const allCompleted = techs.filter(t => techStats(t).completed === techStats(t).total && techStats(t).total > 0).length;
  const allScored = techs.flatMap(t => t.modules.filter(m => m.score != null && m.total_questions));
  const globalAvg = allScored.length
    ? Math.round(allScored.reduce((s, m) => s + (m.score / m.total_questions) * 100, 0) / allScored.length)
    : 0;
  const totalMods = data.length;

  const filteredTechs = techs.filter(t => {
    const { completed, total } = techStats(t);
    if (filter === 'completed') return completed === total && total > 0;
    if (filter === 'in_progress') return completed < total || total === 0;
    return true;
  });

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.headerBrand}>
          <span style={{ fontSize: '1.8rem' }}>👁️</span>
          <div>
            <div style={styles.headerSub}>The Eye Place Optometry</div>
            <div style={styles.headerTitle}>Supervisor Dashboard</div>
          </div>
        </div>
        <div style={styles.headerRight}>
          <button className="btn btn-secondary" style={{ fontSize: '0.82rem' }} onClick={handleExport}>
            ⬇ Export CSV
          </button>
          <a href="/" style={{ color: '#94a3b8', fontSize: '0.82rem', fontWeight: 600 }}>← Exit</a>
        </div>
      </header>

      <main style={styles.main}>
        {/* Stat cards */}
        <div style={styles.statsGrid}>
          {[
            { label: 'Total Techs', value: techs.length },
            { label: 'Fully Completed', value: allCompleted },
            { label: 'Avg Quiz Score', value: `${globalAvg}%` },
            { label: 'Total Records', value: totalMods },
          ].map(s => (
            <div key={s.label} className="card" style={styles.statCard}>
              <div style={styles.statVal}>{s.value}</div>
              <div style={styles.statLabel}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div style={styles.tabs}>
          {['all', 'completed', 'in_progress'].map(f => (
            <button
              key={f}
              style={{ ...styles.tab, ...(filter === f ? styles.tabActive : {}) }}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'All' : f === 'completed' ? 'Completed' : 'In Progress'}
            </button>
          ))}
        </div>

        {/* Tech list */}
        <div style={styles.techList}>
          {filteredTechs.length === 0 && (
            <div className="card" style={{ textAlign: 'center', color: '#94a3b8', padding: 32 }}>
              No technicians match this filter.
            </div>
          )}
          {filteredTechs.map(tech => {
            const { completed, total, avgScore } = techStats(tech);
            const pct = total ? Math.round((completed / total) * 100) : 0;
            const isExpanded = expanded === tech.email;
            return (
              <div key={tech.email} className="card" style={styles.techCard}>
                <div style={styles.techRow} onClick={() => setExpanded(isExpanded ? null : tech.email)}>
                  <div style={styles.techAvatar}>{tech.name[0].toUpperCase()}</div>
                  <div style={styles.techInfo}>
                    <div style={styles.techName}>{tech.name}</div>
                    <div style={styles.techEmail}>{tech.email}</div>
                  </div>
                  <div style={styles.techMeta}>
                    <div style={{ minWidth: 140 }}>
                      <div style={styles.techPctRow}>
                        <span style={styles.techPctLabel}>{completed}/{total} modules</span>
                        <span style={{ fontWeight: 700, color: '#0d9488' }}>{pct}%</span>
                      </div>
                      <div className="progress-bar-wrap" style={{ height: 7 }}>
                        <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    {avgScore !== null && (
                      <div style={styles.avgScore}>Avg: {avgScore}%</div>
                    )}
                    <span style={styles.chevron}>{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </div>

                {isExpanded && (
                  <div style={styles.breakdown}>
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          {['Module', 'Status', 'Score', 'Date', 'Attempts'].map(h => (
                            <th key={h} style={styles.th}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {tech.modules.map(m => {
                          const scorePct = m.score != null && m.total_questions
                            ? Math.round((m.score / m.total_questions) * 100)
                            : null;
                          return (
                            <tr key={m.id} style={styles.tr}>
                              <td style={styles.td}>{m.module_title}</td>
                              <td style={styles.td}>
                                <span className={`badge badge-${m.status}`}>
                                  {m.status === 'completed' ? 'Completed ✓' : m.status === 'in_progress' ? 'In Progress' : 'Not Started'}
                                </span>
                              </td>
                              <td style={styles.td}>
                                {scorePct !== null ? (
                                  <span style={{ fontWeight: 700, color: scorePct >= 70 ? '#059669' : '#dc2626' }}>
                                    {m.score}/{m.total_questions} ({scorePct}%)
                                  </span>
                                ) : '—'}
                              </td>
                              <td style={styles.td}>
                                {m.completed_date ? new Date(m.completed_date).toLocaleDateString() : '—'}
                              </td>
                              <td style={styles.td}>{m.attempts ?? '—'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
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
  lockPage: {
    minHeight: '100vh',
    background: 'linear-gradient(160deg, #0a1628 0%, #0f2040 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  lockBox: {
    background: '#fff', borderRadius: 16, padding: '36px 32px',
    width: '100%', maxWidth: 400, textAlign: 'center',
  },
  lockIcon: { fontSize: '2.5rem', marginBottom: 8 },
  lockSub: { fontSize: '0.7rem', fontWeight: 700, color: '#0d9488', textTransform: 'uppercase', letterSpacing: '0.15em' },
  lockTitle: { fontSize: '1.4rem', fontWeight: 800, color: '#0a1628', marginBottom: 24 },
  lockForm: { display: 'flex', flexDirection: 'column', gap: 14 },
  lockLabel: { fontSize: '0.85rem', fontWeight: 600, color: '#4b5563', textAlign: 'left' },
  lockInput: {
    padding: '11px 14px', border: '1.5px solid #cbd5e1', borderRadius: 10,
    fontSize: '1rem', fontFamily: 'inherit', width: '100%',
  },
  lockError: { color: '#dc2626', fontSize: '0.85rem', fontWeight: 600 },
  backLink: { display: 'block', marginTop: 20, color: '#94a3b8', fontSize: '0.85rem' },
  header: {
    background: 'linear-gradient(135deg, #0a1628, #0f2040)',
    padding: '16px 28px', display: 'flex', alignItems: 'center',
    justifyContent: 'space-between', gap: 16,
  },
  headerBrand: { display: 'flex', alignItems: 'center', gap: 12 },
  headerSub: { fontSize: '0.62rem', fontWeight: 700, color: '#0d9488', textTransform: 'uppercase', letterSpacing: '0.15em' },
  headerTitle: { fontSize: '1.1rem', fontWeight: 800, color: '#fff' },
  headerRight: { display: 'flex', alignItems: 'center', gap: 16 },
  main: { maxWidth: 1100, margin: '0 auto', padding: '28px 20px' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14, marginBottom: 24 },
  statCard: { textAlign: 'center', padding: '20px 16px' },
  statVal: { fontSize: '2rem', fontWeight: 900, color: '#0a1628' },
  statLabel: { fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600, marginTop: 4 },
  tabs: { display: 'flex', gap: 8, marginBottom: 20 },
  tab: {
    padding: '8px 18px', borderRadius: 8, border: '1.5px solid #e2e8f0',
    background: '#fff', fontSize: '0.85rem', fontWeight: 600, color: '#4b5563', cursor: 'pointer',
  },
  tabActive: { background: '#0d9488', color: '#fff', borderColor: '#0d9488' },
  techList: { display: 'flex', flexDirection: 'column', gap: 12 },
  techCard: { padding: 0, overflow: 'hidden' },
  techRow: {
    display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px',
    cursor: 'pointer', flexWrap: 'wrap',
  },
  techAvatar: {
    width: 42, height: 42, borderRadius: '50%',
    background: 'linear-gradient(135deg, #0d9488, #0891b2)',
    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 800, fontSize: '1rem', flexShrink: 0,
  },
  techInfo: { flex: 1, minWidth: 120 },
  techName: { fontWeight: 700, color: '#0a1628', fontSize: '0.95rem' },
  techEmail: { fontSize: '0.78rem', color: '#94a3b8' },
  techMeta: { display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' },
  techPctRow: { display: 'flex', justifyContent: 'space-between', marginBottom: 4, gap: 8 },
  techPctLabel: { fontSize: '0.75rem', color: '#94a3b8' },
  avgScore: { fontSize: '0.82rem', fontWeight: 700, color: '#4b5563' },
  chevron: { color: '#94a3b8', fontSize: '0.75rem' },
  breakdown: { padding: '0 20px 20px', overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' },
  th: { textAlign: 'left', padding: '8px 12px', color: '#94a3b8', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', borderBottom: '1px solid #f1f5f9' },
  tr: { borderBottom: '1px solid #f8fafc' },
  td: { padding: '10px 12px', color: '#374151', verticalAlign: 'middle' },
};
