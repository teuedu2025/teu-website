import express from "express";
import fs from "fs";
import bodyParser from "body-parser";
import path from "path";
import QRCode from "qrcode";

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());

// Serve static files from 'public'
app.use(express.static(path.join(path.resolve(), "public")));

// Homepage
app.get("/", (req, res) => {
  res.sendFile(path.join(path.resolve(), "public", "index.html"));
});

// Add certificate API (with QR code generation)
app.post("/add-certificate", async (req, res) => {
  const { code, name, year, degree, hons, grade } = req.body;
  if (!code || !name || !year || !degree || !hons || !grade) {
    return res.json({ success: false, error: "All fields are required" });
  }

  // Verification URL for QR code
  const verifyUrl = `https://www.teu-edu.com/verify?code=${code}`;
  const qrDir = path.join(path.resolve(), "public", "qrcodes");
  const qrFilePath = path.join(qrDir, `${code}.png`);

  try {
    // Make sure qrcodes folder exists
    if (!fs.existsSync(qrDir)) {
      fs.mkdirSync(qrDir, { recursive: true });
    }

    // Generate QR code PNG file
    await QRCode.toFile(qrFilePath, verifyUrl);
  } catch (err) {
    console.error("QR Code generation failed:", err);
    return res.json({ success: false, error: "QR Code generation failed" });
  }

  // Certificates data file
  const filePath = path.join(path.resolve(), "certificates.json");
  let certificates = [];

  try {
    if (fs.existsSync(filePath)) {
      const fileData = fs.readFileSync(filePath, "utf-8");
      certificates = fileData ? JSON.parse(fileData) : [];
    }
  } catch (err) {
    console.error("Error reading certificates.json:", err);
    certificates = [];
  }

  // Save certificate + QR code URL
  const qrUrl = `/qrcodes/${code}.png`;
  certificates.push({ code, name, year, degree, hons, grade, qr: qrUrl });

  try {
    fs.writeFileSync(filePath, JSON.stringify(certificates, null, 2));
  } catch (err) {
    console.error("Error writing certificates.json:", err);
    return res.json({ success: false, error: "Failed to save certificate" });
  }

  res.json({ success: true, qr: qrUrl });
});

// Verify certificate API
app.get("/verify", (req, res) => {
  const code = req.query.code;
  if (!code) return res.json({ valid: false });

  const filePath = path.join(path.resolve(), "certificates.json");
  if (!fs.existsSync(filePath)) return res.json({ valid: false });

  let certificates = [];
  try {
    const fileData = fs.readFileSync(filePath, "utf-8");
    certificates = fileData ? JSON.parse(fileData) : [];
  } catch (err) {
    console.error("Error reading certificates.json:", err);
    return res.json({ valid: false });
  }

  const cert = certificates.find(c => c.code === code);
  if (!cert) return res.json({ valid: false });

  res.json({ valid: true, ...cert });
});

// (Optional) Test QR generation endpoint
app.get("/test-qr", async (req, res) => {
  const sampleCode = "TEST123";
  const verifyUrl = `https://www.teu-edu.com/verify?code=${sampleCode}`;
  const qrDir = path.join(path.resolve(), "public", "qrcodes");
  const qrFilePath = path.join(qrDir, `${sampleCode}.png`);

  try {
    if (!fs.existsSync(qrDir)) {
      fs.mkdirSync(qrDir, { recursive: true });
    }
    await QRCode.toFile(qrFilePath, verifyUrl);
    res.send(`<h1>QR Code Generated</h1><img src="/qrcodes/${sampleCode}.png">`);
  } catch (err) {
    res.send("QR Code generation failed.");
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
