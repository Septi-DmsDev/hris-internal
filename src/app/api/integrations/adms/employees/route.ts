import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { employees } from "@/lib/db/schema/employee";

function getBearerToken(request: NextRequest) {
  const authHeader = request.headers.get("authorization") ?? "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) return null;
  return authHeader.slice(7).trim();
}

export async function GET(request: NextRequest) {
  const expectedToken = process.env.ADMS_INGEST_TOKEN?.trim();
  if (!expectedToken) {
    return NextResponse.json({ error: "Server ADMS belum dikonfigurasi." }, { status: 500 });
  }

  const token = getBearerToken(request);
  if (!token || token !== expectedToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select({
      employeeCode: employees.employeeCode,
      fullName: employees.fullName,
    })
    .from(employees)
    .where(eq(employees.isActive, true));

  return NextResponse.json({ employees: rows });
}
