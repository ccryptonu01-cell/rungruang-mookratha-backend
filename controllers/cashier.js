const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const { notifyAdminAndCashier } = require("../utils/notification")
const xss = require('xss');
const validator = require('validator');

// Reservations
exports.CashierListReservations = async (req, res) => {
    try {
        const reservations = await prisma.reservation.findMany({
            include: {
                user: true,
                guestUser: true,
                table: true,
            },
            orderBy: {
                time: 'desc',
            },
        });

        res.status(200).json({ reservations });
    } catch (err) {
        console.error("CashierListReservations Error:", err);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.CashierUpdateReservation = async (req, res) => {
    try {
        const tableNumberRaw = xss(req.body.tableNumber);
        const statusRaw = xss(req.body.status);

        if (!validator.isInt(tableNumberRaw.toString(), { min: 1 })) {
            return res.status(400).json({ message: "หมายเลขโต๊ะไม่ถูกต้อง" });
        }

        const allowedStatus = ["AVAILABLE", "RESERVED", "OCCUPIED"];
        if (!allowedStatus.includes(statusRaw.toUpperCase())) {
            return res.status(400).json({ message: "สถานะไม่ถูกต้อง" });
        }

        const tableNumber = parseInt(tableNumberRaw, 10);
        const status = statusRaw.toUpperCase();

        const table = await prisma.table.findUnique({
            where: { tableNumber }
        });

        if (!table) {
            return res.status(404).json({ message: "ไม่พบหมายเลขโต๊ะนี้" });
        }

        const updatedTable = await prisma.table.update({
            where: { tableNumber },
            data: { status }
        });

        res.json({ message: "อัปเดตสถานะโต๊ะสำเร็จ", updatedTable });

    } catch (err) {
        console.error("Update Table Status Error:", err);
        res.status(500).json({ message: "Server Error" });
    }
};

exports.CashierCancelReservation = async (req, res) => {
    try {
        const rawTableNumber = xss(req.body.tableNumber);

        // 🔐 Validate tableNumber
        if (!validator.isInt(rawTableNumber.toString(), { min: 1 })) {
            return res.status(400).json({ message: "หมายเลขโต๊ะไม่ถูกต้อง" });
        }

        const tableNumber = parseInt(rawTableNumber, 10);

        const reservation = await prisma.reservation.findFirst({
            where: { table: { tableNumber } },
            include: { order: true }
        });

        if (!reservation) {
            return res.status(404).json({ message: "ไม่พบการจองของโต๊ะนี้" });
        }

        // ถ้ามี orderId → ลบออเดอร์
        if (reservation.orderId) {
            await prisma.order.delete({
                where: { id: reservation.orderId }
            });
        }

        await prisma.reservation.delete({
            where: { id: reservation.id }
        });

        await prisma.table.update({
            where: { tableNumber },
            data: { status: "AVAILABLE" }
        });

        res.json({ message: "ยกเลิกการจองสำเร็จ, โต๊ะว่างแล้ว และออเดอร์ถูกลบ" });

    } catch (err) {
        console.error("Cancel Reservation Error:", err);
        res.status(500).json({ message: "Server Error" });
    }
};

// Menu
exports.CashierlistMenu = async (req, res) => {
    try {
        //ดึงรายการเมนูทั้งหมดจากฐานข้อมูล
        const menus = await prisma.menu.findMany()

        //ถ้าไม่มีเมนู ให้ส่งข้อความแจ้ง
        if (menus.length === 0) {
            return res.status(404).json({ message: 'ไม่มีเมนูในระบบ' })
        }

        res.status(200).json({ message: 'รายการเมนู', menus })

    } catch (err) {
        console.error('ListMenu Error:', err);
        res.status(500).json({ message: 'Server Error' })
    }
}

exports.CashierupdateMenu = async (req, res) => {
    try {
        const idRaw = req.params.id;
        const nameRaw = req.body.name;
        const priceRaw = req.body.price;

        const id = parseInt(xss(idRaw), 10);
        const name = nameRaw ? xss(nameRaw.trim()) : null;
        const price = priceRaw ? parseFloat(xss(priceRaw)) : null;

        if (!id || isNaN(id)) {
            return res.status(400).json({ message: 'ID ของเมนูไม่ถูกต้อง' });
        }

        if (!name && (price === null || isNaN(price))) {
            return res.status(400).json({ message: 'ต้องระบุ name หรือ price เพื่ออัปเดต' });
        }

        if (price !== null && (!validator.isFloat(String(price), { min: 0 }))) {
            return res.status(400).json({ message: 'ราคาต้องเป็นตัวเลขที่มากกว่าหรือเท่ากับ 0' });
        }

        const existingMenu = await prisma.menu.findUnique({
            where: { id }
        });

        if (!existingMenu) {
            return res.status(404).json({ message: `ไม่พบเมนูที่มี ID ${id}` });
        }

        const updatedMenu = await prisma.menu.update({
            where: { id },
            data: {
                name: name || existingMenu.name,
                price: price !== null ? price : existingMenu.price
            }
        });

        res.status(200).json({ message: 'อัปเดตเมนูสำเร็จ', menu: updatedMenu });

    } catch (err) {
        console.error('UpdateMenu Error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.CashierdeleteMenu = async (req, res) => {
    try {
        const idRaw = req.params.id;
        const idSanitized = xss(idRaw);
        const id = parseInt(idSanitized, 10);

        if (!id || isNaN(id) || !validator.isInt(String(id), { min: 1 })) {
            return res.status(400).json({ message: 'ID ของเมนูไม่ถูกต้อง' });
        }

        const existingMenu = await prisma.menu.findUnique({
            where: { id }
        });

        if (!existingMenu) {
            return res.status(404).json({ message: `ไม่พบเมนูที่มี ID ${id}` });
        }

        await prisma.inventory.deleteMany({
            where: { menuId: id }
        });

        await prisma.menu.delete({
            where: { id }
        });

        res.status(200).json({ message: `ลบเมนู ID ${id} และข้อมูลที่เกี่ยวข้องสำเร็จ` });

    } catch (err) {
        console.error('DeleteMenu Error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
};

// Order 
exports.addItemOrderCashier = async (req, res) => {
    try {
        const tableNumberRaw = req.body.tableNumber;
        const itemsRaw = req.body.items;

        const tableNumber = parseInt(xss(tableNumberRaw), 10);
        const items = Array.isArray(itemsRaw)
            ? itemsRaw.map(item => ({
                menuItemId: parseInt(xss(item.menuItemId), 10),
                quantity: parseInt(xss(item.quantity), 10)
            }))
            : [];

        if (!tableNumber || !Number.isInteger(tableNumber)) {
            return res.status(400).json({ message: 'หมายเลขโต๊ะไม่ถูกต้อง' });
        }
        if (!items || items.length === 0) {
            return res.status(400).json({ message: 'กรุณาระบุรายการอาหารที่ถูกต้อง' });
        }
        for (const item of items) {
            if (!item.menuItemId || !Number.isInteger(item.menuItemId)) {
                return res.status(400).json({ message: 'menuItemId ไม่ถูกต้อง' });
            }
            if (!item.quantity || !Number.isInteger(item.quantity) || item.quantity < 1) {
                return res.status(400).json({ message: 'quantity ต้องเป็นตัวเลขที่มากกว่า 0' });
            }
        }

        // หาโต๊ะด้วยฟิลด์ที่ unique จริงของคุณ
        const table = await prisma.table.findUnique({
            where: { tableNumber }, // ถ้าของคุณใช้ number: { number: tableNumber }
        });
        if (!table) return res.status(404).json({ message: 'ไม่พบโต๊ะนี้ในระบบ' });

        const menuPrices = await prisma.menu.findMany({
            where: { id: { in: items.map(item => item.menuItemId) } },
            select: { id: true, price: true }
        });
        if (menuPrices.length !== items.length) {
            return res.status(400).json({ message: 'พบเมนูที่ไม่มีอยู่ในระบบ' });
        }

        const priceMap = Object.fromEntries(menuPrices.map(m => [m.id, m.price]));
        let totalPrice = 0;
        const orderItems = items.map(item => {
            const price = priceMap[item.menuItemId] || 0;
            totalPrice += price * item.quantity;
            return { menuId: item.menuItemId, quantity: item.quantity, price };
        });

        // =================== สำคัญ: ทำงานในทรานแซกชัน ===================
        const result = await prisma.$transaction(async (tx) => {
            // 1) สร้างออเดอร์
            const order = await tx.order.create({
                data: {
                    tableId: table.id,
                    status: 'PENDING',   // ให้ตรง enum ของ Order ถ้ามี
                    totalPrice,
                    orderItems: { create: orderItems }
                },
                include: { orderItems: true }
            });

            // 2) อัปเดตสถานะโต๊ะให้ถูกจอง (ถ้ามีฟิลด์นี้ใน Table)
            //    ถ้า enum จริงไม่ใช่ RESERVED ให้เปลี่ยนค่าให้ตรง
            try {
                await tx.table.update({
                    where: { id: table.id },   // หรือ { tableNumber }
                    data: { status: 'RESERVED' }
                });
            } catch (e) {
                // ถ้าไม่มีฟิลด์ status หรือ enum ไม่ตรง จะไม่ให้ล้มทั้งทรานแซกชัน
                // console.warn("Skip table status update:", e?.message);
            }

            // 3) สร้าง/อัปเดตการจอง (ผูกกับ orderId ซึ่งเป็น @unique)
            await tx.reservation.upsert({
                where: { orderId: order.id },  // ใช้ unique index
                update: {
                    tableId: table.id,
                    time: new Date(),
                    status: 'RESERVED',          // ใช้ enum จาก schema ของคุณ
                    // people: 0,                // ถ้าจะบันทึกจำนวนคน
                },
                create: {
                    orderId: order.id,
                    tableId: table.id,
                    time: new Date(),
                    status: 'RESERVED',
                    // userId: null,             // ถ้ามีกรณีล็อกอินพนักงาน/ผู้ใช้
                    // guestUserId: null,
                    // people: 0,
                }
            });

            return order;
        });
        // =================== จบทρανแซกชัน ===================

        return res.status(201).json({
            message: 'เพิ่มออเดอร์สำเร็จ',
            order: result,
        });

    } catch (err) {
        console.error('Add Order Error:', { code: err?.code, message: err?.message, meta: err?.meta });
        return res.status(500).json({ message: 'Server Error' });
    }
}

exports.getOrdersCashier = async (req, res) => {
    try {
        const orders = await prisma.order.findMany({
            include: {
                table: {
                    select: { tableNumber: true },
                },
                user: {
                    select: { id: true, username: true, email: true },
                },
                orderItems: {
                    select: {
                        quantity: true,
                        price: true,
                        menu: {
                            select: { name: true, price: true },
                        },
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
            take: 100,
        });

        res.status(200).json({ orders });

    } catch (error) {
        console.error("❌ Error fetching orders (Cashier):", error);
        res.status(500).json({ message: "เกิดข้อผิดพลาดขณะดึงข้อมูลออเดอร์" });
    }
};


exports.updateOrderStatusCashier = async (req, res) => {
    try {
        const rawId = req.params.id;
        const rawStatus = req.body.status;

        // Validate ID
        if (!rawId || isNaN(rawId)) {
            return res.status(400).json({ message: 'ID คำสั่งซื้อไม่ถูกต้อง' });
        }

        // Sanitize & Validate status
        const status = xss(rawStatus?.trim());
        const allowedStatuses = ["PENDING", "COMPLETED", "CANCELLED"];

        if (!status || !allowedStatuses.includes(status.toUpperCase())) {
            return res.status(400).json({ message: 'สถานะไม่ถูกต้อง' });
        }

        const id = parseInt(rawId);

        // ตรวจสอบว่า order มีอยู่หรือไม่
        const order = await prisma.order.findUnique({ where: { id } });

        if (!order) {
            return res.status(404).json({ message: 'ไม่พบคำสั่งซื้อ' });
        }

        // อัปเดตสถานะ
        const updatedOrder = await prisma.order.update({
            where: { id },
            data: { status: status.toUpperCase() },
        });

        res.status(200).json({ message: 'อัปเดตสถานะคำสั่งซื้อสำเร็จ', updatedOrder });

    } catch (err) {
        console.error('Update Order Status Error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.cancelOrderCashier = async (req, res) => {
    try {
        // sanitize และ validate id
        const rawId = req.params.id;
        const sanitizedId = xss(rawId?.trim());

        if (!sanitizedId || !validator.isInt(sanitizedId, { min: 1 })) {
            return res.status(400).json({ message: 'ID ออเดอร์ไม่ถูกต้อง' });
        }

        const id = parseInt(sanitizedId, 10);

        // ตรวจสอบว่า order มีอยู่หรือไม่
        const order = await prisma.order.findUnique({
            where: { id }
        });

        if (!order) {
            return res.status(404).json({ message: 'ไม่พบออเดอร์นี้' });
        }

        // ลบออเดอร์
        await prisma.order.delete({
            where: { id }
        });

        res.json({ message: 'ยกเลิกออเดอร์สำเร็จ' });

    } catch (err) {
        console.error("Cancel Order Error:", err);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.getOrderStatusCashier = async (req, res) => {
    try {
        const rawOrderId = req.params.orderId;
        const sanitizedOrderId = xss(rawOrderId?.trim());

        if (!sanitizedOrderId || !validator.isInt(sanitizedOrderId, { min: 1 })) {
            return res.status(400).json({ message: "รหัสออเดอร์ไม่ถูกต้อง" });
        }

        const orderId = parseInt(sanitizedOrderId, 10);
        const userId = req.user.id;
        const userRole = req.user.role;

        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: {
                user: true,
                orderItems: {
                    include: { menu: true }
                }
            }
        });

        if (!order) {
            return res.status(404).json({ message: "ไม่พบออเดอร์นี้" });
        }

        if (userRole !== "ADMIN" && order.userId !== userId) {
            return res.status(403).json({ message: "คุณไม่มีสิทธิ์ดูออเดอร์นี้" });
        }

        res.json({
            orderId: order.id,
            user: {
                id: order.user.id,
                username: order.user.username,
                email: order.user.email
            },
            totalPrice: order.totalPrice,
            paymentStatus: order.paymentStatus,
            paymentMethod: order.paymentMethod,
            createdAt: order.createdAt,
            orderItems: order.orderItems.map(item => ({
                menuId: item.menu.id,
                menuName: item.menu.name,
                quantity: item.quantity,
                price: item.price
            }))
        });

    } catch (error) {
        console.error("Get Order Status Error:", error);
        res.status(500).json({ message: "เกิดข้อผิดพลาดในการดึงสถานะออเดอร์" });
    }
};

// ฟังก์ชันอัปเดตสถานะการชำระเงิน
exports.updatePaymentStatusCashier = async (req, res) => {
    try {
        const rawId = req.params.id;
        const rawStatus = req.body.status;

        const sanitizedId = xss(rawId?.trim());
        const sanitizedStatus = xss(rawStatus?.trim());

        if (!sanitizedId || !validator.isInt(sanitizedId, { min: 1 })) {
            return res.status(400).json({ message: "ID ออเดอร์ไม่ถูกต้อง" });
        }

        const allowedStatus = ["ชำระเงินแล้ว", "ยังไม่ชำระเงิน", "ยกเลิกออเดอร์"];
        if (!allowedStatus.includes(sanitizedStatus)) {
            return res.status(400).json({ message: "สถานะไม่ถูกต้อง" });
        }

        const orderId = parseInt(sanitizedId, 10);

        const order = await prisma.order.findUnique({ where: { id: orderId } });
        if (!order) return res.status(404).json({ message: "ไม่พบออเดอร์นี้" });

        const updatedOrder = await prisma.order.update({
            where: { id: orderId },
            data: { paymentStatus: sanitizedStatus },
        });

        return res.json({ message: "อัปเดตสถานะสำเร็จ", order: updatedOrder });
    } catch (error) {
        console.error("Cashier Status Update Error:", error);
        return res.status(500).json({ message: "เกิดข้อผิดพลาดในการอัปเดตสถานะ" });
    }
};

exports.updatePaymentMethodByCashier = async (req, res) => {
    const user = req.user;

    if (user.role !== "CASHIER") {
        return res.status(403).json({ message: "คุณไม่มีสิทธิ์ดำเนินการนี้" });
    }

    const rawId = req.params.id;
    const rawMethod = req.body.paymentMethod;

    const sanitizedId = xss(rawId?.trim());
    const sanitizedMethod = xss(rawMethod?.trim());

    // ตรวจสอบ ID ต้องเป็นตัวเลขจำนวนเต็ม
    if (!sanitizedId || !validator.isInt(sanitizedId, { min: 1 })) {
        return res.status(400).json({ message: "ID ของออเดอร์ไม่ถูกต้อง" });
    }

    // ตรวจสอบช่องทางชำระเงิน ต้องไม่ว่าง และเป็น string
    if (!sanitizedMethod || typeof sanitizedMethod !== "string") {
        return res.status(400).json({ message: "กรุณาระบุช่องทางชำระเงินที่ถูกต้อง" });
    }

    try {
        const updated = await prisma.order.update({
            where: { id: parseInt(sanitizedId, 10) },
            data: { paymentMethod: sanitizedMethod },
        });

        return res.json({ message: "อัปเดตสำเร็จ", order: updated });
    } catch (err) {
        console.error("อัปเดตช่องทางชำระเงินล้มเหลว:", err);
        return res.status(500).json({ message: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์" });
    }
};

exports.updateOrderByCashier = async (req, res) => {
    try {
        const rawId = req.params.id;
        const rawItems = req.body.items;

        const sanitizedId = xss(rawId?.toString().trim());

        if (!sanitizedId || !validator.isInt(sanitizedId, { min: 1 })) {
            return res.status(400).json({ message: "ID ของออเดอร์ไม่ถูกต้อง" });
        }

        if (!Array.isArray(rawItems) || rawItems.length === 0) {
            return res.status(400).json({ message: "รายการอาหารไม่ถูกต้อง" });
        }

        // ตรวจสอบทุกรายการใน items
        const items = rawItems.map((item, index) => {
            const sanitizedMenuId = xss(item.menuItemId?.toString().trim());
            const sanitizedQty = xss(item.quantity?.toString().trim());

            if (
                !sanitizedMenuId || !validator.isInt(sanitizedMenuId, { min: 1 }) ||
                !sanitizedQty || !validator.isInt(sanitizedQty, { min: 1 })
            ) {
                throw new Error(`รายการที่ ${index + 1} ไม่ถูกต้อง`);
            }

            return {
                menuItemId: parseInt(sanitizedMenuId, 10),
                quantity: parseInt(sanitizedQty, 10),
            };
        });

        const existingOrder = await prisma.order.findUnique({
            where: { id: parseInt(sanitizedId, 10) },
            include: { orderItems: true },
        });

        if (!existingOrder) {
            return res.status(404).json({ message: "ไม่พบออเดอร์" });
        }

        // ลบ orderItems เก่า
        await prisma.orderItem.deleteMany({
            where: { orderId: existingOrder.id },
        });

        // ดึงราคาของเมนูใหม่
        const menuPrices = await prisma.menu.findMany({
            where: { id: { in: items.map(item => item.menuItemId) } },
            select: { id: true, price: true },
        });

        const priceMap = {};
        menuPrices.forEach(menu => {
            priceMap[menu.id] = menu.price;
        });

        let totalPrice = 0;
        const newItems = items.map(item => {
            const price = priceMap[item.menuItemId] || 0;
            totalPrice += price * item.quantity;
            return {
                menuId: item.menuItemId,
                quantity: item.quantity,
                price,
            };
        });

        const updatedOrder = await prisma.order.update({
            where: { id: existingOrder.id },
            data: {
                totalPrice,
                orderItems: {
                    create: newItems,
                },
            },
            include: { orderItems: true },
        });

        res.json({ message: "อัปเดตออเดอร์สำเร็จ", order: updatedOrder });

    } catch (error) {
        console.error("Update Order by Cashier Error:", error.message || error);
        res.status(500).json({ message: error.message || "เกิดข้อผิดพลาด" });
    }
};

exports.getUnpaidOrders = async (req, res) => {
    try {
        const user = req.user;
        if (user.role !== "CASHIER" && user.role !== "ADMIN") {
            return res.status(403).json({ message: "คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้" });
        }

        const unpaidOrders = await prisma.order.findMany({
            where: {
                paymentStatus: "ยังไม่ชำระเงิน",
            },
            orderBy: {
                createdAt: "desc",
            },
            include: {
                table: {
                    select: {
                        tableNumber: true,
                        status: true
                    }
                }
            },
        });

        res.json(unpaidOrders);
    } catch (error) {
        console.error("❌ Error fetching unpaid orders for cashier:", error);
        res.status(500).json({ message: "เกิดข้อผิดพลาดในการโหลดข้อมูล" });
    }
};
