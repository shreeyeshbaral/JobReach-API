import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import authRoutes from './routes/auth.js';
import jobRoutes from './routes/jobs.js';
import linkedinRoutes from './routes/linkedin.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.resolve('public')));

app.get('/api/health', (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.use('/auth', authRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/linkedin', linkedinRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(400).json({ error: err.message });
});

const port = Number(process.env.PORT || 4000);
app.listen(port, '0.0.0.0', () => console.log(`Dashboard: http://localhost:${port} (or http://127.0.0.1:${port})`));