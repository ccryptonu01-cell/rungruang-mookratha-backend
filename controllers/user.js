const { PrismaClient, Prisma } = require('@prisma/client')
const prisma = new PrismaClient()
const QRCode = require('qrcode')
const promptpay = require('promptpay-qr');
const dayjs = require("dayjs");
const bcrypt = require('bcrypt');
const xss = require("xss");
const validator = require("validator");

//User Profile
exports.getProfile = async (req, res) => {
    try {
        const userId = req.user.id

        // ค้นหาข้อมูลผู้ใช้
        const user = await prisma.user.findUnique({
            where: { id: parseInt(userId) },
            select: {
                id: true,
                username: true,
                email: true,
                phone: true,
                password: true,
                createdAt: true
            }
        })

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const maskedPassword = user.password.substring(0, 3) + '*'.repeat(user.password.length - 3)

        res.json({
            id: user.id,
            username: user.username,
            email: user.email,
            phone: user.phone,
            password: maskedPassword,
            createdAt: user.createdAt
        })

    } catch (err) {
        console.log(err)
        res.status(500).json({ message: 'Server Error' })
    }
}

exports.updateProfile = async (req, res) => {
    try {
        const sanitizedUsername = validator.escape(xss(username || user.username));
        const sanitizedEmail = validator.normalizeEmail(xss(email || user.email));
        const sanitizedPhone = validator.blacklist(xss(phone || user.phone), '\\D'); // ลบ non-digit

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                username: true,
                email: true,
                phone: true,
                password: true,
                updatedAt: true
            }
        });

        if (!user) {
            return res.status(404).json({ message: "ไม่พบข้อมูลผู้ใช้" });
        }

        // เตรียมข้อมูลที่จะอัปเดต
        const updatedData = {
            username: sanitizedUsername,
            email: sanitizedEmail,
            phone: sanitizedPhone
        };


        // ถ้า user กรอกรหัสใหม่มา → hash ก่อนบันทึก
        if (password && password.trim() !== '') {
            if (password.trim().length < 6) {
                return res.status(400).json({ message: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษรขึ้นไป" });
            }
            updatedData.password = await bcrypt.hash(password.trim(), 10);
        }

        // อัปเดตข้อมูล
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: updatedData
        });

        // log ค่าที่ได้มา (เพื่อ debug)
        console.log('Update Profile:');
        console.log('password:', password);
        console.log('username:', username);
        console.log('email:', email);
        console.log('phone:', phone);

        // ตอบกลับ
        res.json({
            message: "อัปเดตโปรไฟล์สำเร็จ",
            user: {
                id: updatedUser.id,
                username: updatedUser.username,
                email: updatedUser.email,
                phone: updatedUser.phone,
                updatedAt: updatedUser.updatedAt
            }
        });

    } catch (err) {
        console.error("Update Profile Error:", err);
        res.status(500).json({ message: "Server Error" });
    }
};


exports.deleteProfile = async (req, res) => {
    try {
        const userId = req.user.id

        const user = await prisma.user.findUnique({
            where: { id: userId }
        })

        if (!user) {
            return res.status(404).json({ message: 'ไม่พบผู้ใช้' })
        }

        await prisma.user.delete({
            where: { id: userId }
        })

        res.json({ message: 'บัญชีถูกลบเรียบร้อยแล้ว' })
    } catch (err) {
        console.log(err)
        res.status(500).json({ message: 'Server Error' })
    }
}

