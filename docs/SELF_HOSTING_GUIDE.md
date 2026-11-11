# Self-Hosting Production Guide

This guide provides instructions for deploying Nexus CRM in single-node production environments (Docker Compose with Caddy) or high-availability clusters (Kubernetes with Helm).

## Minimum Hardware Requirements
| Metric | Minimum (Small Office) | Recommended (Enterprise) |
| :--- | :--- | :--- |
| **CPU** | 2 vCPUs | 4 - 8 vCPUs |
| **RAM** | 4 GB | 16 GB |
| **Disk** | 20 GB SSD | 100+ GB NVMe |
| **Network** | 100 Mbps | 1 Gbps+ |

---

## 1. Production Docker Compose Deployment

Nexus CRM provides a complete, hardened `docker-compose.yml` including Caddy with automatic TLS, PostgreSQL with `pgvector`, MinIO object storage, Redis queue/cache, and segmented internal networks.

### 1.1 Bootstrap Environment
```bash
./scripts/init
```
Edit `.env` to configure your production domain and TLS settings:
```ini
APP_URL=https://crm.yourcompany.com
POSTGRES_PASSWORD=your_strong_db_password
COOKIE_SECRET=your_32_character_cookie_secret
```

### 1.2 Start Services
```bash
docker compose up -d
```

### 1.3 Verify Health
```bash
docker compose ps
curl -f http://localhost/health
```

### 1.4 Complete Setup
Check container logs for the one-time setup token:
```bash
docker compose logs api | grep "NEXUS CRM SETUP TOKEN"
```
Visit `https://crm.yourcompany.com/setup` in your browser to finalize instance configuration.

---

## 2. Kubernetes / Helm Deployment

A production-ready Helm chart is located under `infra/helm/crm`.

### 2.1 Configure Values
Create `my-values.yaml`:
```yaml
global:
  domain: "crm.yourcompany.com"
  environment: "production"

ingress:
  enabled: true
  className: "nginx"
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
  tls:
    - secretName: crm-tls
      hosts:
        - crm.yourcompany.com

database:
  host: "postgres.production.internal"
  user: "nexus"
  existingSecret: "nexus-db-secret"
  secretKeyRef: "password"
```

### 2.2 Install Chart
```bash
helm upgrade --install nexus ./infra/helm/crm -f my-values.yaml --namespace crm --create-namespace
```

### 2.3 Retrieve Setup Token
```bash
kubectl logs -n crm -l app.kubernetes.io/component=api | grep "SETUP TOKEN"
```

---

## 3. Backup and Disaster Recovery (DR)

### 3.1 CLI Point-in-Time Snapshot
```bash
pnpm crm backup -o /var/backups/nexus-backup-$(date +%F).json
```

### 3.2 Automated Database Dump
```bash
docker compose exec postgres pg_dump -U nexus nexus_db > /var/backups/pg_dump_$(date +%F).sql
```

### 3.3 Restore Snapshot
```bash
pnpm crm restore /var/backups/nexus-backup-2026-10-18.json
```
