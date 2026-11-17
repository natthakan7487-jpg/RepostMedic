import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import type { DailyTemperatureLog, ScreeningReport } from '../types/report';
import {
  calculateRemainingRecruits,
  sumQuarantineTotal,
  sumRedHeatRisk,
  sumYellowHeatRisk,
} from './calculations';

export async function captureElementDataUrl(element: HTMLElement): Promise<string> {
  return toPng(element, {
    quality: 0.98,
    pixelRatio: 2,
    backgroundColor: '#ffffff',
    cacheBust: true,
    filter: (node) => {
      if (node instanceof HTMLElement && node.classList.contains('no-print')) {
        return false;
      }
      return true;
    },
  });
}

export function triggerDownload(url: string, filename: string): void {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function exportElementToPng(element: HTMLElement, filename: string): Promise<void> {
  const dataUrl = await captureElementDataUrl(element);
  triggerDownload(dataUrl, filename);
}

export async function exportElementToPdf(
  element: HTMLElement,
  filename: string,
  orientation: 'landscape' | 'portrait' = 'landscape'
): Promise<void> {
  const dataUrl = await captureElementDataUrl(element);
  const img = new Image();
  img.src = dataUrl;
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Failed to load rendered image for PDF'));
  });

  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 8;
  const maxWidth = pageWidth - margin * 2;
  const maxHeight = pageHeight - margin * 2;

  const imgRatio = img.width / img.height;
  let renderWidth = maxWidth;
  let renderHeight = renderWidth / imgRatio;

  if (renderHeight > maxHeight) {
    renderHeight = maxHeight;
    renderWidth = renderHeight * imgRatio;
  }

  const offsetX = (pageWidth - renderWidth) / 2;
  const offsetY = (pageHeight - renderHeight) / 2;

  pdf.addImage(dataUrl, 'PNG', offsetX, offsetY, renderWidth, renderHeight, undefined, 'FAST');
  pdf.save(filename);
}

