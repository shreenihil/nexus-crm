# FOLLOW-UP MASTER PROMPT — Screenshots for LinkedIn → Remove Sample Data → Onboarding Walkthrough

> Saved from user follow-up prompt. This brief **adds to** the master brief; where they conflict, the stricter rule wins (security, accessibility, design tokens, no hard-coded currency, INR-first).

---

## 0. YOUR ROLE, RULES AND ORDER OF WORK

You are a senior product engineer, UX designer and technical marketer. Do **four jobs in a strict order**. Do not reorder them — the order exists so the marketing screenshots look great *and* the shipped app ends up with zero sample data.

| Step | Job | Why this order |
|---|---|---|
| **1** | Ask me where to store files, then capture **LinkedIn-grade screenshots of the existing app while its demo data is still present** | A populated UI looks like a real product; an empty one doesn't |
| **2** | **Remove all sample/demo/mock data** from the product (with a safety net) | The app must ship clean |
| **3** | **Design and implement the Onboarding system** (welcome screen, onboarding carousel, product tour with coach marks and tooltips, interactive walkthrough, checklist) | Replaces sample data as the "first-run experience" |
| **4** | Capture **onboarding screenshots, a screen recording, and build the LinkedIn slideshow/carousel assets + post copy** | Final marketing package |

