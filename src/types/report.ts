export interface PersonnelEntry {
  id: string;
  fullName: string;
  code: string;
  detail: string;
}

export interface DormTemps {
  dorm1: number | null;
  dorm2: number | null;
  dorm3: number | null;
  dorm4: number | null;
}

export interface QuarantineCounts {
  uq: number;
  ciCovid: number;
  ciFlu: number;
  infirmaryObservation: number;
  hospitalAdmit: number;
  hospitalCheckup: number;
}

export interface RiskColorCounts {
  normalWhite: number;
  green: number;
  yellow: number;
  red: number;
}

export interface HeatRiskYellowCounts {
  chronicDisease: number;
  bmiOver28: number;
  accidentInjury: number;
  fever368to372: number;
  weightLoss2to5: number;
}

export interface HeatRiskRedCounts {
  bmiOver30: number;
  feverOver372: number;
  weightLossOver5: number;
}

export interface UrineColorCounts {
  level0: number;
  level1: number;
  level2: number;
  level3: number;
  level4: number;
}

export type ColorThemeId =
  | 'army-olive'
  | 'medical-navy'
  | 'tactical-khaki'
  | 'crimson-slate';

export interface ScreeningReport {
  id: string;
  isoDate: string;
  timeText: string;
  dateTimeLabel: string;
  totalRecruits: number;
  hospitalCount: number;
  hospitalList: PersonnelEntry[];
  referredCount: number;
  referredList: PersonnelEntry[];
  externalMissionCount: number;
  externalMissionList: PersonnelEntry[];
  remainingList: PersonnelEntry[];
  quarantine: QuarantineCounts;
  riskColors: RiskColorCounts;
  heatRisk: {
    yellowSeparate: HeatRiskYellowCounts;
    redExempt: HeatRiskRedCounts;
  };
  urineColor: UrineColorCounts;
  dormHeat1900: DormTemps;
  unitLogoUrl: string;
  photos: (string | null)[];
  colorTheme?: ColorThemeId;
  shareToken: string;
  isFinalized: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DailyTemperatureLog {
  id: string;
  isoDate: string;
  displayDate: string;
  time1900: DormTemps;
  time2100: DormTemps;
  time2200: DormTemps;
  recorderName: string;
  colorTheme?: ColorThemeId;
  shareToken: string;
  isFinalized: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CommanderSignature {
  commanderRankName: string;
  commanderPosition: string;
  note: string;
}

export type AppSection = 'part1' | 'part2' | 'part3' | 'part4' | 'part5';

export type DormSelectorKey = 'dorm1' | 'dorm2' | 'dorm3' | 'dorm4' | 'max' | 'avg';

export interface MonthlyChartPoint {
  id: string;
  isoDate: string;
  shortDateLabel: string;
  recorderName: string;
  temp1900: number | null;
  temp2100: number | null;
  temp2200: number | null;
}

export interface DashboardAnalytics {
  totalScreeningReports: number;
  totalTempLogs: number;
  latestTotalRecruits: number;
  latestRemainingRecruits: number;
  latestRemainingPct: number;
  totalYellowRiskLatest: number;
  totalRedRiskLatest: number;
  totalUrineAlertLatest: number;
  overThresholdTempReadings: number;
  totalTempReadings: number;
  highestRecordedTemp: number | null;
}
