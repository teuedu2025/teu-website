import express from "express";
import fs from "fs";
import bodyParser from "body-parser";
import path from "path";
import QRCode from "qrcode";

const app = express();
const PORT = process.env.PORT || 3000;

// --- Paths ---
const rootDir = path.resolve();
const publicDir = path.join(rootDir, "public");
const qrDir = path.join(publicDir, "qrcodes");
const certFile = path.join(rootDir, "certificates.json");

// --- Ensure folders exist ---
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir);
if (!fs.existsSync(qrDir)) fs.mkdirSync(qrDir, { recursive: true });

// --- Middleware ---
app.use(bodyParser.json());
app.use(express.static(publicDir));

// --- Homepage ---
app.get("/", (req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

// --- Add certificate API ---
app.post("/add-certificate", async (req, res) => {
  const { code, name, year, degree, hons, grade } = req.body;
  if (!code || !name || !year || !degree || !hons || !grade) {
    return res.json({ success: false, error: "All fields are required" });
  }

  try {
    // QR code file path
    const verifyUrl = `https://www.teu-edu.com/verify?code=${code}`;
    const qrFilePath = path.join(qrDir, `${code}.png`);

    // Generate QR
    await QRCode.toFile(qrFilePath, verifyUrl);

    // Load certificates
    let certificates = [];
    if (fs.existsSync(certFile)) {
      certificates = JSON.parse(fs.readFileSync(certFile, "utf-8") || "[]");
    }

    // Add new certificate
    const qrUrl = `/qrcodes/${code}.png`;
    certificates.push({ code, name, year, degree, hons, grade, qr: qrUrl });

    fs.writeFileSync(certFile, JSON.stringify(certificates, null, 2));

    return res.json({ success: true, qr: qrUrl });
  } catch (err) {
    console.error("Add certificate error:", err);
    return res.json({ success: false, error: "QR Code or save failed" });
  }
});

// --- Verify certificate API ---
app.get("/verify", (req, res) => {
  const code = req.query.code;
  if (!code) return res.json({ valid: false });

  if (!fs.existsSync(certFile)) return res.json({ valid: false });

  try {
    const certificates = JSON.parse(fs.readFileSync(certFile, "utf-8") || "[]");
    const cert = certificates.find(c => c.code === code);
    if (!cert) return res.json({ valid: false });
    return res.json({ valid: true, ...cert });
  } catch (err) {
    console.error("Verify error:", err);
    return res.json({ valid: false });
  }
});

// --- Test QR ---
app.get("/test-qr", async (req, res) => {
  const sampleCode = "TEST123";
  const verifyUrl = `https://www.teu-edu.com/verify?code=${sampleCode}`;
  const qrFilePath = path.join(qrDir, `${sampleCode}.png`);

  try {
    await QRCode.toFile(qrFilePath, verifyUrl);
    res.send(`<h1>QR Code Generated</h1><img src="/qrcodes/${sampleCode}.png">`);
  } catch (err) {
    res.send("QR Code generation failed.");
  }
});

// --- Start server ---
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
