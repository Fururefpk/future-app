const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

// Public routes
router.get('/:id', userController.getUserById);

// Protected routes
router.put('/profile', protect, userController.updateProfile);
router.put('/password', protect, userController.changePassword);
router.delete('/account', protect, userController.deleteAccount);

// Admin routes
router.get('/', protect, authorize('admin'), userController.getAllUsers);
router.get('/stats/overview', protect, authorize('admin'), userController.getUserStats);

module.exports = router;
