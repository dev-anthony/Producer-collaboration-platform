// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');

exports.verifyToken = (req, res, next) => {
  const authHeader = req.get('Authorization');
  console.log('Auth header:', authHeader);

  if (!authHeader) {
    return res.status(401).json({ error: 'No Authorization header provided' });
  }

  // Extract token from "Bearer <token>"
  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Invalid Authorization header format' });
  }

  try {
    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Decoded JWT:', decoded);

    // Attach user info to request
    req.userId = decoded.userId;
    req.githubId = decoded.githubId;
    req.username = decoded.username;

    next();
  } catch (error) {
    console.error('JWT verification error:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired',
        message: 'Please login again' 
      });
    }
    
    return res.status(401).json({ 
      error: 'Invalid token',
      message: error.message 
    });
  }
};