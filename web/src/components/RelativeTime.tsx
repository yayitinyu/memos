import { useEffect, useState } from "react";
import { formatAbsoluteTime, formatMemoTime } from "@/utils/time";

interface RelativeTimeProps {
  date: Date | undefined;
  locale: string;
  fallback: string;
  absolute?: boolean;
}

const RelativeTime = ({ date, locale, fallback, absolute = false }: RelativeTimeProps) => {
  const [now, setNow] = useState(() => Date.now());
  const timestamp = date?.getTime();

  useEffect(() => {
    if (absolute || timestamp === undefined || !Number.isFinite(timestamp)) return;
    const interval = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(interval);
  }, [absolute, timestamp]);

  if (!date || timestamp === undefined || !Number.isFinite(timestamp)) {
    return <span>{fallback}</span>;
  }

  const title = formatAbsoluteTime(date, locale) ?? fallback;
  const label = (absolute ? title : formatMemoTime(date, locale, now)) ?? fallback;
  return (
    <time dateTime={date.toISOString()} title={title}>
      {label}
    </time>
  );
};

export default RelativeTime;
