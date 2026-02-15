const User = require('../models/User.model');
const EmployeeProfile = require('../models/EmployeeProfile.model');
const AddressVerification = require('../models/AddressVerification.model');
const AuditLog = require('../models/AuditLog.model');
const { generateToken } = require('../utils/jwt');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

/**
 * @route   GET /api/invite/:token
 * @desc    Get invite details by token
 * @access  Public
 */
const getInviteDetails = asyncHandler(async (req, res) => {
  const { token } = req.params;

  const employee = await EmployeeProfile.findOne({ inviteToken: token });

  if (!employee) {
    throw new AppError('Invalid or expired invite link', 404);
  }

  // Check if invite already accepted
  if (employee.status !== 'INVITED') {
    throw new AppError('This invite has already been accepted', 400);
  }

  // Check if invite expired
  if (new Date() > employee.inviteExpiresAt) {
    throw new AppError('This invite link has expired', 400);
  }

  res.json({
    success: true,
    data: {
      id: employee._id,
      fullName: employee.fullName,
      email: employee.email,
      status: employee.status
    }
  });
});

/**
 * @route   POST /api/invite/:token/accept
 * @desc    Accept invite and create user account
 * @access  Public
 */
const acceptInvite = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  // Validation
  if (!password || password.length < 8) {
    throw new AppError('Password must be at least 8 characters', 400);
  }

  const employee = await EmployeeProfile.findOne({ inviteToken: token });

  if (!employee) {
    throw new AppError('Invalid or expired invite link', 404);
  }

  // Check if invite already accepted
  if (employee.status !== 'INVITED') {
    throw new AppError('This invite has already been accepted', 400);
  }

  // Check if invite expired
  if (new Date() > employee.inviteExpiresAt) {
    throw new AppError('This invite link has expired', 400);
  }

  // Check if user already exists with this email
  const existingUser = await User.findOne({ email: employee.email });
  if (existingUser) {
    throw new AppError('An account with this email already exists', 409);
  }

  // Create user account
  const user = await User.create({
    email: employee.email,
    passwordHash: password,
    role: 'EMPLOYEE'
  });

  // Update employee profile
  employee.userId = user._id;
  employee.status = 'ACTIVE';
  employee.inviteAcceptedAt = new Date();
  await employee.save();

  // Create initial verification record
  await AddressVerification.create({
    employeeId: employee._id,
    verificationStatus: 'PENDING_ADDRESS'
  });

  // Log the event
  await AuditLog.create({
    actorId: user._id,
    actionType: 'INVITE_ACCEPTED',
    targetEmployeeId: employee._id,
    metadata: {
      email: employee.email,
      fullName: employee.fullName
    }
  });

  // Generate token
  const authToken = generateToken(user._id, user.role);

  res.status(201).json({
    success: true,
    message: 'Account created successfully',
    data: {
      token: authToken,
      user: {
        id: user._id,
        email: user.email,
        role: user.role.toLowerCase()
      },
      employee: {
        id: employee._id,
        fullName: employee.fullName,
        status: employee.status
      }
    }
  });
});

module.exports = {
  getInviteDetails,
  acceptInvite
};