<script setup lang="ts">
defineProps<{
	position: 'top' | 'bottom';
}>();
</script>

<template>
	<div class="container">
		<template v-if="position === 'top'">
			<a href="/gongor"
				><img id="Gongor" alt="gongor from everquest" src="@/assets/images/emotes/7tv/Gongor.avif"
			/></a>
			<img id="mornReal" alt="morn from star-trek spinning" src="@/assets/images/emotes/bttv/mornReal.webp" />
			<img
				id="actualEntertainment"
				alt="description of gongo: actual entertainment"
				src="@/assets/images/actualEntertainment.avif" />
			<img
				id="sphynxHeart"
				alt="color changing text that reads: sphynx &lt;3"
				src="@/assets/images/sphynxHeart.avif" />
		</template>
		<template v-else>
			<img id="sppL" alt="super tiny sphynx" src="@/assets/images/emotes/7tv/sppL.avif" />
			<img
				id="honseWalk"
				alt="fat horse walking in a circle around a bottle of glue"
				src="@/assets/images/emotes/bttv/honseWalk.webp" />
			<img id="patGlu" alt="bottle of glue" src="@/assets/images/emotes/bttv/patGlu.webp" />
			<img
				id="bounceDoc"
				alt="doc from star-trek bouncing up and down"
				src="@/assets/images/emotes/bttv/bounceDoc.webp" />
			<img
				id="bounceDok"
				alt="dok from star-trek bouncing up and down"
				src="@/assets/images/emotes/bttv/bounceDok.webp" />
			<img
				id="phloxB"
				alt="phlox from star-trek suppressing his laughter(?)"
				src="@/assets/images/emotes/bttv/phloxB.webp" />
			<img id="tuvokLUL" alt="tuvok from star-trek looking up" src="@/assets/images/emotes/bttv/tuvokLUL.webp" />
			<a href="/deltasleep">
				<img
					id="daxMug"
					alt="mug of jadzia dax from star-trek staring at you from behind tuvok"
					src="@/assets/images/emotes/bttv/daxMug.webp" />
			</a>
		</template>
	</div>
</template>

<style scoped>
.container {
	inset: 0;
	pointer-events: none;
	position: fixed;
	z-index: 420;

	img {
		&#Gongor {
			left: 0;
			position: absolute;
			top: 0;
			width: 4rem;
			z-index: 0;

			@media (max-width: 480px) {
				width: 3rem;
			}
		}

		&#mornReal {
			left: 4rem;
			position: absolute;
			top: 0;
			transform: scale(1, -1);
			width: 4rem;
			z-index: 0;

			@media (max-width: 480px) {
				left: 3rem;
				width: 3rem;
			}
		}

		&#actualEntertainment {
			right: 0;
			position: absolute;
			top: 0;
			height: 2rem;

			@media (max-width: 480px) {
				height: 1.5rem;
			}
		}

		&#sphynxHeart {
			position: absolute;
			right: 0.69rem;
			top: 2rem;

			@media (max-width: 480px) {
				right: 0.2rem;
				top: 1.5rem;
			}
		}

		&#sppL {
			bottom: 0;
			left: 0;
			position: absolute;
			width: 1.5rem;

			@media (max-width: 480px) {
				width: 1rem;
			}
		}

		&#honseWalk {
			bottom: 0.42rem;
			left: 0.5rem;
			position: absolute;
			width: 12rem;
			z-index: 1;

			@media (max-width: 480px) {
				width: 7rem;
			}
		}

		&#patGlu {
			bottom: 0;
			left: 4.2rem;
			position: absolute;
			width: 3rem;
			z-index: 0;

			@media (max-width: 480px) {
				left: 2.8rem;
				width: 2rem;
			}
		}

		&#bounceDoc {
			bottom: -2rem;
			position: absolute;
			right: 11rem;
			width: 5rem;

			@media (max-width: 480px) {
				bottom: -1.4rem;
				right: 7rem;
				width: 3.5rem;
			}
		}

		&#bounceDok {
			bottom: -1rem;
			height: 4.2rem;
			position: absolute;
			right: 15.45rem;
			width: 3rem;

			@media (max-width: 480px) {
				bottom: -0.7rem;
				height: auto;
				right: 10rem;
				width: 2rem;
			}
		}

		&#phloxB {
			bottom: 0;
			position: absolute;
			right: 5.75rem;
			width: 5rem;

			@media (max-width: 480px) {
				right: 3.5rem;
				width: 3.5rem;
			}
		}

		&#tuvokLUL {
			bottom: 0;
			position: absolute;
			right: -0.6rem;
			width: 6.5rem;
			z-index: 1;

			@media (max-width: 480px) {
				right: -0.4rem;
				width: 4.5rem;
			}
		}

		&#daxMug {
			bottom: -0.3rem;
			pointer-events: auto;
			position: absolute;
			right: -0.5rem;
			width: 2rem;
			z-index: 0;

			@media (max-width: 480px) {
				right: -0.3rem;
				width: 1.5rem;
			}
		}
	}
}
</style>
