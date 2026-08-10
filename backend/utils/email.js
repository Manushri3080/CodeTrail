const nodemailer = require('nodemailer');

const SMTP_HOST = process.env.SMTP_HOST || 'smtp-relay.brevo.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = process.env.SMTP_USER || 'b509ea001@smtp-brevo.com';
const SMTP_PASS = process.env.SMTP_PASS; // Provided in .env by user
const SMTP_FROM = process.env.SMTP_FROM || 'monardudhat111@gmail.com';

// Initialize transporter
const createTransporter = () => {
  if (!SMTP_PASS) {
    console.warn("WARNING: SMTP_PASS is not configured in backend .env. Email operations will fail/mock.");
  }
  
  const isSecure = SMTP_PORT === 465 || process.env.SMTP_SECURE === 'true';

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: isSecure,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
    tls: {
      // Prevents local network/antivirus certificate handshake resets on Windows
      rejectUnauthorized: false
    }
  });
};

/**
 * Send password reset email
 * @param {string} email - Destination email
 * @param {string} name - User's full name
 * @param {string} resetUrl - Password reset link
 */
const sendResetPasswordEmail = async (email, name, resetUrl) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: `"CodeTrail Support" <${SMTP_FROM}>`,
    to: email,
    subject: 'CodeTrail - Reset Your Password',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
        <style>
          body {
            background-color: #06070B;
            color: #E2E8F0;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 0;
            -webkit-font-smoothing: antialiased;
          }
          .container {
            max-width: 580px;
            margin: 40px auto;
            background-color: #0E1017;
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6);
          }
          .header {
            padding: 40px 40px 20px 40px;
            text-align: center;
            border-bottom: 1px solid rgba(255, 255, 255, 0.03);
          }
          .logo {
            font-size: 24px;
            font-weight: 800;
            letter-spacing: -0.5px;
            color: #FFFFFF;
            margin: 0;
          }
          .logo span {
            background: linear-gradient(to right, #A78BFA, #818CF8, #60A5FA);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
          }
          .content {
            padding: 40px;
          }
          h1 {
            font-size: 20px;
            font-weight: 700;
            color: #FFFFFF;
            margin-top: 0;
            margin-bottom: 16px;
          }
          p {
            font-size: 14px;
            line-height: 1.6;
            color: #8E939E;
            margin-top: 0;
            margin-bottom: 24px;
          }
          .btn-container {
            text-align: center;
            margin: 32px 0;
          }
          .btn {
            background: linear-gradient(135deg, #7C3AED, #4F46E5);
            color: #FFFFFF !important;
            text-decoration: none;
            padding: 14px 28px;
            font-size: 14px;
            font-weight: 600;
            border-radius: 8px;
            display: inline-block;
            box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);
            transition: all 0.2s ease;
          }
          .btn:hover {
            box-shadow: 0 6px 16px rgba(124, 58, 237, 0.5);
          }
          .footer {
            padding: 30px 40px;
            background-color: #090A0F;
            border-top: 1px solid rgba(255, 255, 255, 0.03);
            text-align: center;
            font-size: 12px;
            color: #4B5263;
          }
          .footer a {
            color: #8B5CF6;
            text-decoration: none;
          }
          .note {
            font-size: 12px;
            color: #4B5263;
            margin-top: 32px;
            border-top: 1px dashed rgba(255, 255, 255, 0.05);
            padding-top: 16px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">Code<span>Trail</span></div>
          </div>
          <div class="content">
            <h1>Reset Your Password</h1>
            <p>Hello ${name},</p>
            <p>We received a request to reset your password for your CodeTrail account. Click the button below to choose a new password. This reset link is valid for 1 hour.</p>
            
            <div class="btn-container">
              <a class="btn" href="${resetUrl}" target="_blank">Reset Password</a>
            </div>
            
            <p>If the button above does not work, copy and paste the following link into your web browser:</p>
            <p style="word-break: break-all; font-family: monospace; font-size: 12px; color: #8B5CF6;">${resetUrl}</p>
            
            <p class="note">If you did not request this password reset, please ignore this email or contact support if you have concerns.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} CodeTrail. All rights reserved.</p>
            <p>Designed for collaborative web development.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = {
  sendResetPasswordEmail,
};
