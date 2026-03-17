import express from 'express';
import cors from 'cors';
import { registerSuperadminSettingsRoutes } from './routes/superadminSettings.routes.js';

const app = express();

const configuredOrigins = (process.env.CORS_ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = configuredOrigins.length > 0
  ? configuredOrigins
  : ['http://localhost:5173', 'http://127.0.0.1:5173'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));

const superadminRouter = express.Router();
registerSuperadminSettingsRoutes(superadminRouter as any);
app.use('/api/superadmin/settings', superadminRouter);

app.get('/health', (_req, res) => {
  res.status(200).json({ ok: true, service: 'superadmin-settings-api' });
});

const port = Number(process.env.PORT || 4000);
app.listen(port, () => {
  console.log(`Superadmin settings API running on port ${port}`);
});
