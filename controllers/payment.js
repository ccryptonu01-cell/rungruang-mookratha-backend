const qrcode = require("qrcode");
const generatePayload = require("promptpay-qr");
const xss = require("xss");
const validator = require("validator");
require("dotenv").config();

exports.generateQRPayment = async (req, res) => {
  try {
    // Sanitize + Validate
    const rawAmount = req.body.amount;
    const sanitizedAmount = validator.toFloat(xss(rawAmount));

    if (isNaN(sanitizedAmount) || sanitizedAmount <= 0) {
      return res.status(400).json({ message: "จำนวนเงินไม่ถูกต้อง" });
    }

    const promptPayID = process.env.PROMPTPAY_ID;

    // สร้าง payload
    const payload = generatePayload(promptPayID, { amount: sanitizedAmount });

    // แปลงเป็น QR Code
    const qrCodeImage = await qrcode.toDataURL(payload);

    res.json({
      qrCode: qrCodeImage,
      promptPayID,
      amount: sanitizedAmount,
      paymentLink: `https://promptpay.io/${promptPayID}/${sanitizedAmount}`,
    });

  } catch (err) {
    console.error("QR Code Error:", err);
    res.status(500).json({ message: "Server Error" });
  }
};
