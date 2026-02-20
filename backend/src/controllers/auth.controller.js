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

  // ── FIX: field is `passwordHash`, not `password` ─────────────────────────
  // User model stores password in `passwordHash` with select: false.
  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');

  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  const isMatch = await user.comparePassword(password);

  if (!isMatch) {
    throw new AppError('Invalid email or password', 401);
  }

  // ── FIX: role is stored uppercase ('ADMIN' / 'EMPLOYEE') ─────────────────
  const token = generateToken({ userId: user._id, role: user.role });

  await AuditLog.create({
    actorId:    user._id,
    actionType: 'LOGIN',
    metadata: {
      email: user.email,
      role:  user.role
    }
  });

  let employeeStatus = null;
  if (user.role === 'EMPLOYEE') {
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
        role:            user.role.toLowerCase(), // send lowercase to frontend
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
  if (user.role === 'EMPLOYEE') {
    employeeProfile = await EmployeeProfile.findOne({ userId: user._id }).lean();
  }

  res.json({
    success: true,
    data: {
      id:    user._id,
      email: user.email,
      role:  user.role.toLowerCase(),
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