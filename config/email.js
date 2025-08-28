require('dotenv').config();

const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});


const sendEmail = async (to, subject, html) => {
    const mailOptions = {
        from: `"ระบบ" <${process.env.EMAIL_FROM}>`,
        to,
        subject,
        html,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log("📧 Email sent:", info.messageId);
    } catch (err) {
        console.error("❌ Email failed:", err);
        throw err;
    }
};

module.exports = sendEmail;
