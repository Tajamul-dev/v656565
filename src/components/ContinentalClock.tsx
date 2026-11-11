import React, { useState, useEffect } from 'react';

interface ZoneConfig {
  city: string;
  flag: string;
  tz: string;
  code: string;
  primary: boolean;
}

const ZONES: ZoneConfig[] = [
  { city: 'New York', flag: '🇺🇸', tz: 'America/New_York', code: 'EST', primary: true },
  { city: 'Mumbai',   flag: '🇮🇳', tz: 'Asia/Kolkata',     code: 'IST', primary: true },
  { city: 'Toronto',  flag: '🇨🇦', tz: 'America/Toronto',  code: 'EST', primary: false },
  { city: 'London',   flag: '🇬🇧', tz: 'Europe/London',    code: 'GMT', primary: false },
];

const BIZ_START = 9;
const BIZ_END = 18;

function getZoneParts(tz: string, now: Date) {
  try {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    const parts = fmt.formatToParts(now);
    const map: Record<string, string> = {};
    parts.forEach(p => { map[p.type] = p.value; });
    const hour24 = parseInt(map.hour || '0', 10) % 24;
    const minute = map.minute || '00';
    const second = map.second || '00';
    let h12 = hour24 % 12;
    if (h12 === 0) h12 = 12;
    return {
      hour24,
      minute,
      second,
      h12: String(h12).padStart(2, '0'),
      ampm: hour24 >= 12 ? 'PM' : 'AM',
      isBusiness: hour24 >= BIZ_START && hour24 < BIZ_END,
    };
  } catch {
    return { hour24: 12, minute: '00', second: '00', h12: '12', ampm: 'PM', isBusiness: true };
  }
}

export const ContinentalClock: React.FC = () => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const ny = getZoneParts('America/New_York', now);
  const inZone = getZoneParts('Asia/Kolkata', now);

  const nyOpen = ny.isBusiness;
  const inOpen = inZone.isBusiness;

  let overlapStatus = 'Both offices closed — off-hours';
  let overlapBadgeClass = 'text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-400';
  if (nyOpen && inOpen) {
    overlapStatus = 'NY & Mumbai both open (Active overlap)';
    overlapBadgeClass = 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800';
  } else if (nyOpen) {
    overlapStatus = 'New York open · Mumbai closed';
    overlapBadgeClass = 'text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800';
  } else if (inOpen) {
    overlapStatus = 'Mumbai open · New York closed';
    overlapBadgeClass = 'text-sky-700 bg-sky-50 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800';
  }

  return (
    <div className="flex flex-col lg:flex-row items-stretch gap-2.5 p-2 bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl text-xs">
      {/* Overlap Summary */}
      <div className="flex flex-col justify-center px-2.5 py-1 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 shrink-0">
        <div className="flex items-center gap-1.5 font-bold tracking-wider text-[10px] uppercase text-slate-500 dark:text-slate-400">
          <span>🌍</span> CONTINENTAL CLOCK
        </div>
        <div className={`mt-1 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-semibold border ${overlapBadgeClass}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
          <span>{overlapStatus}</span>
        </div>
      </div>

      {/* Clocks */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-1">
        {ZONES.map(z => {
          const info = getZoneParts(z.tz, now);
          return (
            <div
              key={z.tz}
              className={`flex flex-col justify-between px-2.5 py-1.5 rounded-lg border transition-colors ${
                info.isBusiness
                  ? 'bg-emerald-50/70 border-emerald-300 dark:bg-emerald-950/30 dark:border-emerald-800'
                  : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300">
                <span className="flex items-center gap-1">
                  <span>{z.flag}</span>
                  <span>{z.city}</span>
                </span>
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    info.isBusiness ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                  }`}
                  title={info.isBusiness ? 'Office Open (9 AM - 6 PM)' : 'Office Closed'}
                />
              </div>
              <div className="text-sm font-black font-mono tabular-nums text-slate-900 dark:text-slate-100 tracking-tight mt-0.5">
                {info.h12}:{info.minute}
                <span className="text-[10px] font-normal text-slate-500 ml-0.5">:{info.second} {info.ampm}</span>
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium flex justify-between mt-0.5">
                <span>{z.code}</span>
                <span className={info.isBusiness ? 'text-emerald-700 dark:text-emerald-400 font-semibold' : ''}>
                  {info.isBusiness ? 'Open' : 'Off-hours'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
