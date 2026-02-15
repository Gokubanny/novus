const User = require('../models/User.model');
const EmployeeProfile = require('../models/EmployeeProfile.model');
const AuditLog = require('../models/AuditLog.model');
const { generateToken } = require('../utils/jwt');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

/**
 * @route   POST /api/auth/login
 * @desc    Login user (Admin or Employee)
 * @access  Public
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Validation
  if (!email || !password) {
    throw new AppError('Please provide email and password', 400);
  }

  // Find user with password field
  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');

  if (!user) {
    throw new AppError('Invalid credentials', 401);
  }

  // Check password
  const isPasswordValid = await user.comparePassword(password);

  if (!isPasswordValid) {
    throw new AppError('Invalid credentials', 401);
  }

  // Update last login
  user.lastLogin = new Date();
  await user.save();

  // Log the login
  await AuditLog.create({
    actorId: user._id,
    actionType: 'LOGIN',
    metadata: { email: user.email }
  });

  // Generate token
  const token = generateToken(user._id, user.role);

  // Get additional profile info for employees
  let employeeProfile = null;
  if (user.role === 'EMPLOYEE') {
    employeeProfile = await EmployeeProfile.findOne({ userId: user._id });
  }

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role.toLowerCase(),
        lastLogin: user.lastLogin
      },
      ...(employeeProfile && { 
        employee: {
          id: employeeProfile._id,
          fullName: employeeProfile.fullName,
          status: employeeProfile.status
        }
      })
    }
  });
});

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (just for audit log)
 * @access  Private
 */
const logout = asyncHandler(async (req, res) => {
  // Log the logout
  await AuditLog.create({
    actorId: req.userId,
    actionType: 'LOGOUT'
  });

  res.json({
    success: true,
    message: 'Logout successful'
  });
});

/**
 * @route   GET /api/auth/me
 * @desc    Get current user info
 * @access  Private
 */
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userId);

  let employeeProfile = null;
  if (user.role === 'EMPLOYEE') {
    employeeProfile = await EmployeeProfile.findOne({ userId: user._id });
  }

  res.json({
    success: true,
    data: {
      user: {
        id: user._id,
        email: user.email,
        role: user.role.toLowerCase(),
        lastLogin: user.lastLogin
      },
      ...(employeeProfile && { 
        employee: {
          id: employeeProfile._id,
          fullName: employeeProfile.fullName,
          status: employeeProfile.status
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