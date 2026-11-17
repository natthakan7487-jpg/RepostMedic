import type {
  DailyTemperatureLog,
  DashboardAnalytics,
  DormSelectorKey,
  DormTemps,
  MonthlyChartPoint,
  ScreeningReport,
} from '../types/report';

export const HEAT_THRESHOLD_C = 33;

const THAI_SHORT_MONTHS = [
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.',
];

const THAI_FULL_MONTHS = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
];

export function isHeatCritical(temp: number | null | undefined): boolean {
  if (temp === null || temp === undefined || Number.isNaN(temp)) {
    return false;
  }
  return temp >= HEAT_THRESHOLD_C;
}

export function isHeatExtreme(temp: number | null | undefined): boolean {
  if (temp === null || temp === undefined || Number.isNaN(temp)) {
    return false;
  }
  return temp > HEAT_THRESHOLD_C;
}

export function getHeatStatusLabel(temp: number | null | undefined): string {
  if (temp === null || temp === undefined || Number.isNaN(temp)) {
    return 'ยังไม่บันทึก';
  }
  if (temp > HEAT_THRESHOLD_C) {
    return 'ดัชนีร้อนมาก (>33°C)';
  }
  if (temp === HEAT_THRESHOLD_C) {
    return 'ถึงเกณฑ์เฝ้าระวัง (33°C)';
  }
  return 'ปกติ (<33°C)';
}

export function calculateRemainingRecruits(
  totalRecruits: number,
  hospitalCount: number,
  referredCount: number
): number {
  const safeTotal = Number.isFinite(totalRecruits) ? totalRecruits : 0;
  const safeHosp = Number.isFinite(hospitalCount) ? hospitalCount : 0;
  const safeReferred = Number.isFinite(referredCount) ? referredCount : 0;
  return Math.max(0, safeTotal - safeHosp - safeReferred);
}

export function sumYellowHeatRisk(report: ScreeningReport): number {
  const y = report.heatRisk.yellowSeparate;
  return (
    (y.chronicDisease || 0) +
    (y.bmiOver28 || 0) +
    (y.accidentInjury || 0) +
    (y.fever368to372 || 0) +
    (y.weightLoss2to5 || 0)
  );
}

export function sumRedHeatRisk(report: ScreeningReport): number {
  const r = report.heatRisk.redExempt;
  return (r.bmiOver30 || 0) + (r.feverOver372 || 0) + (r.weightLossOver5 || 0);
}

export function sumQuarantineTotal(report: ScreeningReport): number {
  const q = report.quarantine;
  return (
    (q.uq || 0) +
    (q.ciCovid || 0) +
    (q.ciFlu || 0) +
    (q.infirmaryObservation || 0) +
    (q.hospitalAdmit || 0) +
    (q.hospitalCheckup || 0)
  );
}

export function formatThaiShortDate(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!match) return isoDate;
  const year = Number(match[1]);
  const monthIdx = Number(match[2]) - 1;
  const day = Number(match[3]);
  const beShort = String((year + 543) % 100).padStart(2, '0');
  const monthName = THAI_SHORT_MONTHS[monthIdx] || '';
  return `${day} ${monthName}${beShort}`;
}

export function formatThaiFullDateTime(isoDate: string, timeText: string): string {
  const short = formatThaiShortDate(isoDate);
  const cleanTime = timeText.trim() || '20:00 น.';
  return `วันที่ ${short} เวลา ${cleanTime}`;
}

export function formatThaiMonthYear(monthKey: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(monthKey.trim());
  if (!match) return monthKey;
  const year = Number(match[1]) + 543;
  const monthIdx = Number(match[2]) - 1;
  return `${THAI_FULL_MONTHS[monthIdx] || ''} ${year}`;
}

export function formatShortDayMonth(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!match) return isoDate;
  const day = Number(match[3]);
  const monthIdx = Number(match[2]) - 1;
  return `${day} ${THAI_SHORT_MONTHS[monthIdx] || ''}`;
}

export function getMonthKeyFromIso(isoDate: string): string {
  return isoDate.slice(0, 7);
}

export function pickDormValue(temps: DormTemps, selector: DormSelectorKey): number | null {
  if (selector === 'dorm1' || selector === 'dorm2' || selector === 'dorm3' || selector === 'dorm4') {
    return temps[selector];
  }
  const vals = [temps.dorm1, temps.dorm2, temps.dorm3, temps.dorm4].filter(
    (v): v is number => typeof v === 'number' && !Number.isNaN(v)
  );
  if (vals.length === 0) return null;
  if (selector === 'max') {
    return Math.max(...vals);
  }
  const avg = vals.reduce((acc, v) => acc + v, 0) / vals.length;
  return Math.round(avg * 10) / 10;
}

