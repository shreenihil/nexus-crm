# Nexus CRM — Operations & Incident Response Runbook

## 1. Local Environment Operations
- **Booting entire stack:**
  ```bash
  docker compose -f infra/docker-compose.yml up -d
  pnpm dev
  ```
- **Stopping local services:**
  ```bash
  docker compose -f infra/docker-compose.yml down
  ```

## 2. Database Backup & Point-in-Time Recovery
- **Encrypted Database Backup:**
  ```bash
  docker exec -t nexus-postgres pg_dump -U nexus_app -d nexus_crm -F c | \
    openssl enc -aes-256-cbc -salt -pbkdf2 -out backup_$(date +%Y%m%d_%H%M%S).dump.enc
  ```
- **Database Restore:**
  ```bash
  openssl enc -d -aes-256-cbc -pbkdf2 -in backup.dump.enc | \
    docker exec -i nexus-postgres pg_restore -U nexus_app -d nexus_crm --clean --if-exists
  ```

## 3. Cryptographic Key Rotation Procedure
1. **Session & Cookie Secrets:**
   - Update `COOKIE_SECRET` with new 256-bit key. Previous sessions will expire gracefully without server downtime.
2. **Audit Hash Ledger Checkpoints:**
   - Periodic signed checkpoints are created by hashing the head of `audit_events`.
   - Run `/v1/audit/verify` to confirm ledger integrity before and after database migrations.

## 4. Disaster Recovery & Zero-Downtime Schema Migrations
- Always follow the **Expand → Migrate → Contract** pattern.
- Database DDL changes are tested against an exact replica of seed data before deployment.
