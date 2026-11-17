import fs from 'fs';
import path from 'path';
import type {
  ColorThemeId,
  CommanderSignature,
  DailyTemperatureLog,
  ScreeningReport,
} from '../src/types/report';
import { DEFAULT_COMMANDER_SIGNATURE } from '../src/data/seedData';

export interface DatabaseState {
  screeningReports: ScreeningReport[];
  temperatureLogs: DailyTemperatureLog[];
  commanderSignature: CommanderSignature;
  colorTheme: ColorThemeId;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function createInitialState(): DatabaseState {
  return {
    screeningReports: [],
    temperatureLogs: [],
    commanderSignature: structuredClone(DEFAULT_COMMANDER_SIGNATURE),
    colorTheme: 'army-olive',
  };
}

export function readDatabase(): DatabaseState {
  ensureDataDir();
  if (!fs.existsSync(DB_FILE)) {
    const initial = createInitialState();
    writeDatabase(initial);
    return initial;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<DatabaseState>;
    return {
      screeningReports: Array.isArray(parsed.screeningReports)
        ? parsed.screeningReports
        : [],
      temperatureLogs: Array.isArray(parsed.temperatureLogs)
        ? parsed.temperatureLogs
        : [],
      commanderSignature: parsed.commanderSignature ?? structuredClone(DEFAULT_COMMANDER_SIGNATURE),
      colorTheme: parsed.colorTheme ?? 'army-olive',
    };
  } catch {
    const initial = createInitialState();
    writeDatabase(initial);
    return initial;
  }
}

export function writeDatabase(state: DatabaseState): void {
  ensureDataDir();
  const tmpFile = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(state, null, 2), 'utf-8');
  fs.renameSync(tmpFile, DB_FILE);
}

export function upsertScreeningReport(report: ScreeningReport): ScreeningReport {
  const db = readDatabase();
  const now = new Date().toISOString();
  const nextReport: ScreeningReport = {
    ...report,
    shareToken: report.shareToken || `shr-${Math.random().toString(36).slice(2, 10)}`,
    updatedAt: now,
    createdAt: report.createdAt || now,
  };
  const idx = db.screeningReports.findIndex((item) => item.id === nextReport.id);
  if (idx >= 0) {
    db.screeningReports[idx] = nextReport;
  } else {
    db.screeningReports.unshift(nextReport);
  }
  db.screeningReports.sort((a, b) => b.isoDate.localeCompare(a.isoDate));
  writeDatabase(db);
  return nextReport;
}

export function deleteScreeningReport(id: string): boolean {
  const db = readDatabase();
  const before = db.screeningReports.length;
  db.screeningReports = db.screeningReports.filter((item) => item.id !== id);
  if (db.screeningReports.length !== before) {
    writeDatabase(db);
    return true;
  }
  return false;
}

export function upsertTemperatureLog(log: DailyTemperatureLog): DailyTemperatureLog {
  const db = readDatabase();
  const now = new Date().toISOString();
  const existingById = db.temperatureLogs.findIndex((item) => item.id === log.id);
  const existingByDate = db.temperatureLogs.findIndex((item) => item.isoDate === log.isoDate);
  const targetIdx = existingById >= 0 ? existingById : existingByDate;

  const nextLog: DailyTemperatureLog = {
    ...log,
    id: targetIdx >= 0 ? db.temperatureLogs[targetIdx].id : log.id || `tmp-${log.isoDate}`,
    shareToken:
      log.shareToken ||
      (targetIdx >= 0
        ? db.temperatureLogs[targetIdx].shareToken
        : `tmp-${Math.random().toString(36).slice(2, 10)}`),
    createdAt: targetIdx >= 0 ? db.temperatureLogs[targetIdx].createdAt : log.createdAt || now,
    updatedAt: now,
  };

  if (targetIdx >= 0) {
    db.temperatureLogs[targetIdx] = nextLog;
  } else {
    db.temperatureLogs.push(nextLog);
  }
  db.temperatureLogs.sort((a, b) => a.isoDate.localeCompare(b.isoDate));
  writeDatabase(db);
  return nextLog;
}

export function deleteTemperatureLog(id: string): boolean {
  const db = readDatabase();
  const before = db.temperatureLogs.length;
  db.temperatureLogs = db.temperatureLogs.filter((item) => item.id !== id);
  if (db.temperatureLogs.length !== before) {
    writeDatabase(db);
    return true;
  }
  return false;
}

export function updateCommanderSignature(sig: CommanderSignature): CommanderSignature {
  const db = readDatabase();
  db.commanderSignature = sig;
  writeDatabase(db);
  return sig;
}

export function updateColorTheme(colorTheme: ColorThemeId): ColorThemeId {
  const db = readDatabase();
  db.colorTheme = colorTheme;
  writeDatabase(db);
  return colorTheme;
}

export function clearDatabaseRecords(): DatabaseState {
  const db = readDatabase();
  const next: DatabaseState = {
    screeningReports: [],
    temperatureLogs: [],
    commanderSignature: db.commanderSignature,
    colorTheme: db.colorTheme,
  };
  writeDatabase(next);
  return next;
}

export function findSharedResource(
  type: 'infographic' | 'temp',
  token: string
): ScreeningReport | DailyTemperatureLog | null {
  const db = readDatabase();
  if (type === 'infographic') {
    return (
      db.screeningReports.find((r) => r.shareToken === token || r.id === token) ?? null
    );
  }
  return db.temperatureLogs.find((t) => t.shareToken === token || t.id === token) ?? null;
}
