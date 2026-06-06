import Joi from 'joi';

// Validation schemas
export const schemas = {
  // User registration validation
  signup: Joi.object({
    name: Joi.string().min(2).max(50).trim().required().messages({
      'string.empty': 'Name is required',
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name cannot exceed 50 characters',
    }),
    email: Joi.string().email().lowercase().trim().required().messages({
      'string.email': 'Please enter a valid email address',
      'string.empty': 'Email is required',
    }),
    password: Joi.string().min(6).required().messages({
      'string.empty': 'Password is required',
      'string.min': 'Password must be at least 6 characters long',
    }),
  }),

  // User login validation
  login: Joi.object({
    email: Joi.string().email().lowercase().trim().required().messages({
      'string.email': 'Please enter a valid email address',
      'string.empty': 'Email is required',
    }),
    password: Joi.string().required().messages({
      'string.empty': 'Password is required',
    }),
  }),

  weatherCurrent: Joi.object({
    lat: Joi.number().min(-90).max(90).required(),
    lon: Joi.number().min(-180).max(180).optional(),
    lng: Joi.number().min(-180).max(180).optional(),
    save: Joi.boolean().truthy('true').falsy('false').optional(),
  })
    .or('lon', 'lng')
    .unknown(false),

  weatherHistory: Joi.object({
    lat: Joi.number().min(-90).max(90).required(),
    lon: Joi.number().min(-180).max(180).optional(),
    lng: Joi.number().min(-180).max(180).optional(),
    from: Joi.date().iso().optional(),
    to: Joi.date().iso().optional(),
    limit: Joi.number().integer().min(1).max(200).optional(),
  })
    .or('lon', 'lng')
    .unknown(false),

  weatherRefresh: Joi.object({
    lat: Joi.number().min(-90).max(90).required(),
    lon: Joi.number().min(-180).max(180).optional(),
    lng: Joi.number().min(-180).max(180).optional(),
  })
    .or('lon', 'lng')
    .unknown(false),
};

// Validation middleware factory
export const validate = (schema) => {
  return (req, res, next) => {
    const body = normalizeLonQuery({ ...req.body });
    const { error, value } = schema.validate(body, { abortEarly: false });

    if (error) {
      const errorMessages = error.details.map((detail) => detail.message);
      return res.status(400).json({
        error: 'Validation failed',
        messages: errorMessages,
      });
    }

    req.body = value;
    next();
  };
};

function normalizeLonQuery(raw) {
  if (raw.lon !== undefined && raw.lng === undefined) {
    raw.lng = Number(raw.lon);
  } else if (raw.lng !== undefined) {
    raw.lng = Number(raw.lng);
  }
  if (raw.lon !== undefined) raw.lon = Number(raw.lon);
  delete raw.lon;
  return raw;
}

export const validateQuery = (schema) => {
  return (req, res, next) => {
    const raw = normalizeLonQuery({ ...req.query });
    if (raw.lat !== undefined) raw.lat = Number(raw.lat);
    if (raw.limit !== undefined) raw.limit = Number(raw.limit);
    if (raw.save === 'true') raw.save = true;
    if (raw.save === 'false') raw.save = false;

    const { error, value } = schema.validate(raw, { abortEarly: false });

    if (error) {
      const errorMessages = error.details.map((detail) => detail.message);
      return res.status(400).json({
        error: 'Validation failed',
        messages: errorMessages,
      });
    }

    req.validatedQuery = value;
    next();
  };
};
