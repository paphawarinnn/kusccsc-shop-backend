const express = require("express");
const router = express.Router();
const Product = require("../models/Product");

const multer = require("multer");
const path = require("path");
const fs = require("fs");

// ========================
// 📦 MULTER SETUP
// ========================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "../public/images");

    // สร้างโฟลเดอร์ถ้ายังไม่มี
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    cb(null, dir);
  },

  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `product_${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// ========================
// 📌 GET ALL PRODUCTS
// ========================
router.get("/", async (req, res) => {
  try {
    const products = await Product.find({
      active: { $ne: false },
    }).sort({ createdAt: -1 });

    res.status(200).json(products);
  } catch (err) {
    res.status(500).json({ message: "Error fetching products", error: err });
  }
});

// ========================
// 📌 ADMIN GET ALL
// ========================
router.get("/admin/all", async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.status(200).json(products);
  } catch (err) {
    res.status(500).json({ message: "Error fetching products", error: err });
  }
});

// แก้ตรง POST route
router.post("/", upload.array("images", 5), async (req, res) => {
  try {
    const mainImage = req.files?.[0]?.filename || req.body.image || "";
    const extraImages = req.files?.slice(1).map(f => f.filename) || [];

    const product = new Product({
      name: req.body.name,
      price: req.body.price,
      description: req.body.description || "",
      store: req.body.store || "",
      stock: req.body.stock || 999,
      image: mainImage,
      images: extraImages,
    });
    await product.save();
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ message: "Error creating product", error: err });
  }
});
// ========================
// 📌 UPDATE PRODUCT + UPLOAD IMAGE ✅
// ========================
router.put("/:id", upload.array("images", 5), async (req, res) => {
  try {
    const updateData = {
      name: req.body.name,
      price: req.body.price,
      description: req.body.description || "",
      store: req.body.store || "",
      stock: req.body.stock || 999,
    };

    // ถ้ามีอัพรูปใหม่ค่อย update รูป (ถ้าไม่มีรูปใหม่ รูปเดิมยังคงอยู่)
    if (req.files && req.files.length > 0) {
      updateData.image = req.files[0].filename;
      updateData.images = req.files.slice(1).map(f => f.filename);
    }
    const updated = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Error updating product", error: err });
  }
});

// ========================
// 📌 DELETE PRODUCT
// ========================
router.delete("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const deleteFile = (file) => {
      return new Promise((resolve) => {
        if (!file) return resolve();

        const imgPath = path.join(__dirname, "../public/images", file);

        fs.unlink(imgPath, (err) => {
          // 🔥 ไม่ต้อง log อะไรเลย (หรือจะ log เฉพาะ error ก็ได้)
          resolve();
        });
      });
    };

    // ลบรูปหลัก
    await deleteFile(product.image);

    // ลบรูปเพิ่มเติม
    if (product.images && product.images.length > 0) {
      await Promise.all(product.images.map(img => deleteFile(img)));
    }

    await Product.findByIdAndDelete(req.params.id);

    res.json({ message: "Deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json(err);
  }
});

module.exports = router;