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

export type PayslipPdfSlip = {
  employeeName: string;
  employeeCode: string;
  divisionName: string;
  gradeName: string;
  periodCode: string;
  periodLabel: string;
  additions: PayslipPdfLine[];
  deductions: PayslipPdfLine[];
  totalAdditions: number;
  totalDeductions: number;
  takeHomePay: number;
  totalAdditionsLabel?: string;
  takeHomePayLabel?: string;
};

type PayslipPdfDocumentProps = {
  slips: PayslipPdfSlip[];
};

const styles = StyleSheet.create({
  page: {
    padding: 16,
    fontSize: 8,
    fontFamily: "Helvetica",
    color: "#0f172a",
  },
  header: {
    marginBottom: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: 700,
    marginBottom: 2,
  },
  subtitle: {
    color: "#475569",
    marginBottom: 1,
  },
  employeeMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  cardGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  card: {
    flexGrow: 1,
    border: "1 solid #cbd5e1",
    borderRadius: 6,
    padding: 6,
  },
  cardLabel: {
    color: "#64748b",
    marginBottom: 2,
  },
  cardValue: {
    fontSize: 10,
    fontWeight: 700,
  },
  section: {
    marginBottom: 8,
    border: "1 solid #cbd5e1",
    borderRadius: 6,
    padding: 8,
  },
  sectionTitle: {
    fontSize: 9,
    fontWeight: 700,
    marginBottom: 4,
  },
  line: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2,
    borderBottom: "1 solid #e2e8f0",
  },
  footer: {
    marginTop: 6,
    borderTop: "1 solid #cbd5e1",
    paddingTop: 4,
  },
  footerLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  footerStrong: {
    fontSize: 10,
    fontWeight: 700,
  },
});

function formatCurrency(amount: number) {
  return `Rp ${amount.toLocaleString("id-ID", { maximumFractionDigits: 2 })}`;
}

function PayslipPdfPage(props: PayslipPdfSlip) {
  return (
    <Page size="A6" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>Slip Gaji</Text>
        <Text style={styles.subtitle}>{props.periodCode} - {props.periodLabel}</Text>
      </View>

      <View style={styles.employeeMetaRow}>
        <Text>Nama: {props.employeeName}</Text>
        <Text>UID: {props.employeeCode}</Text>
      </View>
      <View style={styles.employeeMetaRow}>
        <Text>Divisi: {props.divisionName}</Text>
        <Text>Grade: {props.gradeName}</Text>
      </View>

      <View style={styles.cardGrid}>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>{props.totalAdditionsLabel ?? "Total Penambahan"}</Text>
          <Text style={styles.cardValue}>{formatCurrency(props.totalAdditions)}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Total Potongan</Text>
          <Text style={styles.cardValue}>{formatCurrency(props.totalDeductions)}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Rincian THP - Penambahan</Text>
        {props.additions.map((line) => (
          <View key={line.label} style={styles.line}>
            <Text>{line.label}</Text>
            <Text>{formatCurrency(line.amount)}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Rincian THP - Potongan</Text>
        {props.deductions.length === 0 ? (
          <Text>Tidak ada potongan pada periode ini.</Text>
        ) : props.deductions.map((line) => (
          <View key={line.label} style={styles.line}>
            <Text>{line.label}</Text>
            <Text>{formatCurrency(line.amount)}</Text>
          </View>
        ))}
      </View>

      <View style={styles.footer}>
        <View style={styles.footerLine}>
          <Text style={styles.footerStrong}>{props.takeHomePayLabel ?? "Take Home Pay"}</Text>
          <Text style={styles.footerStrong}>{formatCurrency(props.takeHomePay)}</Text>
        </View>
      </View>
    </Page>
  );
}

export function PayslipPdfDocument({ slips }: PayslipPdfDocumentProps) {
  return (
    <Document>
      {slips.map((slip) => (
        <PayslipPdfPage
          key={`${slip.periodCode}-${slip.employeeCode}`}
          {...slip}
        />
      ))}
    </Document>
  );
}
