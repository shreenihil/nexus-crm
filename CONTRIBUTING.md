# Contributing to Nexus CRM

Thank you for your interest in contributing to Nexus CRM! We are building the sovereign, open-source, programmable CRM for modern businesses worldwide.

## Developer Certificate of Origin (DCO)
All contributions must include a DCO sign-off in the commit message. By signing your commit, you certify that you wrote the code or have the right to submit it under the Apache-2.0 license.

To sign your commit automatically:
```bash
git commit -s -m "feat(storage): implement SQLite WAL streaming adapter"
```

## Local Development Setup

### Prerequisites
- Node.js >= 20.x
- pnpm >= 10.x
- Docker & Docker Compose (optional for Tier 1 databases)

### 1-Click Bootstrap
```bash
# Clone the repository
git clone https://github.com/nexus-crm/nexus.git
cd nexus

# Run the cryptographically secure bootstrap script
./scripts/init

# Install workspace dependencies
pnpm install

# Start development services
pnpm dev
```
- API server runs at `http://localhost:4000`
- Web application runs at `http://localhost:3000`
- Swagger/OpenAPI interactive docs at `http://localhost:4000/docs`

## Code Style & Testing Standards
- **TypeScript**: Strict typechecking must pass across all packages:
  ```bash
  pnpm turbo typecheck
  ```
- **Automated Testing**: Every new feature or bugfix must be accompanied by comprehensive tests in Vitest:
  ```bash
  pnpm test
  ```
- **Formatting**: Code formatting is enforced via repository tools.
- **Zero Hardcoded Currency**: Always support multi-currency, defaulting to INR (`₹`).
- **Zero Sample Data**: Never commit mock or hardcoded business records into production initialization paths.

## Pull Request Guidelines
1. Fork the repository and create your branch from `main`:
   ```bash
   git checkout -b feat/my-new-feature
   ```
2. Write clean, modular TypeScript code with descriptive variable names and JSDoc annotations where helpful.
3. Run `pnpm test` and `pnpm turbo typecheck` to ensure 100% test passing and zero type errors.
4. Push to your fork and submit a Pull Request targeting `main`.
5. PR descriptions should clearly outline the problem, architectural changes, and testing evidence.

## Security Vulnerabilities
If you discover a security vulnerability, **do not open a public issue**. Please report it responsibly according to our policy described in [SECURITY.md](./SECURITY.md).
