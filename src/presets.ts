import type { ResolvedOptions } from "./types";

export function applyPreset(preset: string, w: number, h: number): Partial<ResolvedOptions> {
	switch (preset) {
		case "cubism":
			return {
				xBlocks: Math.round(w / 100),
				yBlocks: Math.round(h / 100),
				initialTileSize: Math.round(w / 100) * 25,
				direction: "random",
				translucent: true,
				randomize: true,
				delay: 3000,
			};
		case "rain":
			return {
				xBlocks: Math.round(w / 75),
				yBlocks: Math.round(h / 75),
				initialTileSize: 2,
				style: "rounded",
				direction: "top",
				translucent: false,
				randomize: true,
				delay: 1250,
			};
		case "blinds":
			return {
				xBlocks: 1,
				yBlocks: Math.round(h / 15),
				initialTileSize: 0,
				style: "normal",
				direction: "top",
				translucent: false,
				randomize: false,
				delay: 3000,
			};
		case "blinds2":
			return {
				xBlocks: Math.round(w / 15),
				yBlocks: 1,
				initialTileSize: 0,
				style: "normal",
				direction: "top",
				translucent: false,
				randomize: false,
				delay: 3000,
			};
		case "transport":
			return {
				xBlocks: 1,
				yBlocks: Math.round(h / 10),
				initialTileSize: 0,
				style: "normal",
				direction: "top",
				translucent: true,
				randomize: true,
				delay: 1250,
			};
		case "transport2":
			return {
				xBlocks: Math.round(w / 10),
				yBlocks: 1,
				initialTileSize: 0,
				style: "normal",
				direction: "top",
				translucent: true,
				randomize: true,
				delay: 1250,
			};
		case "spiral":
			return {
				xBlocks: Math.round(w / 100),
				yBlocks: Math.round(h / 100),
				initialTileSize: Math.round(w / 100) * 10,
				direction: "random",
				style: "rounded",
				translucent: true,
				randomize: true,
				pathRotation: 360,
				pathBlur: 3,
				delay: 4000,
			};
		case "cascade":
			return {
				xBlocks: Math.round(w / 60),
				yBlocks: Math.round(h / 60),
				initialTileSize: 5,
				direction: "top",
				translucent: true,
				randomize: true,
				pathRotation: 180,
				pathBlur: 2,
				delay: 2500,
			};
		case "dissolve":
			return {
				xBlocks: Math.round(w / 80),
				yBlocks: Math.round(h / 80),
				initialTileSize: 2,
				direction: "none",
				translucent: true,
				randomize: true,
				pathBlur: 8,
				feather: 20,
				delay: 3000,
			};
		case "vortex":
			return {
				xBlocks: Math.round(w / 80),
				yBlocks: Math.round(h / 80),
				initialTileSize: Math.round(w / 100) * 4,
				direction: "random",
				style: "rounded",
				translucent: true,
				randomize: true,
				pathRotation: 360,
				pathBlur: 3,
				delay: 3000,
			};
		case "pixelate":
			return {
				xBlocks: Math.round(w / 20),
				yBlocks: Math.round(h / 20),
				initialTileSize: 0,
				direction: "none",
				randomize: true,
				delay: 2000,
			};
		case "wipe":
			return {
				xBlocks: Math.round(w / 50),
				yBlocks: Math.round(h / 50),
				initialTileSize: 0,
				direction: "wipeLeft",
				style: "normal",
				translucent: false,
				randomize: true,
				randomness: 30,
				delay: 3000,
			};
		case "wipeDissolve":
			return {
				xBlocks: Math.round(w / 60),
				yBlocks: Math.round(h / 60),
				initialTileSize: 0,
				direction: "wipeLeft",
				style: "rounded",
				translucent: true,
				randomize: true,
				randomness: 60,
				pathBlur: 4,
				feather: 15,
				delay: 3000,
			};
		default:
			return {
				xBlocks: Math.round(w / 100),
				yBlocks: Math.round(h / 100),
				initialTileSize: 3,
				style: "normal",
				direction: "left",
				translucent: false,
				randomize: false,
				delay: 3000,
			};
	}
}
