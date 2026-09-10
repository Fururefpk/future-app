'use strict';
const Support  = require('../models/Support');
const AuditLog = require('../models/AuditLog');

const ok  = (res, data, s = 200) => res.status(s).json({ success: true,  data });
const err = (res, msg,  s = 400) => res.status(s).json({ success: false, message: msg });

exports.getAll = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = req.user.role === 'admin' ? {} : { user: req.user._id };
    if (status) query.status = status;
    const skip = (Number(page) - 1) * Number(limit);
    const [tickets, total] = await Promise.all([
      Support.find(query).sort('-createdAt').skip(skip).limit(Number(limit))
        .populate('user', 'firstName lastName email').lean(),
      Support.countDocuments(query),
    ]);
    ok(res, { tickets, total });
  } catch (e) { next(e); }
};

exports.getById = async (req, res, next) => {
  try {
    const ticket = await Support.findById(req.params.id)
      .populate('user', 'firstName lastName email')
      .populate('replies.sender', 'firstName lastName role').lean();
    if (!ticket) return err(res, 'Ticket not found', 404);
    const uid = req.user._id.toString();
    if (ticket.user._id.toString() !== uid && req.user.role !== 'admin') {
      return err(res, 'Not authorized', 403);
    }
    ok(res, { ticket });
  } catch (e) { next(e); }
};

exports.create = async (req, res, next) => {
  try {
    const { subject, message, category } = req.body;
    if (!subject || !message) return err(res, 'Subject and message are required');
    const ticket = await Support.create({ user: req.user._id, subject, message, category });
    ok(res, { ticket }, 201);
  } catch (e) { next(e); }
};

exports.reply = async (req, res, next) => {
  try {
    const { message } = req.body;
    if (!message) return err(res, 'Message is required');
    const ticket = await Support.findById(req.params.id);
    if (!ticket) return err(res, 'Ticket not found', 404);
    const uid = req.user._id.toString();
    if (ticket.user.toString() !== uid && req.user.role !== 'admin') {
      return err(res, 'Not authorized', 403);
    }
    ticket.replies.push({ sender: req.user._id, message, isStaff: req.user.role === 'admin' });
    if (ticket.status === 'closed') ticket.status = 'open';
    await ticket.save();
    ok(res, { ticket });
  } catch (e) { next(e); }
};

exports.close = async (req, res, next) => {
  try {
    const ticket = await Support.findById(req.params.id);
    if (!ticket) return err(res, 'Ticket not found', 404);
    ticket.status = 'resolved';
    ticket.resolvedAt = new Date();
    await ticket.save();
    ok(res, { message: 'Ticket resolved' });
  } catch (e) { next(e); }
};