// Shopping Cart
exports.addToCart = async (req, res) => {
    try {
        const userId = req.user.id;

        const { menuId, tableId, quantity } = req.body;

        const sanitizedMenuId = validator.toInt(xss(menuId));
        const sanitizedTableId = validator.toInt(xss(tableId));
        const sanitizedQty = validator.toInt(xss(quantity));

        if (!sanitizedMenuId || !sanitizedTableId || sanitizedQty < 1) {
            return res.status(400).json({ message: 'ข้อมูลไม่ถูกต้อง' });
        }

        const menu = await prisma.menu.findUnique({
            where: { id: sanitizedMenuId }
        });

        if (!menu) {
            return res.status(404).json({ message: 'ไม่พบเมนูนี้' });
        }

        const table = await prisma.table.findUnique({
            where: { id: sanitizedTableId }
        });

        if (!table) {
            return res.status(404).json({ message: 'ไม่พบโต๊ะนี้' });
        }

        const existingCartItem = await prisma.cart.findFirst({
            where: {
                userId,
                menuId: sanitizedMenuId,
                tableId: sanitizedTableId
            }
        });

        let cartItem;

        if (existingCartItem) {
            // อัปเดตจำนวน
            const newQty = existingCartItem.quantity + sanitizedQty;
            cartItem = await prisma.cart.update({
                where: { id: existingCartItem.id },
                data: {
                    quantity: newQty,
                    total: new Prisma.Decimal(newQty * menu.price)
                }
            });
        } else {
            // สร้างใหม่
            cartItem = await prisma.cart.create({
                data: {
                    userId,
                    tableId: sanitizedTableId,
                    menuId: sanitizedMenuId,
                    quantity: sanitizedQty,
                    price: new Prisma.Decimal(menu.price),
                    total: new Prisma.Decimal(sanitizedQty * menu.price)
                }
            });
        }

        res.json({ message: 'เพิ่มเข้าตะกร้าสำเร็จแล้ว', cartItem });

    } catch (err) {
        console.log(err);
        res.status(500).json({ message: 'Server Error' });
    }
};

exports.getCart = async (req, res) => {
    try {
        const { userId } = req.params

        const cartItems = await prisma.cart.findMany({
            where: { userId: parseInt(userId) },
            include: {
                menu: true
            }
        })

        if (cartItems.length === 0) {
            return res.json({ message: 'ตะกร้าว่างเปล่า', cart: [] })
        }

        res.json({ message: 'รายการอาหารของท่าน', cart: cartItems })

    } catch (err) {
        console.log(err)
        res.status(500).json({ message: 'Server Error' })
    }
}

exports.updateCart = async (req, res) => {
    try {
        const { cartId } = req.params
        let { quantity } = req.body

        const cartItem = await prisma.cart.findUnique({
            where: { id: parseInt(cartId) },
            include: { menu: true }
        })

        if (!cartItem) {
            return res.status(404).json({ message: 'ไม่พบเมนูในตะกร้า' })
        }

        if (quantity < 1) {
            quantity = 1
        }

        const updatedTotal = new Prisma.Decimal(cartItem.menu.price * quantity)

        const updatedCart = await prisma.cart.update({
            where: { id: parseInt(cartId) },
            data: {
                quantity,
                total: updatedTotal
            }
        })

        res.json({ message: 'Cart updated successfully', cart: updatedCart })

    } catch (err) {
        console.log(err)
        res.status(500).json({ message: 'Server Error' })
    }
}

exports.removeFromCart = async (req, res) => {
    try {
        const { menuId } = req.params
        const { userId } = req.body

        const cartItem = await prisma.cart.findFirst({
            where: {
                menuId: parseInt(menuId),
                userId: parseInt(userId)
            }
        })

        if (!cartItem) {
            return res.status(404).json({ message: 'ไม่พบเมนูในตะกร้า' })
        }

        await prisma.cart.delete({
            where: { id: cartItem.id }
        })

        res.json({ message: 'ลบเมนูสำเร็จ' })

    } catch (err) {
        console.log(err);
        res.status(500).json({ message: 'Server Error' })
    }
}

