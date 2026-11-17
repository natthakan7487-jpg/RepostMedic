import React, { useMemo, useRef, useState } from 'react';
import { Camera, Check, Printer, Save } from 'lucide-react';
import type {
  CommanderSignature,
  DailyTemperatureLog,
  DormSelectorKey,
} from '../types/report';
import type { AppColorTheme } from '../utils/themes';
import { getThemeById } from '../utils/themes';
import {
  HEAT_THRESHOLD_C,
  buildMonthlyChartSeries,
  formatThaiMonthYear,
  getMonthKeyFromIso,
} from '../utils/calculations';
import { exportElementToPdf, exportElementToPng } from '../utils/exportUtils';

interface Part4MonthlyLineGraphProps {
  logs: DailyTemperatureLog[];
  signature: CommanderSignature;
  theme?: AppColorTheme;
  onSaveSignature: (sig: CommanderSignature) => Promise<void>;
}

const DORM_OPTIONS: Array<{ value: DormSelectorKey; label: string }> = [
  { value: 'dorm1', label: 'โรงนอนที่ 1' },
  { value: 'dorm2', label: 'โรงนอนที่ 2' },
  { value: 'dorm3', label: 'โรงนอนที่ 3' },
  { value: 'dorm4', label: 'โรงนอนที่ 4' },
  { value: 'max', label: 'ค่าสูงสุดทั้ง 4 โรงนอน' },
  { value: 'avg', label: 'ค่าเฉลี่ย 4 โรงนอน' },
];

