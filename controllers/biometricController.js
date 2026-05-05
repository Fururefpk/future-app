const User = require('../models/User');

// @desc    Enroll Face
// @route   POST /api/v1/biometric/enroll-face
// @access  Private
exports.enrollFace = async (req, res) => {
  try {
    const { faceDescriptor, imageQuality } = req.body;

    if (!faceDescriptor || !Array.isArray(faceDescriptor) || faceDescriptor.length !== 128) {
      return res.status(400).json({
        success: false,
        message: 'Valid face descriptor (128-dimensional array) required'
      });
    }

    const user = await User.findById(req.user.id);

    // Add face descriptor to user's biometric data
    user.biometric.faceData.push({
      timestamp: new Date(),
      descriptor: faceDescriptor,
      quality: imageQuality || 0
    });

    user.biometric.faceEnrolled = true;
    user.biometric.biometricVerifiedAt = new Date();

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Face enrolled successfully',
      data: {
        faceEnrolled: user.biometric.faceEnrolled,
        enrolledFaces: user.biometric.faceData.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error in face enrollment',
      error: error.message
    });
  }
};

// @desc    Verify Ghana Card
// @route   POST /api/v1/biometric/verify-ghana-card
// @access  Private
exports.verifyGhanaCard = async (req, res) => {
  try {
    const { ghanaCardNumber, ghanaCardName } = req.body;

    // Validate Ghana Card format
    if (!ghanaCardNumber || !/^GHA-[0-9]{9}-[0-9]$/.test(ghanaCardNumber)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Ghana Card format. Expected: GHA-XXXXXXXXX-X'
      });
    }

    if (!ghanaCardName || ghanaCardName.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Please provide the name on your Ghana Card'
      });
    }

    // Check if card already registered
    const existingUser = await User.findOne({ 
      'biometric.ghanaCardNumber': ghanaCardNumber,
      _id: { $ne: req.user.id }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'This Ghana Card is already registered'
      });
    }

    const user = await User.findById(req.user.id);

    user.biometric.ghanaCardNumber = ghanaCardNumber;
    user.biometric.ghanaCardName = ghanaCardName;
    user.biometric.ghanaCardVerified = true;
    user.biometric.biometricVerifiedAt = new Date();

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Ghana Card verified successfully',
      data: {
        ghanaCardVerified: user.biometric.ghanaCardVerified,
        cardLastDigits: ghanaCardNumber.slice(-1)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error in Ghana Card verification',
      error: error.message
    });
  }
};

// @desc    Get Biometric Status
// @route   GET /api/v1/biometric/status
// @access  Private
exports.getBiometricStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      data: {
        faceEnrolled: user.biometric.faceEnrolled,
        enrolledFaces: user.biometric.faceData.length,
        ghanaCardVerified: user.biometric.ghanaCardVerified,
        ghanaCardLastDigits: user.biometric.ghanaCardNumber ? user.biometric.ghanaCardNumber.slice(-1) : null,
        biometricVerifiedAt: user.biometric.biometricVerifiedAt
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching biometric status',
      error: error.message
    });
  }
};

// @desc    Re-enroll Face (replace existing)
// @route   POST /api/v1/biometric/re-enroll-face
// @access  Private
exports.reenrollFace = async (req, res) => {
  try {
    const { faceDescriptor, imageQuality } = req.body;

    if (!faceDescriptor || !Array.isArray(faceDescriptor) || faceDescriptor.length !== 128) {
      return res.status(400).json({
        success: false,
        message: 'Valid face descriptor (128-dimensional array) required'
      });
    }

    const user = await User.findById(req.user.id);

    // Clear existing face data and add new one
    user.biometric.faceData = [{
      timestamp: new Date(),
      descriptor: faceDescriptor,
      quality: imageQuality || 0
    }];

    user.biometric.faceEnrolled = true;
    user.biometric.biometricVerifiedAt = new Date();

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Face re-enrolled successfully',
      data: {
        faceEnrolled: user.biometric.faceEnrolled
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error in face re-enrollment',
      error: error.message
    });
  }
};

// @desc    Delete Face Data
// @route   DELETE /api/v1/biometric/face
// @access  Private
exports.deleteFaceData = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    user.biometric.faceData = [];
    user.biometric.faceEnrolled = false;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Face data deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting face data',
      error: error.message
    });
  }
};
