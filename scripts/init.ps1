# ==============================================================================
# NEXUS CRM - Windows PowerShell Bootstrap & Secret Generation Script
# ==============================================================================
$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  🚀 Nexus CRM Sovereign Instance Bootstrap (Windows)" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$envFile = ".env"
if (Test-Path $envFile) {
    $timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
    Write-Host "⚠️  Existing .env found. Backing up to .env.backup.$timestamp..." -ForegroundColor Yellow
    Copy-Item $envFile ".env.backup.$timestamp"
}

# Generate cryptographically secure random bytes
function Get-SecureSecret([int]$length, [string]$format = "hex") {
    $bytes = New-Object byte[] $length
    [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    if ($format -eq "base64url") {
        return [Convert]::ToBase64String($bytes).Replace('+', '-').Replace('/', '_').Replace('=', '')
    }
    return ($bytes | ForEach-Object { "{0:x2}" -f $_ }) -join ''
}

$dbPass = Get-SecureSecret 24 "base64url"
$cookieSecret = Get-SecureSecret 32 "hex"
$minioSecret = Get-SecureSecret 24 "base64url"
$kmsSeed = Get-SecureSecret 32 "hex"
$webhookSecret = Get-SecureSecret 32 "hex"
$setupToken = Get-SecureSecret 16 "hex"

$envContent = @"
# ==============================================================================
# NEXUS CRM - GENERATED PRODUCTION ENVIRONMENT CONFIGURATION
# Generated At: $([DateTime]::UtcNow.ToString("o"))
# ==============================================================================
NODE_ENV=production
PORT=4000
API_URL=http://localhost:4000
NEXT_PUBLIC_API_URL=http://localhost:4000
CORS_ORIGIN=http://localhost:3000

# Primary Database (PostgreSQL 16+)
POSTGRES_USER=nexus
POSTGRES_PASSWORD=$dbPass
POSTGRES_DB=nexus_crm
POSTGRES_PORT=5432
DATABASE_URL=postgres://nexus:$dbPass@postgres:5432/nexus_crm

# Cache & Queue Broker (Redis 7)
REDIS_URL=redis://redis:6379

# Object Storage (MinIO / S3 Compatible)
S3_ENDPOINT=http://minio:9000
S3_ACCESS_KEY=nexus_admin
S3_SECRET_KEY=$minioSecret
S3_BUCKET=nexus-vault

# Security, Tokens & Envelope Encryption
COOKIE_SECRET=$cookieSecret
NEXUS_MASTER_KEY_SEED=$kmsSeed
WEBHOOK_SIGNING_SECRET=$webhookSecret

# Setup Wizard One-Time Token (Valid for Initial Boot Only)
NEXUS_SETUP_TOKEN=$setupToken
"@

Set-Content -Path $envFile -Value $envContent -Encoding UTF8

Write-Host "✅ Environment configured at $envFile" -ForegroundColor Green
Write-Host ""
Write-Host "🔑 ONE-TIME INSTANCE SETUP TOKEN:" -ForegroundColor Green
Write-Host "   👉 $setupToken" -ForegroundColor White -BackgroundColor DarkGreen
Write-Host ""
Write-Host "⚠️  CRITICAL: Store your NEXUS_MASTER_KEY_SEED securely offline." -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan
