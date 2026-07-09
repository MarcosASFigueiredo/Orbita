// Lagash VTT — seed the `invited_users` allowlist (the magic-link auth gate).
//
// Only emails listed here may sign in. On a first successful login, the Auth.js
// `createUser` event reads the matching row to provision the user's role and —
// for players — their character ownership (by character_slug).
//
// EDIT the INVITES array below with your table's real emails, then run:
//   pnpm db:seed:invites     (needs a live DATABASE_URL in .env)
//
// Idempotent: re-running upserts (updates role / slug / name for an email that
// already exists), so it's safe to tweak and re-run.
import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { invitedUsers } from "./schema";
import { configureNeonForLocalDev } from "./neon-local";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");
// No-op against real Neon; redirects to the local docker proxy in dev.
configureNeonForLocalDev(connectionString);
const db = drizzle(neon(connectionString), { schema: { invitedUsers } });

// ⬇️ EDIT THESE. A player's `characterSlug` must match a seeded character:
//    halda, vessa, sehra, orren, corvin. The GM has no characterSlug.
const INVITES: Array<typeof invitedUsers.$inferInsert> = [
  {
    email: "marcos.figueiredo.masf@gmail.com",
    role: "gm",
    displayName: "Mestre",
  },
  {
    email: "player1@example.com",
    role: "player",
    characterSlug: "halda",
    displayName: "Halda",
  },
  {
    email: "player2@example.com",
    role: "player",
    characterSlug: "vessa",
    displayName: "Vessa",
  },
  {
    email: "player3@example.com",
    role: "player",
    characterSlug: "sehra",
    displayName: "Sehra",
  },
  {
    email: "player4@example.com",
    role: "player",
    characterSlug: "orren",
    displayName: "Orren",
  },
  {
    email: "player5@example.com",
    role: "player",
    characterSlug: "corvin",
    displayName: "Corvin",
  },
];

async function seedInvites() {
  for (const inv of INVITES) {
    const row = { ...inv, email: inv.email.toLowerCase() };
    await db
      .insert(invitedUsers)
      .values(row)
      .onConflictDoUpdate({
        target: invitedUsers.email,
        set: {
          role: row.role ?? "player",
          characterSlug: row.characterSlug ?? null,
          displayName: row.displayName ?? "",
        },
      });
    console.log(
      `  ✓ ${row.email} (${row.role}${row.characterSlug ? ` → ${row.characterSlug}` : ""})`,
    );
  }
  console.log(`Seeded ${INVITES.length} invite(s).`);
}

seedInvites().catch((err) => {
  console.error(err);
  process.exit(1);
});