export function exportAllToExcel(
  reports: ScreeningReport[],
  tempLogs: DailyTemperatureLog[],
  filename = 'รายงานคัดกรองและดัชนีความร้อน_ร8พัน3.xlsx'
): void {
  const workbook = XLSX.utils.book_new();

  const screeningRows = reports.map((r) => ({
    'วันที่ (ISO)': r.isoDate,
    'วัน/เดือน/ปี และเวลา': r.dateTimeLabel,
    'ยอดทหารใหม่ทั้งหมด (นาย)': r.totalRecruits,
    'นอน รพ. (นาย)': r.hospitalCount,
    'ส่งต่อการรักษา (นาย)': r.referredCount,
    'ภารกิจนอกหน่วย (นาย)': r.externalMissionCount,
    'คงเหลือ (นาย)': calculateRemainingRecruits(
      r.totalRecruits,
      r.hospitalCount,
      r.referredCount
    ),
    'รวมกลุ่มพื้นที่กักตัว (นาย)': sumQuarantineTotal(r),
    'กักตัว UQ.': r.quarantine.uq,
    'กักตัว CI. โควิด': r.quarantine.ciCovid,
    'กักตัว CI. ไข้หวัดใหญ่': r.quarantine.ciFlu,
    'นอนพักดูอาการที่พยาบาล': r.quarantine.infirmaryObservation,
    'นอนพักรักษาตัวที่ รพ.': r.quarantine.hospitalAdmit,
    'ไปตรวจที่โรงพยาบาล': r.quarantine.hospitalCheckup,
    'สีปกติ (ขาว)': r.riskColors.normalWhite,
    'สีเขียว': r.riskColors.green,
    'สีเหลือง': r.riskColors.yellow,
    'สีแดง': r.riskColors.red,
    'ความเสี่ยงความร้อน เหลือง (แยกฝึก) รวม': sumYellowHeatRisk(r),
    'โรคประจำตัว': r.heatRisk.yellowSeparate.chronicDisease,
    'BMI >= 28': r.heatRisk.yellowSeparate.bmiOver28,
    'บาดเจ็บอุบัติเหตุ': r.heatRisk.yellowSeparate.accidentInjury,
    'ไข้ 36.8-37.2': r.heatRisk.yellowSeparate.fever368to372,
    'นน.ลด 2-5 กก./สป.': r.heatRisk.yellowSeparate.weightLoss2to5,
    'ความเสี่ยงความร้อน แดง (งดฝึก) รวม': sumRedHeatRisk(r),
    'BMI >= 30': r.heatRisk.redExempt.bmiOver30,
    'ไข้ > 37.2': r.heatRisk.redExempt.feverOver372,
    'นน.ลด > 5 กก./สป.': r.heatRisk.redExempt.weightLossOver5,
    'ปัสสาวะ ระดับ 0': r.urineColor.level0,
    'ปัสสาวะ ระดับ 1': r.urineColor.level1,
    'ปัสสาวะ ระดับ 2': r.urineColor.level2,
    'ปัสสาวะ ระดับ 3': r.urineColor.level3,
    'ปัสสาวะ ระดับ 4': r.urineColor.level4,
    '19.00 โรงนอน 1 (°C)': r.dormHeat1900.dorm1 ?? '',
    '19.00 โรงนอน 2 (°C)': r.dormHeat1900.dorm2 ?? '',
    '19.00 โรงนอน 3 (°C)': r.dormHeat1900.dorm3 ?? '',
    '19.00 โรงนอน 4 (°C)': r.dormHeat1900.dorm4 ?? '',
  }));

  const personnelRows: Array<Record<string, string>> = [];
  for (const r of reports) {
    const pushEntries = (
      category: string,
      entries: Array<{ fullName: string; code: string; detail: string }>
    ) => {
      for (const entry of entries) {
        personnelRows.push({
          'วัน/เดือน/ปี': r.dateTimeLabel,
          ประเภท: category,
          'ชื่อ-สกุล': entry.fullName,
          รหัส: entry.code,
          'อาการ / ภารกิจ': entry.detail,
        });
      }
    };
    pushEntries('นอน รพ.', r.hospitalList);
    pushEntries('ส่งต่อการรักษา', r.referredList);
    pushEntries('ภารกิจนอกหน่วย', r.externalMissionList);
    pushEntries('คงเหลือ (เฝ้าระวัง)', r.remainingList);
  }

  const tempRows = [...tempLogs]
    .sort((a, b) => a.isoDate.localeCompare(b.isoDate))
    .map((t) => ({
      'วันที่ (ISO)': t.isoDate,
      วันที่แสดงผล: t.displayDate,
      '19:00 โรงนอน 1': t.time1900.dorm1 ?? '',
      '19:00 โรงนอน 2': t.time1900.dorm2 ?? '',
      '19:00 โรงนอน 3': t.time1900.dorm3 ?? '',
      '19:00 โรงนอน 4': t.time1900.dorm4 ?? '',
      '21:00 โรงนอน 1': t.time2100.dorm1 ?? '',
      '21:00 โรงนอน 2': t.time2100.dorm2 ?? '',
      '21:00 โรงนอน 3': t.time2100.dorm3 ?? '',
      '21:00 โรงนอน 4': t.time2100.dorm4 ?? '',
      '22:00 โรงนอน 1': t.time2200.dorm1 ?? '',
      '22:00 โรงนอน 2': t.time2200.dorm2 ?? '',
      '22:00 โรงนอน 3': t.time2200.dorm3 ?? '',
      '22:00 โรงนอน 4': t.time2200.dorm4 ?? '',
      'ชื่อ-สกุล ผู้บันทึก': t.recorderName,
    }));

  const ws1 = XLSX.utils.json_to_sheet(
    screeningRows.length > 0 ? screeningRows : [{ ข้อความ: 'ยังไม่มีข้อมูลรายงานคัดกรอง' }]
  );
  const ws2 = XLSX.utils.json_to_sheet(
    personnelRows.length > 0 ? personnelRows : [{ ข้อความ: 'ยังไม่มีรายชื่อกำลังพลเพิ่มเติม' }]
  );
  const ws3 = XLSX.utils.json_to_sheet(
    tempRows.length > 0 ? tempRows : [{ ข้อความ: 'ยังไม่มีข้อมูลบันทึกอุณหภูมิ' }]
  );

  XLSX.utils.book_append_sheet(workbook, ws1, 'รายงานคัดกรอง');
  XLSX.utils.book_append_sheet(workbook, ws2, 'รายชื่อกำลังพล');
  XLSX.utils.book_append_sheet(workbook, ws3, 'อุณหภูมิโรงนอน');

  XLSX.writeFile(workbook, filename);
}

/** Converts any uploaded image file (portrait, square, or landscape) into a clean 16:10 landscape data URL */
export async function convertImageFileToLandscapeDataUrl(
  file: File,
  targetWidth = 960,
  targetHeight = 600
): Promise<string> {
  const rawUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์รูปภาพได้'));
    reader.readAsDataURL(file);
  });

  const img = new Image();
  img.src = rawUrl;
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('ไฟล์รูปภาพไม่ถูกต้อง'));
  });

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return rawUrl;

  const targetRatio = targetWidth / targetHeight;
  const sourceRatio = img.width / img.height;

  let sx = 0;
  let sy = 0;
  let sw = img.width;
  let sh = img.height;

  if (sourceRatio > targetRatio) {
    sw = img.height * targetRatio;
    sx = (img.width - sw) / 2;
  } else {
    sh = img.width / targetRatio;
    sy = (img.height - sh) / 2;
  }

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, targetWidth, targetHeight);
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetWidth, targetHeight);
  return canvas.toDataURL('image/jpeg', 0.86);
}

export async function convertEmblemFileToDataUrl(file: File): Promise<string> {
  const rawUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์ตราสัญลักษณ์ได้'));
    reader.readAsDataURL(file);
  });
  const img = new Image();
  img.src = rawUrl;
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('ไฟล์ตราสัญลักษณ์ไม่ถูกต้อง'));
  });
  const size = 320;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return rawUrl;
  const scale = Math.min(size / img.width, size / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);
  ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
  return canvas.toDataURL('image/png');
}
