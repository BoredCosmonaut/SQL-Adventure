<script setup lang="ts">
    import { ref } from 'vue';
    import { useRouter } from 'vue-router';
    import { register,login } from '../api';
    import { player } from '../store/session';

    const router = useRouter();

    const mode = ref<'login'| 'register'>('login');
    
    const name = ref('');
    const password = ref('');
    const error = ref('');
    const busy = ref(false);

    async function submit() {
        if(busy.value) return;
        error.value = '';

        if(!name.value.trim() || !password.value) {
            error.value = 'Both fields are required';
            return;
        }

        busy.value = true;
        const call = mode.value === 'login' ? login : register;

        const {ok,data} = await call(name.value.trim(),password.value);
        busy.value = false;
        
        if(!ok) {
            error.value = data.error ?? 'That didnt work';
            return;
        }

        player.value = data;
        router.push('/game');
    }

    function swap() {
        mode.value = mode.value === 'login'? 'register' : 'login';
        error.value = '';
    }
</script>

<template>
    <div class="gate">
        <div class="card">
            <h1>
                <span class="from">SELECT</span>
                <span class="title">adventure</span>
                <span class="from">FROM</span>
                <span class="world">khargazim</span>
            </h1>

            <form @submit.prevent="submit">
                <label >
                    <span>Name</span>
                    <input type="text" v-model="name" spellcheck="false" :disabled="busy">
                </label>

                <label >
                    <span>Password</span>
                    <input type="password" v-model="password" spellcheck="false" :disabled="busy">
                </label>

                <p v-if="error" class="error">{{ error }}</p>

                <button class="go" type="submit" :disabled="busy">
                    {{ busy ? '...' : (mode === 'login'?'Contuine':'Begin') }}
                </button>
            </form>

            <button class="swap" type="button" @click="swap">
                {{ mode === 'login'? 'Create your character' : 'Already have a character?' }}
            </button>
        </div>
    </div>
</template>

<style scoped>
.gate {
  height: 100%;
  display: grid;
  place-items: center;
  padding: var(--gap-l);
}

.card {
  width: min(40rem, 100%);
}

h1 {
  margin: 0 0 1.25rem;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.5ch;
  line-height: 1.15;
}

.from {
  font-family: var(--mono);
  font-size: var(--step-2);
  font-weight: 500;
  letter-spacing: 0.08em;
  color: var(--vellum-faint);
}

.title, .world {
  font-family: var(--display);  
  font-size: var(--step-4);
  font-weight: 400;
  font-style: italic;
  color: var(--green);
}

.world { color: var(--vellum); }

.pitch {
  font-family: var(--serif);
  font-size: var(--step-2);
  color: var(--vellum-dim);
  margin: 0 0 2rem;
  max-width: 44ch;
}

form {
  display: flex;
  flex-direction: column;
  gap: var(--gap);
}

label {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

label span {
  font-size: var(--step-0);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--vellum-dim);
}

label input {
  padding: 0.6rem 0.75rem;
  background: var(--shadow);
  border: 1px solid var(--edge);
  color: var(--vellum);
  caret-color: var(--amber);
}

label input:focus {
  border-color: var(--amber-dim);
}

.error {
  margin: 0;
  font-family: var(--serif);
  font-size: var(--step-2);
  color: var(--rust);
}

.go {
  margin-top: 0.5rem;
  padding: 0.7rem;
  background: var(--green);
  color: var(--ink);
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  font-size: var(--step-0);
  transition: background 0.15s;
}

.go:hover:not(:disabled) { background: var(--bloom); }
.go:disabled { opacity: 0.5; cursor: default; }

.swap {
  margin-top: var(--gap-l);
  font-size: var(--step-0);
  color: var(--vellum-faint);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.swap:hover { color: var(--amber); }
</style>