import React, { useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Check, Copy, Download, ExternalLink, QrCode, Smartphone, X } from 'lucide-react';
import type { DailyTemperatureLog, ScreeningReport } from '../types/report';
import type { AppColorTheme } from '../utils/themes';
import { getThemeById } from '../utils/themes';
import { buildShareReportUrl } from '../utils/calculations';
import { exportElementToPng } from '../utils/exportUtils';

export interface QrSelection {
  type: 'infographic' | 'temp';
  id: string;
}

interface QrShareModalProps {
  isOpen: boolean;
  selection: QrSelection | null;
  reports: ScreeningReport[];
  tempLogs: DailyTemperatureLog[];
  theme?: AppColorTheme;
  onSelectChange: (next: QrSelection) => void;
  onClose: () => void;
}

export const QrShareModal: React.FC<QrShareModalProps> = ({
  isOpen,
  selection,
  reports,
  tempLogs,
  theme,
  onSelectChange,
  onClose,
}) => {
  const activeTheme = theme ?? getThemeById('army-olive');
  const qrCardRef = useRef<HTMLDivElement | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [qrError, setQrError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const selectedItem = useMemo(() => {
    if (!selection) return null;
    if (selection.type === 'infographic') {
      const report = reports.find((r) => r.id === selection.id) ?? reports[0];
      if (!report) return null;
      return {
        type: 'infographic' as const,
        id: report.id,
        tokenOrId: report.shareToken || report.id,
        typeLabel: 'Infographic ผลการคัดกรองทหารใหม่',
        dateLabel: report.dateTimeLabel,
        detailLabel: `ยอดทั้งหมด ${report.totalRecruits} นาย · เฝ้าระวังสำคัญ ${
          report.heatRisk.yellowSeparate.chronicDisease +
          report.heatRisk.yellowSeparate.bmiOver28 +
          report.heatRisk.yellowSeparate.accidentInjury +
          report.heatRisk.yellowSeparate.fever368to372 +
          report.heatRisk.yellowSeparate.weightLoss2to5 +
          report.heatRisk.redExempt.bmiOver30 +
          report.heatRisk.redExempt.feverOver372 +
          report.heatRisk.redExempt.weightLossOver5
        } นาย`,
        fileTag: `qr-infographic-${report.isoDate}`,
      };
    }
    const log = tempLogs.find((t) => t.id === selection.id) ?? tempLogs[0];
    if (!log) return null;
    return {
      type: 'temp' as const,
      id: log.id,
      tokenOrId: log.shareToken || log.id,
      typeLabel: 'บันทึกดัชนีความร้อนโรงนอนประจำวัน',
      dateLabel: `วันที่ ${log.displayDate}`,
      detailLabel: `ผู้บันทึก: ${log.recorderName || 'ไม่ระบุ'} · ช่วงเวลา 19:00 / 21:00 / 22:00 น.`,
      fileTag: `qr-temp-log-${log.isoDate}`,
    };
  }, [selection, reports, tempLogs]);

  const shareUrl = useMemo(() => {
    if (!selectedItem || typeof window === 'undefined') return '';
    return buildShareReportUrl(
      window.location.origin,
      window.location.pathname,
      selectedItem.type,
      selectedItem.tokenOrId
    );
  }, [selectedItem]);

  useEffect(() => {
    if (!isOpen || !shareUrl) {
      setQrDataUrl('');
      return;
    }
    let cancelled = false;
    setQrError(null);
    QRCode.toDataURL(shareUrl, {
      width: 320,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrError('ไม่สามารถสร้างภาพ QR Code ได้');
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, shareUrl]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !selection) return null;

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      // Fallback in restricted contexts
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadQrPng = async () => {
    if (!qrCardRef.current || !selectedItem) return;
    setIsDownloading(true);
    try {
      await exportElementToPng(qrCardRef.current, `${selectedItem.fileTag}.png`);
    } finally {
      setIsDownloading(false);
    }
  };

  const sortedReports = [...reports].sort((a, b) => b.isoDate.localeCompare(a.isoDate));
  const sortedLogs = [...tempLogs].sort((a, b) => b.isoDate.localeCompare(a.isoDate));

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <QrCode className="h-5 w-5 text-slate-800" />
            <div>
              <h2 id="qr-modal-title" className="text-base font-bold text-slate-900">
                สร้าง QR Code สำหรับผู้บังคับบัญชา (สแกนดูผ่านมือถือ)
              </h2>
              <p className="text-xs text-slate-500">
                เปิดดูรายงานแบบอ่านอย่างเดียวได้ทันทีโดยไม่สามารถแก้ไขข้อมูลต้นฉบับ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิดหน้าต่าง QR Code"
            className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          {/* Report Type & Target Picker */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <span className="mb-1 block text-xs font-semibold text-slate-700">
                ประเภทรายงาน
              </span>
              <div className="flex rounded-lg bg-slate-100 p-1">
                <button
                  type="button"
                  disabled={sortedReports.length === 0}
                  onClick={() =>
                    sortedReports[0] &&
                    onSelectChange({ type: 'infographic', id: sortedReports[0].id })
                  }
                  className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 disabled:opacity-40 ${
                    selection.type === 'infographic'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Infographic คัดกรอง
                </button>
                <button
                  type="button"
                  disabled={sortedLogs.length === 0}
                  onClick={() =>
                    sortedLogs[0] && onSelectChange({ type: 'temp', id: sortedLogs[0].id })
                  }
                  className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 disabled:opacity-40 ${
                    selection.type === 'temp'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  อุณหภูมิโรงนอน
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="qr-report-select"
                className="mb-1 block text-xs font-semibold text-slate-700"
              >
                เลือกรายการรายงาน
              </label>
              <select
                id="qr-report-select"
                value={selectedItem?.id ?? ''}
                onChange={(e) =>
                  onSelectChange({ type: selection.type, id: e.target.value })
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-emerald-700 focus:outline-none"
              >
                {selection.type === 'infographic'
                  ? sortedReports.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.dateTimeLabel} (คงเหลือ{' '}
                        {Math.max(0, r.totalRecruits - r.hospitalCount - r.referredCount)} นาย)
                      </option>
                    ))
                  : sortedLogs.map((t) => (
                      <option key={t.id} value={t.id}>
                        วันที่ {t.displayDate} · {t.recorderName || 'ไม่ระบุผู้บันทึก'}
                      </option>
                    ))}
              </select>
            </div>
          </div>

          {/* Capturable QR Card */}
          {selectedItem ? (
            <div
              ref={qrCardRef}
              data-testid="qr-share-card"
              className={`overflow-hidden rounded-xl border bg-white ${activeTheme.panelBorder}`}
            >
              <div
                className={`px-5 py-3.5 text-center ${activeTheme.bannerBg} ${activeTheme.bannerBorder}`}
              >
                <div className={`text-base font-bold ${activeTheme.bannerTitleText}`}>
                  หน่วยฝึกทหารใหม่ ร.8 พัน.3
                </div>
                <div className={`text-xs font-medium ${activeTheme.bannerSubText}`}>
                  {selectedItem.typeLabel}
                </div>
              </div>

              <div className="flex flex-col items-center px-6 py-5 text-center">
                <div className="text-base font-bold text-slate-900">
                  {selectedItem.dateLabel}
                </div>
                <div className="mt-0.5 text-xs text-slate-600">{selectedItem.detailLabel}</div>

                <div className="mt-4 flex h-56 w-56 items-center justify-center rounded-xl border border-slate-200 bg-white p-3">
                  {qrError ? (
                    <span className="text-xs text-red-700">{qrError}</span>
                  ) : qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt={`QR Code สำหรับเปิดดู ${selectedItem.typeLabel} ${selectedItem.dateLabel}`}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <span className="text-xs text-slate-400">กำลังสร้าง QR Code...</span>
                  )}
                </div>

                <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                  <Smartphone className="h-3.5 w-3.5" />
                  สแกน QR Code ด้วยกล้องโทรศัพท์มือถือเพื่อดูรายงาน (อ่านอย่างเดียว)
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
              ยังไม่มีข้อมูลรายงานในหมวดหมู่นี้สำหรับสร้าง QR Code
            </div>
          )}

          {/* Share URL preview & Actions */}
          {selectedItem && (
            <div className="space-y-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono-num text-slate-700 break-all">
                {shareUrl}
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-700" />
                      คัดลอกลิ้งค์แล้ว
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      คัดลอกลิ้งค์
                    </>
                  )}
                </button>

                <a
                  href={shareUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  เปิดหน้าจอรายงาน
                </a>

                <button
                  type="button"
                  disabled={!qrDataUrl || isDownloading}
                  onClick={handleDownloadQrPng}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold disabled:opacity-50 whitespace-nowrap shrink-0 ${activeTheme.primaryButton}`}
                >
                  <Download className="h-3.5 w-3.5" />
                  {isDownloading ? 'กำลังบันทึก...' : 'ดาวน์โหลด QR Code (.png)'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
