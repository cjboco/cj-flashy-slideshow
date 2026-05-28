import type { BlockData, Direction, ResolvedOptions, RotationMode } from "./types";

const DIRECTIONS: Direction[] = [
	"top",
	"topleft",
	"topright",
	"left",
	"bottom",
	"bottomleft",
	"bottomright",
	"right",
];

const WIPE_DIRECTIONS: Direction[] = [
	"wipeLeft",
	"wipeRight",
	"wipeTop",
	"wipeBottom",
	"wipeTopLeft",
	"wipeTopRight",
	"wipeBottomLeft",
	"wipeBottomRight",
];

export function isWipeDirection(dir: Direction): boolean {
	return (WIPE_DIRECTIONS as string[]).includes(dir);
}

export function getWipeFlightDirection(_dir: Direction): Direction {
	return "none";
}

export function calculateWipeStaggerDelay(
	x: number,
	y: number,
	xBlocks: number,
	yBlocks: number,
	dir: Direction,
	totalSpread: number,
): number {
	let progress: number;
	const maxX = Math.max(1, xBlocks - 1);
	const maxY = Math.max(1, yBlocks - 1);
	const maxDiag = Math.max(1, maxX + maxY);

	switch (dir) {
		case "wipeLeft":
			progress = x / maxX;
			break;
		case "wipeRight":
			progress = (maxX - x) / maxX;
			break;
		case "wipeTop":
			progress = y / maxY;
			break;
		case "wipeBottom":
			progress = (maxY - y) / maxY;
			break;
		case "wipeTopLeft":
			progress = (x + y) / maxDiag;
			break;
		case "wipeTopRight":
			progress = ((maxX - x) + y) / maxDiag;
			break;
		case "wipeBottomLeft":
			progress = (x + (maxY - y)) / maxDiag;
			break;
		case "wipeBottomRight":
			progress = ((maxX - x) + (maxY - y)) / maxDiag;
			break;
		default:
			progress = 0;
	}

	return progress * totalSpread;
}

export function randomRange(a: number, b: number, decimals?: number): number {
	const v = a + Math.random() * (b - a);
	return decimals === undefined ? Math.round(v) : Number.parseFloat(v.toFixed(decimals));
}

export function getRandomDirection(): Direction {
	return DIRECTIONS[randomRange(0, DIRECTIONS.length - 1)];
}

export function calculateStartPosition(
	direction: Direction,
	x: number,
	y: number,
	blockW: number,
	blockH: number,
	minBlockSize: number,
	w: number,
	h: number,
): { startTop: number; startLeft: number } {
	switch (direction) {
		case "top":
			return {
				startTop: minBlockSize * -1,
				startLeft: blockW * x + blockW / 2 - minBlockSize / 2,
			};
		case "topleft":
			return {
				startTop: minBlockSize * -1,
				startLeft: minBlockSize * -1,
			};
		case "topright":
			return {
				startTop: minBlockSize * -1,
				startLeft: w + minBlockSize,
			};
		case "left":
			return {
				startTop: blockH * y + blockH / 2 - minBlockSize / 2,
				startLeft: minBlockSize * -1,
			};
		case "bottom":
			return {
				startTop: h + minBlockSize,
				startLeft: blockW * x + blockW / 2 - minBlockSize / 2,
			};
		case "bottomleft":
			return {
				startTop: h + minBlockSize,
				startLeft: minBlockSize * -1,
			};
		case "bottomright":
			return {
				startTop: h + minBlockSize,
				startLeft: w + minBlockSize,
			};
		case "right":
			return {
				startTop: blockH * y + blockH / 2 - minBlockSize / 2,
				startLeft: w + minBlockSize,
			};
		default:
			return {
				startTop: blockH * y + blockH / 2 - minBlockSize / 2,
				startLeft: blockW * x + blockW / 2 - minBlockSize / 2,
			};
	}
}

