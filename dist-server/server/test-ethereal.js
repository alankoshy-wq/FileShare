import nodemailer from 'nodemailer';
async function testEthereal() {
    console.log('🧪 Testing Ethereal Email Direct Connection...');
    try {
        console.log('1. Creating Test Account...');
        const testAccount = await nodemailer.createTestAccount();
        console.log('✅ Account created:', testAccount.user);
        console.log('2. Creating Transporter...');
        const transporter = nodemailer.createTransport({
            host: "smtp.ethereal.email",
            port: 587,
            secure: false,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass,
            },
        });
        console.log('3. Sending Email...');
        const info = await transporter.sendMail({
            from: '"Test" <test@example.com>',
            to: "recipient@example.com",
            subject: "Hello Ethereal",
            text: "This is a test email.",
        });
        console.log("✅ Message sent: %s", info.messageId);
        console.log("🔗 Preview URL: %s", nodemailer.getTestMessageUrl(info));
    }
    catch (error) {
        console.error('❌ Failed:', error);
    }
}
testEthereal();
