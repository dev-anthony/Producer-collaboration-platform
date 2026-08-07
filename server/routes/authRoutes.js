// routes/authRoutes.js
// ── Phase 4.6: email/password auth routes (Supabase Auth + cookies) ──────────
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController.js');
const authMiddleware = require('../middleware/authMiddleware.js');

// Public
router.post('/signup', authController.signup); // email, password, username
router.post('/login', authController.login);   // email, password → sets httpOnly cookies

// Protected
router.post('/logout', authMiddleware.verifyToken, authController.logout);
router.get('/me', authMiddleware.verifyToken, authController.getMe);

module.exports = router;

/* ── OLD GitHub-OAuth routes (Phase 4.6 replaced) ──
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
── END OLD authRoutes ── */
