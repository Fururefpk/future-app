const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.use(authorize('admin'));

router.get('/dashboard', ctrl.dashboard);
router.get('/properties/pending', ctrl.pendingProperties);
router.patch('/properties/:id/review', ctrl.reviewProperty);
router.get('/users', ctrl.listUsers);
router.patch('/users/:id/active', ctrl.setUserActive);

module.exports = router;
