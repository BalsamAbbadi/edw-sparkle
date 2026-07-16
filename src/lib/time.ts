// Time formatting helpers.
// In Arabic we display 12-hour format with ص/م (morning/evening).
// In English we display 12-hour format with AM/PM.
// Input format: "HH:MM" or "HH:MM:SS" (24-hour).
export function formatTime(time?: string | null, lang: 'ar' | 'en' = 'ar'): string {
  if (!time) return '';
  const [hStr, mStr = '00'] = time.split(':');
  const h = parseInt(hStr, 10);
  if (Number.isNaN(h)) return time;
  const suffix = lang === 'ar' ? (h < 12 ? 'ص' : 'م') : (h < 12 ? 'AM' : 'PM');
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${mStr.padStart(2, '0')} ${suffix}`;
}

export function formatTimeRange(start?: string | null, end?: string | null, lang: 'ar' | 'en' = 'ar'): string {
  if (!start) return '';
  const s = formatTime(start, lang);
  if (!end) return s;
  return `${s} - ${formatTime(end, lang)}`;
}

// Hour label for calendar column headers.
export function formatHourLabel(hour: number, lang: 'ar' | 'en' = 'ar'): string {
  return formatTime(`${String(hour).padStart(2, '0')}:00`, lang);
}
