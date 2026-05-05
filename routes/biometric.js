const express = require('express');
const router = express.Router();
const biometricController = require('../controllers/biometricController');
const { protect } = require('../middleware/auth');

// All routes are protected - require authentication
router.use(protect);

router.post('/enroll-face', biometricController.enrollFace);
router.post('/re-enroll-face', biometricController.reenrollFace);
router.post('/verify-ghana-card', biometricController.verifyGhanaCard);
router.get('/status', biometricController.getBiometricStatus);
router.delete('/face', biometricController.deleteFaceData);

module.exports = router;
