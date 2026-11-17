import React, { useRef, useState } from 'react';
import {
  AlertTriangle,
  Camera,
  Check,
  Crop,
  ImagePlus,
  Lock,
  Maximize2,
  Minimize2,
  Printer,
  Save,
  Share2,
  Trash2,
  Upload,
} from 'lucide-react';
import type { ScreeningReport } from '../types/report';
import type { AppColorTheme } from '../utils/themes';
import { getThemeById } from '../utils/themes';
import {
  calculateRemainingRecruits,
  getHeatStatusLabel,
  isHeatCritical,
  sumQuarantineTotal,
  sumRedHeatRisk,
  sumYellowHeatRisk,
} from '../utils/calculations';
import {
  captureElementDataUrl,
  convertEmblemFileToDataUrl,
  convertImageFileToLandscapeDataUrl,
  exportElementToPdf,
  exportElementToPng,
} from '../utils/exportUtils';
import { CropExportModal } from './CropExportModal';

interface Part2InfographicProps {
  report: ScreeningReport;
  theme?: AppColorTheme;
  readOnly?: boolean;
  onChange?: (next: ScreeningReport) => void;
  onSave?: (report: ScreeningReport) => Promise<ScreeningReport | void>;
}

const URINE_LEVELS = [
  {
    key: 'level0' as const,
    label: 'ระดับ 0',
    desc: 'น้ำใสปกติ',
    bg: '#FEFCE8',
    border: '#FDE047',
    text: '#713F12',
  },
  {
    key: 'level1' as const,
    label: 'ระดับ 1',
    desc: 'เหลืองอ่อน',
    bg: '#FEF08A',
    border: '#EAB308',
    text: '#713F12',
  },
  {
    key: 'level2' as const,
    label: 'ระดับ 2',
    desc: 'เหลืองเข้ม (ดื่มน้ำเพิ่ม)',
    bg: '#FACC15',
    border: '#CA8A04',
    text: '#422006',
  },
  {
    key: 'level3' as const,
    label: 'ระดับ 3',
    desc: 'ส้ม (เสี่ยงขาดน้ำ)',
    bg: '#F97316',
    border: '#C2410C',
    text: '#FFFFFF',
  },
  {
    key: 'level4' as const,
    label: 'ระดับ 4',
    desc: 'น้ำตาลเข้ม (อันตราย)',
    bg: '#9A3412',
    border: '#7C2D12',
    text: '#FFFFFF',
  },
];

