// Mock authentication service for testing without database
import bcrypt from 'bcryptjs';
import { generateToken } from './jwt.js';

// Mock user database (in production, this would be MongoDB)
let mockUsers = [
  {
    _id: 'admin123',
    name: 'Admin User',
    email: 'admin@thermax.com',
    password: '$2a$12$fGr6OUW4zKb/mR2.qTR13u2dJqd.Mp7l2NToj0FcVV1pqXMJsKrR.', // admin123
    role: 'ADMIN',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    _id: 'user123',
    name: 'Demo User',
    email: 'demo@thermax.com',
    password: '$2a$12$wC7KNkFA5.r.598YEzZXNul5Z8G/mDN3KZufCbEFBKneK393EOqTa', // demo123
    role: 'USER',
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
];

// Mock user model methods
export const mockFindByEmailWithPassword = async (email) => {
  const user = mockUsers.find((u) => u.email === email);
  return user ? { ...user } : null;
};

export const mockCreateUser = async (userData) => {
  // Check if user already exists
  const existingUser = mockUsers.find((u) => u.email === userData.email);
  if (existingUser) {
    throw new Error('Email already registered');
  }

  // Hash password
  const salt = await bcrypt.genSalt(12);
  const hashedPassword = await bcrypt.hash(userData.password, salt);

  // Create new user
  const newUser = {
    _id: 'user' + Date.now(),
    name: userData.name,
    email: userData.email,
    password: hashedPassword,
    role: 'USER',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  mockUsers.push(newUser);
  return { ...newUser };
};

export const mockComparePassword = async (user, candidatePassword) => {
  return await bcrypt.compare(candidatePassword, user.password);
};

export const mockFindById = async (userId) => {
  const user = mockUsers.find((u) => u._id === userId);
  return user ? { ...user, password: undefined } : null;
};

// Mock authentication functions
export const mockSignup = async (userData) => {
  try {
    const user = await mockCreateUser(userData);
    const token = generateToken(user._id, user.role);

    // Return user without password
    const { password, ...userWithoutPassword } = user;

    return {
      message: 'User registered successfully',
      token,
      user: userWithoutPassword,
    };
  } catch (error) {
    throw new Error(error.message || 'Registration failed');
  }
};

export const mockLogin = async (credentials) => {
  try {
    const user = await mockFindByEmailWithPassword(credentials.email);

    if (!user) {
      throw new Error('Invalid email or password');
    }

    if (!user.isActive) {
      throw new Error('Account is deactivated');
    }

    const isPasswordValid = await mockComparePassword(
      user,
      credentials.password
    );

    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    const token = generateToken(user._id, user.role);

    // Update last login
    user.lastLogin = new Date();

    // Return user without password
    const { password, ...userWithoutPassword } = user;

    return {
      message: 'Login successful',
      token,
      user: userWithoutPassword,
    };
  } catch (error) {
    throw new Error(error.message || 'Login failed');
  }
};

export const mockVerifyToken = async (decoded) => {
  const user = await mockFindById(decoded.userId);

  if (!user || !user.isActive) {
    throw new Error('User not found or inactive');
  }

  return user;
};
