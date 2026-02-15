const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  getProfile,
  getVerificationStatus,
  submitAddress,
  verifyLocation,
  getVerificationHistory
} = require('../controllers/employee.controller');
const { authenticate, requireEmployee } = require('../middleware/auth.middleware');

// All employee routes require authentication and employee role
router.use(authenticate, requireEmployee);

// Profile
router.get('/profile', getProfile);

// Verification
router.get('/verification-status', getVerificationStatus);
router.get('/history', getVerificationHistory);

router.post('/address', [
  body('street').notEmpty().withMessage('Street is required'),
  body('city').notEmpty().withMessage('City is required'),
  body('state').notEmpty().withMessage('State is required'),
  body('zip').notEmpty().withMessage('ZIP code is required'),
  body('windowStart').notEmpty().withMessage('Verification window start is required'),
  body('windowEnd').notEmpty().withMessage('Verification window end is required')
], submitAddress);

router.post('/verify-location', [
  body('latitude').isFloat().withMessage('Valid latitude is required'),
  body('longitude').isFloat().withMessage('Valid longitude is required')
], verifyLocation);

module.exports = router;