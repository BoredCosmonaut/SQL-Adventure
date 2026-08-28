<script setup lang="ts">
import { ref } from 'vue';
import ConversationLog from '../components/conversationLog.vue';
import CommandInput from '../components/commandInput.vue';
import type { Entry } from '../components/conversationLog.vue';
import resultsPanel from '../components/resultsPanel.vue';
import { player } from '../store/session';
import { logout } from '../api';
import { useRouter } from 'vue-router';


const router = useRouter()
const entries = ref<Entry[]>(
  player.value?.message
    ? [{ id: 1, kind: 'narration', text: player.value.message }]
    : []
);

let nextId = entries.value.length + 1;
const latestRows = ref<Record<string,unknown>[]>([]);

async function handleLogout() {
  await logout();
  player.value = null;
  router.push('/login');
}

function onResult(result: {
  sql: string; ok: boolean; status: number;
  rows?: Record<string,unknown>[]; narration?: string[]; error?: string;
}) {
  entries.value.push({ id: nextId++, kind: 'query', text: result.sql });

  if (!result.ok) {
    const kind = result.status >= 500 || result.status === 0 ? 'fault' : 'refusal';
    entries.value.push({ id: nextId++, kind, text: result.error ?? 'Something went wrong' });
    return;
  }

  for (const line of result.narration ?? []) {
    entries.value.push({ id: nextId++, kind: 'narration', text: line });
  }
  if (result.rows && result.rows.length > 0) {
    latestRows.value = result.rows;
    entries.value.push({ id: nextId++, kind: 'count', text: `${result.rows.length} row${result.rows.length === 1 ? '' : 's'} returned` });
  }

  

}
</script>

<template>
  <div class="game">
    <header class="topbar">
      <span class="name">{{ player?.playerName }}</span>
      <button class="logout" type="button" @click="handleLogout">Logout</button>
    </header>

    <div class="main">
      <ConversationLog :entries="entries" />
      <resultsPanel :rows="latestRows" />
    </div>

    <CommandInput @result="onResult" />
  </div>
</template>

<style scoped>
.main {
  flex: 1;
  min-height: 0;
  display: flex;
}

.main > :first-child {
  flex: 1;
}

.main > :last-child {
  flex: 1;
  border-left: 1px solid var(--edge);
}

.game {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 1rem;
  border-bottom: 1px solid var(--edge);
}

.name {
  font-family: var(--mono);
  font-size: var(--step-0);
  color: var(--vellum-dim);
}

.logout {
  font-family: var(--mono);
  font-size: var(--step-0);
  color: var(--vellum-faint);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.logout:hover {
  color: var(--rust);
}
</style>