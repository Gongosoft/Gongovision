import { Pane } from 'tweakpane';
import { css, plugins as essentialsPlugins, id } from '@tweakpane/plugin-essentials';
import type { FolderApi } from 'tweakpane';

/** how long a flashed button caption stays up */
const FLASH_MS = 1200;

/** creates a pane in `container` with the essentials plugin, plus its title bar for dragging */
export function createPane(container: HTMLElement, title: string): { pane: Pane; handle: HTMLElement | null } {
	const pane = new Pane({ container, title });
	pane.registerPlugin({ id, css, plugins: essentialsPlugins });
	return { pane, handle: pane.element.querySelector<HTMLElement>('.tp-rotv_b') };
}

/** Tweakpane has no tooltip option, so the blade's own row element carries the `title` */
export function hint<T extends { element: HTMLElement }>(blade: T, text: string): T {
	blade.element.title = text;
	return blade;
}

/** `SmallPyramid` reads better as `Small Pyramid` in a label */
export function pretty(key: string): string {
	return key.replaceAll(/(?<lower>[a-z])(?<upper>[A-Z])/g, '$<lower> $<upper>');
}

/** a horizontal rule between groups of related bindings */
export function divider(folder: FolderApi): void {
	folder.addBlade({ view: 'separator' }).element.classList.add('tp-divider');
}

const flashes = new WeakMap<{ title: string }, { original: string; timer?: ReturnType<typeof setTimeout> }>();

/** temporarily replaces a button's caption (its `title`) with `text`, then restores it */
export function flashTitle(target: { title: string } | null, text: string): void {
	if (!target) {
		return;
	}
	const state = flashes.get(target) ?? { original: target.title };
	if (state.timer !== undefined) {
		clearTimeout(state.timer);
	}
	target.title = text;
	state.timer = setTimeout(() => {
		target.title = state.original;
		flashes.delete(target);
	}, FLASH_MS);
	flashes.set(target, state);
}

interface InlineButtonOptions {
	/** tooltip and accessible name */
	label: string;
	/** button caption */
	text: string;
	className: string;
	onClick: () => void;
}

/** slots a compact button into a binding's value cell */
export function inlineButton(
	blade: { element: HTMLElement },
	{ label, text, className, onClick }: InlineButtonOptions
): HTMLButtonElement {
	const button = document.createElement('button');
	button.type = 'button';
	button.className = `tp-btnv_b ${className}`;
	button.textContent = text;
	button.title = label;
	button.setAttribute('aria-label', label);
	button.addEventListener('click', (event) => {
		event.preventDefault();
		onClick();
	});
	blade.element.querySelector<HTMLElement>('.tp-lblv_v')?.appendChild(button);
	return button;
}
