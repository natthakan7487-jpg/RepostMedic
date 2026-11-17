import React, { useRef, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  Camera,
  Check,
  CheckCircle2,
  Crop,
  Lock,
  Printer,
  Save,
  Share2,
} from 'lucide-react';
import type { DailyTemperatureLog, DormTemps } from '../types/report';
import type { AppColorTheme } from '../utils/themes';
import { getThemeById } from '../utils/themes';
import {
  formatThaiShortDate,
  getHeatStatusLabel,
  isHeatCritical,
  validateTemperatureLog,
} from '../utils/calculations';
import {
  captureElementDataUrl,
  exportElementToPdf,
  exportElementToPng,
} from '../utils/exportUtils';
import { CropExportModal } from './CropExportModal';

interface Part3DailyTempLogProps {
  log: DailyTemperatureLog;
  allLogs: DailyTemperatureLog[];
  theme?: AppColorTheme;
  readOnly?: boolean;
  onSelectDateLog: (isoDate: string) => void;
  onChange?: (next: DailyTemperatureLog) => void;
  onSave?: (log: DailyTemperatureLog) => Promise<DailyTemperatureLog | void>;
}

const TIME_SLOTS: Array<{
  key: 'time1900' | 'time2100' | 'time2200';
  label: string;
  colorClass: string;
}> = [
  { key: 'time1900', label: 'เวลา 19:00 น.', colorClass: 'text-blue-700' },
  { key: 'time2100', label: 'เวลา 21:00 น.', colorClass: 'text-red-700' },
  { key: 'time2200', label: 'เวลา 22:00 น.', colorClass: 'text-slate-900' },
];

const DORMS: Array<{ key: keyof DormTemps; label: string }> = [
  { key: 'dorm1', label: 'โรงนอนที่ 1' },
  { key: 'dorm2', label: 'โรงนอนที่ 2' },
  { key: 'dorm3', label: 'โรงนอนที่ 3' },
  { key: 'dorm4', label: 'โรงนอนที่ 4' },
];

