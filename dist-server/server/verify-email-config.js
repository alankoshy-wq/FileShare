import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();
async function verifyEmailConfig() {
    console.log('🚀 Starting Email Configuration Verification...');
    console.log(`Using SMTP Host: ${process.env.SMTP_HOST}`);
    console.log(`Using SMTP User: ${process.env.SMTP_USER}`);
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
    try {
        // 1. Verify connection configuration
        console.log('\n1️⃣  Verifying SMTP connection...');
        await transporter.verify();
        console.log('✅ SMTP connection established successfully.');
        // 2. Send test email
        console.log('\n2️⃣  Sending test email...');
        const info = await transporter.sendMail({
            from: `"Test Script" <${process.env.SMTP_FROM}>`,
            to: process.env.SMTP_USER, // Send to self
            subject: "Test Email from SendShare Verification Script",
            text: "If you are reading this, the email configuration is working correctly!",
            html: "<b>If you are reading this, the email configuration is working correctly!</b>",
        });
        console.log('✅ Test email sent successfully.');
        console.log(`Message ID: ${info.messageId}`);
        console.log(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    }
    catch (error) {
        console.error('\n❌ Email Verification Failed:', error);
    }
}
verifyEmailConfig();
