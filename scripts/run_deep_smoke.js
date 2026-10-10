const { execSync } = require("child_process");
execSync('npx ts-node --compiler-options "{\\"module\\":\\"CommonJS\\"}" scripts/deep_smoke_both_companies.ts', {
  stdio: "inherit"
});
