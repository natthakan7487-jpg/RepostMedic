import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMonthlyChartSeries,
  buildShareReportUrl,
  calculateRemainingRecruits,
  computeDashboardAnalytics,
  formatThaiFullDateTime,
  formatThaiMonthYear,
  formatThaiShortDate,
  isHeatCritical,
  isHeatExtreme,
  validateScreeningReport,
  validateTemperatureLog,
} from './calculations';
import { SEED_SCREENING_REPORTS, SEED_TEMP_LOGS } from '../data/seedData';

test('calculateRemainingRecruits applies exact subtraction formula', () => {
  assert.equal(calculateRemainingRecruits(150, 2, 1), 147);
  assert.equal(calculateRemainingRecruits(100, 0, 0), 100);
  assert.equal(calculateRemainingRecruits(10, 8, 5), 0);
});

test('heat index threshold detects < 33 normal vs >= 33 critical red', () => {
  assert.equal(isHeatCritical(32.9), false);
  assert.equal(isHeatCritical(33.0), true);
  assert.equal(isHeatCritical(34.5), true);
  assert.equal(isHeatExtreme(33.0), false);
  assert.equal(isHeatExtreme(33.1), true);
  assert.equal(isHeatCritical(null), false);
});

test('Thai Buddhist Era date formatting converts 2026-11-15 to 15 พ.ย.69', () => {
  assert.equal(formatThaiShortDate('2026-11-15'), '15 พ.ย.69');
  assert.equal(
    formatThaiFullDateTime('2026-11-15', '20:00 น.'),
    'วันที่ 15 พ.ย.69 เวลา 20:00 น.'
  );
  assert.equal(formatThaiMonthYear('2026-11'), 'พฤศจิกายน 2569');
});

test('buildMonthlyChartSeries sorts chronologically and pulls recorder names', () => {
  const series = buildMonthlyChartSeries(SEED_TEMP_LOGS, '2026-11', 'dorm1');
  assert.ok(series.length >= 10);
  assert.ok(series[0].isoDate < series[series.length - 1].isoDate);
  assert.ok(series[0].recorderName.length > 0);
  assert.equal(typeof series[0].temp1900, 'number');
  assert.equal(typeof series[0].temp2100, 'number');
  assert.equal(typeof series[0].temp2200, 'number');
});

test('computeDashboardAnalytics summarizes seed reports and temp alerts accurately', () => {
  const analytics = computeDashboardAnalytics(SEED_SCREENING_REPORTS, SEED_TEMP_LOGS);
  assert.equal(analytics.totalScreeningReports, SEED_SCREENING_REPORTS.length);
  assert.equal(analytics.totalTempLogs, SEED_TEMP_LOGS.length);
  assert.ok(analytics.latestRemainingRecruits <= analytics.latestTotalRecruits);
  assert.ok(analytics.overThresholdTempReadings > 0);
  assert.ok((analytics.highestRecordedTemp ?? 0) >= 33);
});

test('validators reject invalid counts or missing recorder name', () => {
  const badReport = {
    ...SEED_SCREENING_REPORTS[0],
    totalRecruits: 5,
    hospitalCount: 4,
    referredCount: 3,
  };
  assert.ok(validateScreeningReport(badReport).length > 0);

  const badLog = {
    ...SEED_TEMP_LOGS[0],
    recorderName: '   ',
  };
  assert.ok(validateTemperatureLog(badLog).length > 0);
});

test('buildShareReportUrl constructs properly encoded infographic and temp share URLs', () => {
  assert.equal(
    buildShareReportUrl('https://example.app/', '/', 'infographic', 'r8b3-20261115'),
    'https://example.app/?share=infographic&token=r8b3-20261115'
  );
  assert.equal(
    buildShareReportUrl('https://example.app', 'reports', 'temp', 'tmp token 1'),
    'https://example.app/reports?share=temp&token=tmp%20token%201'
  );
});

