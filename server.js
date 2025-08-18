// server.js
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import puppeteer from "puppeteer";

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: "5mb" })); // HTML gövdesi için limit

// Basit API key kontrolü (opsiyonel)
const API_KEY = process.env.API_KEY || "";
app.use((req, res, next) => {
  if (!API_KEY) return next(); // API_KEY boşsa koruma yok
  if (req.headers["x-api-key"] === API_KEY) return next();
  return res.status(401).json({ error: "Unauthorized" });
});

let browser;
async function getBrowser() {
  if (!browser || !browser.process() || browser.isConnected() === false) {
    browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
      headless: true,
    });
  }
  return browser;
}

function normalizeMargin(m) {
  if (!m) return { top: "0.5in", right: "0.5in", bottom: "0.5in", left: "0.5in" };
  if (typeof m === "string") return { top: m, right: m, bottom: m, left: m };
  return {
    top: m.top ?? "0.5in",
    right: m.right ?? "0.5in",
    bottom: m.bottom ?? "0.5in",
    left: m.left ?? "0.5in",
  };
}

app.get("/healthz", (_req, res) => res.json({ ok: true }));

app.post("/convert", async (req, res) => {
  try {
    const {
      source,             // HTML string
      url,                // alternatif: işlenecek URL
      landscape = false,
      use_print = true,   // printBackground
      margin,             // "0.5in" ya da { top,right,bottom,left }
      format = "A4",      // A4, Letter, vs.
      headerHTML,         // opsiyonel
      footerHTML,         // opsiyonel
      waitUntil = "networkidle0",
      timeout_ms = 30000
    } = req.body || {};

    if (!source && !url) {
      return res.status(400).json({ error: "Provide 'source' (HTML) or 'url'." });
    }

    const br = await getBrowser();
    const page = await br.newPage();
    await page.setExtraHTTPHeaders({ "Accept-Language": "tr-TR,tr;q=0.9" });

    if (source) {
      await page.setContent(source, { waitUntil, timeout: timeout_ms });
    } else {
      await page.goto(url, { waitUntil, timeout: timeout_ms });
    }

    const pdf = await page.pdf({
      format,
      landscape,
      printBackground: !!use_print,
      preferCSSPageSize: true,
      margin: normalizeMargin(margin),
      displayHeaderFooter: !!(headerHTML || footerHTML),
      headerTemplate: headerHTML || "<div></div>",
      footerTemplate: footerHTML || "<div></div>",
    });

    await page.close();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline; filename=document.pdf");
    return res.send(pdf);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Render failed", detail: String(err?.message || err) });
  }
});

// Graceful shutdown
async function closeBrowser() {
  if (browser) try { await browser.close(); } catch {}
}
process.on("SIGINT",  async () => { await closeBrowser(); process.exit(0); });
process.on("SIGTERM", async () => { await closeBrowser(); process.exit(0); });

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("HTML→PDF service listening on", port));
