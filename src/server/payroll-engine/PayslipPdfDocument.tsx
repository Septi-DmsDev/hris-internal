import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

type PayslipPdfLine = {
  label: string;
  amount: number;
};

type PayslipPdfDocumentProps = {
  employeeName: string;
  employeeCode: string;
  divisionName: string;
  positionName: string;
  periodCode: string;
  periodLabel: string;
  payrollStatus: string;
  performancePercent: number;
  additions: PayslipPdfLine[];
  deductions: PayslipPdfLine[];
  totalAdditions: number;
  totalDeductions: number;
  takeHomePay: number;
};

const styles = StyleSheet.create({
  page: {
    padding: 24,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#0f172a",
  },
  header: {
    marginBottom: 18,
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    marginBottom: 4,
  },
  subtitle: {
    color: "#475569",
    marginBottom: 2,
  },
  badgeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  cardGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  card: {
    flexGrow: 1,
    border: "1 solid #cbd5e1",
    borderRadius: 8,
    padding: 10,
  },
  cardLabel: {
    color: "#64748b",
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 14,
    fontWeight: 700,
  },
  section: {
    marginBottom: 16,
    border: "1 solid #cbd5e1",
    borderRadius: 8,
    padding: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 8,
  },
  line: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    borderBottom: "1 solid #e2e8f0",
  },
  footer: {
    marginTop: 12,
    borderTop: "1 solid #cbd5e1",
    paddingTop: 8,
  },
  footerLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  footerStrong: {
    fontSize: 12,
    fontWeight: 700,
  },
});

function formatCurrency(amount: number) {
  return `Rp ${amount.toLocaleString("id-ID", { maximumFractionDigits: 2 })}`;
}

export function PayslipPdfDocument(props: PayslipPdfDocumentProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Slip Gaji</Text>
          <Text style={styles.subtitle}>{props.periodCode} · {props.periodLabel}</Text>
          <Text style={styles.subtitle}>{props.employeeName} · {props.employeeCode}</Text>
          <Text style={styles.subtitle}>{props.divisionName} · {props.positionName}</Text>
        </View>

        <View style={styles.badgeRow}>
          <Text>Status Payroll: {props.payrollStatus}</Text>
          <Text>Performa: {props.performancePercent.toFixed(2)}%</Text>
        </View>

        <View style={styles.cardGrid}>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Total Addition</Text>
            <Text style={styles.cardValue}>{formatCurrency(props.totalAdditions)}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Total Deduction</Text>
            <Text style={styles.cardValue}>{formatCurrency(props.totalDeductions)}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Take Home Pay</Text>
            <Text style={styles.cardValue}>{formatCurrency(props.takeHomePay)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Addition</Text>
          {props.additions.map((line) => (
            <View key={line.label} style={styles.line}>
              <Text>{line.label}</Text>
              <Text>{formatCurrency(line.amount)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Deduction</Text>
          {props.deductions.length === 0 ? (
            <Text>Tidak ada deduction pada periode ini.</Text>
          ) : props.deductions.map((line) => (
            <View key={line.label} style={styles.line}>
              <Text>{line.label}</Text>
              <Text>{formatCurrency(line.amount)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.footer}>
          <View style={styles.footerLine}>
            <Text>Total Addition</Text>
            <Text>{formatCurrency(props.totalAdditions)}</Text>
          </View>
          <View style={styles.footerLine}>
            <Text>Total Deduction</Text>
            <Text>{formatCurrency(props.totalDeductions)}</Text>
          </View>
          <View style={styles.footerLine}>
            <Text style={styles.footerStrong}>Take Home Pay</Text>
            <Text style={styles.footerStrong}>{formatCurrency(props.takeHomePay)}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
