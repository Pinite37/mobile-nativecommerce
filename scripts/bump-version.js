#!/usr/bin/env node
/**
 * Bump version across app.json, package.json et android/app/build.gradle
 *
 * Usage:
 *   node scripts/bump-version.js            → patch  (1.0.1 → 1.0.2)
 *   node scripts/bump-version.js minor      → minor  (1.0.1 → 1.1.0)
 *   node scripts/bump-version.js major      → major  (1.0.1 → 2.0.0)
 *   node scripts/bump-version.js 1.2.3      → version exacte
 *
 * Raccourcis yarn :
 *   yarn version:patch
 *   yarn version:minor
 *   yarn version:major
 */

const fs   = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

// ── helpers ──────────────────────────────────────────────────────────────────

function bumpVersion(current, type) {
  const [major, minor, patch] = current.split(".").map(Number);
  if (type === "major") return `${major + 1}.0.0`;
  if (type === "minor") return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;   // default: patch
}

function isExactVersion(str) {
  return /^\d+\.\d+\.\d+$/.test(str);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n");
}

// ── main ─────────────────────────────────────────────────────────────────────

const arg = process.argv[2] || "patch";

// 1. Lire la version actuelle depuis app.json (source de vérité)
const appJsonPath = path.join(ROOT, "app.json");
const appJson     = readJson(appJsonPath);
const currentVersion = appJson.expo.version;

// 2. Calculer la nouvelle version
const newVersion = isExactVersion(arg) ? arg : bumpVersion(currentVersion, arg);

console.log(`\n🔄  ${currentVersion}  →  ${newVersion}\n`);

// 3. package.json
const pkgPath = path.join(ROOT, "package.json");
const pkg     = readJson(pkgPath);
pkg.version   = newVersion;
writeJson(pkgPath, pkg);
console.log("✅  package.json");

// 4. app.json — version + runtimeVersion (les deux doivent être en sync)
appJson.expo.version        = newVersion;
appJson.expo.runtimeVersion = newVersion;
writeJson(appJsonPath, appJson);
console.log("✅  app.json (version + runtimeVersion)");

// 5. android/app/build.gradle — versionName + versionCode++
const gradlePath = path.join(ROOT, "android/app/build.gradle");
let gradle = fs.readFileSync(gradlePath, "utf8");

// Lire le versionCode actuel
const vcMatch = gradle.match(/versionCode\s+(\d+)/);
if (!vcMatch) {
  console.error("❌  versionCode introuvable dans build.gradle");
  process.exit(1);
}
const currentCode = parseInt(vcMatch[1], 10);
const newCode     = currentCode + 1;

gradle = gradle.replace(
  /versionCode\s+\d+/,
  `versionCode ${newCode}`
);
gradle = gradle.replace(
  /versionName\s+"[^"]*"/,
  `versionName "${newVersion}"`
);
fs.writeFileSync(gradlePath, gradle);
console.log(`✅  android/app/build.gradle (versionName="${newVersion}", versionCode ${currentCode} → ${newCode})`);

console.log(`\n🚀  Version bumped to ${newVersion} (Android build ${newCode})\n`);
