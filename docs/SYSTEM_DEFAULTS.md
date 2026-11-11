# System Defaults — Canonical Baseline Specification

> In accordance with [`docs/ONBOARDING_AND_MARKETING_BRIEF.md`](file:///Users/shreenihilvijayan/.gemini/antigravity-ide/scratch/nexus-crm/docs/ONBOARDING_AND_MARKETING_BRIEF.md) §2.3, this document defines the immutable **system defaults** required for product operation. These are distinct from sample/demo data and are preserved permanently.

---

## 1. Standard Object Definitions
Every workspace is provisioned with 4 foundational standard CRM objects:
1. **People (`people`)**: Contact management (`first_name`, `last_name`, `email`, `phone`, `title`, `lifecycle_stage`).
2. **Companies (`companies`)**: Organization profiles (`name`, `domain`, `industry`, `annual_revenue`, `city`, `country`).
3. **Deals (`deals`)**: Commercial pipeline opportunities (`name`, `amount`, `stage`, `probability`, `close_date`, `currency`).
4. **Activities (`activities`)**: Interaction timeline records (`type`, `subject`, `status`, `due_date`, `description`).

## 2. Default Pipeline Stages (Empty)
The standard B2B sales pipeline stages (configured with zero deal records on initialization):
1. **Qualification** (Probability: 10%)
2. **Discovery** (Probability: 25%)
3. **Proposal Sent** (Probability: 50%)
4. **Negotiation** (Probability: 75%)
5. **Closed Won** (Probability: 100%, Won Stage)
6. **Closed Lost** (Probability: 0%, Lost Stage)

## 3. Built-in Roles & Permissions (RBAC Matrix)
1. **Admin**: Unrestricted tenant administration, BYOK encryption, schema design, audit logs.
2. **Manager**: Team oversight, pipeline management, quote approval authorization.
3. **Sales Rep**: Territory-scoped deal management, record creation, contact updates.
4. **Read-Only / Auditor**: Non-destructive view access, tamper-evident audit ledger inspection.

## 4. ISO-4217 Currency Table & Formatting
- **Base Currency**: `INR` (Indian Rupee, ₹) default with lakh (`L`) and crore (`Cr`) formatting.
- **Enabled Currencies**: `INR`, `USD`, `EUR`, `GBP`, `AED`, `SGD`, `AUD`, `CAD`, `JPY`, `CHF`, `SAR`, `ZAR`.
- Exchange rate snapshot service and ISO-4217 rounding tables.

## 5. GST Rate Tables & CPQ Tax Rules
- Intra-state transaction tax mapping: CGST (9%) + SGST (9%) = 18%.
- Inter-state transaction tax mapping: IGST (18%).

## 6. Theme Tokens & i18n Catalogues
- Theme tokens: Light, Dark, System, High-Contrast, Accent colors.
- Language catalogues: `en-IN` (English - India) and `hi-IN` (Hindi).
