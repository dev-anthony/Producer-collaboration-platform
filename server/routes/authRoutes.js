// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController.js');
const authMiddleware = require('../middleware/authMiddleware.js');

// Exchange OAuth code for JWT token
router.get('/getAccessToken', authController.getAccessToken);

// Get GitHub user data (protected route)
router.get('/getUserData', authMiddleware.verifyToken, authController.getUserData);

module.exports = router;