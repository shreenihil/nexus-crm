import * as fs from "fs";
import * as path from "path";

const FORBIDDEN_FILE = path.join(__dirname, "forbidden-strings.txt");
const ROOT_DIR = path.resolve(__dirname, "../../");

function getForbiddenStrings(): string[] {
  if (!fs.existsSync(FORBIDDEN_FILE)) return [];
  return fs
    .readFileSync(FORBIDDEN_FILE, "utf8")
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("#"));
}

function scanDirectory(
  dir: string,
  forbidden: string[],
  matches: Array<{ file: string; line: number; text: string; term: string }>,
) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (
        entry.name === "node_modules" ||
        entry.name === ".next" ||
        entry.name === "dist" ||
        entry.name === ".turbo" ||
        entry.name === "__tests__" ||
        entry.name === "e2e" ||
        entry.name === "test" ||
        entry.name === ".git"
      ) {
        continue;
      }
      scanDirectory(fullPath, forbidden, matches);
    } else if (entry.isFile()) {
      if (
        !/\.(ts|tsx|js|jsx|json)$/.test(entry.name) ||
        entry.name.endsWith(".d.ts")
      ) {
        continue;
      }

      const content = fs.readFileSync(fullPath, "utf8");
      const lines = content.split("\n");

      lines.forEach((line, idx) => {
        for (const term of forbidden) {
          if (line.includes(term)) {
            matches.push({
              file: path.relative(ROOT_DIR, fullPath),
              line: idx + 1,
              text: line.trim(),
              term,
            });
          }
        }
      });
    }
  }
}

function main() {
  const forbidden = getForbiddenStrings();
  console.log(
    `Scanning codebase for ${forbidden.length} forbidden sample data strings...`,
  );

  const matches: Array<{
    file: string;
    line: number;
    text: string;
    term: string;
  }> = [];
  const targetDirs = [
    path.join(ROOT_DIR, "apps"),
    path.join(ROOT_DIR, "packages"),
  ];

  for (const tDir of targetDirs) {
    if (fs.existsSync(tDir)) {
      scanDirectory(tDir, forbidden, matches);
    }
  }

  if (matches.length > 0) {
    console.error(
      `\n[FAIL] Found ${matches.length} forbidden sample data occurrences:`,
    );
    matches.slice(0, 20).forEach((m) => {
      console.error(
        `  ${m.file}:${m.line} -> matches "${m.term}"\n    ${m.text}`,
      );
    });
    if (matches.length > 20) {
      console.error(`  ... and ${matches.length - 20} more.`);
    }
    process.exit(1);
  }

  console.log(
    `[PASS] Clean workspace scan passed with 0 sample data markers found.`,
  );
}

main();
