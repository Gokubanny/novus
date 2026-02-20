const multer = require('multer');
const { uploadToCloudinary } = require('../config/cloudinary');
const { AppError } = require('./errorHandler');

// ─────────────────────────────────────────────────────────────────────────────
// Upload Middleware — Version 2.0
//
// Handles multipart/form-data for the V2 inspection form.
// Pipeline:
//   1. multer validates file type + size and stores file in memory (no disk I/O)
//   2. processInspectionImages() uploads each buffer to Cloudinary
//   3. Attaches structured { frontView, gateView, streetView, additionalImages }
//      onto req.uploadedImages for the controller to consume
//
// Expected form fields:
//   frontView          (single, required)
//   gateView           (single, conditionally required)
//   streetView         (single, required)
//   additionalImages   (multiple, optional — max 5)
// ─────────────────────────────────────────────────────────────────────────────

// ── ALLOWED FILE TYPES ────────────────────────────────────────────────────────
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_ADDITIONAL_IMAGES = 5;

// ── MULTER STORAGE ────────────────────────────────────────────────────────────
// memoryStorage keeps files as Buffers in RAM.
// We never write to disk — buffers are piped straight to Cloudinary.
const storage = multer.memoryStorage();

// ── FILE FILTER ───────────────────────────────────────────────────────────────
// Reject unsupported types immediately — before hitting Cloudinary.
const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);  // Accept
  } else {
    cb(
      new AppError(
        `Invalid file type "${file.mimetype}". Only JPG, PNG, and WebP images are accepted.`,
        400
      ),
      false  // Reject
    );
  }
};

// ── MULTER INSTANCE ───────────────────────────────────────────────────────────
const multerUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,  // Per-file limit
    files: 8                         // Max total files (1 front + 1 gate + 1 street + 5 additional)
  }
});

// ── FIELD CONFIGURATION ───────────────────────────────────────────────────────
// Mirrors the frontend FormData field names exactly.
const inspectionFields = multerUpload.fields([
  { name: 'frontView',        maxCount: 1 },
  { name: 'gateView',         maxCount: 1 },
  { name: 'streetView',       maxCount: 1 },
  { name: 'additionalImages', maxCount: MAX_ADDITIONAL_IMAGES }
]);

// ── MULTER ERROR HANDLER ──────────────────────────────────────────────────────
// Converts multer-specific errors into our standard AppError format.
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(new AppError(`File too large. Maximum size is 5MB per image.`, 400));
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return next(new AppError(`Too many files. Maximum is 8 images per submission.`, 400));
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return next(new AppError(`Unexpected field name "${err.field}". Check your form fields.`, 400));
    }
    return next(new AppError(`File upload error: ${err.message}`, 400));
  }
  // Pass non-multer errors straight through
  next(err);
};

// ── CLOUDINARY PROCESSOR ──────────────────────────────────────────────────────
// Runs after multer parses the multipart form.
// Takes every file buffer, uploads to Cloudinary, and builds req.uploadedImages.
//
// Fails fast: if any required image fails to upload, the whole request errors.
// The controller should NOT save the record if this middleware throws.
//
const processInspectionImages = async (req, res, next) => {
  try {
    // If no files were uploaded at all, skip processing
    // Required-field validation is handled in the controller
    if (!req.files || Object.keys(req.files).length === 0) {
      req.uploadedImages = {
        frontView:        null,
        gateView:         null,
        streetView:       null,
        additionalImages: []
      };
      return next();
    }

    // Pull the employeeId from the JWT-authenticated user context.
    // auth.middleware.js must run before this middleware on protected routes.
    const employeeId = req.employeeProfile?._id?.toString() || 'unknown';

    const uploadedImages = {
      frontView:        null,
      gateView:         null,
      streetView:       null,
      additionalImages: []
    };

    // ── Upload frontView ───────────────────────────────────────────────────
    if (req.files.frontView && req.files.frontView[0]) {
      const file = req.files.frontView[0];
      const result = await uploadToCloudinary(
        file.buffer,
        employeeId,
        'frontView',
        file.mimetype
      );
      uploadedImages.frontView = result.secure_url;
    }

    // ── Upload gateView ────────────────────────────────────────────────────
    if (req.files.gateView && req.files.gateView[0]) {
      const file = req.files.gateView[0];
      const result = await uploadToCloudinary(
        file.buffer,
        employeeId,
        'gateView',
        file.mimetype
      );
      uploadedImages.gateView = result.secure_url;
    }

    // ── Upload streetView ──────────────────────────────────────────────────
    if (req.files.streetView && req.files.streetView[0]) {
      const file = req.files.streetView[0];
      const result = await uploadToCloudinary(
        file.buffer,
        employeeId,
        'streetView',
        file.mimetype
      );
      uploadedImages.streetView = result.secure_url;
    }

    // ── Upload additionalImages ────────────────────────────────────────────
    if (req.files.additionalImages && req.files.additionalImages.length > 0) {
      const additionalUploads = req.files.additionalImages.map((file) =>
        uploadToCloudinary(
          file.buffer,
          employeeId,
          'additionalImages',
          file.mimetype
        )
      );

      // Upload all additional images in parallel for speed
      const results = await Promise.all(additionalUploads);
      uploadedImages.additionalImages = results.map((r) => r.secure_url);
    }

    // Attach results to the request object for the controller
    req.uploadedImages = uploadedImages;

    next();
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    next(new AppError('Image upload failed. Please try again.', 500));
  }
};

// ── VALIDATION MIDDLEWARE ─────────────────────────────────────────────────────
// Checks that the required images were actually uploaded after processing.
// Runs after processInspectionImages.
//
// Rules:
//   - frontView  → always required
//   - streetView → always required
//   - gateView   → required when hasFence or hasGate is 'true' in the form body
//
const validateRequiredImages = (req, res, next) => {
  const images = req.uploadedImages || {};
  const { hasFence, hasGate } = req.body;

  const missing = [];

  if (!images.frontView) {
    missing.push('Front View of Building (frontView) is required');
  }

  if (!images.streetView) {
    missing.push('Street View (streetView) is required');
  }

  // Gate/fence image is required when the employee indicated there is one
  const fenceOrGatePresent = hasFence === 'true' || hasGate === 'true';
  if (fenceOrGatePresent && !images.gateView) {
    missing.push('Gate/Fence View (gateView) is required when fence or gate is present');
  }

  if (missing.length > 0) {
    return next(new AppError(missing.join('. '), 400));
  }

  next();
};

// ── COMBINED MIDDLEWARE STACK ─────────────────────────────────────────────────
// Export a ready-to-use array for the route definition:
//
//   router.post(
//     '/inspection',
//     authenticate,
//     requireEmployee,
//     ...uploadInspectionImages,   // ← spread this array
//     submitInspection
//   );
//
const uploadInspectionImages = [
  // Step 1: Parse multipart form + validate file types/sizes
  inspectionFields,
  // Step 2: Handle multer-specific errors before they reach the global handler
  handleMulterError,
  // Step 3: Upload valid files to Cloudinary
  processInspectionImages,
  // Step 4: Enforce required image rules
  validateRequiredImages
];

module.exports = {
  uploadInspectionImages,
  // Export individually for testing or custom route compositions
  inspectionFields,
  handleMulterError,
  processInspectionImages,
  validateRequiredImages
};