Operating rules:
1. **Plan first.** Produce one Implementation Plan artifact covering all four steps (files touched, risks, test plan). Wait for my approval, then execute step by step, reporting at the end of each step with evidence.
2. **Never skip verification.** Run type-check, lint, unit/integration/E2E and accessibility tests, and *look at* every screenshot you produce before reporting it (open it, check for clipping, leaked secrets, dev overlays, wrong theme, placeholder text).
3. **Safety net before destruction.** Before Step 2, create a git tag `pre-sample-data-removal` (run `git init` and commit first if the project isn't a repo). Nothing is lost; it is just no longer in the shipped app.
4. **Follow the master brief:** design tokens only (no hard-coded colours/px), INR-first and no hard-coded currency symbols, WCAG 2.2 AA, light/dark/high-contrast themes, i18n-ready strings (English-India default, Hindi second), server-side security.
5. **No fabricated claims.** Screenshots, captions and slides must only show features that actually work in the app at that moment. Do not mock up features that don't exist.
6. **Ask only when blocked.** Record every default you pick in `/docs/DECISIONS.md`.

---

## 1. STEP 1 — ASK ME FOR THE STORAGE FOLDER, THEN CAPTURE SCREENSHOTS

### 1.1 First action (mandatory, before anything else)
**Ask me:** *"Where should I store the screenshots and marketing assets? Please give me an absolute folder path (e.g. `D:\Projects\CRM\marketing\linkedin` or `~/Pictures/crm-linkedin`). I'll create the subfolders inside it."*
- **Wait for my answer.** Do not guess a path. If the IDE needs permission to write outside the workspace, request it through the IDE's normal file-access prompt and tell me exactly which folder you are asking for and why.
- After I answer: confirm the folder exists and is writable by writing and deleting a small test file; then create this structure inside it:

```
<my-folder>/
  01-raw-screenshots/        full-resolution PNGs, light + dark
    light/  dark/  mobile/
  02-linkedin-images/        branded, cropped, LinkedIn-ready images
  03-carousel/               slide PNGs + the combined PDF (document post)
  04-onboarding/             onboarding-flow screenshots + recording
  05-video/                  MP4 (+ GIF fallback) of the product tour
  06-slideshow-html/         self-contained HTML slideshow
  07-post-copy/              caption, hashtags, alt text, manifest.json
  _private/                  temporary demo snapshot (never committed, deleted at the end)
```
- Also copy a `README.txt` into the folder explaining what each subfolder is.
- Add the folder to `.gitignore` if it is inside the repo (large binaries stay out of git), except `07-post-copy/`.

### 1.2 Repeatable capture pipeline (build it as code, don't click manually)
Create `/tools/screenshots/` with a **Playwright** script (`pnpm screenshots`) that reads the destination folder from an env var `SCREENSHOT_OUT_DIR` (set from my answer) and:
- Boots the app against a **local, throwaway database** seeded with the current demo data (this is the *last* time demo data is used).
- Captures at **deviceScaleFactor 2** (retina-sharp), desktop viewport **1440×900** (also a 1920×1080 set), tablet **820×1180**, mobile **390×844**.
- Captures each screen in **light and dark** themes (and one **high-contrast** sample), **English-India** locale with **₹ INR** amounts shown in lakh/crore format.
- **Cleans the frame:** hides dev tools, Next.js/React overlays, cookie banners, browser chrome, scrollbars, caret blinking, toasts that aren't intended; freezes animations/transitions and the clock (fixed date/time) so shots are reproducible; waits for network-idle and fonts loaded; no skeletons or spinners in any shot.
- Writes files as `NN-screen-name__theme__viewport.png` and registers each in `07-post-copy/manifest.json` with `{file, title, description, alt_text, keywords[]}`.
- Optimises a second copy as WebP (quality ~85) for web use.

### 1.3 Screens to capture (every one must look polished and be a real, working feature)
1. **Dashboard** — KPI tiles in ₹ (e.g. ₹12.5 L, ₹3.2 Cr), pipeline funnel, forecast, drill-down hover state.
2. **Kanban pipeline** — multiple stages, weighted ₹ totals per column, a card mid-drag.
3. **Record page (split-pane)** — company/person profile with timeline, related records, inline edit.
4. **Data model builder** — creating a custom object, attributes, relationships.
5. **Duplicate Resolution Center** — candidate pair, confidence score, field-by-field merge.
6. **Workflow builder canvas** — node-based automation with branching and parallel paths.
7. **Quote / CPQ builder** and the generated **GST invoice PDF** (CGST+SGST, amount in words, INR).
8. **Roles & permissions** — object/row/field-level security matrix; a hidden-field example.
9. **Audit log viewer** — tamper-evident events.
10. **Webhooks & Dead-Letter Queue** — delivery log, retry, replay.
11. **Command palette (⌘/Ctrl K)** open over a populated view.
12. **Theme showcase** — same screen in light, dark, high-contrast, and two accent colours side by side.
13. **Multi-currency** — a deal in USD with its ₹ equivalent and rate note.
14. **Mobile** — dashboard, pipeline, and a record page at 390px.
15. **Analytics report builder** with a clickable chart drill-down.

### 1.4 Privacy & safety checks before any screenshot is accepted (automated + visual)
- No real names, emails, phone numbers, addresses, API keys, tokens, secrets, internal URLs, or `.env` values visible. Demo data must be obviously fictional (fake companies, fake GSTINs, `example.com` emails, `+91 98XXXXXX` style numbers).
- No third-party logos or trademarks displayed (competitors, payment providers, Google/Microsoft logos) unless they are part of an integration tile and used in a neutral way; otherwise blur or use generic icons.
- Run an automated scan on the DOM text before each capture that fails the shot if it matches patterns for emails (other than `example.*`), JWTs, `sk_`, `rzp_`, `AKIA`, private IPs, or `localhost` in visible text.
- Report to me any shot that needed manual redaction.

**Step 1 exit gate:** all 15 screens captured in light + dark (+ mobile set), manifest written, files visible in my chosen folder, I have been shown a contact sheet (one image grid of all shots) and have approved it.

---

## 2. STEP 2 — REMOVE ALL SAMPLE DATA (and prove it)

### 2.1 Take a private snapshot for marketing only
Before deleting anything: dump the current demo database to `<my-folder>/_private/demo-snapshot.sql` (outside git, listed in `.gitignore`). This is used **only** to take the onboarding screenshots in Step 4 and is **deleted at the end** (ask me to confirm deletion).

### 2.2 Inventory first
Search the whole repo and produce `/docs/SAMPLE_DATA_INVENTORY.md` listing every place sample data exists, including: seed scripts and `/seed` folder, `faker`/`@faker-js` usage, fixtures, hard-coded arrays/objects of fake people/companies/deals in components or pages, mock API handlers (MSW etc.), demo tenant/workspace creation, "Demo"/"Sample"/"Acme"/"John Doe" strings, placeholder avatars and charts with static numbers, storybook/design-system stories that ship with fake records, test fixtures leaking into production code, README/docs sections telling users to load demo data, and database migrations that insert non-system rows.

### 2.3 Remove, with these rules
- **Delete or relocate** everything in the inventory from the shipped app: `/seed` demo scripts, demo workspace creation, hard-coded mock arrays, mock handlers in production paths, `pnpm seed:demo` commands and docs.
- **Allowed to remain (system defaults, not sample data):** standard object definitions (People, Companies, Deals, Activities), built-in roles and permissions, the ISO-4217 currency table, the default pipeline *template stages* (empty, no deals), GST rate tables, theme tokens, and i18n catalogues. List these precisely in `/docs/SYSTEM_DEFAULTS.md` so there is a clear line between "system defaults" and "sample data".
- **Test fixtures** may remain **only** inside test directories, generated by factories, never imported by application code and never included in the production bundle. Add an import-boundary lint rule enforcing this.
- **Replace** every spot that used fake data with a proper **empty state** (illustration or icon + one-line explanation + one primary action such as "Add your first company", "Import contacts", "Connect your email"). Charts and KPI tiles show a purposeful zero/empty state, not fake numbers.
- **New-workspace flow** must create a workspace containing **zero business records**.

### 2.4 Prove it (all required)
1. A CI test boots a fresh database, runs migrations, creates a new workspace via the real sign-up flow, and asserts: `people = companies = deals = activities = quotes = invoices = 0` and only the system defaults exist.
2. A **production-bundle scan** fails the build if the built JS/HTML contains forbidden markers (`faker`, `mockData`, `sampleData`, `demoData`, `John Doe`, `Acme`, known fake names) — configurable list in `/tools/ci/forbidden-strings.txt`.
3. `grep` report attached showing zero hits in `/apps` and `/packages` for the same list (excluding test dirs).
4. Screenshots of **every main screen in its empty state** in light and dark (shows the empty states are designed, not broken).

**Step 2 exit gate:** tests green, bundle scan green, empty-state screenshots reviewed by me.

---

## 3. STEP 3 — BUILD THE ONBOARDING SYSTEM

Industry vocabulary to reflect in **code names, docs, analytics event names and marketing alt text** (do **not** keyword-stuff the visible UI copy — keep the UI copy short, human and helpful): *App Onboarding, Onboarding Walkthrough, Onboarding Flow, Onboarding Carousel, Product Tour, App Tour, Coach Marks, Tooltips, Welcome Screen, Feature Walkthrough, Interactive Walkthrough, User Onboarding.*

### 3.1 Architecture (decided)
- New package `packages/onboarding` (UI in `packages/ui`, tokens from `packages/tokens`). Build the tour primitives on **Radix + Floating UI** (focus management, positioning, collision handling) instead of a heavy third-party tour library — record the ADR. Components: `WelcomeScreen`, `OnboardingCarousel`, `ProductTour`, `CoachMark`, `Tooltip` (reuse), `Spotlight` (dim overlay with cut-out), `InteractiveStep`, `OnboardingChecklist`, `FeatureWalkthrough`, `TourLauncher` (Help menu).
- **Declarative tour definitions** in typed config (`/packages/onboarding/tours/*.ts`): `{ id, version, audience(role/plan), steps[{ id, target: '[data-tour-id="..."]', title, body, placement, action?: {type:'click'|'input'|'navigate'|'drag', validate()}, skippable }] }`. Targets use stable `data-tour-id` attributes, never CSS classes.
- **State is server-side per user** (table `user_onboarding_state`: tour id + version, step, status `not_started|in_progress|completed|skipped|dismissed`, timestamps) so progress follows the user across devices; local cache only for flash-free rendering. Re-trigger a tour only when its **version** is bumped and the changes matter.
- **Security:** tour content is static, typed config — never render user-supplied HTML; spotlight/coach marks must not leak data the user can't access (targets inside permission-hidden UI are skipped automatically with a graceful fallback). Onboarding analytics are **privacy-respecting, opt-out-able, contain no record content or PII**, and are stored in our own DB (no third-party trackers).
- **Respect RBAC:** tours are filtered by role (Admin tour includes data-model/security/integrations; Sales Rep tour includes pipeline/activities/quotes; Finance tour includes invoices/payments; Read-only gets a light tour).

### 3.2 The flow (User Onboarding, end to end)
1. **Welcome Screen (first login only).** Full-screen, calm, branded. Friendly headline ("Welcome to <App> — let's set up your workspace in 2 minutes"), workspace name + logo, then **Region & currency** defaults (India · ₹ INR · en-IN · IST · April–March FY, all changeable), **role/goal picker** (Sales, Customer success, Founder/Admin, Finance, Other) which selects the tour track, **starting template** (B2B SaaS, Agency, Marketplace, Real Estate, Blank). Progress indicator, "Skip for now", keyboard-friendly, fully i18n.
2. **Onboarding Carousel (5–6 slides).** Swipeable/keyboard-navigable (←/→, Esc to close), progress dots, Back/Next/Skip, "Get started" on the last slide; slides: *(1) Your data, your way — custom objects*, *(2) Pipelines that move — Kanban*, *(3) Never log an email again — auto activity capture*, *(4) Clean data — duplicate detection*, *(5) Secure by design — roles & audit*, *(6) Quote to cash in ₹ — GST invoices*. Each slide: a **clean illustration or optimised product screenshot** (see 3.4), one headline, one sentence. Respect `prefers-reduced-motion` (cross-fade only), no autoplay without a pause control, focus trapped inside, announces slide changes via `aria-live`.
3. **Product Tour / App Tour with Coach Marks and Tooltips.** After the carousel, a short **spotlight tour** over the real UI (≈6–8 steps per role): sidebar navigation → global search & ⌘K command palette → create-new button → pipeline view → record page → settings. Coach marks have title, 1–2 lines, step counter ("3 of 7"), Back/Next/Skip, "Don't show again". Smart placement, scroll-into-view, repositions on resize, handles missing targets gracefully (skips with log), works at mobile widths (bottom-sheet variant).
4. **Interactive Walkthrough (learn by doing).** The user performs real actions, and the step **auto-advances when the action is detected** (e.g., "Add your first company" → they create one; "Drag your deal to the next stage"; "Connect your mailbox"; "Invite a teammate"; "Import contacts via CSV"). Each action has an alternative "Skip this step" and an **undo** safety (nothing destructive).
5. **Onboarding Checklist.** Persistent, collapsible card on Home: *Create workspace ✓ · Import or add first contacts · Create first pipeline/deal · Connect email & calendar · Invite a teammate · Set a theme · Create your first workflow · Generate your first quote*. Progress ring, celebrates completion (subtle, tasteful, reduced-motion safe), can be dismissed and reopened from Help.
6. **Feature Walkthroughs (contextual, on first visit to a module).** A one-time lightweight hint set the first time a user opens Workflows, Duplicates, Quotes, Dashboards or Data Model; each is a 2–4 step tour with coach marks and tooltips, triggered once and re-launchable.
7. **Help & replay.** Help menu → "Product tour", "What's new", "Keyboard shortcuts", "Restart onboarding", "Show checklist". Command palette command: *"Start product tour"*.
8. **Empty states as onboarding.** Every empty list/dashboard (created in Step 2) links to the relevant action or tour step.

### 3.3 UX and visual requirements
- Visual language follows the design system: tokens for colours/elevation/radius/motion, light/dark/high-contrast/accent themes, density-aware. The spotlight overlay uses a semantic token (e.g. `color-overlay-scrim`) and meets contrast in every theme.
- Micro-interactions ≤200 ms; no layout shift; no blocking modals except the Welcome Screen; the user can **always** exit (Esc, "Skip", click outside where safe) and resume later.
- **Accessibility (WCAG 2.2 AA):** focus moves into the coach mark and returns to the trigger on close, never trap focus on non-modal hints, `role="dialog"`/`aria-labelledby`/`aria-describedby` correctly set, step changes announced, all steps operable by keyboard, target size ≥24px, works with screen-reader and zoom 200%, reduced-motion path. Axe checks in CI for every onboarding screen in all themes.
- **i18n:** all strings in message catalogues with ICU plurals; English (India) + Hindi ship in this step; layouts tolerate ~40% text expansion and Devanagari line-height.
- **Performance:** onboarding code is **lazy-loaded** and never in the critical path for returning users; images optimised (WebP/AVIF, `srcset`, lazy loading, explicit width/height, ≤150 KB each); no layout shift (CLS < 0.1).

### 3.4 Images & illustrations for the in-app carousel and tour
- Create a consistent illustration set (SVG, token-coloured so they adapt to every theme; no hard-coded hex) for the 6 carousel slides and for empty states. Style: calm, minimal, flat geometric — consistent stroke width and corner radius.
- Where a product screenshot is more honest than an illustration, generate it with the Step-1 pipeline **from the demo snapshot only for marketing**; for in-app use prefer illustrations or UI rendered live from real components so **no sample data ships inside the app**.
- Provide meaningful `alt` text for every image (or `alt=""` when purely decorative).

### 3.5 Tests (all required)
- **Unit:** tour state machine (start/next/back/skip/complete/resume/version-bump), target resolution with missing elements, role filtering.
- **E2E (Playwright):** first login shows Welcome → Carousel → Tour; skip at each stage persists; resume after reload; interactive step auto-advances on real action; checklist progress updates; replay from Help; works at 1440/820/390; keyboard-only run-through; Hindi run; light/dark/high-contrast.
- **Security tests:** a user without access to a module never sees tour steps pointing to it; no PII in onboarding analytics.
- **Visual regression** snapshots for each onboarding component and theme.

**Step 3 exit gate:** all tests green, a11y green, I have walked the entire flow as a fresh user and approved it.

---

## 4. STEP 4 — ONBOARDING SCREENSHOTS, RECORDING AND THE LINKEDIN PACKAGE

### 4.1 Capture the onboarding flow (store in `04-onboarding/`)
Restore `_private/demo-snapshot.sql` into a **temporary local database** (never the shipped one) so the UI behind the coach marks looks real, then capture in light + dark at 1440×900@2x and mobile 390×844@2x:
- Welcome Screen (each stage) · each Onboarding Carousel slide · each Product Tour coach mark with spotlight (≥5) · a tooltip example · an Interactive Walkthrough step mid-action and completed · the Onboarding Checklist at 0%, 50%, 100% · Help/replay menu · a Feature Walkthrough on Workflows · the Hindi version of the Welcome Screen and one tour step · the empty-state screens with their CTAs.
- Record a **45–60 s screen capture** of the full first-run flow (Welcome → Carousel → Product Tour → first interactive step), 1920×1080 or 1080×1350 (portrait crop for mobile feeds), 30 fps, smooth cursor, no real data, no dev overlays → `05-video/` as **MP4 (H.264, AAC silent track optional)** plus a looping **GIF** (≤10 MB) fallback and a captioned version (burned-in subtitles).

### 4.2 Build the LinkedIn images (store in `02-linkedin-images/`)
Create a small branded template system (HTML/CSS → Playwright → PNG) using the app's own design tokens so marketing and product look like one system:
- **Single-image posts:** 1200×627 (landscape) and 1080×1080 (square) hero images: device frame around a screenshot, short headline, subtle gradient background, logo/wordmark, light **and** dark variants.
- **Portrait feed images:** 1080×1350 (4:5).
- **Composite shots:** side-by-side light/dark; before/after (empty state → onboarding); desktop + mobile together.
- Consistent typography, ≥4.5:1 contrast for all text on images, safe margins so LinkedIn crops never cut text, no tiny unreadable UI text (crop and zoom into the relevant part instead).

### 4.3 Build the carousel / slideshow (store in `03-carousel/` and `06-slideshow-html/`)
- **LinkedIn document carousel:** 8–10 slides at **1080×1350** (or 1080×1080), exported as individual PNGs **and one combined PDF** (document post). Suggested story arc: *(1) Hook: "I built a full CRM — here's the tour" → (2) Problem (CRM pain points) → (3) Data model & custom objects → (4) Kanban pipeline → (5) Security & audit → (6) Duplicate detection → (7) Workflows → (8) Quote-to-cash in ₹ with GST → (9) The onboarding flow (Welcome → Carousel → Product Tour → Interactive Walkthrough) → (10) CTA / what I learned + how to follow/contact.* One idea per slide, large readable type, consistent layout, slide numbers, last slide with call-to-action.
- **HTML slideshow:** a self-contained, keyboard/swipe-navigable slideshow (`06-slideshow-html/index.html`, no external network calls, images embedded or relative) for presenting or embedding on a portfolio site; light/dark; reduced-motion safe; accessible (headings, alt text, focus order).
- Verify LinkedIn's **current** image/PDF size and file-size limits before final export and note them in `07-post-copy/README.md` (limits change).

### 4.4 Post copy and discoverability (store in `07-post-copy/`)
Write: 
1. `linkedin-post.md` — **3 caption variants** (short ≈ 600 chars, medium, long-story) in my voice (first person, plain, no hype, no fabricated metrics or claims, no "revolutionary/game-changing"); a strong first two lines (the "hook" before LinkedIn's "…see more"); a clear CTA; **no claims about users, revenue or customers unless I provide them**.
2. `hashtags.md` — 8–12 relevant hashtags, grouped (e.g. `#CRM #UserOnboarding #AppOnboarding #ProductTour #UXDesign #UIUX #ProductDesign #SaaS #TypeScript #NextJS #BuildInPublic #WebDevelopment`), and a ranked keyword list drawn from the industry terms (App Onboarding, Onboarding Walkthrough, Onboarding Flow, Onboarding Carousel, Product Tour, App Tour, Coach Marks, Tooltips, Welcome Screen, Feature Walkthrough, Interactive Walkthrough, User Onboarding) used **naturally** in the caption, in each image's **alt text**, and in the PDF title/metadata, without stuffing.
3. `alt-text.md` — descriptive alt text (≤ 125 chars each) for every image and slide.
4. `manifest.json` — final list of every asset: path, dimensions, theme, purpose (which post/slide), alt text.
5. `project-summary.md` — a 150-word and a 60-word description of the project (what it is, the stack, key features, what's unique) for my LinkedIn "Projects" section and portfolio/README.

### 4.5 Final checks and cleanup
- Open and visually QA **every** exported file; produce a **contact sheet** (`contact-sheet.png`) and a checklist report: dimensions correct, text legible at phone size (preview each carousel slide at 375px width), no leaked data, consistent branding, correct theme, correct ₹ formatting, no dev overlays.
- Re-run the privacy scan (§1.4) on all final images' source DOM.
- **Delete `_private/demo-snapshot.sql` and the temporary database after asking me to confirm**, and re-run the Step-2 proof (§2.4) to show the shipped app still contains zero sample data.
- Update the project README with the onboarding feature description and a short "Product tour" section (using the real screenshots from the chosen folder via relative links or, if kept out of git, a note on where they live).

**Step 4 exit gate:** every deliverable present in my chosen folder; contact sheet approved; sample-data proof green after cleanup.

---

## 5. DELIVERABLE SUMMARY (what I expect to see in my folder at the end)

- `01-raw-screenshots/` — 15 core screens × light/dark (+ mobile, + high-contrast sample)
- `02-linkedin-images/` — 1200×627, 1080×1080, 1080×1350 variants, light + dark
- `03-carousel/` — 8–10 slide PNGs + `crm-linkedin-carousel.pdf`
- `04-onboarding/` — complete onboarding-flow screenshots (English + Hindi), checklist states, tooltips, coach marks
- `05-video/` — 45–60 s tour recording (MP4 + GIF + captioned version)
- `06-slideshow-html/` — standalone HTML slideshow
- `07-post-copy/` — captions (3 variants), hashtags, alt text, project summary, `manifest.json`
- In the repo: `packages/onboarding`, `/tools/screenshots`, `/docs/SAMPLE_DATA_INVENTORY.md`, `/docs/SYSTEM_DEFAULTS.md`, `/docs/DECISIONS.md` updates, CI gates for sample data and a11y.

## 6. DEFINITION OF DONE

Done when: (1) I told you the folder and all assets are in it and approved; (2) the shipped app has **zero** sample/demo/mock data, proven by tests, a bundle scan and a grep report; (3) a new user gets a polished, accessible, themed, bilingual onboarding experience — Welcome Screen → Onboarding Carousel → Product Tour with Coach Marks and Tooltips → Interactive Walkthrough → Checklist — with progress saved per user; (4) no secrets, personal data or false claims appear in any asset; (5) all tests, accessibility checks and CI gates are green.
