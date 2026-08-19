'use strict';
const User = require('../models/User');
const {deleteCloudinaryImage} = require('../middleware/upload');

const ok  = (res,d,s=200)=>res.status(s).json({success:true,data:d});
const err = (res,m,s=400)=>res.status(s).json({success:false,message:m});

exports.getUserPublicProfile = async (req,res,next)=>{
  try{
    const user=await User.findById(req.params.id).select('firstName lastName avatar role verification.status createdAt').lean();
    if(!user) return err(res,'User not found',404);
    ok(res,{user});
  }catch(e){next(e);}
};

exports.getMyProfile = async (req,res,next)=>{
  try{ ok(res,{user:req.user}); }catch(e){next(e);}
};

exports.updateProfile = async (req,res,next)=>{
  try{
    const allowed=['firstName','lastName','phone'];
    const update={};
    allowed.forEach(k=>{if(req.body[k]!==undefined)update[k]=req.body[k];});
    const user=await User.findByIdAndUpdate(req.user._id,update,{new:true,runValidators:true});
    ok(res,{user});
  }catch(e){next(e);}
};

exports.updateAvatar = async (req,res,next)=>{
  try{
    if(!req.file) return err(res,'No file uploaded');
    const user=await User.findById(req.user._id);
    if(user.avatar) await deleteCloudinaryImage(user.avatar).catch(()=>{});
    user.avatar=req.file.path;
    await user.save({validateBeforeSave:false});
    ok(res,{avatar:user.avatar});
  }catch(e){next(e);}
};

exports.changePassword = async (req,res,next)=>{
  try{
    const {currentPassword,newPassword}=req.body;
    if(!currentPassword||!newPassword) return err(res,'currentPassword and newPassword required');
    if(newPassword.length<8) return err(res,'New password must be at least 8 characters');
    const user=await User.findById(req.user._id).select('+password');
    if(!(await user.comparePassword(currentPassword))) return err(res,'Current password is incorrect',401);
    user.password=newPassword;
    await user.save();
    ok(res,{message:'Password changed successfully'});
  }catch(e){next(e);}
};

exports.updateNotificationPreferences = async (req,res,next)=>{
  try{
    const {email,sms,push,reminders}=req.body;
    const update={};
    if(email!==undefined)     update['notifications.email']=Boolean(email);
    if(sms!==undefined)       update['notifications.sms']=Boolean(sms);
    if(push!==undefined)      update['notifications.push']=Boolean(push);
    if(reminders!==undefined) update['notifications.reminders']=Boolean(reminders);
    const user=await User.findByIdAndUpdate(req.user._id,{$set:update},{new:true});
    ok(res,{notifications:user.notifications});
  }catch(e){next(e);}
};

exports.setup2FA = async (req,res,next)=>{
  try{
    // Stub — wire speakeasy/otplib for full TOTP
    ok(res,{message:'2FA setup coming soon. Use an authenticator app with the QR code once enabled.'});
  }catch(e){next(e);}
};

exports.verify2FA = async (req,res,next)=>{
  try{ ok(res,{message:'2FA verification stub'}); }catch(e){next(e);}
};

exports.disable2FA = async (req,res,next)=>{
  try{
    await User.findByIdAndUpdate(req.user._id,{$set:{'twoFA.enabled':false,'twoFA.secret':null}});
    ok(res,{message:'2FA disabled'});
  }catch(e){next(e);}
};

exports.deleteAccount = async (req,res,next)=>{
  try{
    const {password}=req.body;
    const user=await User.findById(req.user._id).select('+password');
    if(!(await user.comparePassword(password))) return err(res,'Incorrect password',401);
    user.isActive=false; user.email=`deleted_${user._id}@fph.deleted`; user.refreshTokens=[];
    await user.save({validateBeforeSave:false});
    ok(res,{message:'Account deleted'});
  }catch(e){next(e);}
};

// ── Admin ──────────────────────────────────────────────────────
exports.getAllUsers = async (req,res,next)=>{
  try{
    const {role,verified,active,search,page=1,limit=20}=req.query;
    const query={};
    if(role)   query.role=role;
    if(active!==undefined) query.isActive=active==='true';
    if(verified==='true')  query['verification.status']='verified';
    if(verified==='false') query['verification.status']={$ne:'verified'};
    if(search) query.$or=[{email:new RegExp(search,'i')},{firstName:new RegExp(search,'i')},{lastName:new RegExp(search,'i')}];
    const skip=(Number(page)-1)*Number(limit);
    const [users,total]=await Promise.all([
      User.find(query).sort('-createdAt').skip(skip).limit(Number(limit)).lean(),
      User.countDocuments(query),
    ]);
    ok(res,{users,total});
  }catch(e){next(e);}
};

exports.getUserStats = async (req,res,next)=>{
  try{
    const [total,tenants,landlords,verified,active]=await Promise.all([
      User.countDocuments(),
      User.countDocuments({role:'tenant'}),
      User.countDocuments({role:'landlord'}),
      User.countDocuments({'verification.status':'verified'}),
      User.countDocuments({isActive:true}),
    ]);
    ok(res,{total,tenants,landlords,verified,active});
  }catch(e){next(e);}
};

exports.changeUserRole = async (req,res,next)=>{
  try{
    const {role}=req.body;
    if(!['tenant','landlord','admin'].includes(role)) return err(res,'Invalid role');
    const user=await User.findByIdAndUpdate(req.params.id,{role},{new:true});
    if(!user) return err(res,'User not found',404);
    ok(res,{user});
  }catch(e){next(e);}
};