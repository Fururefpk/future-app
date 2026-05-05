const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/rentController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/me', ctrl.myInvoices);
router.get('/reminders', ctrl.dueReminders);
router.post('/invoices', ctrl.generateInvoice);
router.post('/invoices/:id/payments', ctrl.recordPayment);

module.exports = router;
