import React, { useMemo, useRef, useState } from 'react';
import {
  Check,
  Eye,
  FileDown,
  FileSpreadsheet,
  QrCode,
  Search,
  Share2,
  Trash2,
} from 'lucide-react';
import type { DailyTemperatureLog, ScreeningReport } from '../types/report';
import type { AppColorTheme } from '../utils/themes';
import { getThemeById } from '../utils/themes';
import {
  buildShareReportUrl,
  calculateRemainingRecruits,
  computeDashboardAnalytics,
  isHeatCritical,
  sumRedHeatRisk,
  sumYellowHeatRisk,
} from '../utils/calculations';
import { exportAllToExcel, exportElementToPdf } from '../utils/exportUtils';
import { QrShareModal, type QrSelection } from './QrShareModal';

interface Part5DashboardExportProps {
  reports: ScreeningReport[];
  tempLogs: DailyTemperatureLog[];
  theme?: AppColorTheme;
  onOpenReportInForm: (report: ScreeningReport) => void;
  onOpenReportInInfographic: (report: ScreeningReport) => void;
  onDeleteReport: (id: string) => Promise<void>;
  onOpenTempLog: (isoDate: string) => void;
  onDeleteTempLog: (id: string) => Promise<void>;
  onClearAllData?: () => Promise<void>;
}

