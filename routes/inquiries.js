const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/inquiryController');
const { protect, requireVerified } = require('../middleware/auth');

router.use(protect);

router.get('/me', ctrl.myInquiries);
router.get('/:id', ctrl.getInquiry);
router.post('/', requireVerified, ctrl.createInquiry);
router.post('/:id/reply', ctrl.replyInquiry);
router.patch('/:id/close', ctrl.closeInquiry);

module.exports = router;
