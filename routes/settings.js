const express = require("express");
const router = express.Router();
const Setting = require("../models/Setting");

// GET /api/settings/shop-open — frontend ดึงสถานะ
router.get("/shop-open", async (req, res) => {
  try {
    const setting = await Setting.findOne({ key: "shopOpen" });
    // ถ้ายังไม่มีใน DB ให้ default เป็น true (เปิดอยู่)
    res.json({ shopOpen: setting ? setting.value : true });
  } catch (err) {
    res.status(500).json({ message: "Error", error: err.message });
  }
});

// PATCH /api/settings/shop-open — admin เปิด/ปิด
router.patch("/shop-open", async (req, res) => {
  try {
    const { shopOpen } = req.body;
    await Setting.findOneAndUpdate(
      { key: "shopOpen" },
      { key: "shopOpen", value: shopOpen },
      { upsert: true, new: true }
    );
    res.json({ success: true, shopOpen });
  } catch (err) {
    res.status(500).json({ message: "Error", error: err.message });
  }
});

module.exports = router;