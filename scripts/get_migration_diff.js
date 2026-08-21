const { execSync } = require('child_process');
const fs = require('fs');

const env = fs.readFileSync('.env', 'utf8');
const match = env.match(/DATABASE_URL=["']?([^"'\r\n]+)/);
if (!match) {
  console.error('DATABASE_URL not found');
  process.exit(1);
}

try {
  const diff = execSync(`npx prisma migrate diff --from-url "${match[1]}" --to-schema-datamodel prisma/schema.prisma --script`, {
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024
  });
  console.log('=== MIGRATION SQL OUTPUT ===');
  console.log(diff);
  console.log('=== END MIGRATION SQL OUTPUT ===');
} catch (e) {
  console.error('Diff error:', e.message);
  if (e.stdout) console.log('Stdout:', e.stdout);
  if (e.stderr) console.error('Stderr:', e.stderr);
}