export const Part4MonthlyLineGraph: React.FC<Part4MonthlyLineGraphProps> = ({
  logs,
  signature,
  theme,
  onSaveSignature,
}) => {
  const activeTheme = theme ?? getThemeById('army-olive');
  const captureRef = useRef<HTMLDivElement | null>(null);

  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    for (const log of logs) {
      set.add(getMonthKeyFromIso(log.isoDate));
    }
    const arr = Array.from(set).sort((a, b) => b.localeCompare(a));
    return arr.length > 0 ? arr : ['2026-11'];
  }, [logs]);

  const [selectedMonth, setSelectedMonth] = useState<string>(availableMonths[0]);
  const [selectedDorm, setSelectedDorm] = useState<DormSelectorKey>('dorm4');
  const [sigDraft, setSigDraft] = useState<CommanderSignature>(signature);
  const [sigSaved, setSigSaved] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const series = useMemo(
    () => buildMonthlyChartSeries(logs, selectedMonth, selectedDorm),
    [logs, selectedMonth, selectedDorm]
  );

  // Y-axis range: 26°C to 38°C
  const MIN_TEMP = 26;
  const MAX_TEMP = 38;
  const CHART_WIDTH = Math.max(880, series.length * 88 + 90);
  const CHART_HEIGHT = 340;
  const PAD_LEFT = 54;
  const PAD_RIGHT = 58;
  const PAD_TOP = 24;
  const PAD_BOTTOM = 16;
  const PLOT_W = CHART_WIDTH - PAD_LEFT - PAD_RIGHT;
  const PLOT_H = CHART_HEIGHT - PAD_TOP - PAD_BOTTOM;

  const yForTemp = (temp: number) => {
    const clamped = Math.max(MIN_TEMP, Math.min(MAX_TEMP, temp));
    const ratio = (clamped - MIN_TEMP) / (MAX_TEMP - MIN_TEMP);
    return PAD_TOP + PLOT_H - ratio * PLOT_H;
  };

  const xForIndex = (idx: number) => {
    if (series.length <= 1) return PAD_LEFT + PLOT_W / 2;
    return PAD_LEFT + (idx / (series.length - 1)) * PLOT_W;
  };

  const buildPolylinePoints = (key: 'temp1900' | 'temp2100' | 'temp2200') => {
    const pts: string[] = [];
    series.forEach((pt, idx) => {
      const v = pt[key];
      if (v !== null) {
        pts.push(`${xForIndex(idx).toFixed(1)},${yForTemp(v).toFixed(1)}`);
      }
    });
    return pts.join(' ');
  };

  const handleSaveSig = async () => {
    await onSaveSignature(sigDraft);
    setSigSaved(true);
    setTimeout(() => setSigSaved(false), 2500);
  };

  const selectedDormLabel =
    DORM_OPTIONS.find((d) => d.value === selectedDorm)?.label ?? 'โรงนอน';

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
        <div>
          <h1 className="text-base font-bold text-slate-900">
            ส่วนที่ 4 · รายงานกราฟเส้นดัชนีความร้อนโรงนอนรายเดือน
          </h1>
          <p className="text-xs text-slate-500">
            สีน้ำเงิน = 19:00 น. · สีแดง = 21:00 น. · สีดำ = 22:00 น. พร้อมแท่นระดับอุณหภูมิและชื่อผู้บันทึกประจำวัน
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <label htmlFor="graph-month" className="text-xs font-semibold text-slate-700">
              เดือน:
            </label>
            <select
              id="graph-month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900"
            >
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {formatThaiMonthYear(m)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <label htmlFor="graph-dorm" className="text-xs font-semibold text-slate-700">
              โรงนอน:
            </label>
            <select
              id="graph-dorm"
              value={selectedDorm}
              onChange={(e) => setSelectedDorm(e.target.value as DormSelectorKey)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900"
            >
              {DORM_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() =>
              captureRef.current &&
              exportElementToPng(
                captureRef.current,
                `monthly-heat-graph-${selectedMonth}-${selectedDorm}.png`
              )
            }
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <Camera className="h-3.5 w-3.5" />
            บันทึกภาพ PNG
          </button>

          <button
            type="button"
            onClick={() =>
              captureRef.current &&
              exportElementToPdf(
                captureRef.current,
                `monthly-heat-graph-${selectedMonth}-${selectedDorm}.pdf`,
                'landscape'
              )
            }
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            ส่งออก PDF
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap shrink-0"
          >
            <Printer className="h-3.5 w-3.5" />
            พิมพ์รายงาน
          </button>
        </div>
      </div>

      {/* Printable Graph Surface */}
      <div
        ref={captureRef}
        data-testid="monthly-graph-canvas"
        className={`print-surface overflow-hidden rounded-2xl border bg-white shadow-sm ${activeTheme.panelBorder}`}
      >
        <div
          className={`flex flex-wrap items-center justify-between gap-4 px-6 py-4 ${activeTheme.bannerBg} ${activeTheme.bannerBorder}`}
        >
          <div>
            <h2 className={`text-xl font-bold ${activeTheme.bannerTitleText}`}>
              รายงานกราฟเส้นดัชนีความร้อนโรงนอนประจำเดือน {formatThaiMonthYear(selectedMonth)}
            </h2>
            <p className={`text-sm font-medium ${activeTheme.bannerSubText}`}>
              หน่วยฝึกทหารใหม่ ร.8 พัน.3 · ขอบเขตการแสดงผล: {selectedDormLabel}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4 rounded-xl border border-white/20 bg-white/95 px-4 py-2 text-sm font-bold">
            <span className="inline-flex items-center gap-1.5 text-blue-700">
              <span className="h-3 w-6 rounded-sm bg-blue-600" />
              19:00 น. (สีน้ำเงิน)
            </span>
            <span className="inline-flex items-center gap-1.5 text-red-700">
              <span className="h-3 w-6 rounded-sm bg-red-600" />
              21:00 น. (สีแดง)
            </span>
            <span className="inline-flex items-center gap-1.5 text-slate-900">
              <span className="h-3 w-6 rounded-sm bg-slate-900" />
              22:00 น. (สีดำ)
            </span>
          </div>
        </div>

        <div className="p-6">

        {series.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-500">
            ยังไม่มีข้อมูลบันทึกอุณหภูมิในเดือน {formatThaiMonthYear(selectedMonth)}
          </div>
        ) : (
          <div className="mt-5 flex items-stretch gap-3 overflow-x-auto pb-2">
            {/* Left Thermal Hot/Cool Scale Pillar */}
            <div className="flex w-24 shrink-0 flex-col items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-center">
              <div className="text-xs font-bold text-red-700">ร้อนมาก</div>
              <div className="text-xs font-bold font-mono-num text-red-600">38°C</div>
              <div
                aria-label="แท่นระดับความร้อนและเย็น"
                className="relative my-1.5 w-5 flex-1 rounded-full border border-slate-300"
                style={{
                  minHeight: '220px',
                  background:
                    'linear-gradient(to bottom, #dc2626 0%, #ef4444 35%, #f59e0b 48%, #22c55e 72%, #2563eb 100%)',
                }}
              >
                {/* 33°C marker */}
                <div
                  className="absolute -left-2 -right-2 border-t-2 border-red-800"
                  style={{ top: `${((MAX_TEMP - HEAT_THRESHOLD_C) / (MAX_TEMP - MIN_TEMP)) * 100}%` }}
                />
              </div>
              <div className="text-xs font-bold font-mono-num text-blue-700">26°C</div>
              <div className="text-xs font-bold text-blue-700">เย็น/ปกติ</div>
            </div>

            {/* SVG Graph + Date/Month + Recorder Name Matrix */}
            <div className="min-w-[880px] flex-1">
              <svg
                viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
                className="w-full h-[340px] select-none overflow-visible"
                role="img"
                aria-label="กราฟเส้นอุณหภูมิโรงนอนรายเดือน"
              >
                {/* Red zone highlight >= 33°C */}
                <rect
                  x={PAD_LEFT}
                  y={PAD_TOP}
                  width={PLOT_W}
                  height={yForTemp(HEAT_THRESHOLD_C) - PAD_TOP}
                  fill="#fef2f2"
                  opacity={0.65}
                />

                {/* Horizontal Gridlines (even ticks so labels never collide) */}
                {[26, 28, 30, 32, 34, 36, 38].map((tick) => {
                  const y = yForTemp(tick);
                  return (
                    <g key={tick}>
                      <line
                        x1={PAD_LEFT}
                        x2={CHART_WIDTH - PAD_RIGHT}
                        y1={y}
                        y2={y}
                        stroke="#e2e8f0"
                        strokeWidth={1}
                      />
                      <text
                        x={PAD_LEFT - 8}
                        y={y + 4}
                        textAnchor="end"
                        className="font-mono-num"
                        fontSize={12}
                        fontWeight={600}
                        fill="#334155"
                      >
                        {tick}°C
                      </text>
                    </g>
                  );
                })}

                {/* 33°C Critical Threshold Dashed Line & Non-overlapping Callout */}
                <line
                  x1={PAD_LEFT}
                  x2={CHART_WIDTH - PAD_RIGHT}
                  y1={yForTemp(HEAT_THRESHOLD_C)}
                  y2={yForTemp(HEAT_THRESHOLD_C)}
                  stroke="#dc2626"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                />
                <text
                  x={CHART_WIDTH - PAD_RIGHT}
                  y={PAD_TOP + 12}
                  textAnchor="end"
                  fontSize={12}
                  fontWeight={700}
                  fill="#b91c1c"
                >
                  เส้นประแดง: เกณฑ์อันตราย 33.0°C (สูงกว่านี้ร้อนมาก)
                </text>

                {/* Vertical Day Guides */}
                {series.map((pt, idx) => {
                  const x = xForIndex(idx);
                  return (
                    <line
                      key={pt.id}
                      x1={x}
                      x2={x}
                      y1={PAD_TOP}
                      y2={PAD_TOP + PLOT_H}
                      stroke={hoveredIdx === idx ? '#94a3b8' : '#f1f5f9'}
                      strokeWidth={hoveredIdx === idx ? 1.5 : 1}
                    />
                  );
                })}

                {/* Polylines: Blue 19:00, Red 21:00, Black 22:00 */}
                <polyline
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth={2.5}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  points={buildPolylinePoints('temp1900')}
                />
                <polyline
                  fill="none"
                  stroke="#dc2626"
                  strokeWidth={2.5}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  points={buildPolylinePoints('temp2100')}
                />
                <polyline
                  fill="none"
                  stroke="#0f172a"
                  strokeWidth={2.5}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  points={buildPolylinePoints('temp2200')}
                />

                {/* Data Points */}
                {series.map((pt, idx) => {
                  const x = xForIndex(idx);
                  return (
                    <g
                      key={pt.id}
                      onMouseEnter={() => setHoveredIdx(idx)}
                      onMouseLeave={() => setHoveredIdx(null)}
                    >
                      {pt.temp1900 !== null && (
                        <g>
                          <circle
                            cx={x}
                            cy={yForTemp(pt.temp1900)}
                            r={4.5}
                            fill="#2563eb"
                            stroke="#ffffff"
                            strokeWidth={1.5}
                          />
                          <text
                            x={x}
                            y={yForTemp(pt.temp1900) - 9}
                            textAnchor="middle"
                            fontSize={11.5}
                            fontWeight={700}
                            className="font-mono-num"
                            fill="#1d4ed8"
                          >
                            {pt.temp1900.toFixed(1)}
                          </text>
                        </g>
                      )}
                      {pt.temp2100 !== null && (
                        <g>
                          <circle
                            cx={x}
                            cy={yForTemp(pt.temp2100)}
                            r={4.5}
                            fill="#dc2626"
                            stroke="#ffffff"
                            strokeWidth={1.5}
                          />
                          <text
                            x={x + 11}
                            y={yForTemp(pt.temp2100) + 3}
                            textAnchor="start"
                            fontSize={11.5}
                            fontWeight={700}
                            className="font-mono-num"
                            fill="#b91c1c"
                          >
                            {pt.temp2100.toFixed(1)}
                          </text>
                        </g>
                      )}
                      {pt.temp2200 !== null && (
                        <g>
                          <circle
                            cx={x}
                            cy={yForTemp(pt.temp2200)}
                            r={4.5}
                            fill="#0f172a"
                            stroke="#ffffff"
                            strokeWidth={1.5}
                          />
                          <text
                            x={x}
                            y={yForTemp(pt.temp2200) + 16}
                            textAnchor="middle"
                            fontSize={11.5}
                            fontWeight={700}
                            className="font-mono-num"
                            fill="#0f172a"
                          >
                            {pt.temp2200.toFixed(1)}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}
              </svg>

              {/* Aligned Bottom Table: Date/Month + Recorder Name */}
              <div className="mt-2 overflow-hidden rounded-lg border border-slate-300">
                <table className="w-full table-fixed border-collapse text-center text-sm">
                  <thead>
                    <tr className="border-b border-slate-300 bg-slate-100">
                      <th className="w-36 border-r border-slate-300 px-3 py-2.5 text-left text-xs font-bold text-slate-800">
                        วันที่ / เดือน
                      </th>
                      {series.map((pt) => (
                        <th
                          key={pt.id}
                          className="border-r border-slate-200 px-1 py-2.5 text-xs font-bold font-mono-num text-slate-900 last:border-r-0"
                        >
                          {pt.shortDateLabel}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-200 bg-white">
                      <td className="border-r border-slate-300 px-3 py-2.5 text-left text-xs font-bold text-slate-700">
                        ชื่อ-สกุลผู้บันทึก
                      </td>
                      {series.map((pt) => (
                        <td
                          key={pt.id}
                          className="border-r border-slate-200 px-1 py-2.5 text-xs font-medium leading-snug text-slate-800 last:border-r-0"
                        >
                          {pt.recorderName}
                        </td>
                      ))}
                    </tr>
                    <tr className="bg-slate-50/80 text-xs font-mono-num">
                      <td className="border-r border-slate-300 px-3 py-2 text-left font-bold text-slate-700 whitespace-nowrap">
                        19 / 21 / 22 น.
                      </td>
                      {series.map((pt) => (
                        <td
                          key={pt.id}
                          className="border-r border-slate-200 px-1 py-2 leading-snug last:border-r-0"
                        >
                          <div className="text-blue-700 font-bold">
                            {pt.temp1900 !== null ? pt.temp1900.toFixed(1) : '-'}
                          </div>
                          <div className="text-red-700 font-bold">
                            {pt.temp2100 !== null ? pt.temp2100.toFixed(1) : '-'}
                          </div>
                          <div className="text-slate-900 font-bold">
                            {pt.temp2200 !== null ? pt.temp2200.toFixed(1) : '-'}
                          </div>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Reserved Bottom Area for Commander Signature */}
        <div
          data-testid="commander-signature-zone"
          className="mt-8 rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-6"
        >
          <div className="grid grid-cols-1 gap-6 md:grid-cols-12 items-end">
            <div className="md:col-span-6 space-y-2">
              <div className="text-sm font-bold text-slate-800">
                พื้นที่หมายเหตุ / ข้อสั่งการเพิ่มเติม
              </div>
              <textarea
                aria-label="หมายเหตุหรือข้อสั่งการผู้บังคับบัญชา"
                rows={3}
                value={sigDraft.note}
                onChange={(e) => setSigDraft({ ...sigDraft, note: e.target.value })}
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-700 focus:outline-none"
              />
            </div>

            <div className="md:col-span-6 text-center space-y-2">
              <div className="text-sm font-medium text-slate-600">ลงนามผู้บังคับบัญชา / ผู้ตรวจสอบ</div>
              <div className="mx-auto h-10 w-72 border-b border-slate-400" />
              <div className="flex flex-col items-center gap-1.5">
                <input
                  type="text"
                  aria-label="ยศ ชื่อ-สกุล ผู้บังคับบัญชา"
                  value={sigDraft.commanderRankName}
                  onChange={(e) =>
                    setSigDraft({ ...sigDraft, commanderRankName: e.target.value })
                  }
                  className="w-80 rounded border border-slate-200 bg-white px-3 py-1.5 text-center text-sm font-bold text-slate-900 focus:border-emerald-700 focus:outline-none"
                />
                <input
                  type="text"
                  aria-label="ตำแหน่งผู้บังคับบัญชา"
                  value={sigDraft.commanderPosition}
                  onChange={(e) =>
                    setSigDraft({ ...sigDraft, commanderPosition: e.target.value })
                  }
                  className="w-80 rounded border border-slate-200 bg-white px-3 py-1.5 text-center text-sm text-slate-700 focus:border-emerald-700 focus:outline-none"
                />
              </div>
              <div className="no-print pt-1">
                <button
                  type="button"
                  onClick={handleSaveSig}
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                  {sigSaved ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-700" />
                      บันทึกข้อมูลลงนามแล้ว
                    </>
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5" />
                      บันทึกแม่แบบลงนาม
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};
