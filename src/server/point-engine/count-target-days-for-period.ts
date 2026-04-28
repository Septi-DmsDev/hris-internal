type AssignmentWindow = {
  effectiveStartDate: string | Date;
  effectiveEndDate: string | Date | null;
  workingDays: number[];
};

type CountTargetDaysForPeriodInput = {
  periodStartDate: string | Date;
  periodEndDate: string | Date;
  assignments: AssignmentWindow[];
};

function toDate(value: string | Date) {
  if (value instanceof Date) return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  const parsed = new Date(value);
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

export function countTargetDaysForPeriod({
  periodStartDate,
  periodEndDate,
  assignments,
}: CountTargetDaysForPeriodInput) {
  const start = toDate(periodStartDate);
  const end = toDate(periodEndDate);
  let count = 0;

  for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    const activeAssignment = assignments.find((assignment) => {
      const assignmentStart = toDate(assignment.effectiveStartDate);
      const assignmentEnd = assignment.effectiveEndDate ? toDate(assignment.effectiveEndDate) : null;
      return cursor >= assignmentStart && (!assignmentEnd || cursor <= assignmentEnd);
    });

    if (!activeAssignment) continue;
    const dayOfWeek = cursor.getDay();
    if (activeAssignment.workingDays.includes(dayOfWeek)) {
      count += 1;
    }
  }

  return count;
}
