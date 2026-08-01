export type MaterialKind = 'channelSplit' | 'flies' | 'liquidDistort' | 'rollingDistort' | 'slidingDoor';

export interface BlotterTextOptions {
	family?: string;
	size?: number;
	leading?: number;
	fill?: string;
	paddingLeft?: number;
	paddingRight?: number;
	paddingTop?: number;
	paddingBottom?: number;
}

export interface BlotterMaterialUniform {
	type: string;
	value: number | number[];
}

export interface BlotterMaterial {
	mainImage: string;
	uniforms: Record<string, BlotterMaterialUniform>;
}

export interface BlotterText {
	id: string;
	value: string;
	properties: BlotterTextOptions;
}

export interface BlotterOptions {
	texts: BlotterText | BlotterText[];
	autoplay?: boolean;
}

export interface BlotterRenderScope {
	domElement: HTMLCanvasElement;
	playing: boolean;
	appendTo: (element: HTMLElement) => void;
	play: () => void;
	pause: () => void;
}

export interface BlotterInstance {
	forText: (text: BlotterText) => BlotterRenderScope;
	setMaterial: (material: BlotterMaterial) => void;
	material: BlotterMaterial;
}

export interface ChannelSplitUniforms {
	uOffset: BlotterMaterialUniform;
	uRotation: BlotterMaterialUniform;
	uApplyBlur: BlotterMaterialUniform;
	uAnimateNoise: BlotterMaterialUniform;
}

export interface FliesUniforms {
	uPointCellWidth: BlotterMaterialUniform;
	uPointRadius: BlotterMaterialUniform;
	uDodge: BlotterMaterialUniform;
	uDodgePosition: BlotterMaterialUniform;
	uDodgeSpread: BlotterMaterialUniform;
	uSpeed: BlotterMaterialUniform;
}

export interface LiquidDistortUniforms {
	uSpeed: BlotterMaterialUniform;
	uVolatility: BlotterMaterialUniform;
	uSeed: BlotterMaterialUniform;
}

export interface RollingDistortUniforms {
	uSineDistortSpread: BlotterMaterialUniform;
	uSineDistortCycleCount: BlotterMaterialUniform;
	uSineDistortAmplitude: BlotterMaterialUniform;
	uNoiseDistortVolatility: BlotterMaterialUniform;
	uNoiseDistortAmplitude: BlotterMaterialUniform;
	uDistortPosition: BlotterMaterialUniform;
	uRotation: BlotterMaterialUniform;
	uSpeed: BlotterMaterialUniform;
}

export interface SlidingDoorUniforms {
	uDivisions: BlotterMaterialUniform;
	uDivisionWidth: BlotterMaterialUniform;
	uAnimateHorizontal: BlotterMaterialUniform;
	uFlipAnimationDirection: BlotterMaterialUniform;
	uSpeed: BlotterMaterialUniform;
}

export interface ChannelSplitMaterial extends BlotterMaterial {
	uniforms: BlotterMaterial['uniforms'] & ChannelSplitUniforms;
}

export interface FliesMaterial extends BlotterMaterial {
	uniforms: BlotterMaterial['uniforms'] & FliesUniforms;
}

export interface LiquidDistortMaterial extends BlotterMaterial {
	uniforms: BlotterMaterial['uniforms'] & LiquidDistortUniforms;
}

export interface RollingDistortMaterial extends BlotterMaterial {
	uniforms: BlotterMaterial['uniforms'] & RollingDistortUniforms;
}

export interface SlidingDoorMaterial extends BlotterMaterial {
	uniforms: BlotterMaterial['uniforms'] & SlidingDoorUniforms;
}

declare global {
	interface Window {
		Blotter?: {
			new (material: BlotterMaterial, options: BlotterOptions): BlotterInstance;

			Text: new (value: string, options?: BlotterTextOptions) => BlotterText;
			Material: new () => BlotterMaterial;

			ChannelSplitMaterial: new () => ChannelSplitMaterial;
			FliesMaterial: new () => FliesMaterial;
			LiquidDistortMaterial: new () => LiquidDistortMaterial;
			RollingDistortMaterial: new () => RollingDistortMaterial;
			SlidingDoorMaterial: new () => SlidingDoorMaterial;
		};
	}
}
