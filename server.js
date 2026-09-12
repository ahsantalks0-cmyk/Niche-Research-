const express = require('express');
const path = require('path');
const db = require('./src/main/db');

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize SQLite database
try {
  db.getDb();
  console.log('[db] SQLite database initialized at:', db.getDbPath());
} catch (err) {
  console.error('[db] Initialization error:', err);
}

// Database API routes for browser preview / web client
app.get('/api/db/settings', (req, res) => {
  try {
    res.json(db.getSettings());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/db/settings', (req, res) => {
  try {
    const updated = db.saveSettings(req.body);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/db/countries', (req, res) => {
  try {
    const activeOnly = req.query.activeOnly === 'true' || req.query.activeOnly === '1';
    res.json(db.getCountries(activeOnly));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/db/counts', (req, res) => {
  try {
    res.json(db.getCounts());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/db/health', (req, res) => {
  try {
    res.json(db.getDbHealth());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/db/runs', (req, res) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 50;
    const offset = req.query.offset ? Number(req.query.offset) : 0;
    res.json(db.getRuns({ limit, offset }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/db/runs', (req, res) => {
  try {
    const { runData, countryCodes, criteriaBrief } = req.body;
    const run = db.createRun(runData, countryCodes, criteriaBrief);
    res.json(run);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/db/runs/:id', (req, res) => {
  try {
    const run = db.getRun(Number(req.params.id));
    if (!run) return res.status(404).json({ error: 'Run not found' });
    res.json(run);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/db/runs/:id/parse', (req, res) => {
  try {
    const runId = Number(req.params.id);
    const result = db.parseRun(runId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Department Head & Chain Engine routes (P1.2)
app.post('/api/db/runs/:id/plan', (req, res) => {
  try {
    const runId = Number(req.params.id);
    const { buildPlan } = require('./src/main/agents/departmentHead');
    const result = buildPlan(runId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/engine/runs/:id/start', async (req, res) => {
  try {
    const runId = Number(req.params.id);
    const { chainEngine } = require('./src/main/engine/chainEngine');
    const result = await chainEngine.startRun(runId, req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/engine/runs/:id/approve', async (req, res) => {
  try {
    const runId = Number(req.params.id);
    const { chainEngine } = require('./src/main/engine/chainEngine');
    const result = await chainEngine.approveRun(runId, req.body?.approvedNiches);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/engine/runs/:id/pause', async (req, res) => {
  try {
    const runId = Number(req.params.id);
    const { chainEngine } = require('./src/main/engine/chainEngine');
    const result = await chainEngine.pauseRun(runId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/engine/runs/:id/cancel', async (req, res) => {
  try {
    const runId = Number(req.params.id);
    const { chainEngine } = require('./src/main/engine/chainEngine');
    const result = await chainEngine.cancelRun(runId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/engine/agents', (req, res) => {
  try {
    const agentRegistry = require('./src/main/engine/agentRegistry');
    res.json(agentRegistry.listAll());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/db/agent-status', (req, res) => {
  try {
    const { runId, agentNumber, statusUpdate } = req.body;
    const updated = db.updateAgentStatus(runId, agentNumber, statusUpdate);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/db/niches', (req, res) => {
  try {
    const runId = Number(req.query.runId);
    if (!runId) return res.status(400).json({ error: 'runId required' });
    res.json(db.getNichesByRun(runId));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/engine/timing-summary', (req, res) => {
  try {
    const runId = req.query.runId ? Number(req.query.runId) : null;
    res.json(db.getTimingSummary(runId));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/engine/timing-logs', (req, res) => {
  try {
    const options = {
      limit: req.query.limit ? Number(req.query.limit) : 50,
      runId: req.query.runId ? Number(req.query.runId) : undefined,
    };
    res.json(db.getTimingLogs(options));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/db/crud/:action', (req, res) => {
  try {
    const { action } = req.params;
    const { table, data, idOrWhere, where, options } = req.body;
    let result;
    if (action === 'insert') result = db.insert(table, data);
    else if (action === 'update') result = db.update(table, idOrWhere, data);
    else if (action === 'findBy') result = db.findBy(table, where, options);
    else if (action === 'findOne') result = db.findOne(table, where);
    else if (action === 'deleteBy') result = db.deleteBy(table, where);
    else if (action === 'count') result = db.count(table, where);
    else return res.status(400).json({ error: 'Invalid CRUD action' });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mount the renderer assets directly on / so index.html dependencies like 'styles/atelier.css' resolve properly
app.use(express.static(path.join(__dirname, 'src/renderer')));

// Mount the global assets on /assets so things like '../../assets/icons/icon-64x64.png' resolve. 
// Wait, if the html is at '/', then '../../assets/icons/icon-64x64.png' will resolve to '/assets/icons/icon-64x64.png'.
// So mounting 'assets' on '/assets' is correct.
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Any other route serves index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/renderer/index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
