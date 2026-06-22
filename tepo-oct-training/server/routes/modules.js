const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (_req, res) => {
  const modules = db.prepare(
    'SELECT * FROM training_modules WHERE is_active = 1 ORDER BY order_num'
  ).all();
  res.json(modules);
});

router.get('/:id', (req, res) => {
  const module = db.prepare('SELECT * FROM training_modules WHERE id = ?').get(req.params.id);
  if (!module) return res.status(404).json({ error: 'Module not found' });
  res.json(module);
});

module.exports = router;
