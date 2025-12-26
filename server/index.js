const express = require("express");
const helmet = require("helmet");
const compression = require("compression");
const path = require("path");
const fs = require("fs");

const cors = require("./cors");
const proxyRouter = require("./proxy");
const aiRouter = require("./ai");

const app = express();
const PORT = process.env.PORT || 3000;
const IS_PROD = !!process.env.RAILWAY_ENVIRONMENT;

// ====== CORE MIDDLEWARE ======
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
  })
);

app.use(cors.corsMiddleware);
app.use(compression());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// ====== HEALTHCHECK (RAILWAY NEEDS THIS) ======
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

// ====== RATE LIMITING ======
app.use("/proxy", cors.proxyRateLimiter);
app.use("/api/ai", cors.rateLimiter);

// ====== STATIC FILES ======
const PUBLIC_DIR = path.join(__dirname, "../public");
if (fs.existsSync(PUBLIC_DIR)) {
  app.use(express.static(PUBLIC_DIR));
}

// ====== ROUTERS ======
app.use("/proxy", proxyRouter);
app.use("/api/ai", aiRouter);

// ====== SAFE JSON LOADER ======
function safeJSON(res, file) {
  try {
    const data = require(file);
    res.json(data);
  } catch {
    res.status(500).json({ error: "Config missing" });
  }
}

// ====== API ======
app.get("/api/search-engines", (req, res) =>
  safeJSON(res, "../config/search-engines.json")
);

app.get("/api/games", (req, res) =>
  safeJSON(res, "../config/games.json")
);

app.get("/api/apps", (req, res) =>
  safeJSON(res, "../config/apps.json")
);

app.get("/api/settings", (req, res) =>
  safeJSON(res, "../config/site-config.json")
);

// 🚫 FILE WRITES DISABLED IN PROD
app.post("/api/settings", (req, res) => {
  if (IS_PROD) {
    return res
      .status(403)
      .json({ error: "Settings disabled in production" });
  }

  try {
    const configPath = path.join(__dirname, "../config/site-config.json");
    fs.writeFileSync(configPath, JSON.stringify(req.body, null, 2));
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to save settings" });
  }
});

// ====== PAGE SERVE (CRASH-PROOF) ======
function safePage(route, file) {
  app.get(route, (req, res) => {
    const filePath = path.join(PUBLIC_DIR, file);
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(200).send("Redio running");
    }
  });
}

safePage("/", "index.html");
safePage("/games", "games.html");
safePage("/apps", "apps.html");
safePage("/settings", "settings.html");
safePage("/cloak", "cloak.html");
safePage("/ai", "ai.html");
safePage("/error-fixer", "error-fixer.html");

// ====== APP PAGES ======
app.get("/app/:name", (req, res) => {
  const file = path.join(PUBLIC_DIR, "apps", `${req.params.name}.html`);
  if (fs.existsSync(file)) {
    res.sendFile(file);
  } else {
    res.status(404).send("App not found");
  }
});

// ====== 404 ======
app.use((req, res) => {
  res.status(404).send("Not found");
});

// ====== ERROR HANDLER ======
app.use(cors.errorHandler);

// ====== START ======
app.listen(PORT, () => {
  console.log("🔥 Redio ONLINE");
  console.log("🌍 Port:", PORT);
  console.log("🚀 Env:", IS_PROD ? "Production" : "Development");
});
