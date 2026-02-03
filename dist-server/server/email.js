import nodemailer from 'nodemailer';
import { secrets } from './secrets.js';
export async function sendShareEmail(recipientEmail, files, shareLink, message) {
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
    console.log("Message sent: %s", info.messageId);
    console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
}
