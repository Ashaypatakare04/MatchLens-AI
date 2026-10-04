import { runAllEdgeCases } from "../lib/edge-cases";
import { DEMO_JOB } from "../lib/demo-data";

async function main() {
  console.log("================================================================================");
  console.log("             MATCHLENS AI - EDGE CASE & RELIABILITY TEST SUITE                  ");
  console.log("                    ALGOTHON’26 — ALG-AI-01 Benchmark                           ");
  console.log("================================================================================\n");

  const startTime = Date.now();
  const results = await runAllEdgeCases(DEMO_JOB);
  const elapsed = Date.now() - startTime;

  let passedCount = 0;
  let failedCount = 0;

  results.forEach((tc, idx) => {
    const isPassed = tc.result?.passed;
    if (isPassed) passedCount++;
    else failedCount++;

    const statusBadge = isPassed ? "[ PASS ]" : "[ FAIL ]";
    console.log(`--------------------------------------------------------------------------------`);
    console.log(`${statusBadge} Test #${idx + 1}: ${tc.name}`);
    console.log(`  Scenario          : ${tc.scenario}`);
    console.log(`  Expected Behavior : ${tc.expectedBehavior}`);
    console.log(`  Match Score       : ${tc.result?.score ?? 0}/100`);
    console.log(`  Detected Flags    : ${tc.result?.detectedFlags?.length ? tc.result.detectedFlags.join(" | ") : "None"}`);
    console.log(`  Details           : ${tc.result?.details || "N/A"}`);
  });

  console.log(`================================================================================`);
  console.log(`TEST SUITE SUMMARY:`);
  console.log(`Total Tests Run : ${results.length}`);
  console.log(`Passed          : ${passedCount}`);
  console.log(`Failed          : ${failedCount}`);
  console.log(`Execution Time  : ${elapsed}ms`);
  console.log(`All Passed      : ${passedCount === results.length}`);
  console.log(`================================================================================\n`);

  // Also print JSON for program parsing if needed
  console.log("__JSON_OUTPUT__");
  console.log(JSON.stringify(results, null, 2));

  if (failedCount > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("FATAL ERROR running edge cases test suite:", err);
  process.exit(1);
});
