<script setup lang="ts">
import ShiftBlock from "./ShiftBlock.vue";

defineProps<{
  head: string;
  blocks: {
    key: string;
    shift: string;
    label: string;
    holder: string | null;
    offer: string | null;
    category: "mine" | "available" | "unavailable";
    style: Record<string, string>;
  }[];
  me: string;
}>();

const emit = defineEmits<{
  offer: [shift: string];
  claim: [shift: string];
}>();
</script>

<template>
  <div class="cal-day">
    <div class="cal-head">{{ head }}</div>
    <div class="cal-body">
      <ShiftBlock
        v-for="b in blocks"
        :key="b.key"
        :shift="b.shift"
        :label="b.label"
        :holder="b.holder"
        :offer="b.offer"
        :category="b.category"
        :is-mine="b.holder === me"
        :style="b.style"
        @offer="emit('offer', $event)"
        @claim="emit('claim', $event)"
      />
    </div>
  </div>
</template>

<style scoped>
.cal-head {
  height: 2rem;
  font-weight: bold;
  text-align: center;
  line-height: 2rem;
}
.cal-body {
  position: relative;
  height: 960px;
  border-left: 1px solid #ddd;
  background: repeating-linear-gradient(to bottom, transparent 0 59px, #eee 59px 60px);
}
</style>