'use strict';
const Invoice  = require('../models/Invoice');
const Tenancy  = require('../models/Tenancy');
const Email    = require('../utils/email');

const ok  = (res,data,s=200) => res.status(s).json({success:true,data});
const err = (res,msg,s=400)  => res.status(s).json({success:false,message:msg});

exports.myInvoices = async (req,res,next) => {
  try {
    const {status,page=1,limit=10} = req.query;
    const query = {tenant:req.user._id};
    if(status) query.status=status;
    const skip=(Number(page)-1)*Number(limit);
    const [invoices,total]=await Promise.all([
      Invoice.find(query).populate('property','name city').sort('-dueDate').skip(skip).limit(Number(limit)).lean(),
      Invoice.countDocuments(query),
    ]);
    ok(res,{invoices,total});
  } catch(e){next(e);}
};

exports.listInvoices = async (req,res,next) => {
  try {
    const {propertyId,tenantId,status,from,to,page=1,limit=20}=req.query;
    const query = req.user.role==='admin' ? {} : {landlord:req.user._id};
    if(propertyId) query.property=propertyId;
    if(tenantId)   query.tenant=tenantId;
    if(status)     query.status=status;
    if(from||to)   query.dueDate={};
    if(from) query.dueDate.$gte=new Date(from);
    if(to)   query.dueDate.$lte=new Date(to);
    const skip=(Number(page)-1)*Number(limit);
    const [invoices,total]=await Promise.all([
      Invoice.find(query).populate('property','name city').populate('tenant','firstName lastName email').sort('-dueDate').skip(skip).limit(Number(limit)).lean(),
      Invoice.countDocuments(query),
    ]);
    ok(res,{invoices,total});
  } catch(e){next(e);}
};

exports.getInvoice = async (req,res,next) => {
  try {
    const inv=await Invoice.findById(req.params.id).populate('property','name address city').populate('tenant','firstName lastName email phone').populate('landlord','firstName lastName email phone').lean();
    if(!inv) return err(res,'Invoice not found',404);
    ok(res,{invoice:inv});
  } catch(e){next(e);}
};

exports.generateInvoice = async (req,res,next) => {
  try {
    const {tenancyId,amount,dueDate,description,batch}=req.body;

    if(batch) {
      const tenancies=await Tenancy.find({status:'active',landlord:req.user.role==='admin'?{$exists:true}:req.user._id}).populate('property tenant landlord');
      const invoices=await Invoice.insertMany(tenancies.map(t=>({
        tenancy:t._id,property:t.property._id,tenant:t.tenant._id,landlord:t.landlord._id,
        amount:t.monthlyRent,dueDate:dueDate||new Date(Date.now()+7*24*60*60*1000),
        description:'Monthly Rent',
      })));
      return ok(res,{invoices,count:invoices.length},201);
    }

    if(!tenancyId||!amount||!dueDate) return err(res,'tenancyId, amount, dueDate required');
    const tenancy=await Tenancy.findById(tenancyId).populate('property tenant landlord');
    if(!tenancy) return err(res,'Tenancy not found',404);

    const invoice=await Invoice.create({
      tenancy:tenancyId,property:tenancy.property._id,tenant:tenancy.tenant._id,
      landlord:tenancy.landlord._id,amount:Number(amount),dueDate:new Date(dueDate),
      description:description||'Monthly Rent',
    });
    ok(res,{invoice},201);
  } catch(e){next(e);}
};

exports.updateInvoice = async (req,res,next) => {
  try {
    const inv=await Invoice.findById(req.params.id);
    if(!inv) return err(res,'Invoice not found',404);
    if(inv.status!=='unpaid') return err(res,'Only unpaid invoices can be edited');
    if(inv.landlord.toString()!==req.user._id.toString()&&req.user.role!=='admin') return err(res,'Not authorised',403);
    ['amount','dueDate','description'].forEach(k=>{if(req.body[k]!==undefined)inv[k]=req.body[k];});
    await inv.save();
    ok(res,{invoice:inv});
  } catch(e){next(e);}
};

exports.voidInvoice = async (req,res,next) => {
  try {
    const inv=await Invoice.findById(req.params.id);
    if(!inv) return err(res,'Invoice not found',404);
    if(inv.status==='paid') return err(res,'Paid invoices cannot be voided');
    if(inv.landlord.toString()!==req.user._id.toString()&&req.user.role!=='admin') return err(res,'Not authorised',403);
    inv.status='voided'; inv.isVoided=true; inv.voidedAt=new Date(); inv.voidedBy=req.user._id;
    await inv.save();
    ok(res,{message:'Invoice voided'});
  } catch(e){next(e);}
};

