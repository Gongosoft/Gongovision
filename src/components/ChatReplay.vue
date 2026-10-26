<script setup lang="ts">
import { useScroll } from '@vueuse/core';
import { formatTimestamp } from '@/utils/format.ts';
import { computed, useTemplateRef, watch } from 'vue';
import type { ChatLine } from '@/types/chat.d.ts';

const { lines } = defineProps<{ lines: ChatLine[] }>();

const log = useTemplateRef<HTMLElement>('log');
const { y, arrivedState } = useScroll(log, { offset: { bottom: 32 } });
const pinned = computed(() => arrivedState.bottom);

function scrollToBottom(): void {
	y.value = log.value?.scrollHeight ?? 0;
}

watch(
	() => lines.at(-1)?.id,
	() => {
		if (pinned.value) {
			scrollToBottom();
		}
	},
	{ flush: 'post' }
);
</script>

<template>
	<div class="chat-replay">
		<ol ref="log" class="chat-log" aria-live="off">
			<li
				v-for="line in lines"
				:key="line.id"
				class="chat-line"
				:class="{ 'chat-action': line.action, 'chat-notice': line.notice }"
				:style="{ '--user-color': line.color }">
				<span class="chat-time">{{ formatTimestamp(line.offset) }}</span>
				<img
					v-for="badge in line.badges"
					:key="badge.url"
					class="chat-badge"
					:src="badge.url"
					:alt="badge.title"
					:title="badge.title"
					decoding="async" />
				<a class="chat-name" :href="line.profileURL" target="_blank" rel="noreferrer">
					{{ line.name }}
				</a>
				<span class="chat-sep">
					{{ line.action || line.notice ? ' ' : ': ' }}
				</span>
				<span class="chat-body">
					<template v-for="(part, index) in line.parts" :key="index">
						<img
							v-if="part.type === 'emote'"
							:src="part.url"
							:alt="part.name"
							:title="part.name"
							class="chat-emote"
							loading="lazy"
							decoding="async"
							@load="pinned && scrollToBottom()" />
						<a
							v-else-if="part.type === 'link' || part.type === 'mention'"
							:class="`chat-${part.type}`"
							:href="part.href"
							:rel="part.type === 'link' ? 'noreferrer nofollow' : 'noreferrer'"
							target="_blank"
							>{{ part.text }}</a
						>
						<template v-else>{{ part.text }}</template>
					</template>
				</span>
			</li>
		</ol>
		<button v-if="!pinned" type="button" class="chat-resume" @click="scrollToBottom">
			Chat Paused Due to Scroll
		</button>
	</div>
</template>

<style scoped>
.chat-replay {
	background: #191919;
	color: #efeff1;
	font-family: 'Inter';
	height: 100%;
	position: relative;

	& .chat-log {
		box-sizing: border-box;
		height: 100%;
		list-style: none;
		margin: 0;
		overflow-y: auto;
		overflow-wrap: anywhere;
		padding: 0 0 0.5rem;
	}

	& .chat-line {
		font-size: 0.8125rem;
		line-height: 1.4rem;
		padding: 0.3125rem 1.25rem 0.3125rem 0.625rem;

		&:nth-of-type(odd) {
			background-color: #191919;
		}

		&:nth-of-type(even) {
			background-color: #222;
		}

		&.chat-notice {
			background-color: #2f2445;
			border-left: 4px solid #9147ff;
			padding-left: calc(0.625rem - 4px);
		}

		&.chat-action .chat-body {
			color: var(--user-color);
		}
	}

	& .chat-time {
		color: #adadb8;
		font-size: 0.75rem;
		font-variant-numeric: tabular-nums;
		margin-right: 0.3125rem;
	}

	& .chat-badge {
		border-radius: 2px;
		height: 1.125rem;
		margin: -0.125rem 0.1875rem 0 0;
		vertical-align: middle;
		width: 1.125rem;
	}

	& .chat-name {
		color: var(--user-color);
		font-weight: 700;
		text-decoration: none;

		&:hover {
			text-decoration: underline;
		}
	}

	& .chat-sep {
		white-space: pre;
	}

	& .chat-emote {
		height: 1.75rem;
		margin: -0.3125rem 0;
		vertical-align: middle;
	}

	& .chat-link,
	& .chat-mention {
		text-decoration: none;
	}

	& .chat-mention {
		color: inherit;
		font-weight: 700;
		text-decoration: none;

		&:hover {
			text-decoration: underline;
		}
	}

	& .chat-link {
		color: #bf94ff;
		text-decoration: none;

		&:hover {
			text-decoration: underline;
		}
	}

	& .chat-resume {
		background: rgba(0, 0, 0, 0.45);
		border: none;
		border-radius: 4px;
		bottom: 0.75rem;
		color: #efeff1;
		cursor: pointer;
		font: inherit;
		font-size: 0.8125rem;
		font-weight: 700;
		left: 50%;
		padding: 0.4rem 1rem;
		position: absolute;
		transform: translateX(-50%);
		white-space: nowrap;

		&:hover {
			background: rgba(90, 90, 90, 0.55);
		}
	}
}
</style>
