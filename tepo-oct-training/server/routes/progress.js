const express = require('express');
const router = express.Router();
const db = require('../db');
const { v4: uuidv4 } = require('uuid');

router.post('/', (req, res) => {
  const { tech_name, tech_email, module_id, module_title, status, score, total_questions, attempts, time_spent_minutes, training_type } = req.body;
  const id = uuidv4();
  db.prepare(`
    INSERT INTO tech_progress (id, tech_name, tech_email, module_id, module_title, status, score, total_questions, attempts, time_spent_minutes, training_type)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, tech_name, tech_email, module_id, module_title, status, score ?? null, total_questions ?? null, attempts ?? 1, time_spent_minutes ?? null, training_type);
  res.status(201).json({ id });
});

router.put('/:id', (req, res) => {
  const { status, score, total_questions, attempts, completed_date, time_spent_minutes } = req.body;
  db.prepare(`
    UPDATE tech_progress
    SET status = COALESCE(?, status),
        score = COALESCE(?, score),
        total_questions = COALESCE(?, total_questions),
        attempts = COALESCE(?, attempts),
        completed_date = COALESCE(?, completed_date),
        time_spent_minutes = COALESCE(?, time_spent_minutes)
    WHERE id = ?
  `).run(status, score ?? null, total_questions ?? null, attempts ?? null, completed_date ?? null, time_spent_minutes ?? null, req.params.id);
  res.json({ success: true });
});

router.get('/', (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ error: 'email query param required' });
  const rows = db.prepare('SELECT * FROM tech_progress WHERE tech_email = ?').all(email);
  res.json(rows);
});

module.exports = router;
