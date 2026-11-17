import React, { useEffect, useRef, useState } from 'react';
import { Crop, Download, Maximize2, X } from 'lucide-react';
import { triggerDownload } from '../utils/exportUtils';

interface CropExportModalProps {
  isOpen: boolean;
  imageDataUrl: string | null;
  defaultFilename: string;
  title: string;
  onClose: () => void;
}

interface CropRect {
  x: number; // percentage 0..100
  y: number;
  w: number;
  h: number;
}

export const CropExportModal: React.FC<CropExportModalProps> = ({
  isOpen,
  imageDataUrl,
  defaultFilename,
  title,
  onClose,
}) => {
  const [crop, setCrop] = useState<CropRect>({ x: 0, y: 0, w: 100, h: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCrop({ x: 0, y: 0, w: 100, h: 100 });
    }
  }, [isOpen, imageDataUrl]);

  if (!isOpen || !imageDataUrl) return null;

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const px = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const py = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    dragStartRef.current = { x: px, y: py };
    setIsDragging(true);
    setCrop({ x: px, y: py, w: 1, h: 1 });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !dragStartRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const px = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const py = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    const start = dragStartRef.current;
    const x = Math.min(start.x, px);
    const y = Math.min(start.y, py);
    const w = Math.max(4, Math.abs(px - start.x));
    const h = Math.max(4, Math.abs(py - start.y));
    setCrop({ x, y, w: Math.min(w, 100 - x), h: Math.min(h, 100 - y) });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    dragStartRef.current = null;
  };

  const handleDownloadCropped = async () => {
    const img = new Image();
    img.src = imageDataUrl;
    await new Promise<void>((resolve) => {
      img.onload = () => resolve();
    });

    const sx = (crop.x / 100) * img.width;
    const sy = (crop.y / 100) * img.height;
    const sw = Math.max(10, (crop.w / 100) * img.width);
    const sh = Math.max(10, (crop.h / 100) * img.height);

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(sw);
    canvas.height = Math.round(sh);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

    triggerDownload(canvas.toDataURL('image/png'), defaultFilename);
    onClose();
  };

  const handleDownloadFull = () => {
    triggerDownload(imageDataUrl, defaultFilename);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <Crop className="h-5 w-5 text-emerald-800" />
            <div>
              <h3 className="text-base font-semibold text-slate-900">{title}</h3>
              <p className="text-xs text-slate-500">
                ลากเมาส์บนภาพเพื่อเลือกพื้นที่ครอป หรือกดดาวน์โหลดภาพเต็มหน้าจอได้ทันที
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิดหน้าต่างครอปภาพ"
            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto bg-slate-100 p-5 flex items-center justify-center">
          <div
            ref={containerRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="relative inline-block cursor-crosshair select-none overflow-hidden rounded border border-slate-300 bg-white shadow-sm"
          >
            <img
              src={imageDataUrl}
              alt="ตัวอย่างภาพสำหรับครอป"
              draggable={false}
              className="block max-h-[62vh] w-auto object-contain"
            />
            <div
              className="pointer-events-none absolute border-2 border-emerald-500 bg-emerald-500/10"
              style={{
                left: `${crop.x}%`,
                top: `${crop.y}%`,
                width: `${crop.w}%`,
                height: `${crop.h}%`,
                boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.35)',
              }}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-5 py-3.5">
          <div className="flex items-center gap-2 text-xs text-slate-600 font-mono-num">
            <span>
              พื้นที่ที่เลือก: {Math.round(crop.w)}% × {Math.round(crop.h)}%
            </span>
            <button
              type="button"
              onClick={() => setCrop({ x: 0, y: 0, w: 100, h: 100 })}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              เลือกเต็มภาพ
            </button>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleDownloadFull}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              <Download className="h-4 w-4" />
              บันทึกภาพเต็ม (PNG)
            </button>
            <button
              type="button"
              onClick={handleDownloadCropped}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-800 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-900 whitespace-nowrap shrink-0"
            >
              <Crop className="h-4 w-4" />
              บันทึกภาพตามกรอบที่ครอป
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
