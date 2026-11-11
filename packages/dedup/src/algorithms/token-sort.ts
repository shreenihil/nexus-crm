/**
 * Token-Sort and Token-Set ratio matching with corporate legal entity suffix stripping.
 * Resolves permutations like "Global Logistics LLC" vs "Logistics, Global".
 */

import { damerauLevenshteinSimilarity } from "./damerau-levenshtein.js";

// Common corporate and organizational legal suffixes across US, UK, EU, and global jurisdictions
const LEGAL_SUFFIXES = [
  "incorporated",
  "incorporation",
  "inc",
  "limited",
  "ltd",
  "corporation",
  "corp",
  "company",
  "co",
  "llc",
  "llp",
  "plc",
  "gmbh",
  "ag",
  "sa",
  "srl",
  "bv",
  "pty",
  "holdings",
  "group",
  "technologies",
  "technology",
  "tech",
  "labs",
  "services",
  "solutions",
];

const LEGAL_SUFFIX_REGEX = new RegExp(
  `\\b(${LEGAL_SUFFIXES.join("|")})\\.?$`,
  "gi",
);

/**
 * Strips corporate legal suffixes, punctuation, and extraneous spacing.
 */
export function stripLegalSuffixes(name: string): string {
  if (!name) return "";
  let cleaned = name
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  let prev = "";
  while (cleaned !== prev) {
    prev = cleaned;
    cleaned = cleaned.replace(LEGAL_SUFFIX_REGEX, "").trim();
  }

  return cleaned;
}

/**
 * Breaks a string into normalized, cleaned tokens.
 */
export function normalizeTokens(str: string, stripLegal = false): string[] {
  const target = stripLegal ? stripLegalSuffixes(str) : str;
  return target
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

/**
 * Token-Sort Ratio:
 * Tokenizes strings, sorts tokens alphabetically, rejoins and compares.
 */
export function tokenSortRatio(
  s1: string,
  s2: string,
  stripLegal = true,
): number {
  const tokens1 = normalizeTokens(s1, stripLegal).sort();
  const tokens2 = normalizeTokens(s2, stripLegal).sort();

  if (tokens1.length === 0 && tokens2.length === 0) return 1.0;
  if (tokens1.length === 0 || tokens2.length === 0) return 0.0;

  const sortedStr1 = tokens1.join(" ");
  const sortedStr2 = tokens2.join(" ");

  return damerauLevenshteinSimilarity(sortedStr1, sortedStr2);
}

/**
 * Token-Set Ratio:
 * Finds intersection of tokens and compares intersection against remainders.
 */
export function tokenSetRatio(
  s1: string,
  s2: string,
  stripLegal = true,
): number {
  const tokens1 = normalizeTokens(s1, stripLegal);
  const tokens2 = normalizeTokens(s2, stripLegal);

  if (tokens1.length === 0 && tokens2.length === 0) return 1.0;
  if (tokens1.length === 0 || tokens2.length === 0) return 0.0;

  const set1 = new Set(tokens1);
  const set2 = new Set(tokens2);

  const intersection = Array.from(set1)
    .filter((t) => set2.has(t))
    .sort();
  const diff1to2 = Array.from(set1)
    .filter((t) => !set2.has(t))
    .sort();
  const diff2to1 = Array.from(set2)
    .filter((t) => !set1.has(t))
    .sort();

  const interStr = intersection.join(" ");
  const s1Full = Array.from(set1).sort().join(" ");
  const s2Full = Array.from(set2).sort().join(" ");

  // If one is an exact subset of the other
  if (
    intersection.length > 0 &&
    (diff1to2.length === 0 || diff2to1.length === 0)
  ) {
    return 1.0;
  }

  // Compare intersection with combinations
  const comp1 = damerauLevenshteinSimilarity(interStr, s1Full);
  const comp2 = damerauLevenshteinSimilarity(interStr, s2Full);
  const comp3 = damerauLevenshteinSimilarity(s1Full, s2Full);

  return Math.max(comp1, comp2, comp3);
}
