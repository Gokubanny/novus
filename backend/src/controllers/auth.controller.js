const User = require('../models/User.model');
const EmployeeProfile = require('../models/EmployeeProfile.model');
const AuditLog = require('../models/AuditLog.model');
const { generateToken } = require('../utils/jwt');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { validationResult } = require('express-validator');

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

  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');

  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  const isMatch = await user.comparePassword(password);

  if (!isMatch) {
    throw new AppError('Invalid email or password', 401);
  }

  // ── FIX: pass userId and role as separate arguments, NOT as an object ──────
  // generateToken(userId, role) — jwt.js signature takes two separate params.
  // Passing an object as the first arg wraps it inside the payload and causes
  // auth.middleware.js to receive { userId: { userId, role } } which can't
  // be cast to an ObjectId when doing User.findById(decoded.userId).
  const token = generateToken(user._id, user.role);

  await AuditLog.create({
    actorId:    user._id,
    actionType: 'LOGIN',
    metadata: { email: user.email, role: user.role }
  });

  let employeeStatus = null;
  if (user.role === 'EMPLOYEE') {
    const profile = await EmployeeProfile.findOne({ userId: user._id }).lean();
    if (profile) employeeStatus = profile.status;
  }

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      token,
      user: {
        id:              user._id,
        email:           user.email,
        role:            user.role.toLowerCase(),
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

  res.json({ success: true, message: 'Logged out successfully' });
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
          id:        employeeProfile._id,
          full_name: employeeProfile.fullName,
          phone:     employeeProfile.phoneNumber,
          status:    employeeProfile.status
        }
      })
    }
  });
});

module.exports = { login, logout, getMe };