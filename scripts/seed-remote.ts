const BASE = "https://shift-market.mit-sdg.dev/api";

const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"] as const;
const FIRST = "2026-10-12"; // a Monday
const LAST = "2026-12-31";

async function makeWeekly(body: Record<string, string>) {
  const response = await fetch(`${BASE}/shifts/makeWeekly`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await response.json();
  if ("error" in result) throw new Error(`${body.day} ${body.start}: ${result.error}`);
  return result;
}

for (const day of DAYS) {
  for (let hour = 8; hour <= 22; hour += 2) {
    const start = `${String(hour).padStart(2, "0")}:00`;
    const end = hour === 22 ? "24:00" : `${String(hour + 2).padStart(2, "0")}:00`;
    await makeWeekly({ start, end, day, first: FIRST, last: LAST });
  }
}

console.log(`Seeded ${DAYS.length * 8} weekly shift blocks from ${FIRST} to ${LAST}.`);