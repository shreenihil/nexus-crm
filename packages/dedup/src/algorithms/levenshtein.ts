/**
 * Levenshtein distance and normalized similarity algorithm.
 */

export function levenshteinDistance(a: string, b: string): number {
  const s1 = a || "";
  const s2 = b || "";

  if (s1 === s2) return 0;
  if (s1.length === 0) return s2.length;
  if (s2.length === 0) return s1.length;

  const m = s1.length;
  const n = s2.length;

  // Single-row space optimization
  let prevRow = new Array<number>(n + 1).fill(0);
  let currRow = new Array<number>(n + 1).fill(0);

  for (let j = 0; j <= n; j++) {
    prevRow[j] = j;
  }

  for (let i = 1; i <= m; i++) {
    currRow[0] = i;
    const char1 = s1.charAt(i - 1);

    for (let j = 1; j <= n; j++) {
      const char2 = s2.charAt(j - 1);
      const cost = char1 === char2 ? 0 : 1;

      const delCost = (prevRow[j] ?? 0) + 1;
      const insCost = (currRow[j - 1] ?? 0) + 1;
      const subCost = (prevRow[j - 1] ?? 0) + cost;

      currRow[j] = Math.min(delCost, insCost, subCost);
    }

    // Swap rows
    const temp = prevRow;
    prevRow = currRow;
    currRow = temp;
  }

  return prevRow[n] ?? 0;
}

export function levenshteinSimilarity(a: string, b: string): number {
  const s1 = (a || "").trim().toLowerCase();
  const s2 = (b || "").trim().toLowerCase();

  if (s1 === s2) return 1.0;
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1.0;

  const dist = levenshteinDistance(s1, s2);
  return Math.max(0, 1 - dist / maxLen);
}
