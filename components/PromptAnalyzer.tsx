import React, { useState } from 'react';
import type { PromptAnalysis } from '../pages/api/analyze-prompt';

const EXAMPLE_PROMPTS = [
  {
    label: 'Vague request',
    prompt: 'Write something about climate change.',
  },
  {
    label: 'Decent but improvable',
    prompt: 'Summarize the following article about machine learning in 3 bullet points.',
  },
  {
    label: 'Well-structured',
    prompt:
      'You are a senior Python developer. Review the code below and identify any bugs, performance issues, or security vulnerabilities. For each issue found, explain: (1) the problem, (2) why it matters, and (3) how to fix it. Format your response as a numbered list.\n\n```python\n# code here\n```',
  },
];

const GRADE_COLORS: Record<string, string> = {
  A: '#22c55e',
  B: '#84cc16',
  C: '#eab308',
  D: '#f97316',
  F: '#ef4444',
};

const DIM_LABELS: Record<string, string> = {
  clarity: 'Clarity',
  specificity: 'Specificity',
  context: 'Context',
  instruction_quality: 'Instruction Quality',
  format_guidance: 'Format Guidance',
  role_persona: 'Role / Persona',
};

function ScoreBar({ score, max = 10 }: { score: number; max?: number }) {
  const pct = Math.round((score / max) * 100);
  const color = pct >= 80 ? '#22c55e' : pct >= 60 ? '#eab308' : '#ef4444';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div
        style={{
          flex: 1,
          height: 8,
          background: 'rgba(0,0,0,0.1)',
          borderRadius: 4,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: color,
            borderRadius: 4,
            transition: 'width 0.6s ease',
          }}
        />
      </div>
      <span style={{ fontSize: '0.85em', minWidth: 32, textAlign: 'right', opacity: 0.8 }}>
        {score}/{max}
      </span>
    </div>
  );
}

