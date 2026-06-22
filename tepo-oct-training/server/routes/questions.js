const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/:moduleId', (req, res) => {
  const questions = db.prepare(
    'SELECT * FROM quiz_questions WHERE module_id = ? ORDER BY order_num'
  ).all(req.params.moduleId);
  const parsed = questions.map(q => ({ ...q, options: JSON.parse(q.options) }));
  res.json(parsed);
});

module.exports = router;
