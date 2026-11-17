export type ColorThemeId =
  | 'army-olive'
  | 'medical-navy'
  | 'tactical-khaki'
  | 'crimson-slate';

export interface AppColorTheme {
  id: ColorThemeId;
  name: string;
  subtitle: string;
  swatchPrimary: string;
  swatchAccent: string;
  swatchCanvas: string;
  // Page & Top Bar
  pageBgStyle: string;
  topBarBg: string;
  topBarBorder: string;
  topBarActiveTab: string;
  topBarCta: string;
  // Infographic & Report Banner
  bannerBg: string;
  bannerBorder: string;
  bannerTitleText: string;
  bannerSubText: string;
  bannerAccentRule: string;
  // Section headers & soft surface accents
  sectionHeaderBg: string;
  sectionHeaderText: string;
  panelTintBg: string;
  panelBorder: string;
  primaryButton: string;
  outlineButton: string;
  accentText: string;
}

export const APP_COLOR_THEMES: Record<ColorThemeId, AppColorTheme> = {
  'army-olive': {
    id: 'army-olive',
    name: 'เขียวทหารบก · ทองเกียรติยศ',
    subtitle: 'โทนหลักหน่วยฝึก ร.8 พัน.3',
    swatchPrimary: '#143D2B',
    swatchAccent: '#C59B27',
    swatchCanvas: '#F6F5EF',
    pageBgStyle: 'bg-[#F6F5EF]',
    topBarBg: 'bg-[#143D2B] text-white',
    topBarBorder: 'border-b-2 border-[#C59B27]',
    topBarActiveTab: 'bg-[#C59B27] text-slate-950 font-bold',
    topBarCta: 'bg-[#C59B27] text-slate-950 hover:bg-[#D4AB38]',
    bannerBg: 'bg-gradient-to-r from-[#143D2B] via-[#1B4D36] to-[#143D2B] text-white',
    bannerBorder: 'border-b-4 border-[#C59B27]',
    bannerTitleText: 'text-white',
    bannerSubText: 'text-[#FDE68A]',
    bannerAccentRule: 'border-[#C59B27]',
    sectionHeaderBg: 'bg-[#1B4D36] text-white',
    sectionHeaderText: 'text-white',
    panelTintBg: 'bg-[#FAF9F4]',
    panelBorder: 'border-[#D9D4C3]',
    primaryButton: 'bg-[#143D2B] text-white hover:bg-[#1B4D36]',
    outlineButton: 'border-[#1B4D36] text-[#143D2B] hover:bg-[#EEF2EC]',
    accentText: 'text-[#143D2B]',
  },
  'medical-navy': {
    id: 'medical-navy',
    name: 'น้ำเงินกรมแพทย์ · ทอง',
    subtitle: 'โทนทางการแพทย์ทหาร',
    swatchPrimary: '#0F294A',
    swatchAccent: '#D4A017',
    swatchCanvas: '#F3F6FB',
    pageBgStyle: 'bg-[#F3F6FB]',
    topBarBg: 'bg-[#0F294A] text-white',
    topBarBorder: 'border-b-2 border-[#D4A017]',
    topBarActiveTab: 'bg-[#D4A017] text-slate-950 font-bold',
    topBarCta: 'bg-[#D4A017] text-slate-950 hover:bg-[#E2B02B]',
    bannerBg: 'bg-gradient-to-r from-[#0F294A] via-[#173B68] to-[#0F294A] text-white',
    bannerBorder: 'border-b-4 border-[#D4A017]',
    bannerTitleText: 'text-white',
    bannerSubText: 'text-sky-200',
    bannerAccentRule: 'border-[#D4A017]',
    sectionHeaderBg: 'bg-[#173B68] text-white',
    sectionHeaderText: 'text-white',
    panelTintBg: 'bg-[#F8FAFD]',
    panelBorder: 'border-slate-300',
    primaryButton: 'bg-[#0F294A] text-white hover:bg-[#173B68]',
    outlineButton: 'border-[#0F294A] text-[#0F294A] hover:bg-sky-50',
    accentText: 'text-[#0F294A]',
  },
  'tactical-khaki': {
    id: 'tactical-khaki',
    name: 'เขียวพราง · กากีอบอุ่น',
    subtitle: 'โทนสนามฝึกภาคสนาม',
    swatchPrimary: '#2F3E28',
    swatchAccent: '#9A7B3E',
    swatchCanvas: '#F5F2E8',
    pageBgStyle: 'bg-[#F5F2E8]',
    topBarBg: 'bg-[#2F3E28] text-white',
    topBarBorder: 'border-b-2 border-[#B69451]',
    topBarActiveTab: 'bg-[#B69451] text-slate-950 font-bold',
    topBarCta: 'bg-[#B69451] text-slate-950 hover:bg-[#C6A562]',
    bannerBg: 'bg-gradient-to-r from-[#2F3E28] via-[#3E5035] to-[#2F3E28] text-white',
    bannerBorder: 'border-b-4 border-[#B69451]',
    bannerTitleText: 'text-white',
    bannerSubText: 'text-[#EFE4C4]',
    bannerAccentRule: 'border-[#B69451]',
    sectionHeaderBg: 'bg-[#3E5035] text-white',
    sectionHeaderText: 'text-white',
    panelTintBg: 'bg-[#FAF7EE]',
    panelBorder: 'border-[#D5CCB4]',
    primaryButton: 'bg-[#2F3E28] text-white hover:bg-[#3E5035]',
    outlineButton: 'border-[#2F3E28] text-[#2F3E28] hover:bg-[#EDE9DB]',
    accentText: 'text-[#2F3E28]',
  },
  'crimson-slate': {
    id: 'crimson-slate',
    name: 'กรมท่า · แดงชาดเกียรติยศ',
    subtitle: 'โทนเข้มคมชัดสำหรับการนำเสนอ',
    swatchPrimary: '#1E293B',
    swatchAccent: '#B91C1C',
    swatchCanvas: '#F5F6F8',
    pageBgStyle: 'bg-[#F5F6F8]',
    topBarBg: 'bg-[#1E293B] text-white',
    topBarBorder: 'border-b-2 border-[#B91C1C]',
    topBarActiveTab: 'bg-[#B91C1C] text-white font-bold',
    topBarCta: 'bg-[#B91C1C] text-white hover:bg-[#991B1B]',
    bannerBg: 'bg-gradient-to-r from-[#1E293B] via-[#334155] to-[#1E293B] text-white',
    bannerBorder: 'border-b-4 border-[#DC2626]',
    bannerTitleText: 'text-white',
    bannerSubText: 'text-rose-200',
    bannerAccentRule: 'border-[#DC2626]',
    sectionHeaderBg: 'bg-[#1E293B] text-white',
    sectionHeaderText: 'text-white',
    panelTintBg: 'bg-slate-50',
    panelBorder: 'border-slate-300',
    primaryButton: 'bg-[#1E293B] text-white hover:bg-slate-800',
    outlineButton: 'border-[#1E293B] text-[#1E293B] hover:bg-slate-100',
    accentText: 'text-[#991B1B]',
  },
};

export const THEME_LIST: AppColorTheme[] = Object.values(APP_COLOR_THEMES);

export function getThemeById(id?: string): AppColorTheme {
  if (id && id in APP_COLOR_THEMES) {
    return APP_COLOR_THEMES[id as ColorThemeId];
  }
  return APP_COLOR_THEMES['army-olive'];
}
