import ExcelJS from "exceljs";
import { formatToIST } from "./date";

export interface ApplicationRow {
  id: string;
  fullName: string;
  srn: string;
  branch: string;
  year: string;
  email: string;
  phone: string;
  domains: string; // JSON array string
  domainAnswers: string | null; // JSON object string
  experience: string | null;
  portfolioUrl: string | null;
  whyJoin: string | null;
  techCyberExperience: string | null;
  techLanguage: string | null;
  techWhyDomain: string | null;
  techPriorExperience: string | null;
  techCtfParticipated: string | null;
  techCtfOther: string | null;
  techCtfConfidence: string | null;
  techGithub: string | null;
  techLinkedin: string | null;
  techProject: string | null;
  eventsWhyJoin: string | null;
  eventsPriorExperience: string | null;
  eventsPlanSteps: string | null;
  eventsOrientationIdeas: string | null;
  eventsExcites: string | null;
  marketingWhyDomain: string | null;
  marketingExperience: string | null;
  marketingConfidence: string | null;
  mediaWhyDomain: string | null;
  mediaTools: string | null;
  mediaPortfolio: string | null;
  designWhyDomain: string | null;
  designTools: string | null;
  designConfidence: string | null;
  feedback: string | null;
  createdAt: string;
}

const BASE_COLUMNS: Array<{ key: keyof ApplicationRow; header: string }> = [
  { key: "fullName", header: "Full Name" },
  { key: "srn", header: "SRN" },
  { key: "branch", header: "Branch" },
  { key: "year", header: "Year" },
  { key: "email", header: "Email" },
  { key: "phone", header: "Phone" },
  { key: "domains", header: "Domains" },
  { key: "experience", header: "Experience" },
  { key: "portfolioUrl", header: "Portfolio URL" },
  { key: "whyJoin", header: "Why Join" },
  { key: "techCyberExperience", header: "Tech: Cyber Experience" },
  { key: "techLanguage", header: "Tech: Language" },
  { key: "techWhyDomain", header: "Tech: Why Domain" },
  { key: "techPriorExperience", header: "Tech: Prior Experience" },
  { key: "techCtfParticipated", header: "Tech: CTF Participated" },
  { key: "techCtfOther", header: "Tech: CTF Other" },
  { key: "techCtfConfidence", header: "Tech: CTF Confidence" },
  { key: "techGithub", header: "Tech: GitHub" },
  { key: "techLinkedin", header: "Tech: LinkedIn" },
  { key: "techProject", header: "Tech: Project" },
  { key: "eventsWhyJoin", header: "Events: Why Join" },
  { key: "eventsPriorExperience", header: "Events: Prior Experience" },
  { key: "eventsPlanSteps", header: "Events: Plan Steps" },
  { key: "eventsOrientationIdeas", header: "Events: Orientation Ideas" },
  { key: "eventsExcites", header: "Events: Excites" },
  { key: "marketingWhyDomain", header: "Marketing: Why Domain" },
  { key: "marketingExperience", header: "Marketing: Experience" },
  { key: "marketingConfidence", header: "Marketing: Confidence" },
  { key: "mediaWhyDomain", header: "Media: Why Domain" },
  { key: "mediaTools", header: "Media: Tools" },
  { key: "mediaPortfolio", header: "Media: Portfolio" },
  { key: "designWhyDomain", header: "Design: Why Domain" },
  { key: "designTools", header: "Design: Tools" },
  { key: "designConfidence", header: "Design: Confidence" },
  { key: "feedback", header: "Feedback" },
  { key: "createdAt", header: "Submitted At (IST)" },
];

function parseDomains(raw: string): string {
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.join(", ") : raw;
  } catch {
    return raw;
  }
}

function flattenDomainAnswers(
  raw: string | null
): Record<string, string> {
  if (!raw) return {};
  try {
    const obj = JSON.parse(raw);
    if (obj && typeof obj === "object") {
      const flat: Record<string, string> = {};
      for (const [k, v] of Object.entries(obj)) {
        flat[`Answer: ${k}`] =
          typeof v === "string" ? v : JSON.stringify(v);
      }
      return flat;
    }
  } catch {
    // fall through
  }
  return {};
}

/**
 * Builds an ExcelJS workbook from application rows, including every column
 * (feedback + a flattened domainAnswers) and formatting createdAt to IST.
 */
export function buildApplicationsWorkbook(
  applications: ApplicationRow[]
): ExcelJS.Workbook {
  // Collect the union of all dynamic domainAnswers keys across rows so
  // every row gets a consistent set of columns.
  const dynamicKeys = new Set<string>();
  const flattenedPerRow = applications.map((app) => {
    const flat = flattenDomainAnswers(app.domainAnswers);
    Object.keys(flat).forEach((k) => dynamicKeys.add(k));
    return flat;
  });

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Applications");

  const dynamicKeysArray = Array.from(dynamicKeys);
  worksheet.columns = [
    ...BASE_COLUMNS.map((col) => ({ header: col.header, key: col.header })),
    ...dynamicKeysArray.map((key) => ({ header: key, key })),
  ];

  applications.forEach((app, idx) => {
    const row: Record<string, string> = {};
    for (const col of BASE_COLUMNS) {
      const value = app[col.key];
      if (col.key === "domains") {
        row[col.header] = parseDomains(value as string);
      } else if (col.key === "createdAt") {
        row[col.header] = formatToIST(value as string);
      } else {
        row[col.header] = (value as string) ?? "";
      }
    }
    for (const key of dynamicKeysArray) {
      row[key] = flattenedPerRow[idx][key] ?? "";
    }
    worksheet.addRow(row);
  });

  return workbook;
}
