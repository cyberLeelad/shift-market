import { $ } from "bun";
import { MongoClient } from "mongodb";
import { ProvisioningConcept } from "../src/concepts/Provisioning.ts";

// Wipe the local database first, so the seed never adds duplicates.
await $`bun run db:reset`;

const url = process.env.MONGODB_URL;
if (!url) throw new Error("MONGODB_URL is not set");

const client = new MongoClient(url);
await client.connect();
const provisioning = new ProvisioningConcept(client.db());

const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"] as const;
const FIRST = "2026-10-12"; // a Monday
const LAST = "2026-12-31";

// 2-hour blocks starting at 08:00, 10:00, ..., 22:00. The last block ends at 24:00, which is midnight.
for (const day of DAYS) {
  for (let hour = 8; hour <= 22; hour += 2) {
    const start = `${String(hour).padStart(2, "0")}:00`;
    const end = hour === 22 ? "24:00" : `${String(hour + 2).padStart(2, "0")}:00`;
    await provisioning.makeWeeklyShift({ start, end, day, first: FIRST, last: LAST });
  }
}

console.log(`Seeded ${DAYS.length * 8} weekly shift blocks from ${FIRST} to ${LAST}.`);
await client.close();