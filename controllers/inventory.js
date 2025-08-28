const prisma = require("../config/prisma")
const xss = require("xss");
const validator = require("validator");

exports.createStock = async (req, res) => {
    try {
        let { itemName, quantity } = req.body;

        if (!itemName || !quantity) {
            return res.status(400).json({ message: 'ต้องระบุ itemName และ quantity' });
        }

        itemName = xss(itemName.trim());
        quantity = validator.toInt(quantity.toString());

        if (!validator.isInt(quantity.toString(), { min: 0 })) {
            return res.status(400).json({ message: 'quantity ต้องเป็นตัวเลขจำนวนเต็มบวก' });
        }

        const inventory = await prisma.inventory.create({
            data: {
                itemName,
                quantity,
            }
        });

        res.status(201).json({ message: 'เพิ่มวัตถุดิบสำเร็จ', inventory });
    } catch (err) {
        console.error('CreateStock Error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.listStock = async (req, res) => {
    try {
        const inventories = await prisma.inventory.findMany({
            orderBy: { itemName: 'asc' }
        });

        res.status(200).json({
            message: '✅ รายการวัตถุดิบทั้งหมด',
            total: inventories.length,
            data: inventories
        });
    } catch (err) {
        console.error('❌ ListStock Error:', err);
        res.status(500).json({ message: 'เกิดข้อผิดพลาดในฝั่งเซิร์ฟเวอร์' });
    }
};

exports.updateStock = async (req, res) => {
    try {
        const id = parseInt(xss(req.params.id));

        if (!validator.isInt(id.toString(), { min: 1 })) {
            return res.status(400).json({ message: "รหัสวัตถุดิบไม่ถูกต้อง" });
        }

        let { itemName, quantity, menuId } = req.body;

        if (itemName) itemName = xss(itemName.trim());
        if (quantity !== undefined && !validator.isInt(quantity.toString(), { min: 0 })) {
            return res.status(400).json({ message: "quantity ต้องเป็นตัวเลขจำนวนเต็มบวก" });
        }
        if (menuId !== undefined && !validator.isInt(menuId.toString(), { min: 1 })) {
            return res.status(400).json({ message: "menuId ต้องเป็นตัวเลขจำนวนเต็มบวก" });
        }

        const existingInventory = await prisma.inventory.findUnique({
            where: { id }
        });

        if (!existingInventory) {
            return res.status(404).json({ message: "ไม่พบวัตถุดิบที่ต้องการอัปเดต" });
        }

        if (menuId) {
            const menuExists = await prisma.menu.findUnique({
                where: { id: parseInt(menuId) }
            });

            if (!menuExists) {
                return res.status(400).json({ message: "MENU ID ไม่ถูกต้อง หรือไม่มีอยู่ในระบบ" });
            }
        }

        const updatedInventory = await prisma.inventory.update({
            where: { id },
            data: {
                itemName: itemName || existingInventory.itemName,
                quantity: quantity !== undefined ? parseInt(quantity) : existingInventory.quantity,
                menuId: menuId ? parseInt(menuId) : existingInventory.menuId
            }
        });

        res.status(200).json({ message: "อัปเดตวัตถุดิบสำเร็จ", inventory: updatedInventory });

    } catch (err) {
        console.error("UpdateStock Error:", err);
        res.status(500).json({ message: "Server Errors" });
    }
};

exports.deleteStock = async (req, res) => {
    try {
        const id = parseInt(xss(req.params.id));

        if (!validator.isInt(id.toString(), { min: 1 })) {
            return res.status(400).json({ message: "รหัสวัตถุดิบไม่ถูกต้อง" });
        }

        const existingInventory = await prisma.inventory.findUnique({
            where: { id }
        });

        if (!existingInventory) {
            return res.status(404).json({ message: "ไม่พบวัตถุดิบที่ต้องการลบ" });
        }

        await prisma.inventory.delete({
            where: { id }
        });

        res.status(200).json({ message: "ลบวัตถุดิบสำเร็จ" });

    } catch (err) {
        console.error("DeleteStock Error:", err);
        res.status(500).json({ message: "Server Errors" });
    }
};