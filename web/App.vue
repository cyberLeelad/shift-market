<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { createHttpClient } from "@mit-sdg/sync-engine-http/client";
import type { ShiftMarketWireHttp } from "../generated/wire.ts";

const client = createHttpClient<ShiftMarketWireHttp>({ baseUrl: "/api" });

type WeeklyDay = Parameters<typeof client.shifts.makeWeekly>[0]["day"];

const CAPTAIN_KERBEROS = "captain-fred";
const DAY_OPTIONS = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
] as const satisfies readonly WeeklyDay[];

type ShiftRow = {
  shift: string;
  start: string;
  end: string;
  date: string;
  linked: string[];
  holder: string | null;
  offer: string | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const MINUTES_PER_DAY = 24 * 60;
const CAL_START_MINUTE = 8 * 60;
const PX_PER_MINUTE = 1;
const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOUR_LABELS = Array.from({ length: 16 }, (_, i) => `${pad(i + 8)}:00`);

// State
const kerberos = ref("");
const status = ref("");
const isWeekly = ref(true);
const assignStaff = ref(false);
const staffKerberos = ref("");
const form = ref({
  date: "",
  last: "",
  day: "MONDAY" as WeeklyDay,
  start: "",
  end: "",
});
const shiftRows = ref<ShiftRow[]>([]);
const weekStart = ref(mondayOf(new Date()));
const showProvision = ref(false);
const accessNotice = ref("");

// Helpers
function pad(n: number): string {
  return String(n).padStart(2, "0");
}

type ShiftCategory = "mine" | "available" | "unavailable";

function shiftCategory(s: ShiftRow): ShiftCategory {
  if (s.offer || !s.holder) return "available";
  if (s.holder === me.value) return "mine";
  return "unavailable";
}

/** The Monday (UTC midnight) of the week containing the given local date. */
function mondayOf(date: Date): Date {
  const utcMidnight = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const daysSinceMonday = (new Date(utcMidnight).getUTCDay() + 6) % 7;
  return new Date(utcMidnight - daysSinceMonday * DAY_MS);
}

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** "HH:MM" to minutes since midnight. Times past midnight (e.g. "26:00") stay above 1440. */
function minutes(hhmm: string): number {
  return Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
}

/** Minutes to a wrapped "HH:MM" clock time. */
function clock(hhmm: string): string {
  const m = minutes(hhmm) % MINUTES_PER_DAY;
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}

/** Assigns each shift to a side-by-side lane so overlapping shifts do not hide each other. */
function layoutDay(list: ShiftRow[]) {
  const sorted = [...list].sort((a, b) => minutes(a.start) - minutes(b.start));
  const laneEnds: number[] = [];
  const placed = sorted.map((s) => {
    const from = minutes(s.start);
    const to = Math.min(minutes(s.end), MINUTES_PER_DAY);
    let lane = laneEnds.findIndex((end) => end <= from);
    if (lane === -1) lane = laneEnds.push(0) - 1;
    laneEnds[lane] = to;
    return { s, from, to, lane };
  });
  return { placed, lanes: Math.max(1, laneEnds.length) };
}

// Derived state
const me = computed(() => kerberos.value.trim());
const isCaptain = computed(() => me.value === CAPTAIN_KERBEROS);

const days = computed(() =>
  Array.from({ length: 7 }, (_, i) => new Date(weekStart.value.getTime() + i * DAY_MS)),
);
const weekLabel = computed(() => `${toISO(days.value[0])} to ${toISO(days.value[6])}`);

const columns = computed(() =>
  days.value.map((day, i) => {
    const iso = toISO(day);
    const { placed, lanes } = layoutDay(shiftRows.value.filter((s) => s.date === iso));
    return {
      iso,
      head: `${DAY_NAMES[i]} ${iso.slice(5)}`,
      blocks: placed.map(({ s, from, to, lane }) => ({
        key: s.shift,
        shift: s.shift,
        label: `${s.start}-${clock(s.end)}${minutes(s.end) > MINUTES_PER_DAY ? " (next day)" : ""}`,
        holder: s.holder,
        offer: s.offer,
        category: shiftCategory(s),
        style: {
          top: `${(from - CAL_START_MINUTE) * PX_PER_MINUTE}px`,
          height: `${(to - from) * PX_PER_MINUTE}px`,
          left: `${(lane * 100) / lanes}%`,
          width: `${100 / lanes}%`,
        },
      })),
    };
  }),
);

// Actions
/** Sets a status message and returns true when the user has not entered a kerberos. */
function needsKerberos(): boolean {
  if (me.value) return false;
  status.value = "Enter your kerberos first.";
  return true;
}

async function loadCalendar() {
  const result = await client.shifts.list({});
  if ("error" in result) {
    status.value = `Could not load shifts: ${result.error}`;
    return;
  }
  shiftRows.value = result.organizer.shifts.map((s) => ({
    shift: s.shift,
    start: s.start,
    end: s.end,
    date: s.date,
    linked: s.linked.map((l) => l.linked),
    holder: s.state.holder,
    offer: s.state.offer,
  }));
}

async function submitProvision() {
  const { date, last, day, start, end } = form.value;
  const staff = staffKerberos.value.trim();

  if (assignStaff.value && !staff) {
    status.value = "Enter the staff member's kerberos.";
    return;
  }

  const result = isWeekly.value
    ? await client.shifts.makeWeekly({ start, end, day, first: date, last })
    : await client.shifts.makeOne({ start, end, date });

  if ("error" in result) {
    status.value = `Could not create shift: ${result.error}`;
    return;
  }

  // Refresh first so the new shift's row and its linked shifts are present.
  await loadCalendar();

  const row = shiftRows.value.find((s) => s.shift === result.shift);
  const created = row ? [row.shift, ...row.linked] : [result.shift];
  status.value = `Created ${created.length} shift(s)!`;

  if (assignStaff.value) {
    for (const shift of created) {
      const claim = await client.shifts.claim({ user: staff, resource: shift });
      if ("error" in claim) {
        status.value = `Created ${created.length} shift(s), but could not assign them to ${staff}: ${claim.error}`;
        break;
      }
    }
    await loadCalendar();
  }
}

async function claimShift(shift: string) {
  if (needsKerberos()) return;
  const result = await client.shifts.claim({ user: me.value, resource: shift });
  status.value = "error" in result ? `Could not claim: ${result.error}` : "Claimed!";
  await loadCalendar();
}

async function offerShift(shift: string) {
  if (needsKerberos()) return;
  const result = await client.shifts.offer({ resource: shift, user: me.value });
  if ("error" in result) {
    status.value = `Could not offer shift: ${result.error}`;
    return;
  }
  await loadCalendar();
}

function shiftWeek(weeks: number) {
  weekStart.value = new Date(weekStart.value.getTime() + weeks * 7 * DAY_MS);
}

function goToCurrentWeek() {
  weekStart.value = mondayOf(new Date());
}

function openProvision() {
  if (!isCaptain.value) {
    accessNotice.value = "Only captain can open this.";
    return;
  }
  accessNotice.value = "";
  showProvision.value = true;
}

onMounted(loadCalendar);
</script>

<template>

  <h1 class="app-title">FRED Desk Shift Market :]</h1>

  <p>
    <input v-model="kerberos" placeholder="Your kerberos" />
  </p>

  <p>{{ status }}</p>

  <div v-if="showProvision && isCaptain" class="provision-panel" role="dialog" aria-label="Add shifts">
    <div class="provision-header">
      <h1>Add Shift(s)</h1>
      <button type="button" aria-label="Close" @click="showProvision = false">✕</button>
    </div>
    <form @submit.prevent="submitProvision">
      <input v-model="form.date" type="date" required />
      <template v-if="isWeekly">
        <label>Last date <input v-model="form.last" type="date" required /></label>
        <label>
          Day
          <select v-model="form.day">
            <option v-for="d in DAY_OPTIONS" :key="d" :value="d">{{ d }}</option>
          </select>
        </label>
      </template>
      <input v-model="form.start" type="time" required />
      <input v-model="form.end" type="time" required />
      <label>
        <input v-model="isWeekly" type="checkbox" />
        Weekly shift
      </label>
      <label>
        <input v-model="assignStaff" type="checkbox" />
        Assign to staff member?
      </label>
      <template v-if="assignStaff">
        <input v-model="staffKerberos" placeholder="Staff kerberos" required />
      </template>
      <button>Create shift!</button>
    </form>
  </div>

  <h2>Calendar View</h2>
  <div class="week-nav">
    <button type="button" class="nav-btn" @click="shiftWeek(-1)">◀ Prev</button>
    <button type="button" class="nav-btn nav-btn--today" @click="goToCurrentWeek">This week</button>
    <span class="week-label">{{ weekLabel }}</span>
    <button type="button" class="nav-btn" @click="shiftWeek(1)">Next ▶</button>
  </div>

  <div class="cal-grid">
    <div class="cal-hours">
      <div class="cal-head"></div>
      <div v-for="h in HOUR_LABELS" :key="h" class="cal-hour">{{ h }}</div>
    </div>

    <div v-for="col in columns" :key="col.iso" class="cal-day">
      <div class="cal-head">{{ col.head }}</div>
      <div class="cal-body">
        <div
          v-for="b in col.blocks"
          :key="b.key"
          :class="['cal-shift', b.category]"
          :style="b.style"
        >
          <div>{{ b.label }}</div>
          <div v-if="b.category === 'available'" class="needs-coverage">needs coverage!</div>
          <div v-if="b.holder">held by {{ b.holder }}</div>
          <div v-if="b.offer">offered</div>
          <button
            v-if="b.holder && b.holder === me && !b.offer"
            type="button"
            class="icon-btn icon-btn--offer"
            title="Offer this shift"
            aria-label="Offer this shift"
            @click="offerShift(b.shift)"
          >⇄</button>
          <button
            v-else-if="!b.holder || b.offer"
            type="button"
            class="icon-btn icon-btn--claim"
            title="Claim this shift"
            aria-label="Claim this shift"
            @click="claimShift(b.shift)"
          >+</button>
        </div>
      </div>
    </div>
  </div>

  <div class="fab-wrap">
    <p v-if="accessNotice" class="access-notice" role="status">{{ accessNotice }}</p>
    <button type="button" class="fab" aria-label="Add shifts" title="Add shifts" @click="openProvision">
      <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
        <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" fill="none" />
      </svg>
    </button>
  </div>
