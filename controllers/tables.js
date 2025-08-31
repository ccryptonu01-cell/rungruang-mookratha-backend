const prisma = require('../config/prisma');
const dayjs = require('dayjs');
const xss = require('xss');
const validator = require('validator');

exports.getTables = async (req, res) => {
    try {
        const { selectedTime } = req.query;

        let whereReservation = {
            status: { not: "CANCELLED" },
        };

        if (selectedTime) {
            const cleanTime = xss(selectedTime.trim());

            const parsedDate = new Date(cleanTime);
            if (isNaN(parsedDate.getTime())) {
                return res.status(400).json({ message: "เวลาไม่ถูกต้อง" });
            }

            const selected = new Date(cleanTime);
            const before = new Date(selected.getTime() - 3 * 60 * 60 * 1000);
            const after = new Date(selected.getTime() + 3 * 60 * 60 * 1000);

            whereReservation = {
                ...whereReservation,
                time: {
                    gte: before,
                    lt: after,
                },
            };
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

        res.status(200).json({ message: "รายการโต๊ะทั้งหมด", tables });

    } catch (error) {
        console.error("❌ Get Tables Error:", error);
        res.status(500).json({ message: "Server Error" });
    }
};

exports.getTableByNumber = async (req, res) => {
    try {
        const rawNumber = xss(req.params.number);
        const number = validator.toInt(rawNumber);

        if (isNaN(number)) {
            return res.status(400).json({ message: "หมายเลขโต๊ะไม่ถูกต้อง" });
        }

        const table = await prisma.table.findUnique({
            where: { tableNumber: number },
            select: { id: true, tableNumber: true },
        });

        if (!table) {
            return res.status(404).json({ message: "ไม่พบโต๊ะนี้" });
        }

        res.json({ tableId: table.id, tableNumber: table.tableNumber });
    } catch (error) {
        console.error("Get Table By Number Error:", error);
        res.status(500).json({ message: "เกิดข้อผิดพลาดในการค้นหาโต๊ะ" });
    }
};