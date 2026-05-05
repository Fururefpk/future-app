const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/maintenanceController');
const { protect, requireVerified } = require('../middleware/auth');

router.use(protect);

router.get('/me', ctrl.myRequests);
router.post('/', requireVerified, ctrl.createRequest);
router.patch('/:id', ctrl.updateRequest);

module.exports = router;
