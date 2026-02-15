const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { login, logout, getMe } = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');

// Validation middleware
const validateLogin = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
];

// Routes
router.post('/login', validateLogin, login);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);

module.exports = router;