import { createHttpClient } from "@mit-sdg/sync-engine-http/client";
import type { ShiftMarketWireHttp } from "../generated/wire.ts";

const client = createHttpClient<ShiftMarketWireHttp>({ baseUrl: "/api" });

// PROVISIONING ===================================================================

const provisionForm = document.querySelector<HTMLFormElement>("#provision")!; // input "pin"
const provStatus = document.querySelector<HTMLParagraphElement>("#provisionStatus")!;
const weeklyBox = document.querySelector<HTMLInputElement>("#isWeekly")!;
const lastField = document.querySelector<HTMLLabelElement>("#lastField")!;
const dayField = document.querySelector<HTMLLabelElement>("#dayField")!;
const lastInput = provisionForm.elements.namedItem("last") as HTMLInputElement;
const dayInput = provisionForm.elements.namedItem("day") as HTMLSelectElement;

// Shows the weekly-only fields and makes them required only while weekly is checked.
// Hidden required fields would block submission with no visible reason.
function showWeeklyFields() {
  const weekly = weeklyBox.checked;
  lastField.hidden = !weekly;
  dayField.hidden = !weekly;
  lastInput.required = weekly;
  dayInput.required = weekly;
}

weeklyBox.addEventListener("change", showWeeklyFields);
showWeeklyFields();

// What happens when the button in the provision form is pressed.
// The Day type the generated client expects, taken from the endpoint itself.
type WeeklyDay = Parameters<typeof client.shifts.makeWeekly>[0]["day"];

// What happens when the button in the provision form is pressed.
provisionForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(provisionForm);
  const start = String(data.get("start"));
  const end = String(data.get("end"));
  const date = String(data.get("date"));

  // An unchecked box is absent from FormData, so data.has tells us which mode is active.
  const result = data.has("isWeekly")
    ? await client.shifts.makeWeekly({
        start,
        end,
        day: String(data.get("day")) as WeeklyDay,
        first: date,
        last: String(data.get("last")),
      })
    : await client.shifts.makeOne({ start, end, date });

  provStatus.textContent =
    "error" in result ? `Could not create shift: ${result.error}` : "Created shift!";
  await loadCalendar();
});

/* CALENDAR STUFF */
// CALENDAR =======================================================================

const DAY_MS = 24 * 60 * 60 * 1000;
const PX_PER_MINUTE = 1; // 24 hours is 1440px tall
const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const CAL_START = minutes("08:00");

const calendarEl = document.querySelector<HTMLDivElement>("#calendar")!;
const weekLabel = document.querySelector<HTMLSpanElement>("#weekLabel")!;
const prevWeekBtn = document.querySelector<HTMLButtonElement>("#prevWeek")!;
const nextWeekBtn = document.querySelector<HTMLButtonElement>("#nextWeek")!;

type ShiftRow = { shift: string; start: string; end: string; date: string };
let allShifts: ShiftRow[] = [];
let weekStart = mondayOf(new Date());

// Monday of the week containing the given date, as a UTC midnight Date.
function mondayOf(date: Date): Date {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const offset = (d.getUTCDay() + 6) % 7; // Monday = 0, Sunday = 6
  return new Date(d.getTime() - offset * DAY_MS);
}

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// "HH:MM" to minutes since midnight. Ends past 24:00 stay above 1440.
function minutes(hhmm: string): number {
  return Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
}

