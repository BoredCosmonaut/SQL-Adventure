<script setup lang="ts">
import { computed } from 'vue';

    const props = defineProps<{rows: Record<string,unknown>[]}>()

    const columns = computed(() => {
        if(!props.rows.length) return [];
        return Object.keys(props.rows[0]);
    })
</script>

<template>
  <div class="results">
    <div v-if="!rows.length" class="empty">No rows yet.</div>

    <table v-else>
      <thead>
        <tr>
          <th v-for="col in columns" :key="col">{{ col }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, i) in rows" :key="i">
          <td v-for="col in columns" :key="col" :title="String(row[col])">{{ row[col] }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.results {
  height: 100%;
  overflow: auto;
  padding: 1rem;
  font-family: var(--mono);
  font-size: var(--step-0);
}

.empty {
  font-family: var(--serif);
  color: var(--vellum-faint);
  font-style: italic;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  padding: 0.4rem 0.6rem;
  text-align: left;
  border-bottom: 1px solid var(--edge);
  max-width: 50ch;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: normal;
}

th {
  color: var(--vellum-dim);
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  font-size: var(--step-0);
  border-bottom: 1px solid var(--green-faint);
}

td {
  color: var(--green);
}

tbody tr:hover {
  background: var(--raised);
}
</style>