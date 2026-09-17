#!/usr/bin/env node
'use strict';

const baseUrl = (process.argv[2] || process.env.PERF_URL || 'http://localhost:5000').replace(/\/$/, '');
const iterations = Math.max(1, Number(process.env.PERF_ITERATIONS || 10));
const path = process.env.PERF_PATH || '/health';

async function main() {
  const samples = [];
  for (let index = 0; index < iterations; index += 1) {
    const started = performance.now();
    const response = await fetch(`${baseUrl}${path}`);
    const elapsedMs = performance.now() - started;
    if (!response.ok) throw new Error(`${path} returned HTTP ${response.status}`);
    samples.push(elapsedMs);
  }

  const sorted = [...samples].sort((a, b) => a - b);
  const average = samples.reduce((sum, value) => sum + value, 0) / samples.length;
  const percentile = (ratio) => sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * ratio) - 1)];
  console.log(JSON.stringify({
    url: `${baseUrl}${path}`,
    iterations,
    averageMs: Number(average.toFixed(2)),
    p50Ms: Number(percentile(0.5).toFixed(2)),
    p95Ms: Number(percentile(0.95).toFixed(2)),
    minMs: Number(sorted[0].toFixed(2)),
    maxMs: Number(sorted[sorted.length - 1].toFixed(2)),
  }, null, 2));
}

main().catch((error) => {
  console.error(`Performance check failed: ${error.message}`);
  process.exitCode = 1;
});
