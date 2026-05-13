import { renderToBuffer } from "@react-pdf/renderer";
import { PayslipPdfDocument, type PayslipPdfSlip } from "./PayslipPdfDocument";

type RenderPayslipPdfInput = PayslipPdfSlip;

export async function renderPayslipPdf(input: RenderPayslipPdfInput) {
  return renderToBuffer(<PayslipPdfDocument slips={[input]} />);
}

export async function renderPayslipBatchPdf(slips: PayslipPdfSlip[]) {
  return renderToBuffer(<PayslipPdfDocument slips={slips} />);
}
