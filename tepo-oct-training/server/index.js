require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const modulesRouter = require('./routes/modules');
const progressRouter = require('./routes/progress');
const supervisorRouter = require('./routes/supervisor');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/modules', modulesRouter);
app.use('/api/progress', progressRouter);
app.use('/api/questions', require('./routes/questions'));
app.use('/api/supervisor', supervisorRouter);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => console.log(`TEPO server running on port ${PORT}`));
