import { readFileSync } from "node:fs";
import { join } from "node:path";

import { envContent, type FingerprintOptions, jsonContent } from "../../src/index.js";

export type RockPlatform = "ios" | "android";

export interface RockFingerprintConfig {
  sourceDir: string;
  extraSources: string[];
  ignorePaths: string[];
  env: string[];
}

/**
 * Expensify's `fingerprint` section of `rock.config.mjs` (non-hybrid build).
 */
const EXPENSIFY_FINGERPRINT = {
  extraSources: [
    "android/gradle.properties",
    "ios/Podfile",
    "scripts/artifacts-utils/compute-patches-hash.sh",
    "patches",
    ".github/actions/composite/getXcodeVersion/action.yml",
  ],
  ignorePaths: ["Mobile-Expensify/Android/assets/app/shared/bundle.js"],
  env: [
    "BUNDLER",
    "USE_WEB_PROXY",
    "PUSHER_DEV_SUFFIX",
    "SECURE_NGROK_URL",
    "NGROK_URL",
    "USE_NGROK",
    "FORCE_NATIVE_BUILD",
    "RCT_SYMBOLICATE_PREBUILT_FRAMEWORKS",
  ],
};

export const EXPENSIFY_ROCK_CONFIG: Record<RockPlatform, RockFingerprintConfig> = {
  ios: { sourceDir: "ios", ...EXPENSIFY_FINGERPRINT },
  android: { sourceDir: "android", ...EXPENSIFY_FINGERPRINT },
};

/**
 * Builds options the way Rock's `nativeFingerprint` does (`@rock-js/tools`).
 *
 * Differences from Rock:
 * - `sourceDir` is relative (Rock passes it absolute, which yields the same files and hash)
 * - `autolinkingSources` uses `package.json` dependencies as a stand-in, as the
 *   real value comes from `rock config`, which requires installed `node_modules`
 */
export function getRockFingerprintOptions(
  projectRoot: string,
  platform: RockPlatform,
  config: RockFingerprintConfig,
): FingerprintOptions {
  const packageJson = JSON.parse(readFileSync(join(projectRoot, "package.json"), "utf8"));
  const { sourceDir } = config;

  return {
    files: [sourceDir, ...config.extraSources],
    ignores: [
      "**/.DS_Store",
      ...getPlatformIgnorePaths(platform, sourceDir),
      ...config.ignorePaths,
    ],
    contentInputs: [
      jsonContent("scripts", packageJson.scripts),
      jsonContent("autolinkingSources", packageJson.dependencies),
      jsonContent("reactNativeVersion", { version: packageJson.dependencies["react-native"] }),
      ...(config.env.length > 0 ? [envContent("env", config.env)] : []),
    ],
    gitIgnore: true,
  };
}

function getPlatformIgnorePaths(platform: RockPlatform, sourceDir: string): string[] {
  if (platform === "android") {
    return [
      `${sourceDir}/app/.gradle`,
      `${sourceDir}/build`,
      `${sourceDir}/**/build`,
      `${sourceDir}/**/.cxx`,
      `${sourceDir}/.kotlin`,
      `${sourceDir}/local.properties`,
      `${sourceDir}/.idea`,
      `${sourceDir}/.gradle`,
      `${sourceDir}/gradlew.bat`,
      "**/android-annotation/build",
      "**/android-annotation/.cxx",
      "**/android-annotation/.gradle",
      "**/android-annotation-processor/build",
      "**/android-annotation-processor/.cxx",
      "**/android-annotation-processor/.gradle",
      "**/*-gradle-plugin/build",
      "**/*-gradle-plugin/.cxx",
      "**/*-gradle-plugin/.gradle",
    ];
  }

  return [
    `${sourceDir}/build`,
    `${sourceDir}/.xcode.env.local`,
    `${sourceDir}/**/project.xcworkspace`,
    `${sourceDir}/*.xcworkspace/xcuserdata`,
    `${sourceDir}/DerivedData`,
    `${sourceDir}/Pods`,
    `${sourceDir}/tmp.xcconfig`,
    `${sourceDir}/**/*.xcworkspace`,
  ];
}
