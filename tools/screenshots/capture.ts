import { chromium, Browser, Page } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const OUT_DIR =
  process.env.SCREENSHOT_OUT_DIR ||
  "/Users/shreenihilvijayan/Projects/CRM/project photos";

interface ScreenDef {
  num: string;
  id: string;
  title: string;
  description: string;
  path: string;
  selectorToWait?: string;
  prepare?: (page: Page) => Promise<void>;
  themes?: Array<"light" | "dark" | "high-contrast">;
  viewports?: Array<"desktop" | "tablet" | "mobile">;
  altText: string;
  keywords: string[];
}

const SCREENS: ScreenDef[] = [
  {
    num: "01",
    id: "dashboard-analytics",
    title: "Executive Dashboard & Revenue Intelligence",
    description:
      "KPI metric tiles in ₹ INR, pipeline stage breakdown, and real-time revenue forecast.",
    path: "/",
    altText:
      "Nexus CRM Executive Dashboard with revenue metrics in INR lakhs and pipeline forecast",
    keywords: [
      "Dashboard",
      "CRM Analytics",
      "Revenue Forecast",
      "INR Currency",
    ],
  },
  {
    num: "02",
    id: "kanban-deal-pipeline",
    title: "Visual Drag-and-Drop Kanban Deal Pipeline",
    description:
      "Multi-stage sales pipeline with weighted currency totals and stage progression.",
    path: "/deals",
    altText:
      "Kanban board displaying deal cards across qualification, negotiation, and proposal stages",
    keywords: [
      "Kanban Pipeline",
      "Sales Pipeline",
      "Deal Stages",
      "Opportunity Management",
    ],
  },
  {
    num: "03",
    id: "record-view-split-pane",
    title: "Split-Pane Record View & Polymorphic Timeline",
    description:
      "Detailed company and deal view with audit trail, activity stream, and inline editing.",
    path: "/records/deals/01910000-0000-7000-8000-000000000011",
    altText:
      "Deal record overview showing stage bar, deal attributes, and polymorphic activity timeline",
    keywords: [
      "Record Page",
      "Split Pane",
      "Activity Timeline",
      "Customer 360",
    ],
  },
  {
    num: "04",
    id: "data-model-builder",
    title: "Metadata Engine & Custom Schema Builder",
    description:
      "Custom object creation, dynamic attribute typing, and entity relationship mapping.",
    path: "/settings/schema",
    altText:
      "Metadata schema designer with custom object attributes, field types, and relationships",
    keywords: [
      "Data Model",
      "Custom Objects",
      "Schema Builder",
      "Metadata Engine",
    ],
  },
  {
    num: "05",
    id: "duplicate-resolution-center",
    title: "Duplicate Resolution Center & Safe Merge Engine",
    description:
      "Deterministic fuzzy matching, confidence scores, and field-level survivorship rules.",
    path: "/duplicates",
    altText:
      "Duplicate Resolution Center comparing potential duplicate contacts with merge survivorship",
    keywords: [
      "Duplicate Detection",
      "Resolution Center",
      "Data Cleansing",
      "Contact Merge",
    ],
  },
  {
    num: "06",
    id: "workflow-dag-engine",
    title: "Visual Deterministic Workflow Automation Canvas",
    description:
      "Node-based DAG execution engine with condition branching and webhook dispatch.",
    path: "/automations",
    altText:
      "Automations Hub showing visual DAG canvas with triggers, conditions, and action nodes",
    keywords: [
      "Workflow Automation",
      "DAG Engine",
      "Visual Builder",
      "Business Logic",
    ],
  },
  {
    num: "07",
    id: "cpq-quote-modal",
    title: "CPQ Engine & Tiered GST Quote Builder",
    description:
      "Line item configuration, volume discount rules, CGST/SGST breakdown, and approval status.",
    path: "/records/deals/01910000-0000-7000-8000-000000000011",
    prepare: async (page: Page) => {
      const quoteBtn = page
        .locator(
          'button:has-text("Create Quote"), [data-testid="create-quote-btn"]',
        )
        .first();
      if (await quoteBtn.isVisible()) {
        await quoteBtn.click();
        await page.waitForTimeout(600);
      }
    },
    altText:
      "CPQ Quote Builder modal with tiered discount calculations and GST breakdown",
    keywords: ["CPQ", "Quote Builder", "GST Invoice", "Pricing Approvals"],
  },
  {
    num: "08",
    id: "platform-sovereignty-byok",
    title: "Platform Sovereignty & BYOK KMS Encryption",
    description:
      "Zero-downtime envelope encryption key rotation and single-tenant operational health.",
    path: "/settings/platform",
    altText:
      "Platform Sovereignty dashboard displaying BYOK master key version and encryption status",
    keywords: [
      "BYOK",
      "KMS Envelope Encryption",
      "Platform Sovereignty",
      "Zero Downtime",
    ],
  },
  {
    num: "09",
    id: "tamper-evident-audit-log",
    title: "Tamper-Evident SHA-256 Audit Ledger",
    description:
      "Cryptographically hashed event sequence proving non-repudiation and immutable logging.",
    path: "/settings/audit",
    altText:
      "Audit log viewer displaying chronological event ledger with SHA-256 hash chains",
    keywords: [
      "Audit Ledger",
      "Tamper Evident",
      "Compliance",
      "Security Audit",
    ],
  },
  {
    num: "10",
    id: "dead-letter-queue-replay",
    title: "Dead-Letter Queue (DLQ) & Webhook Replay",
    description:
      "Quarantined webhook failures, exponential backoff diagnostics, and targeted replay.",
    path: "/automations",
    prepare: async (page: Page) => {
      const tab = page.locator('[data-testid="tab-dlq"]').first();
      if (await tab.isVisible()) {
        await tab.click();
        await page.waitForTimeout(500);
      }
    },
    altText:
      "Dead-Letter Queue tab showing quarantined outbound webhooks and replay controls",
    keywords: [
      "Dead-Letter Queue",
      "DLQ Replay",
      "Outbound Webhooks",
      "Reliability",
    ],
  },
  {
    num: "11",
    id: "activity-capture-aac",
    title: "Automatic Activity Capture (AAC) & Sync Architecture",
    description:
      "Zero-touch bi-directional mailbox ingestion with KMS encryption and privacy filters.",
    path: "/automations",
    prepare: async (page: Page) => {
      const tab = page.locator('[data-testid="tab-aac"]').first();
      if (await tab.isVisible()) {
        await tab.click();
        await page.waitForTimeout(500);
      }
    },
    altText:
      "Automatic Activity Capture view showing KMS encryption details and 4-tier match strategy",
    keywords: [
      "Activity Capture",
      "Email Sync",
      "KMS Protection",
      "Privacy Shield",
    ],
  },
  {
    num: "12",
    id: "command-palette-search",
    title: "Global Omnibar & Command Palette (⌘K)",
    description:
      "Keyboard-first navigation, fuzzy record lookup, and instantaneous command actions.",
    path: "/deals",
    prepare: async (page: Page) => {
      await page.keyboard.press("Meta+k");
      await page.waitForTimeout(500);
    },
    altText:
      "Command palette dialog open over Kanban board showing quick navigation shortcuts",
    keywords: [
      "Command Palette",
      "Global Search",
      "Keyboard Navigation",
      "Productivity",
    ],
  },
  {
    num: "13",
    id: "theme-high-contrast",
    title: "Accessibility Theme & High-Contrast Showcase",
    description:
      "WCAG 2.2 AA compliant high-contrast mode with crisp visual boundaries.",
    path: "/",
    themes: ["high-contrast"],
    altText:
      "Executive dashboard rendered in high-contrast accessibility theme with distinct borders",
    keywords: [
      "Accessibility",
      "High Contrast",
      "WCAG 2.2 AA",
      "Theme Showcase",
    ],
  },
  {
    num: "14",
    id: "mobile-kanban-pipeline",
    title: "Mobile Responsive Pipeline Experience",
    description:
      "Compact touch-friendly Kanban pipeline optimized for 390px mobile screens.",
    path: "/deals",
    viewports: ["mobile"],
    altText:
      "Mobile viewport of CRM pipeline showing stage cards and clean touch layout",
    keywords: ["Mobile CRM", "Responsive Design", "Mobile Kanban", "Touch UI"],
  },
  {
    num: "15",
    id: "mobile-contact-profile",
    title: "Mobile Customer 360 Record View",
    description:
      "Clean responsive mobile profile with contact details, status badges, and action bars.",
    path: "/records/people/01a149ef-112a-7341-872b-590a58950b56",
    viewports: ["mobile"],
    altText:
      "Mobile view of customer profile with contact information and activity timeline",
    keywords: [
      "Mobile Profile",
      "Customer 360",
      "Contact Management",
      "Mobile UX",
    ],
  },
];

