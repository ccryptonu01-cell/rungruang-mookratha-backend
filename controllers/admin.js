const prisma = require('../config/prisma')
const { notifyAdminAndCashier } = require("../utils/notification")
const dayjs = require("dayjs")
const bcrypt = require("bcrypt");
const { ReservationStatus } = require('@prisma/client');
const xss = require("xss");
const validator = require("validator");

// User (Admin)
exports.listUsers = async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                username: true,
                email: true,
                role: true,
                enabled: true,
                createdAt: true
            }
        });

        res.status(200).json({
            message: "รายการสมาชิกทั้งหมด",
            users
        });
    } catch (err) {
        console.error('List Users Error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
}

exports.getUserById = async (req, res) => {
    try {
        const rawId = req.params.id;

        if (!rawId || !validator.isInt(rawId, { min: 1 })) {
            return res.status(400).json({ message: 'กรุณาระบุ ID ของผู้ใช้ให้ถูกต้อง (เป็นตัวเลขจำนวนเต็ม)' });
        }

        const id = parseInt(xss(rawId));

        const user = await prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                username: true,
                email: true,
                role: true,
                enabled: true,
                createdAt: true
            }
        });

        if (!user) {
            return res.status(404).json({ message: 'ไม่พบผู้ใช้ในระบบ' });
        }

        res.status(200).json({
            message: "ข้อมูลผู้ใช้",
            user
        });
    } catch (err) {
        console.error('Get User By ID Error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params

        if (!id) {
            return res.status(400).json({ message: 'กรุณาระบุ ID ของผู้ใช้ที่ต้องการลบ' })
        }

        const existingUser = await prisma.user.findUnique({
            where: { id: parseInt(id) }
        })

        if (!existingUser) {
            return res.status(404).json({ message: 'ไม่พบผู้ใช้ในระบบ' })
        }

        await prisma.user.delete({
            where: { id: parseInt(id) }
        })

        res.status(200).json({
            message: 'ลบผู้ใช้สำเร็จ'
        })

    } catch (err) {
        console.error('Delete User Error:', err);
        res.status(500).json({ message: 'Server Error' })
    }
}