export function createBlockData(
	x: number,
	y: number,
	blockW: number,
	blockH: number,
	opts: ResolvedOptions,
	w: number,
	h: number,
): BlockData {
	const dir = opts.direction === "random"
		? getRandomDirection()
		: isWipeDirection(opts.currentDirection)
			? getWipeFlightDirection(opts.currentDirection)
			: opts.currentDirection;
	const { startTop, startLeft } = calculateStartPosition(
		dir,
		x,
		y,
		blockW,
		blockH,
		opts.minBlockSize,
		w,
		h,
	);

	return {
		x,
		y,
		startTop,
		startLeft,
		endTop: blockH * y - blockH / 2,
		endLeft: blockW * x - blockW / 2,
		opacity: opts.translucent ? randomRange(0.1, 0.5, 2) : 1,
	};
}

export function resolveOptions(
	props: {
		preset?: string;
		xBlocks?: number;
		yBlocks?: number;
		minBlockSize?: number;
		delay?: number;
		direction?: Direction;
		style?: "normal" | "rounded";
		translucent?: boolean;
		randomize?: boolean;
		speed?: number;
		randomness?: number;
		rotation?: number;
		rotationMode?: RotationMode;
		blur?: number;
		feather?: number;
	},
	w: number,
	h: number,
	presetOverrides: Partial<ResolvedOptions>,
): ResolvedOptions {
	let xBlocks = presetOverrides.xBlocks ?? props.xBlocks ?? 12;
	let yBlocks = presetOverrides.yBlocks ?? props.yBlocks ?? 3;
	let minBlockSize = presetOverrides.minBlockSize ?? props.minBlockSize ?? 3;
	const delay = presetOverrides.delay ?? props.delay ?? 3000;
	const direction = presetOverrides.direction ?? props.direction ?? "left";
	const style = presetOverrides.style ?? props.style ?? "normal";
	const translucent = presetOverrides.translucent ?? props.translucent ?? false;
	const randomize = presetOverrides.randomize ?? props.randomize ?? false;
	const speed = presetOverrides.speed ?? props.speed ?? 650;
	const randomness = presetOverrides.randomness ?? props.randomness ?? 50;
	const rotation = presetOverrides.rotation ?? props.rotation ?? 0;
	const rotationMode = presetOverrides.rotationMode ?? props.rotationMode ?? "path";
	const blur = presetOverrides.blur ?? props.blur ?? 0;
	const feather = presetOverrides.feather ?? props.feather ?? 0;

	xBlocks = typeof xBlocks !== "number" ? 3 : xBlocks < 1 ? 1 : xBlocks;
	yBlocks = typeof yBlocks !== "number" ? 3 : yBlocks < 1 ? 1 : yBlocks;
	minBlockSize = typeof minBlockSize !== "number" ? 5 : minBlockSize < 0 ? 0 : minBlockSize;

	if (w > h && minBlockSize > w) minBlockSize = w;
	else if (minBlockSize > h) minBlockSize = h;

	const currentDirection = direction === "random" ? getRandomDirection() : direction;

	return {
		xBlocks,
		yBlocks,
		minBlockSize,
		delay: typeof delay !== "number" ? 3000 : delay < 0 ? 0 : delay,
		direction,
		currentDirection,
		style: style !== "rounded" ? "normal" : "rounded",
		translucent: typeof translucent !== "boolean" ? false : translucent,
		randomize: typeof randomize !== "boolean" ? false : randomize,
		speed: typeof speed !== "number" ? 650 : Math.max(100, Math.min(2500, speed)),
		randomness: typeof randomness !== "number" ? 50 : Math.max(0, Math.min(100, randomness)),
		rotation: typeof rotation !== "number" ? 0 : rotation,
		rotationMode: minBlockSize === 0 ? "tile" : (rotationMode === "tile" ? "tile" : "path"),
		blur: typeof blur !== "number" ? 0 : Math.max(0, blur),
		feather: typeof feather !== "number" ? 0 : Math.max(0, Math.min(50, feather)),
	};
}