async function applyCleanStyles(
  page: Page,
  theme: "light" | "dark" | "high-contrast",
) {
  await page.evaluate((t) => {
    document.documentElement.classList.remove("light", "dark", "high-contrast");
    document.documentElement.classList.add(t);
    document.documentElement.setAttribute("data-theme", t);
    localStorage.setItem("nexus-theme", t);

    // Inject clean-frame styles: hide scrollbars, disable animations, hide dev overlays
    const styleId = "nexus-screenshot-clean-style";
    let style = document.getElementById(styleId);
    if (!style) {
      style = document.createElement("style");
      style.id = styleId;
      document.head.appendChild(style);
    }
    style.innerHTML = `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
        caret-color: transparent !important;
      }
      ::-webkit-scrollbar {
        display: none !important;
      }
      body {
        scrollbar-width: none !important;
      }
      [data-nextjs-toast], #next-route-announcer {
        display: none !important;
      }
    `;
  }, theme);
}

// Safety and Privacy Verification
async function runPrivacyScan(page: Page): Promise<void> {
  const content = await page.evaluate(() => document.body.innerText || "");

  // Forbidden patterns: real AWS keys, secret API keys, JWT patterns
  const forbiddenRegexes = [
    { pattern: /AKIA[0-9A-Z]{16}/, name: "AWS Access Key ID" },
    { pattern: /sk_live_[0-9a-zA-Z]{24}/, name: "Stripe Live Secret Key" },
    { pattern: /rzp_live_[0-9a-zA-Z]{14}/, name: "Razorpay Live Key" },
    {
      pattern: /eyJ[a-zA-Z0-9_-]{20,}\.eyJ[a-zA-Z0-9_-]{20,}/,
      name: "Raw JWT Token",
    },
  ];

  for (const { pattern, name } of forbiddenRegexes) {
    if (pattern.test(content)) {
      throw new Error(
        `[SECURITY ALERT] Privacy scan failed: Detected ${name} in DOM`,
      );
    }
  }
}

