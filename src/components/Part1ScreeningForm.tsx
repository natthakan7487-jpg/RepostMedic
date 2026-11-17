import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FilePlus2,
  ImagePlus,
  Pencil,
  Plus,
  Save,
  Trash2,
  Upload,
} from 'lucide-react';
import type { PersonnelEntry, ScreeningReport } from '../types/report';
import {
  calculateRemainingRecruits,
  formatThaiFullDateTime,
  getHeatStatusLabel,
  isHeatCritical,
  sumQuarantineTotal,
  sumRedHeatRisk,
  sumYellowHeatRisk,
  validateScreeningReport,
} from '../utils/calculations';
import {
  convertEmblemFileToDataUrl,
  convertImageFileToLandscapeDataUrl,
} from '../utils/exportUtils';

interface Part1ScreeningFormProps {
  report: ScreeningReport;
  onChange: (next: ScreeningReport) => void;
  onSave: (report: ScreeningReport) => Promise<void>;
  onSaveAndPresent: (report: ScreeningReport) => Promise<void>;
  onCreateNew: () => void;
  isSaving: boolean;
}

interface PersonnelEditorProps {
  title: string;
  placeholderDetail: string;
  entries: PersonnelEntry[];
  onChange: (next: PersonnelEntry[]) => void;
  onSyncCount?: (len: number) => void;
}

