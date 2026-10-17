/**
 * Corroboration Engine & Explainable Duplicate Scorer.
 * Combines phonetic, fuzzy token, Levenshtein, and exact identity anchors into an explainable score.
 */

import { damerauLevenshteinSimilarity, damerauLevenshteinDistance } from '../algorithms/damerau-levenshtein.js';
import { jaroWinklerSimilarity } from '../algorithms/jaro-winkler.js';
import { tokenSortRatio, tokenSetRatio, stripLegalSuffixes } from '../algorithms/token-sort.js';
import { phoneticMatch } from '../algorithms/phonetic.js';
import { extractEmailParts, normalizeDomain, normalizePhoneKey, DedupRecord } from '../blocking/candidate-generator.js';

export interface ScoreFactor {
  factor: string;
  weight: number;        // e.g. 0.40
  similarity: number;    // 0.0 to 1.0
  contribution: number;  // weight * similarity, or negative penalty
  detail: string;        // Human-readable rationale
}

export interface MatchScoreResult {
  overallScore: number;      // 0 to 100
  confidenceTier: 'HIGH' | 'MEDIUM' | 'LOW';
  isAutoMergeCandidate: boolean; // >= 92% with exact email or phone anchor
  factors: ScoreFactor[];
  summary: string;
}

export interface DuplicatePairMatch {
  recordA: DedupRecord;
  recordB: DedupRecord;
  matchResult: MatchScoreResult;
}

/**
 * Calculates identity match score between two records with comprehensive factor breakdown.
 */
