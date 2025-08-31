const prisma = require('../config/prisma');
const dayjs = require('dayjs');
const utc = require("dayjs/plugin/utc");
const xss = require('xss');
const validator = require('validator');
dayjs.extend(utc);

exports.getTables = async (req, res) => {
    try {
        const { selectedTime } = req.query;

        console.log("🔍 (Query) selectedTime (raw):", selectedTime);

        let whereReservation = {
            status: { not: "CANCELLED" },
        };

        if (selectedTime) {
            const cleanTime = xss(selectedTime.trim());
            console.log("✅ (Sanitized) selectedTime:", cleanTime);

            const parsedDate = dayjs.utc(cleanTime);
            console.log("🧪 (Parsed) isValid:", parsedDate.isValid());

            if (!parsedDate.isValid()) {
                console.error("❌ parsedDate ไม่ถูกต้อง:", parsedDate.format());
                return res.status(400).json({ message: "เวลาไม่ถูกต้อง" });
            }

            const selected = parsedDate.toDate();
            const before = new Date(selected.getTime() - 3 * 60 * 60 * 1000);
            const after = new Date(selected.getTime() + 3 * 60 * 60 * 1000);

            console.log("🕐 Time Window:");
            console.log("   → selected:", selected.toISOString());
            console.log("   → before:", before.toISOString());
            console.log("   → after:", after.toISOString());

            whereReservation = {
                ...whereReservation,
                time: {
                    gte: before,
                    lt: after,
                },
            };
        } else {
            console.warn("⚠️ ไม่มี selectedTime ส่งมาจาก frontend");
        }

        const tables = await prisma.table.findMany({
            select: {
                id: true,
                tableNumber: true,
                status: true,
                reservations: {
                    where: whereReservation,
                    select: {
                        time: true,
                        status: true,
                    },
                },
            },
        });

        console.log(`✅ ส่งกลับโต๊ะทั้งหมด ${tables.length} รายการ`);

        res.status(200).json({ message: "รายการโต๊ะทั้งหมด", tables });

    } catch (error) {
        console.error("❌ [getTables] Server Error:", error);
        res.status(500).json({ message: "Server Error" });
    }
};

exports.getTableByNumber = async (req, res) => {
    try {
        const rawNumber = xss(req.params.number);
        const number = validator.toInt(rawNumber);

        console.log("🔍 รับ param โต๊ะ:", rawNumber, "→ แปลงเป็นเลข:", number);

        if (isNaN(number)) {
            console.warn("❌ หมายเลขโต๊ะไม่ใช่ตัวเลข:", rawNumber);
            return res.status(400).json({ message: "หมายเลขโต๊ะไม่ถูกต้อง" });
        }

        const table = await prisma.table.findUnique({
            where: { tableNumber: number },
            select: { id: true, tableNumber: true },
        });

        if (!table) {
            console.warn("❌ ไม่พบโต๊ะหมายเลข:", number);
            return res.status(404).json({ message: "ไม่พบโต๊ะนี้" });
        }

        console.log("✅ พบโต๊ะ:", table);

        res.json({ tableId: table.id, tableNumber: table.tableNumber });
    } catch (error) {
        console.error("❌ [getTableByNumber] Server Error:", error);
        res.status(500).json({ message: "เกิดข้อผิดพลาดในการค้นหาโต๊ะ" });
    }
};
