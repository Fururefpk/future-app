'use strict';
const nodemailer = require('nodemailer');
const { Resend } = require('resend');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const FROM         = process.env.EMAIL_FROM   || 'Future Property Holdings <noreply@fph.com>';

// ── Transporter ────────────────────────────────────────────────
let _transporter;
let _resend;

function getResend() {
  if (_resend) return _resend;
  if (!process.env.RESEND_API_KEY) return null;
  _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

function getTransporter() {
  if (_transporter) return _transporter;
  _transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST || 'smtp.gmail.com',
    port:   parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_PORT === '465',
    auth:   { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return _transporter;
}

// ── Shared HTML wrapper ────────────────────────────────────────
const wrap = (body) => `
<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  body{font-family:'DM Sans',Arial,sans-serif;background:#f5f7fa;margin:0;padding:32px;}
  .card{background:#fff;border-radius:12px;max-width:520px;margin:0 auto;padding:40px;box-shadow:0 2px 16px rgba(0,0,0,.08);}
  .logo{font-size:22px;font-weight:700;color:#0a1628;margin-bottom:24px;}
  h2{color:#0a1628;margin:0 0 12px;}
  p{color:#444;line-height:1.7;margin:0 0 16px;}
  .btn{display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#2563eb,#1e40af);color:#fff;border-radius:8px;text-decoration:none;font-weight:700;margin:8px 0;}
  .footer{color:#999;font-size:12px;margin-top:32px;}
  hr{border:none;border-top:1px solid #e5e7eb;margin:24px 0;}
</style></head><body><div class="card">
<div class="logo">🏢 Future Property Holdings</div>
${body}
<hr><p class="footer">You received this email because you have an account with Future Property Holdings. If you did not request this, you can safely ignore it.</p>
</div></body></html>`;

// ── Send helper ────────────────────────────────────────────────
async function send(to, subject, html) {
  try {
    const resend = getResend();
    if (resend) {
      const { error } = await resend.emails.send({ from: FROM, to, subject, html });
      if (error) throw new Error(error.message || 'Resend email delivery failed');
      return;
    }

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      throw new Error('No email provider configured. Set RESEND_API_KEY or SMTP credentials.');
    }
    await getTransporter().sendMail({ from: FROM, to, subject, html });
  } catch (err) {
    console.error('Email send error:', err.message);
    // Don't throw — email failure should never crash a request
  }
}

// ── Templates ──────────────────────────────────────────────────
const Email = {
  async verifyEmail(user, token) {
    const url = `${FRONTEND_URL}/verify-email?token=${token}`;
    await send(user.email, 'Verify your email — Future Property Holdings', wrap(`
      <h2>Welcome, ${user.firstName}!</h2>
      <p>Thanks for signing up. Please verify your email address to get started.</p>
      <a href="${url}" class="btn">Verify Email</a>
      <p>This link expires in 24 hours.</p>`));
  },

  async passwordReset(user, token) {
    const url = `${FRONTEND_URL}/reset-password?token=${token}`;
    await send(user.email, 'Reset your password — Future Property Holdings', wrap(`
      <h2>Password Reset Request</h2>
      <p>Hi ${user.firstName}, we received a request to reset your password.</p>
      <a href="${url}" class="btn">Reset Password</a>
      <p>This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>`));
  },

  async tenancyReceived(landlord, tenant, property) {
    await send(landlord.email, `New tenancy request for ${property.name}`, wrap(`
      <h2>New Tenancy Request</h2>
      <p>Hi ${landlord.firstName}, <strong>${tenant.firstName} ${tenant.lastName}</strong> has requested to rent <strong>${property.name}</strong>.</p>
      <p>Log in to your dashboard to review and respond.</p>
      <a href="${FRONTEND_URL}" class="btn">Review Request</a>`));
  },

  async tenancyDecision(tenant, property, decision, reason) {
    const approved = decision === 'approved';
    await send(tenant.email, `Your tenancy request was ${decision} — ${property.name}`, wrap(`
      <h2>Tenancy Request ${approved ? 'Approved ✓' : 'Rejected'}</h2>
      <p>Hi ${tenant.firstName}, your request for <strong>${property.name}</strong> was <strong>${decision}</strong>.</p>
      ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
      ${approved ? `<a href="${FRONTEND_URL}" class="btn">View Dashboard</a>` : ''}`));
  },

  async invoiceDue(tenant, invoice, property) {
    await send(tenant.email, `Rent due: GH₵${invoice.amount} for ${property.name}`, wrap(`
      <h2>Rent Payment Reminder</h2>
      <p>Hi ${tenant.firstName}, your rent of <strong>GH₵${invoice.amount.toLocaleString()}</strong> for <strong>${property.name}</strong> is due on <strong>${new Date(invoice.dueDate).toLocaleDateString()}</strong>.</p>
      <a href="${FRONTEND_URL}" class="btn">Pay Now</a>`));
  },

  async propertyApproved(landlord, property) {
    await send(landlord.email, `Your listing is live: ${property.name}`, wrap(`
      <h2>Listing Approved ✓</h2>
      <p>Hi ${landlord.firstName}, your property <strong>${property.name}</strong> is now live on Future Property Holdings.</p>
      <a href="${FRONTEND_URL}" class="btn">View Listing</a>`));
  },

  async propertyRejected(landlord, property, reason) {
    await send(landlord.email, `Listing update required: ${property.name}`, wrap(`
      <h2>Listing Requires Changes</h2>
      <p>Hi ${landlord.firstName}, your property <strong>${property.name}</strong> was not approved.</p>
      <p><strong>Reason:</strong> ${reason || 'Please review our listing guidelines.'}</p>
      <a href="${FRONTEND_URL}" class="btn">Edit Listing</a>`));
  },
};

module.exports = Email;

// Patch: Add methods used by biometricController and adminController
// (appended to existing Email object via Object.assign)
Object.assign(Email, {
  async adminNewVerification(user) {
    const admins = await require('../models/User').find({ role: 'admin', isActive: true }).select('email').lean();
    for (const admin of admins) {
      await send(admin.email, `New verification: ${user.firstName} ${user.lastName}`, wrap(`
        <h2>New Identity Verification</h2>
        <p><strong>${user.firstName} ${user.lastName}</strong> (${user.email}) has submitted their Ghana Card for review.</p>
        <a href="${FRONTEND_URL}" class="btn">Review in Admin Panel</a>`));
    }
  },

  async verificationApproved(user) {
    await send(user.email, 'Your identity is verified ✓ — Future Property Holdings', wrap(`
      <h2>Identity Verified ✓</h2>
      <p>Hi ${user.firstName}, your Ghana Card has been verified. Your account is now fully active and you can request tenancies and send inquiries.</p>
      <a href="${FRONTEND_URL}" class="btn">Go to Dashboard</a>`));
  },

  async verificationRejected(user, reason) {
    await send(user.email, 'Action required: identity verification — Future Property Holdings', wrap(`
      <h2>Verification Update Required</h2>
      <p>Hi ${user.firstName}, we could not verify your Ghana Card.</p>
      <p><strong>Reason:</strong> ${reason || 'The details provided did not match our records.'}</p>
      <p>Please re-submit with accurate information from your Settings page.</p>
      <a href="${FRONTEND_URL}" class="btn">Update Verification</a>`));
  },

  async propertyReview(landlord, property, decision, reason) {
    if (decision === 'approved') return Email.propertyApproved(landlord, property);
    return Email.propertyRejected(landlord, property, reason);
  },

  async accountStatusChanged(user, active, reason) {
    const subject = active ? 'Your account has been reactivated' : 'Your account has been suspended';
    await send(user.email, `${subject} — Future Property Holdings`, wrap(`
      <h2>${active ? 'Account Reactivated' : 'Account Suspended'}</h2>
      <p>Hi ${user.firstName}, your Future Property Holdings account has been <strong>${active ? 'reactivated' : 'suspended'}</strong>.</p>
      ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
      ${active ? `<a href="${FRONTEND_URL}" class="btn">Sign In</a>` : '<p>Contact support if you believe this is an error.</p>'}`));
  },

  async bulkNotification(user, message) {
    if (!message) return;
    await send(user.email, 'Important notice — Future Property Holdings', wrap(`
      <h2>Notice from Future Property Holdings</h2>
      <p>Hi ${user.firstName},</p>
      <p>${message}</p>
      <a href="${FRONTEND_URL}" class="btn">Visit Dashboard</a>`));
  },
});