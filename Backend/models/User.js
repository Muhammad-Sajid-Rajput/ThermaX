import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const { Schema } = mongoose;

// Role constants (2-tier system: user, admin)
export const ROLES = {
  USER: 'user',
  ADMIN: 'admin',
};

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^(?=.{1,254}$)(?=.{1,64}@)[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        'Please provide a valid email',
      ],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    role: {
      type: String,
      enum: {
        values: [ROLES.USER, ROLES.ADMIN],
        message: 'Role must be either user or admin',
      },
      default: ROLES.USER,
    },
    phone: {
      type: String,
      trim: true,
    },
    organization: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailOtp: {
      type: String,
      select: false,
    },
    emailOtpExpiry: {
      type: Date,
      select: false,
    },
    lastLoginAt: {
      type: Date,
    },
    passwordChangedAt: {
      type: Date,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Index for faster queries
userSchema.index({ role: 1 });

// Hash password before saving
userSchema.pre('save', async function (next) {
  // Only hash if password is modified
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Update updatedAt on every update
userSchema.pre('save', function (next) {
  if (!this.isNew) {
    this.updatedAt = Date.now();
  }
  next();
});

// Instance method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Generate 6-digit OTP and set 15-minute expiry
userSchema.methods.generateOtp = async function () {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.emailOtp = otp;
  this.emailOtpExpiry = new Date(Date.now() + 15 * 60 * 1000);
  return otp;
};

// Verify 6-digit OTP
userSchema.methods.verifyOtp = async function (candidateOtp) {
  if (!this.emailOtp || !this.emailOtpExpiry) return false;
  if (new Date() > this.emailOtpExpiry) return false;
  const isValid = this.emailOtp === candidateOtp;
  if (isValid) {
    this.emailOtp = undefined;
    this.emailOtpExpiry = undefined;
    this.isEmailVerified = true;
  }
  return isValid;
};

// Static method to find user by email with password (for login)
userSchema.statics.findByEmailWithPassword = function (email) {
  return this.findOne({ email }).select('+password');
};

const User = mongoose.model('User', userSchema);

export { User };
export default User;
