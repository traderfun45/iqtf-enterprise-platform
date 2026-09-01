const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

const db = new DatabaseSync('./iqtf.db');

const file = process.env.HOME + '/tmp/cot-gc.jsonl';

if (!fs.existsSync(file)) {
  console.error('ERROR: COT JSONL not found:', file);
  process.exit(1);
}

const lines = fs.readFileSync(file, 'utf8')
  .split('\n')
  .map(x => x.trim())
  .filter(Boolean);

console.log('===== COT PRODUCTION IMPORT =====');
console.log('File:', file);
console.log('Records:', lines.length);

const insert = db.prepare(`
  INSERT INTO cot_market_data (
    symbol,
    report_date,
    open_interest,
    producer_long,
    producer_short,
    swap_dealer_long,
    swap_dealer_short,
    managed_money_long,
    managed_money_short,
    other_reportables_long,
    other_reportables_short,
    source,
    note
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(symbol, report_date)
  DO UPDATE SET
    open_interest = excluded.open_interest,
    producer_long = excluded.producer_long,
    producer_short = excluded.producer_short,
    swap_dealer_long = excluded.swap_dealer_long,
    swap_dealer_short = excluded.swap_dealer_short,
    managed_money_long = excluded.managed_money_long,
    managed_money_short = excluded.managed_money_short,
    other_reportables_long = excluded.other_reportables_long,
    other_reportables_short = excluded.other_reportables_short,
    source = excluded.source,
    note = excluded.note,
    updated_at = CURRENT_TIMESTAMP
`);

db.exec('BEGIN');

try {
  for (const line of lines) {
    const x = JSON.parse(line);

    insert.run(
      x.symbol,
      x.reportDate,
      x.openInterest,
      x.producerLong,
      x.producerShort,
      x.swapDealerLong,
      x.swapDealerShort,
      x.managedMoneyLong,
      x.managedMoneyShort,
      x.otherReportablesLong,
      x.otherReportablesShort,
      'CFTC',
      'CFTC production import'
    );
  }

  db.exec('COMMIT');
  console.log('Import committed successfully.');
} catch (error) {
  db.exec('ROLLBACK');
  console.error('Import failed. Transaction rolled back.');
  console.error(error);
  process.exit(1);
}

const count = db.prepare(`
  SELECT COUNT(*) AS count
  FROM cot_market_data
  WHERE symbol = 'GC'
`).get();

const sources = db.prepare(`
  SELECT source, COUNT(*) AS count
  FROM cot_market_data
  WHERE symbol = 'GC'
  GROUP BY source
`).all();

const latest = db.prepare(`
  SELECT
    symbol,
    report_date,
    open_interest,
    source
  FROM cot_market_data
  WHERE symbol = 'GC'
  ORDER BY report_date DESC
  LIMIT 1
`).get();

const duplicates = db.prepare(`
  SELECT symbol, report_date, COUNT(*) AS count
  FROM cot_market_data
  WHERE symbol = 'GC'
  GROUP BY symbol, report_date
  HAVING COUNT(*) > 1
`).all();

console.log('\n===== RESULT =====');
console.log('GC count:', count);
console.log('Sources:', sources);
console.log('Latest:', latest);
console.log('Duplicates:', duplicates);

if (duplicates.length > 0) {
  console.error('ERROR: Duplicate COT rows detected.');
  process.exit(2);
}

console.log('\nCOT PRODUCTION IMPORT: PASS');
