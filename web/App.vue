<script setup lang="ts">
import { onMounted } from "vue";
import Calendar from "./src/Calendar.vue";
import SignIn from "./src/SignIn.vue";
import PasswordForm from "./src/PasswordForm.vue";
import { useSession } from "./src/session.ts";

const { me, checked, load } = useSession();
onMounted(load);
</script>

<template>
  <h1 class="app-title">FRED Desk Shift Market :]</h1>

  <p v-if="!checked">Loading…</p>
  <SignIn v-else-if="!me" icon="box" lead="Sign in to see the mail desk schedule.">
    <PasswordForm />
  </SignIn>
  <Calendar v-else />
</template>

<style scoped>
.app-title {
  margin: 0 0 1rem;
  font-size: 1.75rem;
  font-weight: 700;
  color: #111827;
}
</style>