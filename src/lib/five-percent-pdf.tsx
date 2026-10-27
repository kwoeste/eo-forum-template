import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 10,
    position: "relative",
  },
  draftWatermark: {
    position: "absolute",
    top: "40%",
    left: "25%",
    fontSize: 72,
    color: "#f59e0b",
    opacity: 0.15,
    transform: "rotate(-30deg)",
    fontWeight: "bold",
    letterSpacing: 8,
  },
  draftBadge: {
    backgroundColor: "#fef3c7",
    color: "#92400e",
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 9,
    fontWeight: "bold",
    borderRadius: 4,
    marginRight: 8,
  },
  header: {
    marginBottom: 16,
  },
  category: {
    fontSize: 8,
    color: "#9ca3af",
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0891b2",
  },
  meta: {
    fontSize: 8,
    color: "#6b7280",
  },
  table: {
    marginTop: 16,
    border: "1pt solid #d1d5db",
  },
  tableRow: {
    flexDirection: "row",
  },
  headerRow: {
    flexDirection: "row",
    borderBottom: "1pt solid #d1d5db",
  },
  labelCell: {
    width: 70,
    padding: 8,
    justifyContent: "center",
  },
  headerCell: {
    flex: 1,
    padding: 8,
    borderLeft: "1pt solid #d1d5db",
  },
  headerTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#374151",
    marginBottom: 2,
  },
  headerHint: {
    fontSize: 7,
    color: "#6b7280",
    lineHeight: 1.3,
  },
  dataRow: {
    flexDirection: "row",
    borderBottom: "1pt solid #d1d5db",
    minHeight: 70,
  },
  rowLabel: {
    width: 70,
    padding: 8,
    justifyContent: "center",
    fontSize: 8,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  workLabel: {
    color: "#4b5563",
  },
  familyLabel: {
    color: "#ea580c",
  },
  personalLabel: {
    color: "#059669",
  },
  dataCell: {
    flex: 1,
    padding: 8,
    borderLeft: "1pt solid #d1d5db",
  },
  cellText: {
    fontSize: 9,
    color: "#1f2937",
    lineHeight: 1.4,
  },
  promptSection: {
    marginTop: 20,
  },
  promptLabel: {
    fontSize: 9,
    color: "#374151",
    marginBottom: 4,
  },
  promptLabelBold: {
    fontWeight: "bold",
  },
  promptAnswer: {
    fontSize: 9,
    color: "#1f2937",
    lineHeight: 1.4,
    borderBottom: "1pt solid #d1d5db",
    paddingBottom: 8,
    marginBottom: 16,
    minHeight: 40,
  },
  footer: {
    position: "absolute",
    bottom: 40,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logo: {
    flexDirection: "row",
  },
  logoE: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1e3a5f",
  },
  logoO: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#f59e0b",
  },
  privacy: {
    fontSize: 7,
    color: "#9ca3af",
    fontStyle: "italic",
  },
});

interface FivePercentData {
  memberName: string;
  completedAt: string;
  workFeelings: string;
  workCauses: string;
  workSignificance: string;
  familyFeelings: string;
  familyCauses: string;
  familySignificance: string;
  personalFeelings: string;
  personalCauses: string;
  personalSignificance: string;
  future30to60: string;
  whyTopics: string;
  whatHowTopics: string;
}

interface FivePercentPDFProps {
  data: FivePercentData;
  isDraft?: boolean;
}

export function FivePercentPDF({ data, isDraft = false }: FivePercentPDFProps) {
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {isDraft && (
          <Text style={styles.draftWatermark}>DRAFT</Text>
        )}
        <View style={styles.header}>
          <Text style={styles.category}>Forum Training | Worksheets</Text>
          <Text style={styles.title}>5% REFLECTION WORKSHEET</Text>
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
            {isDraft && (
              <Text style={styles.draftBadge}>DRAFT</Text>
            )}
            <Text style={styles.meta}>
              {data.memberName} • {isDraft ? "Last saved" : "Completed"} {data.completedAt}
            </Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.headerRow}>
            <View style={styles.labelCell} />
            <View style={styles.headerCell}>
              <Text style={styles.headerTitle}>How I Am Feeling?</Text>
              <Text style={styles.headerHint}>
                Strongest feelings this past month. Use single words (joy, sad
                etc.). 3-5 emotions each box.
              </Text>
            </View>
            <View style={styles.headerCell}>
              <Text style={styles.headerTitle}>What Caused These Feelings?</Text>
              <Text style={styles.headerHint}>
                Only one or two sentences to provide brief context.
              </Text>
            </View>
            <View style={styles.headerCell}>
              <Text style={styles.headerTitle}>Significance (5%)</Text>
              <Text style={styles.headerHint}>
                Why was this personally significant to me? Dig deep! What do I
                realize about myself?
              </Text>
            </View>
          </View>

          <View style={styles.dataRow}>
            <View style={[styles.rowLabel, styles.workLabel]}>
              <Text>WORK</Text>
            </View>
            <View style={styles.dataCell}>
              <Text style={styles.cellText}>{data.workFeelings || ""}</Text>
            </View>
            <View style={styles.dataCell}>
              <Text style={styles.cellText}>{data.workCauses || ""}</Text>
            </View>
            <View style={styles.dataCell}>
              <Text style={styles.cellText}>{data.workSignificance || ""}</Text>
            </View>
          </View>

          <View style={styles.dataRow}>
            <View style={[styles.rowLabel, styles.familyLabel]}>
              <Text>FAMILY</Text>
            </View>
            <View style={styles.dataCell}>
              <Text style={styles.cellText}>{data.familyFeelings || ""}</Text>
            </View>
            <View style={styles.dataCell}>
              <Text style={styles.cellText}>{data.familyCauses || ""}</Text>
            </View>
            <View style={styles.dataCell}>
              <Text style={styles.cellText}>{data.familySignificance || ""}</Text>
            </View>
          </View>

          <View style={[styles.dataRow, { borderBottom: "none" }]}>
            <View style={[styles.rowLabel, styles.personalLabel]}>
              <Text>PERSONAL</Text>
            </View>
            <View style={styles.dataCell}>
              <Text style={styles.cellText}>{data.personalFeelings || ""}</Text>
            </View>
            <View style={styles.dataCell}>
              <Text style={styles.cellText}>{data.personalCauses || ""}</Text>
            </View>
            <View style={styles.dataCell}>
              <Text style={styles.cellText}>
                {data.personalSignificance || ""}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.promptSection}>
          <Text style={styles.promptLabel}>
            What does the future look like in the next{" "}
            <Text style={styles.promptLabelBold}>30-60 days</Text>?
          </Text>
          <Text style={styles.promptAnswer}>{data.future30to60 || ""}</Text>

          <Text style={styles.promptLabel}>
            The important/undecided emotionally complex topics I would like to
            add to my Deep Dive parking lot. (why topics)
          </Text>
          <Text style={styles.promptAnswer}>{data.whyTopics || ""}</Text>

          <Text style={styles.promptLabel}>
            Topics I would like to explore to learn or make better decisions.
            (what and how topics)
          </Text>
          <Text style={styles.promptAnswer}>{data.whatHowTopics || ""}</Text>
        </View>

        <View style={styles.footer}>
          <View style={styles.logo}>
            <Text style={styles.logoE}>E</Text>
            <Text style={styles.logoO}>O</Text>
          </View>
          <Text style={styles.privacy}>Private to author only</Text>
        </View>
      </Page>
    </Document>
  );
}