const PersonnelListEditor: React.FC<PersonnelEditorProps> = ({
  title,
  placeholderDetail,
  entries,
  onChange,
  onSyncCount,
}) => {
  const [fullName, setFullName] = useState('');
  const [code, setCode] = useState('');
  const [detail, setDetail] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleAddOrUpdate = () => {
    if (!fullName.trim()) return;
    if (editingId) {
      onChange(
        entries.map((item) =>
          item.id === editingId
            ? { ...item, fullName: fullName.trim(), code: code.trim(), detail: detail.trim() }
            : item
        )
      );
      setEditingId(null);
    } else {
      const next = [
        ...entries,
        {
          id: `per-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          fullName: fullName.trim(),
          code: code.trim(),
          detail: detail.trim(),
        },
      ];
      onChange(next);
      if (onSyncCount) {
        onSyncCount(next.length);
      }
    }
    setFullName('');
    setCode('');
    setDetail('');
  };

  const startEdit = (entry: PersonnelEntry) => {
    setEditingId(entry.id);
    setFullName(entry.fullName);
    setCode(entry.code);
    setDetail(entry.detail);
  };

  const removeEntry = (id: string) => {
    const next = entries.filter((item) => item.id !== id);
    onChange(next);
    if (editingId === id) {
      setEditingId(null);
      setFullName('');
      setCode('');
      setDetail('');
    }
  };

  return (
    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-slate-700">
          รายชื่อ{title} ({entries.length} รายการ)
        </span>
        {onSyncCount && entries.length > 0 && (
          <button
            type="button"
            onClick={() => onSyncCount(entries.length)}
            className="text-xs font-medium text-emerald-800 hover:underline whitespace-nowrap shrink-0"
          >
            ปรับยอดตามรายชื่อ ({entries.length} นาย)
          </button>
        )}
      </div>

      {entries.length > 0 && (
        <ul className="mb-2.5 divide-y divide-slate-200 rounded-md border border-slate-200 bg-white">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-xs"
            >
              <div className="flex flex-wrap items-center gap-2 text-slate-800">
                <span className="font-semibold">{entry.fullName}</span>
                {entry.code && (
                  <span className="font-mono-num text-slate-500">รหัส {entry.code}</span>
                )}
                {entry.detail && <span className="text-slate-600">· {entry.detail}</span>}
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => startEdit(entry)}
                  aria-label={`แก้ไข ${entry.fullName}`}
                  className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => removeEntry(entry.id)}
                  aria-label={`ลบ ${entry.fullName}`}
                  className="rounded p-1.5 text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-12">
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="ชื่อ-สกุล (เช่น พลฯธันวา เพชรอรุณ)"
          aria-label={`${title} ชื่อ-สกุล`}
          className="sm:col-span-4 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-emerald-700 focus:outline-none"
        />
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="รหัส (เช่น D-16)"
          aria-label={`${title} รหัส`}
          className="sm:col-span-2 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-emerald-700 focus:outline-none"
        />
        <input
          type="text"
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          placeholder={placeholderDetail}
          aria-label={`${title} อาการหรือภารกิจ`}
          className="sm:col-span-4 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-emerald-700 focus:outline-none"
        />
        <button
          type="button"
          onClick={handleAddOrUpdate}
          className="sm:col-span-2 inline-flex items-center justify-center gap-1 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 whitespace-nowrap shrink-0"
        >
          <Plus className="h-3.5 w-3.5" />
          {editingId ? 'อัปเดต' : 'เพิ่มรายชื่อ'}
        </button>
      </div>
    </div>
  );
};

export const Part1ScreeningForm: React.FC<Part1ScreeningFormProps> = ({
  report,
  onChange,
  onSave,
  onSaveAndPresent,
  onCreateNew,
  isSaving,
}) => {
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const remainingCount = calculateRemainingRecruits(
    report.totalRecruits,
    report.hospitalCount,
    report.referredCount
  );

  const handleNumber = (val: string): number => {
    const n = Number(val);
    return Number.isNaN(n) || n < 0 ? 0 : Math.floor(n);
  };

  const handleTemp = (val: string): number | null => {
    if (val.trim() === '') return null;
    const n = Number(val);
    return Number.isNaN(n) ? null : n;
  };

  const handleDateChange = (nextIso: string) => {
    onChange({
      ...report,
      isoDate: nextIso,
      dateTimeLabel: formatThaiFullDateTime(nextIso, report.timeText),
    });
  };

  const handleTimeChange = (nextTime: string) => {
    onChange({
      ...report,
      timeText: nextTime,
      dateTimeLabel: formatThaiFullDateTime(report.isoDate, nextTime),
    });
  };

  const handleEmblemUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await convertEmblemFileToDataUrl(file);
    onChange({ ...report, unitLogoUrl: dataUrl });
  };

  const handleBatchPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    const nextPhotos = [...report.photos];
    let slotIdx = nextPhotos.findIndex((p) => p === null);
    if (slotIdx === -1) slotIdx = 0;

    for (const file of files) {
      if (slotIdx >= 12) break;
      const landscapeUrl = await convertImageFileToLandscapeDataUrl(file);
      nextPhotos[slotIdx] = landscapeUrl;
      slotIdx += 1;
    }
    onChange({ ...report, photos: nextPhotos });
    e.target.value = '';
  };

  const handleSingleSlotUpload = async (
    idx: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const landscapeUrl = await convertImageFileToLandscapeDataUrl(file);
    const nextPhotos = [...report.photos];
    nextPhotos[idx] = landscapeUrl;
    onChange({ ...report, photos: nextPhotos });
    e.target.value = '';
  };

  const clearPhotoSlot = (idx: number) => {
    const nextPhotos = [...report.photos];
    nextPhotos[idx] = null;
    onChange({ ...report, photos: nextPhotos });
  };

  const triggerSave = async (goToInfographic: boolean) => {
    const errs = validateScreeningReport(report);
    setValidationErrors(errs);
    if (errs.length > 0) return;

    if (goToInfographic) {
      await onSaveAndPresent(report);
    } else {
      await onSave(report);
      setSaveMessage('บันทึกข้อมูลส่วนที่ 1 ลงฐานข้อมูลเรียบร้อยแล้ว');
      setTimeout(() => setSaveMessage(null), 3500);
    }
  };

  const yellowTotal = sumYellowHeatRisk(report);
  const redTotal = sumRedHeatRisk(report);
  const quarantineTotal = sumQuarantineTotal(report);
  const uploadedPhotosCount = report.photos.filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            ส่วนที่ 1 · แบบฟอร์มบันทึกผลการคัดกรองทหารใหม่ประจำวัน
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            หน่วยฝึกทหารใหม่ ร.8 พัน.3 · กรอกยอดกำลังพล กลุ่มเสี่ยงความร้อน ระดับสีปัสสาวะ และดัชนีความร้อนโรงนอน
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onCreateNew}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <FilePlus2 className="h-4 w-4" />
            สร้างรายงานใหม่
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={() => triggerSave(false)}
            className="inline-flex items-center gap-2 rounded-lg border border-emerald-800 bg-white px-4 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-50 disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            <Save className="h-4 w-4" />
            {isSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={() => triggerSave(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-900 disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            บันทึกและเปิดหน้า Infographic
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {validationErrors.length > 0 && (
        <div
          role="alert"
          className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-900"
        >
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4 text-red-700" />
            กรุณาตรวจสอบข้อมูลก่อนบันทึก
          </div>
          <ul className="mt-1.5 list-disc pl-5 text-xs space-y-1">
            {validationErrors.map((err) => (
              <li key={err}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {saveMessage && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900"
        >
          <CheckCircle2 className="h-4 w-4 text-emerald-700" />
          {saveMessage}
        </div>
      )}

      {/* 1. Date & Time + Emblem */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
          1. วัน/เดือน/ปี เวลา และตราสัญลักษณ์หน่วย
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-12">
          <div className="md:col-span-3">
            <label htmlFor="report-iso-date" className="block text-xs font-semibold text-slate-700">
              วันที่รายงาน (ปฏิทิน)
            </label>
            <input
              id="report-iso-date"
              type="date"
              value={report.isoDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono-num text-slate-900 focus:border-emerald-700 focus:outline-none"
            />
          </div>
          <div className="md:col-span-3">
            <label htmlFor="report-time-text" className="block text-xs font-semibold text-slate-700">
              เวลาที่รายงาน
            </label>
            <input
              id="report-time-text"
              type="text"
              value={report.timeText}
              onChange={(e) => handleTimeChange(e.target.value)}
              placeholder="20:00 น."
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono-num text-slate-900 focus:border-emerald-700 focus:outline-none"
            />
          </div>
          <div className="md:col-span-6">
            <label
              htmlFor="report-datetime-label"
              className="block text-xs font-semibold text-slate-700"
            >
              ข้อความ วัน/เดือน/ปี และเวลา (แสดงบนหัวรายงานส่วนที่ 2)
            </label>
            <input
              id="report-datetime-label"
              type="text"
              value={report.dateTimeLabel}
              onChange={(e) => onChange({ ...report, dateTimeLabel: e.target.value })}
              placeholder="วันที่ 15 พ.ย.69 เวลา 20:00 น"
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-700 focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-4">
          <img
            src={report.unitLogoUrl}
            alt="ตราสัญลักษณ์หน่วย"
            referrerPolicy="no-referrer"
            className="h-16 w-16 rounded-lg border border-slate-200 bg-white object-contain p-1"
          />
          <div>
            <p className="text-xs font-semibold text-slate-700">ตราสัญลักษณ์หน่วย (ใช้ในส่วนที่ 2)</p>
            <label className="mt-1.5 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
              <Upload className="h-3.5 w-3.5" />
              อัปโหลดตราสัญลักษณ์ใหม่
              <input type="file" accept="image/*" onChange={handleEmblemUpload} className="sr-only" />
            </label>
          </div>
        </div>
      </section>

      {/* 2. Manpower & Personnel Lists */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <h2 className="text-base font-bold text-slate-900">
            2. ยอดกำลังพลทหารใหม่ และรายชื่อผู้ป่วย/ภารกิจ
          </h2>
          <div className="text-xs text-slate-600 font-mono-num">
            สูตร: ทหารใหม่ทั้งหมด ({report.totalRecruits}) − นอน รพ. ({report.hospitalCount}) − ส่งต่อการรักษา ({report.referredCount}) ={' '}
            <span className="font-bold text-emerald-800">คงเหลือ {remainingCount} นาย</span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
            <label htmlFor="total-recruits" className="block text-xs font-semibold text-slate-700">
              ทหารใหม่มียอดทั้งหมด (นาย)
            </label>
            <input
              id="total-recruits"
              type="number"
              min={0}
              value={report.totalRecruits}
              onChange={(e) => onChange({ ...report, totalRecruits: handleNumber(e.target.value) })}
              className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-lg font-bold font-mono-num text-slate-900 focus:border-emerald-700 focus:outline-none"
            />
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-3.5">
            <label htmlFor="hospital-count" className="block text-xs font-semibold text-slate-700">
              นอน รพ. (นาย)
            </label>
            <input
              id="hospital-count"
              type="number"
              min={0}
              value={report.hospitalCount}
              onChange={(e) => onChange({ ...report, hospitalCount: handleNumber(e.target.value) })}
              className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-lg font-bold font-mono-num text-slate-900 focus:border-emerald-700 focus:outline-none"
            />
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-3.5">
            <label htmlFor="referred-count" className="block text-xs font-semibold text-slate-700">
              ส่งต่อการรักษา (นาย)
            </label>
            <input
              id="referred-count"
              type="number"
              min={0}
              value={report.referredCount}
              onChange={(e) => onChange({ ...report, referredCount: handleNumber(e.target.value) })}
              className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-lg font-bold font-mono-num text-slate-900 focus:border-emerald-700 focus:outline-none"
            />
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-3.5">
            <label htmlFor="external-count" className="block text-xs font-semibold text-slate-700">
              ภารกิจนอกหน่วย (นาย)
            </label>
            <input
              id="external-count"
              type="number"
              min={0}
              value={report.externalMissionCount}
              onChange={(e) =>
                onChange({ ...report, externalMissionCount: handleNumber(e.target.value) })
              }
              className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-lg font-bold font-mono-num text-slate-900 focus:border-emerald-700 focus:outline-none"
            />
          </div>

          <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-3.5">
            <span className="block text-xs font-semibold text-emerald-900">
              คงเหลือ (คำนวณอัตโนมัติ)
            </span>
            <div
              data-testid="remaining-recruits-value"
              className="mt-1.5 text-2xl font-bold font-mono-num text-emerald-900"
            >
              {remainingCount} <span className="text-sm font-medium">นาย</span>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <PersonnelListEditor
            title="นอน รพ."
            placeholderDetail="อาการ (เช่น เจ็บป่วยจากความร้อน)"
            entries={report.hospitalList}
            onChange={(next) => onChange({ ...report, hospitalList: next })}
            onSyncCount={(len) => onChange({ ...report, hospitalCount: len })}
          />
          <PersonnelListEditor
            title="ส่งต่อการรักษา"
            placeholderDetail="อาการ / สถานพยาบาลที่ส่งต่อ"
            entries={report.referredList}
            onChange={(next) => onChange({ ...report, referredList: next })}
            onSyncCount={(len) => onChange({ ...report, referredCount: len })}
          />
          <PersonnelListEditor
            title="ภารกิจนอกหน่วย"
            placeholderDetail="ภารกิจ (เช่น ภารกิจ ขึ้นศาล)"
            entries={report.externalMissionList}
            onChange={(next) => onChange({ ...report, externalMissionList: next })}
            onSyncCount={(len) => onChange({ ...report, externalMissionCount: len })}
          />
          <PersonnelListEditor
            title="คงเหลือ (บันทึกเฝ้าระวัง / หมายเหตุรายบุคคล)"
            placeholderDetail="อาการ (เช่น อาการ เฝ้าระวังความร้อน)"
            entries={report.remainingList}
            onChange={(next) => onChange({ ...report, remainingList: next })}
          />
        </div>
      </section>

      {/* 3. Quarantine & Risk Colors */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900">
              3. แยกตามกลุ่มพื้นที่กักตัว
            </h2>
            <span className="text-xs font-semibold font-mono-num text-slate-600">
              รวม {quarantineTotal} นาย
            </span>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {(
              [
                ['uq', 'กักตัว UQ.'],
                ['ciCovid', 'กักตัว CI. โควิด'],
                ['ciFlu', 'กักตัว CI. ไข้หวัดใหญ่'],
                ['infirmaryObservation', 'นอนพักดูอาการที่พยาบาล'],
                ['hospitalAdmit', 'นอนพักรักษาตัวที่ รพ.'],
                ['hospitalCheckup', 'ไปตรวจที่โรงพยาบาล'],
              ] as const
            ).map(([key, label]) => (
              <div key={key}>
                <label htmlFor={`q-${key}`} className="block text-xs font-medium text-slate-700">
                  {label} (นาย)
                </label>
                <input
                  id={`q-${key}`}
                  type="number"
                  min={0}
                  value={report.quarantine[key]}
                  onChange={(e) =>
                    onChange({
                      ...report,
                      quarantine: { ...report.quarantine, [key]: handleNumber(e.target.value) },
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold font-mono-num text-slate-900 focus:border-emerald-700 focus:outline-none"
                />
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
            4. แยกตามกลุ่มสีสัญลักษณ์ความเสี่ยงภายในหน่วย
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-3.5">
            {(
              [
                ['normalWhite', '⚪️ ปกติ', 'border-slate-300 bg-slate-50'],
                ['green', '🟢 เขียว', 'border-emerald-300 bg-emerald-50/70'],
                ['yellow', '🟡 เหลือง', 'border-amber-300 bg-amber-50/70'],
                ['red', '🔴 แดง', 'border-red-300 bg-red-50/70'],
              ] as const
            ).map(([key, label, tone]) => (
              <div key={key} className={`rounded-lg border p-3 ${tone}`}>
                <label htmlFor={`rc-${key}`} className="block text-xs font-semibold text-slate-800">
                  {label} (นาย)
                </label>
                <input
                  id={`rc-${key}`}
                  type="number"
                  min={0}
                  value={report.riskColors[key]}
                  onChange={(e) =>
                    onChange({
                      ...report,
                      riskColors: { ...report.riskColors, [key]: handleNumber(e.target.value) },
                    })
                  }
                  className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base font-bold font-mono-num text-slate-900 focus:border-emerald-700 focus:outline-none"
                />
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* 4. Heat Illness Risk (Yellow & Red) */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <h2 className="text-base font-bold text-slate-900">
            5. ความเสี่ยงการเจ็บป่วยจากความร้อน 🟡 (แยกฝึก) และ 🔴 (งดฝึก)
          </h2>
          <div className="flex items-center gap-4 text-xs font-semibold font-mono-num">
            <span className="text-amber-700">🟡 แยกฝึก รวม {yellowTotal} นาย</span>
            <span className="text-red-700">🔴 งดฝึก รวม {redTotal} นาย</span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="rounded-lg border border-amber-300 bg-amber-50/50 p-4">
            <h3 className="text-sm font-bold text-amber-900">🟡 (แยกฝึก)</h3>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {(
                [
                  ['chronicDisease', 'โรคประจำตัว'],
                  ['bmiOver28', 'BMI >= 28'],
                  ['accidentInjury', 'ได้รับบาดเจ็บจากอุบัติเหตุ'],
                  ['fever368to372', 'ไข้ 36.8-37.2'],
                  ['weightLoss2to5', 'น้ำหนักลด 2-5 กก./สป.'],
                ] as const
              ).map(([key, label]) => (
                <div key={key}>
                  <label
                    htmlFor={`hy-${key}`}
                    className="block text-xs font-medium text-slate-800"
                  >
                    {label} (นาย)
                  </label>
                  <input
                    id={`hy-${key}`}
                    type="number"
                    min={0}
                    value={report.heatRisk.yellowSeparate[key]}
                    onChange={(e) =>
                      onChange({
                        ...report,
                        heatRisk: {
                          ...report.heatRisk,
                          yellowSeparate: {
                            ...report.heatRisk.yellowSeparate,
                            [key]: handleNumber(e.target.value),
                          },
                        },
                      })
                    }
                    className="mt-1 w-full rounded-md border border-amber-300 bg-white px-3 py-1.5 text-sm font-semibold font-mono-num text-slate-900 focus:border-amber-600 focus:outline-none"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-red-300 bg-red-50/50 p-4">
            <h3 className="text-sm font-bold text-red-900">🔴 (งดฝึก)</h3>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {(
                [
                  ['bmiOver30', 'BMI >= 30'],
                  ['feverOver372', 'ไข้ > 37.2'],
                  ['weightLossOver5', 'นน.ลด > 5 กก./สป.'],
                ] as const
              ).map(([key, label]) => (
                <div key={key}>
                  <label
                    htmlFor={`hr-${key}`}
                    className="block text-xs font-medium text-slate-800"
                  >
                    {label} (นาย)
                  </label>
                  <input
                    id={`hr-${key}`}
                    type="number"
                    min={0}
                    value={report.heatRisk.redExempt[key]}
                    onChange={(e) =>
                      onChange({
                        ...report,
                        heatRisk: {
                          ...report.heatRisk,
                          redExempt: {
                            ...report.heatRisk.redExempt,
                            [key]: handleNumber(e.target.value),
                          },
                        },
                      })
                    }
                    className="mt-1 w-full rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-semibold font-mono-num text-slate-900 focus:border-red-600 focus:outline-none"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 5. Urine Color Levels & Barracks 19:00 Heat Index */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
            6. ระดับสีปัสสาวะ
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {(
              [
                ['level0', 'ระดับ 0', '#FEFCE8', 'ใสปกติ'],
                ['level1', 'ระดับ 1', '#FEF08A', 'เหลืองอ่อน'],
                ['level2', 'ระดับ 2', '#FACC15', 'เหลืองเข้ม'],
                ['level3', 'ระดับ 3', '#EA580C', 'ส้ม/ขาดน้ำ'],
                ['level4', 'ระดับ 4', '#9A3412', 'เข้มมาก/อันตราย'],
              ] as const
            ).map(([key, label, swatch, sub]) => (
              <div key={key} className="rounded-lg border border-slate-200 p-2.5">
                <div className="flex items-center gap-2">
                  <span
                    className="h-4 w-4 shrink-0 rounded border border-slate-300"
                    style={{ backgroundColor: swatch }}
                  />
                  <label htmlFor={`u-${key}`} className="text-xs font-semibold text-slate-900">
                    {label}
                  </label>
                </div>
                <p className="mt-0.5 text-[11px] text-slate-500">{sub}</p>
                <input
                  id={`u-${key}`}
                  type="number"
                  min={0}
                  value={report.urineColor[key]}
                  onChange={(e) =>
                    onChange({
                      ...report,
                      urineColor: {
                        ...report.urineColor,
                        [key]: handleNumber(e.target.value),
                      },
                    })
                  }
                  className="mt-2 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm font-bold font-mono-num text-slate-900 focus:border-emerald-700 focus:outline-none"
                />
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900">
              7. ดัชนีความร้อนโรงนอน เวลา 19.00 น.
            </h2>
            <span className="text-xs text-slate-500">ปกติ &lt; 33°C · เกิน 33°C แสดงกรอบแดง</span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3.5">
            {(
              [
                ['dorm1', 'โรงนอนที่ 1'],
                ['dorm2', 'โรงนอนที่ 2'],
                ['dorm3', 'โรงนอนที่ 3'],
                ['dorm4', 'โรงนอนที่ 4'],
              ] as const
            ).map(([key, label]) => {
              const val = report.dormHeat1900[key];
              const critical = isHeatCritical(val);
              return (
                <div
                  key={key}
                  className={`rounded-lg border p-3 transition-colors ${
                    critical
                      ? 'border-red-500 bg-red-50 text-red-900'
                      : 'border-slate-200 bg-slate-50/70 text-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <label
                      htmlFor={`p1-${key}`}
                      className={`text-xs font-semibold ${
                        critical ? 'text-red-800' : 'text-slate-700'
                      }`}
                    >
                      {label} (°C)
                    </label>
                    <span
                      className={`text-[11px] font-semibold ${
                        critical ? 'text-red-700' : 'text-emerald-700'
                      }`}
                    >
                      {getHeatStatusLabel(val)}
                    </span>
                  </div>
                  <input
                    id={`p1-${key}`}
                    type="number"
                    step="0.1"
                    value={val ?? ''}
                    onChange={(e) =>
                      onChange({
                        ...report,
                        dormHeat1900: {
                          ...report.dormHeat1900,
                          [key]: handleTemp(e.target.value),
                        },
                      })
                    }
                    placeholder="เช่น 32.4"
                    className={`mt-1.5 w-full rounded-md border bg-white px-3 py-2 text-base font-bold font-mono-num focus:outline-none ${
                      critical
                        ? 'border-red-500 text-red-700 focus:border-red-600'
                        : 'border-slate-300 text-slate-900 focus:border-emerald-700'
                    }`}
                  />
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* 6. 12 Landscape Photos Uploader */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              8. ภาพประกอบการนำเสนอ (12 รูป · ปรับเป็นแนวนอนอัตโนมัติ)
            </h2>
            <p className="text-xs text-slate-500">
              รองรับการอัปโหลดหลายภาพพร้อมกัน ระบบจะปรับสัดส่วนภาพเป็นแนวนอน (16:10) ให้อัตโนมัติ ({uploadedPhotosCount}/12 ภาพ)
            </p>
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap shrink-0">
            <ImagePlus className="h-4 w-4" />
            เพิ่มรูปภาพหลายรูป (สูงสุด 12)
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleBatchPhotoUpload}
              className="sr-only"
            />
          </label>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {report.photos.map((photo, idx) => (
            <div
              key={idx}
              className="group relative aspect-[16/10] overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
            >
              {photo ? (
                <>
                  <img
                    src={photo}
                    alt={`ภาพประกอบที่ ${idx + 1}`}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-slate-900/70 px-2 py-1 text-[11px] text-white">
                    <span className="font-mono-num">รูปที่ {idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => clearPhotoSlot(idx)}
                      aria-label={`ลบรูปที่ ${idx + 1}`}
                      className="rounded p-0.5 text-red-300 hover:text-white"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </>
              ) : (
                <label className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-1 p-2 text-center text-xs text-slate-500 hover:bg-slate-100">
                  <ImagePlus className="h-5 w-5 text-slate-400" />
                  <span className="font-mono-num">ช่องที่ {idx + 1}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleSingleSlotUpload(idx, e)}
                    className="sr-only"
                  />
                </label>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
