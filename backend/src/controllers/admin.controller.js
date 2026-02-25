const User = require('../models/User.model');
const EmployeeProfile = require('../models/EmployeeProfile.model');
const AddressVerification = require('../models/AddressVerification.model');
const CompanySettings = require('../models/CompanySettings.model');
const AuditLog = require('../models/AuditLog.model');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

// ── Helper: map a verification document to the admin API shape ────────────────
// Includes all V1 fields + V2 sub-documents (addressDetails, propertyDetails,
// occupancyDetails, images, internalFlag) so the admin UI can render the full
// inspection without extra queries.
const mapVerificationRecord = (v) => ({
  id: v._id,
  employee_id: v.employeeId,

  // V1 flat fields (kept for legacy records)
  street:   v.street,
  city:     v.city,
  state:    v.state,
  zip:      v.zip,
  landmark: v.landmark,

  // V2 Section A — Address Details
  address_details: v.addressDetails ? {
    full_address: v.addressDetails.fullAddress,
    landmark:     v.addressDetails.landmark,
    city:         v.addressDetails.city,
    lga:          v.addressDetails.lga,
    state:        v.addressDetails.state,
  } : null,

  // V2 Section B — Property Details
  property_details: v.propertyDetails ? {
    building_type:    v.propertyDetails.buildingType,
    building_purpose: v.propertyDetails.buildingPurpose,
    building_status:  v.propertyDetails.buildingStatus,
    building_colour:  v.propertyDetails.buildingColour,
    has_fence:        v.propertyDetails.hasFence,
    has_gate:         v.propertyDetails.hasGate,
  } : null,

  // V2 Section C — Occupancy Details
  occupancy_details: v.occupancyDetails ? {
    occupants:    v.occupancyDetails.occupants,
    relationship: v.occupancyDetails.relationship,
    notes:        v.occupancyDetails.notes,
  } : null,

  // V2 Section D — Images (Cloudinary URLs)
  images: v.images ? {
    front_view:        v.images.frontView,
    gate_view:         v.images.gateView,
    street_view:       v.images.streetView,
    additional_images: v.images.additionalImages || [],
  } : null,

  // Verification window
  verification_window_start: v.verificationWindowStart,
  verification_window_end:   v.verificationWindowEnd,

  // GPS / distance
  status:       v.verificationStatus.toLowerCase(),
  verified_at:  v.verifiedAt,
  latitude:     v.locationCoordinates?.latitude,
  longitude:    v.locationCoordinates?.longitude,
  expected_latitude:  v.expectedLatitude,
  expected_longitude: v.expectedLongitude,
  distance_km:    v.distanceFromDeclaredAddress,
  distance_flagged: v.distanceFlagged,

  // V2 internal flag (admin-only)
  internal_flag: v.internalFlag ? {
    status: v.internalFlag.status,
    reason: v.internalFlag.reason,
  } : null,

  // Admin review
  review_status: v.reviewStatus?.toLowerCase(),
  review_notes:  v.reviewNotes,
  reviewed_at:   v.reviewedAt,
  reviewed_by:   v.reviewedBy,

  created_at: v.createdAt,
  updated_at: v.updatedAt,
});

/**
 * @route   POST /api/admin/employees
 * @desc    Create new employee and generate invite
 * @access  Admin only
 */
const createEmployee = asyncHandler(async (req, res) => {
  const { fullName, email, phone } = req.body;

  if (!fullName || !email) {
    throw new AppError('Full name and email are required', 400);
  }

  const existingEmployee = await EmployeeProfile.findOne({ 
    email: email.toLowerCase() 
  });

  if (existingEmployee) {
    throw new AppError('An employee with this email already exists', 409);
  }

  const employee = await EmployeeProfile.create({
    fullName,
    email: email.toLowerCase(),
    phoneNumber: phone,
    status: 'INVITED'
  });

  await AuditLog.create({
    actorId: req.userId,
    actionType: 'EMPLOYEE_CREATED',
    targetEmployeeId: employee._id,
    metadata: { fullName, email, inviteToken: employee.inviteToken }
  });

  res.status(201).json({
    success: true,
    message: 'Employee created successfully',
    data: {
      id: employee._id,
      fullName: employee.fullName,
      email: employee.email,
      phone: employee.phoneNumber,
      status: employee.status,
      inviteToken: employee.inviteToken,
      inviteLink: `${process.env.FRONTEND_URL}/invite?token=${employee.inviteToken}`,
      createdAt: employee.createdAt
    }
  });
});

