const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { sendEmail, welcomeEmail, resetEmail, verifyEmail } = require('../utils/mailer');

// Generate JWT Token
const generateToken = (id, type = 'access') => {
  const isRefresh = type === 'refresh';
  const secret = isRefresh ? process.env.REFRESH_TOKEN_SECRET : process.env.JWT_SECRET;
  const expiresIn = isRefresh ? process.env.REFRESH_TOKEN_EXPIRE : process.env.JWT_EXPIRE;

  return jwt.sign({ id }, secret, { expiresIn });
};

// @desc    Register User
// @route   POST /api/v1/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password, role } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Create user
    user = new User({
      firstName,
      lastName,
      email,
      phone,
      password,
      role: (role === 'landlord') ? 'landlord' : 'tenant'
    });

    // Generate email verification token
    const emailToken = crypto.randomBytes(32).toString('hex');
    user.emailVerificationToken = crypto.createHash('sha256').update(emailToken).digest('hex');
    user.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    // Save user to database
    await user.save();

    // Generate tokens
    const accessToken = generateToken(user._id, 'access');
    const refreshToken = generateToken(user._id, 'refresh');

    // Update last login
    user.lastLogin = new Date();
    user.lastLoginIP = req.ip;
    await user.save();

    // Send welcome + verification emails (non-blocking)
    const appUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    const verifyUrl = `${appUrl}/api/v1/auth/verify-email/${emailToken}`;
    try {
      const welcome = welcomeEmail(firstName);
      await sendEmail({ to: email, subject: welcome.subject, html: welcome.html });
      const verify = verifyEmail(verifyUrl);
      await sendEmail({ to: email, subject: verify.subject, html: verify.html });
    } catch (emailErr) {
      console.error('Welcome/verify email failed:', emailErr.message);
    }

    // Return response
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: user.getPublicProfile(),
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error in registration',
      error: error.message
    });
  }
};

// @desc    Login User
// @route   POST /api/v1/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Check for user
    let user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if account is locked
    if (user.isLocked()) {
      return res.status(423).json({
        success: false,
        message: 'Account is temporarily locked. Please try again later.'
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      // Increment login attempts
      await user.incLoginAttempts();
      
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Reset login attempts on successful login
    if (user.loginAttempts > 0) {
      await user.resetLoginAttempts();
    }

    // Generate tokens
    const accessToken = generateToken(user._id, 'access');
    const refreshToken = generateToken(user._id, 'refresh');

    // Update last login
    user.lastLogin = new Date();
    user.lastLoginIP = req.ip;
    await user.save();

    // Return response
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: user.getPublicProfile(),
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error in login',
      error: error.message
    });
  }
};

// @desc    Biometric Login (Face Recognition)
// @route   POST /api/v1/auth/biometric-login
// @access  Public
exports.biometricLogin = async (req, res) => {
  try {
    const { faceDescriptor, userEmail } = req.body;

    if (!faceDescriptor || !userEmail) {
      return res.status(400).json({
        success: false,
        message: 'Face descriptor and email required'
      });
    }

    // Find users with matching email
    const user = await User.findOne({ 
      email: userEmail,
      'biometric.faceEnrolled': true
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found or face not enrolled'
      });
    }

    // Check if account is locked
    if (user.isLocked()) {
      return res.status(423).json({
        success: false,
        message: 'Account is temporarily locked'
      });
    }

    // Compare face descriptor with enrolled faces
    const threshold = parseFloat(process.env.FACE_MATCHING_THRESHOLD) || 0.6;
    let isMatched = false;

    for (let enrolledFace of user.biometric.faceData) {
      const distance = computeDistance(faceDescriptor, enrolledFace.descriptor);
      if (distance < threshold) {
        isMatched = true;
        break;
      }
    }

    if (!isMatched) {
      await user.incLoginAttempts();
      
      return res.status(401).json({
        success: false,
        message: 'Face does not match'
      });
    }

    // Reset login attempts
    if (user.loginAttempts > 0) {
      await user.resetLoginAttempts();
    }

    // Generate tokens
    const accessToken = generateToken(user._id, 'access');
    const refreshToken = generateToken(user._id, 'refresh');

    // Update last login
    user.lastLogin = new Date();
    user.lastLoginIP = req.ip;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Biometric login successful',
      data: {
        user: user.getPublicProfile(),
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error in biometric login',
      error: error.message
    });
  }
};

// @desc    Refresh Access Token
// @route   POST /api/v1/auth/refresh-token
// @access  Public
exports.refreshAccessToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token required'
      });
    }

    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const newAccessToken = generateToken(user._id, 'access');

    res.status(200).json({
      success: true,
      data: {
        accessToken: newAccessToken
      }
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired refresh token',
      error: error.message
    });
  }
};

// @desc    Logout User
// @route   POST /api/v1/auth/logout
// @access  Private
exports.logout = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error in logout',
      error: error.message
    });
  }
};

// @desc    Get Current User
// @route   GET /api/v1/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      data: user.getPublicProfile()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user',
      error: error.message
    });
  }
};

// Helper function to compute Euclidean distance between face descriptors
function computeDistance(descriptor1, descriptor2) {
  if (!Array.isArray(descriptor1) || !Array.isArray(descriptor2)) {
    return 1; // Max distance if invalid
  }

  let sum = 0;
  for (let i = 0; i < descriptor1.length; i++) {
    const diff = descriptor1[i] - descriptor2[i];
    sum += diff * diff;
  }

  return Math.sqrt(sum);
}

module.exports.computeDistance = computeDistance;

// @desc    Forgot Password — send reset link
// @route   POST /api/v1/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const user = await User.findOne({ email });

    // Always respond with 200 to avoid email enumeration
    if (!user) {
      return res.status(200).json({ success: true, message: 'If that email exists, a reset link has been sent' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.passwordResetExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save({ validateBeforeSave: false });

    // Send reset email
    const appUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    const resetUrl = `${appUrl}/?reset=${resetToken}`;
    try {
      const tpl = resetEmail(resetUrl);
      await sendEmail({ to: email, subject: tpl.subject, html: tpl.html });
    } catch (emailErr) {
      console.error('Reset email failed:', emailErr.message);
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });
      return res.status(500).json({ success: false, message: 'Email could not be sent' });
    }

    res.status(200).json({ success: true, message: 'If that email exists, a reset link has been sent' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error processing request', error: error.message });
  }
};

// @desc    Reset Password
// @route   POST /api/v1/auth/reset-password/:token
// @access  Public
exports.resetPassword = async (req, res) => {
  try {
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    }

    const { password } = req.body;
    if (!password || password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    }

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();

    res.status(200).json({ success: true, message: 'Password reset successfully. You may now log in.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error resetting password', error: error.message });
  }
};

// @desc    Verify Email
// @route   GET /api/v1/auth/verify-email/:token
// @access  Public
exports.verifyEmail = async (req, res) => {
  try {
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification token' });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save({ validateBeforeSave: false });

    // Redirect to homepage with success flag
    const appUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    res.redirect(`${appUrl}/?verified=true`);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error verifying email', error: error.message });
  }
};
