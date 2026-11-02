<script setup lang="ts">
import type { StyleValue } from "vue";

type ShiftCategory = "mine" | "available" | "unavailable";

defineProps<{
  shift: string;
  label: string;
  holder: string | null;
  offer: string | null;
  category: ShiftCategory;
  isMine: boolean;
  style: StyleValue;
}>();

const emit = defineEmits<{
  offer: [shift: string];
  claim: [shift: string];
}>();
</script>

<template>
  <div :class="['cal-shift', category]" :style="style">
    <div>{{ label }}</div>
    <div v-if="category === 'available'" class="needs-coverage">needs coverage!</div>
    <div v-if="holder">held by {{ holder }}</div>
    <div v-if="offer">offered</div>
    <button
      v-if="holder && isMine && !offer"
      type="button"
      class="icon-btn icon-btn--offer"
      title="Offer this shift"
      aria-label="Offer this shift"
      @click="emit('offer', shift)"
    >⇄</button>
    <button
      v-else-if="!holder || offer"
      type="button"
      class="icon-btn icon-btn--claim"
      title="Claim this shift"
      aria-label="Claim this shift"
      @click="emit('claim', shift)"
    >+</button>
  </div>
</template>

<style scoped>
.cal-shift {
  position: absolute;
  box-sizing: border-box;
  overflow: hidden;
  padding: 2px;
  background: #cfe3ff;
  border: 1px solid #5b8fd6;
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
</style>