'use strict';
const Inquiry  = require('../models/Inquiry');
const Property = require('../models/Property');

const ok  = (res,d,s=200)=>res.status(s).json({success:true,data:d});
const err = (res,m,s=400)=>res.status(s).json({success:false,message:m});

exports.myInquiries = async (req,res,next)=>{
  try{
    const {status,read,page=1,limit=20}=req.query;
    const query={$or:[{sender:req.user._id},{recipient:req.user._id}],isDeletedBy:{$ne:req.user._id}};
    if(status) query.status=status;
    const skip=(Number(page)-1)*Number(limit);
    const [inquiries,total]=await Promise.all([
      Inquiry.find(query).populate('property','name city images').populate('sender','firstName lastName avatar').populate('recipient','firstName lastName avatar').sort('-updatedAt').skip(skip).limit(Number(limit)).lean(),
      Inquiry.countDocuments(query),
    ]);
    ok(res,{inquiries,total});
  }catch(e){next(e);}
};

exports.unreadCount = async (req,res,next)=>{
  try{
    const inquiries=await Inquiry.find({$or:[{sender:req.user._id},{recipient:req.user._id}],'messages.readBy':{$ne:req.user._id},status:'open'}).lean();
    const count=inquiries.reduce((sum,inq)=>sum+inq.messages.filter(m=>m.sender.toString()!==req.user._id.toString()&&!m.readBy.map(String).includes(req.user._id.toString())).length,0);
    ok(res,{count});
  }catch(e){next(e);}
};

exports.getInquiry = async (req,res,next)=>{
  try{
    const inq=await Inquiry.findById(req.params.id).populate('property','name city images').populate('sender','firstName lastName avatar').populate('recipient','firstName lastName avatar').populate('messages.sender','firstName lastName avatar').lean();
    if(!inq) return err(res,'Inquiry not found',404);
    ok(res,{inquiry:inq});
  }catch(e){next(e);}
};

exports.createInquiry = async (req,res,next)=>{
  try{
    const {propertyId,subject,message}=req.body;
    if(!propertyId||!subject||!message) return err(res,'propertyId, subject, message required');
    const property=await Property.findById(propertyId).populate('landlord','_id');
    if(!property||property.isDeleted) return err(res,'Property not found',404);
    if(property.landlord._id.toString()===req.user._id.toString()) return err(res,'Cannot inquire about your own property');
    const inq=await Inquiry.create({property:propertyId,sender:req.user._id,recipient:property.landlord._id,subject,messages:[{sender:req.user._id,content:message,readBy:[req.user._id]}]});
    ok(res,{inquiry:inq},201);
  }catch(e){next(e);}
};

exports.replyInquiry = async (req,res,next)=>{
  try{
    const {message}=req.body;
    if(!message) return err(res,'message required');
    const inq=await Inquiry.findById(req.params.id);
    if(!inq) return err(res,'Inquiry not found',404);
    if(inq.status==='closed') return err(res,'Inquiry is closed');
    inq.messages.push({sender:req.user._id,content:message,readBy:[req.user._id]});
    await inq.save();
    ok(res,{inquiry:inq});
  }catch(e){next(e);}
};

exports.markRead = async (req,res,next)=>{
  try{
    await Inquiry.updateOne({_id:req.params.id},{$addToSet:{'messages.$[].readBy':req.user._id}});
    ok(res,{message:'Marked as read'});
  }catch(e){next(e);}
};

exports.closeInquiry = async (req,res,next)=>{
  try{
    const inq=await Inquiry.findById(req.params.id);
    if(!inq) return err(res,'Inquiry not found',404);
    inq.status='closed'; inq.closedAt=new Date(); inq.closedBy=req.user._id;
    await inq.save();
    ok(res,{inquiry:inq});
  }catch(e){next(e);}
};

exports.deleteInquiry = async (req,res,next)=>{
  try{
    const inq=await Inquiry.findById(req.params.id);
    if(!inq) return err(res,'Inquiry not found',404);
    if(!inq.isDeletedBy.map(String).includes(req.user._id.toString()))
      inq.isDeletedBy.push(req.user._id);
    await inq.save();
    ok(res,{message:'Inquiry removed'});
  }catch(e){next(e);}
};