const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const nodemailer = require('nodemailer')
const blacklistedTokens = new Set()
const crypto = require('crypto')
const sendEmail = require('../utils/sendEmail');
const xss = require('xss')
const validator = require('validator')


const SECRET_KEY = process.env.JWT_SECRET;
if (!SECRET_KEY) throw new Error('JWT_SECRET is not set');

exports.register = async (req, res) => {
    try {
        const username = xss(req.body.username)
        const email = xss(req.body.email)
        const password = xss(req.body.password)
        const confirmPassword = xss(req.body.confirmPassword)
        const phone = xss(req.body.phone)

        if (!username) return res.status(400).json({ message: 'จำเป็นต้องกรอกชื่อผู้ใช้' })
        if (!email) return res.status(400).json({ message: 'จำเป็นต้องกรอกอีเมล' })
        if (!password) return res.status(400).json({ message: 'จำเป็นต้องกรอกรหัสผ่าน' })
        if (!confirmPassword) return res.status(400).json({ message: 'จำเป็นต้องยืนยันรหัสผ่าน' })
        if (password !== confirmPassword) return res.status(400).json({ message: 'รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน' })
        if (password.length < 6) return res.status(400).json({ message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษรขึ้นไป' })
        if (!phone) return res.status(400).json({ message: 'จำเป็นต้องกรอกเบอร์โทร' })
        if (!/^\d{10}$/.test(phone)) return res.status(400).json({ message: 'เบอร์โทรต้องเป็นตัวเลข 10 หลัก' })

        const existingUser = await prisma.user.findFirst({
            where: { OR: [{ email }, { phone }] }
        })

        if (existingUser) {
            return res.status(400).json({ message: 'Username, Email หรือ เบอร์โทรศัพท์ นี้มีอยู่แล้ว' })
        }

        const hashPassword = await bcrypt.hash(password, 10)

        const newUser = await prisma.user.create({
            data: {
                username,
                email,
                password: hashPassword,
                phone,
                enabled: true,
                role: "USER"
            }
        })

        res.status(201).json({ message: 'สมัครสมาชิกสำเร็จแล้ว!', user: newUser })

    } catch (err) {
        console.error('Register Error:', err)
        res.status(500).json({ message: 'Server Error' })
    }
}

exports.login = async (req, res) => {
    try {
        const username = xss(req.body.username)
        const password = xss(req.body.password)

        if (!username || !password) {
            return res.status(400).json({ message: 'กรุณากรอก Username และ Password' });
        }

        // ค้นหาผู้ใช้จากฐานข้อมูล
        const user = await prisma.user.findFirst({
            where: { username }
        });

        if (!user) {
            return res.status(400).json({ message: 'ไม่พบผู้ใช้นี้ในระบบ' });
        }

        if (!user.enabled) {
            return res.status(403).json({ message: 'บัญชีนี้ถูกปิดใช้งาน' });
        }

        // ตรวจสอบรหัสผ่าน
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'รหัสผ่านไม่ถูกต้อง' });
        }

        // สร้าง Payload สำหรับ JWT
        const payload = {
            id: user.id,
            username: user.username,
            email: user.email,
            role: String(user.role || 'USER').toUpperCase()
        };

        // สร้าง JWT Token อย่างถูกต้อง
        const token = jwt.sign(payload, SECRET_KEY, { expiresIn: '8h' });

        res.status(200).json({
            message: 'เข้าสู่ระบบสำเร็จ',
            payload,
            token
        });

    } catch (err) {
        console.error('Login Error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
}

exports.logout = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];

        if (!token) {
            return res.status(400).json({ message: 'No token provided' });
        }

        if (!validator.isJWT(token)) {
            return res.status(400).json({ message: 'Invalid token format' });
        }

        // เพิ่ม Token ไปที่ Blacklist
        blacklistedTokens.add(token);

        res.status(200).json({ message: 'ออกจากระบบสำเร็จ' });
    } catch (err) {
        console.error('Logout Error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
}

exports.checkBlacklistedToken = (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token || !validator.isJWT(token)) {
        return res.status(401).json({ message: 'Token is invalid or expired' });
    }

    if (blacklistedTokens.has(token)) {
        return res.status(401).json({ message: 'Token is invalid or expired' });
    }

    next();
}

// Reset Password API
exports.sendResetEmail = async (req, res) => {
    try {
        const email = xss(req.body.email)

        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            return res.status(404).json({ message: "ไม่พบผู้ใช้งานนี้" });
        }

        const resetToken = crypto.randomBytes(32).toString("hex");
        const tokenExp = new Date(Date.now() + 1000 * 60 * 60);

        await prisma.user.update({
            where: { email },
            data: {
                resetToken,
                resetTokenExp: tokenExp,
            },
        });

        const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;

        await sendEmail({
            to: email,
            subject: "รีเซ็ตรหัสผ่าน",
            html: `
    <div style="font-family: 'Prompt', sans-serif; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
      <h2 style="color: #d32f2f;">รีเซ็ตรหัสผ่าน</h2>
      <p>คุณได้รับอีเมลฉบับนี้เนื่องจากมีการร้องขอให้รีเซ็ตรหัสผ่านสำหรับบัญชีของคุณ</p>
      <p style="margin: 20px 0;">
        <a href="${resetUrl}" style="background-color: #d32f2f; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">คลิกที่นี่เพื่อรีเซ็ตรหัสผ่าน</a>
      </p>
      <p>หากคุณไม่ได้ร้องขอการรีเซ็ตรหัสผ่าน กรุณาละเว้นอีเมลฉบับนี้</p>
      <p style="color: gray; font-size: 0.9em;">ร้านหมูกระทะ | ระบบช่วยเหลือลูกค้า</p>
    </div>
  `,
        });


        return res.json({ message: "ส่งอีเมลแล้ว" });

    } catch (error) {
        console.error("sendResetEmail error:", error);
        return res.status(500).json({ message: "เกิดข้อผิดพลาดในการส่งอีเมล" });
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const token = xss(req.body.token)
        const newPassword = xss(req.body.newPassword)

        const user = await prisma.user.findFirst({
            where: {
                resetToken: token,
                resetTokenExp: {
                    gte: new Date(),
                },
            },
        });

        if (!user) {
            return res.status(400).json({ message: "ลิงก์หมดอายุหรือไม่ถูกต้อง" });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                resetToken: null,
                resetTokenExp: null,
            },
        });

        return res.json({ message: "รีเซ็ตรหัสผ่านสำเร็จ" });
    } catch (err) {
        console.error("resetPassword error:", err);
        return res.status(500).json({ message: "เกิดข้อผิดพลาด" });
    }
};

