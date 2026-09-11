import { google } from "googleapis";

function cleanPrivateKey(raw: string): string {
  let key = raw.trim();
  // Strip surrounding quotes if the env var was pasted with them.
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1);
  }
  // .env files can't hold real newlines in a single-line value, so the
  // key is usually stored with literal "\n" sequences that need to be
  // turned back into real line breaks.
  return key.replace(/\\n/g, "\n");
}

function sanitizeTabName(name: string): string {
  return name.replace(/[\[\]\*\/\\\?:]/g, "").slice(0, 100) || "Sheet1";
}

function getSheetsClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_PRIVATE_KEY;
  const sheetId = process.env.GOOGLE_SHEET_ID;

  if (!email || !rawKey || !sheetId) {
    return null;
  }

  const auth = new google.auth.JWT({
    email,
    key: cleanPrivateKey(rawKey),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return { sheets: google.sheets({ version: "v4", auth }), sheetId };
}

async function ensureTabExists(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string,
  tabName: string,
  headerRow: string[]
): Promise<void> {
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const existing = meta.data.sheets?.some(
    (s) => s.properties?.title === tabName
  );

  if (!existing) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title: tabName } } }],
      },
    });
  }

  // Always keep row 1 in sync with the code's header row — not just on
  // first creation. Without this, a tab created before new columns were
  // added (e.g. the domain-specific fields) keeps its stale header
  // forever, and appended data silently drifts out of alignment with
  // the column titles above it.
  const currentHeader = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${tabName}'!A1:${columnLetter(headerRow.length - 1)}1`,
  });
  const existingHeaderRow = currentHeader.data.values?.[0] ?? [];
  const headerMatches =
    existingHeaderRow.length === headerRow.length &&
    existingHeaderRow.every((v, i) => v === headerRow[i]);

  if (!headerMatches) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'${tabName}'!A1`,
      valueInputOption: "RAW",
      requestBody: { values: [headerRow] },
    });
  }
}

/**
 * Appends (or upserts by SRN) a row of form data into the given tab of
 * the configured Google Sheet. Never throws — logs and returns instead,
 * so a Sheets outage never breaks the form submission itself.
 */
export async function appendFormSubmissionToSheet(
  formTitle: string,
  headerRow: string[],
  dataRow: (string | number | null)[],
  identifierSrn?: string
): Promise<void> {
  const client = getSheetsClient();
  if (!client) {
    console.warn(
      "[googleSheets] Missing GOOGLE_SHEET_ID / GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_PRIVATE_KEY — skipping sync"
    );
    return;
  }

  const { sheets, sheetId } = client;
  const tabName = sanitizeTabName(formTitle);

  try {
    await ensureTabExists(sheets, sheetId, tabName, headerRow);

    if (identifierSrn) {
      const srnColIndex = headerRow.findIndex((h) =>
        h.toLowerCase().includes("srn")
      );

      if (srnColIndex !== -1) {
        const existing = await sheets.spreadsheets.values.get({
          spreadsheetId: sheetId,
          range: `'${tabName}'!A:${columnLetter(headerRow.length - 1)}`,
        });

        const rows = existing.data.values ?? [];
        // rows[0] is the header row.
        const rowIndex = rows.findIndex(
          (row, idx) => idx > 0 && row[srnColIndex] === identifierSrn
        );

        if (rowIndex > 0) {
          const sheetRowNumber = rowIndex + 1; // 1-indexed, header is row 1
          await sheets.spreadsheets.values.update({
            spreadsheetId: sheetId,
            range: `'${tabName}'!A${sheetRowNumber}:${columnLetter(
              headerRow.length - 1
            )}${sheetRowNumber}`,
            valueInputOption: "RAW",
            requestBody: { values: [dataRow] },
          });
          return;
        }
      }
    }

    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: `'${tabName}'!A:A`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [dataRow] },
    });
  } catch (err) {
    console.error("[googleSheets] sync failed:", err);
  }
}

function columnLetter(zeroIndexedCol: number): string {
  let n = zeroIndexedCol + 1;
  let letters = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    letters = String.fromCharCode(65 + rem) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters;
}