exports.recordPayment = async (req,res,next) => {
  try {
    const {method,transactionRef,amount,paidAt,notes}=req.body;
    if(!method||!amount) return err(res,'method and amount required');

    const inv=await Invoice.findById(req.params.id);
    if(!inv) return err(res,'Invoice not found',404);
    if(inv.status==='voided') return err(res,'Cannot pay a voided invoice');

    // Idempotency: reject duplicate transactionRef
    if(transactionRef&&inv.payments.find(p=>p.transactionRef===transactionRef))
      return ok(res,{invoice:inv,message:'Payment already recorded'});

    inv.payments.push({method,transactionRef:transactionRef||null,amount:Number(amount),paidAt:paidAt?new Date(paidAt):new Date(),recordedBy:req.user._id,notes:notes||''});
    inv.paidAmount=(inv.paidAmount||0)+Number(amount);
    if(inv.paidAmount>=inv.amount){inv.status='paid';inv.paidAt=new Date();}
    await inv.save();
    ok(res,{invoice:inv});
  } catch(e){next(e);}
};

exports.getPaymentHistory = async (req,res,next) => {
  try {
    const inv=await Invoice.findById(req.params.id).lean();
    if(!inv) return err(res,'Invoice not found',404);
    ok(res,{payments:inv.payments});
  } catch(e){next(e);}
};

exports.downloadInvoicePDF = async (req,res,next) => {
  try {
    const inv=await Invoice.findById(req.params.id).populate('property','name address city').populate('tenant','firstName lastName email').lean();
    if(!inv) return err(res,'Invoice not found',404);
    // Basic HTML→PDF (return HTML for now — wire pdfkit/puppeteer for production)
    const html=`<html><body style="font-family:sans-serif;padding:40px">
      <h1>Invoice</h1><p><b>Property:</b> ${inv.property?.name}</p>
      <p><b>Tenant:</b> ${inv.tenant?.firstName} ${inv.tenant?.lastName}</p>
      <p><b>Amount:</b> GH₵${inv.amount}</p><p><b>Due:</b> ${new Date(inv.dueDate).toLocaleDateString()}</p>
      <p><b>Status:</b> ${inv.status}</p></body></html>`;
    res.setHeader('Content-Type','text/html');
    res.send(html);
  } catch(e){next(e);}
};

exports.dueReminders = async (req,res,next) => {
  try {
    const days=parseInt(req.query.days||'7');
    const query={status:'unpaid',dueDate:{$lte:new Date(Date.now()+days*24*60*60*1000),$gte:new Date()}};
    if(req.user.role!=='admin') query.tenant=req.user._id;
    const invoices=await Invoice.find(query).populate('property','name').lean();
    ok(res,{invoices});
  } catch(e){next(e);}
};

exports.sendReminders = async (req,res,next) => {
  try {
    const overdue=await Invoice.find({status:{$in:['unpaid','overdue']},dueDate:{$lt:new Date()}})
      .populate('tenant').populate('property','name').lean();
    let sent=0;
    for(const inv of overdue){
      await Email.invoiceDue(inv.tenant,inv,inv.property).catch(()=>{});
      sent++;
    }
    // Mark overdue
    await Invoice.updateMany({status:'unpaid',dueDate:{$lt:new Date()}},{$set:{status:'overdue'}});
    ok(res,{message:`Reminders sent: ${sent}`});
  } catch(e){next(e);}
};

exports.revenueSummary = async (req,res,next) => {
  try {
    const {year=new Date().getFullYear(),propertyId}=req.query;
    const matchQ={landlord:req.user.role==='admin'?{$exists:true}:req.user._id,status:'paid',paidAt:{$gte:new Date(`${year}-01-01`),$lte:new Date(`${year}-12-31`)}};
    if(propertyId) matchQ.property=require('mongoose').Types.ObjectId(propertyId);
    const summary=await Invoice.aggregate([
      {$match:matchQ},
      {$group:{_id:{$month:'$paidAt'},total:{$sum:'$paidAmount'},count:{$sum:1}}},
      {$sort:{_id:1}},
    ]);
    ok(res,{summary,year});
  } catch(e){next(e);}
};