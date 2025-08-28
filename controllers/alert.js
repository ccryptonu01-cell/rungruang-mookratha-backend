const prisma = require('../config/prisma')

exports.getUnpaidOrders = async (req, res) => {
    try {
        const unpaidOrders = await prisma.order.findMany({
            where: {
                paymentStatus: { not: "ชำระเงินแล้ว" },
            },
            orderBy: { createdAt: "desc" },
        });

        res.json({ orders: unpaidOrders });
    } catch (err) {
        console.error("getUnpaidOrders error:", err);
        res.status(500).json({ error: "ไม่สามารถดึงออเดอร์ที่ยังไม่ชำระเงินได้" });
    }
};
