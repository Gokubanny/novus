const EmployeeProfile = require('../models/EmployeeProfile.model');
const AddressVerification = require('../models/AddressVerification.model');
const CompanySettings = require('../models/CompanySettings.model');
const AuditLog = require('../models/AuditLog.model');
const { geocodeAddress, calculateDistance, isWithinVerificationWindow } = require('../utils/geocoding');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

/**
 * @route   GET /api/employee/profile
 * @desc    Get current employee's profile
 * @access  Employee only
 */
const getProfile = asyncHandler(async (req, res) => {
  const employee = await EmployeeProfile.findOne({ userId: req.userId }).lean();

  if (!employee) {
    throw new AppError('Employee profile not found', 404);
  }

  res.json({
    success: true,
    data: {
      id: employee._id,
      full_name: employee.fullName,
      email: employee.email,
      phone: employee.phoneNumber,
      status: employee.status,
      created_at: employee.createdAt
    }
  });
});

/**
 * @route   GET /api/employee/verification-status
 * @desc    Get current verification status and details
 * @access  Employee only
 */
const getVerificationStatus = asyncHandler(async (req, res) => {
  const employee = await EmployeeProfile.findOne({ userId: req.userId });

  if (!employee) {
    throw new AppError('Employee profile not found', 404);
  }

  const verification = await AddressVerification.findOne({ 
    employeeId: employee._id 
  })
    .sort({ createdAt: -1 })
    .lean();

  if (!verification) {
    return res.json({
      success: true,
      data: null
    });
  }

  res.json({
    success: true,
    data: {
      id: verification._id,
      street: verification.street,
      city: verification.city,
      state: verification.state,
      zip: verification.zip,
      landmark: verification.landmark,
      verification_window_start: verification.verificationWindowStart,
      verification_window_end: verification.verificationWindowEnd,
      status: verification.verificationStatus.toLowerCase().replace(/_/g, '_'),
      verified_at: verification.verifiedAt,
      latitude: verification.locationCoordinates?.latitude,
      longitude: verification.locationCoordinates?.longitude,
      created_at: verification.createdAt,
      updated_at: verification.updatedAt
    }
  });
});

/**
 * @route   POST /api/employee/address
 * @desc    Submit or update residential address
 * @access  Employee only
 */
const submitAddress = asyncHandler(async (req, res) => {
  const { 
    street, 
    city, 
    state, 
    zip, 
    landmark,
    windowStart,
    windowEnd 
  } = req.body;

  // Validation
  if (!street || !city || !state || !zip) {
    throw new AppError('Street, city, state, and ZIP are required', 400);
  }

  if (!windowStart || !windowEnd) {
    throw new AppError('Verification window is required', 400);
  }

  const employee = await EmployeeProfile.findOne({ userId: req.userId });

  if (!employee) {
    throw new AppError('Employee profile not found', 404);
  }

  // Geocode the address to get expected coordinates
  const geocodeResult = await geocodeAddress(street, city, state, zip);

  if (geocodeResult.error && !geocodeResult.latitude) {
    console.warn('Geocoding failed, proceeding without coordinates:', geocodeResult.error);
  }

  // Find or create verification record
  let verification = await AddressVerification.findOne({ 
    employeeId: employee._id 
  });

  if (!verification) {
    verification = new AddressVerification({
      employeeId: employee._id
    });
  }

  // Update verification record
  verification.street = street;
  verification.city = city;
  verification.state = state;
  verification.zip = zip;
  verification.landmark = landmark || null;
  verification.addressText = `${street}, ${city}, ${state} ${zip}`;
  verification.verificationWindowStart = windowStart;
  verification.verificationWindowEnd = windowEnd;
  verification.verificationStatus = 'PENDING_VERIFICATION';
  verification.expectedLatitude = geocodeResult.latitude;
  verification.expectedLongitude = geocodeResult.longitude;

  await verification.save();

  // Update employee status
  employee.status = 'ACTIVE';
  await employee.save();

  // Log the action
  await AuditLog.create({
    actorId: req.userId,
    actionType: 'ADDRESS_SUBMITTED',
    targetEmployeeId: employee._id,
    metadata: {
      address: verification.addressText,
      verificationId: verification._id
    }
  });

  res.json({
    success: true,
    message: 'Address submitted successfully',
    data: {
      id: verification._id,
      status: verification.verificationStatus,
      verification_window_start: verification.verificationWindowStart,
      verification_window_end: verification.verificationWindowEnd
    }
  });
});

