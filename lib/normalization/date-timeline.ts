import { WorkExperienceItem } from "../types";

export interface DateRange {
  startYear: number;
  startMonth: number; // 1 - 12
  endYear: number;
  endMonth: number; // 1 - 12
  isCurrent: boolean;
  rawDurationMonths: number;
}

const MONTH_MAP: Record<string, number> = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

/**
 * Parses date strings such as "Jan 2021", "2020-03", "05/2019", "2018", "Present", "Current"
 */
export function parseDateString(dateStr: string, isEnd = false): { year: number; month: number; isCurrent: boolean } {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  if (!dateStr || /present|current|now|till\s*date/i.test(dateStr)) {
    return { year: currentYear, month: currentMonth, isCurrent: true };
  }

  const clean = dateStr.trim().toLowerCase();

  // Pattern: "Jan 2021" or "January 2021"
  const monthYearMatch = clean.match(/([a-z]+)[,\s/-]+(\d{4})/);
  if (monthYearMatch) {
    const mStr = monthYearMatch[1];
    const yStr = parseInt(monthYearMatch[2], 10);
    const m = MONTH_MAP[mStr] || (isEnd ? 12 : 1);
    return { year: yStr, month: m, isCurrent: false };
  }

  // Pattern: "2021-05" or "2021/05"
  const yyyyMmMatch = clean.match(/(\d{4})[/-](\d{1,2})/);
  if (yyyyMmMatch) {
    const y = parseInt(yyyyMmMatch[1], 10);
    const m = parseInt(yyyyMmMatch[2], 10);
    return { year: y, month: Math.min(12, Math.max(1, m)), isCurrent: false };
  }

  // Pattern: "05/2021"
  const mmYyyyMatch = clean.match(/(\d{1,2})[/-](\d{4})/);
  if (mmYyyyMatch) {
    const m = parseInt(mmYyyyMatch[1], 10);
    const y = parseInt(mmYyyyMatch[2], 10);
    return { year: y, month: Math.min(12, Math.max(1, m)), isCurrent: false };
  }

  // Pattern: Just Year "2021"
  const yearOnlyMatch = clean.match(/(\d{4})/);
  if (yearOnlyMatch) {
    const y = parseInt(yearOnlyMatch[1], 10);
    return { year: y, month: isEnd ? 12 : 1, isCurrent: false };
  }

  return { year: currentYear - (isEnd ? 0 : 2), month: isEnd ? 12 : 1, isCurrent: false };
}

/**
 * Calculates duration in months between two dates
 */
export function calculateMonths(
  startDateStr: string,
  endDateStr: string
): { durationMonths: number; isCurrent: boolean } {
  const start = parseDateString(startDateStr, false);
  const end = parseDateString(endDateStr, true);

  let months = (end.year - start.year) * 12 + (end.month - start.month) + 1;
  if (months < 1) months = 1;
  return { durationMonths: months, isCurrent: end.isCurrent };
}

/**
 * Detects timeline overlaps between multiple work history items
 */
export function detectEmploymentOverlaps(
  history: WorkExperienceItem[]
): Array<{
  roleA: WorkExperienceItem;
  roleB: WorkExperienceItem;
  overlapMonths: number;
}> {
  const overlaps: Array<{
    roleA: WorkExperienceItem;
    roleB: WorkExperienceItem;
    overlapMonths: number;
  }> = [];

  if (history.length < 2) return overlaps;

  const parsedItems = history.map((item) => {
    const start = parseDateString(item.startDate, false);
    const end = parseDateString(item.endDate, true);
    const startTotalMonths = start.year * 12 + start.month;
    const endTotalMonths = end.year * 12 + end.month;
    return {
      item,
      startTotalMonths,
      endTotalMonths,
    };
  });

  for (let i = 0; i < parsedItems.length; i++) {
    for (let j = i + 1; j < parsedItems.length; j++) {
      const a = parsedItems[i];
      const b = parsedItems[j];

      // Overlap occurs if start of one is before end of other and vice versa
      const overlapStart = Math.max(a.startTotalMonths, b.startTotalMonths);
      const overlapEnd = Math.min(a.endTotalMonths, b.endTotalMonths);

      if (overlapEnd > overlapStart) {
        const overlapMonths = overlapEnd - overlapStart;
        // If overlap is greater than 3 months (accounting for grace transitions)
        if (overlapMonths >= 3) {
          overlaps.push({
            roleA: a.item,
            roleB: b.item,
            overlapMonths,
          });
        }
      }
    }
  }

  return overlaps;
}

/**
 * Computes non-overlapping total experience in years
 */
export function calculateTotalExperienceYears(history: WorkExperienceItem[]): number {
  if (!history || history.length === 0) return 0;

  // Flatten active months into intervals
  const intervals: Array<[number, number]> = [];

  for (const item of history) {
    const start = parseDateString(item.startDate, false);
    const end = parseDateString(item.endDate, true);
    const startMonths = start.year * 12 + start.month;
    const endMonths = Math.max(startMonths, end.year * 12 + end.month);
    intervals.push([startMonths, endMonths]);
  }

  // Sort intervals by start time
  intervals.sort((a, b) => a[0] - b[0]);

  // Merge overlapping intervals
  const merged: Array<[number, number]> = [];
  for (const [start, end] of intervals) {
    if (merged.length === 0) {
      merged.push([start, end]);
    } else {
      const prev = merged[merged.length - 1];
      if (start <= prev[1]) {
        prev[1] = Math.max(prev[1], end);
      } else {
        merged.push([start, end]);
      }
    }
  }

  const totalMonths = merged.reduce((sum, [start, end]) => sum + (end - start + 1), 0);
  const years = parseFloat((totalMonths / 12).toFixed(1));
  return years;
}
