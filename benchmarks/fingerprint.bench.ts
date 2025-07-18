import { Bench } from "tinybench";

import { calculateFingerprint } from "../src/fingerprint.js";
import { RepoManager } from "./fixtures/repos.js";

async function runBenchmarks(): Promise<void> {
  const repoManager = new RepoManager();
  const repoPaths = await repoManager.setupAllRepos();

  const bench = new Bench({
    name: "fs-fingerprint performance benchmarks",
    time: 1000, // Run for 1 second
    iterations: 10,
  });

  // Lodash benchmarks
  if (repoPaths.has("lodash")) {
    const lodashPath = repoPaths.get("lodash")!;

    bench.add("lodash", () => {
      calculateFingerprint(lodashPath);
    });
  }

  // Express benchmarks
  if (repoPaths.has("express")) {
    const expressPath = repoPaths.get("express")!;
    bench.add("express", () => {
      calculateFingerprint(expressPath);
    });
  }

  // React benchmarks
  if (repoPaths.has("react")) {
    const reactPath = repoPaths.get("react")!;

    bench.add("react", () => {
      calculateFingerprint(reactPath);
    });

    bench.add("react (packages only)", () => {
      calculateFingerprint(reactPath, {
        include: ["packages/**"],
      });
    });
  }

  // React Native benchmarks
  if (repoPaths.has("react-native")) {
    const reactNativePath = repoPaths.get("react-native")!;
    bench.add("react-native", () => {
      calculateFingerprint(reactNativePath);
    });

    bench.add("react-native (null hash)", () => {
      calculateFingerprint(reactNativePath, {
        hashAlgorithm: "null",
      });
    });

    bench.add("react-native (JS/TS only)", () => {
      calculateFingerprint(reactNativePath, {
        include: ["**/*.js", "**/*.jsx", "**/*.ts", "**/*.tsx"],
      });
    });
  }

  console.log("⏱️  Running benchmarks...");
  await bench.run();

  console.log("\n📊 Benchmark Results:");
  console.table(
    bench.table((task) => ({
      "Task name": task.name,
      "Latency med (ms)": `${task.result?.latency.p50?.toFixed(
        2
      )} \xB1 ${task.result?.latency.mad?.toFixed(2)}`,
      "Throughput med (ops/s)": `${task.result?.throughput?.p50?.toFixed(
        2
      )} \xB1 ${task.result?.throughput?.mad?.toFixed(2)}`,
      Samples: task.result?.latency.samples.length,
    }))
  );
}

// Run benchmarks if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runBenchmarks().catch(console.error);
}

export { runBenchmarks };
