const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Verify JWT Token
const protect = async (req, res, next) => {
  try {
    let token;

    // Check authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Ensure token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }

    // Verify token
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id);

      if (!req.user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Check if user is locked
      if (req.user.isLocked()) {
        return res.status(423).json({
          success: false,
          message: 'Account temporarily locked due to too many failed login attempts'
        });
      }

      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route',
        error: error.message
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error in authorization',
      error: error.message
    });
  }
};

// Check user role
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user.role}' is not authorized to perform this action`
      });
    }
    next();
  };
};

// Refresh token verification
const refreshToken = (req, res, next) => {
  try {
    const token = req.body.refreshToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token required'
      });
    }

    const decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
    req.userId = decoded.id;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid refresh token',
      error: error.message
    });
  }
};

// Require completed Ghana Card + Face verification
const requireVerified = (req, res, next) => {
  const bio = req.user && req.user.biometric;
  if (!bio || !bio.faceEnrolled || !bio.ghanaCardVerified) {
    return res.status(403).json({
      success: false,
      message: 'Account verification required. Enroll your face and verify your Ghana Card to continue.',
      verification: {
        faceEnrolled: !!(bio && bio.faceEnrolled),
        ghanaCardVerified: !!(bio && bio.ghanaCardVerified)
      }
    });
  }
  next();
};

module.exports = {
  protect,
  authorize,
  refreshToken,
  requireVerified
};
