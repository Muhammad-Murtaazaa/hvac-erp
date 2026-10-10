const { execSync } = require("child_process");
execSync('npx ts-node --compiler-options "{\\"module\\":\\"CommonJS\\"}" scripts/comprehensive_multi_company_e2e_audit.ts', {
  stdio: "inherit"
});
