// Named periods for the Tidewell chat's top-clients tool (2026-11-27): "this week", "last quarter" and the like,
// resolved here against the data's "today" (fn_meta's data_as_of, never the real clock) so the dates are exact and
// tested, not worked out by the model; and a short label for any from / to ("Q3 2026", "March 2026", "W45 2026"), for
// the answer's heading. Calendar periods; weeks run Monday to Sunday (ISO). Dates are "YYYY-MM-DD" strings, done in UTC.
// Framework-free.

export const NAMED_PERIODS = [
  "this_week",
  "last_week",
  "this_month",
  "last_month",
  "this_quarter",
  "last_quarter",
  "this_year",
  "last_year",
  "last_4_weeks",
] as const;
export type NamedPeriod = (typeof NAMED_PERIODS)[number];

const DAY = 86_400_000;
const parse = (d: string) => Date.parse(`${d}T00:00:00Z`);
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
const addDays = (d: string, n: number) => iso(parse(d) + n * DAY);
const utc = (y: number, m: number, d: number) => iso(Date.UTC(y, m, d)); // m is 0-based and may overflow
const parts = (d: string) => {
  const t = new Date(parse(d));
  return {
    y: t.getUTCFullYear(),
    m: t.getUTCMonth(),
    dow: (t.getUTCDay() + 6) % 7,
  }; // dow: Monday = 0
};

/** The from / to of a named period, counted from `today`; a period that is still running ends on `today`. */
export function resolvePeriod(
  name: NamedPeriod,
  today: string,
): { from: string; to: string } {
  const { y, m, dow } = parts(today);
  const monday = addDays(today, -dow);
  const q = Math.floor(m / 3) * 3; // first month of today's quarter
  switch (name) {
    case "this_week":
      return { from: monday, to: today };
    case "last_week":
      return { from: addDays(monday, -7), to: addDays(monday, -1) };
    case "this_month":
      return { from: utc(y, m, 1), to: today };
    case "last_month":
      return { from: utc(y, m - 1, 1), to: utc(y, m, 0) };
    case "this_quarter":
      return { from: utc(y, q, 1), to: today };
    case "last_quarter":
      return { from: utc(y, q - 3, 1), to: utc(y, q, 0) };
    case "this_year":
      return { from: utc(y, 0, 1), to: today };
    case "last_year":
      return { from: utc(y - 1, 0, 1), to: utc(y - 1, 11, 31) };
    case "last_4_weeks":
      return { from: addDays(today, -27), to: today };
  }
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** ISO week number and its year (the year that holds the week's Thursday). */
function isoWeek(monday: string): { week: number; year: number } {
  const thursday = addDays(monday, 3);
  const year = parts(thursday).y;
  const week =
    Math.floor((parse(thursday) - parse(utc(year, 0, 1))) / (7 * DAY)) + 1;
  return { week, year };
}

/**
 * A short name for a period when it is a calendar one, else its two dates: "March 2026", "Q3 2026", "2025", "W45 2026",
 * with " to date" when it runs from the start of one to `today` without reaching its end.
 */
export function periodLabel(from: string, to: string, today: string): string {
  const { y, m, dow } = parts(from);
  const first = from.endsWith("-01");
  // [name, last day] of each calendar period that starts on `from`, shortest first
  const candidates: [string, string][] = [
    ...(dow === 0
      ? [
          [
            `W${isoWeek(from).week} ${isoWeek(from).year}`,
            addDays(from, 6),
          ] as [string, string],
        ]
      : []),
    ...(first
      ? [[`${MONTHS[m]} ${y}`, utc(y, m + 1, 0)] as [string, string]]
      : []),
    ...(first && m % 3 === 0
      ? [[`Q${m / 3 + 1} ${y}`, utc(y, m + 3, 0)] as [string, string]]
      : []),
    ...(first && m === 0 ? [[`${y}`, `${y}-12-31`] as [string, string]] : []),
  ];
  for (const [name, end] of candidates) {
    if (to === end) return name;
    if (to === today && from <= to && to < end) return `${name} to date`;
  }
  return from === to ? from : `${from} to ${to}`;
}
