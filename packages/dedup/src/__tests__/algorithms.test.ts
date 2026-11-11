import { describe, it, expect } from "vitest";
import {
  levenshteinDistance,
  levenshteinSimilarity,
} from "../algorithms/levenshtein.js";
import {
  damerauLevenshteinDistance,
  damerauLevenshteinSimilarity,
} from "../algorithms/damerau-levenshtein.js";
import {
  jaroSimilarity,
  jaroWinklerSimilarity,
} from "../algorithms/jaro-winkler.js";
import {
  stripLegalSuffixes,
  tokenSortRatio,
  tokenSetRatio,
} from "../algorithms/token-sort.js";
import {
  soundex,
  doubleMetaphone,
  phoneticMatch,
} from "../algorithms/phonetic.js";
import {
  InvertedCandidateIndex,
  DedupRecord,
} from "../blocking/candidate-generator.js";
import { evaluateDuplicateMatch } from "../engine/corroboration.js";

describe("Algorithm 1: Levenshtein Distance & Similarity", () => {
  it("computes accurate edit distances", () => {
    expect(levenshteinDistance("kitten", "sitting")).toBe(3);
    expect(levenshteinDistance("hello", "hello")).toBe(0);
    expect(levenshteinDistance("", "abc")).toBe(3);
  });

  it("computes normalized similarity between 0.0 and 1.0", () => {
    expect(levenshteinSimilarity("hello", "hello")).toBe(1.0);
    expect(levenshteinSimilarity("tony", "tny")).toBe(0.75);
    expect(levenshteinSimilarity("", "anything")).toBe(0.0);
  });
});

describe("Algorithm 2: Damerau-Levenshtein Transposition", () => {
  it("counts adjacent character transpositions as 1 edit instead of 2", () => {
    expect(damerauLevenshteinDistance("teh", "the")).toBe(1);
    expect(damerauLevenshteinDistance("jonh", "john")).toBe(1);
    expect(damerauLevenshteinSimilarity("jonh", "john")).toBe(0.75);
  });
});

describe("Algorithm 3: Jaro-Winkler Similarity", () => {
  it("computes standard Jaro and Jaro-Winkler with prefix boost", () => {
    const jaro = jaroSimilarity("MARTHA", "MARHTA");
    const jw = jaroWinklerSimilarity("MARTHA", "MARHTA");
    expect(jaro).toBeGreaterThan(0.9);
    expect(jw).toBeGreaterThanOrEqual(jaro);

    // Standard test pair: DIXON vs DICKSONX
    const jwDixon = jaroWinklerSimilarity("DIXON", "DICKSONX");
    expect(jwDixon).toBeGreaterThan(0.8);
  });
});

describe("Algorithm 4: Token-Sort, Token-Set & Legal Suffix Stripping", () => {
  it("strips common corporate legal suffixes", () => {
    expect(stripLegalSuffixes("Wayne Enterprises LLC")).toBe(
      "wayne enterprises",
    );
    expect(stripLegalSuffixes("Acme Corp.")).toBe("acme");
    expect(stripLegalSuffixes("Stark Industries Inc.")).toBe(
      "stark industries",
    );
    expect(stripLegalSuffixes("Cyberdyne Systems GmbH")).toBe(
      "cyberdyne systems",
    );
  });

  it("matches token-permuted company names with high similarity", () => {
    const sim1 = tokenSortRatio(
      "Wayne Enterprises LLC",
      "Enterprises, Wayne Inc.",
    );
    expect(sim1).toBe(1.0); // exact tokens after stripping legal suffixes

    const sim2 = tokenSetRatio(
      "Nexus Technologies Inc",
      "Nexus Technologies Global Solutions",
    );
    expect(sim2).toBeGreaterThanOrEqual(0.9);
  });
});

describe("Algorithm 5: Soundex & Double Metaphone Phonetic Matching", () => {
  it("computes American Soundex codes correctly", () => {
    expect(soundex("Smith")).toBe("S530");
    expect(soundex("Smythe")).toBe("S530");
    expect(soundex("Robert")).toBe("R163");
    expect(soundex("Rupert")).toBe("R163");
  });

  it("computes Double Metaphone for spelling variants", () => {
    const dm1 = doubleMetaphone("Smith");
    const dm2 = doubleMetaphone("Smythe");
    expect(dm1.primary).toBe(dm2.primary);

    const match = phoneticMatch("Smith", "Smythe");
    expect(match.soundexMatch).toBe(true);
    expect(match.metaphoneMatch).toBe(true);
    expect(match.score).toBe(1.0);
  });
});

describe("Candidate Blocker & Inverted Index", () => {
  it("clusters potential matches into candidate buckets", () => {
    const index = new InvertedCandidateIndex();
    const r1: DedupRecord = {
      id: "rec-1",
      entityName: "contacts",
      name: "Tony Stark",
      email: "tony@starkindustries.com",
      phone: "+1-212-555-0100",
    };
    const r2: DedupRecord = {
      id: "rec-2",
      entityName: "contacts",
      name: "Anthony Stark",
      email: "tony.stark@starkindustries.com",
      phone: "+1 212 555 0100",
    };
    const r3: DedupRecord = {
      id: "rec-3",
      entityName: "contacts",
      name: "Bruce Wayne",
      email: "bruce@wayne.com",
      phone: "+1-555-0199",
    };

    index.addRecords([r1, r2, r3]);

    const candidates = index.getCandidates(r1);
    expect(candidates.some((c) => c.id === "rec-2")).toBe(true);
    expect(candidates.some((c) => c.id === "rec-3")).toBe(false);
  });
});

describe("Corroboration Engine & Match Scoring", () => {
  it("gives 100% confidence to identical email addresses", () => {
    const recA: DedupRecord = {
      id: "c1",
      entityName: "contacts",
      name: "Tony Stark",
      email: "tony@stark.com",
    };
    const recB: DedupRecord = {
      id: "c2",
      entityName: "contacts",
      name: "T. Stark",
      email: "tony@stark.com",
    };

    const result = evaluateDuplicateMatch(recA, recB);
    expect(result.overallScore).toBe(100);
    expect(result.confidenceTier).toBe("HIGH");
    expect(result.isAutoMergeCandidate).toBe(true);
    expect(result.factors.some((f) => f.factor === "Exact Email Match")).toBe(
      true,
    );
  });

  it("penalizes conflicting corporate domains", () => {
    const recA: DedupRecord = {
      id: "c1",
      entityName: "contacts",
      name: "Tony Stark",
      email: "tony@starkcorp.com",
    };
    const recB: DedupRecord = {
      id: "c2",
      entityName: "contacts",
      name: "Tony Stark",
      email: "tony@shield-hq.org",
    };

    const result = evaluateDuplicateMatch(recA, recB);
    expect(
      result.factors.some(
        (f) => f.factor === "Conflicting Corporate Email Domains",
      ),
    ).toBe(true);
  });

  it("detects corporate legal name variation with high confidence", () => {
    const recA: DedupRecord = {
      id: "comp1",
      entityName: "companies",
      name: "Wayne Enterprises LLC",
      domain: "wayneenterprises.com",
    };
    const recB: DedupRecord = {
      id: "comp2",
      entityName: "companies",
      name: "Wayne Enterprises, Inc.",
      domain: "wayneenterprises.com",
    };

    const result = evaluateDuplicateMatch(recA, recB);
    expect(result.overallScore).toBeGreaterThanOrEqual(85);
    expect(result.confidenceTier).toBe("HIGH");
  });
});
