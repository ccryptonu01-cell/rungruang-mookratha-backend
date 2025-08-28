const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const dayjs = require("dayjs");
const xss = require("xss");
const validator = require("validator");

// สร้างการจองโต๊ะสำหรับ Guest User (เลือกโต๊ะเองได้)
exports.createGuestReservation = async (req, res) => {
    try {
        // ✅ Sanitize & Validate
        const name = xss(req.body.name?.trim());
        const phone = xss(req.body.phone?.trim());
        const startTime = xss(req.body.startTime);
        const people = parseInt(xss(req.body.people));
        const tableIdsRaw = req.body.tableIds;

        if (!name || !phone || !startTime || !people) {
            return res.status(400).json({ message: "กรุณาระบุชื่อ เบอร์โทร เวลา และจำนวนคน" });
        }

        if (!validator.isMobilePhone(phone, "th-TH")) {
            return res.status(400).json({ message: "เบอร์โทรไม่ถูกต้อง" });
        }

        if (!Array.isArray(tableIdsRaw) || tableIdsRaw.length === 0) {
            return res.status(400).json({ message: "กรุณาเลือกโต๊ะอย่างน้อย 1 โต๊ะ" });
        }

        const tableIds = tableIdsRaw.map(id => parseInt(xss(id)));
        if (tableIds.some(isNaN)) {
            return res.status(400).json({ message: "รหัสโต๊ะไม่ถูกต้อง" });
        }

        const start = dayjs(startTime).toDate();
        const end = dayjs(startTime).add(1, "hour").toDate();

        if (isNaN(start.getTime())) {
            return res.status(400).json({ message: "เวลาไม่ถูกต้อง" });
        }

        // ✅ ตรวจสอบว่าโต๊ะมีอยู่จริง
        const tables = await prisma.table.findMany({
            where: { id: { in: tableIds } },
        });
        if (tables.length !== tableIds.length) {
            return res.status(400).json({ message: "พบโต๊ะบางตัวไม่ถูกต้อง" });
        }

        // ✅ ตรวจสอบการจองซ้อน (±3 ชั่วโมง)
        const threeHoursBefore = dayjs(start).subtract(3, "hour").toDate();
        const threeHoursAfter = dayjs(end).add(3, "hour").toDate();

        const overlapping = await prisma.reservation.findMany({
            where: {
                tableId: { in: tableIds },
                status: "PENDING",
                time: { gte: threeHoursBefore, lt: threeHoursAfter },
            },
            select: { tableId: true },
        });

        if (overlapping.length > 0) {
            const reservedIds = overlapping.map((r) => r.tableId);
            return res.status(400).json({
                message: `โต๊ะต่อไปนี้ถูกจองแล้วในช่วงเวลานี้: ${reservedIds.join(", ")}`,
            });
        }

        // ✅ สร้าง guestUser
        const guestUser = await prisma.guestUser.create({
            data: { name, phone },
        });

        // ✅ สร้างการจองทั้งหมด (transaction)
        const reservations = await prisma.$transaction(
            tableIds.map((tableId) =>
                prisma.reservation.create({
                    data: {
                        guestUserId: guestUser.id,
                        tableId,
                        time: start,
                        status: "PENDING",
                        people,
                    },
                })
            )
        );

        // ✅ อัปเดตสถานะโต๊ะทั้งหมดเป็น RESERVED
        await prisma.table.updateMany({
            where: { id: { in: tableIds } },
            data: { status: "RESERVED" },
        });

        res.status(201).json({ message: "จองโต๊ะสำเร็จ", guestUser, reservations });
    } catch (error) {
        console.error("❌ Guest Reservation Error:", error);
        res.status(500).json({ message: "เกิดข้อผิดพลาดในการจองโต๊ะ" });
    }
};

exports.getGuestReservation = async (req, res) => {
    try {
        const name = xss(req.body.name?.trim());
        const phone = xss(req.body.phone?.trim());

        if (!name || !phone) {
            return res.status(400).json({ message: "กรุณากรอกชื่อและหมายเลขโทรศัพท์" });
        }

        if (!validator.isMobilePhone(phone, "th-TH")) {
            return res.status(400).json({ message: "หมายเลขโทรศัพท์ไม่ถูกต้อง" });
        }

        // ✅ วันที่ปัจจุบัน (ตามเวลาไทย)
        const today = new Date();
        today.setHours(0, 0, 0, 0); // เริ่มต้นวัน

        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1); // สิ้นสุดวัน

        // ✅ ดึง guest users ทั้งหมดจากเบอร์โทร
        const guestUsers = await prisma.guestUser.findMany({
            where: {
                phone,
            },
            include: {
                reservations: {
                    where: {
                        time: {
                            gte: today,
                            lt: tomorrow,
                        },
                    },
                    include: {
                        table: {
                            select: {
                                tableNumber: true,
                                status: true,
                            },
                        },
                    },
                },
            },
        });

        const allReservations = guestUsers.flatMap(user => user.reservations);

        if (guestUsers.length === 0 || allReservations.length === 0) {
            return res.status(404).json({ message: "ไม่พบข้อมูลการจองของวันนี้สำหรับเบอร์นี้" });
        }

        const formattedReservations = allReservations.map(reservation => ({
            reservationId: reservation.id,
            tableId: reservation.tableId,
            tableNumber: reservation.table?.tableNumber ?? "N/A",
            time: reservation.time,
            people: reservation.people,
            status:
                reservation.table?.status === "AVAILABLE" ? "COMPLETED" : reservation.status,
        }));

        res.json({
            message: "รายการจองของวันนี้",
            guestName: name,
            phone,
            reservations: formattedReservations,
        });

    } catch (error) {
        console.error("Get Guest Reservation Error:", error);
        res.status(500).json({ message: "เกิดข้อผิดพลาดในการดึงข้อมูลการจอง" });
    }
};

