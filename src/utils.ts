import type { BlockData, Direction, ResolvedOptions } from "./types";

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
	initialTileSize: number,
	w: number,
	h: number,
): { startTop: number; startLeft: number } {
	switch (direction) {
		case "top":
			return {
				startTop: initialTileSize * -1,
				startLeft: blockW * x + blockW / 2 - initialTileSize / 2,
			};
		case "topleft":
			return {
				startTop: initialTileSize * -1,
				startLeft: initialTileSize * -1,
			};
		case "topright":
			return {
				startTop: initialTileSize * -1,
				startLeft: w + initialTileSize,
			};
		case "left":
			return {
				startTop: blockH * y + blockH / 2 - initialTileSize / 2,
				startLeft: initialTileSize * -1,
			};
		case "bottom":
			return {
				startTop: h + initialTileSize,
				startLeft: blockW * x + blockW / 2 - initialTileSize / 2,
			};
		case "bottomleft":
			return {
				startTop: h + initialTileSize,
				startLeft: initialTileSize * -1,
			};
		case "bottomright":
			return {
				startTop: h + initialTileSize,
				startLeft: w + initialTileSize,
			};
		case "right":
			return {
				startTop: blockH * y + blockH / 2 - initialTileSize / 2,
				startLeft: w + initialTileSize,
			};
		default:
			return {
				startTop: blockH * y + blockH / 2 - initialTileSize / 2,
				startLeft: blockW * x + blockW / 2 - initialTileSize / 2,
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
		opts.initialTileSize,
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
		initialTileSize?: number;
		delay?: number;
		direction?: Direction;
		style?: "normal" | "rounded";
		translucent?: boolean;
		randomize?: boolean;
		randomness?: number;
		pathSpeed?: number;
		pathRotation?: number;
		pathBlur?: number;
		tileSpeed?: number;
		tileRotation?: number;
		tileBlur?: number;
		tileExact?: boolean;
		feather?: number;
	},
	w: number,
	h: number,
	presetOverrides: Partial<ResolvedOptions>,
): ResolvedOptions {
	let xBlocks = presetOverrides.xBlocks ?? props.xBlocks ?? 12;
	let yBlocks = presetOverrides.yBlocks ?? props.yBlocks ?? 3;
	let initialTileSize = presetOverrides.initialTileSize ?? props.initialTileSize ?? 3;
	const delay = presetOverrides.delay ?? props.delay ?? 3000;
	const direction = presetOverrides.direction ?? props.direction ?? "left";
	const style = presetOverrides.style ?? props.style ?? "normal";
	const translucent = presetOverrides.translucent ?? props.translucent ?? false;
	const randomize = presetOverrides.randomize ?? props.randomize ?? false;
	const randomness = presetOverrides.randomness ?? props.randomness ?? 50;
	const pathSpeed = presetOverrides.pathSpeed ?? props.pathSpeed ?? 650;
	const pathRotation = presetOverrides.pathRotation ?? props.pathRotation ?? 0;
	const pathBlur = presetOverrides.pathBlur ?? props.pathBlur ?? 0;
	const tileSpeed = presetOverrides.tileSpeed ?? props.tileSpeed ?? 650;
	const tileRotation = presetOverrides.tileRotation ?? props.tileRotation ?? 0;
	const tileBlur = presetOverrides.tileBlur ?? props.tileBlur ?? 0;
	const tileExact = presetOverrides.tileExact ?? props.tileExact ?? false;
	const feather = presetOverrides.feather ?? props.feather ?? 0;

	xBlocks = typeof xBlocks !== "number" ? 3 : xBlocks < 1 ? 1 : xBlocks;
	yBlocks = typeof yBlocks !== "number" ? 3 : yBlocks < 1 ? 1 : yBlocks;
	initialTileSize = typeof initialTileSize !== "number" ? 5 : initialTileSize < 0 ? 0 : initialTileSize;

	if (w > h && initialTileSize > w) initialTileSize = w;
	else if (initialTileSize > h) initialTileSize = h;

	const currentDirection = direction === "random" ? getRandomDirection() : direction;

	return {
		xBlocks,
		yBlocks,
		initialTileSize,
		delay: typeof delay !== "number" ? 3000 : delay < 0 ? 0 : delay,
		direction,
		currentDirection,
		style: style !== "rounded" ? "normal" : "rounded",
		translucent: typeof translucent !== "boolean" ? false : translucent,
		randomize: typeof randomize !== "boolean" ? false : randomize,
		randomness: typeof randomness !== "number" ? 50 : Math.max(0, Math.min(100, randomness)),
		pathSpeed: initialTileSize === 0 && !isWipeDirection(currentDirection) ? 0 : (typeof pathSpeed !== "number" ? 650 : Math.max(100, Math.min(2500, pathSpeed))),
		pathRotation: initialTileSize === 0 && !isWipeDirection(currentDirection) ? 0 : (typeof pathRotation !== "number" ? 0 : pathRotation),
		pathBlur: initialTileSize === 0 && !isWipeDirection(currentDirection) ? 0 : (typeof pathBlur !== "number" ? 0 : Math.max(0, pathBlur)),
		tileSpeed: typeof tileSpeed !== "number" ? 650 : Math.max(100, Math.min(2500, tileSpeed)),
		tileRotation: typeof tileRotation !== "number" ? 0 : tileRotation,
		tileBlur: typeof tileBlur !== "number" ? 0 : Math.max(0, tileBlur),
		tileExact: typeof tileExact !== "boolean" ? false : tileExact,
		feather: typeof feather !== "number" ? 0 : Math.max(0, Math.min(50, feather)),
	};
}
