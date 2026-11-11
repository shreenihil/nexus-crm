# Nexus CRM Quickstart Guide

Get up and running with Nexus CRM in less than 5 minutes on your local development machine or private server.

## Prerequisites
- **Node.js**: >= 20.x (`node -v`)
- **pnpm**: >= 10.x (`pnpm -v`)
- **Git**

## Step 1: Clone the Repository
```bash
git clone https://github.com/nexus-crm/nexus.git
cd nexus
```

## Step 2: Initialize Environment
Run the POSIX init script to generate CSPRNG cryptographic seeds, secure cookie signing keys, and initialize `.env`:
```bash
./scripts/init
```
*(On Windows PowerShell, run: `powershell -ExecutionPolicy Bypass -File .\scripts\init.ps1`)*

## Step 3: Install Dependencies
```bash
pnpm install
```

## Step 4: Start Development Services
```bash
pnpm dev
```
Once started, the following services will be available:
- **Next.js Web Frontend**: [http://localhost:3000](http://localhost:3000)
- **Fastify API Server**: [http://localhost:4000](http://localhost:4000)
- **Interactive Swagger / OpenAPI Docs**: [http://localhost:4000/docs](http://localhost:4000/docs)
- **System Metrics & Telemetry**: [http://localhost:4000/metrics](http://localhost:4000/metrics)

## Step 5: Complete Setup Wizard
1. Check your terminal output for your one-time high-entropy setup token:
   ```
   ============================================================
   NEXUS CRM SETUP TOKEN: <your-token>
   Visit http://localhost:3000/setup to complete instance setup.
   ============================================================
   ```
2. Navigate to [http://localhost:3000/setup](http://localhost:3000/setup).
3. Paste the setup token, specify your admin name, email, password, and primary workspace currency (`INR` default).
4. Complete setup and access your dashboard.

## Next Steps
- Read the [Self-Hosting Guide](./SELF_HOSTING_GUIDE.md) for Docker and Kubernetes deployments.
- Read the [Pluggable Storage Guide](./PLUGGABLE_STORAGE_GUIDE.md) to connect external PostgreSQL or S3.
