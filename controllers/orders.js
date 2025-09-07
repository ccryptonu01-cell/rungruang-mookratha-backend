const { PrismaClient, Prisma } = require('@prisma/client');
const prisma = require('../config/prisma')
const { OrderStatus, PaymentMethod, PaymentStatus, StatusLabels } = require("../enums/order");
const xss = require("xss");
const validator = require("validator");

const mapThaiStatusToEnum = (status) => {
    switch (status) {
        case "รอดำเนินการ": return "PENDING";
        case "สำเร็จ": return "COMPLETED";
        case "ยกเลิก": return "CANCELLED";
        default: return status; // ถ้าส่ง ENUM มาโดยตรง
    }
}

exports.addItemOrder = async (req, res) => {
    try {
        const sanitizedTableNumber = validator.toInt(xss(req.body.tableNumber));
        const sanitizedMethod = xss(req.body.method);
        const sanitizedStatus = xss(req.body.status);
        const sanitizedSlipUrl = req.body.slipUrl ? xss(req.body.slipUrl) : null;

        const items = Array.isArray(req.body.items)
            ? req.body.items.map((item) => ({
                id: validator.toInt(xss(item.id)),
                qty: validator.toInt(xss(item.qty)),
            }))
            : [];

        if (!sanitizedTableNumber || items.length === 0 || !sanitizedMethod || !sanitizedStatus) {
            return res.status(400).json({ message: "ข้อมูลไม่ครบถ้วน" });
        }

        const table = await prisma.table.findUnique({
            where: { tableNumber: sanitizedTableNumber },
        });
        if (!table) return res.status(404).json({ message: "ไม่พบโต๊ะนี้ในระบบ" });

        const menuPrices = await prisma.menu.findMany({
            where: { id: { in: items.map((item) => item.id) } },
            select: { id: true, price: true },
        });
        if (menuPrices.length !== items.length) {
            return res.status(400).json({ message: "พบเมนูที่ไม่มีอยู่ในระบบ" });
        }

        const priceMap = {};
        menuPrices.forEach((menu) => {
            priceMap[menu.id] = parseFloat(menu.price);
        });

        let totalPrice = 0;
        const orderItems = items.map((item) => {
            const price = priceMap[item.id] || 0;
            totalPrice += price * item.qty;
            return {
                menuId: item.id,
                quantity: item.qty,
                price: new Prisma.Decimal(price),
            };
        });

        // ทำทั้งหมดในทรานแซกชัน: สร้างออเดอร์ → อัปเดตโต๊ะ → upsert การจอง
        const order = await prisma.$transaction(async (tx) => {
            // 1) สร้างออเดอร์
            const created = await tx.order.create({
                data: {
                    user: { connect: { id: req.user.id } },
                    table: { connect: { id: table.id } },
                    paymentMethod: sanitizedMethod,
                    paymentStatus: sanitizedStatus,
                    slipUrl: sanitizedSlipUrl,
                    totalPrice: new Prisma.Decimal(totalPrice),
                    orderItems: { create: orderItems },
                },
                include: { orderItems: true },
            });

            // 2) อัปเดตสถานะโต๊ะ (ถ้ามีฟิลด์ status)
            try {
                await tx.table.update({
                    where: { id: table.id },
                    data: { status: "RESERVED" }, // ปรับค่าตาม enum ของ Table ถ้าชื่อไม่ตรง
                });
            } catch (e) {
                // ไม่มีฟิลด์/enum ไม่ตรง -> ข้ามโดยไม่ให้ทรานแซกชันล้ม
            }

            // 3) สร้าง/อัปเดตการจองให้ไปโผล่หน้า "การจองโต๊ะ"
            await tx.reservation.upsert({
                where: { orderId: created.id }, // orderId เป็น @unique ในสคีมาของคุณ
                update: {
                    tableId: table.id,
                    time: new Date(),      // model Reservation ใช้ฟิลด์ time (DateTime)
                    status: "RESERVED",    // ReservationStatus: PENDING | RESERVED | CONFIRMED | CANCELLED
                    // people: 0,           // ใส่ได้ถ้าต้องการ
                    // userId: req.user.id, // ถ้าต้องการผูกผู้ใช้
                },
                create: {
                    orderId: created.id,
                    tableId: table.id,
                    time: new Date(),
                    status: "RESERVED",
                    // people: 0,
                    // userId: req.user.id,
                },
            });

            return created;
        });

        return res.status(201).json({
            message: "เพิ่มออเดอร์สำเร็จ",
            order,
        });
    } catch (err) {
        console.error("Add Order Error:", { code: err?.code, message: err?.message, meta: err?.meta });
        return res
            .status(500)
            .json({ message: "เกิดข้อผิดพลาดในเซิร์ฟเวอร์", error: err.message });
    }
};

