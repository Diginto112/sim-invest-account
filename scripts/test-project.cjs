const { spawnSync } = require('node:child_process');
const path = require('node:path');
const tests = ['test-import-provenance.cjs', 'test-fund-fees.cjs', 'test-order-lifecycle.cjs', 'test-bank-interest.cjs', 'test-bond-cashflows.cjs', 'test-account-snapshots.cjs', 'test-full-replay.cjs'];
for (const test of tests) {
  const result = spawnSync(process.execPath, [path.join(__dirname, test)], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log(`All ${tests.length} financial regression suites passed.`);
