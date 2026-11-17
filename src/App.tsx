import React, { useEffect, useState } from 'react';
import type {
  AppSection,
  ColorThemeId,
  CommanderSignature,
  DailyTemperatureLog,
  ScreeningReport,
} from './types/report';
import {
  DEFAULT_COMMANDER_SIGNATURE,
  createBlankScreeningReport,
  createBlankTemperatureLog,
} from './data/seedData';
import { formatThaiShortDate } from './utils/calculations';
import { getThemeById } from './utils/themes';
import { ThemePickerBar } from './components/ThemePickerBar';
import { Part1ScreeningForm } from './components/Part1ScreeningForm';
import { Part2Infographic } from './components/Part2Infographic';
import { Part3DailyTempLog } from './components/Part3DailyTempLog';
import { Part4MonthlyLineGraph } from './components/Part4MonthlyLineGraph';
import { Part5DashboardExport } from './components/Part5DashboardExport';

interface ShareRoute {
  type: 'infographic' | 'temp';
  token: string;
}

function parseShareQuery(): ShareRoute | null {
  const params = new URLSearchParams(window.location.search);
  const type = params.get('share');
  const token = params.get('token');
  if ((type === 'infographic' || type === 'temp') && token) {
    return { type, token };
  }
  return null;
}

export default function App() {
  const [shareRoute] = useState<ShareRoute | null>(() => parseShareQuery());
  const [sharedData, setSharedData] = useState<
    ScreeningReport | DailyTemperatureLog | null
  >(null);
  const [shareError, setShareError] = useState<string | null>(null);

  const [activeThemeId, setActiveThemeId] = useState<ColorThemeId>('army-olive');
  const [activeSection, setActiveSection] = useState<AppSection>('part1');
  const [reports, setReports] = useState<ScreeningReport[]>([]);
  const [tempLogs, setTempLogs] = useState<DailyTemperatureLog[]>([]);
  const [commanderSignature, setCommanderSignature] = useState<CommanderSignature>(
    DEFAULT_COMMANDER_SIGNATURE
  );

  const [activeReport, setActiveReport] = useState<ScreeningReport>(() =>
    createBlankScreeningReport()
  );
  const [activeTempLog, setActiveTempLog] = useState<DailyTemperatureLog>(() =>
    createBlankTemperatureLog()
  );

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const activeTheme = getThemeById(activeThemeId);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        if (shareRoute) {
          const res = await fetch(
            `/api/share/${shareRoute.type}/${encodeURIComponent(shareRoute.token)}`
          );
          if (!res.ok) {
            throw new Error('ไม่พบลิงก์รายงานที่ต้องการ หรือลิงก์อาจถูกลบแล้ว');
          }
          const json = await res.json();
          if (!cancelled) {
            setSharedData(json.data);
            if (json.data?.colorTheme) {
              setActiveThemeId(json.data.colorTheme);
            } else if (json.colorTheme) {
              setActiveThemeId(json.colorTheme);
            }
          }
          return;
        }

        const res = await fetch('/api/bootstrap');
        if (!res.ok) throw new Error('โหลดฐานข้อมูลไม่สำเร็จ');
        const data = await res.json();
        if (!cancelled) {
          const nextReports: ScreeningReport[] = data.screeningReports ?? [];
          const nextLogs: DailyTemperatureLog[] = data.temperatureLogs ?? [];
          setReports(nextReports);
          setTempLogs(nextLogs);
          if (data.commanderSignature) {
            setCommanderSignature(data.commanderSignature);
          }
          if (data.colorTheme) {
            setActiveThemeId(data.colorTheme);
          }
          if (nextReports.length > 0) {
            setActiveReport(nextReports[0]);
          } else {
            setActiveReport({
              ...createBlankScreeningReport(),
              colorTheme: data.colorTheme ?? 'army-olive',
            });
          }
          if (nextLogs.length > 0) {
            const sorted = [...nextLogs].sort((a, b) =>
              b.isoDate.localeCompare(a.isoDate)
            );
            setActiveTempLog(sorted[0]);
          } else {
            setActiveTempLog({
              ...createBlankTemperatureLog(),
              colorTheme: data.colorTheme ?? 'army-olive',
            });
          }
        }
      } catch (err) {
        if (!cancelled && shareRoute) {
          setShareError((err as Error).message);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [shareRoute]);

  const handleSelectTheme = async (themeId: ColorThemeId) => {
    setActiveThemeId(themeId);
    setActiveReport((prev) => ({ ...prev, colorTheme: themeId }));
    setActiveTempLog((prev) => ({ ...prev, colorTheme: themeId }));
    try {
      await fetch('/api/theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ colorTheme: themeId }),
      });
    } catch {
      // ignore transient network errors
    }
  };

  const handleSaveReport = async (reportToSave: ScreeningReport) => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/screening-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...reportToSave, colorTheme: activeThemeId }),
      });
      if (!res.ok) throw new Error('บันทึกรายงานไม่สำเร็จ');
      const saved: ScreeningReport = await res.json();
      setActiveReport(saved);
      setReports((prev) => {
        const exists = prev.some((item) => item.id === saved.id);
        const next = exists
          ? prev.map((item) => (item.id === saved.id ? saved : item))
          : [saved, ...prev];
        return next.sort((a, b) => b.isoDate.localeCompare(a.isoDate));
      });
      return saved;
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAndPresent = async (reportToSave: ScreeningReport) => {
    await handleSaveReport(reportToSave);
    setActiveSection('part2');
  };

  const handleCreateNewReport = () => {
    const todayIso = new Date().toISOString().slice(0, 10);
    setActiveReport({ ...createBlankScreeningReport(todayIso), colorTheme: activeThemeId });
    setActiveSection('part1');
  };

  const handleDeleteReport = async (id: string) => {
    const res = await fetch(`/api/screening-reports/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      setReports((prev) => {
        const remaining = prev.filter((item) => item.id !== id);
        if (activeReport.id === id) {
          setActiveReport(remaining[0] ?? createBlankScreeningReport());
        }
        return remaining;
      });
    }
  };

  const handleSelectDateLog = (isoDate: string) => {
    const found = tempLogs.find((item) => item.isoDate === isoDate);
    if (found) {
      setActiveTempLog(found);
      return;
    }
    setActiveTempLog({
      id: `tmp-${isoDate}`,
      isoDate,
      displayDate: formatThaiShortDate(isoDate),
      time1900: { dorm1: null, dorm2: null, dorm3: null, dorm4: null },
      time2100: { dorm1: null, dorm2: null, dorm3: null, dorm4: null },
      time2200: { dorm1: null, dorm2: null, dorm3: null, dorm4: null },
      recorderName: activeTempLog.recorderName || '',
      colorTheme: activeThemeId,
      shareToken: `tmp-${isoDate}-${Math.random().toString(36).slice(2, 6)}`,
      isFinalized: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  };

  const handleSaveTempLog = async (logToSave: DailyTemperatureLog) => {
    setIsSaving(true);
    try {
      const payload: DailyTemperatureLog = {
        ...logToSave,
        colorTheme: activeThemeId,
        displayDate: formatThaiShortDate(logToSave.isoDate),
      };
      const res = await fetch('/api/temperature-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('บันทึกอุณหภูมิไม่สำเร็จ');
      const saved: DailyTemperatureLog = await res.json();
      setActiveTempLog(saved);
      setTempLogs((prev) => {
        const exists = prev.some(
          (item) => item.id === saved.id || item.isoDate === saved.isoDate
        );
        const next = exists
          ? prev.map((item) =>
              item.id === saved.id || item.isoDate === saved.isoDate ? saved : item
            )
          : [...prev, saved];
        return next.sort((a, b) => a.isoDate.localeCompare(b.isoDate));
      });
      return saved;
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTempLog = async (id: string) => {
    const res = await fetch(`/api/temperature-logs/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      setTempLogs((prev) => prev.filter((item) => item.id !== id));
    }
  };

  const handleSaveSignature = async (sig: CommanderSignature) => {
    const res = await fetch('/api/commander-signature', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sig),
    });
    if (res.ok) {
      const updated = await res.json();
      setCommanderSignature(updated);
    }
  };

  const handleClearAllData = async () => {
    const res = await fetch('/api/clear-data', { method: 'POST' });
    if (res.ok) {
      setReports([]);
      setTempLogs([]);
      setActiveReport({ ...createBlankScreeningReport(), colorTheme: activeThemeId });
      setActiveTempLog({ ...createBlankTemperatureLog(), colorTheme: activeThemeId });
    }
  };

  // Dedicated Read-Only Share View (cannot be edited when opened via link)
  if (shareRoute) {
    return (
      <div className={`min-h-screen px-4 py-6 md:px-8 ${activeTheme.pageBgStyle}`}>
        <div className="mx-auto max-w-[1400px]">
          {isLoading ? (
            <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-600">
              กำลังโหลดรายงานนำเสนอ...
            </div>
          ) : shareError || !sharedData ? (
            <div className="rounded-xl border border-red-200 bg-white p-10 text-center">
              <h1 className="text-lg font-bold text-red-700">ไม่สามารถเปิดรายงานได้</h1>
              <p className="mt-1 text-sm text-slate-600">
                {shareError ?? 'ไม่พบข้อมูลที่ต้องการ'}
              </p>
            </div>
          ) : shareRoute.type === 'infographic' ? (
            <Part2Infographic
              report={sharedData as ScreeningReport}
              theme={activeTheme}
              readOnly
            />
          ) : (
            <Part3DailyTempLog
              log={sharedData as DailyTemperatureLog}
              allLogs={[sharedData as DailyTemperatureLog]}
              theme={activeTheme}
              readOnly
              onSelectDateLog={() => {}}
            />
          )}
        </div>
      </div>
    );
  }

  const navTabs: Array<{ id: AppSection; label: string }> = [
    { id: 'part1', label: '1. กรอกคัดกรอง' },
    { id: 'part2', label: '2. Infographic' },
    { id: 'part3', label: '3. อุณหภูมิรายวัน' },
    { id: 'part4', label: '4. กราฟรายเดือน' },
    { id: 'part5', label: '5. ฐานข้อมูลและส่งออก' },
  ];

  return (
    <div className={`min-h-screen text-slate-900 transition-colors ${activeTheme.pageBgStyle}`}>
      {/* Clean 3-zone Themed Top Navigation Bar */}
      <header
        className={`no-print sticky top-0 z-30 ${activeTheme.topBarBg} ${activeTheme.topBarBorder}`}
      >
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-8 px-4 py-3 md:px-6">
          <a
            href="/"
            className="text-base font-bold tracking-tight text-white whitespace-nowrap shrink-0"
          >
            หน่วยฝึกทหารใหม่ ร.8 พัน.3
          </a>

          <nav
            aria-label="เมนูหลัก 5 ส่วน"
            className="flex items-center gap-1.5 overflow-x-auto"
          >
            {navTabs.map((tab) => {
              const active = activeSection === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveSection(tab.id)}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? activeTheme.topBarActiveTab
                      : 'text-white/85 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>

          <div className="hidden lg:flex items-center shrink-0">
            <button
              type="button"
              onClick={() => setActiveSection('part2')}
              className={`rounded-lg px-4 py-2 text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${activeTheme.topBarCta}`}
            >
              หน้า Infographic
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-4 py-5 md:px-6">
        <ThemePickerBar
          activeThemeId={activeThemeId}
          onSelectTheme={handleSelectTheme}
        />

        {isLoading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">
            กำลังโหลดฐานข้อมูลรายงาน...
          </div>
        ) : (
          <>
            {activeSection === 'part1' && (
              <Part1ScreeningForm
                report={activeReport}
                onChange={setActiveReport}
                onSave={async (r) => {
                  await handleSaveReport(r);
                }}
                onSaveAndPresent={handleSaveAndPresent}
                onCreateNew={handleCreateNewReport}
                isSaving={isSaving}
              />
            )}

            {activeSection === 'part2' && (
              <Part2Infographic
                report={activeReport}
                theme={activeTheme}
                onChange={setActiveReport}
                onSave={handleSaveReport}
              />
            )}

            {activeSection === 'part3' && (
              <Part3DailyTempLog
                log={activeTempLog}
                allLogs={tempLogs}
                theme={activeTheme}
                onSelectDateLog={handleSelectDateLog}
                onChange={setActiveTempLog}
                onSave={handleSaveTempLog}
              />
            )}

            {activeSection === 'part4' && (
              <Part4MonthlyLineGraph
                logs={tempLogs}
                signature={commanderSignature}
                theme={activeTheme}
                onSaveSignature={handleSaveSignature}
              />
            )}

            {activeSection === 'part5' && (
              <Part5DashboardExport
                reports={reports}
                tempLogs={tempLogs}
                theme={activeTheme}
                onOpenReportInForm={(r) => {
                  setActiveReport(r);
                  setActiveSection('part1');
                }}
                onOpenReportInInfographic={(r) => {
                  setActiveReport(r);
                  setActiveSection('part2');
                }}
                onDeleteReport={handleDeleteReport}
                onOpenTempLog={(isoDate) => {
                  handleSelectDateLog(isoDate);
                  setActiveSection('part3');
                }}
                onDeleteTempLog={handleDeleteTempLog}
                onClearAllData={handleClearAllData}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
