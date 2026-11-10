// The gym runs on Dhaka time regardless of where a device's clock is set.
const DHAKA = 'Asia/Dhaka';

const partsFor = (date: Date) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: DHAKA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  return { y: get('year'), m: get('month'), d: get('day'), h: get('hour'), min: get('minute'), s: get('second') };
};

export const todayDhaka = (): string => {
  const p = partsFor(new Date());
  return `${p.y}-${p.m}-${p.d}`;
};

export const nowTimeDhaka = (): string => {
  const p = partsFor(new Date());
  return `${p.h}:${p.min}`;
};

export const currentBillingMonth = (): string =>
  new Intl.DateTimeFormat('en-US', { timeZone: DHAKA, month: 'long', year: 'numeric' }).format(new Date());

/** 'YYYY-MM-DD HH:mm' in Dhaka time, the format the screens already display. */
export const formatDateTime = (iso: string | null | undefined, withSeconds = false): string => {
  if (!iso) return '';
  const p = partsFor(new Date(iso));
  return `${p.y}-${p.m}-${p.d} ${p.h}:${p.min}${withSeconds ? `:${p.s}` : ''}`;
};

export const relativeTime = (iso: string): string => {
  const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} d ago`;
  return formatDateTime(iso).split(' ')[0];
};