export const Part2Infographic: React.FC<Part2InfographicProps> = ({
  report,
  theme,
  readOnly = false,
  onChange,
  onSave,
}) => {
  const activeTheme = theme ?? getThemeById(report.colorTheme);
  const captureRef = useRef<HTMLDivElement | null>(null);
  const [isPresenting, setIsPresenting] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [cropImageUrl, setCropImageUrl] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const remainingCount = calculateRemainingRecruits(
    report.totalRecruits,
    report.hospitalCount,
    report.referredCount
  );
  const yellowTotal = sumYellowHeatRisk(report);
  const redTotal = sumRedHeatRisk(report);
  const quarantineTotal = sumQuarantineTotal(report);
  const urineTotal =
    report.urineColor.level0 +
    report.urineColor.level1 +
    report.urineColor.level2 +
    report.urineColor.level3 +
    report.urineColor.level4;

  const shareUrl = `${window.location.origin}${window.location.pathname}?share=infographic&token=${encodeURIComponent(
    report.shareToken || report.id
  )}`;

  const handleFinalizeAndSave = async () => {
    if (!onSave || readOnly) return;
    setIsBusy(true);
    try {
      const finalized: ScreeningReport = { ...report, isFinalized: true };
      await onSave(finalized);
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 3000);
    } finally {
      setIsBusy(false);
    }
  };

  const handleCopyShareLink = async () => {
    if (onSave && !readOnly) {
      await onSave({ ...report, isFinalized: true });
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    } catch {
      // Clipboard fallback in non-HTTPS contexts
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    }
  };

  const handleOpenCrop = async () => {
    if (!captureRef.current) return;
    setIsBusy(true);
    try {
      const dataUrl = await captureElementDataUrl(captureRef.current);
      setCropImageUrl(dataUrl);
    } finally {
      setIsBusy(false);
    }
  };

  const handleDirectPng = async () => {
    if (!captureRef.current) return;
    setIsBusy(true);
    try {
      await exportElementToPng(
        captureRef.current,
        `infographic-ร8พัน3-${report.isoDate}.png`
      );
    } finally {
      setIsBusy(false);
    }
  };

  const handleExportPdf = async () => {
    if (!captureRef.current) return;
    setIsBusy(true);
    try {
      await exportElementToPdf(
        captureRef.current,
        `infographic-ร8พัน3-${report.isoDate}.pdf`,
        'landscape'
      );
    } finally {
      setIsBusy(false);
    }
  };

  const handleEmblemChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (readOnly || !onChange) return;
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await convertEmblemFileToDataUrl(file);
    onChange({ ...report, unitLogoUrl: url });
  };

  const handlePhotoUploadSlot = async (
    idx: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (readOnly || !onChange) return;
    const file = e.target.files?.[0];
    if (!file) return;
    const landscapeUrl = await convertImageFileToLandscapeDataUrl(file);
    const nextPhotos = [...report.photos];
    nextPhotos[idx] = landscapeUrl;
    onChange({ ...report, photos: nextPhotos });
    e.target.value = '';
  };

  const handleClearPhotoSlot = (idx: number) => {
    if (readOnly || !onChange) return;
    const nextPhotos = [...report.photos];
    nextPhotos[idx] = null;
    onChange({ ...report, photos: nextPhotos });
  };

  const handleBatchUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (readOnly || !onChange) return;
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    const nextPhotos = [...report.photos];
    let slot = nextPhotos.findIndex((p) => p === null);
    if (slot === -1) slot = 0;
    for (const file of files) {
      if (slot >= 12) break;
      nextPhotos[slot] = await convertImageFileToLandscapeDataUrl(file);
      slot += 1;
    }
    onChange({ ...report, photos: nextPhotos });
    e.target.value = '';
  };

  return (
    <div
      className={
        isPresenting
          ? 'fixed inset-0 z-40 overflow-auto bg-slate-900 p-4 md:p-6'
          : 'space-y-4'
      }
    >
      {/* Toolbar */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center gap-2.5 text-sm">
          {readOnly ? (
            <span className="inline-flex items-center gap-1.5 font-semibold text-amber-800">
              <Lock className="h-4 w-4" />
              โหมดนำเสนอผ่านลิ้งค์ (อ่านอย่างเดียว · ไม่สามารถแก้ไขได้)
            </span>
          ) : (
            <span className="font-semibold text-slate-900">
              ส่วนที่ 2 · หน้าการรายงานแนวนอน Infographic
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!readOnly && (
            <button
              type="button"
              disabled={isBusy}
              onClick={handleFinalizeAndSave}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold disabled:opacity-50 whitespace-nowrap shrink-0 ${activeTheme.primaryButton}`}
            >
              <Save className="h-3.5 w-3.5" />
              {savedNotice ? 'บันทึกสำเร็จแล้ว' : 'บันทึกเมื่อเสร็จสิ้น'}
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
                  คัดลอกลิ้งค์นำเสนอแล้ว
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
            onClick={handleDirectPng}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <Camera className="h-3.5 w-3.5" />
            บันทึกภาพ PNG
          </button>
          <button
            type="button"
            disabled={isBusy}
            onClick={handleExportPdf}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <Printer className="h-3.5 w-3.5" />
            ส่งออก PDF
          </button>
          <button
            type="button"
            onClick={() => setIsPresenting((p) => !p)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap shrink-0"
          >
            {isPresenting ? (
              <>
                <Minimize2 className="h-3.5 w-3.5" />
                ออกจากเต็มจอ
              </>
            ) : (
              <>
                <Maximize2 className="h-3.5 w-3.5" />
                นำเสนอเต็มจอ
              </>
            )}
          </button>
        </div>
      </div>

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

      {/* Landscape Infographic Canvas */}
      <div className="overflow-x-auto pb-2">
        <div
          ref={captureRef}
          data-testid="infographic-canvas"
          className={`print-surface mx-auto min-w-[1140px] max-w-[1360px] overflow-hidden rounded-2xl border bg-white shadow-sm ${activeTheme.panelBorder}`}
        >
          {/* Ceremonial Themed Banner Header */}
          <header
            className={`flex items-center justify-between gap-6 px-6 py-5 ${activeTheme.bannerBg} ${activeTheme.bannerBorder}`}
          >
            <div className="flex items-center gap-4">
              <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-white/30 bg-white p-1 shadow-xs">
                <img
                  src={report.unitLogoUrl}
                  alt="ตราสัญลักษณ์หน่วย"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-contain"
                />
                {!readOnly && (
                  <label
                    title="เปลี่ยนตราสัญลักษณ์หน่วย"
                    className="no-print absolute inset-0 flex cursor-pointer items-center justify-center bg-slate-900/50 text-white opacity-0 transition-opacity hover:opacity-100"
                  >
                    <Upload className="h-4 w-4" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleEmblemChange}
                      className="sr-only"
                    />
                  </label>
                )}
              </div>
              <div>
                <h1 className={`text-3xl font-bold tracking-tight ${activeTheme.bannerTitleText}`}>
                  หน่วยฝึกทหารใหม่ ร.8 พัน.3
                </h1>
                <p className={`mt-1 text-xl font-medium ${activeTheme.bannerSubText}`}>
                  ขออนุญาตรายงานผลการคัดกรอง ดังนี้
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-white/25 bg-black/25 px-5 py-3 text-right">
              <div className="text-sm font-medium text-white/85">วัน/เดือน/ปี และเวลา</div>
              <div className="mt-0.5 text-xl font-bold font-mono-num text-white">
                {report.dateTimeLabel}
              </div>
            </div>
          </header>

          <div className="p-6 space-y-5">

          {/* Row 1: Total Recruits + Quarantine (Combined) & Unit Risk Colors */}
          <div className="grid grid-cols-12 gap-5">
            {/* Combined Manpower + Quarantine */}
            <div className="col-span-8 rounded-xl border border-slate-200 bg-slate-50/80 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                <h2 className="text-base font-bold text-slate-900">
                  ทหารใหม่มียอดทั้งหมด และ แยกตามกลุ่มพื้นที่กักตัว
                </h2>
                <span className="text-sm font-bold font-mono-num text-emerald-900">
                  ยอดทั้งหมด {report.totalRecruits} นาย · คงเหลือ {remainingCount} นาย
                </span>
              </div>

              <div className="mt-4 grid grid-cols-12 gap-4">
                {/* Left: Manpower Breakdown */}
                <div className="col-span-6 space-y-3">
                  <div className="grid grid-cols-5 gap-2 text-center">
                    <div className="rounded-lg border border-slate-200 bg-white px-2 py-2.5">
                      <div className="text-xs font-semibold text-slate-600">ทั้งหมด</div>
                      <div className="mt-0.5 text-2xl font-bold font-mono-num text-slate-900">
                        {report.totalRecruits}
                      </div>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white px-2 py-2.5">
                      <div className="text-xs font-semibold text-slate-600">นอน รพ.</div>
                      <div className="mt-0.5 text-2xl font-bold font-mono-num text-red-700">
                        {report.hospitalCount}
                      </div>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white px-2 py-2.5">
                      <div className="text-xs font-semibold text-slate-600">ส่งต่อ</div>
                      <div className="mt-0.5 text-2xl font-bold font-mono-num text-amber-700">
                        {report.referredCount}
                      </div>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white px-2 py-2.5">
                      <div className="text-xs font-semibold text-slate-600">นอกหน่วย</div>
                      <div className="mt-0.5 text-2xl font-bold font-mono-num text-slate-800">
                        {report.externalMissionCount}
                      </div>
                    </div>
                    <div className="rounded-lg border border-emerald-500 bg-emerald-800 px-2 py-2.5 text-white">
                      <div className="text-xs font-semibold text-emerald-100">คงเหลือ</div>
                      <div className="mt-0.5 text-2xl font-bold font-mono-num">{remainingCount}</div>
                    </div>
                  </div>

                  {/* Personnel brief roster */}
                  <div className="rounded-lg border border-slate-200 bg-white p-3.5 text-sm leading-relaxed text-slate-800">
                    {report.hospitalList.length === 0 &&
                    report.referredList.length === 0 &&
                    report.externalMissionList.length === 0 &&
                    report.remainingList.length === 0 ? (
                      <span className="text-slate-500">ไม่มีรายชื่อผู้ป่วยหรือภารกิจนอกหน่วยเพิ่มเติม</span>
                    ) : (
                      <div className="space-y-1.5">
                        {report.hospitalList.map((p) => (
                          <div key={p.id}>
                            <span className="font-bold text-red-700">นอน รพ.:</span>{' '}
                            {p.fullName} {p.code ? `(${p.code})` : ''} {p.detail}
                          </div>
                        ))}
                        {report.referredList.map((p) => (
                          <div key={p.id}>
                            <span className="font-bold text-amber-700">ส่งต่อ:</span>{' '}
                            {p.fullName} {p.code ? `(${p.code})` : ''} {p.detail}
                          </div>
                        ))}
                        {report.externalMissionList.map((p) => (
                          <div key={p.id}>
                            <span className="font-bold text-slate-900">ภารกิจนอกหน่วย:</span>{' '}
                            {p.fullName} {p.code ? `(${p.code})` : ''} {p.detail}
                          </div>
                        ))}
                        {report.remainingList.map((p) => (
                          <div key={p.id}>
                            <span className="font-bold text-emerald-800">คงเหลือ:</span>{' '}
                            {p.fullName} {p.code ? `(${p.code})` : ''} {p.detail}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Quarantine Breakdown */}
                <div className="col-span-6 rounded-lg border border-slate-200 bg-white p-3.5">
                  <div className="mb-2.5 flex items-center justify-between text-sm font-bold text-slate-900">
                    <span>แยกตามกลุ่มพื้นที่กักตัว</span>
                    <span className="font-mono-num text-slate-700">รวม {quarantineTotal} นาย</span>
                  </div>
                  <div className="grid grid-cols-1 gap-y-2 text-sm sm:grid-cols-2 sm:gap-x-4">
                    {[
                      ['กักตัว UQ.', report.quarantine.uq],
                      ['กักตัว CI. โควิด', report.quarantine.ciCovid],
                      ['กักตัว CI. ไข้หวัดใหญ่', report.quarantine.ciFlu],
                      ['นอนพักดูอาการที่พยาบาล', report.quarantine.infirmaryObservation],
                      ['นอนพักรักษาตัวที่ รพ.', report.quarantine.hospitalAdmit],
                      ['ไปตรวจที่โรงพยาบาล', report.quarantine.hospitalCheckup],
                    ].map(([label, val]) => (
                      <div
                        key={String(label)}
                        className="flex items-center justify-between gap-2 border-b border-slate-100 py-1.5"
                      >
                        <span className="text-sm font-medium text-slate-800">{label}</span>
                        <span className="text-base font-bold font-mono-num text-slate-950 whitespace-nowrap">
                          {val} นาย
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Unit Risk Color Symbols */}
            <div className="col-span-4 rounded-xl border border-slate-200 bg-slate-50/80 p-5">
              <h2 className="border-b border-slate-200 pb-3 text-base font-bold text-slate-900">
                กลุ่มสีสัญลักษณ์ความเสี่ยงภายในหน่วย
              </h2>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {[
                  {
                    label: '⚪️ ปกติ',
                    val: report.riskColors.normalWhite,
                    cls: 'border-slate-300 bg-white text-slate-900',
                  },
                  {
                    label: '🟢 เขียว',
                    val: report.riskColors.green,
                    cls: 'border-emerald-300 bg-emerald-50 text-emerald-950',
                  },
                  {
                    label: '🟡 เหลือง',
                    val: report.riskColors.yellow,
                    cls: 'border-amber-300 bg-amber-50 text-amber-950',
                  },
                  {
                    label: '🔴 แดง',
                    val: report.riskColors.red,
                    cls: 'border-red-300 bg-red-50 text-red-950',
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className={`flex flex-col justify-between rounded-lg border p-3.5 ${item.cls}`}
                  >
                    <span className="text-sm font-bold">{item.label}</span>
                    <div className="mt-1.5 text-3xl font-bold font-mono-num">
                      {item.val} <span className="text-sm font-semibold">นาย</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Row 2 (PROMINENT FOCAL SECTIONS): Heat Illness Risk + Urine Color Spectrum */}
          <div className="grid grid-cols-12 gap-5">
            {/* Prominent Heat Risk */}
            <div className="col-span-7 rounded-xl border-2 border-amber-500 bg-amber-50/40 p-5">
              <div className="flex items-center justify-between gap-2 border-b border-amber-200 pb-2.5">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-700" />
                  <h2 className="text-lg font-bold text-slate-900">
                    ความเสี่ยงการเจ็บป่วยจากความร้อน 🟡 (แยกฝึก) และ 🔴 (งดฝึก)
                  </h2>
                </div>
                <span className="text-sm font-bold font-mono-num text-red-700">
                  รวมเฝ้าระวังสำคัญ {yellowTotal + redTotal} นาย
                </span>
              </div>

              <div className="mt-4 grid grid-cols-12 gap-3.5">
                <div className="col-span-7 rounded-lg border border-amber-300 bg-white p-3.5">
                  <div className="flex items-center justify-between text-sm font-bold text-amber-900">
                    <span>🟡 แยกฝึก</span>
                    <span className="font-mono-num text-base">{yellowTotal} นาย</span>
                  </div>
                  <div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                    {[
                      ['โรคประจำตัว', report.heatRisk.yellowSeparate.chronicDisease],
                      ['BMI >= 28', report.heatRisk.yellowSeparate.bmiOver28],
                      ['บาดเจ็บจากอุบัติเหตุ', report.heatRisk.yellowSeparate.accidentInjury],
                      ['ไข้ 36.8-37.2', report.heatRisk.yellowSeparate.fever368to372],
                      ['นน.ลด 2-5 กก./สป.', report.heatRisk.yellowSeparate.weightLoss2to5],
                    ].map(([label, val]) => (
                      <div
                        key={String(label)}
                        className="flex items-center justify-between border-b border-slate-100 py-1.5"
                      >
                        <span className="font-medium text-slate-800">{label}</span>
                        <span className="text-base font-bold font-mono-num text-amber-900">
                          {val} นาย
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="col-span-5 rounded-lg border-2 border-red-400 bg-red-50 p-3.5">
                  <div className="flex items-center justify-between text-base font-bold text-red-900">
                    <span>🔴 งดฝึก</span>
                    <span className="font-mono-num text-lg">{redTotal} นาย</span>
                  </div>
                  <div className="mt-2.5 space-y-2 text-sm">
                    {[
                      ['BMI >= 30', report.heatRisk.redExempt.bmiOver30],
                      ['ไข้ > 37.2', report.heatRisk.redExempt.feverOver372],
                      ['นน.ลด > 5 กก./สป.', report.heatRisk.redExempt.weightLossOver5],
                    ].map(([label, val]) => (
                      <div
                        key={String(label)}
                        className="flex items-center justify-between border-b border-red-200/70 py-1.5"
                      >
                        <span className="font-semibold text-red-950">{label}</span>
                        <span className="text-base font-bold font-mono-num text-red-700">
                          {val} นาย
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Prominent Urine Color Spectrum */}
            <div className="col-span-5 rounded-xl border-2 border-emerald-800 bg-emerald-50/30 p-5">
              <div className="flex items-center justify-between border-b border-emerald-200 pb-2.5">
                <h2 className="text-lg font-bold text-slate-900">
                  ระดับสีปัสสาวะ (ประเมินภาวะขาดน้ำ)
                </h2>
                <span className="text-sm font-bold font-mono-num text-emerald-900">
                  ตรวจทั้งหมด {urineTotal} นาย
                </span>
              </div>

              <div className="mt-4 grid grid-cols-5 gap-2.5">
                {URINE_LEVELS.map((lvl) => {
                  const count = report.urineColor[lvl.key];
                  const pct = urineTotal > 0 ? Math.round((count / urineTotal) * 100) : 0;
                  return (
                    <div
                      key={lvl.key}
                      className="flex flex-col justify-between rounded-lg border p-3 text-center"
                      style={{
                        backgroundColor: lvl.bg,
                        borderColor: lvl.border,
                        color: lvl.text,
                      }}
                    >
                      <div className="text-xs font-bold">{lvl.label}</div>
                      <div className="my-2 text-3xl font-bold font-mono-num">{count}</div>
                      <div className="text-xs font-semibold leading-snug">
                        {lvl.desc}
                      </div>
                      <div className="mt-1.5 text-xs font-bold font-mono-num opacity-90">
                        {pct}%
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Row 3: Barracks Heat Index 19.00 */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-5">
            <div className="flex items-center justify-between pb-3">
              <h2 className="text-lg font-bold text-slate-900">
                🌡️ ดัชนีความร้อนโรงนอน เวลา 19.00 น.
              </h2>
              <span className="text-sm font-medium text-slate-700">
                เกณฑ์ปกติ &lt; 33.0 °C · หากสูงกว่า 33.0 °C แสดงกรอบและตัวอักษรสีแดง
              </span>
            </div>
            <div className="grid grid-cols-4 gap-3.5">
              {(
                [
                  ['dorm1', 'โรงนอนที่ 1'],
                  ['dorm2', 'โรงนอนที่ 2'],
                  ['dorm3', 'โรงนอนที่ 3'],
                  ['dorm4', 'โรงนอนที่ 4'],
                ] as const
              ).map(([key, label]) => {
                const temp = report.dormHeat1900[key];
                const critical = isHeatCritical(temp);
                return (
                  <div
                    key={key}
                    className={`flex items-center justify-between rounded-lg border-2 px-4 py-3.5 ${
                      critical
                        ? 'border-red-600 bg-red-50 text-red-700'
                        : 'border-slate-200 bg-white text-slate-900'
                    }`}
                  >
                    <div>
                      <div className="text-sm font-bold">{label}</div>
                      <div
                        className={`text-xs font-semibold ${
                          critical ? 'text-red-700' : 'text-emerald-700'
                        }`}
                      >
                        {getHeatStatusLabel(temp)}
                      </div>
                    </div>
                    <div
                      className={`text-3xl font-bold font-mono-num ${
                        critical ? 'text-red-700' : 'text-slate-900'
                      }`}
                    >
                      {temp !== null ? `${temp.toFixed(1)}°C` : '-'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Row 4 (PROMINENT VISUAL SHOWCASE): Render ONLY uploaded photos */}
          {(() => {
            const uploadedPhotos = report.photos
              .map((url, idx) => ({ url, idx }))
              .filter((item): item is { url: string; idx: number } => Boolean(item.url));

            if (uploadedPhotos.length === 0 && (readOnly || isPresenting)) {
              return null;
            }

            const photoGridCols =
              uploadedPhotos.length === 1
                ? 'grid-cols-1 max-w-2xl mx-auto'
                : uploadedPhotos.length === 2
                ? 'grid-cols-2'
                : uploadedPhotos.length === 3 || uploadedPhotos.length === 5 || uploadedPhotos.length === 6 || uploadedPhotos.length === 9
                ? 'grid-cols-3'
                : 'grid-cols-4';

            return (
              <div
                className={`rounded-xl border-2 border-slate-800 bg-white p-5 ${
                  uploadedPhotos.length === 0 ? 'no-print' : ''
                }`}
              >
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      ภาพประกอบการรายงานผลการคัดกรอง
                      {uploadedPhotos.length > 0 ? ` (${uploadedPhotos.length} ภาพ)` : ''}
                    </h2>
                    <p className="text-xs text-slate-600">
                      {uploadedPhotos.length > 0
                        ? 'แสดงเฉพาะภาพที่นำเข้าและปรับสัดส่วนเป็นแนวนอนโดยอัตโนมัติ'
                        : 'ยังไม่มีภาพประกอบในรายงานฉบับนี้ (นำเข้าได้สูงสุด 12 ภาพ · ระบบจะแสดงเฉพาะภาพที่มี)'}
                    </p>
                  </div>
                  {!readOnly && (
                    <label className="no-print inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800">
                      <ImagePlus className="h-3.5 w-3.5" />
                      นำเข้าภาพ ({uploadedPhotos.length}/12 รูป)
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleBatchUpload}
                        className="sr-only"
                      />
                    </label>
                  )}
                </div>

                {uploadedPhotos.length > 0 && (
                  <div className={`grid gap-3 ${photoGridCols}`}>
                    {uploadedPhotos.map(({ url, idx }) => (
                      <div
                        key={idx}
                        className="group relative aspect-[16/10] overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
                      >
                        <img
                          src={url}
                          alt={`ภาพประกอบการนำเสนอที่ ${idx + 1}`}
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover"
                        />
                        {!readOnly && (
                          <button
                            type="button"
                            onClick={() => handleClearPhotoSlot(idx)}
                            aria-label={`ลบภาพประกอบช่องที่ ${idx + 1}`}
                            className="no-print absolute right-1.5 top-1.5 rounded bg-slate-900/80 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
        </div>
      </div>

      <CropExportModal
        isOpen={cropImageUrl !== null}
        imageDataUrl={cropImageUrl}
        defaultFilename={`crop-infographic-ร8พัน3-${report.isoDate}.png`}
        title="ครอปภาพหน้าจอ · Infographic หน่วยฝึกทหารใหม่ ร.8 พัน.3"
        onClose={() => setCropImageUrl(null)}
      />
    </div>
  );
};
