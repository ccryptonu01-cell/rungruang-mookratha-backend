const path = require('path');
const PDFDocument = require('pdfkit');
const prisma = require('../config/prisma');
const xss = require('xss');
const validator = require('validator');

exports.generateReceipt = async (req, res) => {
    const rawId = xss(req.params.id);
    const orderId = parseInt(rawId, 10);

    if (!validator.isInt(rawId)) {
        return res.status(400).send("รหัสออเดอร์ไม่ถูกต้อง");
    }

    try {
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: {
                table: true,
                orderItems: {
                    include: { menu: true }
                }
            }
        });

        if (!order) return res.status(404).send("ไม่พบคำสั่งซื้อ");

        const doc = new PDFDocument();

        doc.registerFont('Sarabun', path.join(__dirname, '../fonts/Sarabun/Sarabun-Regular.ttf'));
        doc.font('Sarabun');

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename=receipt-${orderId}.pdf`);

        doc.fontSize(20).text('ใบเสร็จรับเงิน', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`เลขที่ออเดอร์: ${order.id}`);
        doc.text(`โต๊ะ: ${order.table.tableNumber}`);
        doc.text(`สถานะ: ${order.status}`);
        doc.text(`วันเวลา: ${new Date(order.createdAt).toLocaleString('th-TH')}`);
        doc.moveDown();

        doc.fontSize(14).text('รายการอาหาร');
        doc.moveDown(0.5);

        order.orderItems.forEach(item => {
            const name = item.menu.name;
            const qty = item.quantity;
            const price = item.price;
            const total = price * qty;
            doc.fontSize(12).text(`${name} x ${qty} = ${total} บาท`);
        });

        doc.moveDown();
        doc.fontSize(14).text(`รวมทั้งหมด: ${order.totalPrice} บาท`, { align: 'right' });

        doc.end();
        doc.pipe(res);
    } catch (err) {
        console.error("PDF error:", err);
        res.status(500).send("เกิดข้อผิดพลาดในการสร้างใบเสร็จ");
    }
};