export const Part3DailyTempLog: React.FC<Part3DailyTempLogProps> = ({
  log,
  allLogs,
  theme,
  readOnly = false,
  onSelectDateLog,
  onChange,
  onSave,
}) => {
  const activeTheme = theme ?? getThemeById(log.colorTheme);
  const captureRef = useRef<HTMLDivElement | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [savedOk, setSavedOk] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [cropImageUrl, setCropImageUrl] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const shareUrl = `${window.location.origin}${window.location.pathname}?share=temp&token=${encodeURIComponent(
    log.shareToken || log.id
  )}`;

  const handleTempInput = (
    slotKey: 'time1900' | 'time2100' | 'time2200',
    dormKey: keyof DormTemps,
    raw: string
  ) => {
    if (readOnly || !onChange) return;
    const val = raw.trim() === '' ? null : Number(raw);
    onChange({
      ...log,
      [slotKey]: {
        ...log[slotKey],
        [dormKey]: val !== null && Number.isNaN(val) ? null : val,
      },
    });
  };

  const handleSave = async () => {
    if (readOnly || !onSave) return;
    const errs = validateTemperatureLog(log);
    setErrors(errs);
    if (errs.length > 0) return;

    setIsBusy(true);
    try {
      await onSave({ ...log, isFinalized: true });
      setSavedOk(true);
      setTimeout(() => setSavedOk(false), 3000);
    } finally {
      setIsBusy(false);
    }
  };

  const handleCopyShareLink = async () => {
    const errs = validateTemperatureLog(log);
    setErrors(errs);
    if (errs.length > 0) return;

    if (onSave && !readOnly) {
      await onSave({ ...log, isFinalized: true });
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      // Fallback
    }
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const handleOpenCrop = async () => {
    if (!captureRef.current) return;
    setIsBusy(true);
    try {
      const url = await captureElementDataUrl(captureRef.current);
      setCropImageUrl(url);
    } finally {
      setIsBusy(false);
    }
  };

  const handlePng = async () => {
    if (!captureRef.current) return;
    setIsBusy(true);
    try {
      await exportElementToPng(captureRef.current, `temp-log-${log.isoDate}.png`);
    } finally {
      setIsBusy(false);
    }
  };

  const handlePdf = async () => {
    if (!captureRef.current) return;
    setIsBusy(true);
    try {
      await exportElementToPdf(captureRef.current, `temp-log-${log.isoDate}.pdf`, 'landscape');
    } finally {
      setIsBusy(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          {readOnly ? (
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-800">
              <Lock className="h-4 w-4" />
              โหมดนำเสนอผ่านลิ้งค์ (อ่านอย่างเดียว · ไม่สามารถแก้ไขได้)
            </span>
          ) : (
            <div>
              <h1 className="text-base font-bold text-slate-900">
                ส่วนที่ 3 · การบันทึกอุณหภูมิโรงนอนประจำวัน (รองรับลงข้อมูลย้อนหลังและล่วงหน้า)
              </h1>
              <p className="text-xs text-slate-500">
                ค่าปกติต่ำกว่า 33.0°C · หากสูงกว่า 33.0°C ระบบแสดงกรอบสีแดงและตัวอักษรแดงอัตโนมัติ
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!readOnly && (
            <button
              type="button"
              disabled={isBusy}
              onClick={handleSave}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold disabled:opacity-50 whitespace-nowrap shrink-0 ${activeTheme.primaryButton}`}
            >
              <Save className="h-3.5 w-3.5" />
              {savedOk ? 'บันทึกแล้ว' : 'บันทึกเมื่อเสร็จสิ้น'}
            </button>
          )}
          {!readOnly && (
            <button
              type="button"
              onClick={handleCopyShareLink}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              {copiedLink ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-700" />
                  คัดลอกลิ้งค์แล้ว
                </>
              ) : (
                <>
                  <Share2 className="h-3.5 w-3.5" />
                  สร้างลิ้งค์นำเสนอ (ห้ามแก้ไข)
                </>
              )}
            </button>
          )}
          <button
            type="button"
            disabled={isBusy}
            onClick={handleOpenCrop}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <Crop className="h-3.5 w-3.5" />
            ครอปภาพหน้าจอ
          </button>
          <button
            type="button"
            disabled={isBusy}
            onClick={handlePng}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <Camera className="h-3.5 w-3.5" />
            บันทึก PNG
          </button>
          <button
            type="button"
            disabled={isBusy}
            onClick={handlePdf}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            บันทึก PDF
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap shrink-0"
          >
            <Printer className="h-3.5 w-3.5" />
            สั่งปริ้นเอกสาร
          </button>
        </div>
      </div>

      {/* Date Picker Bar (allows past/future date entry) */}
      {!readOnly && (
        <div className="no-print flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <label
              htmlFor="temp-log-date"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700"
            >
              <Calendar className="h-4 w-4 text-emerald-800" />
              เลือกวันที่บันทึก (ก่อนหน้า/วันนี้/ล่วงหน้า):
            </label>
            <input
              id="temp-log-date"
              type="date"
              value={log.isoDate}
              onChange={(e) => onSelectDateLog(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-mono-num text-slate-900 focus:border-emerald-700 focus:outline-none"
            />
            <span className="text-xs font-semibold text-emerald-900">
              แสดงผล: {formatThaiShortDate(log.isoDate)}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span>วันที่บันทึกไว้ล่าสุด:</span>
            <select
              aria-label="เลือกวันที่จากรายการที่เคยบันทึก"
              value={log.isoDate}
              onChange={(e) => onSelectDateLog(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono-num text-slate-900"
            >
              {!allLogs.some((item) => item.isoDate === log.isoDate) && (
                <option value={log.isoDate}>{log.displayDate} (รายการใหม่)</option>
              )}
              {[...allLogs]
                .sort((a, b) => b.isoDate.localeCompare(a.isoDate))
                .map((item) => (
                  <option key={item.id} value={item.isoDate}>
                    {item.displayDate} · {item.recorderName}
                  </option>
                ))}
            </select>
          </div>
        </div>
      )}

      {errors.length > 0 && (
        <div
          role="alert"
          className="no-print rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-900"
        >
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4 text-red-700" />
            ไม่สามารถบันทึกได้
          </div>
          <ul className="mt-1 list-disc pl-5 text-xs">
            {errors.map((err) => (
              <li key={err}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {savedOk && (
        <div
          role="status"
          className="no-print flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-900"
        >
          <CheckCircle2 className="h-4 w-4 text-emerald-700" />
          บันทึกข้อมูลอุณหภูมิโรงนอนวันที่ {log.displayDate} ลงฐานข้อมูลเรียบร้อยแล้ว (ข้อมูลจะเชื่อมเข้ากราฟรายเดือนส่วนที่ 4 ทันที)
        </div>
      )}

      {copiedLink && !readOnly && (
        <div className="no-print flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs text-emerald-900">
          <span>ลิ้งค์นำเสนอ (อ่านอย่างเดียว แก้ไขไม่ได้):</span>
          <a
            href={shareUrl}
            target="_blank"
            rel="noreferrer"
            className="font-mono-num underline break-all"
          >
            {shareUrl}
          </a>
        </div>
      )}

      {/* Printable / Capturable Daily Report Card */}
      <div
        ref={captureRef}
        data-testid="daily-temp-canvas"
        className={`print-surface overflow-hidden rounded-2xl border bg-white shadow-sm ${activeTheme.panelBorder}`}
      >
        <div
          className={`flex flex-wrap items-center justify-between gap-4 px-6 py-4 ${activeTheme.bannerBg} ${activeTheme.bannerBorder}`}
        >
          <div>
            <h2 className={`text-2xl font-bold ${activeTheme.bannerTitleText}`}>
              หน่วยฝึกทหารใหม่ ร.8 พัน.3 · บันทึกดัชนีความร้อนโรงนอนประจำวัน
            </h2>
            <p className={`mt-0.5 text-sm ${activeTheme.bannerSubText}`}>
              การตรวจวัดอุณหภูมิโรงนอนที่ 1–4 ช่วงเวลา 19:00 น., 21:00 น. และ 22:00 น. (เกณฑ์ปกติต่ำกว่า 33.0°C)
            </p>
          </div>
          <div className="rounded-xl border border-white/20 bg-black/20 px-4 py-2 text-right">
            <div className="text-xs font-medium text-white/80">วันที่บันทึกข้อมูล</div>
            <div className="text-xl font-bold font-mono-num text-white">
              วันที่ {log.displayDate}
            </div>
          </div>
        </div>

        <div className="p-6">

        <div className="space-y-5">
          {TIME_SLOTS.map((slot) => (
            <section
              key={slot.key}
              className="rounded-xl border border-slate-200 bg-slate-50/80 p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className={`text-lg font-bold ${slot.colorClass}`}>
                  🌡️ ดัชนีความร้อนโรงนอน · {slot.label}
                </h3>
                <span className="text-xs font-medium text-slate-600">
                  ปกติ &lt; 33°C · ร้อนมาก &gt; 33°C (กรอบแดง/ตัวอักษรแดง)
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
                {DORMS.map((dorm) => {
                  const val = log[slot.key][dorm.key];
                  const critical = isHeatCritical(val);
                  return (
                    <div
                      key={dorm.key}
                      className={`rounded-lg border-2 p-4 transition-colors ${
                        critical
                          ? 'border-red-600 bg-red-50 text-red-700'
                          : 'border-slate-200 bg-white text-slate-900'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <label
                          htmlFor={`${slot.key}-${dorm.key}`}
                          className={`text-sm font-bold ${
                            critical ? 'text-red-800' : 'text-slate-800'
                          }`}
                        >
                          {dorm.label}
                        </label>
                        <span
                          className={`text-xs font-semibold ${
                            critical ? 'text-red-700' : 'text-emerald-700'
                          }`}
                        >
                          {getHeatStatusLabel(val)}
                        </span>
                      </div>

                      {readOnly ? (
                        <div
                          className={`mt-2 text-3xl font-bold font-mono-num ${
                            critical ? 'text-red-700' : 'text-slate-900'
                          }`}
                        >
                          {val !== null ? `${val.toFixed(1)} °C` : '-'}
                        </div>
                      ) : (
                        <div className="mt-2 flex items-center gap-2">
                          <input
                            id={`${slot.key}-${dorm.key}`}
                            type="number"
                            step="0.1"
                            value={val ?? ''}
                            onChange={(e) => handleTempInput(slot.key, dorm.key, e.target.value)}
                            placeholder="0.0"
                            className={`w-full rounded-md border bg-white px-3 py-2 text-xl font-bold font-mono-num focus:outline-none ${
                              critical
                                ? 'border-red-500 text-red-700 focus:border-red-600'
                                : 'border-slate-300 text-slate-900 focus:border-emerald-700'
                            }`}
                          />
                          <span
                            className={`text-base font-bold font-mono-num ${
                              critical ? 'text-red-700' : 'text-slate-700'
                            }`}
                          >
                            °C
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        {/* Recorder Name Footer */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-5 py-4">
          <div className="flex-1 min-w-[260px]">
            <label
              htmlFor="recorder-name-input"
              className="block text-sm font-bold text-slate-800"
            >
              ชื่อ-สกุล ผู้บันทึก
            </label>
            {readOnly ? (
              <div className="mt-1 text-lg font-bold text-slate-900">{log.recorderName}</div>
            ) : (
              <input
                id="recorder-name-input"
                type="text"
                value={log.recorderName}
                onChange={(e) => onChange && onChange({ ...log, recorderName: e.target.value })}
                placeholder="เช่น ส.อ.สมชาย ใจดี"
                className="mt-1.5 w-full max-w-md rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-base font-semibold text-slate-900 focus:border-emerald-700 focus:outline-none"
              />
            )}
          </div>
          <div className="text-right text-sm text-slate-600">
            <div>สถานะการตรวจสอบ</div>
            <div className="mt-0.5 font-bold text-slate-900">
              {log.isFinalized ? 'บันทึกข้อมูลเรียบร้อย' : 'ฉบับร่างรอการบันทึก'}
            </div>
          </div>
        </div>
        </div>
      </div>

      <CropExportModal
        isOpen={cropImageUrl !== null}
        imageDataUrl={cropImageUrl}
        defaultFilename={`crop-temp-log-${log.isoDate}.png`}
        title={`ครอปภาพหน้าจอ · อุณหภูมิโรงนอนวันที่ ${log.displayDate}`}
        onClose={() => setCropImageUrl(null)}
      />
    </div>
  );
};
