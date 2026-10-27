import { neon } from "@neondatabase/serverless";

// Add your forum members here (or manage them in the app later).
// The first entry should be your site admin (same email as NEXT_PUBLIC_ADMIN_EMAIL).
const ALLOWED_MEMBERS = [
  { email: "admin@example.com", name: "Admin Member", firstName: "Admin", lastName: "Member", role: "Admin", isAdmin: true, profileCompleted: false },
  // { email: "member@example.com", name: "Jane Doe", firstName: "Jane", lastName: "Doe", role: "Moderator", isAdmin: false, profileCompleted: false },
];

const PARKING_LOT_CATEGORIES = [
  { name: "Important Urgent", sortOrder: 1 },
  { name: "Important", sortOrder: 2 },
  { name: "Not Urgent", sortOrder: 3 },
  { name: "Not Important Not Urgent", sortOrder: 4 },
  { name: "Wisdom", sortOrder: 5 },
];

const FINE_SCHEDULE = [
  { name: "Tardy / Early Departure", amount: 100, description: "Arriving late or leaving early without prior approval", sortOrder: 1 },
  { name: "Unexcused Absence", amount: 150, description: "Missing a forum meeting without prior approval", sortOrder: 2 },
  { name: "Phone Use During Meeting", amount: 100, description: "Using phone during forum meeting", sortOrder: 3 },
];

async function seed() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL environment variable is required");
    process.exit(1);
  }

  const sql = neon(databaseUrl);

  console.log("Seeding member allowlist...");
  for (const member of ALLOWED_MEMBERS) {
    await sql`
      INSERT INTO member_allowlist (email, name, invite_sent)
      VALUES (${member.email}, ${member.name}, false)
      ON CONFLICT (email) DO NOTHING
    `;
  }

  console.log("Seeding members...");
  for (const member of ALLOWED_MEMBERS) {
    await sql`
      INSERT INTO members (email, name, first_name, last_name, role, is_admin, profile_completed)
      VALUES (${member.email}, ${member.name}, ${member.firstName}, ${member.lastName}, ${member.role}, ${member.isAdmin}, ${member.profileCompleted})
      ON CONFLICT (email) DO NOTHING
    `;
  }

  console.log("Seeding parking lot categories...");
  for (const category of PARKING_LOT_CATEGORIES) {
    await sql`
      INSERT INTO parking_lot_categories (name, sort_order)
      VALUES (${category.name}, ${category.sortOrder})
      ON CONFLICT DO NOTHING
    `;
  }

  console.log("Seeding fine schedule...");
  for (const fine of FINE_SCHEDULE) {
    await sql`
      INSERT INTO fine_schedule (name, amount, description, sort_order)
      VALUES (${fine.name}, ${fine.amount}, ${fine.description}, ${fine.sortOrder})
      ON CONFLICT DO NOTHING
    `;
  }

  console.log("Seeding goals...");
  // Example: { email: "member@example.com", goalText: "Example goal", horizon: 1, setDate: "2026-07-01", targetDate: "2026-08-01" },
  const seededGoals: Array<{ email: string; goalText: string; horizon: number; setDate: string; targetDate: string }> = [];

  for (const goal of seededGoals) {
    await sql`
      INSERT INTO goals (member_id, goal_text, horizon, set_date, target_date, result)
      SELECT m.id, ${goal.goalText}, ${goal.horizon}, ${goal.setDate}, ${goal.targetDate}, 'open'
      FROM members m
      WHERE lower(m.email) = ${goal.email.toLowerCase()}
        AND NOT EXISTS (
          SELECT 1
          FROM goals g
          WHERE g.member_id = m.id
            AND g.goal_text = ${goal.goalText}
            AND g.set_date = ${goal.setDate}
            AND g.horizon = ${goal.horizon}
        )
    `;
  }

  console.log("Seed complete!");
}

seed().catch(console.error);
