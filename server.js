import express from "express";
import fs from "fs";
import path from "path";
import bodyParser from "body-parser";
import QRCode from "qrcode";

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
const rootDir = path.resolve();
const publicDir = path.join(rootDir, "public");
const qrDir = path.join(publicDir, "qrcodes");
const certFile = path.join(rootDir, "certificates.json");

// Ensure folders exist
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir);
if (!fs.existsSync(qrDir)) fs.mkdirSync(qrDir, { recursive: true });

// Serve static files
app.use(express.static(publicDir));

// --- Preload default certificate ---
const defaultCertificate = {
  code: "teu-2022-001-aaa",
  name: "KALU ARACHCHIGE THISARA NAYANAJITH",
  year: "2022",
  degree: "BSc Nursing",
  hons: "Hons",
  grade: "First Class",
  qr: `/qrcodes/teu-2022-001-aaa.png`
};

// Save certificate and generate QR if not already exists
let certificates = [];
if (fs.existsSync(certFile)) {
  certificates = JSON.parse(fs.readFileSync(certFile, "utf-8") || "[]");
}
const exists = certificates.find(c => c.code === defaultCertificate.code);
if (!exists) {
  certificates.push(defaultCertificate);
  fs.writeFileSync(certFile, JSON.stringify(certificates, null, 2));

  // Generate QR code PNG
  const qrFilePath = path.join(qrDir, `${defaultCertificate.code}.png`);
  const verifyUrl = `https://www.teu-edu.com/verify?code=${defaultCertificate.code}`;
  QRCode.toFile(qrFilePath, verifyUrl)
    .then(() => console.log("✅ Default certificate QR generated"))
    .catch(err => console.error("❌ QR generation failed:", err));
}

// --- Routes ---
app.get("/", (req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

// Add certificate API
app.post("/add-certificate", async (req, res) => {
  const { code, name, year, degree, hons, grade } = req.body;
  if (!code || !name || !year || !degree || !hons || !grade) {
    return res.json({ success: false, error: "All fields are required" });
  }

  const verifyUrl = `https://www.teu-edu.com/verify?code=${code}`;
  const qrFilePath = path.join(qrDir, `${code}.png`);

  try {
    if (!fs.existsSync(qrDir)) fs.mkdirSync(qrDir, { recursive: true });
    await QRCode.toFile(qrFilePath, verifyUrl);
  } catch (err) {
    return res.json({ success: false, error: "QR Code generation failed" });
  }

  certificates.push({ code, name, year, degree, hons, grade, qr: `/qrcodes/${code}.png` });
  fs.writeFileSync(certFile, JSON.stringify(certificates, null, 2));
  return res.json({ success: true, qr: `/qrcodes/${code}.png` });
});

// Verify certificate API
app.get("/verify", (req, res) => {
  const code = req.query.code;
  if (!code) return res.json({ valid: false });

  const cert = certificates.find(c => c.code === code);
  if (!cert) return res.json({ valid: false });

  return res.json({ valid: true, ...cert });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
