# Sample Data Inventory

> Generated as part of **Step 2 — Remove All Sample Data** per [`docs/ONBOARDING_AND_MARKETING_BRIEF.md`](file:///Users/shreenihilvijayan/.gemini/antigravity-ide/scratch/nexus-crm/docs/ONBOARDING_AND_MARKETING_BRIEF.md).
> Safety net tag created: `pre-sample-data-removal`.
> Snapshot stored in: `<chosen-folder>/_private/demo-snapshot.sql` and `demo-snapshot.json`.

---

## 1. Inventory Summary

The following mock and sample data records were identified across the codebase:

### A. Demo Business Records (`apps/api/src/db/index.ts`)
- **Companies (8 records):**
  - Stark Industries (`starkindustries.com`, Manufacturing / Defense, ₹450 Cr ARR)
  - Wayne Enterprises (`waynecorp.com`, Defense & Technology, ₹850 Cr ARR)
  - Acme Corporation (`acme.corp`, Enterprise Infrastructure, ₹120 Cr ARR)
  - Pied Piper Compression (`piedpiper.com`, Cloud Technology, ₹65 Cr ARR)
  - Cyberdyne Systems (`cyberdyne.io`, Robotics & AI, ₹210 Cr ARR)
  - Initech Software (`initech.corp`, Enterprise Services, ₹40 Cr ARR)
  - Umbrella Health (`umbrella.med`, Biotechnology, ₹380 Cr ARR)
  - Hooli Cloud (`hooli.xyz`, Internet Software, ₹950 Cr ARR)
- **People / Contacts (8 records):**
  - Tony Stark (CEO & Chief Engineer, `tony@starkindustries.com`)
  - Anthony Stark (`tony.stark@starkindustries.com` — candidate duplicate)
  - Bruce Wayne (Chairman, `bruce@waynecorp.com`)
  - Pepper Potts (Chief Operating Officer, `pepper@starkindustries.com`)
  - Peter Parker (Lead Research Scientist, `peter@starkindustries.com`)
  - Richard Hendricks (CEO & Architect, `richard@piedpiper.com`)
  - Bertram Gilfoyle (Chief Systems Architect, `gilfoyle@piedpiper.com`)
  - Arthur Dent (Demo Account Founder, `founder@acme.inc`)
- **Deals / Opportunities (6 records):**
  - Stark Enterprises Cloud Migration (₹1,80,000 / Negotiation)
  - Wayne Corp Security Audit (₹95,000 / Proposal Sent)
  - Pied Piper Platform Expansion (₹65,000 / Closed Won)
  - Cyberdyne Systems Neural Core (₹3,20,000 / Discovery)
  - Initech TPS Modernization (₹45,000 / Qualified)
  - Defense Telecom Mesh Network (₹75,00,000 / Negotiation — §12.8 escalation)
- **Activities & Polymorphic Timelines:**
  - Phone calls, discovery meetings, product demos, contract reviews.
- **Communications:**
  - Test inbound/outbound emails and SMS messages.
- **Quotes & Invoices:**
  - Quote `Q-2026-001` with SaaS licensing line items.

### B. Seed Scripts & Test Helpers
- `apps/api/src/db/index.ts`: `seedDemoData(force = false)` method.
- `apps/api/src/server.ts`: `POST /v1/test/reset-demo` endpoint.

---

## 2. Separation of System Defaults vs. Sample Data

Per §2.3, **System Defaults** are explicitly preserved in the production codebase and listed in [`docs/SYSTEM_DEFAULTS.md`](file:///Users/shreenihilvijayan/.gemini/antigravity-ide/scratch/nexus-crm/docs/SYSTEM_DEFAULTS.md).

**Clean Workspace Invariant:**
When any workspace is created or sign-up occurs:
```ts
people.length === 0
companies.length === 0
deals.length === 0
activities.length === 0
quotes.length === 0
invoices.length === 0
```
