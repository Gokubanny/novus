const EmployeeProfile = require('../models/EmployeeProfile.model');
const AddressVerification = require('../models/AddressVerification.model');
const CompanySettings = require('../models/CompanySettings.model');
const AuditLog = require('../models/AuditLog.model');
const { geocodeAddress, calculateDistance, isWithinVerificationWindow } = require('../utils/geocoding');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

// ─────────────────────────────────────────────────────────────────────────────
// Employee Controller — Version 2.0
//
// UPGRADE NOTES:
//   • submitAddress (V1) is kept intact for backwards compatibility.
//   • submitInspection (V2) is the new primary submission endpoint.
//     It handles multipart/form-data and expects req.uploadedImages to
//     be populated by upload.middleware.js before this controller runs.
//   • verifyLocation now calls verification.computeInternalFlag() after
//     distance calculation — admin sees VERIFIED/REVIEW/FLAGGED, employee
//     always sees the plain verificationStatus field only.
//   • getVerificationStatus explicitly strips internalFlag from the response.
// ─────────────────────────────────────────────────────────────────────────────

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
 * @desc    Get current verification status — internalFlag is intentionally omitted
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

  // ── Build address display using V2 fields, fall back to V1 ───────────────
  const hasV2Address = verification.addressDetails && verification.addressDetails.fullAddress;

  res.json({
    success: true,
    data: {
      id: verification._id,

      // V1 fields (kept for legacy records)
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

      // Employee sees verificationStatus only — NOT internalFlag
      status:      verification.verificationStatus.toLowerCase().replace(/_/g, '_'),
      verified_at: verification.verifiedAt,

      latitude:  verification.locationCoordinates?.latitude,
      longitude: verification.locationCoordinates?.longitude,

      created_at: verification.createdAt,
      updated_at: verification.updatedAt

      // internalFlag is intentionally excluded here
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// V1: submitAddress — PRESERVED for backwards compatibility
// New submissions should use submitInspection (V2) below.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route   POST /api/employee/address
 * @desc    (V1) Submit or update residential address — text fields only
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

  const geocodeResult = await geocodeAddress(street, city, state, zip);

  if (geocodeResult.error && !geocodeResult.latitude) {
    console.warn('Geocoding failed, proceeding without coordinates:', geocodeResult.error);
  }

  let verification = await AddressVerification.findOne({ employeeId: employee._id });

  if (!verification) {
    verification = new AddressVerification({ employeeId: employee._id });
  }

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
    metadata: {
      address:        verification.addressText,
      verificationId: verification._id
    }
  });

  res.json({
    success: true,
    message: 'Address submitted successfully',
    data: {
      id:                         verification._id,
      status:                     verification.verificationStatus,
      verification_window_start:  verification.verificationWindowStart,
      verification_window_end:    verification.verificationWindowEnd
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// V2: submitInspection — Full structured inspection form with images
//
// Expects upload.middleware.js (uploadInspectionImages stack) to have run
// before this controller, which populates:
//   req.uploadedImages  — { frontView, gateView, streetView, additionalImages[] }
//   req.employeeProfile — set by attachEmployeeProfile middleware in the route
//
// Body fields (all text — multer parses these from multipart/form-data):
//   Section A: fullAddress, landmark, city, lga, state
//   Section B: buildingType, buildingPurpose, buildingStatus,
//              buildingColour, hasFence, hasGate
//   Section C: occupants, relationship, notes
//   Window:    windowStart, windowEnd
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route   POST /api/employee/inspection
 * @desc    (V2) Submit full structured inspection form with images
 * @access  Employee only
 */
const submitInspection = asyncHandler(async (req, res) => {
  const {
    // Section A — Address Details
    fullAddress,
    landmark,
    city,
    lga,
    state,

    // Section B — Property Details
    buildingType,
    buildingPurpose,
    buildingStatus,
    buildingColour,
    hasFence,
    hasGate,

    // Section C — Occupancy
    occupants,
    relationship,
    notes,

    // Verification Window
    windowStart,
    windowEnd
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

  // ── Get employee profile ──────────────────────────────────────────────────
  // req.employeeProfile is attached by attachEmployeeProfile middleware
  const employee = req.employeeProfile;

  if (!employee) {
    throw new AppError('Employee profile not found', 404);
  }

  // ── Check one-time verification rule ─────────────────────────────────────
  // Employees who are already VERIFIED cannot re-submit unless admin
  // explicitly requests re-verification (which sets status to REVERIFICATION_REQUIRED)
  const existing = await AddressVerification.findOne({ employeeId: employee._id })
    .sort({ createdAt: -1 });

  if (existing && existing.verificationStatus === 'VERIFIED') {
    throw new AppError(
      'Your address is already verified. Contact your administrator to request re-verification.',
      400
    );
  }

  // ── Geocode the submitted address ─────────────────────────────────────────
  // Use fullAddress + city + state for geocoding (zip not required in V2)
  const geocodeResult = await geocodeAddress(fullAddress, city, state, lga || '');

  if (geocodeResult.error && !geocodeResult.latitude) {
    console.warn('Geocoding failed, proceeding without coordinates:', geocodeResult.error);
  }

  // ── Build or update the verification record ───────────────────────────────
  let verification = existing || new AddressVerification({ employeeId: employee._id });

  // Section A — Address Details
  verification.addressDetails = {
    fullAddress: fullAddress.trim(),
    landmark:    landmark?.trim() || null,
    city:        city.trim(),
    lga:         lga?.trim() || null,
    state:       state.trim()
  };

  // Keep legacy addressText for any code that still reads V1 fields
  verification.addressText = [fullAddress, city, lga, state].filter(Boolean).join(', ');
  verification.city        = city;
  verification.state       = state;

  // Section B — Property Details
  // hasFence and hasGate arrive as strings from multipart form — convert to boolean
  verification.propertyDetails = {
    buildingType:    buildingType,
    buildingPurpose: buildingPurpose,
    buildingStatus:  buildingStatus,
    buildingColour:  buildingColour?.trim() || null,
    hasFence:        hasFence === 'true',
    hasGate:         hasGate === 'true'
  };

  // Section C — Occupancy Details
  verification.occupancyDetails = {
    occupants:    occupants.trim(),
    relationship: relationship?.trim() || null,
    notes:        notes?.trim() || null
  };

  // Images — populated by upload.middleware.js
  if (req.uploadedImages) {
    verification.images = {
      frontView:        req.uploadedImages.frontView || null,
      gateView:         req.uploadedImages.gateView || null,
      streetView:       req.uploadedImages.streetView || null,
      additionalImages: req.uploadedImages.additionalImages || []
    };
  }

  // Verification window + status
  verification.verificationWindowStart = windowStart;
  verification.verificationWindowEnd   = windowEnd;
  verification.verificationStatus      = 'PENDING_VERIFICATION';

  // Geocoding results
  verification.expectedLatitude  = geocodeResult.latitude;
  verification.expectedLongitude = geocodeResult.longitude;

  // Reset GPS data if this is a re-submission
  verification.locationCoordinates         = { latitude: null, longitude: null };
  verification.distanceFromDeclaredAddress = null;
  verification.distanceFlagged             = false;
  verification.internalFlag                = { status: null, reason: null };
  verification.verifiedAt                  = null;

  await verification.save();

  // Update employee status
  employee.status = 'ACTIVE';
  await employee.save();

  // ── Audit log: inspection submitted ──────────────────────────────────────
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

  // ── Audit log: images uploaded (if any) ──────────────────────────────────
  if (req.uploadedImages?.frontView) {
    const uploadedTypes = Object.entries(req.uploadedImages)
      .filter(([key, val]) => {
        if (key === 'additionalImages') return val && val.length > 0;
        return !!val;
      })
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
 * @desc    Capture GPS during verification window + compute internal flag
 * @access  Employee only
 */
const verifyLocation = asyncHandler(async (req, res) => {
  const { latitude, longitude, distanceThresholdKm } = req.body;

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

  if (verification.verificationStatus === 'VERIFIED') {
    throw new AppError('Location already verified', 400);
  }

  if (
    verification.verificationStatus !== 'PENDING_VERIFICATION' &&
    verification.verificationStatus !== 'REVERIFICATION_REQUIRED'
  ) {
    throw new AppError('Address must be submitted before verification', 400);
  }

  if (!isWithinVerificationWindow(
    verification.verificationWindowStart,
    verification.verificationWindowEnd
  )) {
    throw new AppError(
      'Verification can only be done during your scheduled window',
      400
    );
  }

  // ── Calculate distance ────────────────────────────────────────────────────
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

  // ── Update GPS fields ─────────────────────────────────────────────────────
  verification.locationCoordinates         = { latitude, longitude };
  verification.verificationStatus          = 'VERIFIED';
  verification.verifiedAt                  = new Date();
  verification.distanceFromDeclaredAddress = distance;
  verification.distanceFlagged             = distanceFlagged;
  verification.reviewStatus                = 'PENDING';

  // ── V2: Compute internal flag (admin-only classification) ─────────────────
  // Uses the instance method defined in AddressVerification.model.js
  // VERIFIED ≤ 100m | REVIEW 100–500m | FLAGGED > 500m
  if (distance !== null) {
    verification.computeInternalFlag();
  }

  await verification.save();

  employee.status = 'VERIFIED';
  await employee.save();

  await AuditLog.create({
    actorId:          req.userId,
    actionType:       'LOCATION_VERIFIED',
    targetEmployeeId: employee._id,
    metadata: {
      verificationId:  verification._id,
      latitude,
      longitude,
      distance,
      distanceFlagged,
      internalFlag:    verification.internalFlag?.status || null
    }
  });

  // ── Employee-facing response: NO internalFlag ─────────────────────────────
  res.json({
    success: true,
    message: distanceFlagged
      ? 'Location verified but flagged for review due to distance'
      : 'Location verified successfully',
    data: {
      id:              verification._id,
      status:          verification.verificationStatus,
      verified_at:     verification.verifiedAt,
      distance_km:     distance,
      distance_flagged: distanceFlagged
      // internalFlag intentionally omitted
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
      id:         v._id,
      // Use V2 address if available, fall back to V1
      street:     v.addressDetails?.fullAddress || v.street,
      city:       v.addressDetails?.city || v.city,
      state:      v.addressDetails?.state || v.state,
      zip:        v.zip,
      status:     v.verificationStatus.toLowerCase().replace(/_/g, '_'),
      verified_at: v.verifiedAt,
      created_at:  v.createdAt
      // internalFlag intentionally omitted
    }))
  });
});

module.exports = {
  getProfile,
  getVerificationStatus,
  submitAddress,       // V1 — kept for backwards compatibility
  submitInspection,    // V2 — new primary endpoint
  verifyLocation,
  getVerificationHistory
};