export function buildMonthlyChartSeries(
  logs: DailyTemperatureLog[],
  monthKey: string,
  dormSelector: DormSelectorKey
): MonthlyChartPoint[] {
  return logs
    .filter((log) => getMonthKeyFromIso(log.isoDate) === monthKey)
    .sort((a, b) => a.isoDate.localeCompare(b.isoDate))
    .map((log) => ({
      id: log.id,
      isoDate: log.isoDate,
      shortDateLabel: formatShortDayMonth(log.isoDate),
      recorderName: log.recorderName || 'ไม่ระบุผู้บันทึก',
      temp1900: pickDormValue(log.time1900, dormSelector),
      temp2100: pickDormValue(log.time2100, dormSelector),
      temp2200: pickDormValue(log.time2200, dormSelector),
    }));
}

export function computeDashboardAnalytics(
  reports: ScreeningReport[],
  tempLogs: DailyTemperatureLog[]
): DashboardAnalytics {
  const sortedReports = [...reports].sort((a, b) => b.isoDate.localeCompare(a.isoDate));
  const latest = sortedReports[0];

  const latestTotal = latest ? latest.totalRecruits : 0;
  const latestRemaining = latest
    ? calculateRemainingRecruits(latest.totalRecruits, latest.hospitalCount, latest.referredCount)
    : 0;
  const latestRemainingPct =
    latestTotal > 0 ? Math.round((latestRemaining / latestTotal) * 1000) / 10 : 0;

  const totalYellowRiskLatest = latest ? sumYellowHeatRisk(latest) : 0;
  const totalRedRiskLatest = latest ? sumRedHeatRisk(latest) : 0;
  const totalUrineAlertLatest = latest
    ? (latest.urineColor.level3 || 0) + (latest.urineColor.level4 || 0)
    : 0;

  let overThresholdTempReadings = 0;
  let totalTempReadings = 0;
  let highestRecordedTemp: number | null = null;

  for (const log of tempLogs) {
    const slots = [log.time1900, log.time2100, log.time2200];
    for (const dorms of slots) {
      const vals = [dorms.dorm1, dorms.dorm2, dorms.dorm3, dorms.dorm4];
      for (const v of vals) {
        if (typeof v === 'number' && !Number.isNaN(v)) {
          totalTempReadings += 1;
          if (isHeatCritical(v)) {
            overThresholdTempReadings += 1;
          }
          if (highestRecordedTemp === null || v > highestRecordedTemp) {
            highestRecordedTemp = v;
          }
        }
      }
    }
  }

  return {
    totalScreeningReports: reports.length,
    totalTempLogs: tempLogs.length,
    latestTotalRecruits: latestTotal,
    latestRemainingRecruits: latestRemaining,
    latestRemainingPct,
    totalYellowRiskLatest,
    totalRedRiskLatest,
    totalUrineAlertLatest,
    overThresholdTempReadings,
    totalTempReadings,
    highestRecordedTemp,
  };
}

export function validateScreeningReport(report: ScreeningReport): string[] {
  const errors: string[] = [];
  if (!report.isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(report.isoDate)) {
    errors.push('กรุณาระบุวัน/เดือน/ปี ให้ถูกต้อง');
  }
  if (!report.dateTimeLabel.trim()) {
    errors.push('กรุณาระบุข้อความวัน/เดือน/ปี และเวลา');
  }
  if (report.totalRecruits < 0 || Number.isNaN(report.totalRecruits)) {
    errors.push('ยอดทหารใหม่ทั้งหมดต้องไม่ติดลบ');
  }
  if (report.hospitalCount < 0 || report.referredCount < 0 || report.externalMissionCount < 0) {
    errors.push('จำนวนกำลังพลในแต่ละรายการต้องไม่ติดลบ');
  }
  if (report.hospitalCount + report.referredCount > report.totalRecruits) {
    errors.push('ผลรวม นอน รพ. และ ส่งต่อการรักษา ต้องไม่เกินยอดทหารใหม่ทั้งหมด');
  }
  return errors;
}

export function validateTemperatureLog(log: DailyTemperatureLog): string[] {
  const errors: string[] = [];
  if (!log.isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(log.isoDate)) {
    errors.push('กรุณาเลือกวันที่ให้ถูกต้อง');
  }
  if (!log.recorderName.trim()) {
    errors.push('กรุณาระบุชื่อ-สกุล ผู้บันทึก');
  }
  const hasAnyReading = [log.time1900, log.time2100, log.time2200].some((slot) =>
    [slot.dorm1, slot.dorm2, slot.dorm3, slot.dorm4].some(
      (v) => typeof v === 'number' && !Number.isNaN(v)
    )
  );
  if (!hasAnyReading) {
    errors.push('กรุณากรอกอุณหภูมิโรงนอนอย่างน้อย 1 ช่องเวลา');
  }
  return errors;
}

export function buildShareReportUrl(
  origin: string,
  pathname: string,
  type: 'infographic' | 'temp',
  tokenOrId: string
): string {
  const cleanOrigin = origin.replace(/\/+$/, '');
  const cleanPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  const cleanToken = tokenOrId.trim();
  return `${cleanOrigin}${cleanPath}?share=${type}&token=${encodeURIComponent(cleanToken)}`;
}

