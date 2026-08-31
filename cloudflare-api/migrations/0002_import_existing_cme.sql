INSERT INTO cme_market_data (
  id,
  symbol,
  data_date,
  data_time,
  settlement_price,
  volume,
  volume_zscore,
  open_interest,
  oi_change,
  oi_zscore,
  source,
  note,
  created_at,
  updated_at,
  created_by,
  input_method,
  image_reference
) VALUES
(2, 'GC', '2026-08-20', '', NULL, NULL, NULL, NULL, NULL, NULL, 'CME', '', '2026-08-20 03:50:28', '2026-08-20 03:50:28', NULL, 'MANUAL', NULL),

(3, 'GC', '2026-08-20', '08:30', 3392.5, 152340, 2.1, 485200, 12450, 3.1, 'CME', 'OCR TEST', '2026-08-20 04:38:25', '2026-08-20 04:38:25', NULL, 'OCR', 'test-cme-screenshot.png'),

(4, 'GC', '2026-08-20', '09:00', 3400.5, 175000, 0, 492000, 6800, 0, 'CME', NULL, '2026-08-20 05:38:27', '2026-08-20 05:38:27', NULL, 'MANUAL', NULL),

(5, 'GC', '2026-08-20', '09:30', 3405.5, 198000, 0, 498500, 6500, 0, 'CME', NULL, '2026-08-20 06:18:55', '2026-08-20 06:18:55', NULL, 'MANUAL', NULL),

(6, 'GC', '2026-08-20', '08:30', 3392.5, 152340, 0, NULL, -498500, 0, 'CME', NULL, '2026-08-20 09:14:01', '2026-08-20 09:14:01', NULL, 'MANUAL', NULL),

(7, 'GC', '2026-08-20', '08:30', 3392.5, 152340, -5.656383816155167, NULL, -498500, 0, 'CME', NULL, '2026-08-20 09:19:52', '2026-08-20 09:19:52', NULL, 'MANUAL', NULL),

(8, 'GC', '2026-08-20', '10:00', 3410.5, 200000, -0.824746211155004, 500000, 1500, 0, 'CME', 'API TEST', '2026-08-20 12:32:55', '2026-08-20 12:32:55', NULL, 'MANUAL', NULL);
