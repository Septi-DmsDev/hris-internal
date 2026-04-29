"use server";

import { db } from "@/lib/db";
import {
  employeeDivisionHistories,
  employeeGradeHistories,
  employees,
  employeePositionHistories,
  employeeScheduleAssignments,
  employeeStatusHistories,
  employeeSupervisorHistories,
  workSchedules,
} from "@/lib/db/schema/employee";
import { branches, divisions, grades, positions } from "@/lib/db/schema/master";
import {
  checkRole,
  getCurrentUserRole,
  getCurrentUserRoleRow,
  requireAuth,
} from "@/lib/auth/session";
import { employeeSchema, type EmployeeInput } from "@/lib/validations/employee";
import { aliasedTable, asc, desc, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { UserRole } from "@/types";

const EMPLOYEE_READ_ROLES: UserRole[] = ["SUPER_ADMIN", "HRD", "KABAG", "SPV", "FINANCE"];
const DIV_SCOPED_ROLES: UserRole[] = ["SPV", "KABAG"];

type EmployeeDetailRow = {
  id: string;
  employeeCode: string;
  fullName: string;
  nickname: string | null;
  photoUrl: string | null;
  phoneNumber: string | null;
  address: string | null;
  startDate: Date;
  branchId: string;
  branchName: string | null;
  divisionId: string;
  divisionName: string | null;
  positionId: string;
  positionName: string | null;
  jobdesk: string | null;
  gradeId: string;
  gradeName: string | null;
  employeeGroup: "MANAGERIAL" | "TEAMWORK";
  employmentStatus:
    | "TRAINING"
    | "REGULER"
    | "DIALIHKAN_TRAINING"
    | "TIDAK_LOLOS"
    | "NONAKTIF"
    | "RESIGN";
  payrollStatus: "TRAINING" | "REGULER" | "FINAL_PAYROLL" | "NONAKTIF";
  supervisorEmployeeId: string | null;
  supervisorName: string | null;
  trainingGraduationDate: Date | null;
  isActive: boolean;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type EmployeeListRow = {
  id: string;
  employeeCode: string;
  fullName: string;
  nickname: string | null;
  startDate: Date;
  branchId: string;
  branchName: string | null;
  divisionId: string;
  divisionName: string | null;
  positionId: string;
  positionName: string | null;
  gradeId: string;
  gradeName: string | null;
  employeeGroup: "MANAGERIAL" | "TEAMWORK";
  employmentStatus:
    | "TRAINING"
    | "REGULER"
    | "DIALIHKAN_TRAINING"
    | "TIDAK_LOLOS"
    | "NONAKTIF"
    | "RESIGN";
  payrollStatus: "TRAINING" | "REGULER" | "FINAL_PAYROLL" | "NONAKTIF";
  supervisorEmployeeId: string | null;
  supervisorName: string | null;
  isActive: boolean;
};

function ensureEmployeeReadRole(role: UserRole) {
  if (!EMPLOYEE_READ_ROLES.includes(role)) {
    redirect("/dashboard");
  }
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function oneDayBefore(date: Date) {
  const previousDay = startOfDay(date);
  previousDay.setDate(previousDay.getDate() - 1);
  return previousDay;
}

function toEmployeeRecord(input: EmployeeInput) {
  return {
    employeeCode: input.employeeCode,
    fullName: input.fullName,
    nickname: input.nickname,
    photoUrl: input.photoUrl,
    phoneNumber: input.phoneNumber,
    address: input.address,
    startDate: input.startDate,
    branchId: input.branchId,
    divisionId: input.divisionId,
    positionId: input.positionId,
    jobdesk: input.jobdesk,
    gradeId: input.gradeId,
    employeeGroup: input.employeeGroup,
    employmentStatus: input.employmentStatus,
    payrollStatus: input.payrollStatus,
    supervisorEmployeeId: input.supervisorEmployeeId,
    trainingGraduationDate: input.trainingGraduationDate,
    isActive: input.isActive,
    notes: input.notes,
  };
}

export async function getEmployees() {
  await requireAuth();
  const roleRow = await getCurrentUserRoleRow();
  const role = roleRow.role as UserRole;
  ensureEmployeeReadRole(role);

  const supervisor = aliasedTable(employees, "supervisor");
  const baseQuery = db
    .select({
      id: employees.id,
      employeeCode: employees.employeeCode,
      fullName: employees.fullName,
      nickname: employees.nickname,
      startDate: employees.startDate,
      branchId: employees.branchId,
      branchName: branches.name,
      divisionId: employees.divisionId,
      divisionName: divisions.name,
      positionId: employees.positionId,
      positionName: positions.name,
      gradeId: employees.gradeId,
      gradeName: grades.name,
      employeeGroup: employees.employeeGroup,
      employmentStatus: employees.employmentStatus,
      payrollStatus: employees.payrollStatus,
      supervisorEmployeeId: employees.supervisorEmployeeId,
      supervisorName: supervisor.fullName,
      isActive: employees.isActive,
    })
    .from(employees)
    .leftJoin(branches, eq(employees.branchId, branches.id))
    .leftJoin(divisions, eq(employees.divisionId, divisions.id))
    .leftJoin(positions, eq(employees.positionId, positions.id))
    .leftJoin(grades, eq(employees.gradeId, grades.id))
    .leftJoin(supervisor, eq(employees.supervisorEmployeeId, supervisor.id));

  if (DIV_SCOPED_ROLES.includes(role)) {
    if (roleRow.divisionIds.length === 0) return [];
    return (await baseQuery
      .where(inArray(employees.divisionId, roleRow.divisionIds))
      .orderBy(asc(employees.fullName))) as EmployeeListRow[];
  }

  return (await baseQuery.orderBy(asc(employees.fullName))) as EmployeeListRow[];
}

export async function getEmployeeFormOptions() {
  await requireAuth();
  const role = await getCurrentUserRole();
  ensureEmployeeReadRole(role);

  const [branchRows, divisionRows, positionRows, gradeRows, scheduleRows, supervisorRows] =
    await Promise.all([
      db
        .select({ id: branches.id, name: branches.name })
        .from(branches)
        .where(eq(branches.isActive, true))
        .orderBy(asc(branches.name)),
      db
        .select({ id: divisions.id, name: divisions.name })
        .from(divisions)
        .where(eq(divisions.isActive, true))
        .orderBy(asc(divisions.name)),
      db
        .select({
          id: positions.id,
          name: positions.name,
          employeeGroup: positions.employeeGroup,
        })
        .from(positions)
        .where(eq(positions.isActive, true))
        .orderBy(asc(positions.name)),
      db
        .select({ id: grades.id, name: grades.name, code: grades.code })
        .from(grades)
        .where(eq(grades.isActive, true))
        .orderBy(asc(grades.name)),
      db
        .select({ id: workSchedules.id, name: workSchedules.name, code: workSchedules.code })
        .from(workSchedules)
        .where(eq(workSchedules.isActive, true))
        .orderBy(asc(workSchedules.name)),
      db
        .select({ id: employees.id, fullName: employees.fullName })
        .from(employees)
        .where(eq(employees.isActive, true))
        .orderBy(asc(employees.fullName)),
    ]);

  return {
    branches: branchRows,
    divisions: divisionRows,
    positions: positionRows,
    grades: gradeRows,
    schedules: scheduleRows,
    supervisors: supervisorRows,
    canManage: role === "HRD" || role === "SUPER_ADMIN",
  };
}

export async function getEmployeeById(id: string) {
  await requireAuth();
  const roleRow = await getCurrentUserRoleRow();
  const role = roleRow.role as UserRole;
  ensureEmployeeReadRole(role);

  const supervisor = aliasedTable(employees, "supervisor");
  const employeeDetailQuery = db
    .select({
      id: employees.id,
      employeeCode: employees.employeeCode,
      fullName: employees.fullName,
      nickname: employees.nickname,
      photoUrl: employees.photoUrl,
      phoneNumber: employees.phoneNumber,
      address: employees.address,
      startDate: employees.startDate,
      branchId: employees.branchId,
      branchName: branches.name,
      divisionId: employees.divisionId,
      divisionName: divisions.name,
      positionId: employees.positionId,
      positionName: positions.name,
      jobdesk: employees.jobdesk,
      gradeId: employees.gradeId,
      gradeName: grades.name,
      employeeGroup: employees.employeeGroup,
      employmentStatus: employees.employmentStatus,
      payrollStatus: employees.payrollStatus,
      supervisorEmployeeId: employees.supervisorEmployeeId,
      supervisorName: supervisor.fullName,
      trainingGraduationDate: employees.trainingGraduationDate,
      isActive: employees.isActive,
      notes: employees.notes,
      createdAt: employees.createdAt,
      updatedAt: employees.updatedAt,
    })
    .from(employees)
    .leftJoin(branches, eq(employees.branchId, branches.id))
    .leftJoin(divisions, eq(employees.divisionId, divisions.id))
    .leftJoin(positions, eq(employees.positionId, positions.id))
    .leftJoin(grades, eq(employees.gradeId, grades.id))
    .leftJoin(supervisor, eq(employees.supervisorEmployeeId, supervisor.id));

  if (DIV_SCOPED_ROLES.includes(role) && roleRow.divisionIds.length === 0) {
    return null;
  }

  const employeeRows = (await employeeDetailQuery
    .where(eq(employees.id, id))
    .orderBy(asc(employees.fullName))) as EmployeeDetailRow[];
  const employeeRow = employeeRows[0];

  if (!employeeRow) return null;
  if (DIV_SCOPED_ROLES.includes(role) && !roleRow.divisionIds.includes(employeeRow.divisionId ?? "")) {
    return null;
  }

  const previousDivision = aliasedTable(divisions, "previous_division");
  const nextDivision = aliasedTable(divisions, "new_division");
  const previousPosition = aliasedTable(positions, "previous_position");
  const nextPosition = aliasedTable(positions, "new_position");
  const previousGrade = aliasedTable(grades, "previous_grade");
  const nextGrade = aliasedTable(grades, "new_grade");
  const previousSupervisor = aliasedTable(employees, "previous_supervisor");
  const nextSupervisor = aliasedTable(employees, "new_supervisor");

  const [currentScheduleAssignment, divisionHistoryRows, positionHistoryRows, gradeHistoryRows, supervisorHistoryRows, statusHistoryRows] =
    await Promise.all([
      db
        .select({
          id: employeeScheduleAssignments.id,
          scheduleId: employeeScheduleAssignments.scheduleId,
          scheduleName: workSchedules.name,
          scheduleCode: workSchedules.code,
          effectiveStartDate: employeeScheduleAssignments.effectiveStartDate,
          effectiveEndDate: employeeScheduleAssignments.effectiveEndDate,
        })
        .from(employeeScheduleAssignments)
        .leftJoin(workSchedules, eq(employeeScheduleAssignments.scheduleId, workSchedules.id))
        .where(eq(employeeScheduleAssignments.employeeId, id))
        .orderBy(desc(employeeScheduleAssignments.effectiveStartDate)),
      db
        .select({
          id: employeeDivisionHistories.id,
          effectiveDate: employeeDivisionHistories.effectiveDate,
          notes: employeeDivisionHistories.notes,
          previousDivisionName: previousDivision.name,
          newDivisionName: nextDivision.name,
        })
        .from(employeeDivisionHistories)
        .leftJoin(previousDivision, eq(employeeDivisionHistories.previousDivisionId, previousDivision.id))
        .leftJoin(nextDivision, eq(employeeDivisionHistories.newDivisionId, nextDivision.id))
        .where(eq(employeeDivisionHistories.employeeId, id))
        .orderBy(desc(employeeDivisionHistories.effectiveDate)),
      db
        .select({
          id: employeePositionHistories.id,
          effectiveDate: employeePositionHistories.effectiveDate,
          notes: employeePositionHistories.notes,
          previousPositionName: previousPosition.name,
          newPositionName: nextPosition.name,
        })
        .from(employeePositionHistories)
        .leftJoin(previousPosition, eq(employeePositionHistories.previousPositionId, previousPosition.id))
        .leftJoin(nextPosition, eq(employeePositionHistories.newPositionId, nextPosition.id))
        .where(eq(employeePositionHistories.employeeId, id))
        .orderBy(desc(employeePositionHistories.effectiveDate)),
      db
        .select({
          id: employeeGradeHistories.id,
          effectiveDate: employeeGradeHistories.effectiveDate,
          notes: employeeGradeHistories.notes,
          previousGradeName: previousGrade.name,
          newGradeName: nextGrade.name,
        })
        .from(employeeGradeHistories)
        .leftJoin(previousGrade, eq(employeeGradeHistories.previousGradeId, previousGrade.id))
        .leftJoin(nextGrade, eq(employeeGradeHistories.newGradeId, nextGrade.id))
        .where(eq(employeeGradeHistories.employeeId, id))
        .orderBy(desc(employeeGradeHistories.effectiveDate)),
      db
        .select({
          id: employeeSupervisorHistories.id,
          effectiveDate: employeeSupervisorHistories.effectiveDate,
          notes: employeeSupervisorHistories.notes,
          previousSupervisorName: previousSupervisor.fullName,
          newSupervisorName: nextSupervisor.fullName,
        })
        .from(employeeSupervisorHistories)
        .leftJoin(
          previousSupervisor,
          eq(employeeSupervisorHistories.previousSupervisorEmployeeId, previousSupervisor.id)
        )
        .leftJoin(nextSupervisor, eq(employeeSupervisorHistories.newSupervisorEmployeeId, nextSupervisor.id))
        .where(eq(employeeSupervisorHistories.employeeId, id))
        .orderBy(desc(employeeSupervisorHistories.effectiveDate)),
      db
        .select({
          id: employeeStatusHistories.id,
          effectiveDate: employeeStatusHistories.effectiveDate,
          notes: employeeStatusHistories.notes,
          previousEmploymentStatus: employeeStatusHistories.previousEmploymentStatus,
          newEmploymentStatus: employeeStatusHistories.newEmploymentStatus,
          previousPayrollStatus: employeeStatusHistories.previousPayrollStatus,
          newPayrollStatus: employeeStatusHistories.newPayrollStatus,
        })
        .from(employeeStatusHistories)
        .where(eq(employeeStatusHistories.employeeId, id))
        .orderBy(desc(employeeStatusHistories.effectiveDate)),
    ]);

  return {
    employee: employeeRow,
    currentScheduleAssignment: currentScheduleAssignment[0] ?? null,
    scheduleHistory: currentScheduleAssignment,
    histories: {
      divisions: divisionHistoryRows,
      positions: positionHistoryRows,
      grades: gradeHistoryRows,
      supervisors: supervisorHistoryRows,
      statuses: statusHistoryRows,
    },
  };
}

export async function createEmployee(input: unknown) {
  const authError = await checkRole(["HRD", "SUPER_ADMIN"]);
  if (authError) return authError;

  const parsed = employeeSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Input karyawan tidak valid." };
  }

  const effectiveDate = parsed.data.effectiveDate ?? parsed.data.startDate;
  const employeeValues = toEmployeeRecord(parsed.data);

  try {
    await db.transaction(async (tx) => {
      const [employee] = await tx
        .insert(employees)
        .values(employeeValues)
        .returning({ id: employees.id });

      await tx.insert(employeeDivisionHistories).values({
        employeeId: employee.id,
        previousDivisionId: null,
        newDivisionId: parsed.data.divisionId,
        effectiveDate,
        notes: "Data awal karyawan",
      });

      await tx.insert(employeePositionHistories).values({
        employeeId: employee.id,
        previousPositionId: null,
        newPositionId: parsed.data.positionId,
        effectiveDate,
        notes: "Data awal karyawan",
      });

      await tx.insert(employeeGradeHistories).values({
        employeeId: employee.id,
        previousGradeId: null,
        newGradeId: parsed.data.gradeId,
        effectiveDate,
        notes: "Data awal karyawan",
      });

      await tx.insert(employeeSupervisorHistories).values({
        employeeId: employee.id,
        previousSupervisorEmployeeId: null,
        newSupervisorEmployeeId: parsed.data.supervisorEmployeeId ?? null,
        effectiveDate,
        notes: "Data awal karyawan",
      });

      await tx.insert(employeeStatusHistories).values({
        employeeId: employee.id,
        previousEmploymentStatus: null,
        newEmploymentStatus: parsed.data.employmentStatus,
        previousPayrollStatus: null,
        newPayrollStatus: parsed.data.payrollStatus,
        effectiveDate,
        notes: "Status awal karyawan",
      });

      if (parsed.data.scheduleId) {
        await tx.insert(employeeScheduleAssignments).values({
          employeeId: employee.id,
          scheduleId: parsed.data.scheduleId,
          effectiveStartDate: effectiveDate,
          notes: "Jadwal awal karyawan",
        });
      }
    });
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === "23505") return { error: "ID karyawan sudah digunakan, pakai kode lain." };
    if (code === "23503") return { error: "Referensi karyawan tidak valid atau sudah tidak aktif." };
    throw error;
  }

  revalidatePath("/employees");
  return { success: true };
}

export async function updateEmployee(id: string, input: unknown) {
  const authError = await checkRole(["HRD", "SUPER_ADMIN"]);
  if (authError) return authError;

  const parsed = employeeSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Input karyawan tidak valid." };
  }

  try {
    await db.transaction(async (tx) => {
      const [existingEmployee] = await tx.select().from(employees).where(eq(employees.id, id)).limit(1);
      if (!existingEmployee) {
        throw new Error("EMPLOYEE_NOT_FOUND");
      }

      const effectiveDate = parsed.data.effectiveDate ?? startOfDay(new Date());
      await tx
        .update(employees)
        .set({
          ...toEmployeeRecord(parsed.data),
          updatedAt: new Date(),
        })
        .where(eq(employees.id, id));

      if (existingEmployee.divisionId !== parsed.data.divisionId) {
        await tx.insert(employeeDivisionHistories).values({
          employeeId: id,
          previousDivisionId: existingEmployee.divisionId,
          newDivisionId: parsed.data.divisionId,
          effectiveDate,
          notes: "Perubahan divisi",
        });
      }

      if (existingEmployee.positionId !== parsed.data.positionId) {
        await tx.insert(employeePositionHistories).values({
          employeeId: id,
          previousPositionId: existingEmployee.positionId,
          newPositionId: parsed.data.positionId,
          effectiveDate,
          notes: "Perubahan jabatan",
        });
      }

      if (existingEmployee.gradeId !== parsed.data.gradeId) {
        await tx.insert(employeeGradeHistories).values({
          employeeId: id,
          previousGradeId: existingEmployee.gradeId,
          newGradeId: parsed.data.gradeId,
          effectiveDate,
          notes: "Perubahan grade",
        });
      }

      if (existingEmployee.supervisorEmployeeId !== (parsed.data.supervisorEmployeeId ?? null)) {
        await tx.insert(employeeSupervisorHistories).values({
          employeeId: id,
          previousSupervisorEmployeeId: existingEmployee.supervisorEmployeeId,
          newSupervisorEmployeeId: parsed.data.supervisorEmployeeId ?? null,
          effectiveDate,
          notes: "Perubahan supervisor",
        });
      }

      if (
        existingEmployee.employmentStatus !== parsed.data.employmentStatus ||
        existingEmployee.payrollStatus !== parsed.data.payrollStatus
      ) {
        await tx.insert(employeeStatusHistories).values({
          employeeId: id,
          previousEmploymentStatus: existingEmployee.employmentStatus,
          newEmploymentStatus: parsed.data.employmentStatus,
          previousPayrollStatus: existingEmployee.payrollStatus,
          newPayrollStatus: parsed.data.payrollStatus,
          effectiveDate,
          notes: "Perubahan status karyawan",
        });
      }

      const [currentAssignment] = await tx
        .select({
          id: employeeScheduleAssignments.id,
          scheduleId: employeeScheduleAssignments.scheduleId,
          effectiveStartDate: employeeScheduleAssignments.effectiveStartDate,
          effectiveEndDate: employeeScheduleAssignments.effectiveEndDate,
        })
        .from(employeeScheduleAssignments)
        .where(eq(employeeScheduleAssignments.employeeId, id))
        .orderBy(desc(employeeScheduleAssignments.effectiveStartDate));

      const previousScheduleId = currentAssignment?.effectiveEndDate ? null : currentAssignment?.scheduleId ?? null;
      const nextScheduleId = parsed.data.scheduleId ?? null;

      if (previousScheduleId !== nextScheduleId) {
        if (currentAssignment && !currentAssignment.effectiveEndDate) {
          await tx
            .update(employeeScheduleAssignments)
            .set({ effectiveEndDate: oneDayBefore(effectiveDate) })
            .where(eq(employeeScheduleAssignments.id, currentAssignment.id));
        }

        if (nextScheduleId) {
          await tx.insert(employeeScheduleAssignments).values({
            employeeId: id,
            scheduleId: nextScheduleId,
            effectiveStartDate: effectiveDate,
            notes: "Perubahan jadwal kerja",
          });
        }
      }
    });
  } catch (error) {
    if (error instanceof Error && error.message === "EMPLOYEE_NOT_FOUND") {
      return { error: "Data karyawan tidak ditemukan." };
    }

    const code = (error as { code?: string }).code;
    if (code === "23505") return { error: "ID karyawan sudah digunakan, pakai kode lain." };
    if (code === "23503") return { error: "Referensi karyawan tidak valid atau sudah tidak aktif." };
    throw error;
  }

  revalidatePath("/employees");
  revalidatePath(`/employees/${id}`);
  return { success: true };
}

export async function deleteEmployee(id: string) {
  const authError = await checkRole(["HRD", "SUPER_ADMIN"]);
  if (authError) return authError;

  await db.delete(employees).where(eq(employees.id, id));

  revalidatePath("/employees");
  revalidatePath(`/employees/${id}`);
  return { success: true };
}
