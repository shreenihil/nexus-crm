/**
 * Damerau-Levenshtein distance and similarity algorithm.
 * Extends Levenshtein by counting adjacent-character transpositions as a single edit.
 */

export function damerauLevenshteinDistance(a: string, b: string): number {
  const s1 = a || '';
  const s2 = b || '';

  if (s1 === s2) return 0;
  if (s1.length === 0) return s2.length;
  if (s2.length === 0) return s1.length;

  const len1 = s1.length;
  const len2 = s2.length;

  // Matrix: (len1 + 2) x (len2 + 2)
  const maxDist = len1 + len2;
  const H: number[][] = Array.from({ length: len1 + 2 }, () => new Array(len2 + 2).fill(0));

  const setH = (i: number, j: number, val: number) => {
    const row = H[i];
    if (row) row[j] = val;
  };

  const getH = (i: number, j: number): number => {
    return H[i]?.[j] ?? 0;
  };

  setH(0, 0, maxDist);
  for (let i = 0; i <= len1; i++) {
    setH(i + 1, 0, maxDist);
    setH(i + 1, 1, i);
  }
  for (let j = 0; j <= len2; j++) {
    setH(0, j + 1, maxDist);
    setH(1, j + 1, j);
  }

  const da: Record<string, number> = {};

  for (let i = 1; i <= len1; i++) {
    let db = 0;
    const char1 = s1.charAt(i - 1);

    for (let j = 1; j <= len2; j++) {
      const char2 = s2.charAt(j - 1);
      const k = da[char2] ?? 0;
      const l = db;
      let cost = 0;

      if (char1 === char2) {
        db = j;
      } else {
        cost = 1;
      }

      const del = getH(i, j + 1) + 1;
      const ins = getH(i + 1, j) + 1;
      const sub = getH(i, j) + cost;
      const trans = getH(k, l) + (i - k - 1) + 1 + (j - l - 1);

      setH(i + 1, j + 1, Math.min(del, ins, sub, trans));
    }

    da[char1] = i;
  }

  return getH(len1 + 1, len2 + 1);
}

export function damerauLevenshteinSimilarity(a: string, b: string): number {
  const s1 = (a || '').trim().toLowerCase();
  const s2 = (b || '').trim().toLowerCase();

  if (s1 === s2) return 1.0;
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1.0;

  const dist = damerauLevenshteinDistance(s1, s2);
  return Math.max(0, 1 - dist / maxLen);
}
