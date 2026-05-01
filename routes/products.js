const express = require("express");
const router = express.Router();
const Product = require("../models/Product");

const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { uploadToDrive, deleteFromDrive } = require("../utils/gdrive");

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
  storage: multer.memoryStorage(),
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
/* ================= CREATE PRODUCT ================= */
router.post("/", upload.array("images", 5), async (req, res) => {
  try {
    const urls = [];

    for (const file of req.files) {
      const url = await uploadToDrive(
        file.buffer,
        file.mimetype,
        file.originalname,
        process.env.GDRIVE_FOLDER_PRODUCTS
      );
      urls.push(url);
    }

    const product = new Product({
      name: req.body.name,
      price: req.body.price,
      description: req.body.description || "",
      store: req.body.store || "",
      stock: req.body.stock || 999,
      image: urls[0] || "",
      images: urls.slice(1),
    });

    await product.save();
    res.status(201).json(product);
  } catch (err) {
    console.error("🔴 POST /products error:", err); // ← เพิ่มบรรทัดนี้
    res.status(500).json({ message: "Error creating product", error: err.message });
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

/* ================= UPDATE PRODUCT ================= */
router.put("/:id", upload.array("images", 5), async (req, res) => {
  try {
    const updateData = {
      name: req.body.name,
      price: req.body.price,
      description: req.body.description || "",
      store: req.body.store || "",
      stock: req.body.stock || 999,
    };

    if (req.files && req.files.length > 0) {
      const old = await Product.findById(req.params.id);

      if (old?.image) await deleteFromDrive(old.image);
      for (const img of old?.images || []) {
        await deleteFromDrive(img);
      }

      const urls = [];

      for (const file of req.files) {
        const url = await uploadToDrive(
          file.buffer,
          file.mimetype,
          file.originalname,
          process.env.GDRIVE_FOLDER_PRODUCTS  // ← folder สินค้า
        );
        urls.push(url);
      }

      updateData.image = urls[0] || "";
      updateData.images = urls.slice(1);
    }

    const updated = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    res.json(updated);
  } catch (err) {
    res.status(500).json({
      message: "Error updating product",
      error: err.message,
    });
  }
});

/* ================= DELETE PRODUCT ================= */
router.delete("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product)
      return res.status(404).json({ message: "Product not found" });

    if (product.image) await deleteFromDrive(product.image);
    for (const img of product.images || []) {
      await deleteFromDrive(img);
    }

    await Product.findByIdAndDelete(req.params.id);

    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({
      message: "Error deleting product",
      error: err.message,
    });
  }
});

module.exports = router;