async function main() {
  console.log(`Starting repeatable screenshot pipeline...`);
  console.log(`Output Directory: ${OUT_DIR}`);

  const rawDir = path.join(OUT_DIR, "01-raw-screenshots");
  const postCopyDir = path.join(OUT_DIR, "07-post-copy");
  fs.mkdirSync(rawDir, { recursive: true });
  fs.mkdirSync(postCopyDir, { recursive: true });

  const browser: Browser = await chromium.launch({ headless: true });

  const manifest: Array<{
    file: string;
    screenId: string;
    title: string;
    theme: string;
    viewport: string;
    altText: string;
    keywords: string[];
  }> = [];

  for (const screen of SCREENS) {
    const targetThemes = screen.themes || ["dark", "light"];
    const targetViewports = screen.viewports || ["desktop"];

    for (const vp of targetViewports) {
      let width = 1440;
      let height = 900;
      let isMobile = false;

      if (vp === "mobile") {
        width = 390;
        height = 844;
        isMobile = true;
      } else if (vp === "tablet") {
        width = 820;
        height = 1180;
      }

      for (const theme of targetThemes) {
        const context = await browser.newContext({
          viewport: { width, height },
          deviceScaleFactor: 2,
          isMobile,
          locale: "en-IN",
          timezoneId: "Asia/Kolkata",
        });

        // Initialize session
        await context.addInitScript(() => {
          localStorage.setItem("nexus-token", "demo-session-token");
          localStorage.setItem("nexus-locale", "en-IN");
        });

        const page = await context.newPage();

        try {
          console.log(
            `Capturing: ${screen.num}-${screen.id} [${theme}] [${vp}]...`,
          );
          await page.goto(`${BASE_URL}${screen.path}`, {
            waitUntil: "networkidle",
            timeout: 30000,
          });
          await page.waitForTimeout(800);

          await applyCleanStyles(page, theme);
          await page.waitForTimeout(400);

          if (screen.prepare) {
            await screen.prepare(page);
            await applyCleanStyles(page, theme);
            await page.waitForTimeout(400);
          }

          // Safety privacy scan
          await runPrivacyScan(page);

          const subFolder =
            vp === "mobile" ? "mobile" : theme === "light" ? "light" : "dark";
          const fileName = `${screen.num}-${screen.id}__${theme}__${vp}.png`;
          const filePath = path.join(rawDir, subFolder, fileName);
          fs.mkdirSync(path.dirname(filePath), { recursive: true });

          await page.screenshot({ path: filePath });

          // Also generate WebP version via sips
          const webpName = `${screen.num}-${screen.id}__${theme}__${vp}.webp`;
          const webpPath = path.join(rawDir, subFolder, webpName);
          try {
            execSync(
              `sips -s format webp "${filePath}" --out "${webpPath}" 2>/dev/null`,
            );
          } catch {
            // fallback
          }

          manifest.push({
            file: `01-raw-screenshots/${subFolder}/${fileName}`,
            screenId: screen.id,
            title: screen.title,
            theme,
            viewport: vp,
            altText: screen.altText,
            keywords: screen.keywords,
          });
        } catch (err: any) {
          console.error(
            `Error capturing ${screen.id} (${theme}, ${vp}):`,
            err.message,
          );
        } finally {
          await context.close();
        }
      }
    }
  }

  await browser.close();

  // Save Manifest
  const manifestPath = path.join(postCopyDir, "manifest.json");
  fs.writeFileSync(
    manifestPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        totalScreens: manifest.length,
        manifest,
      },
      null,
      2,
    ),
  );
  console.log(`Manifest written to: ${manifestPath}`);
  console.log(
    `Step 1 Captures Completed: ${manifest.length} screenshot files captured.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
