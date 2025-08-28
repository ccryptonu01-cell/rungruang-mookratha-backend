const nodemailer = require("nodemailer");

const sendEmail = async ({ to, subject, html }) => {

    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });

    const mailOptions = {
        from: `"รุ่งเรืองหมูกระทะ" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html,
    };

    await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
