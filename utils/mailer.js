const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async ({ to, subject, html }) => {
  try {
    const data = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'Future Property Holdings <onboarding@resend.dev>',
      to,
      subject,
      html,
    });
    return data;
  } catch (error) {
    console.error('Email error:', error);
    throw new Error('Email could not be sent');
  }
};

// ── Email templates ───────────────────────────────────────────────────────────
const welcomeEmail = (firstName) => ({
  subject: 'Welcome to Future Property Holdings!',
  html: `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px">
      <h2 style="color:#1e3a8a">Welcome, ${firstName}!</h2>
      <p style="color:#475569;line-height:1.7">Your account on <strong>Future Property Holdings</strong> has been created. You can now browse properties, apply for tenancies, and manage your rentals from the dashboard.</p>
      <p style="color:#475569;line-height:1.7">To unlock all features — including listing properties and contacting landlords — please verify your identity (Ghana Card + Face Recognition) from your Profile page.</p>
      <a href="${process.env.APP_URL || 'https://futurepropertyholdings.vercel.app'}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#2563eb;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">Open Dashboard</a>
      <p style="color:#94a3b8;font-size:.8rem;margin-top:28px">&copy; 2026 Future Property Holdings &middot; Accra &amp; Kumasi, Ghana</p>
    </div>`
});

const resetEmail = (resetUrl) => ({
  subject: 'Reset your password — Future Property Holdings',
  html: `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px">
      <h2 style="color:#1e3a8a">Password Reset</h2>
      <p style="color:#475569;line-height:1.7">You requested a password reset. Click the button below to choose a new password. This link expires in <strong>1 hour</strong>.</p>
      <a href="${resetUrl}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#2563eb;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">Reset Password</a>
      <p style="color:#94a3b8;font-size:.8rem;margin-top:28px">If you didn't request this, ignore this email. Your password will remain unchanged.</p>
    </div>`
});

const verifyEmail = (verifyUrl) => ({
  subject: 'Verify your email — Future Property Holdings',
  html: `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px">
      <h2 style="color:#1e3a8a">Verify Your Email</h2>
      <p style="color:#475569;line-height:1.7">Click the button below to confirm your email address. This link expires in <strong>24 hours</strong>.</p>
      <a href="${verifyUrl}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#2563eb;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">Verify Email</a>
      <p style="color:#94a3b8;font-size:.8rem;margin-top:28px">&copy; 2026 Future Property Holdings</p>
    </div>`
});

module.exports = { sendEmail, welcomeEmail, resetEmail, verifyEmail };