</template>

<style scoped>
/* Week navigation */
.week-nav {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 1rem 0;
}

.week-label {
  flex: 1;
  text-align: center;
  font-weight: 600;
  color: #111827;
  font-variant-numeric: tabular-nums;
}

.nav-btn {
  padding: 0.4rem 0.8rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: #fff;
  color: #374151;
  font: inherit;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background-color 0.15s, border-color 0.15s;
}

.nav-btn:hover {
  background: #f3f4f6;
  border-color: #9ca3af;
}

.nav-btn--today {
  border-color: #2563eb;
  color: #2563eb;
  font-weight: 600;
}

.nav-btn--today:hover {
  background: #eff6ff;
}

.nav-btn:focus-visible,
.fab:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}

/* Floating add-shift button */
.fab-wrap {
  position: fixed;
  right: 1.5rem;
  bottom: 1.5rem;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.5rem;
}

.fab {
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  border: none;
  border-radius: 50%;
  background: #2563eb;
  color: #fff;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35);
  transition: background-color 0.15s, transform 0.15s;
}

.fab:hover {
  background: #1d4ed8;
  transform: scale(1.05);
}

.access-notice {
  margin: 0;
  padding: 0.4rem 0.75rem;
  border-radius: 6px;
  background: #111827;
  color: #fff;
  font-size: 0.9rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

/* Add-shift panel */
.provision-panel {
  position: fixed;
  right: 1.5rem;
  bottom: 6rem;
  z-index: 999;
  width: min(420px, calc(100vw - 3rem));
  max-height: 70vh;
  overflow: auto;
  padding: 1rem 1.25rem;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.18);
}

