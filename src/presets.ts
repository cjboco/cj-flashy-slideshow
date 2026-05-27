import type { ResolvedOptions } from "./types";

export function applyPreset(preset: string, w: number, h: number): Partial<ResolvedOptions> {
	switch (preset) {
		case "cubism":
			return {
				xBlocks: Math.round(w / 100),
				yBlocks: Math.round(h / 100),
				minBlockSize: Math.round(w / 100) * 25,
				direction: "random",
				translucent: true,
				sloppy: true,
				delay: 3000,
			};
		case "rain":
			return {
				xBlocks: Math.round(w / 75),
				yBlocks: Math.round(h / 75),
				minBlockSize: 2,
				style: "rounded",
				direction: "top",
				translucent: false,
				sloppy: true,
				delay: 1250,
			};
		case "blinds":
			return {
				xBlocks: 1,
				yBlocks: Math.round(h / 15),
				minBlockSize: 0,
				style: "normal",
				direction: "top",
				translucent: false,
				sloppy: false,
				delay: 3000,
			};
		case "blinds2":
			return {
				xBlocks: Math.round(w / 15),
				yBlocks: 1,
				minBlockSize: 0,
				style: "normal",
				direction: "top",
				translucent: false,
				sloppy: false,
				delay: 3000,
			};
		case "transport":
			return {
				xBlocks: 1,
				yBlocks: Math.round(h / 10),
				minBlockSize: 0,
				style: "normal",
				direction: "top",
				translucent: true,
				sloppy: true,
				delay: 1250,
			};
		case "transport2":
			return {
				xBlocks: Math.round(w / 10),
				yBlocks: 1,
				minBlockSize: 0,
				style: "normal",
				direction: "top",
				translucent: true,
				sloppy: true,
				delay: 1250,
			};
		case "spiral":
			return {
				xBlocks: Math.round(w / 100),
				yBlocks: Math.round(h / 100),
				minBlockSize: Math.round(w / 100) * 10,
				direction: "random",
				style: "rounded",
				translucent: true,
				sloppy: true,
				rotation: 360,
				blur: 3,
				delay: 4000,
			};
		case "cascade":
			return {
				xBlocks: Math.round(w / 60),
				yBlocks: Math.round(h / 60),
				minBlockSize: 5,
				direction: "top",
				translucent: true,
				sloppy: true,
				rotation: 180,
				blur: 2,
				delay: 2500,
			};
		case "dissolve":
			return {
				xBlocks: Math.round(w / 80),
				yBlocks: Math.round(h / 80),
				minBlockSize: 2,
				direction: "none",
				translucent: true,
				sloppy: true,
				blur: 8,
				feather: 20,
				delay: 3000,
			};
		case "vortex":
			return {
				xBlocks: Math.round(w / 80),
				yBlocks: Math.round(h / 80),
				minBlockSize: Math.round(w / 100) * 4,
				direction: "random",
				style: "rounded",
				translucent: true,
				sloppy: true,
				rotation: 360,
				blur: 3,
				delay: 3000,
			};
		case "pixelate":
			return {
				xBlocks: Math.round(w / 20),
				yBlocks: Math.round(h / 20),
				minBlockSize: 0,
				direction: "none",
				sloppy: true,
				delay: 2000,
			};
		default:
			return {
				xBlocks: Math.round(w / 100),
				yBlocks: Math.round(h / 100),
				minBlockSize: 3,
				style: "normal",
				direction: "left",
				translucent: false,
				sloppy: false,
				delay: 3000,
			};
	}
}
