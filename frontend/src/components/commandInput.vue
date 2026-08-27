<script setup lang="ts">
    import { ref } from 'vue';
    import { runQuery } from '../api';

    const emit = defineEmits<{result:[payload:{sql:string;ok:boolean; status: number; rows?: Record<string,unknown>[];narration?:string[];error?:string}]}>();
    const sql = ref('');
    const history = ref<string[]>([]);
    const historyIndex = ref(-1);
    const busy = ref(false);
    async function submit() {
        const trimmed = sql.value.trim();
        if(!trimmed|| busy.value) return [];

        busy.value = true;
        const {ok,status,data} = await runQuery(trimmed);
        busy.value = false;

        history.value.push(trimmed);
        historyIndex.value = -1;
        sql.value = '';

        if(!ok) {
            emit('result',{sql:trimmed,ok:false,status,error:data.error ?? 'Something went wrong'});
            return;
        }
        emit('result',{sql:trimmed,ok:true,status,rows:data.rows,narration:data.narration});
    }

    function historyUp(){
        if(!history.value.length) return;
        if(historyIndex.value === -1){
            historyIndex.value = history.value.length - 1;
        } else if(historyIndex.value > 0) {
            historyIndex.value--;
        }
        sql.value = history.value[historyIndex.value];
    }

    function historyDown() {
        if(historyIndex.value  === -1) return;
        if(historyIndex.value < history.value.length -1) {
            historyIndex.value++;
            sql.value = history.value[historyIndex.value];
        } else { 
            historyIndex.value = -1;
            sql.value = '';
        }
    }
</script>

<template>
    <form @submit.prevent="submit" class="input-row">
        <span class="prompt" aria-hidden="true">&gt;</span>
        <input 
            type="text"
            v-model="sql"
            spellcheck="false"
            autocomplete="off"
            :disabled="busy"
            @keydown.up.prevent="historyUp"
            @keydown.down.prevent="historyDown"
            placeholder="SELECT ..."
        /> 
        <button type="submit" :disabled="busy">
            {{ busy ? '...' : 'Run' }}
        </button>
    </form>
</template>

<style scoped>
.input-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.6rem 0.75rem;
  background: var(--shadow);
  border: 1px solid var(--edge);
}

.input-row:focus-within {
  border-color: var(--amber-dim);
}

.prompt {
  font-family: var(--mono);
  color: var(--vellum-faint);
  user-select: none;
}

.input-row input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  font-family: var(--mono);
  font-size: var(--step-0);
  color: var(--vellum);
  caret-color: var(--amber);
}

.input-row input::placeholder {
  color: var(--vellum-faint);
}

.input-row input:disabled {
  opacity: 0.5;
}

.input-row button {
  padding: 0.5rem 0.9rem;
  background: var(--green);
  color: var(--ink);
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-size: var(--step-0);
  transition: background 0.15s;
}

.input-row button:hover:not(:disabled) {
  background: var(--bloom);
}

.input-row button:disabled {
  opacity: 0.5;
  cursor: default;
}
</style>