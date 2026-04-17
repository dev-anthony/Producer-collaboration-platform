// // middleware/authMiddleware.js
// const jwt = require('jsonwebtoken');

// exports.verifyToken = (req, res, next) => {
//   const authHeader = req.get('Authorization');
//   console.log('Auth header:', authHeader);

//   if (!authHeader) {
//     return res.status(401).json({ error: 'No Authorization header provided' });
//   }

//   // Extract token from "Bearer <token>"
//   const token = authHeader.split(' ')[1];

//   if (!token) {
//     return res.status(401).json({ error: 'Invalid Authorization header format' });
//   }

//   try {
//     // Verify JWT token
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     console.log('Decoded JWT:', decoded);

//     // Attach user info to request
//     req.userId = decoded.userId;
//     req.githubId = decoded.githubId;
//     req.username = decoded.username;

//     next();
//   } catch (error) {
//     console.error('JWT verification error:', error);
    
//     if (error.name === 'TokenExpiredError') {
//       return res.status(401).json({ 
//         error: 'Token expired',
//         message: 'Please login again' 
//       });
//     }
    
//     return res.status(401).json({ 
//       error: 'Invalid token',
//       message: error.message 
//     });
//   }
// };
// Enhanced authMiddleware.js with detailed debugging

const jwt = require('jsonwebtoken');

exports.verifyToken = (req, res, next) => {
  // DEBUG: Log all headers
  // console.log('\n🔍 === TOKEN VERIFICATION DEBUG ===');
  // console.log(' All Headers:', JSON.stringify(req.headers, null, 2));
  
  const authHeader = req.get('Authorization');
  // console.log(' Authorization Header:', authHeader);
  
  if (!authHeader) {
    console.error(' No Authorization header found!');
    return res.status(401).json({ 
      error: 'No Authorization header provided',
      debug: 'Authorization header is missing from the request'
    });
  }

  // Check if it starts with "Bearer "
  if (!authHeader.startsWith('Bearer ')) {
    console.error(' Authorization header does not start with "Bearer "');
    return res.status(401).json({ 
      error: 'Invalid Authorization header format',
      debug: `Header should start with "Bearer " but got: ${authHeader.substring(0, 20)}...`
    });
  }

  // Extract token
  const token = authHeader.split(' ')[1];
  // console.log(' Extracted Token:', token ? `${token.substring(0, 30)}...` : 'EMPTY');
  // console.log(' Token Length:', token?.length);
  
  if (!token) {
    console.error(' Token is empty after extraction');
    return res.status(401).json({ 
      error: 'Invalid Authorization header format',
      debug: 'Token is empty after "Bearer " prefix'
    });
  }

  // Check token structure (JWT should have 3 parts)
  const tokenParts = token.split('.');
  // console.log(' Token Parts:', tokenParts.length, '(should be 3)');
  
  if (tokenParts.length !== 3) {
    console.error('Token does not have 3 parts (header.payload.signature)');
    return res.status(401).json({ 
      error: 'Malformed JWT token',
      debug: `Token has ${tokenParts.length} parts, expected 3`
    });
  }

  // Check JWT_SECRET
  if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET is not set in environment!');
    return res.status(500).json({ 
      error: 'Server configuration error',
      debug: 'JWT_SECRET is not configured'
    });
  }
  // console.log(' JWT_SECRET exists:', process.env.JWT_SECRET ? 'YES' : 'NO');
  // console.log('JWT_SECRET length:', process.env.JWT_SECRET?.length);

  try {
    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // console.log(' Token verified successfully!');
    // console.log(' Decoded payload:', JSON.stringify(decoded, null, 2));
    
    // Attach user info to request
    req.userId = decoded.userId;
    req.githubId = decoded.githubId;
    req.username = decoded.username;
    
    // console.log(' User authenticated:', {
    //   userId: req.userId,
    //   githubId: req.githubId,
    //   username: req.username
    // });
    // console.log('🔍 === END TOKEN VERIFICATION ===\n');
    
    next();
  } catch (error) {
    console.error(' JWT Verification Failed!');
    console.error(' Error Name:', error.name);
    console.error(' Error Message:', error.message);
    console.error(' Full Error:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expired',
        message: 'Your session has expired. Please login again.',
        debug: {
          expiredAt: error.expiredAt,
          now: new Date().toISOString()
        }
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'Token signature is invalid or token is malformed',
        debug: error.message
      });
    }
    
    return res.status(401).json({
      error: 'Invalid token',
      message: error.message,
      debug: {
        errorType: error.name,
        tokenPreview: token.substring(0, 30) + '...'
      }
    });
  }
};

// Export for use in routes
module.exports = { verifyToken: exports.verifyToken };