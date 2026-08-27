<script setup lang="ts">
    import { player } from '../store/session';
    import { useRouter } from 'vue-router';
    import { logout } from '../api';
    import { computed } from 'vue';

    const router = useRouter();

    const formattedRetiredAt = computed(() =>{
        if(!player.value?.retiredAt) return '';
        return new Date(player.value.retiredAt).toLocaleDateString(undefined,{
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        })
    })


    async function handleLogout() {
        await logout();
        player.value = null;
        router.push('/login');
    }
</script>

<template>
  <div class="retired">
    <div class="card">
      <p class="epitaph">{{ player?.message }}</p>

      <div class="stats">
        <div class="stat">
          <span class="label">Final score</span>
          <span class="value">{{ player?.score }}</span>
        </div>
        <div class="stat">
          <span class="label">Retired</span>
          <span class="value">{{ formattedRetiredAt }}</span>
        </div>
      </div>

      <div v-if="player?.titles?.length" class="titles">
        <h2>Titles earned</h2>
        <div v-for="title in player.titles" :key="title.name" class="title">
          <span class="title-name">{{ title.name }}</span>
          <span class="title-desc">{{ title.description }}</span>
          <span class="title-points">{{ title.points }}</span>
        </div>
      </div>

      <button class="logout" type="button" @click="handleLogout">Go back to login</button>
    </div>
  </div>
</template>

<style scoped>
.retired {
  height: 100%;
  display: grid;
  place-items: center;
  padding: var(--gap-l);
}

.card {
  width: min(40rem, 100%);
  display: flex;
  flex-direction: column;
  gap: var(--gap-l);
}

.epitaph {
  font-family: var(--serif);
  font-size: var(--step-2);
  color: var(--vellum-dim);
  margin: 0;
}

.stats {
  display: flex;
  gap: var(--gap-l);
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.stat .label {
  font-size: var(--step-0);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--vellum-dim);
}

.stat .value {
  font-family: var(--mono);
  font-size: var(--step-3);
  color: var(--green);
}

.titles h2 {
  font-family: var(--display);
  font-weight: 400;
  font-style: italic;
  font-size: var(--step-2);
  color: var(--bloom);
  margin: 0 0 0.75rem;
}

.title {
  display: flex;
  align-items: baseline;
  gap: 0.6rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--edge);
}

.title-name {
  font-weight: 600;
  color: var(--vellum);
}

.title-desc {
  flex: 1;
  font-family: var(--serif);
  color: var(--vellum-dim);
  font-size: var(--step-0);
}

.title-points {
  font-family: var(--mono);
  color: var(--green);
}

.logout {
  align-self: flex-start;
  margin-top: 0.5rem;
  font-size: var(--step-0);
  color: var(--vellum-faint);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.logout:hover { color: var(--rust); }
</style>