const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

const db = new DatabaseSync('./iqtf.db');

const file =
  process.env.CME_VOL2VOL_FILE ||
  process.env.HOME +
    '/storage/shared/Download/Bluetooth/sheet_20260830_173547_generated_by_Kimi_AI.csv';

const dataDate = process.env.CME_DATE;

if (!dataDate) {
  console.error('ERROR: CME_DATE is required');
  console.error('Example: CME_DATE=2026-08-30 node scripts/import-cme-vol2vol.js');
  process.exit(1);
}

if (!fs.existsSync(file)) {
  console.error('ERROR: file not found:', file);
  process.exit(1);
}

function parseNumber(value) {
  if (value === undefined || value === null) return null;

  const cleaned = String(value)
    .trim()
    .replace(/,/g, '');

  if (!cleaned) return null;

  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

const lines = fs.readFileSync(file, 'utf8')
  .split('\n')
  .map(x => x.trim())
  .filter(Boolean);

const rows = {};

for (const line of lines) {
  const parts = line.split(',');

  if (parts.length < 2) continue;

  const key = parts[0].trim();
  const value = parts.slice(1).join(',').trim();

  rows[key] = value;
}

const symbolRaw = rows['สินค้า'] || '';
const symbol =
  /GC/i.test(symbolRaw) || /Gold/i.test(symbolRaw)
    ? 'GC'
    : null;

const futureSettlement = parseNumber(rows['Future Settlement']);
const putVolume = parseNumber(rows['Put Volume รวม']);
const callVolume = parseNumber(rows['Call Volume รวม']);
const volatility = parseNumber(rows['Volatility']);
const volChange = parseNumber(rows['Vol Change']);
const futureChange = parseNumber(rows['Future Change']);

if (!symbol) {
  throw new Error(`Unable to identify GC symbol from: ${symbolRaw}`);
}

if (futureSettlement === null) {
  throw new Error('Future Settlement is missing or invalid');
}

if (putVolume === null || callVolume === null) {
  throw new Error('Put/Call volume is missing or invalid');
}

console.log('===== CME VOL2VOL PRODUCTION IMPORT =====');
console.log('File:', file);
console.log('Date:', dataDate);
console.log('Symbol:', symbol);
console.log('Future Settlement:', futureSettlement);
console.log('Put Volume:', putVolume);
console.log('Call Volume:', callVolume);
console.log('Volatility:', volatility);
console.log('Vol Change:', volChange);
console.log('Future Change:', futureChange);

const expectedRangeRaw = JSON.stringify({
  sd1: null,
  sd2: null,
  sd3: null,
});

const insert = db.prepare(`
  INSERT INTO cme_vol2vol_data (
    symbol,
    data_date,
    data_time,
    future_settlement,
    volatility_settlement,
    put_volume,
    call_volume,
    expected_range_low,
    expected_range_high,
    expected_range_raw,
    source,
    note,
    input_method
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

db.exec('BEGIN');

try {
  insert.run(
    symbol,
    dataDate,
    null,
    futureSettlement,
    volatility,
    putVolume,
    callVolume,
    null,
    null,
    expectedRangeRaw,
    'CME',
    `Kimi AI CME Vol2Vol import; Vol Change=${volChange}; Future Change=${futureChange}`,
    'MANUAL'
  );

  db.exec('COMMIT');

  console.log('Import committed successfully.');
} catch (error) {
  db.exec('ROLLBACK');
  console.error('Import failed. Transaction rolled back.');
  console.error(error);
  process.exit(1);
}

const latest = db.prepare(`
  SELECT
    id,
    symbol,
    data_date,
    future_settlement,
    volatility_settlement,
    put_volume,
    call_volume,
    source,
    input_method,
    note
  FROM cme_vol2vol_data
  WHERE symbol = 'GC'
  ORDER BY data_date DESC, id DESC
  LIMIT 1
`).get();

const count = db.prepare(`
  SELECT COUNT(*) AS count
  FROM cme_vol2vol_data
  WHERE symbol = 'GC'
`).get();

console.log('\n===== RESULT =====');
console.log('GC count:', count);
console.log('Latest:', latest);

console.log('\nCME VOL2VOL PRODUCTION IMPORT: PASS');