export default function PromptAnalyzer() {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<PromptAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showImproved, setShowImproved] = useState(false);
  const [copied, setCopied] = useState(false);

  async function analyze() {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);
    setAnalysis(null);
    setShowImproved(false);

    try {
      const res = await fetch('/api/analyze-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Analysis failed');
      } else {
        setAnalysis(data as PromptAnalysis);
      }
    } catch {
      setError('Network error — please try again');
    } finally {
      setLoading(false);
    }
  }

  function copyImproved() {
    if (!analysis) return;
    navigator.clipboard.writeText(analysis.improved_prompt).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const gradeColor = analysis ? GRADE_COLORS[analysis.grade] ?? '#94a3b8' : '#94a3b8';

  return (
    <div style={{ fontFamily: 'inherit', maxWidth: 800, margin: '0 auto' }}>
      {/* Input area */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.8em', opacity: 0.6, alignSelf: 'center' }}>
            Try an example:
          </span>
          {EXAMPLE_PROMPTS.map((ex) => (
            <button
              key={ex.label}
              onClick={() => {
                setPrompt(ex.prompt);
                setAnalysis(null);
                setError(null);
              }}
              style={{
                fontSize: '0.78em',
                padding: '3px 10px',
                borderRadius: 12,
                border: '1px solid rgba(128,128,128,0.3)',
                background: 'transparent',
                cursor: 'pointer',
                opacity: 0.75,
              }}
            >
              {ex.label}
            </button>
          ))}
        </div>

        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Paste your prompt here and click Analyze…"
          rows={6}
          style={{
            width: '100%',
            padding: '12px 14px',
            borderRadius: 8,
            border: '1px solid rgba(128,128,128,0.3)',
            background: 'transparent',
            fontFamily: 'inherit',
            fontSize: '0.95em',
            resize: 'vertical',
            boxSizing: 'border-box',
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
          <span style={{ fontSize: '0.78em', opacity: 0.5 }}>{prompt.length} / 10,000 chars</span>
          <button
            onClick={analyze}
            disabled={loading || !prompt.trim()}
            style={{
              padding: '8px 24px',
              borderRadius: 8,
              border: 'none',
              background: loading || !prompt.trim() ? 'rgba(128,128,128,0.2)' : '#6366f1',
              color: loading || !prompt.trim() ? 'inherit' : '#fff',
              fontWeight: 600,
              cursor: loading || !prompt.trim() ? 'not-allowed' : 'pointer',
              fontSize: '0.95em',
              transition: 'background 0.2s',
            }}
          >
            {loading ? 'Analyzing…' : 'Analyze Prompt'}
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 8,
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
            color: '#ef4444',
            fontSize: '0.9em',
          }}
        >
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div style={{ opacity: 0.5, fontSize: '0.9em', textAlign: 'center', padding: '40px 0' }}>
          Claude is evaluating your prompt…
        </div>
      )}

      {/* Results */}
      {analysis && !loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Header: grade + summary */}
          <div
            style={{
              display: 'flex',
              gap: 20,
              alignItems: 'flex-start',
              padding: '20px 24px',
              borderRadius: 12,
              border: `2px solid ${gradeColor}33`,
              background: `${gradeColor}0d`,
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: gradeColor,
                color: '#fff',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: '1.6em', fontWeight: 700, lineHeight: 1 }}>
                {analysis.grade}
              </span>
              <span style={{ fontSize: '0.65em', opacity: 0.85 }}>{analysis.overall_score}/100</span>
            </div>
            <div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Overall Score: {analysis.overall_score}/100</div>
              <div style={{ opacity: 0.8, fontSize: '0.95em' }}>{analysis.summary}</div>
            </div>
          </div>

          {/* Dimension scores */}
          <div
            style={{
              padding: '20px 24px',
              borderRadius: 12,
              border: '1px solid rgba(128,128,128,0.2)',
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 16 }}>Dimension Scores</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {Object.entries(analysis.dimensions).map(([key, dim]) => (
                <div key={key}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: 4,
                      fontSize: '0.88em',
                    }}
                  >
                    <span style={{ fontWeight: 500 }}>{DIM_LABELS[key] ?? key}</span>
                    <span style={{ opacity: 0.65, fontSize: '0.92em' }}>{dim.notes}</span>
                  </div>
                  <ScoreBar score={dim.score} />
                </div>
              ))}
            </div>
          </div>

          {/* Issues + Improvements side by side */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div
              style={{
                padding: '20px 24px',
                borderRadius: 12,
                border: '1px solid rgba(239,68,68,0.25)',
                background: 'rgba(239,68,68,0.04)',
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 12, color: '#ef4444' }}>
                Issues Found
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {analysis.issues.map((issue, i) => (
                  <li key={i} style={{ fontSize: '0.9em', opacity: 0.85 }}>
                    {issue}
                  </li>
                ))}
              </ul>
            </div>

            <div
              style={{
                padding: '20px 24px',
                borderRadius: 12,
                border: '1px solid rgba(34,197,94,0.25)',
                background: 'rgba(34,197,94,0.04)',
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 12, color: '#22c55e' }}>
                How to Improve
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {analysis.improvements.map((tip, i) => (
                  <li key={i} style={{ fontSize: '0.9em', opacity: 0.85 }}>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Relevant techniques */}
          {analysis.techniques.length > 0 && (
            <div
              style={{
                padding: '20px 24px',
                borderRadius: 12,
                border: '1px solid rgba(99,102,241,0.25)',
                background: 'rgba(99,102,241,0.04)',
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 12, color: '#6366f1' }}>
                Techniques to Learn
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {analysis.techniques.map((tech, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <a
                      href={tech.path}
                      style={{
                        fontWeight: 600,
                        fontSize: '0.9em',
                        color: '#6366f1',
                        textDecoration: 'none',
                        minWidth: 180,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      → {tech.name}
                    </a>
                    <span style={{ fontSize: '0.88em', opacity: 0.7 }}>{tech.relevance}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Improved prompt */}
          <div
            style={{
              padding: '20px 24px',
              borderRadius: 12,
              border: '1px solid rgba(128,128,128,0.2)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              <div style={{ fontWeight: 600 }}>Improved Prompt</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setShowImproved((v) => !v)}
                  style={{
                    fontSize: '0.82em',
                    padding: '4px 12px',
                    borderRadius: 6,
                    border: '1px solid rgba(128,128,128,0.3)',
                    background: 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  {showImproved ? 'Hide' : 'Show'}
                </button>
                {showImproved && (
                  <button
                    onClick={copyImproved}
                    style={{
                      fontSize: '0.82em',
                      padding: '4px 12px',
                      borderRadius: 6,
                      border: '1px solid rgba(128,128,128,0.3)',
                      background: 'transparent',
                      cursor: 'pointer',
                    }}
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                )}
              </div>
            </div>
            {showImproved && (
              <pre
                style={{
                  margin: 0,
                  padding: '14px 16px',
                  borderRadius: 8,
                  background: 'rgba(0,0,0,0.05)',
                  fontSize: '0.88em',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontFamily: 'monospace',
                }}
              >
                {analysis.improved_prompt}
              </pre>
            )}
            {!showImproved && (
              <p style={{ margin: 0, opacity: 0.5, fontSize: '0.88em' }}>
                Claude has rewritten your prompt applying all suggested improvements. Click Show to reveal it.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
