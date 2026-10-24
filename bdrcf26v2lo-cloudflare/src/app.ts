import express from 'express';
import cors from 'cors';



// Import routes
import healthRouter from './routes/health.routes';
import meRouter from './routes/me.routes';
import reportsRouter from './routes/reports.routes';
import equipmentRouter from './routes/equipment.routes';
import lockoutsRouter from './routes/lockouts.routes';
import metadataRouter from './routes/metadata.routes';
import syncRouter from './routes/sync.routes';
import usersRouter from './routes/users.routes';
import artisansRouter from './routes/artisans.routes';
import ticketsRouter from './routes/tickets.routes';
import auditRouter from './routes/audit.routes';
import notificationsRouter from './routes/notifications.routes';
import migrateRouter from './routes/migrate.routes';
import authRouter from './routes/auth.routes';

// Import error handler middleware

import { errorHandler } from './middleware/errorHandler';



const app = express();

// Security Middlewares

// Middlewares
app.disable('x-powered-by');
// Same-origin Workers deployment: no cross-origin credentials are exposed.
app.use(cors());
app.use(express.json({ limit: '32mb' }));
// First release has no authenticated R2 bucket. Reject inline binary payloads
// before any route can persist them in D1 or the migration importer.
app.use('/api', (req, res, next) => {
  if (!['POST', 'PATCH', 'PUT'].includes(req.method)) return next();
  const serialized = JSON.stringify(req.body || {});
  if (/data:(?:image|audio|video|application\/pdf)\//i.test(serialized)) {
    res.status(400).json({ error: { code: 'ATTACHMENTS_DISABLED', message: 'Attachments are disabled for this release' } });
    return;
  }
  next();
});

// Routes mapping under /api/v1
const apiPrefix = '/api/v1';

app.use(apiPrefix, healthRouter);
app.use(apiPrefix, meRouter);
app.use(apiPrefix, reportsRouter);
app.use(apiPrefix, equipmentRouter);
app.use(apiPrefix, lockoutsRouter);
app.use(apiPrefix, metadataRouter);
app.use(apiPrefix, syncRouter);
app.use(apiPrefix, usersRouter);
app.use(apiPrefix, artisansRouter);
app.use(apiPrefix, ticketsRouter);
app.use(apiPrefix, auditRouter);
app.use(apiPrefix, notificationsRouter);
app.use(apiPrefix, migrateRouter);
app.use(apiPrefix, authRouter);



app.use('/api', (_req, res) => { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'API route not found' } }); });

// Global Error Handler Middleware
app.use(errorHandler);

export default app;
