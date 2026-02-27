const EmployeeProfile = require('../models/EmployeeProfile.model');
const AddressVerification = require('../models/AddressVerification.model');
const CompanySettings = require('../models/CompanySettings.model');
const AuditLog = require('../models/AuditLog.model');
const { geocodeAddress, calculateDistance, isWithinVerificationWindow } = require('../utils/geocoding');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

// ─────────────────────────────────────────────────────────────────────────────
// VERIFICATION WINDOW CONSTRAINT
//
// The system enforces a fixed overnight window: 10:00 PM → 4:00 AM.
// Slots are offered in 30-minute increments. Any time outside this list
// is rejected at the backend regardless of what the frontend sends.
// ─────────────────────────────────────────────────────────────────────────────

const ALLOWED_WINDOW_TIMES = [
  '22:00', '22:30',
  '23:00', '23:30',
  '00:00', '00:30',
  '01:00', '01:30',
  '02:00', '02:30',
  '03:00', '03:30',
  '04:00'
];

/**
 * Validates that both windowStart and windowEnd fall within the allowed
 * 10 PM – 4 AM overnight range and that start < end (in list order).
 *
 * Returns a human-readable error string, or null if valid.
 */
const validateVerificationWindow = (windowStart, windowEnd) => {
  const startIdx = ALLOWED_WINDOW_TIMES.indexOf(windowStart);
  const endIdx   = ALLOWED_WINDOW_TIMES.indexOf(windowEnd);

  if (startIdx === -1) {
    return `Start time "${windowStart}" is outside the allowed verification window (10:00 PM – 4:00 AM).`;
  }
  if (endIdx === -1) {
    return `End time "${windowEnd}" is outside the allowed verification window (10:00 PM – 4:00 AM).`;
  }
  if (endIdx <= startIdx) {
    return 'End time must be later than start time within the 10:00 PM – 4:00 AM window.';
  }
  return null; // valid
};

/**
 * @route   GET /api/employee/profile
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
    return res.json({ success: true, data: null });
  }

  const hasV2Address = verification.addressDetails && verification.addressDetails.fullAddress;

  res.json({
    success: true,
    data: {
      id: verification._id,

      // V1 fields
      street:   verification.street,
      city:     verification.city,
      state:    verification.state,
      zip:      verification.zip,
      landmark: verification.landmark,

      // V2 address details
      address_details: hasV2Address ? {
        full_address: verification.addressDetails.fullAddress,
        landmark:     verification.addressDetails.landmark,
        city:         verification.addressDetails.city,
        lga:          verification.addressDetails.lga,
        state:        verification.addressDetails.state
      } : null,

      verification_window_start: verification.verificationWindowStart,
      verification_window_end:   verification.verificationWindowEnd,

      status:      verification.verificationStatus.toLowerCase(),
      verified_at: verification.verifiedAt,

      latitude:  verification.locationCoordinates?.latitude,
      longitude: verification.locationCoordinates?.longitude,

      created_at: verification.createdAt,
      updated_at: verification.updatedAt
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// V1: submitAddress
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route   POST /api/employee/address
 * @access  Employee only
 */
