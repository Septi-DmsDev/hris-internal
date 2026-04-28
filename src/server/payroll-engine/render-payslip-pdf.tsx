import { renderToBuffer } from "@react-pdf/renderer";
import { PayslipPdfDocument } from "./PayslipPdfDocument";

type RenderPayslipPdfInput = {
  employeeName: string;
  employeeCode: string;
  divisionName: string;
  positionName: string;
  periodCode: string;
  periodLabel: string;
  payrollStatus: string;
  performancePercent: number;
  additions: Array<{ label: string; amount: number }>;
  deductions: Array<{ label: string; amount: number }>;
  totalAdditions: number;
  totalDeductions: number;
  takeHomePay: number;
};

export async function renderPayslipPdf(input: RenderPayslipPdfInput) {
  return renderToBuffer(<PayslipPdfDocument {...input} />);
}
