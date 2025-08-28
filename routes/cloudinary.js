const express = require('express');
const { v2: cloudinary } = require('cloudinary');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

router.get('/sign',
  verifyToken,
  requireRole(['USER', 'CASHIER']),
  (req, res) => {
    const timestamp = Math.floor(Date.now() / 1000);
    const folder = 'receipts';

    const signature = cloudinary.utils.api_sign_request(
      { timestamp, folder },
      process.env.CLOUDINARY_API_SECRET
    );

    res.json({
      timestamp,
      folder,
      signature,
      apiKey: process.env.CLOUDINARY_API_KEY,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME
    });
  }
);

module.exports = router;