export function evaluateDuplicateMatch(a: DedupRecord, b: DedupRecord): MatchScoreResult {
  const factors: ScoreFactor[] = [];
  let totalPositiveWeight = 0;
  let weightedScoreSum = 0;
  let penaltySum = 0;

  // 1. Email Evaluation
  const emailA = a.email ? a.email.trim().toLowerCase() : '';
  const emailB = b.email ? b.email.trim().toLowerCase() : '';

  if (emailA && emailB) {
    if (emailA === emailB) {
      factors.push({
        factor: 'Exact Email Match',
        weight: 1.0,
        similarity: 1.0,
        contribution: 100,
        detail: `Identical email address: ${emailA}`,
      });
      // Exact email is an absolute identity anchor
      return {
        overallScore: 100,
        confidenceTier: 'HIGH',
        isAutoMergeCandidate: true,
        factors,
        summary: `Exact email match (${emailA})`,
      };
    } else {
      const partsA = extractEmailParts(emailA);
      const partsB = extractEmailParts(emailB);

      if (partsA && partsB) {
        if (partsA.domain === partsB.domain) {
          // Check username similarity (e.g. tonystark vs tony.stark)
          const userSim = damerauLevenshteinSimilarity(
            partsA.user.replace(/[._-]/g, ''),
            partsB.user.replace(/[._-]/g, '')
          );
          if (userSim >= 0.8) {
            factors.push({
              factor: 'Similar Email User on Same Domain',
              weight: 0.85,
              similarity: userSim,
              contribution: Math.round(userSim * 85),
              detail: `Domain @${partsA.domain} with username similarity ${(userSim * 100).toFixed(0)}%`,
            });
            totalPositiveWeight += 0.85;
            weightedScoreSum += userSim * 85;
          }
        } else {
          // Different domains (if both are non-generic domains, apply penalty)
          const genericDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com'];
          if (!genericDomains.includes(partsA.domain) && !genericDomains.includes(partsB.domain)) {
            const penalty = 35;
            penaltySum += penalty;
            factors.push({
              factor: 'Conflicting Corporate Email Domains',
              weight: -0.35,
              similarity: 1.0,
              contribution: -penalty,
              detail: `Conflicting corporate domains: @${partsA.domain} vs @${partsB.domain}`,
            });
          }
        }
      }
    }
  }

  // 2. Phone Evaluation
  const phoneA = normalizePhoneKey(a.phone);
  const phoneB = normalizePhoneKey(b.phone);

  if (phoneA && phoneB) {
    if (phoneA === phoneB) {
      factors.push({
        factor: 'Exact Phone Match',
        weight: 0.90,
        similarity: 1.0,
        contribution: 90,
        detail: `Exact 10-digit normalized phone match: ${phoneA}`,
      });
      totalPositiveWeight += 0.90;
      weightedScoreSum += 90;
    } else {
      // Conflicting phones
      const phonePenalty = 25;
      penaltySum += phonePenalty;
      factors.push({
        factor: 'Conflicting Phone Numbers',
        weight: -0.25,
        similarity: 1.0,
        contribution: -phonePenalty,
        detail: `Different phone numbers registered (${phoneA} vs ${phoneB})`,
      });
    }
  }

  // 3. Name Evaluation
  const nameA = (a.name || `${a.firstName || ''} ${a.lastName || ''}`).trim();
  const nameB = (b.name || `${b.firstName || ''} ${b.lastName || ''}`).trim();

  if (nameA && nameB) {
    const jwScore = jaroWinklerSimilarity(nameA, nameB);
    const tokenScore = tokenSortRatio(nameA, nameB, false);
    const damerauDist = damerauLevenshteinDistance(nameA.toLowerCase(), nameB.toLowerCase());
    const phonetic = phoneticMatch(nameA, nameB);

    const bestNameSim = Math.max(jwScore, tokenScore);

    if (bestNameSim >= 0.85 || phonetic.score >= 0.85 || damerauDist <= 2) {
      const nameContribution = Math.round(bestNameSim * 75);
      factors.push({
        factor: 'High Name Similarity',
        weight: 0.75,
        similarity: bestNameSim,
        contribution: nameContribution,
        detail: `Jaro-Winkler: ${(jwScore * 100).toFixed(0)}%, Token-Sort: ${(tokenScore * 100).toFixed(0)}%, Phonetic: ${(phonetic.score * 100).toFixed(0)}%`,
      });
      totalPositiveWeight += 0.75;
      weightedScoreSum += nameContribution;
    } else if (bestNameSim >= 0.65) {
      const nameContribution = Math.round(bestNameSim * 45);
      factors.push({
        factor: 'Moderate Name Similarity',
        weight: 0.45,
        similarity: bestNameSim,
        contribution: nameContribution,
        detail: `Moderate name similarity: ${(bestNameSim * 100).toFixed(0)}%`,
      });
      totalPositiveWeight += 0.45;
      weightedScoreSum += nameContribution;
    }
  }

  // 4. Company Evaluation (for contacts' company or company entities)
  const compA = a.companyName || (a.entityName === 'companies' ? a.name : '');
  const compB = b.companyName || (b.entityName === 'companies' ? b.name : '');

  if (compA && compB) {
    const compTokenSort = tokenSortRatio(compA, compB, true);
    const compTokenSet = tokenSetRatio(compA, compB, true);
    const bestCompSim = Math.max(compTokenSort, compTokenSet);

    if (bestCompSim >= 0.85) {
      const compContribution = Math.round(bestCompSim * 60);
      factors.push({
        factor: 'Company Name Equivalence (Legal Suffixes Stripped)',
        weight: 0.60,
        similarity: bestCompSim,
        contribution: compContribution,
        detail: `"${stripLegalSuffixes(compA)}" ~ "${stripLegalSuffixes(compB)}" (${(bestCompSim * 100).toFixed(0)}%)`,
      });
      totalPositiveWeight += 0.60;
      weightedScoreSum += compContribution;
    }
  }

  // 5. Website / Domain Evaluation
  const domA = normalizeDomain(a.domain);
  const domB = normalizeDomain(b.domain);
  if (domA && domB && domA === domB) {
    factors.push({
      factor: 'Exact Website Domain Match',
      weight: 0.50,
      similarity: 1.0,
      contribution: 50,
      detail: `Shared primary domain: ${domA}`,
    });
    totalPositiveWeight += 0.50;
    weightedScoreSum += 50;
  }

  // Calculate final normalized score
  let rawScore = 0;
  if (totalPositiveWeight > 0) {
    // Normalized positive score
    rawScore = weightedScoreSum / totalPositiveWeight;
  }

  // Subtract negative penalties
  const finalScore = Math.max(0, Math.min(100, Math.round(rawScore - penaltySum)));

  let confidenceTier: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
  if (finalScore >= 85) {
    confidenceTier = 'HIGH';
  } else if (finalScore >= 60) {
    confidenceTier = 'MEDIUM';
  }

  const isAutoMergeCandidate = finalScore >= 92 && (Boolean(phoneA && phoneA === phoneB) || Boolean(emailA && emailA === emailB));

  const summary = factors.length > 0
    ? factors.map((f) => f.factor).slice(0, 2).join(' + ')
    : 'No strong matching signals found';

  return {
    overallScore: finalScore,
    confidenceTier,
    isAutoMergeCandidate,
    factors,
    summary,
  };
}
