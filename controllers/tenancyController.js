'use strict';
const Tenancy  = require('../models/Tenancy');
const Property = require('../models/Property');
const Email    = require('../utils/email');

const ok  = (res, data, s=200) => res.status(s).json({ success:true,  data });
const err = (res, msg, s=400) => res.status(s).json({ success:false, message:msg });

exports.myTenancies = async (req, res, next) => {
  try {
    const { status, page=1, limit=10 } = req.query;
    const query = {};
    if (req.user.role === 'tenant')   query.tenant   = req.user._id;
    else if (req.user.role === 'landlord') query.landlord = req.user._id;
    if (status) query.status = status;
    const skip = (Number(page)-1)*Number(limit);
    const [tenancies, total] = await Promise.all([
      Tenancy.find(query).populate('property','name city images').populate('tenant','firstName lastName').sort('-createdAt').skip(skip).limit(Number(limit)).lean(),
      Tenancy.countDocuments(query),
    ]);
    ok(res, { tenancies, total });
  } catch(e){next(e);}
};

exports.listTenancies = async (req, res, next) => {
  try {
    const { status, propertyId, page=1, limit=20 } = req.query;
    const query = req.user.role === 'admin' ? {} : { landlord: req.user._id };
    if (status)     query.status   = status;
    if (propertyId) query.property = propertyId;
    const skip = (Number(page)-1)*Number(limit);
    const [tenancies, total] = await Promise.all([
      Tenancy.find(query).populate('property','name city').populate('tenant','firstName lastName email phone').sort('-createdAt').skip(skip).limit(Number(limit)).lean(),
      Tenancy.countDocuments(query),
    ]);
    ok(res, { tenancies, total });
  } catch(e){next(e);}
};

exports.getTenancy = async (req, res, next) => {
  try {
    const t = await Tenancy.findById(req.params.id)
      .populate('property').populate('tenant','firstName lastName email phone avatar').populate('landlord','firstName lastName email').lean();
    if (!t) return err(res,'Tenancy not found',404);
    ok(res,{tenancy:t});
  } catch(e){next(e);}
};

exports.requestTenancy = async (req, res, next) => {
  try {
    const { propertyId, message } = req.body;
    const property = await Property.findById(propertyId).populate('landlord');
    if (!property || property.isDeleted) return err(res,'Property not found',404);
    if (property.status !== 'approved') return err(res,'Property is not available',400);

    const existing = await Tenancy.findOne({ property:propertyId, tenant:req.user._id, status:{$in:['pending','active']} });
    if (existing) return err(res,'You already have a pending or active tenancy for this property',409);

    const tenancy = await Tenancy.create({
      property: propertyId, tenant: req.user._id, landlord: property.landlord._id,
      monthlyRent: property.price, message: message || '',
    });

    await Email.tenancyReceived(property.landlord, req.user, property).catch(()=>{});
    ok(res,{tenancy},201);
  } catch(e){next(e);}
};

exports.respondTenancy = async (req, res, next) => {
  try {
    const { decision, reason } = req.body;
    if (!['approved','rejected'].includes(decision)) return err(res,'decision must be approved or rejected');

    const tenancy = await Tenancy.findById(req.params.id)
      .populate('property').populate('tenant').populate('landlord');
    if (!tenancy) return err(res,'Tenancy not found',404);
    if (tenancy.status !== 'pending') return err(res,'Tenancy is no longer pending');
    if (tenancy.landlord._id.toString() !== req.user._id.toString() && req.user.role !== 'admin')
      return err(res,'Not authorised',403);

    tenancy.status = decision === 'approved' ? 'active' : 'rejected';
    if (decision === 'approved') tenancy.startDate = new Date();
    tenancy.decision = { decidedBy: req.user._id, decidedAt: new Date(), reason };
    await tenancy.save();

    await Email.tenancyDecision(tenancy.tenant, tenancy.property, decision, reason).catch(()=>{});
    ok(res,{tenancy});
  } catch(e){next(e);}
};

exports.endTenancy = async (req, res, next) => {
  try {
    const tenancy = await Tenancy.findById(req.params.id);
    if (!tenancy) return err(res,'Tenancy not found',404);
    if (tenancy.status !== 'active') return err(res,'Tenancy is not active');
    tenancy.status   = 'ended';
    tenancy.endedAt  = new Date();
    tenancy.endedBy  = req.user._id;
    tenancy.endReason = req.body.reason || null;
    await tenancy.save();
    ok(res,{tenancy});
  } catch(e){next(e);}
};

exports.bulkDecision = async (req, res, next) => {
  try {
    const { ids, decision } = req.body;
    if (!Array.isArray(ids) || !ids.length) return err(res,'ids array required');
    if (!['approved','rejected'].includes(decision)) return err(res,'Invalid decision');
    await Tenancy.updateMany(
      { _id:{$in:ids}, status:'pending' },
      { $set:{ status: decision==='approved'?'active':'rejected', 'decision.decidedBy':req.user._id, 'decision.decidedAt':new Date() }}
    );
    ok(res,{message:`${ids.length} tenancies updated`});
  } catch(e){next(e);}
};