// Shows a stored time on a 24-hour clock, so 24:30 displays as 00:30.
function clock(hhmm: string): string {
  const m = minutes(hhmm) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

// Gives overlapping shifts in the same day separate lanes, so they sit side by side.
function layoutDay(shifts: ShiftRow[]) {
  const sorted = [...shifts].sort((a, b) => minutes(a.start) - minutes(b.start));
  const laneEnds: number[] = [];
  const placed = sorted.map((s) => {
    const from = minutes(s.start);
    const to = Math.min(minutes(s.end), 1440); // clip at midnight
    let lane = laneEnds.findIndex((end) => end <= from);
    if (lane === -1) lane = laneEnds.push(0) - 1;
    laneEnds[lane] = to;
    return { s, from, to, lane };
  });
  return { placed, lanes: Math.max(1, laneEnds.length) };
}

const userInput = document.querySelector<HTMLInputElement>("#kerberos")!;
let claims = new Map<string, string>(); // shift id -> kerberos holding it

async function claimShift(shift: string) {
  const user = userInput.value.trim();
  if (!user) {
    provStatus.textContent = "Enter your kerberos first.";
    return;
  }
  const result = await client.reservations.reserve({ user, resource: shift });
  provStatus.textContent =
    "error" in result ? `Could not claim: ${result.error}` : "Claimed!";
  await loadCalendar();
}

function renderCalendar() {
  const days = Array.from({ length: 7 }, (_, i) => new Date(weekStart.getTime() + i * DAY_MS));
  weekLabel.textContent = `${toISO(days[0])} to ${toISO(days[6])}`;

  const grid = document.createElement("div");
  grid.className = "cal-grid";

  // Hour labels, with a spacer that lines up with the day headers.
  const hours = document.createElement("div");
  hours.className = "cal-hours";
  hours.append(document.createElement("div")); // spacer
  hours.lastElementChild!.className = "cal-head";
  // for (let h = 0; h < 24; h++) {
  for (let h = 8; h < 24; h++) {
    const label = document.createElement("div");
    label.className = "cal-hour";
    label.textContent = `${String(h).padStart(2, "0")}:00`;
    hours.append(label);
  }
  grid.append(hours);

  days.forEach((day, i) => {
    const iso = toISO(day);
    const col = document.createElement("div");
    col.className = "cal-day";

    const head = document.createElement("div");
    head.className = "cal-head";
    head.textContent = `${DAY_NAMES[i]} ${iso.slice(5)}`;
    col.append(head);

    const body = document.createElement("div");
    body.className = "cal-body";
    const { placed, lanes } = layoutDay(allShifts.filter((s) => s.date === iso));

    for (const { s, from, to, lane } of placed) {
      const block = document.createElement("div");
      block.className = "cal-shift";
      block.style.top = `${(from - CAL_START) * PX_PER_MINUTE}px`;
      block.style.height = `${(to - from) * PX_PER_MINUTE}px`;
      block.style.left = `${(lane * 100) / lanes}%`;
      block.style.width = `${100 / lanes}%`;

      const overnight = minutes(s.end) > 1440;
      block.textContent = `${s.start}-${clock(s.end)}${overnight ? " (next day)" : ""}`;

      // Button
      const holder = claims.get(s.shift);
      if (holder) {
        const who = document.createElement("div");
        who.textContent = `held by ${holder}`;
        block.append(who);
      } else {
        const claim = document.createElement("button");
        claim.textContent = "Claim";
        claim.addEventListener("click", () => claimShift(s.shift));
        block.append(claim);
      }
      body.append(block);
      // End button

      body.append(block);
    }

    col.append(body);
    grid.append(col);
  });

  calendarEl.replaceChildren(grid);
}

async function loadCalendar() {
  const shifts = await client.shifts.list({});
  if ("error" in shifts) {
    provStatus.textContent = `Could not load shifts: ${shifts.error}`;
    return;
  }
  const reservations = await client.reservations.list({});
  if ("error" in reservations) {
    provStatus.textContent = `Could not load reservations: ${reservations.error}`;
    return;
  }
  claims = new Map(reservations.book.reservations.map((r) => [r.resource, r.user]));
  allShifts = shifts.organizer.shifts;
  renderCalendar();
}

prevWeekBtn.addEventListener("click", () => {
  weekStart = new Date(weekStart.getTime() - 7 * DAY_MS);
  renderCalendar();
});

nextWeekBtn.addEventListener("click", () => {
  weekStart = new Date(weekStart.getTime() + 7 * DAY_MS);
  renderCalendar();
});

loadCalendar();