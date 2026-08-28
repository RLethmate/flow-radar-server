"use strict";

const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, "data.json");
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || ""; // optional: set to require a token for /api/reset

function loadData() {
  try {
    const raw = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    if (raw && Array.isArray(raw.submissions)) return raw;
  } catch (e) {
    // no file yet, or unreadable — start fresh
  }
  return { submissions: [] };
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

let store = loadData();

app.use(express.json({ limit: "256kb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/data", (req, res) => {
  res.json(store);
});

app.post("/api/submit", (req, res) => {
  const body = req.body || {};
  const id = body.id;
  const answers = body.answers;
  if (typeof id !== "string" || !id || typeof answers !== "object" || answers === null) {
    return res.status(400).json({ error: "invalid_payload" });
  }
  const values = Object.values(answers);
  const clean = values.every((v) => typeof v === "number" && v >= 1 && v <= 5);
  if (!clean) {
    return res.status(400).json({ error: "invalid_answers" });
  }
  if (store.submissions.some((s) => s.id === id)) {
    return res.json({ ok: true, alreadyExists: true });
  }
  store.submissions.push({ id, ts: Date.now(), answers });
  saveData(store);
  res.json({ ok: true });
});

app.post("/api/reset", (req, res) => {
  if (ADMIN_TOKEN && req.get("x-admin-token") !== ADMIN_TOKEN) {
    return res.status(401).json({ error: "unauthorized" });
  }
  store = { submissions: [] };
  saveData(store);
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log("Flow-Radar server listening on port " + PORT);
});
