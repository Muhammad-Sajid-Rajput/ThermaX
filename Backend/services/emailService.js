import { Resend } from 'resend';

const apiKey = process.env.RESEND_API_KEY;
const isDummyKey = !apiKey || apiKey.includes('your_resend_api_key');

// Use dummy key if missing to prevent initialization crash
const resend = new Resend(isDummyKey ? 're_1234567890' : apiKey);
const FROM_ADDRESS = process.env.RESEND_FROM || 'ThermaX <onboarding@resend.dev>';

function renderOtpEmail({ title, displayName, messageText, otp }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f8fafc;color:#1e293b;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
    <tr>
      <td align="center">
        <table width="500" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
          <tr>
            <td style="background:#dc2626;padding:24px;text-align:center;">
              <h1 style="margin:0;font-size:22px;color:#ffffff;letter-spacing:-0.5px;">ThermaX</h1>
              <p style="margin:4px 0 0;font-size:12px;color:rgba(255,255,255,0.8);">Geospatial Urban Heat Analytics</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 12px;font-size:15px;font-weight:600;">Hi ${displayName || 'User'},</p>
              <p style="margin:0 0 24px;font-size:14px;color:#475569;line-height:1.5;">${messageText}</p>
              <div style="background:#fef2f2;border:2px dashed #ef4444;border-radius:8px;padding:20px;text-align:center;margin-bottom:24px;">
                <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#dc2626;text-transform:uppercase;">Verification Code</p>
                <p style="margin:0;font-size:36px;font-weight:800;letter-spacing:8px;color:#991b1b;font-family:monospace;">${otp}</p>
              </div>
              <p style="margin:0;font-size:12px;color:#94a3b8;">If you did not request this code, please ignore this email.</p>
            </td>
          </tr>
          <tr>
            <td style="background:#f1f5f9;padding:16px;text-align:center;font-size:11px;color:#64748b;">
              © ${new Date().getFullYear()} ThermaX Platform. All rights reserved.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendVerificationEmail(to, name, otp) {
  if (isDummyKey) {
    console.log(`📧 [DEV PREVIEW] Verification OTP for ${to}: ${otp}`);
    return { id: 'dev-preview-id' };
  }

  try {
    const html = renderOtpEmail({
      title: 'Verify your ThermaX account',
      displayName: name,
      messageText: 'Welcome to ThermaX! Please use the code below to verify your email address. This code expires in 15 minutes.',
      otp
    });

    const { data, error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject: 'Verify your ThermaX account',
      html
    });

    if (error) throw new Error(error.message || 'Failed to send verification email');
    console.log(`[Resend Email] Verification email sent to ${to} (id: ${data?.id})`);
    return data;
  } catch (err) {
    console.error('[Resend Email Error]:', err.message);
    throw err;
  }
}

export async function sendPasswordResetEmail(to, name, otp) {
  if (isDummyKey) {
    console.log(`📧 [DEV PREVIEW] Password Reset OTP for ${to}: ${otp}`);
    return { id: 'dev-preview-id' };
  }

  try {
    const html = renderOtpEmail({
      title: 'Reset your ThermaX password',
      displayName: name,
      messageText: 'We received a request to reset your password. Use the 6-digit code below to set up a new password.',
      otp
    });

    const { data, error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject: 'Reset your ThermaX password',
      html
    });

    if (error) throw new Error(error.message || 'Failed to send password reset email');
    console.log(`[Resend Email] Password reset email sent to ${to} (id: ${data?.id})`);
    return data;
  } catch (err) {
    console.error('[Resend Email Error]:', err.message);
    throw err;
  }
}

export default { sendVerificationEmail, sendPasswordResetEmail };
