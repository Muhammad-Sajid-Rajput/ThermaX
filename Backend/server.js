import mongoose from 'mongoose';
import dotenv from 'dotenv';
import app from './app.js';
import { assertRequiredEnv } from './config/env.js';

// Load environment variables before booting services
dotenv.config();

// Fail fast: never boot without a JWT signing secret.
assertRequiredEnv();

const PORT = process.env.PORT || 5000;

// Database connection — MongoDB is strictly required
const mongoUri =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  'mongodb://localhost:27017/thermax';

let server;

mongoose
  .connect(mongoUri)
  .then(() => {
    console.log('Connected to MongoDB');
    server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  })
  .catch((error) => {
    console.error('Fatal: MongoDB connection failed. Server will not start without database:', error);
    process.exit(1);
  });

function gracefulShutdown(signal) {
  console.log(`Received ${signal}. Shutting down gracefully...`);
  if (server) {
    server.close(() => {
      console.log('HTTP server closed.');
      mongoose.connection.close(false).then(() => {
        console.log('MongoDB connection closed.');
        process.exit(0);
      }).catch(() => process.exit(0));
    });
  } else {
    process.exit(0);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Promise Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});
