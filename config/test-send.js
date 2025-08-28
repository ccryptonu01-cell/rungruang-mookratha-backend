const sendTestEmail = async () => {
  try {
    const info = await transporter.sendMail({
      from: '"ระบบทดสอบ" <northnu.223@gmail.com>',
      to: "อีเมลปลายทางที่คุณต้องการทดสอบ",
      subject: "🚀 ทดสอบส่งอีเมล Nodemailer",
      text: "ยินดีด้วย! ระบบ Nodemailer ทำงานได้แล้ว",
    });

    console.log("ส่งอีเมลสำเร็จ:", info.messageId);
  } catch (err) {
    console.error("ส่งอีเมลล้มเหลว:", err);
  }
};

sendTestEmail();
