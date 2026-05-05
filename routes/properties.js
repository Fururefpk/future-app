const express = require('express');
const router = express.Router();
const propertyController = require('../controllers/propertyController');
const { protect, authorize } = require('../middleware/auth');

// Public routes
router.get('/', propertyController.getAllProperties);
router.get('/:id', propertyController.getPropertyById);
router.get('/user/:userId', propertyController.getLandlordProperties);

// Protected routes - Landlord/Admin only
router.post('/', protect, authorize('landlord', 'admin'), propertyController.createProperty);
router.put('/:id', protect, propertyController.updateProperty);
router.delete('/:id', protect, propertyController.deleteProperty);

module.exports = router;
