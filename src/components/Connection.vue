<script setup lang="ts">
import STOPTAPE from '@/assets/images/emotes/7tv/STOPTAPE.avif';
import { computed } from 'vue';
import { get, useFavicon, useOnline } from '@vueuse/core';

const online = useOnline();
const favicon = computed(() => (!get(online) ? STOPTAPE : null));
useFavicon(favicon);
</script>

<template />