exports.getOrders = async (req, res) => {
    try {
        const rawTableId = req.query.tableId;
        const rawStatus = req.query.status;

        const tableId = rawTableId ? validator.toInt(xss(rawTableId)) : null;
        const status = rawStatus ? xss(rawStatus) : null;

        const whereClause = {};

        if (tableId && !isNaN(tableId)) {
            whereClause.tableId = tableId;
        }

        if (status) {
            whereClause.paymentStatus = status;
        }

        const orders = await prisma.order.findMany({
            where: whereClause,
            include: {
                table: {
                    select: { tableNumber: true }
                },
                user: {
                    select: { id: true, username: true, email: true }
                },
                orderItems: {
                    select: {
                        quantity: true,
                        price: true,
                        menu: {
                            select: {
                                name: true,
                                price: true
                            }
                        }
                    }
                },
            },
            orderBy: { createdAt: 'desc' }
        });

        const ordersWithLabels = orders.map(order => ({
            ...order,
            statusLabel: StatusLabels?.[order.status] || order.status,
        }));

        res.json({
            message: "ดึงข้อมูลออเดอร์สำเร็จ",
            orders: ordersWithLabels,
        });
    } catch (error) {
        console.error("Get Orders Error:", error);
        res.status(500).json({ message: "เกิดข้อผิดพลาดในการดึงข้อมูลออเดอร์" });
    }
}

exports.updateOrderStatus = async (req, res) => {
    try {
        const rawId = req.params.id;
        const rawStatus = req.body.status;
        const rawPaymentMethod = req.body.paymentMethod;
        const rawPaymentStatus = req.body.paymentStatus;

        const id = validator.toInt(xss(rawId));
        const status = rawStatus ? xss(rawStatus) : null;
        const paymentMethod = rawPaymentMethod ? xss(rawPaymentMethod) : null;
        const paymentStatus = rawPaymentStatus ? xss(rawPaymentStatus) : null;

        const dataToUpdate = {};

        if (status) {
            if (!Object.values(OrderStatus).includes(status)) {
                return res.status(400).json({ message: "สถานะคำสั่งซื้อไม่ถูกต้อง" });
            }

            dataToUpdate.status = status;

            if (status === "CANCELLED") {
                dataToUpdate.paymentStatus = "ยกเลิกออเดอร์";
            }
        }

        if (paymentMethod) {
            if (!Object.values(PaymentMethod).includes(paymentMethod)) {
                return res.status(400).json({ message: "ช่องทางการชำระเงินไม่ถูกต้อง" });
            }
            dataToUpdate.paymentMethod = paymentMethod;
        }

        if (paymentStatus && dataToUpdate.status !== "CANCELLED") {
            if (!Object.values(PaymentStatus).includes(paymentStatus)) {
                return res.status(400).json({ message: "สถานะการชำระเงินไม่ถูกต้อง" });
            }
            dataToUpdate.paymentStatus = paymentStatus;
        }

        if (Object.keys(dataToUpdate).length === 0) {
            return res.status(400).json({ message: "ไม่มีข้อมูลสำหรับอัปเดต" });
        }

        const updated = await prisma.order.update({
            where: { id },
            data: dataToUpdate,
        });

        res.status(200).json({ message: "อัปเดตคำสั่งซื้อสำเร็จ", updated });
    } catch (err) {
        console.error("Update Order Error:", err);
        res.status(500).json({ message: "เกิดข้อผิดพลาดในเซิร์ฟเวอร์" });
    }
};

