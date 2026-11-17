import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  clearDatabaseRecords,
  deleteScreeningReport,
  deleteTemperatureLog,
  findSharedResource,
  readDatabase,
  updateColorTheme,
  updateCommanderSignature,
  upsertScreeningReport,
  upsertTemperatureLog,
} from './server/store';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  app.get('/api/bootstrap', (_req, res) => {
    const db = readDatabase();
    res.json(db);
  });

  app.post('/api/screening-reports', (req, res) => {
    try {
      const saved = upsertScreeningReport(req.body);
      res.json(saved);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  app.delete('/api/screening-reports/:id', (req, res) => {
    const deleted = deleteScreeningReport(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }
    res.json({ ok: true });
  });

  app.post('/api/temperature-logs', (req, res) => {
    try {
      const saved = upsertTemperatureLog(req.body);
      res.json(saved);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  app.delete('/api/temperature-logs/:id', (req, res) => {
    const deleted = deleteTemperatureLog(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Temperature log not found' });
      return;
    }
    res.json({ ok: true });
  });

  app.post('/api/commander-signature', (req, res) => {
    try {
      const updated = updateCommanderSignature(req.body);
      res.json(updated);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  app.post('/api/theme', (req, res) => {
    try {
      const updated = updateColorTheme(req.body.colorTheme);
      res.json({ colorTheme: updated });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  app.post('/api/clear-data', (_req, res) => {
    try {
      const cleared = clearDatabaseRecords();
      res.json(cleared);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.get('/api/share/:type/:token', (req, res) => {
    const { type, token } = req.params;
    if (type !== 'infographic' && type !== 'temp') {
      res.status(400).json({ error: 'Invalid share type' });
      return;
    }
    const found = findSharedResource(type, token);
    if (!found) {
      res.status(404).json({ error: 'Shared report not found' });
      return;
    }
    const db = readDatabase();
    res.json({ type, data: found, colorTheme: db.colorTheme });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