export const Part5DashboardExport: React.FC<Part5DashboardExportProps> = ({
  reports,
  tempLogs,
  theme,
  onOpenReportInForm,
  onOpenReportInInfographic,
  onDeleteReport,
  onOpenTempLog,
  onDeleteTempLog,
  onClearAllData,
}) => {
  const activeTheme = theme ?? getThemeById('army-olive');
  const dashboardCaptureRef = useRef<HTMLDivElement | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [qrSelection, setQrSelection] = useState<QrSelection | null>(null);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const analytics = useMemo(
    () => computeDashboardAnalytics(reports, tempLogs),
    [reports, tempLogs]
  );

  const filteredReports = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return [...reports]
      .sort((a, b) => b.isoDate.localeCompare(a.isoDate))
      .filter((r) => {
        if (!q) return true;
        return (
          r.dateTimeLabel.toLowerCase().includes(q) ||
          r.isoDate.includes(q) ||
          r.hospitalList.some((p) => p.fullName.toLowerCase().includes(q)) ||
          r.externalMissionList.some((p) => p.fullName.toLowerCase().includes(q))
        );
      });
  }, [reports, searchQuery]);

  const filteredTempLogs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return [...tempLogs]
      .sort((a, b) => b.isoDate.localeCompare(a.isoDate))
      .filter((t) => {
        if (!q) return true;
        return (
          t.displayDate.toLowerCase().includes(q) ||
          t.isoDate.includes(q) ||
          t.recorderName.toLowerCase().includes(q)
        );
      });
  }, [tempLogs, searchQuery]);

  const handleCopyShare = async (type: 'infographic' | 'temp', tokenOrId: string) => {
    const url = buildShareReportUrl(
      window.location.origin,
      window.location.pathname,
      type,
      tokenOrId
    );
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // ignore
    }
    setCopiedId(`${type}-${tokenOrId}`);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleOpenQuickQr = () => {
    if (filteredReports[0]) {
      setQrSelection({ type: 'infographic', id: filteredReports[0].id });
    } else if (filteredTempLogs[0]) {
      setQrSelection({ type: 'temp', id: filteredTempLogs[0].id });
    }
  };

  const handleExportExcel = () => {
    exportAllToExcel(
      filteredReports,
      filteredTempLogs,
      `ฐานข้อมูลรายงานคัดกรอง_ร8พัน3_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  const handleExportPdf = async () => {
    if (!dashboardCaptureRef.current) return;
    setIsExportingPdf(true);
    try {
      await exportElementToPdf(
        dashboardCaptureRef.current,
        `สรุปผลแดชบอร์ด_ร8พัน3_${new Date().toISOString().slice(0, 10)}.pdf`,
        'landscape'
      );
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header & Instant Exports */}
      <div className="no-print flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            ส่วนที่ 5 · ฐานข้อมูลประวัติย้อนหลัง แดชบอร์ดวิเคราะห์ผล และส่งออกรายงาน
          </h1>
          <p className="mt-0.5 text-sm text-slate-600">
            รวมข้อมูลจากส่วนที่ 1–4 เพื่อเรียกดูย้อนหลัง วิเคราะห์แนวโน้ม และส่งออกเป็น PDF หรือ Excel ได้ทันที
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            disabled={filteredReports.length === 0 && filteredTempLogs.length === 0}
            onClick={handleOpenQuickQr}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            <QrCode className="h-4 w-4" />
            สร้าง QR Code สแกนมือถือ
          </button>
          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-900 whitespace-nowrap shrink-0"
          >
            <FileSpreadsheet className="h-4 w-4" />
            ส่งออก Excel (.xlsx)
          </button>
          <button
            type="button"
            disabled={isExportingPdf}
            onClick={handleExportPdf}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            <FileDown className="h-4 w-4" />
            {isExportingPdf ? 'กำลังสร้าง PDF...' : 'ส่งออก PDF (.pdf)'}
          </button>
          {onClearAllData && (reports.length > 0 || tempLogs.length > 0) && (
            <button
              type="button"
              onClick={() => setConfirmClearOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-red-50 px-3.5 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 whitespace-nowrap shrink-0"
            >
              <Trash2 className="h-4 w-4" />
              ล้างข้อมูลทั้งหมด
            </button>
          )}
        </div>
      </div>

      {/* Search & Filter */}
      <div className="no-print flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
        <Search className="h-4 w-4 text-slate-400" />
        <label htmlFor="db-search" className="sr-only">
          ค้นหาประวัติรายงานหรือชื่อผู้บันทึก
        </label>
        <input
          id="db-search"
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="ค้นหาตามวันที่, ชื่อทหารใหม่ (เช่น ธันวา), หรือชื่อผู้บันทึกอุณหภูมิ..."
          className="w-full text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
        />
      </div>

      {/* Analytics + Historical Tables (Captured cleanly for PDF) */}
      <div ref={dashboardCaptureRef} className="space-y-5 rounded-2xl bg-slate-50 p-1">
        {/* KPI Strip */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-slate-500">
              รายงานคัดกรองที่จัดเก็บทั้งหมด
            </div>
            <div className="mt-1.5 text-3xl font-bold font-mono-num text-slate-900">
              {analytics.totalScreeningReports}{' '}
              <span className="text-sm font-medium text-slate-500">ฉบับ</span>
            </div>
            <div className="mt-1 text-xs text-slate-600 font-mono-num">
              ยอดล่าสุด {analytics.latestRemainingRecruits}/{analytics.latestTotalRecruits} นาย (
              {analytics.latestRemainingPct}%)
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-slate-500">
              ความเสี่ยงความร้อนล่าสุด (🟡 / 🔴)
            </div>
            <div className="mt-1.5 text-3xl font-bold font-mono-num text-amber-700">
              {analytics.totalYellowRiskLatest + analytics.totalRedRiskLatest}{' '}
              <span className="text-sm font-medium text-slate-500">นาย</span>
            </div>
            <div className="mt-1 text-xs text-slate-600 font-mono-num">
              แยกฝึก 🟡 {analytics.totalYellowRiskLatest} · งดฝึก 🔴 {analytics.totalRedRiskLatest}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-slate-500">
              สีปัสสาวะระดับ 3–4 (เฝ้าระวังขาดน้ำ)
            </div>
            <div className="mt-1.5 text-3xl font-bold font-mono-num text-orange-700">
              {analytics.totalUrineAlertLatest}{' '}
              <span className="text-sm font-medium text-slate-500">นาย</span>
            </div>
            <div className="mt-1 text-xs text-slate-600">จากข้อมูลคัดกรองฉบับล่าสุด</div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-xs font-semibold text-slate-500">
              ค่าความร้อนโรงนอนเกินเกณฑ์ (&ge; 33°C)
            </div>
            <div className="mt-1.5 text-3xl font-bold font-mono-num text-red-700">
              {analytics.overThresholdTempReadings}{' '}
              <span className="text-sm font-medium text-slate-500">
                / {analytics.totalTempReadings} ครั้ง
              </span>
            </div>
            <div className="mt-1 text-xs text-slate-600 font-mono-num">
              สูงสุดที่ตรวจพบ:{' '}
              {analytics.highestRecordedTemp !== null
                ? `${analytics.highestRecordedTemp.toFixed(1)}°C`
                : '-'}
            </div>
          </div>
        </div>

        {/* Visual Analytics Breakdown: Dorm Heat Alerts + Latest Risk Profile */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-bold text-slate-900">
              วิเคราะห์ความถี่โรงนอนอุณหภูมิเกิน 33.0°C (แยกตามโรงนอน)
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              นับรวมทุกช่วงเวลา (19:00, 21:00, 22:00 น.) จากบันทึกทั้งหมดในฐานข้อมูล
            </p>
            <div className="mt-4 space-y-3">
              {(
                [
                  ['dorm1', 'โรงนอนที่ 1'],
                  ['dorm2', 'โรงนอนที่ 2'],
                  ['dorm3', 'โรงนอนที่ 3'],
                  ['dorm4', 'โรงนอนที่ 4'],
                ] as const
              ).map(([dormKey, label]) => {
                let overCount = 0;
                let totalCount = 0;
                for (const t of tempLogs) {
                  for (const slot of [t.time1900, t.time2100, t.time2200]) {
                    const val = slot[dormKey];
                    if (typeof val === 'number') {
                      totalCount += 1;
                      if (isHeatCritical(val)) overCount += 1;
                    }
                  }
                }
                const pct = totalCount > 0 ? Math.round((overCount / totalCount) * 100) : 0;
                return (
                  <div key={dormKey} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">{label}</span>
                      <span className="font-mono-num text-slate-600">
                        เกินเกณฑ์{' '}
                        <strong className={overCount > 0 ? 'text-red-700' : 'text-emerald-700'}>
                          {overCount}
                        </strong>{' '}
                        / {totalCount} ครั้ง ({pct}%)
                      </span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${
                          overCount > 0 ? 'bg-red-600' : 'bg-emerald-600'
                        }`}
                        style={{ width: `${Math.max(4, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-bold text-slate-900">
              สัดส่วนกลุ่มสีความเสี่ยงภายในหน่วย (ข้อมูลคัดกรองล่าสุด)
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {filteredReports[0]?.dateTimeLabel ?? 'ยังไม่มีข้อมูลรายงาน'}
            </p>
            {filteredReports[0] ? (
              <div className="mt-4 space-y-3">
                {[
                  {
                    label: '⚪️ ปกติ',
                    val: filteredReports[0].riskColors.normalWhite,
                    bar: 'bg-slate-500',
                  },
                  {
                    label: '🟢 เขียว',
                    val: filteredReports[0].riskColors.green,
                    bar: 'bg-emerald-600',
                  },
                  {
                    label: '🟡 เหลือง',
                    val: filteredReports[0].riskColors.yellow,
                    bar: 'bg-amber-500',
                  },
                  {
                    label: '🔴 แดง',
                    val: filteredReports[0].riskColors.red,
                    bar: 'bg-red-600',
                  },
                ].map((row) => {
                  const total = Math.max(1, filteredReports[0].totalRecruits);
                  const pct = Math.round((row.val / total) * 100);
                  return (
                    <div key={row.label} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700">{row.label}</span>
                        <span className="font-mono-num text-slate-700">
                          <strong>{row.val}</strong> นาย ({pct}%)
                        </span>
                      </div>
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${row.bar}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-10 text-center text-xs text-slate-400">ยังไม่มีข้อมูล</div>
            )}
          </section>
        </div>

        {/* Screening History Table */}
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">
              ประวัติรายงานผลการคัดกรอง (ส่วนที่ 1 &amp; 2)
            </h2>
            <span className="text-xs font-mono-num text-slate-500">
              แสดง {filteredReports.length} รายการ
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <th className="px-3 py-2.5 font-semibold">วัน/เดือน/ปี และเวลา</th>
                  <th className="px-3 py-2.5 font-semibold text-right">ทั้งหมด</th>
                  <th className="px-3 py-2.5 font-semibold text-right">รพ./ส่งต่อ</th>
                  <th className="px-3 py-2.5 font-semibold text-right">คงเหลือ</th>
                  <th className="px-3 py-2.5 font-semibold text-right">🟡 แยกฝึก</th>
                  <th className="px-3 py-2.5 font-semibold text-right">🔴 งดฝึก</th>
                  <th className="px-3 py-2.5 font-semibold text-right">ปัสสาวะ 3–4</th>
                  <th className="no-print px-3 py-2.5 font-semibold text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredReports.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      ไม่พบรายงานคัดกรองที่ตรงกับคำค้นหา
                    </td>
                  </tr>
                ) : (
                  filteredReports.map((r) => {
                    const remaining = calculateRemainingRecruits(
                      r.totalRecruits,
                      r.hospitalCount,
                      r.referredCount
                    );
                    const y = sumYellowHeatRisk(r);
                    const red = sumRedHeatRisk(r);
                    const urineAlert = r.urineColor.level3 + r.urineColor.level4;
                    const token = r.shareToken || r.id;

                    return (
                      <tr key={r.id} className="hover:bg-slate-50/80">
                        <td className="px-3 py-2.5 font-semibold text-slate-900">
                          {r.dateTimeLabel}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono-num">
                          {r.totalRecruits}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono-num text-red-700">
                          {r.hospitalCount} / {r.referredCount}
                        </td>
                        <td className="px-3 py-2.5 text-right font-bold font-mono-num text-emerald-800">
                          {remaining}
                        </td>
                        <td className="px-3 py-2.5 text-right font-semibold font-mono-num text-amber-700">
                          {y}
                        </td>
                        <td className="px-3 py-2.5 text-right font-semibold font-mono-num text-red-700">
                          {red}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono-num text-orange-700">
                          {urineAlert}
                        </td>
                        <td className="no-print px-3 py-2.5 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => onOpenReportInForm(r)}
                              className="rounded border border-slate-300 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
                            >
                              แก้ไข
                            </button>
                            <button
                              type="button"
                              onClick={() => onOpenReportInInfographic(r)}
                              className="inline-flex items-center gap-1 rounded bg-emerald-800 px-2 py-1 text-[11px] font-medium text-white hover:bg-emerald-900"
                            >
                              <Eye className="h-3 w-3" />
                              Infographic
                            </button>
                            <button
                              type="button"
                              onClick={() => setQrSelection({ type: 'infographic', id: r.id })}
                              aria-label={`สร้าง QR Code Infographic ${r.dateTimeLabel}`}
                              className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 whitespace-nowrap shrink-0"
                            >
                              <QrCode className="h-3 w-3" />
                              QR Code
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCopyShare('infographic', token)}
                              aria-label={`คัดลอกลิ้งค์ Infographic วันที่ ${r.dateTimeLabel}`}
                              className="rounded border border-slate-300 p-1 text-slate-600 hover:bg-slate-100"
                            >
                              {copiedId === `infographic-${token}` ? (
                                <Check className="h-3.5 w-3.5 text-emerald-700" />
                              ) : (
                                <Share2 className="h-3.5 w-3.5" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteReport(r.id)}
                              aria-label={`ลบรายงาน ${r.dateTimeLabel}`}
                              className="rounded border border-red-200 p-1 text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Temperature History Table */}
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">
              ประวัติการบันทึกอุณหภูมิโรงนอน (ส่วนที่ 3 &amp; 4)
            </h2>
            <span className="text-xs font-mono-num text-slate-500">
              แสดง {filteredTempLogs.length} วัน
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <th className="px-3 py-2.5 font-semibold">วันที่</th>
                  <th className="px-3 py-2.5 font-semibold">19:00 น. (น.1-4)</th>
                  <th className="px-3 py-2.5 font-semibold">21:00 น. (น.1-4)</th>
                  <th className="px-3 py-2.5 font-semibold">22:00 น. (น.1-4)</th>
                  <th className="px-3 py-2.5 font-semibold">ผู้บันทึก</th>
                  <th className="no-print px-3 py-2.5 font-semibold text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTempLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      ไม่พบข้อมูลอุณหภูมิที่ตรงกับคำค้นหา
                    </td>
                  </tr>
                ) : (
                  filteredTempLogs.map((t) => {
                    const renderSlot = (dorms: DailyTemperatureLog['time1900']) => {
                      const vals = [dorms.dorm1, dorms.dorm2, dorms.dorm3, dorms.dorm4];
                      return (
                        <div className="flex flex-wrap gap-1.5 font-mono-num">
                          {vals.map((v, i) => (
                            <span
                              key={i}
                              className={
                                isHeatCritical(v)
                                  ? 'font-bold text-red-700'
                                  : 'text-slate-700'
                              }
                            >
                              {v !== null ? v.toFixed(1) : '-'}
                              {i < 3 ? ' ·' : ''}
                            </span>
                          ))}
                        </div>
                      );
                    };

                    const token = t.shareToken || t.id;
                    return (
                      <tr key={t.id} className="hover:bg-slate-50/80">
                        <td className="px-3 py-2.5 font-bold font-mono-num text-slate-900">
                          {t.displayDate}
                        </td>
                        <td className="px-3 py-2.5">{renderSlot(t.time1900)}</td>
                        <td className="px-3 py-2.5">{renderSlot(t.time2100)}</td>
                        <td className="px-3 py-2.5">{renderSlot(t.time2200)}</td>
                        <td className="px-3 py-2.5 text-slate-800">{t.recorderName}</td>
                        <td className="no-print px-3 py-2.5 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => onOpenTempLog(t.isoDate)}
                              className="rounded border border-slate-300 px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
                            >
                              เปิดดู/แก้ไข
                            </button>
                            <button
                              type="button"
                              onClick={() => setQrSelection({ type: 'temp', id: t.id })}
                              aria-label={`สร้าง QR Code อุณหภูมิวันที่ ${t.displayDate}`}
                              className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 whitespace-nowrap shrink-0"
                            >
                              <QrCode className="h-3 w-3" />
                              QR Code
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCopyShare('temp', token)}
                              aria-label={`คัดลอกลิ้งค์อุณหภูมิวันที่ ${t.displayDate}`}
                              className="rounded border border-slate-300 p-1 text-slate-600 hover:bg-slate-100"
                            >
                              {copiedId === `temp-${token}` ? (
                                <Check className="h-3.5 w-3.5 text-emerald-700" />
                              ) : (
                                <Share2 className="h-3.5 w-3.5" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteTempLog(t.id)}
                              aria-label={`ลบบันทึกอุณหภูมิวันที่ ${t.displayDate}`}
                              className="rounded border border-red-200 p-1 text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <QrShareModal
        isOpen={qrSelection !== null}
        selection={qrSelection}
        reports={reports}
        tempLogs={tempLogs}
        theme={activeTheme}
        onSelectChange={setQrSelection}
        onClose={() => setQrSelection(null)}
      />

      {confirmClearOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="clear-data-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <h2 id="clear-data-title" className="text-base font-bold text-slate-900">
              ยืนยันการล้างข้อมูลทั้งหมด
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              ระบบจะลบรายงานผลการคัดกรองและบันทึกอุณหภูมิโรงนอนทั้งหมดออกจากฐานข้อมูล เพื่อให้พร้อมสำหรับการบันทึกข้อมูลจริง
            </p>
            <div className="mt-5 flex justify-end gap-2.5">
              <button
                type="button"
                disabled={isClearing}
                onClick={() => setConfirmClearOpen(false)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={isClearing}
                onClick={async () => {
                  if (!onClearAllData) return;
                  setIsClearing(true);
                  try {
                    await onClearAllData();
                    setConfirmClearOpen(false);
                  } finally {
                    setIsClearing(false);
                  }
                }}
                className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isClearing ? 'กำลังล้างข้อมูล...' : 'ยืนยันล้างข้อมูลทั้งหมด'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
