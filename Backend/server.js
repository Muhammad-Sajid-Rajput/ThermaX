import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
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

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Security middleware
app.use(
  helmet({
    crossOriginResourcePolicy: false, // Allow images to be loaded from this server
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

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/heatmap', heatmapRoutes);
app.use('/api/hotspots', hotspotRoutes);
app.use('/api/dashboard', dashboardRoutes);
// ⛔ Admin-only export routes — protected by authorizeAdmin middleware
app.use('/api/exports', exportRoutes);
app.use('/api/weather', weatherRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message:
      process.env.NODE_ENV === 'development'
        ? err.message
        : 'Internal server error',
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Database connection
mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/thermax')
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
    });
  })
  .catch((error) => {
    console.error('Database connection error:', error);
    console.log('Starting server without database (mock mode)');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT} (Mock Mode - No Database)`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
    });
  });

export default app;
