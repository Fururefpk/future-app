'use strict';
const Maintenance = require('../models/Maintenance');
const Property    = require('../models/Property');
const {deleteCloudinaryImage} = require('../middleware/upload');

const ok  = (res,d,s=200)=>res.status(s).json({success:true,data:d});
const err = (res,m,s=400)=>res.status(s).json({success:false,message:m});

exports.myRequests = async (req,res,next)=>{
  try{
    const {status,priority,propertyId,page=1,limit=20}=req.query;
    const query={};
    if(req.user.role==='tenant') query.tenant=req.user._id;
    else if(req.user.role==='landlord'){
      const props=await Property.distinct('_id',{landlord:req.user._id});
      query.property={$in:props};
    }
    if(status)     query.status=status;
    if(priority)   query.priority=priority;
    if(propertyId) query.property=propertyId;
    const skip=(Number(page)-1)*Number(limit);
    const [requests,total]=await Promise.all([
      Maintenance.find(query).populate('property','name city').populate('tenant','firstName lastName').sort('-createdAt').skip(skip).limit(Number(limit)).lean(),
      Maintenance.countDocuments(query),
    ]);
    ok(res,{requests,total});
  }catch(e){next(e);}
};

exports.getRequest = async (req,res,next)=>{
  try{
    const r=await Maintenance.findById(req.params.id).populate('property','name address landlord').populate('tenant','firstName lastName email phone').lean();
    if(!r) return err(res,'Request not found',404);
    ok(res,{request:r});
  }catch(e){next(e);}
};

exports.maintenanceStats = async (req,res,next)=>{
  try{
    const matchQ=req.user.role==='admin'?{}:{};
    if(req.user.role==='landlord'){
      const props=await Property.distinct('_id',{landlord:req.user._id});
      matchQ.property={$in:props};
    }else if(req.user.role==='tenant') matchQ.tenant=req.user._id;
    const stats=await Maintenance.aggregate([{$match:matchQ},{$group:{_id:'$status',count:{$sum:1}}}]);
    ok(res,{stats});
  }catch(e){next(e);}
};

exports.createRequest = async (req,res,next)=>{
  try{
    const {propertyId,title,description,priority}=req.body;
    if(!propertyId||!title||!description) return err(res,'propertyId, title, description required');
    const property=await Property.findById(propertyId);
    if(!property) return err(res,'Property not found',404);
    const images=(req.files||[]).map(f=>({url:f.path,publicId:f.filename}));
    const request=await Maintenance.create({property:propertyId,tenant:req.user._id,title,description,priority:priority||'medium',images});
    ok(res,{request},201);
  }catch(e){next(e);}
};

exports.updateRequest = async (req,res,next)=>{
  try{
    const r=await Maintenance.findById(req.params.id);
    if(!r) return err(res,'Request not found',404);
    const{status,technicianName,technicianPhone,scheduledAt,notes}=req.body;
    if(status)          r.status=status;
    if(technicianName)  r.technicianName=technicianName;
    if(technicianPhone) r.technicianPhone=technicianPhone;
    if(scheduledAt)     r.scheduledAt=new Date(scheduledAt);
    if(notes)           r.notes=notes;
    if(status==='completed') r.completedAt=new Date();
    await r.save();
    ok(res,{request:r});
  }catch(e){next(e);}
};

exports.addImages = async (req,res,next)=>{
  try{
    const r=await Maintenance.findById(req.params.id);
    if(!r) return err(res,'Request not found',404);
    const imgs=(req.files||[]).map(f=>({url:f.path,publicId:f.filename}));
    r.images.push(...imgs);
    await r.save();
    ok(res,{request:r});
  }catch(e){next(e);}
};

exports.removeImage = async (req,res,next)=>{
  try{
    const r=await Maintenance.findById(req.params.id);
    if(!r) return err(res,'Request not found',404);
    const img=r.images.find(i=>i._id.toString()===req.params.imageId);
    if(img) await deleteCloudinaryImage(img.publicId).catch(()=>{});
    r.images=r.images.filter(i=>i._id.toString()!==req.params.imageId);
    await r.save();
    ok(res,{request:r});
  }catch(e){next(e);}
};

exports.rateRequest = async (req,res,next)=>{
  try{
    const {rating,comment}=req.body;
    if(!rating||rating<1||rating>5) return err(res,'Rating must be 1–5');
    const r=await Maintenance.findById(req.params.id);
    if(!r) return err(res,'Request not found',404);
    if(r.status!=='completed') return err(res,'Can only rate completed requests');
    if(r.tenant.toString()!==req.user._id.toString()) return err(res,'Not authorised',403);
    r.rating={score:Number(rating),comment:comment||null,ratedAt:new Date()};
    await r.save();
    ok(res,{request:r});
  }catch(e){next(e);}
};