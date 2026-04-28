import { describe, expect, it } from "vitest";
import { countTargetDaysForPeriod } from "./count-target-days-for-period";

describe("countTargetDaysForPeriod", () => {
  it("menghitung hari target dari satu assignment aktif", () => {
    const result = countTargetDaysForPeriod({
      periodStartDate: "2026-05-26",
      periodEndDate: "2026-06-01",
      assignments: [
        {
          effectiveStartDate: "2026-05-01",
          effectiveEndDate: null,
          workingDays: [1, 2, 3, 4, 5],
        },
      ],
    });

    expect(result).toBe(5);
  });

  it("menghitung hari target ketika ada pergantian assignment di tengah periode", () => {
    const result = countTargetDaysForPeriod({
      periodStartDate: "2026-05-26",
      periodEndDate: "2026-06-01",
      assignments: [
        {
          effectiveStartDate: "2026-05-01",
          effectiveEndDate: "2026-05-28",
          workingDays: [1, 2, 3, 4, 5],
        },
        {
          effectiveStartDate: "2026-05-29",
          effectiveEndDate: null,
          workingDays: [0, 1, 2, 3, 4],
        },
      ],
    });

    expect(result).toBe(5);
  });
});