// Orders
exports.createOrder = async (req, res) => {
    try {
        const userId = req.user.id
        const { tableId } = req.body
        const phoneNumber = "0956648993"

        let table = null
        let reservedTables = []

        if (tableId) {
            table = await prisma.table.findUnique({ where: { id: tableId } })
            if (!table) {
                return res.status(400).json({ message: "ไม่พบหมายเลขโต๊ะนี้" })
            }

            // ดึงรายการโต๊ะที่ถูกจองโดยผู้ใช้ที่ล็อกอินอยู่เท่านั้น
            reservedTables = await prisma.reservation.findMany({
                where: {
                    userId: userId,
                    status: "PENDING"
                },
                select: { table: { select: { id: true, tableNumber: true } } }
            })

            // แปลงข้อมูลให้อยู่ในรูปของรายการหมายเลขโต๊ะ
            reservedTables = reservedTables.map(reservation => ({
                id: reservation.table.id,
                tableNumber: reservation.table.tableNumber
            }))
        }

        // ดึงรายการสินค้าในตะกร้า พร้อมรายละเอียดเมนู
        const cartItems = await prisma.cart.findMany({
            where: { userId },
            include: {
                menu: { select: { id: true, name: true, price: true } }
            }
        })

        if (!cartItems || cartItems.length === 0) {
            return res.status(400).json({ message: "ตะกร้าว่างเปล่า" })
        }

        // คำนวณราคารวม
        let totalPrice = cartItems.reduce((total, item) => total + (parseFloat(item.menu.price) * item.quantity), 0)
        totalPrice = Number(totalPrice.toFixed(2));

        if (isNaN(totalPrice) || totalPrice <= 0) {
            return res.status(400).json({ message: "ยอดรวมไม่ถูกต้อง" })
        }

        // จัดรูปแบบข้อมูลเมนูในตะกร้าให้แสดงใน response
        const orderedItems = cartItems.map(item => ({
            menuId: item.menu.id,
            name: item.menu.name,
            quantity: item.quantity,
            unitPrice: item.menu.price,
            total: (item.menu.price * item.quantity).toFixed(2)
        }))

        // สร้าง QR Code สำหรับ PromptPay
        let qrCodeImage = null;
        try {
            const qrCodeData = promptpay(phoneNumber, totalPrice)
            qrCodeImage = await QRCode.toDataURL(qrCodeData)
        } catch (err) {
            console.error("QR Code Error:", err)
            return res.status(500).json({ message: "ไม่สามารถสร้าง QR Code ได้" })
        }

        // บันทึกออเดอร์
        const newOrder = await prisma.order.create({
            data: {
                userId,
                totalPrice: new Prisma.Decimal(totalPrice),
                paymentStatus: "PENDING",
                paymentMethod: "QR_CODE",
                tableId: table ? table.id : null,
                orderItems: {
                    create: cartItems.map(item => ({
                        menuId: item.menu.id,
                        quantity: item.quantity,
                        price: new Prisma.Decimal(parseFloat(item.menu.price))
                    }))
                }
            }
        });

        // ลบตะกร้า
        await prisma.cart.deleteMany({ where: { userId } })

        res.json({
            message: "สร้างออเดอร์สำเร็จ กรุณาชำระเงิน",
            orderId: newOrder.id,
            tableId: table ? table.id : "ไม่มีโต๊ะ",
            qrCode: qrCodeImage,
            paymentLink: `https://promptpay.io/${phoneNumber}/${totalPrice}`,
            totalPrice,
            reservedTables,
            orderedItems
        })

    } catch (error) {
        console.error("Order Error:", error)
        res.status(500).json({ message: "เกิดข้อผิดพลาดในการสั่งซื้อ" })
    }
}

