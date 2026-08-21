
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController.js');
const authMiddleware = require('../middleware/authMiddleware.js');


router.post('/signup', authController.signup); 
router.post('/login', authController.login);  


router.post('/logout', authMiddleware.verifyToken, authController.logout);
router.get('/me', authMiddleware.verifyToken, authController.getMe);

module.exports = router;


