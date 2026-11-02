<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { api } from "./client.ts";
import CalendarDay from "./CalendarDay.vue";
import ShiftMaker from "./ShiftMaker.vue";
import { useSession } from "./session.ts";
import type { ShiftCategory, ShiftRow } from "./types.ts";

const { me: session, signOut } = useSession();

const CAPTAIN_KERBEROS = "rld";
const DAY_MS = 24 * 60 * 60 * 1000;
const MINUTES_PER_DAY = 24 * 60;
const CAL_START_MINUTE = 8 * 60;
const PX_PER_MINUTE = 1;
const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOUR_LABELS = Array.from({ length: 16 }, (_, i) => `${pad(i + 8)}:00`);

// State
const status = ref("");
const shiftRows = ref<ShiftRow[]>([]);
const weekStart = ref(mondayOf(new Date()));

// Helpers
function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function shiftCategory(s: ShiftRow): ShiftCategory {
  if (s.offer || !s.holder) return "available";
  if (s.holder === myKerberos.value) return "mine";
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
  type Placed = { s: ShiftRow; from: number; to: number; lane: number; lanes: number };
  const placed: Placed[] = [];
  let cluster: Placed[] = [];
  let clusterEnd = -Infinity;
  const laneEnds: number[] = [];

  // Every shift in a cluster gets the cluster's lane count, not the whole day's.
  const closeCluster = () => {
    const lanes = Math.max(1, laneEnds.length);
    for (const item of cluster) item.lanes = lanes;
    placed.push(...cluster);
    cluster = [];
    laneEnds.length = 0;
  };

  for (const s of sorted) {
    const from = minutes(s.start);
    const to = Math.min(minutes(s.end), MINUTES_PER_DAY);
    if (from >= clusterEnd) closeCluster();
    let lane = laneEnds.findIndex((end) => end <= from);
    if (lane === -1) lane = laneEnds.push(0) - 1;
    laneEnds[lane] = to;
    clusterEnd = Math.max(clusterEnd, to);
    cluster.push({ s, from, to, lane, lanes: 1 });
  }
  closeCluster();
  return placed;
}

// Derived state
const myKerberos = computed(() => session.value?.username ?? "");
const isCaptain = computed(() => myKerberos.value === CAPTAIN_KERBEROS);

const days = computed(() =>
  Array.from({ length: 7 }, (_, i) => new Date(weekStart.value.getTime() + i * DAY_MS)),
);
const weekLabel = computed(() => `${toISO(days.value[0])} to ${toISO(days.value[6])}`);

const columns = computed(() =>
  days.value.map((day, i) => {
    const iso = toISO(day);
    const placed = layoutDay(shiftRows.value.filter((s) => s.date === iso));
    return {
      iso,
      head: `${DAY_NAMES[i]} ${iso.slice(5)}`,
      blocks: placed.map(({ s, from, to, lane, lanes }) => ({
        key: s.shift,
        shift: s.shift,
        label: `${s.start}-${clock(s.end)}${minutes(s.end) > MINUTES_PER_DAY ? " (next day)" : ""}`,
        holder: s.holder,
        offer: s.offer,
        category: shiftCategory(s),
        style: {
          top: `${(from - CAL_START_MINUTE) * PX_PER_MINUTE}px`,
          height: `${(to - from) * PX_PER_MINUTE - 3}px`,
          left: `${(lane * 100) / lanes}%`,
          width: `calc(${100 / lanes}% - 3px)`,
        },
      })),
    }
}));

// Actions
/** Sets a status message and returns true when the user has not entered a kerberos. */
function needsKerberos(): boolean {
  if (myKerberos.value) return false;
  status.value = "Enter your kerberos first.";
  return true;
}

async function loadCalendar(): Promise<ShiftRow[]> {
  const result = await api.shifts.list({});
  if ("error" in result) {
    status.value = `Could not load shifts: ${result.error}`;
    return shiftRows.value;
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
  return shiftRows.value;
}

async function claimShift(shift: string) {
  if (needsKerberos()) return;
  const result = await api.shifts.claim({ user: myKerberos.value, resource: shift });
  status.value = "error" in result ? `Could not claim: ${result.error}` : "Claimed!";
  await loadCalendar();
}

async function offerShift(shift: string) {
  if (needsKerberos()) return;
  const result = await api.shifts.offer({ resource: shift, user: myKerberos.value });
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

onMounted(loadCalendar);
</script>

<template>
  <button type="button" class="nav-btn" @click="signOut">Log out</button>

  <p>{{ status }}</p>

  <ShiftMaker
    :is-captain="isCaptain"
    :reload="loadCalendar"
    @status="status = $event"
  />

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

    <CalendarDay
      v-for="col in columns"
      :key="col.iso"
      :head="col.head"
      :blocks="col.blocks"
      :me="myKerberos"
      @offer="offerShift"
      @claim="claimShift"
    />
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

.nav-btn:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}
.cal-grid { display: grid; grid-template-columns: 4rem repeat(7, 1fr); font-size: 0.85rem; }
.cal-head {
  height: 2rem;
  line-height: 2rem;
  font-weight: bold;
  text-align: center;
}
.cal-hour {
  height: 60px;
  font-size: 0.7rem;
  line-height: 1;
  padding-top: 2px;
  border-top: 1px solid #000;
  box-sizing: border-box;
}
</style>