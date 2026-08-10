const RELATIVE_TIME_LIMIT_MS = 24 * 60 * 60 * 1000;

const isValidDate = (date: Date): boolean => Number.isFinite(date.getTime());

export const formatAbsoluteTime = (date: Date, locale: string): string | null => {
  if (!isValidDate(date)) return null;
  return date.toLocaleString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const formatMemoTime = (date: Date, locale: string, now = Date.now()): string | null => {
  if (!isValidDate(date)) return null;

  const deltaMs = date.getTime() - now;
  if (Math.abs(deltaMs) >= RELATIVE_TIME_LIMIT_MS) {
    return formatAbsoluteTime(date, locale);
  }

  const relativeTime = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const deltaSeconds = deltaMs / 1000;
  const absoluteSeconds = Math.abs(deltaSeconds);

  if (absoluteSeconds < 45) {
    return relativeTime.format(0, "second");
  }
  if (absoluteSeconds < 60 * 60) {
    return relativeTime.format(Math.round(deltaSeconds / 60), "minute");
  }
  return relativeTime.format(Math.round(deltaSeconds / (60 * 60)), "hour");
};
