import { ref } from "vue";
import type { authResponse } from "../api";

export const player = ref<authResponse| null >(null);