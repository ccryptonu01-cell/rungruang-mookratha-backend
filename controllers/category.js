const prisma = require("../config/prisma")
const xss = require("xss")
const validator = require("validator")

exports.createCategory = async (req, res) => {
  try {
    const name = xss(req.body.name?.trim())

    if (!name) {
      return res.status(400).json({
        message: "กรุณาระบุชื่อหมวดหมู่",
      })
    }

    const existingCategory = await prisma.category.findUnique({
      where: { name },
    })

    if (existingCategory) {
      return res.status(409).json({
        message: "หมวดหมู่นี้มีอยู่แล้ว",
      })
    }

    const newCategory = await prisma.category.create({
      data: { name },
    })

    res.status(201).json({
      message: "เพิ่มหมวดหมู่สำเร็จ",
      category: newCategory,
    })
  } catch (error) {
    console.error("❌ CreateCategory Error:", error)
    res.status(500).json({ message: "Server Error" })
  }
}

exports.AdmincreateCategory = async (req, res) => {
  try {
    const name = xss(req.body.name?.trim())
    const description = xss(req.body.description || "")
    const rawPrice = xss(req.body.price)
    const rawCategoryId = xss(req.body.categoryId)
    const image = xss(req.body.image || req.file?.path || "")
    const publicId = xss(req.body.publicId || "")

    // ตรวจสอบความครบถ้วน
    if (!name || !rawPrice || !rawCategoryId) {
      return res.status(400).json({ message: "กรอกข้อมูลไม่ครบ" })
    }

    // ตรวจสอบ price และ categoryId ว่าเป็นตัวเลขหรือไม่
    if (!validator.isNumeric(rawPrice) || !validator.isInt(rawCategoryId)) {
      return res.status(400).json({ message: "ข้อมูลไม่ถูกต้อง (price/categoryId)" })
    }

    const price = parseFloat(rawPrice)
    const categoryId = parseInt(rawCategoryId, 10)

    const newMenu = await prisma.menu.create({
      data: {
        name,
        price,
        description,
        image,
        publicId,
        category: {
          connect: { id: categoryId }
        }
      }
    })

    res.status(201).json({ message: "เพิ่มเมนูสำเร็จ", menu: newMenu })
  } catch (err) {
    console.error("CreateMenu Error:", err)
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการเพิ่มเมนู" })
  }
}

exports.getAllCategories = async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { id: 'asc' }
    })

    res.status(200).json({ categories })
  } catch (err) {
    console.error("เกิดข้อผิดพลาดในการดึงหมวดหมู่:", err)
    res.status(500).json({ message: "ไม่สามารถดึงหมวดหมู่ได้" })
  }
}