// ยกเลิกการจองโต๊ะสำหรับ Guest User
exports.cancelGuestReservation = async (req, res) => {
    try {
        const idParam = req.params.id;

        // ✅ sanitize และตรวจสอบว่าเป็นเลขจำนวนเต็มบวก
        if (!validator.isInt(idParam, { min: 1 })) {
            return res.status(400).json({ message: "รหัสการจองไม่ถูกต้อง" });
        }

        const reservationId = parseInt(idParam, 10);

        // ✅ ค้นหา reservation
        const reservation = await prisma.reservation.findUnique({
            where: { id: reservationId },
        });

        if (!reservation) {
            return res.status(404).json({ message: "ไม่พบรายการจองนี้" });
        }

        if (reservation.status === "CANCELLED") {
            return res.status(400).json({ message: "รายการนี้ถูกยกเลิกไปแล้ว" });
        }

        // ✅ อัปเดตสถานะการจอง
        await prisma.reservation.update({
            where: { id: reservationId },
            data: { status: "CANCELLED" },
        });

        // ✅ อัปเดตสถานะโต๊ะเป็น AVAILABLE
        await prisma.table.update({
            where: { id: reservation.tableId },
            data: { status: "AVAILABLE" },
        });

        res.json({
            message: "ยกเลิกการจองสำเร็จแล้ว",
            reservationId,
            tableId: reservation.tableId,
            status: "CANCELLED",
        });

    } catch (error) {
        console.error("❌ Cancel Guest Reservation Error:", error);
        res.status(500).json({ message: "เกิดข้อผิดพลาดในการยกเลิกการจอง" });
    }
};

exports.getTablesWithReservations = async (req, res) => {
    const rawDate = req.query.date;
    const rawTime = req.query.time;

    // ✅ ตรวจสอบว่า date และ time ถูกส่งมาและอยู่ในรูปแบบที่ถูกต้อง
    if (!rawDate || !rawTime) {
        return res.status(400).json({ message: "กรุณาระบุ date และ time" });
    }

    // ✅ validate รูปแบบวันที่: YYYY-MM-DD
    if (!validator.isISO8601(rawDate, { strict: true })) {
        return res.status(400).json({ message: "รูปแบบวันที่ไม่ถูกต้อง (ต้องเป็น YYYY-MM-DD)" });
    }

    // ✅ validate รูปแบบเวลา: HH:mm
    if (!validator.matches(rawTime, /^([01]\d|2[0-3]):[0-5]\d$/)) {
        return res.status(400).json({ message: "รูปแบบเวลาไม่ถูกต้อง (ต้องเป็น HH:mm)" });
    }

    const startTime = new Date(`${rawDate}T${rawTime}:00+07:00`);
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

    try {
        const tables = await prisma.table.findMany({
            include: {
                reservations: {
                    where: {
                        status: {
                            in: ["PENDING", "CONFIRMED"],
                        },
                        time: {
                            lt: endTime,
                        },
                    },
                },
            },
        });

        res.json({ tables });
    } catch (error) {
        console.error("❌ Error loading tables:", error);
        res.status(500).json({ message: "เกิดข้อผิดพลาดในการโหลดโต๊ะ" });
    }
};

exports.getAllMenus = async (req, res) => {
    try {
        const menus = await prisma.menu.findMany();

        if (!Array.isArray(menus) || menus.length === 0) {
            return res.status(404).json({ message: 'ไม่มีเมนูในระบบ' });
        }

        res.status(200).json({ message: 'รายการเมนู', menus });

    } catch (err) {
        console.error('ListMenu Error:', err);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.getAllCategories = async (req, res) => {
    try {
        const categories = await prisma.category.findMany({
            orderBy: { id: 'asc' }
        });

        if (!Array.isArray(categories)) {
            return res.status(500).json({ message: "ข้อมูลหมวดหมู่ผิดรูปแบบ" });
        }

        res.status(200).json({ categories });
    } catch (err) {
        console.error("เกิดข้อผิดพลาดในการดึงหมวดหมู่:", err);
        res.status(500).json({ message: "ไม่สามารถดึงหมวดหมู่ได้" });
    }
};
