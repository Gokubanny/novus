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

// All admin routes require authentication and admin role
router.use(authenticate, requireAdmin);

// Employee management
router.post('/employees', [
  body('fullName').notEmpty().withMessage('Full name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required')
], createEmployee);

router.get('/employees', getAllEmployees);
router.get('/employees/:id', getEmployeeById);

// Verification management
router.post('/employees/:id/reverify', requestReverification);
router.post('/verifications/:id/review', [
  body('reviewStatus').isIn(['APPROVED', 'REJECTED']).withMessage('Invalid review status')
], reviewVerification);

// Dashboard
router.get('/dashboard/stats', getDashboardStats);

// Settings
router.get('/settings', getSettings);
router.put('/settings/:id', updateSettings);

module.exports = router;