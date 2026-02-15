const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { getInviteDetails, acceptInvite } = require('../controllers/invite.controller');

// Validation middleware
const validateAcceptInvite = [
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
];

// Routes
router.get('/:token', getInviteDetails);
router.post('/:token/accept', validateAcceptInvite, acceptInvite);

module.exports = router;