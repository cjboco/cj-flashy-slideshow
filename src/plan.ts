import type { BlockData, ResolvedOptions } from "./types";
import { calculateWipeStaggerDelay, isWipeDirection, randomRange } from "./utils";

export interface Rect {
	x: number;
	y: number;
	w: number;
	h: number;
}

// One tile's transition with all randomness resolved up front, so the DOM
// and GPU renderers play back identical motion.
export interface TilePlan {
	delay: number;
	phase1Duration: number;
	phase2Duration: number;
	initial: Rect;
	initialOpacity: number;
	// Phase 1 keyframes, evenly spaced
	path: Rect[];
	mid: Rect;
	expanded: Rect;
	// Same as expanded unless feathered, where the mask is inflated so the
	// soft edges end up outside the cell
	final: Rect;
	opacity: number;
	// Degrees, spun back to 0 during phase 2 around (originX, originY)
	tileRotation: number;
	originX: number;
	originY: number;
}

export function planTile(
	b: BlockData,
	opts: ResolvedOptions,
	blockW: number,
	blockH: number,
	rounded: boolean,
	feathered: boolean,
): TilePlan {
	const isWipe = isWipeDirection(opts.currentDirection);
	const mbs = opts.initialTileSize;

	const midX =
		blockW * b.x + blockW / 2 - mbs / 2 + (opts.randomize ? randomRange(0, mbs) - mbs / 2 : 0);
	const midY =
		blockH * b.y + blockH / 2 - mbs / 2 + (opts.randomize ? randomRange(0, mbs) - mbs / 2 : 0);
	const mid = { x: midX, y: midY, w: mbs, h: mbs };

	const pathVariance = opts.randomize ? (opts.pathSpeed * opts.randomness) / 100 : 0;
	const tileVariance = opts.randomize ? (opts.tileSpeed * opts.randomness) / 100 : 0;
	const phase1Duration = opts.randomize
		? randomRange(Math.max(50, opts.pathSpeed - pathVariance), opts.pathSpeed + pathVariance)
		: opts.pathSpeed;
	const phase2Duration = opts.randomize
		? randomRange(Math.max(50, opts.tileSpeed - tileVariance), opts.tileSpeed + tileVariance)
		: opts.tileSpeed;

	// Spiral path via pathRotation
	const pathRotation =
		opts.randomize && opts.pathRotation !== 0
			? opts.pathRotation + randomRange(-180, 180)
			: opts.pathRotation;

	const path: Rect[] = [];
	if (pathRotation === 0) {
		path.push({ x: b.startLeft, y: b.startTop, w: mbs, h: mbs }, mid);
	} else {
		const startCX = b.startLeft + mbs / 2;
		const startCY = b.startTop + mbs / 2;
		const midCX = midX + mbs / 2;
		const midCY = midY + mbs / 2;
		const dx = startCX - midCX;
		const dy = startCY - midCY;
		const startAngle = Math.atan2(dy, dx);
		const startRadius = Math.sqrt(dx * dx + dy * dy);
		const rotRad = (pathRotation * Math.PI) / 180;
		const steps = Math.max(8, Math.ceil(Math.abs(pathRotation) / 30));

		for (let k = 0; k <= steps; k++) {
			const t = k / steps;
			const angle = startAngle + rotRad * t;
			const radius = startRadius * (1 - t);
			path.push({
				x: midCX + Math.cos(angle) * radius - mbs / 2,
				y: midCY + Math.sin(angle) * radius - mbs / 2,
				w: mbs,
				h: mbs,
			});
		}
	}

	// Phase 2: expand from small at center to full cell
	let expanded: Rect;
	if (opts.tileExact) {
		expanded = { x: blockW * b.x, y: blockH * b.y, w: blockW, h: blockH };
	} else if (rounded) {
		const cx = blockW * b.x + blockW / 2;
		const cy = blockH * b.y + blockH / 2;
		const bigR = Math.ceil(Math.hypot(blockW, blockH));
		expanded = { x: cx - bigR, y: cy - bigR, w: bigR * 2, h: bigR * 2 };
	} else {
		expanded = { x: b.endLeft, y: b.endTop, w: blockW * 2, h: blockH * 2 };
	}

	let final = expanded;
	if (feathered) {
		const inflate = opts.feather / 100;
		const padW = expanded.w * inflate;
		const padH = expanded.h * inflate;
		final = {
			x: expanded.x - padW,
			y: expanded.y - padH,
			w: expanded.w + padW * 2,
			h: expanded.h + padH * 2,
		};
	}

	const tileRotation =
		opts.randomize && opts.tileRotation !== 0
			? opts.tileRotation + randomRange(-180, 180)
			: opts.tileRotation;

	const initSize = isWipe ? 0 : mbs;

	return {
		delay: isWipe
			? calculateWipeStaggerDelay(
					b.x,
					b.y,
					opts.xBlocks,
					opts.yBlocks,
					opts.currentDirection,
					opts.pathSpeed * 2,
				)
			: 0,
		phase1Duration,
		phase2Duration,
		initial: { x: b.startLeft, y: b.startTop, w: initSize, h: initSize },
		initialOpacity: isWipe ? 0 : b.opacity,
		path,
		mid,
		expanded,
		final,
		opacity: b.opacity,
		tileRotation,
		originX: blockW * b.x + blockW / 2,
		originY: blockH * b.y + blockH / 2,
	};
}
