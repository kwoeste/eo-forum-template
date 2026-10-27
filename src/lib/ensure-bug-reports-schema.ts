import { sql } from "drizzle-orm";
import { db } from "@/db";

let ensured = false;

export async function ensureBugReportsSchema(): Promise<void> {
  if (ensured) {
    return;
  }

  await db.execute(
    sql`ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS fixed_at timestamp`
  );
  ensured = true;
}
