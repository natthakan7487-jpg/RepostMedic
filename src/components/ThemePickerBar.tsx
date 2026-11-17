import React from 'react';
import { Palette } from 'lucide-react';
import type { ColorThemeId } from '../types/report';
import { THEME_LIST } from '../utils/themes';

interface ThemePickerBarProps {
  activeThemeId: ColorThemeId;
  onSelectTheme: (id: ColorThemeId) => void;
}

export const ThemePickerBar: React.FC<ThemePickerBarProps> = ({
  activeThemeId,
  onSelectTheme,
}) => {
  return (
    <div
      className="no-print mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/90 bg-white/95 px-4 py-2.5 shadow-xs"
      role="region"
      aria-label="เลือกโทนสีตกแต่ง"
    >
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
        <Palette className="h-4 w-4 text-slate-700" />
        <span>โทนสีตกแต่งระบบและหน้ารายงาน:</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {THEME_LIST.map((theme) => {
          const isSelected = theme.id === activeThemeId;
          return (
            <button
              key={theme.id}
              type="button"
              onClick={() => onSelectTheme(theme.id)}
              aria-pressed={isSelected}
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                isSelected
                  ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <span className="inline-flex items-center overflow-hidden rounded-sm border border-black/15">
                <span
                  className="h-3.5 w-3.5"
                  style={{ backgroundColor: theme.swatchPrimary }}
                />
                <span
                  className="h-3.5 w-2.5"
                  style={{ backgroundColor: theme.swatchAccent }}
                />
              </span>
              <span>{theme.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
