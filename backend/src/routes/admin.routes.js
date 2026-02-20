const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  createEmployee,
  getAllEmployees,
  getEmployeeById,
  requestReverification,
  reviewVerification,
  getDashboardStats,
  getSettings,
  updateSettings
} = require('../controllers/admin.controller');
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');

// ─────────────────────────────────────────────────────────────────────────────
// Admin Routes — Version 2.0
//
// UPGRADE NOTES:
//   • All original routes are preserved with identical paths.
//   • No new routes needed — the V2 response shape changes are handled
//     inside the controller via mapVerificationRecord().
//   • getDashboardStats now returns flag_breakdown in its response.
// ─────────────────────────────────────────────────────────────────────────────

// All admin routes require authentication and admin role
router.use(authenticate, requireAdmin);

// ── EMPLOYEE MANAGEMENT ───────────────────────────────────────────────────────
router.post('/employees', [
  body('fullName').notEmpty().withMessage('Full name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required')
], createEmployee);

router.get('/employees', getAllEmployees);
router.get('/employees/:id', getEmployeeById);

// ── VERIFICATION MANAGEMENT ───────────────────────────────────────────────────
// requestReverification — resets GPS data, preserves inspection form + images
router.post('/employees/:id/reverify', requestReverification);

router.post('/verifications/:id/review', [
  body('reviewStatus')
    .isIn(['APPROVED', 'REJECTED'])
    .withMessage('Review status must be APPROVED or REJECTED'),
  body('reviewNotes')
    .optional()
    .isString()
    .trim()
    .withMessage('Review notes must be a string')
], reviewVerification);

// ── DASHBOARD ─────────────────────────────────────────────────────────────────
// Response now includes flag_breakdown: { verified, review, flagged }
router.get('/dashboard/stats', getDashboardStats);

// ── SETTINGS ──────────────────────────────────────────────────────────────────
router.get('/settings', getSettings);
router.put('/settings/:id', [
  body('companyName').optional().notEmpty().withMessage('Company name cannot be empty'),
  body('defaultWindowStart').optional().matches(/^\d{2}:\d{2}$/).withMessage('Window start must be HH:MM'),
  body('defaultWindowEnd').optional().matches(/^\d{2}:\d{2}$/).withMessage('Window end must be HH:MM'),
  body('distanceThresholdKm').optional().isFloat({ min: 0.1, max: 10 }).withMessage('Threshold must be between 0.1 and 10')
], updateSettings);

module.exports = router;