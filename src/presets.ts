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
