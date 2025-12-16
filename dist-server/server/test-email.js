import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();
async function testEmail() {
    console.log('Testing SMTP Configuration...');
    console.log(`Host: ${process.env.SMTP_HOST}`);
    console.log(`Port: ${process.env.SMTP_PORT}`);
    console.log(`User: ${process.env.SMTP_USER}`);
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
        // Debug options to see more details
        debug: true,
        logger: true
    });
    try {
        const info = await transporter.sendMail({
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to: process.env.SMTP_USER, // Send to self
            subject: "Test Email from 10xDS SendShare",
            text: "If you see this, your SMTP configuration is working!",
        });
        console.log('✅ Email sent successfully!');
        console.log('Message ID:', info.messageId);
    }
    catch (error) {
        console.error('❌ Error sending email:');
        console.error(error);
    }
}
testEmail();