/**
 * @route   GET /api/admin/employees
 * @access  Admin only
 */
const getAllEmployees = asyncHandler(async (req, res) => {
  const employees = await EmployeeProfile.find()
    .sort({ createdAt: -1 })
    .lean();

  const employeeIds = employees.map(e => e._id);
  const verifications = await AddressVerification.find({
    employeeId: { $in: employeeIds }
  })
    .sort({ createdAt: -1 })
    .lean();

  const employeesWithVerifications = employees.map(employee => {
    const employeeVerifications = verifications.filter(
      v => v.employeeId.toString() === employee._id.toString()
    );

    return {
      id: employee._id,
      full_name: employee.fullName,
      email: employee.email,
      phone: employee.phoneNumber,
      invite_status: employee.status === 'INVITED' ? 'invited' : 'accepted',
      invite_token: employee.inviteToken,
      user_id: employee.userId,
      created_at: employee.createdAt,
      updated_at: employee.updatedAt,
      verification_records: employeeVerifications.map(mapVerificationRecord)
    };
  });

  res.json({ success: true, data: employeesWithVerifications });
});

/**
 * @route   GET /api/admin/employees/:id
 * @access  Admin only
 */
const getEmployeeById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const employee = await EmployeeProfile.findById(id).lean();

  if (!employee) {
    throw new AppError('Employee not found', 404);
  }

  const verifications = await AddressVerification.find({
    employeeId: employee._id
  })
    .sort({ createdAt: -1 })
    .lean();

  res.json({
    success: true,
    data: {
      id: employee._id,
      full_name: employee.fullName,
      email: employee.email,
      phone: employee.phoneNumber,
      invite_status: employee.status === 'INVITED' ? 'invited' : 'accepted',
      invite_token: employee.inviteToken,
      user_id: employee.userId,
      created_at: employee.createdAt,
      updated_at: employee.updatedAt,
      verification_records: verifications.map(mapVerificationRecord)
    }
  });
});

/**
 * @route   POST /api/admin/employees/:id/reverify
 * @access  Admin only
 */
const requestReverification = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const verification = await AddressVerification.findById(id);

  if (!verification) {
    throw new AppError('Verification record not found', 404);
  }

  verification.verificationStatus = 'REVERIFICATION_REQUIRED';
  verification.verifiedAt = null;
  verification.locationCoordinates = { latitude: null, longitude: null };
  verification.distanceFromDeclaredAddress = null;
  verification.distanceFlagged = false;
  await verification.save();

  await EmployeeProfile.findByIdAndUpdate(
    verification.employeeId,
    { status: 'REVERIFICATION_REQUIRED' }
  );

  await AuditLog.create({
    actorId: req.userId,
    actionType: 'REVERIFICATION_REQUESTED',
    targetEmployeeId: verification.employeeId,
    metadata: { verificationId: verification._id }
  });

  res.json({
    success: true,
    message: 'Re-verification requested successfully',
    data: { id: verification._id, status: verification.verificationStatus }
  });
});

/**
 * @route   POST /api/admin/verifications/:id/review
 * @access  Admin only
 */
