require('dotenv').config({ path: '.env.production' });

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function resetDatabase() {
  try {
    // ลบตารางลูกก่อน พ่อทีหลัง
    await prisma.tokenBlacklist.deleteMany();
    await prisma.cart.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.orderHistory.deleteMany();
    await prisma.order.deleteMany();
    await prisma.reservation.deleteMany();
    await prisma.menu.deleteMany();
    await prisma.category.deleteMany();
    await prisma.table.deleteMany();
    await prisma.inventory.deleteMany();
    await prisma.guestUser.deleteMany();
    await prisma.user.deleteMany();

    console.log('✅ ล้างข้อมูลในฐานข้อมูลเรียบร้อยแล้ว');
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการล้างฐานข้อมูล:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetDatabase();
