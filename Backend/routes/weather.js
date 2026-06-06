import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  authenticate,
  authorizeAdmin,
  optionalAuth,
} from '../middleware/auth.js';
import { validate, validateQuery, schemas } from '../middleware/validation.js';
import * as weatherController from '../controllers/weatherController.js';

const router = express.Router();

const weatherLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: {
    error: 'Too many weather requests. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(weatherLimiter);

router.get(
  '/current',
  optionalAuth,
  validateQuery(schemas.weatherCurrent),
  weatherController.getCurrent
);

router.get(
  '/history',
  authenticate,
  validateQuery(schemas.weatherHistory),
  weatherController.getHistory
);

router.get(
  '/analytics/summary',
  authenticate,
  authorizeAdmin,
  weatherController.getAnalyticsSummary
);

router.post(
  '/refresh',
  authenticate,
  authorizeAdmin,
  validate(schemas.weatherRefresh),
  weatherController.refreshWeather
);

export { router as weatherRoutes };
