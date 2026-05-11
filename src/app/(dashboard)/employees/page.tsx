import { format } from "date-fns";
import {
  getEmployeeFormOptions,
  getEmployees,
} from "@/server/actions/employees";
import EmployeesTable, {
  type EmployeeFormOptions,
  type EmployeeRow,
} from "./EmployeesTable";

export default async function EmployeesPage() {
  const [employees, options] = await Promise.all([
    getEmployees(),
    getEmployeeFormOptions(),
  ]);

  const employeeRecords = employees as Array<{
    id: string;
    employeeCode: string;
    nik: string | null;
    fullName: string;
    branchName: string | null;
    phoneNumber: string | null;
    divisionName: string | null;
    positionName: string | null;
    employeeGroup: import("@/lib/employee-groups").EmployeeGroup;
    employmentStatus:
      | "TRAINING"
      | "REGULER"
      | "DIALIHKAN_TRAINING"
      | "TIDAK_LOLOS"
      | "NONAKTIF"
      | "RESIGN";
    payrollStatus: "TRAINING" | "REGULER" | "FINAL_PAYROLL" | "NONAKTIF";
    supervisorName: string | null;
    isActive: boolean;
    startDate: Date;
  }>;

  const rows: EmployeeRow[] = employeeRecords.map((employee) => ({
    id: employee.id,
    employeeCode: employee.employeeCode,
    nik: employee.nik,
    fullName: employee.fullName,
    branchName: employee.branchName ?? "-",
    phoneNumber: employee.phoneNumber ?? "-",
    divisionName: employee.divisionName ?? "-",
    positionName: employee.positionName ?? "-",
    employeeGroup: employee.employeeGroup,
    employmentStatus: employee.employmentStatus,
    payrollStatus: employee.payrollStatus,
    supervisorName: employee.supervisorName ?? "-",
    isActive: employee.isActive,
    startDate: format(employee.startDate, "yyyy-MM-dd"),
  }));

  const formOptions: EmployeeFormOptions = {
    branches: options.branches,
    divisions: options.divisions,
    positions: options.positions,
    grades: options.grades,
    schedules: options.schedules,
    supervisors: options.supervisors,
    canManage: options.canManage,
    isSuperAdmin: options.isSuperAdmin,
  };

  return (
    <div className="space-y-4">
      <EmployeesTable data={rows} options={formOptions} />
    </div>
  );
}
