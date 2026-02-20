const User = require('../models/User.model');
const EmployeeProfile = require('../models/EmployeeProfile.model');
const AuditLog = require('../models/AuditLog.model');
const { generateToken } = require('../utils/jwt');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { validationResult } = require('express-validator');

// ─────────────────────────────────────────────────────────────────────────────
// Auth Controller — unchanged from V1
//
// This file was NOT modified during the V2 upgrade.
// If you see it replaced with admin controller content, restore this file.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and return JWT
 * @access  Public
 */
const login = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError('Invalid email or password format', 400);
  }

  const { email, password } = req.body;

  // Find user by email (admin or employee account)
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  // Compare password using the instance method on User model
  const isMatch = await user.comparePassword(password);

  if (!isMatch) {
    throw new AppError('Invalid email or password', 401);
  }

  // Generate JWT
  const token = generateToken({ userId: user._id, role: user.role });

  // Log the login event
  await AuditLog.create({
    actorId:    user._id,
    actionType: 'LOGIN',
    metadata: {
      email: user.email,
      role:  user.role
    }
  });

  // If this is an employee, attach their profile status
  let employeeStatus = null;
  if (user.role === 'employee') {
    const profile = await EmployeeProfile.findOne({ userId: user._id }).lean();
    if (profile) {
      employeeStatus = profile.status;
    }
  }

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      token,
      user: {
        id:              user._id,
        email:           user.email,
        role:            user.role,
        employee_status: employeeStatus
      }
    }
  });
});

/**
 * @route   POST /api/auth/logout
 * @desc    Logout (client-side token discard — audit logged server-side)
 * @access  Authenticated
 */
const logout = asyncHandler(async (req, res) => {
  await AuditLog.create({
    actorId:    req.userId,
    actionType: 'LOGOUT',
    metadata:   {}
  });

  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

/**
 * @route   GET /api/auth/me
 * @desc    Get currently authenticated user
 * @access  Authenticated
 */
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId).lean();

  if (!user) {
    throw new AppError('User not found', 404);
  }

  let employeeProfile = null;
  if (user.role === 'employee') {
    employeeProfile = await EmployeeProfile.findOne({ userId: user._id }).lean();
  }

  res.json({
    success: true,
    data: {
      id:    user._id,
      email: user.email,
      role:  user.role,
      ...(employeeProfile && {
        employee: {
          id:         employeeProfile._id,
          full_name:  employeeProfile.fullName,
          phone:      employeeProfile.phoneNumber,
          status:     employeeProfile.status
        }
      })
    }
  });
});

module.exports = {
  login,
  logout,
  getMe
};