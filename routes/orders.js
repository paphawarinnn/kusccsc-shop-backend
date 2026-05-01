const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const nodemailer = require("nodemailer");
const { uploadToCloudinary } = require("../utils/cloudinary");

// =================== MULTER ===================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "../public/slips");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `slip_${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Only JPG/PNG/WEBP allowed"));
  },
});

// =================== EMAIL ===================
const transporter = nodemailer.createTransport({
  service: "gmail",
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  family: 4,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  connectionTimeout: 3000,
  greetingTimeout: 3000,
  socketTimeout: 3000,
});

const STATUS_LABEL = {
  pending_payment: "รอชำระเงิน",
  pending_verify: "รอตรวจสลิป",
  verified: "ชำระเงินแล้ว",
  preparing: "กำลังเตรียมของ",
  ready: "พร้อมรับ/ส่ง",
  delivered: "ส่งแล้ว",
  slip_rejected: "สลิปไม่ถูกต้อง",
};

async function sendStatusEmail(order, status, adminNote) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;
  try {
    const label = STATUS_LABEL[status] || status;
    const noteHtml = adminNote ? `<p><strong>หมายเหตุ:</strong> ${adminNote}</p>` : "";
    const reuploadMsg = status === "slip_rejected"
      ? `<p style="color:red;"><strong>⚠️ โปรดแก้ไขสลิปให้ถูกต้อง</strong> — เข้าหน้าเช็คสถานะแล้วกด "อัปโหลดสลิปใหม่"</p>`
      : "";

    await transporter.sendMail({
      from: `"KUSCCSC SHOP" <${process.env.EMAIL_USER}>`,
      to: order.customerEmail,
      subject: `[KUSCCSC SHOP] ออเดอร์ ${order.orderCode} — ${label}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto;">
          <h2 style="color:#1a6b3a;">KUSCCSC SHOP</h2>
          <p>สวัสดีคุณ <strong>${order.customerName}</strong></p>
          <p>ออเดอร์ <strong>${order.orderCode}</strong> มีการอัปเดตสถานะ:</p>
          <div style="background:#f0faf4;border-radius:10px;padding:16px;margin:16px 0;">
            <p style="font-size:20px;font-weight:bold;color:#1a6b3a;margin:0;">${label}</p>
          </div>
          ${reuploadMsg}
          ${noteHtml}
          <p>ตรวจสอบสถานะด้วยรหัส: <strong>${order.orderCode}</strong></p>
        </div>
      `,
    });
  } catch (err) {
    console.error("Email error:", err.message);
  }
}


// =================== HELPERS ===================
function generateOrderCode() {
  const date = new Date();
  const ymd = date.getFullYear().toString() +
    String(date.getMonth() + 1).padStart(2, "0") +
    String(date.getDate()).padStart(2, "0");
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `KU-${ymd}-${rand}`;
}

function getDeliveryFee(method) {
  if (method === "dorm_in") return 10;
  if (method === "dorm_out") return 20;
  return 0;
}

// CREATE ORDER
router.post("/", async (req, res) => {
  try {
    const { studentId, customerName, customerPhone, customerEmail, deliveryMethod, dormName, roomNumber, items } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "No items in order" });
    }

    const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const deliveryFee = getDeliveryFee(deliveryMethod);
    const total = subtotal + deliveryFee;

    const order = new Order({
      orderCode: generateOrderCode(),
      studentId, customerName, customerPhone, customerEmail,
      deliveryMethod,
      dormName: dormName || "",
      roomNumber: roomNumber || "",
      items, subtotal, deliveryFee, total,
      status: "pending_payment",
    });

    await order.save();
    res.status(201).json({ success: true, orderCode: order.orderCode, orderId: order._id, total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error creating order", error: err.message });
  }
});




// CHECK ORDER
router.get("/check", async (req, res) => {
  try {
    const { code, phone } = req.query;
    if (!code || !phone) return res.status(400).json({ message: "Missing code or phone" });

    const order = await Order.findOne({ orderCode: code, customerPhone: phone });
    if (!order) return res.status(404).json({ message: "Order not found" });

    res.json({
      orderCode: order.orderCode,
      customerName: order.customerName,
      deliveryMethod: order.deliveryMethod,
      dormName: order.dormName,
      roomNumber: order.roomNumber,
      items: order.items,
      subtotal: order.subtotal,
      deliveryFee: order.deliveryFee,
      total: order.total,
      slipUrl: order.slipUrl,
      slipUploadedAt: order.slipUploadedAt,
      status: order.status,
      adminNote: order.adminNote,
      createdAt: order.createdAt,
    });
  } catch (err) {
    res.status(500).json({ message: "Error", error: err.message });
  }
});
// ADMIN LOGIN
router.post("/admin/login", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: "กรุณากรอกชื่อผู้ใช้และรหัสผ่าน" });
  }

  if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
    return res.json({ success: true });
  }

  return res.status(401).json({ success: false, message: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" });
});

// ADMIN GET ALL ORDERS
router.get("/admin/all", async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status && status !== "all" ? { status } : {};
    const orders = await Order.find(filter).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: "Error", error: err.message });
  }
});
router.get("/admin/test-email", async (req, res) => {
  try {
    await transporter.sendMail({
      from: `"KUSCCSC SHOP" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER,
      subject: "Test Email",
      html: "<p>ทดสอบส่งเมล</p>",
    });
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// UPDATE STATUS
router.patch("/admin/:id/status", async (req, res) => {
  try {
    const { status, adminNote } = req.body;
    let finalNote = adminNote || "";

    if (status === "slip_rejected" && !finalNote.includes("โปรดแก้ไขสลิป")) {
      finalNote = finalNote ? `${finalNote} — โปรดแก้ไขสลิปให้ถูกต้อง` : "โปรดแก้ไขสลิปให้ถูกต้อง";
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status, adminNote: finalNote },
      { new: true }
    );

    if (!order) return res.status(404).json({ message: "Order not found" });

    // ✅ ส่ง response ก่อนเลย ไม่รอ email
    res.json({ success: true, order });

    // ✅ ส่ง email ทีหลัง (background)
    sendStatusEmail(order, status, finalNote).catch(err =>
      console.error("Email error:", err.message)
    );

  } catch (err) {
    res.status(500).json({ message: "Error", error: err.message });
  }
});

// DELETE ORDER
router.delete("/admin/:id", async (req, res) => {
  try {
    await Order.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "Error", error: err.message });
  }
});
// POST /api/orders/:orderCode/slip
router.post("/:orderCode/slip", upload.single("slip"), async (req, res) => {
  try {
    const order = await Order.findOne({ orderCode: req.params.orderCode });
    if (!order) return res.status(404).json({ message: "Order not found" });

    const allowed = ["pending_payment", "pending_verify", "slip_rejected"];
    if (!allowed.includes(order.status)) {
      return res.status(400).json({ message: "ไม่สามารถอัปโหลดสลิปในสถานะนี้ได้" });
    }

    const url = await uploadToCloudinary(req.file.buffer, "shop-slips");

    order.slipUrl = url;
    order.slipUploadedAt = new Date();
    order.status = "pending_verify";

    await order.save();
    res.json({ success: true, slipUrl: order.slipUrl, status: order.status });
  } catch (err) {
    console.error("🔴 slip error:", err.message); // ← เพิ่ม
    res.status(500).json({ message: "Error uploading slip", error: err.message });
  }

});
module.exports = router;