<script setup lang="ts">
    import { ref,watch,nextTick } from 'vue';

    export interface Entry {
        id:number;
        kind:'query' | 'narration' | 'refusal' | 'count' | 'fault';
        text:string;
    }

    const props = defineProps<{entries: Entry[]}>();

    const scroller = ref<HTMLElement | null>(null);

    watch(() => props.entries.length,async() => {
        await nextTick();
        const el = scroller.value;
        if(el) el.scrollTop = el.scrollHeight;
    });
</script>

<template>
  <div ref="scroller" class="log">
    <div v-if="!entries.length" class="empty">
      The land is waiting.
    </div>
    <div
      v-for="entry in entries"
      :key="entry.id"
      class="entry"
      :class="entry.kind"
    >
      <span v-if="entry.kind === 'query'" class="prompt" aria-hidden="true">&gt;</span>{{ entry.text }}
    </div>
  </div>
</template>

<style scoped>
.log {
  overflow-y: auto;
  flex: 1;
  min-height: 0;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.empty {
  font-family: var(--font-serif);
  opacity: 0.6;
  font-style: italic;
}

.entry.query,
.entry.count {
  font-family: var(--font-mono);
  white-space: pre-wrap;
}

.entry.query .prompt {
  margin-right: 0.5em;
  opacity: 0.7;
}

.entry.narration {
  font-family: var(--font-serif);
}

.entry.refusal {
  font-family: var(--font-serif);
  color: var(--color-rust);
}

.entry.fault {
  font-family: var(--font-mono);
  color: var(--color-fault, red);
}
</style>