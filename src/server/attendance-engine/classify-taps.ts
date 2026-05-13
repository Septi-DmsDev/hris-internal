export type TapClassification = {
  checkInTime?: string;
  checkOutTime?: string;
  breakOutTime?: string;
  breakInTime?: string;
};

export type TapScheduleWindow = {
  isWorkingDay: boolean;
  startTime: string | null;
  endTime: string | null;
  breakStart: string | null;
  breakEnd: string | null;
  checkOutStart: string | null;
};

function parseMin(t: string | null | undefined): number | null {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

/**
 * Classifies a sorted list of raw tap times (HH:MM) into attendance slots
 * using the employee's schedule windows.
 *
 * Zone logic (when break is defined):
 *   Before break midpoint:
 *     tap < breakStart  → check_in zone
 *     tap >= breakStart → break_out zone
 *   After break midpoint:
 *     tap < checkOutZoneStart → break_in zone
 *     tap >= checkOutZoneStart → check_out zone
 *
 * Zone logic (no break):
 *   tap < checkOutZoneStart → check_in zone
 *   tap >= checkOutZoneStart → check_out zone
 *
 * Per zone selection:
 *   check_in, break_out, break_in → FIRST tap in zone
 *   check_out → LAST tap in zone
 */
export function classifyTaps(
  sortedTimes: string[],
  schedule: TapScheduleWindow | null
): TapClassification {
  if (sortedTimes.length === 0) return {};

  // No schedule or non-working day: first = check_in, last = check_out
  if (!schedule || !schedule.isWorkingDay || !schedule.startTime || !schedule.endTime) {
    const result: TapClassification = { checkInTime: sortedTimes[0] };
    if (sortedTimes.length > 1) {
      result.checkOutTime = sortedTimes[sortedTimes.length - 1];
    }
    return result;
  }

  const startMin = parseMin(schedule.startTime)!;
  const endMin = parseMin(schedule.endTime)!;
  const breakSMin = parseMin(schedule.breakStart);
  const breakEMin = parseMin(schedule.breakEnd);
  const checkOutSMin = parseMin(schedule.checkOutStart);

  const hasBreak = breakSMin !== null && breakEMin !== null;

  // Boundary where we switch from check_in/break_out side → break_in/check_out side
  const breakMid = hasBreak ? Math.floor((breakSMin! + breakEMin!) / 2) : null;

  // Earliest minute a checkout tap is considered valid
  let checkOutZoneStart: number;
  if (checkOutSMin !== null) {
    checkOutZoneStart = checkOutSMin;
  } else if (hasBreak) {
    // Default: 30 min after break end, but at least 60 min before end of shift
    checkOutZoneStart = Math.max(breakEMin! + 30, endMin - 60);
  } else {
    // No break, no explicit checkOutStart: midpoint of shift
    checkOutZoneStart = Math.floor((startMin + endMin) / 2);
  }

  const checkInTaps: string[] = [];
  const breakOutTaps: string[] = [];
  const breakInTaps: string[] = [];
  const checkOutTaps: string[] = [];

  for (const time of sortedTimes) {
    const min = parseMin(time);
    if (min === null) continue;

    if (hasBreak && breakMid !== null) {
      if (min < breakMid) {
        if (min >= breakSMin!) {
          breakOutTaps.push(time);
        } else {
          checkInTaps.push(time);
        }
      } else {
        if (min >= checkOutZoneStart) {
          checkOutTaps.push(time);
        } else {
          breakInTaps.push(time);
        }
      }
    } else {
      if (min < checkOutZoneStart) {
        checkInTaps.push(time);
      } else {
        checkOutTaps.push(time);
      }
    }
  }

  const result: TapClassification = {};
  if (checkInTaps.length > 0) result.checkInTime = checkInTaps[0];
  if (breakOutTaps.length > 0) result.breakOutTime = breakOutTaps[0];
  if (breakInTaps.length > 0) result.breakInTime = breakInTaps[0];
  if (checkOutTaps.length > 0) result.checkOutTime = checkOutTaps[checkOutTaps.length - 1];
  return result;
}
