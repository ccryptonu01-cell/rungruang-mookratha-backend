import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function clearDatabase() {
    try {
        await prisma.$executeRaw`SET FOREIGN_KEY_CHECKS=0;`;

        await prisma.orderItem.deleteMany({});
        await prisma.orderHistory.deleteMany({});
        await prisma.cart.deleteMany({});
        await prisma.order.deleteMany({});
        await prisma.reservation.deleteMany({});
        await prisma.table.deleteMany({});
        await prisma.guestUser.deleteMany({});
        await prisma.user.deleteMany({});
        await prisma.inventory.deleteMany({});
        await prisma.menu.deleteMany({});
        await prisma.category.deleteMany({});

        await prisma.$executeRaw`SET FOREIGN_KEY_CHECKS=1;`;

        console.log("✅ ล้างข้อมูลทุกตารางในฐานข้อมูลเรียบร้อยแล้ว!");
    } catch (error) {
        console.error("❌ เกิดข้อผิดพลาด:", error);
    } finally {
        await prisma.$disconnect();
    }
}

clearDatabase();