const reviewVerification = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reviewStatus, reviewNotes } = req.body;

  if (!['APPROVED', 'REJECTED'].includes(reviewStatus)) {
    throw new AppError('Review status must be APPROVED or REJECTED', 400);
  }

  const verification = await AddressVerification.findById(id);

  if (!verification) {
    throw new AppError('Verification record not found', 404);
  }

  verification.reviewStatus = reviewStatus;
  verification.reviewNotes  = reviewNotes || null;
  verification.reviewedBy   = req.userId;
  verification.reviewedAt   = new Date();

  if (reviewStatus === 'REJECTED') {
    verification.verificationStatus = 'FAILED';
  }

  await verification.save();

  await AuditLog.create({
    actorId: req.userId,
    actionType: 'VERIFICATION_REVIEWED',
    targetEmployeeId: verification.employeeId,
    metadata: { verificationId: verification._id, reviewStatus, reviewNotes }
  });

  res.json({
    success: true,
    message: `Verification ${reviewStatus.toLowerCase()} successfully`,
    data: {
      id: verification._id,
      reviewStatus: verification.reviewStatus,
      reviewNotes: verification.reviewNotes,
      reviewedAt: verification.reviewedAt
    }
  });
});

/**
 * @route   GET /api/admin/dashboard/stats
 * @access  Admin only
 */
const getDashboardStats = asyncHandler(async (req, res) => {
  const totalEmployees = await EmployeeProfile.countDocuments();
  const invited = await EmployeeProfile.countDocuments({ status: 'INVITED' });

  const verifications = await AddressVerification.find().lean();

  const verified  = verifications.filter(v => v.verificationStatus === 'VERIFIED').length;
  const pending   = verifications.filter(v =>
    v.verificationStatus === 'PENDING_VERIFICATION' ||
    v.verificationStatus === 'PENDING_ADDRESS'
  ).length;
  const failed    = verifications.filter(v => v.verificationStatus === 'FAILED').length;
  const reverificationRequired = verifications.filter(v =>
    v.verificationStatus === 'REVERIFICATION_REQUIRED'
  ).length;

  res.json({
    success: true,
    data: { totalEmployees, invited, verified, pending, failed, reverificationRequired }
  });
});

/**
 * @route   GET /api/admin/settings
 * @access  Admin only
 */
const getSettings = asyncHandler(async (req, res) => {
  const settings = await CompanySettings.getSettings();

  res.json({
    success: true,
    data: {
      id: settings._id,
      company_name: settings.companyName,
      default_window_start: settings.defaultWindowStart,
      default_window_end: settings.defaultWindowEnd,
      distance_threshold_km: settings.distanceThresholdKm,
      created_at: settings.createdAt,
      updated_at: settings.updatedAt
    }
  });
});

/**
 * @route   PUT /api/admin/settings/:id
 * @access  Admin only
 */
const updateSettings = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { companyName, defaultWindowStart, defaultWindowEnd, distanceThresholdKm } = req.body;

  const settings = await CompanySettings.findById(id);

  if (!settings) {
    throw new AppError('Settings not found', 404);
  }

  if (companyName) settings.companyName = companyName;
  if (defaultWindowStart) settings.defaultWindowStart = defaultWindowStart;
  if (defaultWindowEnd) settings.defaultWindowEnd = defaultWindowEnd;
  if (distanceThresholdKm !== undefined) settings.distanceThresholdKm = distanceThresholdKm;

  await settings.save();

  await AuditLog.create({
    actorId: req.userId,
    actionType: 'SETTINGS_UPDATED',
    metadata: { companyName, defaultWindowStart, defaultWindowEnd, distanceThresholdKm }
  });

  res.json({
    success: true,
    message: 'Settings updated successfully',
    data: {
      id: settings._id,
      company_name: settings.companyName,
      default_window_start: settings.defaultWindowStart,
      default_window_end: settings.defaultWindowEnd,
      distance_threshold_km: settings.distanceThresholdKm,
      updated_at: settings.updatedAt
    }
  });
});

module.exports = {
  createEmployee,
  getAllEmployees,
  getEmployeeById,
  requestReverification,
  reviewVerification,
  getDashboardStats,
  getSettings,
  updateSettings
};