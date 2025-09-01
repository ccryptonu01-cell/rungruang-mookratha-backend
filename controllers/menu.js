const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const fs = require('fs')
const path = require('path')
const cloudinary = require('../utils/cloudinary')
const xss = require("xss");
const validator = require("validator");


exports.createMenu = async (req, res) => {

    console.log("🔥🔥🔥 CreateMenu called");
    console.log("📦 req.body:", req.body);
    console.log("🖼 req.file:", req.file);

    try {
        console.log("📥 req.body:", req.body);
        console.log("🖼 req.file:", req.file);

        const name = xss(req.body.name);
        const description = xss(req.body.description || "");
        const price = validator.toFloat(xss(req.body.price));
        const categoryId = validator.toInt(xss(req.body.categoryId));
        const imageFile = req.file;

        // ✅ ลองเพิ่ม log ตรงนี้
        console.log("✅ Parsed:", { name, description, price, categoryId });

        if (!name || !price || !imageFile || !categoryId) {
            console.warn("⚠️ ข้อมูลไม่ครบ", { name, price, imageFile, categoryId });
            return res.status(400).json({
                message: "กรุณาระบุ name, price, รูปภาพ และหมวดหมู่ (categoryId)",
            });
        }

        const parsedPrice = parseFloat(price);
        const parsedCategoryId = parseInt(categoryId);

        // ✅ log ช่วงแปลง
        console.log("💵 price:", parsedPrice);
        console.log("🏷️ categoryId:", parsedCategoryId);

        if (isNaN(parsedPrice) || parsedPrice <= 0) {
            return res.status(400).json({
                message: "price ต้องเป็นตัวเลขและมากกว่า 0",
            });
        }

        if (isNaN(parsedCategoryId)) {
            return res.status(400).json({ message: "categoryId ต้องเป็นตัวเลข" });
        }

        // ✅ เช็คว่าหมวดหมู่เจอไหม
        const existingCategory = await prisma.category.findUnique({
            where: { id: parsedCategoryId },
        });

        if (!existingCategory) {
            console.warn("❌ ไม่พบหมวดหมู่ ID:", parsedCategoryId);
            return res.status(404).json({ message: "ไม่พบหมวดหมู่ที่เลือก" });
        }

        // ✅ ตรวจ log ก่อน insert DB
        console.log("📝 กำลังสร้างเมนู:", {
            name,
            price: parsedPrice,
            description,
            image: imageFile.path,
            publicId: imageFile.filename,
            categoryId: parsedCategoryId,
        });

        const newMenu = await prisma.menu.create({
            data: {
                name,
                price: parsedPrice,
                description,
                image: imageFile.path,
                publicId: imageFile.filename,
                category: {
                    connect: { id: parsedCategoryId },
                },
            },
        });

        res.status(201).json({ message: "เพิ่มเมนูสำเร็จ", menu: newMenu });
    } catch (err) {
        res.status(500).json({
            message: "เกิดข้อผิดพลาดใน server",
            error: err.message,
            stack: err.stack, // ✅ ส่ง stack trace มาเลย
            body: req.body,   // ✅ เพิ่ม body ที่รับมา
            file: req.file,   // ✅ เพิ่มข้อมูลไฟล์
        });
    }

};


exports.listMenu = async (req, res) => {
    try {
        const menus = await prisma.menu.findMany()

        if (menus.length === 0) {
            return res.status(404).json({ message: 'ไม่มีเมนูในระบบ' })
        }

        res.status(200).json({ message: 'รายการเมนู', menus })

    } catch (err) {
        console.error('ListMenu Error:', err);
        res.status(500).json({ message: 'Server Error' })
    }
}

exports.updateMenu = async (req, res) => {
    try {
        const { id } = req.params;
        const name = req.body.name ? xss(req.body.name) : undefined;
        const price = req.body.price ? validator.toFloat(xss(req.body.price)) : undefined;
        const description = req.body.description ? xss(req.body.description) : undefined;
        const status = req.body.status ? xss(req.body.status) : undefined;
        const imageFile = req.file;

        const menuId = validator.toInt(xss(id));
        if (isNaN(menuId)) {
            return res.status(400).json({ message: "ID ของเมนูไม่ถูกต้อง" });
        }

        const existingMenu = await prisma.menu.findUnique({
            where: { id: parseInt(id) }
        });

        if (!existingMenu) {
            return res.status(404).json({ message: `ไม่พบเมนูที่มี ID ${id}` });
        }

        const updatedData = {};
        if (name) updatedData.name = name;
        if (price) updatedData.price = parseFloat(price);
        if (description) updatedData.description = description; // ✅ เพิ่มบรรทัดนี้

        if (status) {
            const allowedStatuses = ["มีอยู่", "หมดแล้ว"];
            if (!allowedStatuses.includes(status)) {
                return res.status(400).json({ message: "สถานะไม่ถูกต้อง" });
            }
            updatedData.status = status;
        }

        if (imageFile) {
            // ถ้ามีการอัปโหลดรูปภาพใหม่ → ลบรูปเก่าใน cloudinary
            if (existingMenu.publicId) {
                await cloudinary.uploader.destroy(existingMenu.publicId);
            }

            updatedData.image = imageFile.path;
            updatedData.publicId = imageFile.filename;
        }

        const updatedMenu = await prisma.menu.update({
            where: { id: parseInt(id) },
            data: updatedData
        });

        res.status(200).json({ message: "อัปเดตเมนูสำเร็จ", menu: updatedMenu });
    } catch (err) {
        console.error("UpdateMenu Error:", err);
        res.status(500).json({ message: "Server Error" });
    }
};

exports.deleteMenu = async (req, res) => {
    try {
        const rawId = xss(req.params.id);
        const menuId = validator.toInt(rawId);

        if (isNaN(menuId)) {
            return res.status(400).json({ message: 'ID ของเมนูไม่ถูกต้อง' });
        }

        const existingMenu = await prisma.menu.findUnique({
            where: { id: menuId },
        });

        if (!existingMenu) {
            return res.status(404).json({ message: `ไม่พบเมนูที่มี ID ${menuId}` });
        }

        if (existingMenu.publicId) {
            await cloudinary.uploader.destroy(existingMenu.publicId);
        }

        await prisma.menu.delete({
            where: { id: menuId },
        });

        res.status(200).json({
            message: `ลบเมนู ID ${menuId} พร้อมรูปภาพบน Cloudinary และวัตถุดิบที่เกี่ยวข้องแล้ว`,
        });

    } catch (err) {
        console.error('❌ DeleteMenu Error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
};