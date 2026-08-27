<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { me } from './api';
import { player } from './store/session';

const router = useRouter();
const checking = ref(true);

onMounted(async () => {
  const { ok, data } = await me();
  if (ok) {
    player.value = data;
    router.push('/game');
  }
  checking.value = false;
});
</script>

<template>
  <div v-if="checking" class="loading">Loading...</div>
  <router-view v-else />
</template>