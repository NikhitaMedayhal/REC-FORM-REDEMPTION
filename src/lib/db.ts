import { createClient, type Client } from "@libsql/client";

let _client: Client | null = null;
let _initialised = false;

function createDbClient(): Client {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) {
    throw new Error("TURSO_DATABASE_URL is not set");
  }

  return createClient({
    url,
    authToken,
  });
}

/**
 * Creates all tables + indexes in a single network round trip via batch().
 * Safe to call multiple times — everything is IF NOT EXISTS.
 */
async function ensureSchema(client: Client): Promise<void> {
  await client.batch(
    [
      `CREATE TABLE IF NOT EXISTS users (
        srn        TEXT PRIMARY KEY,
        prn        TEXT,
        name       TEXT NOT NULL DEFAULT '',
        role       TEXT NOT NULL DEFAULT 'member',
        program    TEXT,
        branch     TEXT,
        section    TEXT,
        semester   TEXT,
        email      TEXT,
        phone      TEXT,
        campus     TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        last_login TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      `CREATE TABLE IF NOT EXISTS applications (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        user_srn TEXT NOT NULL REFERENCES users(srn),
        fullName TEXT NOT NULL,
        srn TEXT NOT NULL,
        branch TEXT NOT NULL,
        year TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NOT NULL,
        domains TEXT NOT NULL,
        domainAnswers TEXT,
        experience TEXT,
        portfolioUrl TEXT,
        whyJoin TEXT,
        techCyberExperience TEXT,
        techLanguage TEXT,
        techWhyDomain TEXT,
        techPriorExperience TEXT,
        techCtfParticipated TEXT,
        techCtfOther TEXT,
        techCtfConfidence TEXT,
        techGithub TEXT,
        techLinkedin TEXT,
        techProject TEXT,
        eventsWhyJoin TEXT,
        eventsPriorExperience TEXT,
        eventsPlanSteps TEXT,
        eventsOrientationIdeas TEXT,
        eventsExcites TEXT,
        marketingWhyDomain TEXT,
        marketingExperience TEXT,
        marketingConfidence TEXT,
        mediaWhyDomain TEXT,
        mediaTools TEXT,
        mediaPortfolio TEXT,
        designWhyDomain TEXT,
        designTools TEXT,
        designConfidence TEXT,
        feedback TEXT,
        sourceIp TEXT,
        createdAt TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(user_srn)
      )`,
      `CREATE TABLE IF NOT EXISTS audit_logs (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        srn        TEXT NOT NULL,
        ip         TEXT,
        user_type  TEXT,
        action     TEXT NOT NULL,
        detail     TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      `CREATE INDEX IF NOT EXISTS idx_applications_createdAt ON applications(createdAt DESC)`,
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_applications_email ON applications(email)`,
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_applications_srn ON applications(srn)`,
      `CREATE INDEX IF NOT EXISTS idx_audit_logs_createdAt ON audit_logs(created_at DESC)`,
    ],
    "write"
  );

  // Safe migrations for columns added after the initial schema shipped.
  // Each is wrapped individually so one failure (column already exists)
  // never blocks the others.
  const migrations: string[] = [
    `ALTER TABLE applications ADD COLUMN domainAnswers TEXT`,
    `ALTER TABLE applications ADD COLUMN feedback TEXT`,
    `ALTER TABLE applications ADD COLUMN portfolioUrl TEXT`,
    `ALTER TABLE applications ADD COLUMN user_srn TEXT`,
    `ALTER TABLE users ADD COLUMN campus TEXT`,
    // Marketing / Media / Design domain fields — previously these were
    // dumped together into the generic domainAnswers JSON blob instead
    // of getting their own columns like tech/events already had.
    `ALTER TABLE applications ADD COLUMN marketingWhyDomain TEXT`,
    `ALTER TABLE applications ADD COLUMN marketingExperience TEXT`,
    `ALTER TABLE applications ADD COLUMN marketingConfidence TEXT`,
    `ALTER TABLE applications ADD COLUMN mediaWhyDomain TEXT`,
    `ALTER TABLE applications ADD COLUMN mediaTools TEXT`,
    `ALTER TABLE applications ADD COLUMN mediaPortfolio TEXT`,
    `ALTER TABLE applications ADD COLUMN designWhyDomain TEXT`,
    `ALTER TABLE applications ADD COLUMN designTools TEXT`,
    `ALTER TABLE applications ADD COLUMN designConfidence TEXT`,
  ];

  for (const sql of migrations) {
    try {
      await client.execute(sql);
    } catch {
      // Column already exists (or table doesn't need it yet) — ignore.
    }
  }

  // Enforce one-application-per-user now that user_srn is guaranteed to
  // exist. A unique index does the same job as an inline UNIQUE column
  // constraint would have, but can be added retroactively — SQLite has
  // no ALTER TABLE syntax for adding a UNIQUE constraint to an existing
  // column.
  try {
    await client.execute(
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_applications_user_srn ON applications(user_srn)`
    );
  } catch {
    // Ignore — e.g. if pre-existing NULL/duplicate rows momentarily
    // violate it; new inserts are still validated by the app layer.
  }
}

/**
 * Lazy singleton accessor. First call creates the client and runs
 * ensureSchema() once per cold start; subsequent calls reuse both.
 */
export async function db(): Promise<Client> {
  if (!_client) {
    _client = createDbClient();
  }

  if (!_initialised) {
    _initialised = true;
    try {
      await ensureSchema(_client);
    } catch (err) {
      // Reset so the next call retries schema init instead of silently
      // running against an un-migrated database.
      _initialised = false;
      throw err;
    }
  }

  return _client;
}