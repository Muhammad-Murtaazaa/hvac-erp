const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

function parseEnvFile(filePath) {
  const env = {};
  if (!fs.existsSync(filePath)) return env;

  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;

    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();

    // Strip surrounding quotes
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }

    env[key] = val;
  }
  return env;
}

function main() {
  const envPath = path.resolve(process.cwd(), ".env");
  const parsedEnv = parseEnvFile(envPath);

  const tceUrl =
    parsedEnv.DATABASE_URL_TCE ||
    process.env.DATABASE_URL_TCE ||
    parsedEnv.DATABASE_URL ||
    process.env.DATABASE_URL ||
    "";

  let tecairUrl =
    parsedEnv.DATABASE_URL_TECAIR ||
    process.env.DATABASE_URL_TECAIR ||
    "";

  if (!tecairUrl && tceUrl) {
    tecairUrl = tceUrl
      .replace(/\/neondb(\?|$)/, "/tecair$1")
      .replace(/\/hvac_erp(\?|$)/, "/tecair$1");
  }

  if (!tceUrl) {
    console.error("❌ No DATABASE_URL found in .env or environment!");
    process.exit(1);
  }

  console.log("🗄️ Applying safe database schema updates to TCE database (Zero data loss)...");
  execSync("npx prisma db push --skip-generate", {
    stdio: "inherit",
    env: { ...process.env, ...parsedEnv, DATABASE_URL: tceUrl },
  });

  if (tecairUrl && tecairUrl !== tceUrl) {
    console.log("🗄️ Applying safe database schema updates to TECAIR database (Zero data loss)...");
    execSync("npx prisma db push --skip-generate", {
      stdio: "inherit",
      env: { ...process.env, ...parsedEnv, DATABASE_URL: tecairUrl },
    });
  } else {
    console.log("ℹ️ No separate TECAIR URL specified or detected, skipping second push.");
  }

  console.log("✅ Database schema push completed successfully across all companies!");
}

main();
