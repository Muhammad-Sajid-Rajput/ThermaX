import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import { authRoutes } from './routes/auth.js';
import { userRoutes } from './routes/users.js';
import { reportRoutes } from './routes/reports.js';
import { heatmapRoutes } from './routes/heatmap.js';
import { hotspotRoutes } from './routes/hotspots.js';
import { dashboardRoutes } from './routes/dashboard.js';
import { exportRoutes } from './routes/exports.js';
import { weatherRoutes } from './routes/weather.js';
import { apiLimiter } from './middleware/rateLimiters.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Security settings & headers
app.disable('x-powered-by');
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
        connectSrc: ["'self'", 'http:', 'https:'],
      },
    },
  })
);

const rawFrontendOrigins = process.env.FRONTEND_URL || 'http://localhost:5173';
const allowedFrontendOrigins = rawFrontendOrigins
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const localOriginPattern = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i;

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }
      if (allowedFrontendOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      if (NODE_ENV === 'development' && localOriginPattern.test(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS policy violation: ${origin} is not allowed`));
    },
    credentials: true,
  })
);

// Middleware
app.use(cookieParser());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/api/', apiLimiter);

// ─── API Router Mounts (Supports both /api/v1/ and legacy /api/) ───────────
const routeMap = [
  ['/auth', authRoutes],
  ['/users', userRoutes],
  ['/reports', reportRoutes],
  ['/weather', weatherRoutes],
  ['/heatmap', heatmapRoutes],
  ['/hotspots', hotspotRoutes],
  ['/dashboard', dashboardRoutes],
  ['/exports', exportRoutes],
];

routeMap.forEach(([path, router]) => {
  app.use(`/api/v1${path}`, router);
  app.use(`/api${path}`, router);
});

// Health check endpoint
app.get(['/api/health', '/api/v1/health'], (req, res) => {
  res.json({
    status: 'OK',
    version: '1.0.0',
    apiVersion: 'v1',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: NODE_ENV === 'development' ? err.message : 'Internal server error',
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Database connection
const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/thermax';

mongoose
  .connect(mongoUri)
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${NODE_ENV}`);
    });
  })
  .catch((error) => {
    console.error('Database connection error:', error);
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT} (Standalone Mode)`);
    });
  });

export default app;
