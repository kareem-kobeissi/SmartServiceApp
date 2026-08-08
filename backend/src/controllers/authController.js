const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('../models/User');

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const allowedRoles = ['customer', 'provider'];
const invalidCredentialsMessage = 'Invalid email or password.';

async function register(request, response) {
  const { fullName, email, password, role } = request.body;

  if (
    typeof fullName !== 'string' ||
    !fullName.trim() ||
    typeof email !== 'string' ||
    !email.trim() ||
    typeof password !== 'string' ||
    !password ||
    typeof role !== 'string' ||
    !role
  ) {
    return response.status(400).json({
      success: false,
      message: 'Full name, email, password, and role are required.',
    });
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (!emailPattern.test(normalizedEmail)) {
    return response.status(400).json({
      success: false,
      message: 'Please provide a valid email address.',
    });
  }

  if (password.length < 8) {
    return response.status(400).json({
      success: false,
      message: 'Password must contain at least 8 characters.',
    });
  }

  if (!allowedRoles.includes(role)) {
    return response.status(400).json({
      success: false,
      message: 'Role must be either customer or provider.',
    });
  }

  try {
    const existingUser = await User.exists({ email: normalizedEmail });

    if (existingUser) {
      return response.status(409).json({
        success: false,
        message: 'An account with this email already exists.',
      });
    }

    const user = await User.create({
      fullName: fullName.trim(),
      email: normalizedEmail,
      password,
      role,
    });

    return response.status(201).json({
      success: true,
      message: 'Account created successfully.',
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    if (error?.code === 11000) {
      return response.status(409).json({
        success: false,
        message: 'An account with this email already exists.',
      });
    }

    return response.status(500).json({
      success: false,
      message: 'Unable to create the account. Please try again.',
    });
  }
}

async function login(request, response) {
  const { email, password } = request.body;

  if (
    typeof email !== 'string' ||
    !email.trim() ||
    typeof password !== 'string' ||
    !password
  ) {
    return response.status(400).json({
      success: false,
      message: 'Email and password are required.',
    });
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (!emailPattern.test(normalizedEmail)) {
    return response.status(400).json({
      success: false,
      message: 'Please provide a valid email address.',
    });
  }

  try {
    const user = await User.findOne({ email: normalizedEmail }).select(
      '+password',
    );

    if (!user) {
      return response.status(401).json({
        success: false,
        message: invalidCredentialsMessage,
      });
    }

    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
      return response.status(401).json({
        success: false,
        message: invalidCredentialsMessage,
      });
    }

    if (!process.env.JWT_SECRET) {
      return response.status(500).json({
        success: false,
        message: 'Authentication is not configured.',
      });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: '7d',
      },
    );

    return response.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    });
  } catch {
    return response.status(500).json({
      success: false,
      message: 'Unable to log in. Please try again.',
    });
  }
}

async function getCurrentUser(request, response) {
  try {
    const user = await User.findById(request.user.id).select(
      'fullName email role',
    );

    if (!user) {
      return response.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    return response.status(200).json({
      success: true,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    });
  } catch {
    return response.status(500).json({
      success: false,
      message: 'Unable to retrieve the user.',
    });
  }
}

module.exports = {
  getCurrentUser,
  login,
  register,
};
