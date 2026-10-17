/**
 * Candidate blocking and inverted index generation.
 * Avoids O(N^2) pairwise comparison by clustering records into high-probability candidate buckets.
 */

import { soundex, doubleMetaphone } from '../algorithms/phonetic.js';
import { stripLegalSuffixes } from '../algorithms/token-sort.js';

export interface DedupRecord {
  id: string;
  entityName: string; // 'contacts', 'companies', 'deals', etc.
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  companyName?: string;
  domain?: string;
  raw?: Record<string, unknown>;
}

/**
 * Normalizes phone numbers to last 10 digits for candidate indexing.
 */
export function normalizePhoneKey(phone?: string): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 7) return null;
  return digits.slice(-10); // match on national/subscriber 10 digits
}

/**
 * Normalizes email to extract root domain and username prefix.
 */
export function extractEmailParts(email?: string): { user: string; domain: string } | null {
  if (!email || !email.includes('@')) return null;
  const parts = email.trim().toLowerCase().split('@');
  const user = parts[0];
  const domain = parts[1];
  if (!user || !domain || !domain.includes('.')) return null;
  return { user, domain };
}

/**
 * Normalizes company domain.
 */
export function normalizeDomain(domain?: string): string | null {
  if (!domain) return null;
  const cleaned = domain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '');
  const firstPart = cleaned.split('/')[0];
  return firstPart || null;
}

/**
 * Generates blocking keys for a record.
 */
export function generateBlockingKeys(record: DedupRecord): string[] {
  const keys: string[] = [];

  // 1. Phone number blocking key
  const phoneKey = normalizePhoneKey(record.phone);
  if (phoneKey) {
    keys.push(`phone:${phoneKey}`);
  }

  // 2. Email domain + first initial blocking key
  const emailParts = extractEmailParts(record.email);
  if (emailParts) {
    keys.push(`email_exact:${emailParts.user}@${emailParts.domain}`);
    if (emailParts.user.length > 0) {
      keys.push(`email_domain_initial:${emailParts.domain}:${emailParts.user.charAt(0)}`);
    }
  }

  // 3. Last name phonetic + first initial (for contacts)
  const lastName = record.lastName || (record.name ? record.name.split(' ').slice(1).join(' ') : '');
  const firstName = record.firstName || (record.name ? (record.name.split(' ')[0] ?? '') : '');

  if (lastName) {
    const sx = soundex(lastName);
    const dm = doubleMetaphone(lastName).primary;
    const initial = (firstName.charAt(0) || '').toLowerCase();

    if (sx !== '0000') {
      keys.push(`name_sx:${sx}:${initial}`);
    }
    if (dm) {
      keys.push(`name_dm:${dm}:${initial}`);
    }
  }

  // 4. Company token prefix + domain (for companies)
  const companyName = record.companyName || (record.entityName === 'companies' ? record.name : '');
  if (companyName) {
    const stripped = stripLegalSuffixes(companyName);
    const prefix = stripped.slice(0, 4).toLowerCase();
    if (prefix.length >= 2) {
      keys.push(`company_prefix:${prefix}`);
    }
  }

  // 5. Website domain
  const domainKey = normalizeDomain(record.domain || (emailParts ? emailParts.domain : undefined));
  if (domainKey && !['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com'].includes(domainKey)) {
    keys.push(`domain:${domainKey}`);
  }

  return keys;
}

/**
 * Inverted candidate index for fast sub-millisecond candidate lookup.
 */
export class InvertedCandidateIndex {
  private index = new Map<string, Set<string>>();
  private recordsById = new Map<string, DedupRecord>();

  public clear(): void {
    this.index.clear();
    this.recordsById.clear();
  }

  public addRecord(record: DedupRecord): void {
    this.recordsById.set(record.id, record);
    const keys = generateBlockingKeys(record);

    for (const key of keys) {
      let bucket = this.index.get(key);
      if (!bucket) {
        bucket = new Set();
        this.index.set(key, bucket);
      }
      bucket.add(record.id);
    }
  }

  public addRecords(records: DedupRecord[]): void {
    for (const record of records) {
      this.addRecord(record);
    }
  }

  public removeRecord(recordId: string): void {
    const record = this.recordsById.get(recordId);
    if (!record) return;

    const keys = generateBlockingKeys(record);
    for (const key of keys) {
      const bucket = this.index.get(key);
      if (bucket) {
        bucket.delete(recordId);
        if (bucket.size === 0) {
          this.index.delete(key);
        }
      }
    }
    this.recordsById.delete(recordId);
  }

  public getRecord(id: string): DedupRecord | undefined {
    return this.recordsById.get(id);
  }

  /**
   * Retrieves candidate duplicate IDs matching one or more blocking keys.
   */
  public getCandidates(record: DedupRecord, limitPerKey = 200): DedupRecord[] {
    const keys = generateBlockingKeys(record);
    const candidateIds = new Set<string>();

    for (const key of keys) {
      const bucket = this.index.get(key);
      if (bucket) {
        let count = 0;
        for (const id of bucket) {
          if (id !== record.id) {
            candidateIds.add(id);
            count++;
            if (count >= limitPerKey) break;
          }
        }
      }
    }

    const candidates: DedupRecord[] = [];
    for (const id of candidateIds) {
      const c = this.recordsById.get(id);
      if (c && c.entityName === record.entityName) {
        candidates.push(c);
      }
    }

    return candidates;
  }
}
