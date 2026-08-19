'use strict';
const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/analyticsController');
const { protect, authorize } = require('../middleware/auth');

router.post('/events', ctrl.trackEvents);                          // public — batched client events
router.get('/pageviews', protect, authorize('admin'), ctrl.getPageViews);

module.exports = router;