const express = require('express');
const router = express.Router();
const db = require('../db');

const PIN = process.env.SUPERVISOR_PIN || 'TEPO2024';

function checkPin(req, res, next) {
  if (req.headers['x-supervisor-pin'] !== PIN) {
    return res.status(401).json({ error: 'Invalid PIN' });
  }
  next();
}

router.get('/progress', checkPin, (_req, res) => {
  const rows = db.prepare('SELECT * FROM tech_progress ORDER BY tech_name, module_id').all();
  res.json(rows);
});

router.get('/export', checkPin, (_req, res) => {
  const rows = db.prepare('SELECT * FROM tech_progress ORDER BY tech_name, module_id').all();

  const headers = ['id', 'tech_name', 'tech_email', 'module_id', 'module_title', 'status', 'score', 'total_questions', 'attempts', 'completed_date', 'time_spent_minutes', 'training_type'];
  const escape = v => {
    if (v == null) return '';
    const s = String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const csv = [
    headers.join(','),
    ...rows.map(r => headers.map(h => escape(r[h])).join(','))
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="tepo_progress_export.csv"');
  res.send(csv);
});

module.exports = router;
