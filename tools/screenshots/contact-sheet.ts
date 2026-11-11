import * as fs from "fs";
import * as path from "path";
import { chromium } from "@playwright/test";

async function buildContactSheet() {
  const baseDir = "/Users/shreenihilvijayan/Projects/CRM/project photos";
  const manifestPath = path.join(baseDir, "07-post-copy", "manifest.json");
  const { manifest } = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

  let cardsHtml = "";
  for (const item of manifest) {
    const fullImgPath = path.join(baseDir, item.file);
    const imgBase64 = fs.readFileSync(fullImgPath).toString("base64");
    cardsHtml += `
      <div class="card">
        <div class="img-wrap">
          <img src="data:image/png;base64,${imgBase64}" alt="${item.altText}" />
        </div>
        <div class="info">
          <div style="display: flex; gap: 6px; margin-bottom: 6px;">
            <span class="badge ${item.theme}">${item.theme.toUpperCase()}</span>
            <span class="badge vp">${item.viewport.toUpperCase()}</span>
          </div>
          <h3>${item.title}</h3>
          <p class="desc">${path.basename(item.file)}</p>
        </div>
      </div>
    `;
  }

  const html = `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Nexus CRM — Marketing Screenshot Contact Sheet</title>
    <style>
      body {
        margin: 0;
        padding: 40px;
        background: #09090b;
        color: #f4f4f5;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      header {
        margin-bottom: 32px;
        border-bottom: 1px solid #27272a;
        padding-bottom: 20px;
      }
      h1 { margin: 0 0 8px 0; font-size: 28px; letter-spacing: -0.02em; }
      p.subtitle { margin: 0; color: #a1a1aa; font-size: 14px; }
      .grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 24px;
      }
      .card {
        background: #18181b;
        border: 1px solid #27272a;
        border-radius: 12px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }
      .img-wrap {
        background: #000;
        aspect-ratio: 16/10;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .img-wrap img {
        width: 100%;
        height: 100%;
        object-fit: contain;
      }
      .info {
        padding: 16px;
      }
      .badge {
        display: inline-block;
        font-size: 10px;
        font-weight: 700;
        padding: 2px 8px;
        border-radius: 4px;
        letter-spacing: 0.05em;
      }
      .badge.dark { background: #312e81; color: #c7d2fe; border: 1px solid #4338ca; }
      .badge.light { background: #fef08a; color: #713f12; border: 1px solid #eab308; }
      .badge.high-contrast { background: #ffffff; color: #000000; border: 1px solid #ffffff; }
      .badge.vp { background: #27272a; color: #a1a1aa; }
      h3 { margin: 4px 0 2px 0; font-size: 13px; font-weight: 600; color: #fafafa; }
      p.desc { margin: 0; font-size: 11px; font-family: monospace; color: #71717a; }
    </style>
  </head>
  <body>
    <header>
      <h1>Nexus CRM — Screenshot Verification Contact Sheet</h1>
      <p class="subtitle">Step 1 Deliverable: 29 Retina (2x) Screenshots in Light, Dark, High-Contrast & Mobile with Populated Demo Data</p>
    </header>
    <div class="grid">
      ${cardsHtml}
    </div>
  </body>
  </html>`;

  const sheetHtmlPath = path.join(baseDir, "contact-sheet.html");
  fs.writeFileSync(sheetHtmlPath, html);
  console.log("HTML contact sheet written:", sheetHtmlPath);

  // Render to PNG
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
  });
  await page.setContent(html, { waitUntil: "load" });
  await page.waitForTimeout(1500);

  const pngPath = path.join(baseDir, "contact-sheet.png");
  await page.screenshot({ path: pngPath, fullPage: true });
  console.log("PNG contact sheet written:", pngPath);

  // Copy to brain artifacts directory so user can inspect it
  const artifactPath =
    "/Users/shreenihilvijayan/.gemini/antigravity-ide/brain/d04fd209-1d74-49d0-aa4e-503e99e79be6/contact-sheet.png";
  fs.copyFileSync(pngPath, artifactPath);
  console.log("Artifact contact sheet copied:", artifactPath);

  await browser.close();
}

buildContactSheet().catch((err) => {
  console.error(err);
  process.exit(1);
});
