import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import uploadRouter from './routes/upload.route';
import leadsRouter from './routes/leads.route';
import eventRouter from './routes/event.route';
import processRouter from './routes/process.route';
import authRouter from './routes/auth.route';
import analyticsRouter from './routes/analytics.route';
import documentsRouter from './routes/documents.route';
import aiRouter from './routes/ai.route';
import driverRouter from './routes/driver.route';
import { initSocket } from './services/socket.service';
import { startCronJobs } from './services/cron.service';
import http from 'http';

const app = express();
const server = http.createServer(app);
const PORT = parseInt(process.env.PORT ?? '3001', 10);

// Initialize Sockets
initSocket(server);

// Initialize Cron
startCronJobs();

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.CLIENT_URL
    : ['http://localhost:3000', 'http://localhost:3002'],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static uploads
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

// Request logging
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api', authRouter);
app.use('/api', analyticsRouter);
app.use('/api', uploadRouter);
app.use('/api', leadsRouter);
app.use('/api', eventRouter);
app.use('/api', processRouter);
app.use('/api', documentsRouter);
app.use('/api/ai', aiRouter);
app.use('/api/driver', driverRouter);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Server Error]', err);
  res.status(500).json({ error: 'Internal server error', detail: err.message });
});

server.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV ?? 'development'}`);
});

export default app;
