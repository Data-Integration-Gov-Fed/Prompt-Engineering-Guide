import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/Header';

function renderContent(text) {
  const lines = text.split('\n');
  const elements = [];
  let key = 0;
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line) { elements.push(<br key={key++} />); continue; }
    const isBullet = /^[-•]\s/.test(line);
    const isNumbered = /^\d+\.\s/.test(line);
    const rendered = line
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    if (isBullet) {
      elements.push(<li key={key++} style={styles.li} dangerouslySetInnerHTML={{ __html: rendered.replace(/^[-•]\s/, '') }} />);
    } else if (isNumbered) {
      elements.push(<li key={key++} style={{ ...styles.li, listStyleType: 'decimal', marginLeft: 20 }} dangerouslySetInnerHTML={{ __html: rendered }} />);
    } else {
      elements.push(<p key={key++} style={styles.contentP} dangerouslySetInnerHTML={{ __html: rendered }} />);
    }
  }
  return elements;
}

export default function ModuleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const tech = JSON.parse(localStorage.getItem('tepo_tech') || '{}');

  const [module, setModule] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [view, setView] = useState('learn'); // 'learn' | 'quiz' | 'results'
  const [qIdx, setQIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [progressId, setProgressId] = useState(null);
  const startTime = useRef(Date.now());

  useEffect(() => {
    Promise.all([
      fetch(`/api/modules/${id}`).then(r => r.json()),
      fetch(`/api/questions/${id}`).then(r => r.json())
    ]).then(([mod, qs]) => {
      setModule(mod);
      setQuestions(qs);
    });
  }, [id]);

  async function startQuiz() {
    startTime.current = Date.now();
    const res = await fetch('/api/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tech_name: tech.name,
        tech_email: tech.email,
        module_id: id,
        module_title: module.title,
        status: 'in_progress',
        training_type: tech.training_type,
        attempts: 1
      })
    });
    const data = await res.json();
    setProgressId(data.id);
    setQIdx(0);
    setSelected(null);
    setAnswers([]);
    setView('quiz');
  }

  function selectAnswer(idx) {
    if (selected !== null) return;
    setSelected(idx);
  }

  async function nextQuestion() {
    const newAnswers = [...answers, { question: questions[qIdx], selected }];
    if (qIdx + 1 < questions.length) {
      setAnswers(newAnswers);
      setQIdx(qIdx + 1);
      setSelected(null);
    } else {
      const score = newAnswers.filter(a => a.selected === a.question.correct_index).length;
      const minutes = Math.round((Date.now() - startTime.current) / 60000);
      setAnswers(newAnswers);
      if (progressId) {
        await fetch(`/api/progress/${progressId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'completed',
            score,
            total_questions: questions.length,
            completed_date: new Date().toISOString(),
            time_spent_minutes: minutes || 1
          })
        });
      }
      setView('results');
    }
  }

  if (!module) return <div style={styles.page}><Header /><p style={{ textAlign: 'center', marginTop: 48 }}>Loading…</p></div>;

  const score = answers.filter(a => a.selected === a.question.correct_index).length;
  const pct = questions.length ? Math.round((score / questions.length) * 100) : 0;
  const passed = pct >= 70;

  return (
    <div style={styles.page}>
      <Header />
      <main style={styles.main}>

        {/* ── LEARN ── */}
        {view === 'learn' && (
          <div>
            <button className="btn btn-secondary" style={{ marginBottom: 20 }} onClick={() => navigate('/modules')}>
              ← Back to Modules
            </button>
            <div className="card" style={styles.learnCard}>
              <div style={styles.learnHeader}>
                <span style={styles.learnNum}>Module {module.order_num}</span>
                <h1 style={styles.learnTitle}>{module.title}</h1>
              </div>
              <div style={styles.contentBody}>
                {renderContent(module.content)}
              </div>
              <div style={styles.learnFooter}>
                <p style={styles.quizNote}>Ready? This module has {questions.length} quiz questions.</p>
                <button className="btn btn-primary" onClick={startQuiz}>
                  Start Quiz →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── QUIZ ── */}
        {view === 'quiz' && questions.length > 0 && (
          <div style={styles.quizWrap}>
            <div style={styles.quizHeader}>
              <span style={styles.quizProgress}>Question {qIdx + 1} of {questions.length}</span>
              <div style={{ flex: 1 }}>
                <div className="progress-bar-wrap">
                  <div className="progress-bar-fill" style={{ width: `${((qIdx) / questions.length) * 100}%` }} />
                </div>
              </div>
            </div>

            <div className="card" style={styles.quizCard}>
              <p style={styles.questionText}>{questions[qIdx].question}</p>
              <div style={styles.options}>
                {questions[qIdx].options.map((opt, i) => {
                  let bg = 'var(--gray-50)', border = 'var(--gray-300)', color = 'var(--gray-700)';
                  if (selected !== null) {
                    if (i === questions[qIdx].correct_index) { bg = '#d1fae5'; border = '#059669'; color = '#065f46'; }
                    else if (i === selected && i !== questions[qIdx].correct_index) { bg = '#fee2e2'; border = '#dc2626'; color = '#7f1d1d'; }
                  }
                  const labels = ['A', 'B', 'C', 'D'];
                  return (
                    <button
                      key={i}
                      style={{ ...styles.optionBtn, background: bg, borderColor: border, color }}
                      onClick={() => selectAnswer(i)}
                      disabled={selected !== null}
                    >
                      <span style={{ ...styles.optLabel, borderColor: border, color }}>{labels[i]}</span>
                      {opt}
                    </button>
                  );
                })}
              </div>

              {selected !== null && (
                <div style={{
                  ...styles.explanation,
                  background: selected === questions[qIdx].correct_index ? '#d1fae5' : '#fee2e2',
                  borderColor: selected === questions[qIdx].correct_index ? '#059669' : '#dc2626'
                }}>
                  <strong>{selected === questions[qIdx].correct_index ? '✓ Correct!' : '✗ Incorrect'}</strong>
                  <p style={{ marginTop: 4 }}>{questions[qIdx].explanation}</p>
                </div>
              )}

              {selected !== null && (
                <button className="btn btn-primary" style={{ marginTop: 16, alignSelf: 'flex-end' }} onClick={nextQuestion}>
                  {qIdx + 1 < questions.length ? 'Next →' : 'See Results →'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── RESULTS ── */}
        {view === 'results' && (
          <div>
            <div className="card" style={styles.resultsCard}>
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{ fontSize: '4rem', fontWeight: 900, color: passed ? '#059669' : '#dc2626' }}>
                  {pct}%
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: passed ? '#059669' : '#dc2626', marginTop: 4 }}>
                  {passed ? '🎉 Passed!' : 'Not Passed'}
                </div>
                <div style={{ color: '#4b5563', marginTop: 8 }}>
                  {score} of {questions.length} correct
                  {!passed && ' — 70% required to pass'}
                </div>
              </div>

              <div style={styles.reviewList}>
                {answers.map((a, i) => {
                  const correct = a.selected === a.question.correct_index;
                  return (
                    <div key={i} style={{ ...styles.reviewItem, borderColor: correct ? '#059669' : '#dc2626', background: correct ? '#f0fdf4' : '#fff5f5' }}>
                      <div style={styles.reviewTop}>
                        <span style={{ fontWeight: 700, color: correct ? '#059669' : '#dc2626' }}>
                          {correct ? '✓' : '✗'} Q{i + 1}
                        </span>
                        <span style={{ color: '#374151', fontWeight: 600 }}>{a.question.question}</span>
                      </div>
                      <div style={styles.reviewAnswer}>
                        <span style={styles.reviewLabel}>Your answer:</span>
                        <span style={{ color: correct ? '#059669' : '#dc2626' }}>
                          {a.question.options[a.selected]}
                        </span>
                      </div>
                      {!correct && (
                        <div style={styles.reviewAnswer}>
                          <span style={styles.reviewLabel}>Correct:</span>
                          <span style={{ color: '#059669' }}>{a.question.options[a.question.correct_index]}</span>
                        </div>
                      )}
                      <div style={styles.reviewExplanation}>{a.question.explanation}</div>
                    </div>
                  );
                })}
              </div>

              <div style={styles.resultsBtns}>
                <button className="btn btn-secondary" onClick={() => { setView('learn'); setSelected(null); setAnswers([]); }}>
                  Review Module
                </button>
                <button className="btn btn-primary" onClick={() => navigate('/modules')}>
                  Back to Modules
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', background: 'var(--gray-50)' },
  main: { maxWidth: 820, margin: '0 auto', padding: '28px 20px' },
  learnCard: { padding: '28px 32px' },
  learnHeader: { marginBottom: 24, borderBottom: '1px solid #f1f5f9', paddingBottom: 16 },
  learnNum: { fontSize: '0.75rem', fontWeight: 700, color: '#0d9488', textTransform: 'uppercase', letterSpacing: '0.1em' },
  learnTitle: { fontSize: '1.5rem', fontWeight: 800, color: '#0a1628', marginTop: 4 },
  contentBody: { lineHeight: 1.7, color: '#374151' },
  contentP: { marginBottom: 8 },
  li: { marginLeft: 20, marginBottom: 6, listStyleType: 'disc' },
  learnFooter: { marginTop: 32, paddingTop: 20, borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' },
  quizNote: { color: '#4b5563', fontSize: '0.9rem' },
  quizWrap: {},
  quizHeader: { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 },
  quizProgress: { whiteSpace: 'nowrap', fontWeight: 700, color: '#0a1628', fontSize: '0.9rem' },
  quizCard: { padding: '28px 32px', display: 'flex', flexDirection: 'column' },
  questionText: { fontSize: '1.1rem', fontWeight: 700, color: '#0a1628', marginBottom: 20, lineHeight: 1.4 },
  options: { display: 'flex', flexDirection: 'column', gap: 10 },
  optionBtn: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '13px 16px', borderRadius: 10, border: '1.5px solid',
    textAlign: 'left', fontSize: '0.93rem', fontWeight: 500,
    cursor: 'pointer', transition: 'all 0.15s', lineHeight: 1.4,
  },
  optLabel: {
    width: 26, height: 26, borderRadius: '50%', border: '1.5px solid',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '0.78rem', fontWeight: 800, flexShrink: 0,
  },
  explanation: {
    marginTop: 16, padding: '14px 16px', borderRadius: 10,
    border: '1.5px solid', fontSize: '0.9rem', lineHeight: 1.5, color: '#1f2937',
  },
  resultsCard: { padding: '32px' },
  reviewList: { display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 },
  reviewItem: { padding: '14px 16px', borderRadius: 10, border: '1.5px solid', display: 'flex', flexDirection: 'column', gap: 6 },
  reviewTop: { display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: '0.9rem' },
  reviewAnswer: { display: 'flex', gap: 8, fontSize: '0.85rem', flexWrap: 'wrap' },
  reviewLabel: { color: '#94a3b8', fontWeight: 600 },
  reviewExplanation: { fontSize: '0.82rem', color: '#4b5563', fontStyle: 'italic', marginTop: 2 },
  resultsBtns: { display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' },
};
