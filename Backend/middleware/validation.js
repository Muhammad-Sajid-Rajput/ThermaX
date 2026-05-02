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
};

// Validation middleware factory
export const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });

    if (error) {
      const errorMessages = error.details.map((detail) => detail.message);
      return res.status(400).json({
        error: 'Validation failed',
        messages: errorMessages,
      });
    }

    next();
  };
};
