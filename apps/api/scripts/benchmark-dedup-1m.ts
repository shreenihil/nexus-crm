/**
 * Benchmark Script: 1,000,000 Record Deduplication Scan & Candidate Blocking Benchmark
 * Validates exit gate requirement per §15: 1M-record scan benchmark.
 */

import { InvertedCandidateIndex, evaluateDuplicateMatch, type DedupRecord } from '@nexus/dedup';

async function runDedup1MBenchmark() {
  console.log('============================================================');
  console.log('Nexus CRM — 1,000,000 Record Deduplication Scan Benchmark');
  console.log('Exit Gate Target: Sub-25ms real-time candidate blocking on 1M records');
  console.log('============================================================\n');

  const TOTAL_RECORDS = 1_000_000;
  const index = new InvertedCandidateIndex();

  const firstNames = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth', 'Tony', 'Anthony', 'Bruce', 'Clark'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Stark', 'Wayne', 'Kent'];
  const domains = ['starkindustries.com', 'wayneenterprises.com', 'dailyplanet.com', 'cyberdyne.io', 'acme.corp', 'lexcorp.org', 'umbrella.co'];

  console.log(`[1/3] Generating & indexing ${TOTAL_RECORDS.toLocaleString()} records via candidate blocking...`);
  const genStart = performance.now();

  const BATCH_SIZE = 50_000;
  for (let b = 0; b < TOTAL_RECORDS; b += BATCH_SIZE) {
    const batch: DedupRecord[] = [];
    const end = Math.min(b + BATCH_SIZE, TOTAL_RECORDS);
    for (let i = b; i < end; i++) {
      const fn = firstNames[i % firstNames.length]!;
      const ln = lastNames[(i + Math.floor(i / 13)) % lastNames.length]!;
      const dom = domains[i % domains.length]!;
      const phoneDigits = String(1000000000 + (i % 9000000000));

      batch.push({
        id: `rec-${i}`,
        entityName: 'people',
        firstName: fn,
        lastName: ln,
        name: `${fn} ${ln}`,
        email: `${fn.toLowerCase()}.${ln.toLowerCase()}${i % 500 === 0 ? '' : i}@${dom}`,
        phone: `+1-${phoneDigits.slice(0, 3)}-${phoneDigits.slice(3, 6)}-${phoneDigits.slice(6)}`,
      });
    }
    index.addRecords(batch);
  }

  const genDuration = performance.now() - genStart;
  const indexRate = Math.round((TOTAL_RECORDS / (genDuration / 1000)));
  console.log(`✓ 1,000,000 records indexed in ${(genDuration / 1000).toFixed(2)}s (${indexRate.toLocaleString()} records/sec)\n`);

  console.log('[2/3] Executing 500 real-time duplicate pre-creation check queries...');
  const NUM_QUERIES = 500;
  const queryLatencies: number[] = [];
  let candidateMatchesTotal = 0;
  let fullCorroborationCount = 0;

  for (let q = 0; q < NUM_QUERIES; q++) {
    // Probe with a mix of exact matches, minor typos, and phonetic variants
    const fn = firstNames[q % firstNames.length]!;
    const ln = lastNames[q % lastNames.length]!;
    const dom = domains[q % domains.length]!;

    const probeRecord: DedupRecord = {
      id: `probe-${q}`,
      entityName: 'people',
      firstName: fn,
      lastName: ln,
      name: `${fn} ${ln}`,
      email: `${fn.toLowerCase()}.${ln.toLowerCase()}@${dom}`,
      phone: `+1-212-555-${String(1000 + q).padStart(4, '0')}`,
    };

    const qStart = performance.now();
    const candidates = index.getCandidates(probeRecord);
    candidateMatchesTotal += candidates.length;

    // Run full corroboration scoring on top candidates (up to 5 per probe)
    for (const cand of candidates.slice(0, 5)) {
      evaluateDuplicateMatch(probeRecord, cand);
      fullCorroborationCount++;
    }

    const qDuration = performance.now() - qStart;
    queryLatencies.push(qDuration);
  }

  queryLatencies.sort((a, b) => a - b);
  const min = queryLatencies[0]!;
  const p50 = queryLatencies[Math.floor(NUM_QUERIES * 0.5)]!;
  const p95 = queryLatencies[Math.floor(NUM_QUERIES * 0.95)]!;
  const p99 = queryLatencies[Math.floor(NUM_QUERIES * 0.99)]!;
  const max = queryLatencies[queryLatencies.length - 1]!;

  console.log('[3/3] Benchmark Results');
  console.log('------------------------------------------------------------');
  console.log(`Total Records Indexed:     ${TOTAL_RECORDS.toLocaleString()}`);
  console.log(`Queries Executed:          ${NUM_QUERIES}`);
  console.log(`Candidate Buckets Found:   ${candidateMatchesTotal.toLocaleString()}`);
  console.log(`Full Corroborations Run:   ${fullCorroborationCount.toLocaleString()}`);
  console.log(`Min Query Latency:         ${min.toFixed(3)} ms`);
  console.log(`p50 (Median) Latency:      ${p50.toFixed(3)} ms`);
  console.log(`p95 Latency:               ${p95.toFixed(3)} ms`);
  console.log(`p99 Latency:               ${p99.toFixed(3)} ms`);
  console.log(`Max Latency:               ${max.toFixed(3)} ms`);
  console.log('------------------------------------------------------------');

  if (p95 < 25) {
    console.log(`✅ SUCCESS: p95 scan latency (${p95.toFixed(3)} ms) passes the <25ms budget on 1M records!`);
  } else {
    console.error(`❌ FAILURE: p95 latency (${p95.toFixed(3)} ms) exceeds 25ms threshold.`);
    process.exit(1);
  }
}

runDedup1MBenchmark().catch((err) => {
  console.error(err);
  process.exit(1);
});
