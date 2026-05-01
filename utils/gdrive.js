const { google } = require("googleapis");
const { Readable } = require("stream");

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GDRIVE_CLIENT_EMAIL,
    private_key: (process.env.GDRIVE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
  },
  scopes: ["https://www.googleapis.com/auth/drive"],
});

const drive = google.drive({ version: "v3", auth });

// 👉 Upload
async function uploadToDrive(buffer, mimetype, originalname, folderId) {
  const filename = `product_${Date.now()}_${originalname}`;

  const res = await drive.files.create({
    requestBody: {
      name: filename,
      parents: [folderId], // ← รับมาจากที่เรียก
    },
    media: {
      mimeType: mimetype,
      body: Readable.from(buffer),
    },
    fields: "id",
  });

  const fileId = res.data.id;

  await drive.permissions.create({
    fileId,
    requestBody: { role: "reader", type: "anyone" },
  });

  return `https://drive.google.com/uc?export=view&id=${fileId}`;
}

// 👉 Delete (ปลอดภัยขึ้น)
async function deleteFromDrive(fileIdOrUrl) {
  try {
    if (!fileIdOrUrl) return;

    let fileId = fileIdOrUrl;

    // แบบ uc?id=
    let match = fileIdOrUrl.match(/id=([^&]+)/);
    if (match) fileId = match[1];

    // แบบ /file/d/
    match = fileIdOrUrl.match(/\/d\/(.*?)\//);
    if (match) fileId = match[1];

    await drive.files.delete({ fileId });
  } catch (err) {
    console.error("Drive delete error:", err.message);
  }
}

module.exports = { uploadToDrive, deleteFromDrive };