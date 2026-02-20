const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  getProfile,
  getVerificationStatus,
  submitAddress,
  submitInspection,
  verifyLocation,
  getVerificationHistory
} = require('../controllers/employee.controller');
const { authenticate, requireEmployee } = require('../middleware/auth.middleware');
const { uploadInspectionImages } = require('../middleware/upload.middleware');
const EmployeeProfile = require('../models/EmployeeProfile.model');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

// ─────────────────────────────────────────────────────────────────────────────
// Employee Routes — Version 2.0
//
// UPGRADE NOTES:
//   • All original routes are preserved.
//   • New route: POST /inspection — V2 full inspection form with image upload.
//   • attachEmployeeProfile middleware is added specifically to the inspection
//     route so upload.middleware.js can access req.employeeProfile._id for
//     Cloudinary folder organisation without an extra DB call in the middleware.
// ─────────────────────────────────────────────────────────────────────────────

// ── MIDDLEWARE: Attach Employee Profile to Request ────────────────────────────
// Fetches the EmployeeProfile for the authenticated user and attaches it to
// req.employeeProfile. Used by the inspection route so the upload middleware
// can use the employee's _id for Cloudinary folder naming.
const attachEmployeeProfile = asyncHandler(async (req, res, next) => {
  const employee = await EmployeeProfile.findOne({ userId: req.userId });

  if (!employee) {
    throw new AppError('Employee profile not found', 404);
  }

  req.employeeProfile = employee;
  next();
});

// All employee routes require authentication + employee role
router.use(authenticate, requireEmployee);

// ── PROFILE ───────────────────────────────────────────────────────────────────
router.get('/profile', getProfile);

// ── VERIFICATION STATUS & HISTORY ────────────────────────────────────────────
router.get('/verification-status', getVerificationStatus);
router.get('/history', getVerificationHistory);

// ── V1: ADDRESS SUBMISSION (preserved for backwards compatibility) ─────────────
router.post('/address', [
  body('street').notEmpty().withMessage('Street is required'),
  body('city').notEmpty().withMessage('City is required'),
  body('state').notEmpty().withMessage('State is required'),
  body('zip').notEmpty().withMessage('ZIP code is required'),
  body('windowStart').notEmpty().withMessage('Verification window start is required'),
  body('windowEnd').notEmpty().withMessage('Verification window end is required')
], submitAddress);

// ── V2: INSPECTION SUBMISSION (new primary endpoint) ─────────────────────────
// Pipeline:
//   1. authenticate + requireEmployee (applied globally above)
//   2. attachEmployeeProfile — fetches EmployeeProfile, attaches to req
//   3. uploadInspectionImages — multer parse → Cloudinary upload → validation
//   4. submitInspection controller
//
// Note: express-validator body() checks do NOT work with multipart/form-data
// because multer parses the body. Validation is handled inside the controller
// and upload middleware instead.
router.post(
  '/inspection',
  attachEmployeeProfile,
  ...uploadInspectionImages,
  submitInspection
);

// ── LOCATION VERIFICATION ─────────────────────────────────────────────────────
router.post('/verify-location', [
  body('latitude').isFloat().withMessage('Valid latitude is required'),
  body('longitude').isFloat().withMessage('Valid longitude is required')
], verifyLocation);

module.exports = router;