.provision-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.provision-header h1 {
  margin: 0;
  font-size: 1.2rem;
  color: #111827;
}

.provision-header button {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: #6b7280;
  font-size: 1rem;
  cursor: pointer;
}

.provision-header button:hover {
  background: #f3f4f6;
  color: #111827;
}

.provision-panel form {
  flex-wrap: wrap;
  align-items: center;
}

.cal-shift.available {
  background: #dcfce7;
  border-color: #16a34a;
}

.cal-shift.mine {
  background: #dbeafe;
  border-color: #2563eb;
}

.cal-shift.unavailable {
  background: #f3f4f6;
  border-color: #9ca3af;
  color: #6b7280;
}

.cal-shift {
  position: absolute;
  box-sizing: border-box;
  overflow: hidden;
}

.icon-btn {
  position: absolute;
  right: 4px;
  bottom: 4px;
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  font-size: 1.1rem;
  padding: 0;
  border: 1px solid #d1d5db;
  border-radius: 50%;
  background: #fff;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
  transition: transform 0.15s, border-color 0.15s, background-color 0.15s;
}

.icon-btn:hover {
  transform: scale(1.1);
  background: #f9fafb;
}

.icon-btn--claim {
  color: #2563eb;
}

.icon-btn--claim:hover {
  border-color: #2563eb;
}

.icon-btn--offer {
  color: #d97706;
}

.icon-btn--offer:hover {
  border-color: #d97706;
}

.icon-btn:focus-visible {
  outline: 2px solid #111827;
  outline-offset: 2px;
}
.needs-coverage {
  font-weight: 600;
  font-style: italic;
}

.app-title {
  margin: 0 0 1rem;
  font-size: 1.75rem;
  font-weight: 700;
  color: #111827;
}
</style>
