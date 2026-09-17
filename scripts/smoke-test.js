#!/usr/bin/env node
'use strict';

const baseUrl = (process.argv[2] || process.env.SMOKE_URL || 'http://localhost:5000').replace(/\/$/, '');
const checks = [
  { name: 'health', path: '/health', expected: 200 },
  { name: 'frontend', path: '/', expected: 200 },
  { name: 'properties', path: '/api/v1/properties?limit=1', expected: 200 },
];

async function main() {
  let failed = false;
  for (const check of checks) {
    const started = Date.now();
    try {
      const response = await fetch(`${baseUrl}${check.path}`);
      const elapsedMs = Date.now() - started;
      const passed = response.status === check.expected;
      console.log(`${passed ? 'PASS' : 'FAIL'} ${check.name}: ${response.status} (${elapsedMs}ms)`);
      if (!passed) failed = true;
    } catch (error) {
      failed = true;
      console.log(`FAIL ${check.name}: ${error.message}`);
    }
  }

  if (failed) process.exitCode = 1;
  else console.log(`Smoke checks passed: ${checks.length}/${checks.length}`);
}

main();
