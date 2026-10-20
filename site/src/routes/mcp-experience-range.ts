import gistemp from '../data/gistemp-monthly.json';

/** The annual global temperature anomaly, °C against the 1951–1980 mean, for every complete year. */
export const yearRows = gistemp.years.flatMap((row) => (row.annual === null ? [] : [{ Year: row.year, Anomaly: row.annual }]));

/** Every reported month, as `YYYY-MM`. */
export const monthRows = gistemp.years.flatMap((row) =>
  row.months.flatMap((anomaly, at) => (anomaly === null ? [] : [{ Month: `${row.year}-${String(at + 1).padStart(2, '0')}`, Anomaly: anomaly }])),
);

const signed = (value: number) => `${value > 0 ? '+' : value < 0 ? '−' : ''}${Math.abs(value).toFixed(2)}`;

/** What the agent can say about a brushed stretch of years: where it starts and ends, the change, and its warmest year. */
export function describeRange(start: string, end: string): { from: number; to: number; fromValue: string; toValue: string; change: string; warmest: number; warmestValue: string } | undefined {
  const inside = yearRows.filter((row) => row.Year >= Number(start.slice(0, 4)) && row.Year <= Number(end.slice(0, 4)));
  if (inside.length < 2) return undefined;
  const first = inside[0];
  const last = inside[inside.length - 1];
  const warmest = inside.reduce((top, row) => (row.Anomaly > top.Anomaly ? row : top));
  return {
    from: first.Year,
    to: last.Year,
    fromValue: signed(first.Anomaly),
    toValue: signed(last.Anomaly),
    change: signed(last.Anomaly - first.Anomaly),
    warmest: warmest.Year,
    warmestValue: signed(warmest.Anomaly),
  };
}
