import nodemailer from 'nodemailer';
import { secrets } from './secrets.js';

export async function sendShareEmail(recipientEmail: string, files: { name: string; url: string }[], shareLink?: string, message?: string) {
  // Dev Mode / No-Credentials Fallback
  if (!secrets.SMTP_USER || !secrets.SMTP_PASS) {
    console.warn("[Email] No SMTP credentials found. Mocking email send (Dev Mode).");
    console.log(`[Email] To: ${recipientEmail}`);
    console.log(`[Email] Subject: Files Shared: ${files.length} file(s)`);
    if (shareLink) console.log(`[Email] Share Link: ${shareLink}`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: secrets.SMTP_USER,
      pass: secrets.SMTP_PASS,
    },
  });

  console.log(`[Email] Sending email from: ${secrets.SMTP_USER}`);

  const filesListHtml = files.map(file => `
        <div style="margin-bottom: 10px;">
            <p style="margin: 0 0 5px 0;"><strong>File Name:</strong> ${file.name}</p>
            <a href="${file.url}" style="display: inline-block; background-color: #007bff; color: white; padding: 8px 16px; text-decoration: none; border-radius: 4px; font-size: 14px;">Download</a>
        </div>
    `).join('');

  const mailOptions = {
    from: `"10xDS Transfer" <${process.env.SMTP_FROM || secrets.SMTP_USER}>`,
    to: recipientEmail,
    subject: `Files Shared: ${files.length} file${files.length > 1 ? 's' : ''}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #333;">Files have been shared with you</h2>
        <p><strong>10xDS Transfer</strong> has sent you ${files.length} file${files.length > 1 ? 's' : ''}.</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 4px; margin: 20px 0;">
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 4px; margin: 20px 0;">
          ${shareLink ? `
            <div style="text-align: center; margin-bottom: 20px;">
              <a href="${shareLink}" style="display: inline-block; background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Download All Files</a>
            </div>
          ` : ''}
          <p style="margin-bottom: 10px;"><strong>Files included:</strong></p>
          <ul style="list-style: none; padding: 0;">
            ${files.map(file => `<li style="margin-bottom: 5px;">📄 ${file.name}</li>`).join('')}
          </ul>
          ${message ? `<div style="margin-top: 15px; border-top: 1px solid #eee; padding-top: 10px;"><p style="margin: 0;"><strong>Message:</strong> ${message}</p></div>` : ''}
        </div>
        
        <p style="margin-top: 20px; font-size: 12px; color: #666;">
          Files are securely stored on Google Cloud.
        </p>
      </div>
    `,
  };

  const info = await transporter.sendMail(mailOptions);

  console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
}

export async function sendResetPasswordEmail(recipientEmail: string, resetLink: string) {
  // Dev Mode / No-Credentials Fallback
  if (!secrets.SMTP_USER || !secrets.SMTP_PASS) {
    console.warn("[Email] No SMTP credentials found. Mocking email send (Dev Mode).");
    console.log(`[Email] To: ${recipientEmail}`);
    console.log(`[Email] Reset Link: ${resetLink}`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: secrets.SMTP_USER,
      pass: secrets.SMTP_PASS,
    },
  });

  console.log(`[Email] Sending reset email to: ${recipientEmail}`);

  const mailOptions = {
    from: `"10xDS Security" <${process.env.SMTP_FROM || secrets.SMTP_USER}>`,
    to: recipientEmail,
    subject: `Reset Your Password`,
    html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <h2 style="color: #333;">Reset Your Password</h2>
          <p>You requested to reset your password for your 10xDS Transfer account.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="display: inline-block; background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Reset Password</a>
          </div>
          
          <p style="color: #666;">If you didn't ask for this, you can ignore this email.</p>
          <p style="font-size: 12px; color: #999; margin-top: 30px;">Link expires in 15 minutes.</p>
        </div>
      `,
  };

  const info = await transporter.sendMail(mailOptions);
  console.log("Reset email sent: %s", info.messageId);
}
