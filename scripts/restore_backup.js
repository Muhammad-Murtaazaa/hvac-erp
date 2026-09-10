const fs = require('fs');
const readline = require('readline');
const { Client } = require('pg');
const { from: copyFrom } = require('pg-copy-streams');

function getDatabaseUrl() {
  const envContent = fs.readFileSync('.env', 'utf8');
  const match = envContent.match(/DATABASE_URL=["']?([^"'\r\n]+)/);
  if (!match) throw new Error('DATABASE_URL not found in .env');
  return match[1];
}

async function parseDumpFile(filePath) {
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let inHvacErp = false;
  let currentTable = null;
  let currentHeader = null;
  let currentRows = [];

  const tableDataMap = new Map();

  for await (const line of rl) {
    if (line.includes('\\connect hvac_erp')) {
      inHvacErp = true;
      continue;
    }
    if (line.startsWith('\\connect ') && !line.includes('hvac_erp')) {
      inHvacErp = false;
      continue;
    }

    if (!inHvacErp) continue;

    if (line.startsWith('COPY public.')) {
      const match = line.match(/^COPY public\."?([^"(\s]+)"?\s*\((.+)\)\s*FROM stdin;/);
      if (match) {
        currentTable = match[1];
        currentHeader = line;
        currentRows = [];
      } else {
        console.warn('Unmatched COPY line:', line);
      }
      continue;
    }

    if (currentTable) {
      if (line === '\\.') {
        tableDataMap.set(currentTable, {
          header: currentHeader,
          rows: currentRows
        });
        currentTable = null;
        currentHeader = null;
        currentRows = [];
      } else {
        currentRows.push(line);
      }
    }
  }

  return tableDataMap;
}

async function streamTableData(client, header, rows) {
  return new Promise((resolve, reject) => {
    const stream = client.query(copyFrom(header));

    stream.on('error', reject);
    stream.on('finish', resolve);

    for (let i = 0; i < rows.length; i++) {
      stream.write(rows[i] + '\n');
    }
    stream.end();
  });
}

async function main() {
  const dbUrl = getDatabaseUrl();
  console.log('Connecting to database...');
  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  console.log('Connected successfully!');

  // 1. Fetch all Foreign Key constraints in public schema
  console.log('Querying existing foreign key constraints...');
  const fkQuery = `
    SELECT
      tc.table_name,
      tc.constraint_name,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name,
      rc.update_rule,
      rc.delete_rule,
      kcu.ordinal_position
    FROM
      information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.referential_constraints AS rc
        ON tc.constraint_name = rc.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
    ORDER BY tc.constraint_name, kcu.ordinal_position;
  `;
  const fkRes = await client.query(fkQuery);
  const fkMap = new Map();
  for (const r of fkRes.rows) {
    if (!fkMap.has(r.constraint_name)) {
      fkMap.set(r.constraint_name, {
        tableName: r.table_name,
        foreignTableName: r.foreign_table_name,
        columns: [],
        foreignColumns: [],
        updateRule: r.update_rule,
        deleteRule: r.delete_rule
      });
    }
    const item = fkMap.get(r.constraint_name);
    item.columns.push(`"${r.column_name}"`);
    item.foreignColumns.push(`"${r.foreign_column_name}"`);
  }
  console.log(`Found ${fkMap.size} foreign key constraints.`);

  // 2. Drop all foreign key constraints
  console.log('Dropping foreign key constraints temporarily for bulk copy...');
  for (const [cName, fk] of fkMap.entries()) {
    await client.query(`ALTER TABLE "${fk.tableName}" DROP CONSTRAINT "${cName}";`);
  }
  console.log('All foreign key constraints dropped.');

  // 3. Truncate tables in case any partial data exists from previous run
  console.log('Truncating tables...');
  const allTablesRes = await client.query(`
    SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' AND table_name != '_prisma_migrations';
  `);
  if (allTablesRes.rows.length > 0) {
    const tableNames = allTablesRes.rows.map(r => `"${r.table_name}"`).join(', ');
    await client.query(`TRUNCATE TABLE ${tableNames} CASCADE;`);
  }
  console.log('Tables truncated cleanly.');

  // 4. Parse backup file
  console.log('Parsing all_databases_backup.sql...');
  const tableDataMap = await parseDumpFile('all_databases_backup.sql');
  console.log(`Parsed ${tableDataMap.size} tables from backup.`);

  // 5. Restore table data
  let totalRestoredRows = 0;
  for (const [tableName, data] of tableDataMap.entries()) {
    const rowCount = data.rows.length;
    if (rowCount === 0) {
      console.log(`  [${tableName}]: 0 rows (skipped)`);
      continue;
    }

    process.stdout.write(`  Restoring [${tableName}] (${rowCount} rows)... `);
    try {
      await streamTableData(client, data.header, data.rows);
      console.log('OK');
      totalRestoredRows += rowCount;
    } catch (e) {
      console.log('FAILED');
      console.error(`Error restoring table ${tableName}:`, e.message);
      throw e;
    }
  }

  // 6. Re-create all foreign key constraints
  console.log('Re-creating foreign key constraints...');
  for (const [cName, fk] of fkMap.entries()) {
    const addQuery = `
      ALTER TABLE "${fk.tableName}"
      ADD CONSTRAINT "${cName}"
      FOREIGN KEY (${fk.columns.join(', ')})
      REFERENCES "${fk.foreignTableName}" (${fk.foreignColumns.join(', ')})
      ON UPDATE ${fk.updateRule}
      ON DELETE ${fk.deleteRule};
    `;
    try {
      await client.query(addQuery);
    } catch (err) {
      console.error(`Error recreating constraint ${cName}:`, err.message);
      throw err;
    }
  }
  console.log('All foreign key constraints successfully recreated and validated!');

  console.log(`\n🎉 SUCCESS! Restored ${totalRestoredRows} rows across ${tableDataMap.size} tables into Neon database.`);
  await client.end();
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
