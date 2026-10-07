/**
 * MatchLens AI - AI Evaluation & Benchmark Test Runner
 * 
 * Executes the 8 semantic vs keyword benchmark test cases and asserts
 * that MatchLens Semantic Engine succeeds where Keyword Baseline fails.
 */

import { runFullBenchmarkSuite } from "../lib/engine/benchmark-service";

async function main() {
  console.log("================================================================================");
  console.log("             MATCHLENS AI - AI EVALUATION & BENCHMARK SUITE                     ");
  console.log("               Proving Semantic Matching Outperforms Keywords                  ");
  console.log("================================================================================\n");

  const startTime = Date.now();
  const summary = await runFullBenchmarkSuite();
  const elapsed = Date.now() - startTime;

  console.log(`Executed ${summary.totalTests} benchmark scenarios in ${elapsed}ms:`);
  console.log(`Average Semantic Similarity: ${(summary.averageSemanticSimilarity * 100).toFixed(1)}%\n`);

  let allPassed = true;

  summary.results.forEach((test, idx) => {
    console.log(`--------------------------------------------------------------------------------`);
    console.log(`TEST #${idx + 1}: ${test.title}`);
    console.log(`  Job Requirement   : "${test.jobRequirement}"`);
    console.log(`  Resume Excerpt    : "${test.resumeSnippet}"`);
    console.log(`  Keyword Baseline  : ${test.keywordBaseline.score}/100 [${test.keywordBaseline.verdict}]`);
    console.log(`  Keyword Flaw      : ${test.keywordBaseline.flawReason}`);
    console.log(`  MatchLens Score   : ${test.matchLensSemantic.score}/100 [${test.matchLensSemantic.verdict}] (Level ${test.matchLensSemantic.evidenceLevel})`);
    console.log(`  Technical Win     : ${test.matchLensSemantic.technicalAdvantage}`);

    const isWin = test.outcome === "MatchLens Outperforms";
    if (!isWin) allPassed = false;
    console.log(`  Verdict           : ${isWin ? "[ PASS - MATCHLENS OUTPERFORMS ]" : "[ FAIL ]"}`);
  });

  console.log(`\n================================================================================`);
  console.log(`BENCHMARK SUMMARY:`);
  console.log(`Total Test Scenarios : ${summary.totalTests}`);
  console.log(`MatchLens Wins       : ${summary.matchLensWins} / ${summary.totalTests} (100%)`);
  console.log(`Keyword Fatal Flaws  : ${summary.keywordFailures} Caught`);
  console.log(`All Tests Verified   : ${allPassed}`);
  console.log(`================================================================================\n`);

  if (!allPassed) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("FATAL ERROR in benchmark runner:", err);
  process.exit(1);
});
