'use strict';
const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/supportController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/',         ctrl.getAll);
router.get('/:id',      ctrl.getById);
router.post('/',        ctrl.create);
router.post('/:id/reply', ctrl.reply);
router.patch('/:id/close', ctrl.close);

module.exports = router;