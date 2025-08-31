require('dotenv').config({ path: '.env.production' });
const { PrismaClient, TableStatus } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const tables = [];

    for (let i = 1; i <= 30; i++) {
        tables.push({
            tableNumber: i,
            status: TableStatus.AVAILABLE, // ✅ ใส่ enum ที่ import มา
        });
    }

    await prisma.table.createMany({
        data: tables,
        skipDuplicates: true,
    });

    console.log("✅ โต๊ะทั้งหมด 30 โต๊ะถูกเพิ่มเรียบร้อยแล้ว!");
}

main()
    .catch((error) => {
        console.error("❌ Error Seeding Tables:", error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
