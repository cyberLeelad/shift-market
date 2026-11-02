<script setup lang="ts">
import { computed, ref } from "vue";
import { api } from "./client.ts";
import type { ShiftRow } from "./types.ts";

type WeeklyDay = Parameters<typeof api.shifts.makeWeekly>[0]["day"];

const props = defineProps<{
  isCaptain: boolean;
  reload: () => Promise<ShiftRow[]>;
}>();

const emit = defineEmits<{
  status: [message: string];
}>();

const DAY_OPTIONS = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
] as const satisfies readonly WeeklyDay[];

const showShiftMaker = ref(false);
const accessNotice = ref("");
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

function openShiftMaker() {
  if (!props.isCaptain) {
    accessNotice.value = "Only captain can open this.";
    return;
  }
  accessNotice.value = "";
  showShiftMaker.value = true;
}

async function makeShift() {
  const { date, last, day, start, end } = form.value;
  const staff = staffKerberos.value.trim();

  if (assignStaff.value && !staff) {
    emit("status", "Enter the staff member's kerberos.");
    return;
  }

  const result = isWeekly.value
    ? await api.shifts.makeWeekly({ start, end, day, first: date, last })
    : await api.shifts.makeOne({ start, end, date });

  if ("error" in result) {
    emit("status", `Could not create shift: ${result.error}`);
    return;
  }

  // Reload first so the new shift's row and its linked shifts are present.
  const rows = await props.reload();
  const row = rows.find((s) => s.shift === result.shift);
  const created = row ? [row.shift, ...row.linked] : [result.shift];
  emit("status", `Created ${created.length} shift(s)!`);

  if (assignStaff.value) {
    for (const shift of created) {
      const claim = await api.shifts.claim({ user: staff, resource: shift });
      if ("error" in claim) {
        emit("status", `Created ${created.length} shift(s), but could not assign them to ${staff}: ${claim.error}`);
        break;
      }
    }
    await props.reload();
  }
}
</script>

<template>
  <p v-if="accessNotice" class="access-notice" role="status">{{ accessNotice }}</p>

  <div v-if="showShiftMaker && isCaptain" class="shift-maker" role="dialog" aria-label="Add shifts">
    <div class="shift-maker-header">
      <h1>Add Shift(s)</h1>
      <button type="button" aria-label="Close" @click="showShiftMaker = false">✕</button>
    </div>
    <form @submit.prevent="makeShift">
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
      <button>Make shift!</button>
    </form>
  </div>

  <!-- This button allows the captain to open the shift maker interface. It only shows up for the captain. -->
  <div v-if="isCaptain && !showShiftMaker" class="fab-wrap">
    <button type="button" class="fab" aria-label="Add shifts" title="Add shifts" @click="openShiftMaker">
      <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
        <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" fill="none" />
      </svg>
    </button>
  </div>

</template>

<style scoped>
.access-notice {
  margin: 0;
  padding: 0.4rem 0.75rem;
  border-radius: 6px;
  background: #111827;
  color: #fff;
  font-size: 0.9rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

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

.fab:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}

.shift-creator {
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

.shift-maker-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.shift-maker-header h1 {
  margin: 0;
  font-size: 1.2rem;
  color: #111827;
}

.shift-maker-header button {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: #6b7280;
  font-size: 1rem;
  cursor: pointer;
}

.shift-maker-header button:hover {
  background: #f3f4f6;
  color: #111827;
}

.shift-maker form {
  flex-wrap: wrap;
  align-items: center;
}
</style>