<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { createHttpClient } from "@mit-sdg/sync-engine-http/client";
import type { ShiftMarketWireHttp } from "../generated/wire.ts";

const client = createHttpClient<ShiftMarketWireHttp>({ baseUrl: "/api" });

type WeeklyDay = Parameters<typeof client.shifts.makeWeekly>[0]["day"];
const DAY_OPTIONS: WeeklyDay[] = [
  "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY",
] as WeeklyDay[];
enum STATUS { HELD, UNRESERVED };

type ShiftRow = { shift: string; start: string; end: string; date: string, holder: string | null, status: STATUS };

const DAY_MS = 24 * 60 * 60 * 1000;
const PX_PER_MINUTE = 1;
const CAL_START = 8 * 60;
const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const hourLabels = Array.from({ length: 16 }, (_, i) => `${String(i + 8).padStart(2, "0")}:00`);

// State
const kerberos = ref("");
const status = ref("");
const isWeekly = ref(true);
const form = ref({
  date: "",
  last: "",
  day: "MONDAY" as WeeklyDay,
  start: "",
  end: "",
});
const shiftRows = ref<ShiftRow[]>([]);
const weekStart = ref(mondayOf(new Date()));

// Helpers
function mondayOf(date: Date): Date {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const offset = (d.getUTCDay() + 6) % 7;
  return new Date(d.getTime() - offset * DAY_MS);
}

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function minutes(hhmm: string): number {
  return Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
}

function clock(hhmm: string): string {
  const m = minutes(hhmm) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

function layoutDay(list: ShiftRow[]) {
  const sorted = [...list].sort((a, b) => minutes(a.start) - minutes(b.start));
  const laneEnds: number[] = [];
  const placed = sorted.map((s) => {
    const from = minutes(s.start);
    const to = Math.min(minutes(s.end), 1440);
    let lane = laneEnds.findIndex((end) => end <= from);
    if (lane === -1) lane = laneEnds.push(0) - 1;
    laneEnds[lane] = to;
    return { s, from, to, lane };
  });
  return { placed, lanes: Math.max(1, laneEnds.length) };
}

// Derived state
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
        holder: s.holder,
        label: `${s.start}-${clock(s.end)}${minutes(s.end) > 1440 ? " (next day)" : ""}`,
        style: {
          top: `${(from - CAL_START) * PX_PER_MINUTE}px`,
          height: `${(to - from) * PX_PER_MINUTE}px`,
          left: `${(lane * 100) / lanes}%`,
          width: `${100 / lanes}%`,
        },
      })),
    };
  }),
);

// Actions
async function loadCalendar() {
  const result = await client.shifts.list({});
  if ("error" in result) {
    status.value = `Could not load shifts: ${result.error}`;
    return;
  }
  shiftRows.value = result.organizer.shifts.map((s) => ({
    ...s,
    status: s.holder ? STATUS.HELD : STATUS.UNRESERVED,
  }));
}

async function submitProvision() {
  const { date, last, day, start, end } = form.value;
  const result = isWeekly.value
    ? await client.shifts.makeWeekly({ start, end, day, first: date, last })
    : await client.shifts.makeOne({ start, end, date });
  status.value = "error" in result ? `Could not create shift: ${result.error}` : "Created shift!";
  await loadCalendar();
}

async function claimShift(shift: string) {
  const user = kerberos.value.trim();
  if (!user) {
    status.value = "Enter your kerberos first.";
    return;
  }
  const result = await client.reservations.reserve({ user, resource: shift });
  status.value = "error" in result ? `Could not claim: ${result.error}` : "Claimed!";
  await loadCalendar();
}

function shiftWeek(weeks: number) {
  weekStart.value = new Date(weekStart.value.getTime() + weeks * 7 * DAY_MS);
}

onMounted(loadCalendar);
</script>

<template>
  <p>
    <input v-model="kerberos" placeholder="Your kerberos" />
    You are currently <b>not</b> authenticated (because Authenticating is not currently supported).
  </p>

  <p>{{ status }}</p>

  <h1>Add Shift(s)</h1>
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
    <button>Create shift!</button>
  </form>

  <h1>Calendar View</h1>
  <div>
    <button @click="shiftWeek(-1)">◀ Prev</button>
    <span>{{ weekLabel }}</span>
    <button @click="shiftWeek(1)">Next ▶</button>
  </div>

  <div class="cal-grid">
    <div class="cal-hours">
      <div class="cal-head"></div>
      <div v-for="h in hourLabels" :key="h" class="cal-hour">{{ h }}</div>
    </div>

    <div v-for="col in columns" :key="col.iso" class="cal-day">
      <div class="cal-head">{{ col.head }}</div>
      <div class="cal-body">
        <div v-for="b in col.blocks" :key="b.key" class="cal-shift" :style="b.style">
          <div>{{ b.label }}</div>
          <div v-if="b.holder">held by {{ b.holder }}</div>
          <button v-else @click="claimShift(b.shift)">Claim</button>
        </div>
      </div>
    </div>
  </div>
</template>