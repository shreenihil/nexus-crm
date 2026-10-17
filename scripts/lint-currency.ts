import * as fs from 'fs';
import * as path from 'path';

const ALLOWED_PATHS = [
  'packages/schema/src/currency',
  'scripts/lint-currency.ts',
  '__tests__',
  '.test.ts',
  '.spec.ts',
  'docs/',
  'test-results',
];

const FORBIDDEN_PATTERNS = [
  {
    name: 'Hard-coded dollar sign as currency literal',
    regex: /\$[0-9]/g,
  },
  {
    name: 'Hard-coded division by 100 for money',
    regex: /(?:amount|price|total|value|money)\s*\/\s*100(?![0-9])/gi,
  },
];

function isPathAllowed(filePath: string): boolean {
  return ALLOWED_PATHS.some((allowed) => filePath.includes(allowed));
}

function scanDirectory(dir: string, violations: string[]): void {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(process.cwd(), fullPath);

    if (
      entry.name === 'node_modules' ||
      entry.name === '.next' ||
      entry.name === 'dist' ||
      entry.name === '.turbo' ||
      entry.name === '.git'
    ) {
      continue;
    }

    if (entry.isDirectory()) {
      scanDirectory(fullPath, violations);
    } else if (
      entry.isFile() &&
      (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx') || entry.name.endsWith('.js'))
    ) {
      if (isPathAllowed(relPath)) {
        continue;
      }

      const content = fs.readFileSync(fullPath, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        for (const pattern of FORBIDDEN_PATTERNS) {
          if (pattern.regex.test(line)) {
            violations.push(`${relPath}:${index + 1} - [${pattern.name}] ${line.trim()}`);
          }
        }
      });
    }
  }
}

function main() {
  console.log('🔍 Running Nexus CRM Currency-Literal CI Lint Gate (§4.7-F Test 7)...');
  const violations: string[] = [];

  ['packages', 'apps'].forEach((targetDir) => {
    const abs = path.join(process.cwd(), targetDir);
    if (fs.existsSync(abs)) {
      scanDirectory(abs, violations);
    }
  });

  if (violations.length > 0) {
    console.error('\n❌ Currency Lint Gate FAILED with violations:');
    violations.forEach((v) => console.error(`  - ${v}`));
    console.error(
      '\nViolation of Rule 8 & §4.7: No currency symbols or minor unit conversions (/100) are allowed outside packages/schema/src/currency/.'
    );
    process.exit(1);
  }

  console.log('✅ Currency Lint Gate PASSED: Zero forbidden currency literals detected.');
}

main();