exports.updateUserRole = async (req, res) => {
    try {
        const rawId = req.params.id;
        const rawRole = req.body.role;

        if (!rawId || !rawRole) {
            return res.status(400).json({ message: 'กรุณาระบุ ID ของผู้ใช้และ Role ที่ต้องการอัปเดต' });
        }

        if (!validator.isInt(rawId, { min: 1 })) {
            return res.status(400).json({ message: 'ID ของผู้ใช้ไม่ถูกต้อง (ต้องเป็นตัวเลขจำนวนเต็ม)' });
        }

        const id = parseInt(xss(rawId));
        const role = xss(rawRole).toUpperCase();

        const validRoles = ['USER', 'ADMIN', 'CASHIER'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ message: 'Role ไม่ถูกต้อง (ต้องเป็น USER, ADMIN หรือ CASHIER)' });
        }

        const existingUser = await prisma.user.findUnique({
            where: { id }
        });

        if (!existingUser) {
            return res.status(404).json({ message: 'ไม่พบผู้ใช้ในระบบ' });
        }

        const updatedUser = await prisma.user.update({
            where: { id },
            data: { role }
        });

        res.status(200).json({
            message: 'อัปเดต Role สำเร็จ',
            updatedUser
        });

    } catch (err) {
        console.error('Update User Role Error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
};

// Reservation (Admin)
exports.listReservations = async (req, res) => {
    try {
        const reservations = await prisma.reservation.findMany({
            include: {
                user: true,
                guestUser: true,
                table: true
            },
        });

        res.json(reservations);
    } catch (err) {
        console.error("❌ listReservations error:", err);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.updateReservation = async (req, res) => {
    try {
        const { tableNumber, status } = req.body;

        const table = await prisma.table.findUnique({
            where: { tableNumber: parseInt(tableNumber, 10) },
            include: { reservations: true },
        });

        if (!table) {
            return res.status(404).json({ message: "ไม่พบหมายเลขโต๊ะนี้" });
        }

        // อัปเดตสถานะโต๊ะ
        const updatedTable = await prisma.table.update({
            where: { tableNumber: parseInt(tableNumber, 10) },
            data: { status },
        });

        // ถ้าเปลี่ยนเป็น AVAILABLE → เปลี่ยนสถานะการจองเป็น COMPLETED
        if (status === "AVAILABLE") {
            await prisma.reservation.updateMany({
                where: {
                    tableId: table.id,
                    status: { in: [ReservationStatus.PENDING, ReservationStatus.RESERVED] },
                },
                data: { status: ReservationStatus.COMPLETED },
            });
        }

        res.json({ message: "อัปเดตสถานะโต๊ะสำเร็จ", updatedTable });
    } catch (err) {
        console.error("❌ Update Table Status Error:", err);
        res.status(500).json({ message: "Server Error", error: err.message });
    }
};

exports.cancelReservation = async (req, res) => {
    try {
        const rawTableNumber = req.body.tableNumber;

        if (!rawTableNumber || !validator.isInt(rawTableNumber.toString(), { min: 1 })) {
            return res.status(400).json({ message: "หมายเลขโต๊ะไม่ถูกต้อง" });
        }

        const tableNumber = parseInt(xss(rawTableNumber));

        const reservation = await prisma.reservation.findFirst({
            where: { table: { tableNumber } },
            include: { order: true }
        });

        if (!reservation) {
            return res.status(404).json({ message: "ไม่พบการจองของโต๊ะนี้" });
        }

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

// ฟังก์ชันอัปเดตสถานะการชำระเงิน
exports.AdmingetOrderStatus = async (req, res) => {
    try {
        const { orderId } = req.params;

        // ตรวจสอบว่ามี orderId หรือไม่ และเป็นตัวเลข
        if (!orderId || isNaN(orderId)) {
            return res.status(400).json({ message: "กรุณาระบุ orderId ที่ถูกต้อง" });
        }

        const userId = req.user.id;
        const userRole = req.user.role;

        const order = await prisma.order.findUnique({
            where: { id: parseInt(orderId, 10) },
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

        // ตรวจสอบสิทธิ์
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
}

exports.updatePaymentStatus = async (req, res) => {
    try {
        const { orderId, paymentMethod } = req.body

        // ตรวจสอบว่า `paymentMethod` ถูกต้องหรือไม่
        const validPaymentMethods = ["CASH", "QR_CODE", "PROMPTPAY"]
        if (!validPaymentMethods.includes(paymentMethod)) {
            return res.status(400).json({ message: "วิธีการชำระเงินไม่ถูกต้อง" })
        }

        // ค้นหาออเดอร์
        const order = await prisma.order.findUnique({ where: { id: orderId } })
        if (!order) {
            return res.status(404).json({ message: "ไม่พบออเดอร์นี้" })
        }

        // อัปเดตสถานะเป็น PAID และบันทึก `paymentMethod`
        const updatedOrder = await prisma.order.update({
            where: { id: orderId },
            data: {
                paymentStatus: "PAID",
                paymentMethod: paymentMethod
            }
        })

        // บันทึกลงประวัติ OrderHistory
        await prisma.orderHistory.create({
            data: {
                userId: order.userId,
                orderId: order.id,
                tableId: order.tableId,
                totalPrice: order.totalPrice,
                date: new Date(),
                year: new Date().getFullYear(),
                month: new Date().getMonth() + 1,
                day: new Date().getDate(),
                paymentStatus: "PAID",
                paymentMethod: paymentMethod
            }
        })

        // แจ้งเตือน Admin และ Cashier
        notifyAdminAndCashier(`🔔 ออเดอร์ #${updatedOrder.id} ได้รับการชำระเงินแล้วผ่าน ${paymentMethod} ✅`)

        res.json({ message: "ชำระเงินสำเร็จ", order: updatedOrder })

    } catch (error) {
        console.error("Payment Update Error:", error)
        res.status(500).json({ message: "เกิดข้อผิดพลาดในการอัปเดตสถานะการชำระเงิน" })
    }
}

// History
exports.getOrderHistory = async (req, res) => {
    try {
        const { userId, year, month, day } = req.query

        let filter = {}

        if (userId) {
            filter.userId = parseInt(userId)
        }
        if (year) {
            filter.year = parseInt(year)
        }
        if (month) {
            filter.month = parseInt(month)
        }
        if (day) {
            filter.day = parseInt(day)
        }

        // ดึงข้อมูลประวัติการสั่งซื้อพร้อมข้อมูลโต๊ะ
        const orderHistory = await prisma.orderHistory.findMany({
            where: filter,
            include: {
                user: {
                    select: { id: true, username: true, email: true }
                },
                order: {
                    select: { totalPrice: true, paymentStatus: true, createdAt: true }
                },
                table: {
                    select: { id: true, tableNumber: true, status: true }
                }
            },
            orderBy: { date: "desc" }
        })

        res.json({
            message: "ดึงข้อมูลประวัติการสั่งซื้อสำเร็จ",
            data: orderHistory
        })

    } catch (error) {
        console.error("Get Order History Error:", error)
        res.status(500).json({ message: "เกิดข้อผิดพลาดในการดึงประวัติการสั่งซื้อ" })
    }
}

exports.deleteOrderHistory = async (req, res) => {
    try {
        const { orderHistoryId } = req.params;

        // ตรวจสอบว่ามีประวัติอยู่หรือไม่
        const orderHistory = await prisma.orderHistory.findUnique({
            where: { id: parseInt(orderHistoryId) }
        });

        if (!orderHistory) {
            return res.status(404).json({ message: "ไม่พบประวัติการสั่งซื้อนี้" });
        }

        // ลบข้อมูล OrderHistory
        await prisma.orderHistory.delete({
            where: { id: parseInt(orderHistoryId) }
        });

        res.json({ message: "ลบประวัติการสั่งซื้อสำเร็จ" });

    } catch (error) {
        console.error("Delete Order History Error:", error);
        res.status(500).json({ message: "เกิดข้อผิดพลาดในการลบประวัติการสั่งซื้อ" });
    }
}

exports.getOrderSummary7Days = async (req, res) => {
    try {
        const { start, end } = req.query;

        let startDate = start ? dayjs(start).startOf("day") : dayjs().subtract(6, "day").startOf("day");
        let endDate = end ? dayjs(end).endOf("day") : dayjs().endOf("day");

        const result = [];
        const days = endDate.diff(startDate, "day") + 1;

        for (let i = 0; i < days; i++) {
            const date = startDate.add(i, "day");
            const nextDate = date.add(1, "day");

            const orders = await prisma.order.findMany({
                where: {
                    createdAt: {
                        gte: date.toDate(),
                        lt: nextDate.toDate(),
                    },
                },
            });

            const paidOrders = orders.filter((o) => o.paymentStatus === "ชำระเงินแล้ว");
            const total = paidOrders.reduce((sum, o) => sum + Number(o.totalPrice || 0), 0);

            result.push({
                date: date.format("YYYY-MM-DD"),
                total,
                paid: paidOrders.length,
                orders: orders.length,
            });
        }

        res.json({ summary: result });
    } catch (err) {
        console.error("summary-7-days error:", err);
        res.status(500).json({ message: "เกิดข้อผิดพลาดในการดึงข้อมูลสรุป 7 วันย้อนหลัง" });
    }
}

exports.getOrderSummaryByMonth = async (req, res) => {
    try {
        const { year, month } = req.query;

        if (!year || !month) {
            return res.status(400).json({ message: "กรุณาระบุ year และ month" });
        }

        const startDate = dayjs(`${year}-${month}-01`).startOf("month").toDate();
        const endDate = dayjs(startDate).endOf("month").toDate();

        const orders = await prisma.order.findMany({
            where: {
                createdAt: {
                    gte: startDate,
                    lte: endDate,
                },
            },
        });

        const paidOrders = orders.filter((o) => o.paymentStatus === "ชำระเงินแล้ว");
        const total = paidOrders.reduce((sum, o) => sum + Number(o.totalPrice || 0), 0);

        res.json({
            summary: {
                year,
                month,
                total,
                paid: paidOrders.length,
                orders: orders.length,
            },
        });
    } catch (err) {
        console.error("getOrderSummaryByMonth error:", err);
        res.status(500).json({ message: "เกิดข้อผิดพลาดในการดึงข้อมูลรายเดือน" });
    }
}

exports.changeUserPassword = async (req, res) => {
    const rawId = req.params.id;
    const rawPassword = req.body.password;
    
    if (!rawId || !validator.isInt(rawId.toString(), { min: 1 })) {
        return res.status(400).json({ message: "ID ไม่ถูกต้อง" });
    }

    if (!rawPassword || typeof rawPassword !== "string" || rawPassword.length < 8) {
        return res.status(400).json({ message: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร" });
    }

    const userId = parseInt(xss(rawId));
    const password = xss(rawPassword); // ป้องกัน XSS

    try {
        const requester = req.user; // จาก verifyToken

        if (requester.role !== "ADMIN" && requester.id !== userId) {
            return res.status(403).json({ message: "ไม่มีสิทธิ์เปลี่ยนรหัสผ่านผู้อื่น" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword },
        });

        res.json({ message: "เปลี่ยนรหัสผ่านสำเร็จ" });
    } catch (err) {
        console.error("เปลี่ยนรหัสผ่านล้มเหลว:", err);
        res.status(500).json({ message: "เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน" });
    }
};
