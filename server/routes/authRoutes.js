// // routes/authRoutes.js
// const express = require('express');
// const router = express.Router();
// const authController = require('../controllers/authController.js');
// const authMiddleware = require('../middleware/authMiddleware.js');

// // Exchange OAuth code for JWT token
// router.get('/getAccessToken', authController.getAccessToken);

// // Get GitHub user data (protected route)
// router.get('/getUserData', authMiddleware.verifyToken, authController.getUserData);

// router.post('/logout', authMiddleware.verifyToken, authController.revokeGitHubToken);


// module.exports = router;
// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController.js');
const authMiddleware = require('../middleware/authMiddleware.js');

// Exchange OAuth code for JWT token
router.get('/getAccessToken', authController.getAccessToken);

// Refresh access token using refresh token
router.post('/refresh', authController.refreshToken);

// Get GitHub user data (protected route)
router.get('/getUserData', authMiddleware.verifyToken, authController.getUserData);

// Logout endpoint
router.post('/logout', authMiddleware.verifyToken, authController.revokeGitHubToken);

module.exports = router;