exports.getMyOrders = async (req, res) => {
    try {
        const userId = req.user.id;
        const orders = await prisma.order.findMany({
            where: { userId },
            include: {
                orderItems: {
                    include: { menu: true }, // ดึงข้อมูลเมนูแต่ละ orderItem
                },
                table: true, // ดึงข้อมูลโต๊ะ
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        const formattedOrders = orders.map((order) => ({
            orderId: order.id,
            tableNumber: order.table ? order.table.tableNumber : "-",
            totalPrice: order.totalPrice,
            paymentStatus: order.paymentStatus,
            createdAt: order.createdAt,
            orderItems: order.orderItems.map((item) => ({
                menuId: item.menu.id,
                menuName: item.menu.name,
                quantity: item.quantity,
                price: item.price,
            })),
        }));

        res.json({
            message: "ดึงข้อมูลออเดอร์สำเร็จ",
            orders: formattedOrders,
        });
    } catch (error) {
        console.error("Get My Orders Error:", error);
        res.status(500).json({
            message: "เกิดข้อผิดพลาดในการดึงข้อมูลออเดอร์ของคุณ",
        });
    }
};


exports.cancelOrder = async (req, res) => {
    try {
        const userId = req.user.id;
        const { orderId } = req.params;

        // 1️⃣ ตรวจสอบว่าออเดอร์เป็นของ user
        const order = await prisma.order.findUnique({
            where: { id: parseInt(orderId) },
            select: {
                userId: true,
                paymentStatus: true,
                createdAt: true,
            },
        });

        if (!order) {
            return res.status(404).json({ message: "ไม่พบออเดอร์" });
        }

        if (order.userId !== userId) {
            return res.status(403).json({ message: "คุณไม่มีสิทธิ์ยกเลิกออเดอร์นี้" });
        }

        // 2️⃣ ตรวจสอบสถานะออเดอร์ (ต้องเป็น "ยังไม่ชำระเงิน")
        if (order.paymentStatus !== "ยังไม่ชำระเงิน") {
            return res.status(400).json({
                message: "ไม่สามารถยกเลิกออเดอร์ที่ชำระเงินแล้วหรือกำลังเตรียมอาหารได้",
            });
        }

        // 3️⃣ ตรวจสอบว่าอยู่ใน 5 นาทีแรกหลังสั่งหรือไม่
        const now = new Date();
        const orderTime = new Date(order.createdAt);
        const diffMinutes = (now - orderTime) / (1000 * 60);
        if (diffMinutes > 5) {
            return res.status(400).json({
                message: "ออเดอร์นี้ไม่สามารถยกเลิกได้ (เกิน 5 นาทีหลังสั่ง)",
            });
        }

        // 4️⃣ ตรวจสอบจำนวนครั้งการยกเลิกในวันเดียวกัน (3 ครั้ง/วัน)
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        const cancelCountToday = await prisma.order.count({
            where: {
                userId: userId,
                paymentStatus: "CANCELLED",
                createdAt: {
                    gte: todayStart,
                    lte: todayEnd,
                },
            },
        });

        const MAX_CANCELS_PER_DAY = 3;
        if (cancelCountToday >= MAX_CANCELS_PER_DAY) {
            return res.status(400).json({
                message: `ออเดอร์นี้ไม่สามารถยกเลิกได้ (คุณยกเลิกครบ ${MAX_CANCELS_PER_DAY} ครั้งในวันนี้แล้ว)`,
            });
        }

        // 5️⃣ อัปเดตสถานะเป็น "CANCELLED"
        await prisma.order.update({
            where: { id: parseInt(orderId) },
            data: { paymentStatus: "CANCELLED" },
        });

        res.json({ message: "✅ ยกเลิกออเดอร์สำเร็จ" });
    } catch (error) {
        console.error("Cancel Order Error:", error);
        res.status(500).json({ message: "เกิดข้อผิดพลาดในการยกเลิกออเดอร์" });
    }
};

// Reservations
exports.createReservation = async (req, res) => {
    try {
        const userId = req.user.id;

        // ✅ Sanitize input
        const sanitizedStartTime = xss(req.body.startTime);
        const sanitizedPeople = validator.toInt(xss(req.body.people));
        const rawTableIds = Array.isArray(req.body.tableIds) ? req.body.tableIds : [];

        const sanitizedTableIds = rawTableIds
            .map(id => validator.toInt(xss(id)))
            .filter(id => !isNaN(id)); // กรองค่าที่ไม่ใช่ตัวเลขออก

        // ✅ Validate input
        if (!sanitizedStartTime || !sanitizedPeople) {
            return res.status(400).json({ message: "ต้องระบุเวลาและจำนวนคน" });
        }

        if (sanitizedTableIds.length === 0) {
            return res.status(400).json({ message: "ต้องเลือกอย่างน้อย 1 โต๊ะ" });
        }

        const start = dayjs(sanitizedStartTime).toDate();
        const end = dayjs(sanitizedStartTime).add(1, "hour").toDate();

        if (isNaN(start.getTime())) {
            return res.status(400).json({ message: "เวลาไม่ถูกต้อง" });
        }

        // ✅ ตรวจสอบว่าโต๊ะมีอยู่จริง
        const tables = await prisma.table.findMany({
            where: { id: { in: sanitizedTableIds } },
        });
        if (tables.length !== sanitizedTableIds.length) {
            return res.status(400).json({ message: "มีโต๊ะที่เลือกบางตัวไม่ถูกต้อง" });
        }

        // ✅ ตรวจสอบการจองซ้อน (±3 ชั่วโมง)
        const threeHoursBefore = dayjs(start).subtract(3, "hour").toDate();
        const threeHoursAfter = dayjs(end).add(3, "hour").toDate();

        const overlapping = await prisma.reservation.findMany({
            where: {
                tableId: { in: sanitizedTableIds },
                status: "PENDING",
                time: { gte: threeHoursBefore, lt: threeHoursAfter },
            },
            select: { tableId: true },
        });

        if (overlapping.length > 0) {
            const reservedIds = overlapping.map((r) => r.tableId);
            return res.status(400).json({
                message: `โต๊ะต่อไปนี้ถูกจองแล้วในช่วงเวลาใกล้เคียง: ${reservedIds.join(", ")}`,
            });
        }

        // ✅ สร้างการจอง
        const reservations = await prisma.$transaction(
            sanitizedTableIds.map((tableId) =>
                prisma.reservation.create({
                    data: {
                        userId,
                        tableId,
                        time: start,
                        status: "PENDING",
                        people: sanitizedPeople,
                    },
                })
            )
        );

        // ✅ อัปเดตสถานะโต๊ะ
        await prisma.table.updateMany({
            where: { id: { in: sanitizedTableIds } },
            data: { status: "RESERVED" },
        });

        res.status(201).json({ message: "จองโต๊ะสำเร็จ", reservations });

    } catch (err) {
        console.error("❌ Reservation Error (User):", err);
        res.status(500).json({ message: "เกิดข้อผิดพลาดในการจองโต๊ะ" });
    }
};

exports.getReservation = async (req, res) => {
    const userId = req.user.id;
    const rawDate = req.query.date;

    const sanitizedDate = xss(rawDate?.trim() || '');

    if (!validator.isDate(sanitizedDate, { format: "YYYY-MM-DD", strictMode: true })) {
        return res.status(400).json({ message: "รูปแบบวันที่ไม่ถูกต้อง (ต้องเป็น YYYY-MM-DD)" });
    }

    try {
        const startOfDay = new Date(sanitizedDate);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(sanitizedDate);
        endOfDay.setHours(23, 59, 59, 999);

        const reservations = await prisma.reservation.findMany({
            where: {
                userId,
                time: {
                    gte: startOfDay,
                    lte: endOfDay,
                },
            },
            include: {
                table: { select: { tableNumber: true } },
            },
            orderBy: { time: "asc" },
        });

        const formattedReservations = reservations.map(r => ({
            id: r.id,
            date: r.time ? r.time.toISOString() : null,
            tableNumber: r.table?.tableNumber || "-",
            people: r.people || "-",
            status: r.status,
        }));

        res.json({ reservations: formattedReservations });
    } catch (error) {
        console.error("❌ Load reservation error:", error);
        res.status(500).json({ message: "เกิดข้อผิดพลาดในการโหลดข้อมูลการจอง" });
    }
};

exports.cancelReservation = async (req, res) => {
    try {
        const userId = req.user.id;
        const reservationId = parseInt(req.params.id, 10);

        if (isNaN(reservationId)) {
            return res.status(400).json({ message: "รหัสการจองไม่ถูกต้อง" });
        }

        const reservation = await prisma.reservation.findUnique({
            where: { id: reservationId },
            include: { table: true }
        });

        if (!reservation) {
            return res.status(404).json({ message: "ไม่พบการจองที่ต้องการยกเลิก" });
        }

        // ✅ ตรวจว่า user เป็นเจ้าของ
        if (reservation.userId !== userId) {
            return res.status(403).json({ message: "คุณไม่มีสิทธิ์ยกเลิกการจองนี้" });
        }

        // ✅ คืนสถานะโต๊ะ
        if (reservation.tableId) {
            await prisma.table.update({
                where: { id: reservation.tableId },
                data: { status: "AVAILABLE" }
            });
        }

        // ✅ ลบการจอง
        await prisma.reservation.delete({
            where: { id: reservationId }
        });

        res.json({ message: "ยกเลิกการจองสำเร็จ" });

    } catch (error) {
        console.error("Cancel Reservation Error:", error);
        res.status(500).json({ message: "เกิดข้อผิดพลาดในการยกเลิกการจอง" });
    }
};