exports.updateOrderDetail = async (req, res) => {
    try {
        const id = validator.toInt(xss(req.params.id));
        const rawItems = req.body.orderItems;

        if (!Array.isArray(rawItems) || rawItems.length === 0) {
            return res.status(400).json({ message: "ข้อมูลไม่ครบ" });
        }

        const items = rawItems.map((item, idx) => {
            const menuIdRaw = xss(item.menuId);
            const menuId = menuIdRaw !== null && menuIdRaw !== undefined && menuIdRaw !== ''
                ? validator.toInt(menuIdRaw)
                : null;

            const qty = validator.toInt(xss(item.qty));
            const price = parseFloat(xss(item.price));
            const name = xss(item.name || "").trim();

            if ((!menuId || menuId <= 0) && name === "") {
                throw { code: 400, message: `แถวที่ ${idx + 1} ไม่มีชื่อเมนู และ menuId ไม่ถูกต้อง` };
            }

            if (!Number.isInteger(qty) || qty <= 0 || Number.isNaN(price) || price < 0) {
                throw { code: 400, message: `แถวที่ ${idx + 1} ข้อมูลจำนวนหรือราคาผิด` };
            }

            return { menuId: menuId > 0 ? menuId : null, name, qty, price };
        });

        const order = await prisma.order.findUnique({ where: { id } });
        if (!order) return res.status(404).json({ message: "ไม่พบคำสั่งซื้อ" });

        const totalPrice = items.reduce((s, it) => s + it.qty * it.price, 0);

        const result = await prisma.$transaction(async (tx) => {
            await tx.orderItem.deleteMany({ where: { orderId: id } });

            const created = await tx.orderItem.createMany({
                data: items.map(it => ({
                    orderId: id,
                    menuId: it.menuId,
                    name: it.name,
                    quantity: it.qty,
                    price: it.price,
                })),
            });

            const updatedOrder = await tx.order.update({
                where: { id },
                data: { totalPrice },
            });

            return { created, updatedOrder };
        });

        res.status(200).json({ message: "อัปเดตเมนูสำเร็จ", ...result });
    } catch (err) {
        if (err?.code === 400) {
            return res.status(400).json({ message: err.message });
        }
        console.error("Update Order Error:", err);
        res.status(500).json({ message: "Server Error" });
    }
};

exports.cancelOrder = async (req, res) => {
    try {
        const id = validator.toInt(xss(req.params.id));

        const order = await prisma.order.findUnique({ where: { id } });

        if (!order) {
            return res.status(404).json({ message: 'ไม่พบออเดอร์นี้' });
        }

        await prisma.order.delete({ where: { id } });

        res.json({ message: 'ยกเลิกออเดอร์สำเร็จ' });
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: 'Server Error' });
    }
}

exports.getUnpaidTableNumbers = async (req, res) => {
    try {
        const orders = await prisma.order.findMany({
            where: {
                paymentStatus: "ยังไม่ชำระเงิน",
                tableId: { not: null },
            },
            select: {
                table: {
                    select: {
                        tableNumber: true,
                    },
                },
            },
        });

        const tableNumbers = orders
            .map(order => order?.table?.tableNumber)
            .filter(num => typeof num !== "undefined" && num !== null);

        res.json({ tables: [...new Set(tableNumbers)] });
    } catch (err) {
        console.error("getUnpaidTableNumbers error:", err);
        res.status(500).json({ error: "เกิดข้อผิดพลาดดึงข้อมูลโต๊ะ" });
    }
}