/**
 * @route   POST /api/employee/verify-location
 * @desc    Verify location during verification window
 * @access  Employee only
 */
const verifyLocation = asyncHandler(async (req, res) => {
  const { latitude, longitude, distanceThresholdKm } = req.body;

  // Validation
  if (!latitude || !longitude) {
    throw new AppError('Latitude and longitude are required', 400);
  }

  const employee = await EmployeeProfile.findOne({ userId: req.userId });

  if (!employee) {
    throw new AppError('Employee profile not found', 404);
  }

  const verification = await AddressVerification.findOne({ 
    employeeId: employee._id 
  }).sort({ createdAt: -1 });

  if (!verification) {
    throw new AppError('No address submitted yet', 400);
  }

  // Check verification status
  if (verification.verificationStatus === 'VERIFIED') {
    throw new AppError('Location already verified', 400);
  }

  if (verification.verificationStatus !== 'PENDING_VERIFICATION' && 
      verification.verificationStatus !== 'REVERIFICATION_REQUIRED') {
    throw new AppError('Address must be submitted before verification', 400);
  }

  // Check if within verification window
  if (!isWithinVerificationWindow(
    verification.verificationWindowStart, 
    verification.verificationWindowEnd
  )) {
    throw new AppError('Verification can only be done during your scheduled window', 400);
  }

  // Calculate distance if we have expected coordinates
  let distance = null;
  let distanceFlagged = false;
  const threshold = distanceThresholdKm || 1.0;

  if (verification.expectedLatitude && verification.expectedLongitude) {
    distance = calculateDistance(
      verification.expectedLatitude,
      verification.expectedLongitude,
      latitude,
      longitude
    );

    distanceFlagged = distance > threshold;
  }

  // Update verification record
  verification.locationCoordinates = { latitude, longitude };
  verification.verificationStatus = 'VERIFIED';
  verification.verifiedAt = new Date();
  verification.distanceFromDeclaredAddress = distance;
  verification.distanceFlagged = distanceFlagged;
  verification.reviewStatus = 'PENDING';

  await verification.save();

  // Update employee status
  employee.status = 'VERIFIED';
  await employee.save();

  // Log the action
  await AuditLog.create({
    actorId: req.userId,
    actionType: 'LOCATION_VERIFIED',
    targetEmployeeId: employee._id,
    metadata: {
      verificationId: verification._id,
      latitude,
      longitude,
      distance,
      distanceFlagged
    }
  });

  res.json({
    success: true,
    message: distanceFlagged 
      ? 'Location verified but flagged for review due to distance'
      : 'Location verified successfully',
    data: {
      id: verification._id,
      status: verification.verificationStatus,
      verified_at: verification.verifiedAt,
      distance_km: distance,
      distance_flagged: distanceFlagged
    }
  });
});

/**
 * @route   GET /api/employee/history
 * @desc    Get verification history
 * @access  Employee only
 */
const getVerificationHistory = asyncHandler(async (req, res) => {
  const employee = await EmployeeProfile.findOne({ userId: req.userId });

  if (!employee) {
    throw new AppError('Employee profile not found', 404);
  }

  const verifications = await AddressVerification.find({ 
    employeeId: employee._id 
  })
    .sort({ createdAt: -1 })
    .lean();

  res.json({
    success: true,
    data: verifications.map(v => ({
      id: v._id,
      street: v.street,
      city: v.city,
      state: v.state,
      zip: v.zip,
      status: v.verificationStatus.toLowerCase().replace(/_/g, '_'),
      verified_at: v.verifiedAt,
      created_at: v.createdAt
    }))
  });
});

module.exports = {
  getProfile,
  getVerificationStatus,
  submitAddress,
  verifyLocation,
  getVerificationHistory
};