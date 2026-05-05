const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/tenancyController');
const { protect, requireVerified } = require('../middleware/auth');

router.use(protect);

router.get('/me', ctrl.myTenancies);
router.get('/:id', ctrl.getTenancy);
router.post('/', requireVerified, ctrl.requestTenancy);
router.patch('/:id/decision', ctrl.respondTenancy);
router.patch('/:id/end', ctrl.endTenancy);

module.exports = router;