const submitAddress = asyncHandler(async (req, res) => {
  const { street, city, state, zip, landmark, windowStart, windowEnd } = req.body;

  if (!street || !city || !state || !zip) {
    throw new AppError('Street, city, state, and ZIP are required', 400);
  }

  if (!windowStart || !windowEnd) {
    throw new AppError('Verification window is required', 400);
  }

  // ── Enforce 10 PM – 4 AM constraint ───────────────────────────────────────
  const windowError = validateVerificationWindow(windowStart, windowEnd);
  if (windowError) {
    throw new AppError(windowError, 400);
  }

  const employee = await EmployeeProfile.findOne({ userId: req.userId });
  if (!employee) throw new AppError('Employee profile not found', 404);

  const geocodeResult = await geocodeAddress(street, city, state, zip);
  if (geocodeResult.error && !geocodeResult.latitude) {
    console.warn('Geocoding failed, proceeding without coordinates:', geocodeResult.error);
  }

  let verification = await AddressVerification.findOne({ employeeId: employee._id });
  if (!verification) verification = new AddressVerification({ employeeId: employee._id });

  verification.street      = street;
  verification.city        = city;
  verification.state       = state;
  verification.zip         = zip;
  verification.landmark    = landmark || null;
  verification.addressText = `${street}, ${city}, ${state} ${zip}`;

  verification.verificationWindowStart = windowStart;
  verification.verificationWindowEnd   = windowEnd;
  verification.verificationStatus      = 'PENDING_VERIFICATION';
  verification.expectedLatitude        = geocodeResult.latitude;
  verification.expectedLongitude       = geocodeResult.longitude;

  await verification.save();

  employee.status = 'ACTIVE';
  await employee.save();

  await AuditLog.create({
    actorId:          req.userId,
    actionType:       'ADDRESS_SUBMITTED',
    targetEmployeeId: employee._id,
    metadata: { address: verification.addressText, verificationId: verification._id }
  });

  res.json({
    success: true,
    message: 'Address submitted successfully',
    data: {
      id:                        verification._id,
      status:                    verification.verificationStatus,
      verification_window_start: verification.verificationWindowStart,
      verification_window_end:   verification.verificationWindowEnd
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// V2: submitInspection
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route   POST /api/employee/inspection
 * @access  Employee only
 */
const submitInspection = asyncHandler(async (req, res) => {
  const {
    // Section A
    fullAddress, landmark, city, lga, state,
    // Section B
    buildingType, buildingPurpose, buildingStatus, buildingColour, hasFence, hasGate,
    // Section C
    occupants, relationship, notes,
    // Window
    windowStart, windowEnd
  } = req.body;

  // ── Required field validation ─────────────────────────────────────────────
  if (!fullAddress || !city || !state) {
    throw new AppError('Full address, city, and state are required', 400);
  }
  if (!windowStart || !windowEnd) {
    throw new AppError('Verification window is required', 400);
  }
  if (!buildingType || !buildingPurpose || !buildingStatus) {
    throw new AppError('Building type, purpose, and status are required', 400);
  }
  if (!occupants) {
    throw new AppError('Occupancy information is required', 400);
  }

  // ── Enforce 10 PM – 4 AM constraint ───────────────────────────────────────
  const windowError = validateVerificationWindow(windowStart, windowEnd);
  if (windowError) {
    throw new AppError(windowError, 400);
  }

  const employee = req.employeeProfile;
  if (!employee) throw new AppError('Employee profile not found', 404);

  // ── One-time verification rule ────────────────────────────────────────────
  const existing = await AddressVerification.findOne({ employeeId: employee._id })
    .sort({ createdAt: -1 });

  if (existing && existing.verificationStatus === 'VERIFIED') {
    throw new AppError(
      'Your address is already verified. Contact your administrator to request re-verification.',
      400
    );
  }

  const geocodeResult = await geocodeAddress(fullAddress, city, state, lga || '');
  if (geocodeResult.error && !geocodeResult.latitude) {
    console.warn('Geocoding failed, proceeding without coordinates:', geocodeResult.error);
  }

  let verification = existing || new AddressVerification({ employeeId: employee._id });

  verification.addressDetails = {
    fullAddress: fullAddress.trim(),
    landmark:    landmark?.trim() || null,
    city:        city.trim(),
    lga:         lga?.trim() || null,
    state:       state.trim()
  };

  verification.addressText = [fullAddress, city, lga, state].filter(Boolean).join(', ');
  verification.city  = city;
  verification.state = state;

  verification.propertyDetails = {
    buildingType,
    buildingPurpose,
    buildingStatus,
    buildingColour: buildingColour?.trim() || null,
    hasFence: hasFence === 'true',
    hasGate:  hasGate  === 'true'
  };

  verification.occupancyDetails = {
    occupants:    occupants.trim(),
    relationship: relationship?.trim() || null,
    notes:        notes?.trim() || null
  };

  if (req.uploadedImages) {
    verification.images = {
      frontView:        req.uploadedImages.frontView || null,
      gateView:         req.uploadedImages.gateView || null,
      streetView:       req.uploadedImages.streetView || null,
      additionalImages: req.uploadedImages.additionalImages || []
    };
  }

  verification.verificationWindowStart = windowStart;
  verification.verificationWindowEnd   = windowEnd;
  verification.verificationStatus      = 'PENDING_VERIFICATION';
  verification.expectedLatitude        = geocodeResult.latitude;
  verification.expectedLongitude       = geocodeResult.longitude;

  verification.locationCoordinates         = { latitude: null, longitude: null };
  verification.distanceFromDeclaredAddress = null;
  verification.distanceFlagged             = false;
  verification.internalFlag                = { status: null, reason: null };
  verification.verifiedAt                  = null;

  await verification.save();

  employee.status = 'ACTIVE';
  await employee.save();

  await AuditLog.create({
    actorId:          req.userId,
    actionType:       'INSPECTION_SUBMITTED',
    targetEmployeeId: employee._id,
    metadata: {
      verificationId: verification._id,
      address:        verification.addressText,
      hasImages:      !!(req.uploadedImages?.frontView)
    }
  });

  if (req.uploadedImages?.frontView) {
    const uploadedTypes = Object.entries(req.uploadedImages)
      .filter(([key, val]) => key === 'additionalImages' ? val?.length > 0 : !!val)
      .map(([key]) => key);

    await AuditLog.create({
      actorId:          req.userId,
      actionType:       'IMAGE_UPLOADED',
      targetEmployeeId: employee._id,
      metadata: {
        verificationId: verification._id,
        imageTypes:     uploadedTypes,
        count:          uploadedTypes.length + (req.uploadedImages.additionalImages?.length || 0) - 1
      }
    });
  }

  res.json({
    success: true,
    message: 'Inspection submitted successfully. Please confirm your location during your verification window.',
    data: {
      id:                        verification._id,
      status:                    verification.verificationStatus,
      verification_window_start: verification.verificationWindowStart,
      verification_window_end:   verification.verificationWindowEnd,
      images_uploaded:           !!(req.uploadedImages?.frontView)
    }
  });
});

/**
 * @route   POST /api/employee/verify-location
 * @access  Employee only
 *
 * FIX: Now accepts `clientTime` ("HH:MM") from the request body.
 *
 * Root cause of the original bug:
 *   The server runs in UTC. Employees are in Nigeria (WAT = UTC+1).
 *   When an employee selected a window of 23:00–00:00 (11 PM–midnight WAT),
 *   the backend's isWithinVerificationWindow() used new Date() which returns
 *   UTC time. At 11:30 PM Nigeria time = 10:30 PM UTC, the check saw
 *   "22:30 >= 23:00" → false → rejected. The only moment it passed was
 *   midnight Nigeria time = 23:00 UTC, making it appear to "only work at
 *   midnight". By passing the browser's local time (clientTime), the check
 *   always uses the correct timezone without any server config changes.
 */
const verifyLocation = asyncHandler(async (req, res) => {
  const { latitude, longitude, distanceThresholdKm, clientTime } = req.body;

  if (!latitude || !longitude) {
    throw new AppError('Latitude and longitude are required', 400);
  }

  const employee = await EmployeeProfile.findOne({ userId: req.userId });
  if (!employee) throw new AppError('Employee profile not found', 404);

  const verification = await AddressVerification.findOne({ employeeId: employee._id })
    .sort({ createdAt: -1 });

  if (!verification) throw new AppError('No address submitted yet', 400);
  if (verification.verificationStatus === 'VERIFIED') throw new AppError('Location already verified', 400);

  if (
    verification.verificationStatus !== 'PENDING_VERIFICATION' &&
    verification.verificationStatus !== 'REVERIFICATION_REQUIRED'
  ) {
    throw new AppError('Address must be submitted before verification', 400);
  }

  // Pass clientTime so the window check uses the employee's local clock (WAT),
  // not the server's UTC clock. Falls back gracefully if not provided.
  if (!isWithinVerificationWindow(
    verification.verificationWindowStart,
    verification.verificationWindowEnd,
    clientTime || null
  )) {
    throw new AppError('Verification can only be done during your scheduled window', 400);
  }

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

  verification.locationCoordinates         = { latitude, longitude };
  verification.verificationStatus          = 'VERIFIED';
  verification.verifiedAt                  = new Date();
  verification.distanceFromDeclaredAddress = distance;
  verification.distanceFlagged             = distanceFlagged;
  verification.reviewStatus                = 'PENDING';

  if (distance !== null) verification.computeInternalFlag();

  await verification.save();

  employee.status = 'VERIFIED';
  await employee.save();

  await AuditLog.create({
    actorId:          req.userId,
    actionType:       'LOCATION_VERIFIED',
    targetEmployeeId: employee._id,
    metadata: {
      verificationId: verification._id,
      latitude, longitude, distance, distanceFlagged,
      internalFlag: verification.internalFlag?.status || null
    }
  });

  res.json({
    success: true,
    message: distanceFlagged
      ? 'Location verified but flagged for review due to distance'
      : 'Location verified successfully',
    data: {
      id:               verification._id,
      status:           verification.verificationStatus,
      verified_at:      verification.verifiedAt,
      distance_km:      distance,
      distance_flagged: distanceFlagged
    }
  });
});

/**
 * @route   GET /api/employee/history
 * @access  Employee only
 */
const getVerificationHistory = asyncHandler(async (req, res) => {
  const employee = await EmployeeProfile.findOne({ userId: req.userId });
  if (!employee) throw new AppError('Employee profile not found', 404);

  const verifications = await AddressVerification.find({ employeeId: employee._id })
    .sort({ createdAt: -1 })
    .lean();

  res.json({
    success: true,
    data: verifications.map(v => ({
      id:          v._id,
      street:      v.addressDetails?.fullAddress || v.street,
      city:        v.addressDetails?.city || v.city,
      state:       v.addressDetails?.state || v.state,
      zip:         v.zip,
      status:      v.verificationStatus.toLowerCase(),
      verified_at: v.verifiedAt,
      created_at:  v.createdAt
    }))
  });
});

module.exports = {
  getProfile,
  getVerificationStatus,
  submitAddress,
  submitInspection,
  verifyLocation,
  getVerificationHistory
};