const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { register, login, logout, sendResetEmail, resetPassword } = require('../controllers/auth');
const { verifyToken, verifyAdmin, verifyCashier } = require('../middleware/authMiddleware');
const { ipKeyGenerator } = require('express-rate-limit');

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    keyGenerator: ipKeyGenerator,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        message: 'พยายามเข้าสู่ระบบมากเกินไป กรุณาลองใหม่ในอีก 15 นาที'
    },
});

router.post('/register', register);
router.post('/login', loginLimiter, login);
router.get('/logout', logout);

router.post('/forgot-password', sendResetEmail);
router.post('/reset-password', resetPassword);

// เพิ่ม endpoints สำหรับ ProtectedRoute ฝั่ง FE
router.get('/current-user', verifyToken, (req, res) => res.json({ user: req.user }));
router.get('/current-admin', verifyToken, verifyAdmin, (req, res) => res.json({ user: req.user }));
router.get('/current-cashier', verifyToken, verifyCashier, (req, res) => res.json({ user: req.user }));

router.get('/me', verifyToken, async (req, res) => {
  try {
    res.json({ user: req.user });
  } catch (err) {
    console.error("❌ /me error:", err);
    res.status(500).json({ message: "Server error" });
  }
});


module.exports = router;
