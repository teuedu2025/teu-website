import express from "express";
import fs from "fs";
import bodyParser from "body-parser";
import path from "path";

const app = express();
const PORT = process.env.PORT || 3000;

// Parse JSON requests
app.use(bodyParser.json());

// Serve static files from 'public'
app.use(express.static(path.join(path.resolve(), "public")));

// Homepage
app.get("/", (req, res) => {
  res.sendFile(path.join(path.resolve(), "public", "index.html"));
});

// Add certificate API
app.post("/add-certificate", (req, res) => {
  const { code, name, year, degree, hons, grade } = req.body;
  if (!code || !name || !year || !degree || !hons || !grade) {
    return res.json({ success: false, error: "All fields are required" });
  }

  const filePath = path.join(path.resolve(), "certificates.json");
  let certificates = [];
  if (fs.existsSync(filePath)) {
    certificates = JSON.parse(fs.readFileSync(filePath));
  }

  certificates.push({ code, name, year, degree, hons, grade });
  fs.writeFileSync(filePath, JSON.stringify(certificates, null, 2));
  res.json({ success: true });
});

// Verify certificate API
app.get("/verify", (req, res) => {
  const code = req.query.code;
  if (!code) return res.json({ valid: false });

  const filePath = path.join(path.resolve(), "certificates.json");
  if (!fs.existsSync(filePath)) return res.json({ valid: false });

  const certificates = JSON.parse(fs.readFileSync(filePath));
  const cert = certificates.find(c => c.code === code);
  if (!cert) return res.json({ valid: false });

  res.json({ valid: true, ...cert });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
