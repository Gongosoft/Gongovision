<script setup lang="ts">
import '@/styles/emotewall.css';
import { useTemplateRef } from 'vue';
import { useEmoteWall } from '@/composables/useEmoteWall.ts';

const wall = useTemplateRef<HTMLElement>('wall');
const { settings } = useEmoteWall(() => wall.value);
</script>

<template>
	<div id="emote-wall" ref="wall" :class="{ shadow: settings.shadow }" />
</template>
