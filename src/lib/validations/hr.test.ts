import { describe, expect, it } from "vitest";
import { createTicketSchema } from "./hr";

describe("createTicketSchema", () => {
  it("allows self-service ticket input without employee picker value", () => {
    const result = createTicketSchema.safeParse({
      employeeId: "",
      ticketType: "IZIN",
      startDate: "2026-05-04",
      endDate: "2026-05-04",
      reason: "Izin keluarga",
      attachmentUrl: "",
    });

    expect(result.success).toBe(true);
  });

  it("requires attachment for sick leave longer than one day", () => {
    const result = createTicketSchema.safeParse({
      employeeId: "",
      ticketType: "SAKIT",
      startDate: "2026-05-04",
      endDate: "2026-05-05",
      reason: "Sakit demam",
      attachmentUrl: "",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["attachmentUrl"]);
    }
  });

  it("accepts sick leave longer than one day with attachment", () => {
    const result = createTicketSchema.safeParse({
      employeeId: "",
      ticketType: "SAKIT",
      startDate: "2026-05-04",
      endDate: "2026-05-05",
      reason: "Sakit demam",
      attachmentUrl: "https://example.com/surat-dokter.pdf",
    });

    expect(result.success).toBe(true);
  });
});
