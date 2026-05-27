import { Children, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { applyPreset } from "./presets";
import type { BlockData, FlashySlideshowProps, ResolvedOptions } from "./types";
import {
	calculateStartPosition,
	createBlockData,
	getRandomDirection,
	randomRange,
	resolveOptions,
} from "./utils";

interface AnimState {
	currentSlide: number;
	nextSlide: number;
	completedBlocks: number;
	totalBlocks: number;
	blocks: BlockData[];
	opts: ResolvedOptions;
	blockW: number;
	blockH: number;
	timer: ReturnType<typeof setTimeout> | null;
	animating: boolean;
	mounted: boolean;
}

function computeClipInset(
	top: number,
	left: number,
	bWidth: number,
	bHeight: number,
	w: number,
	h: number,
	rounded: boolean,
): string {
	const insetTop = Math.max(0, top);
	const insetLeft = Math.max(0, left);
	const insetBottom = Math.max(0, h - (top + bHeight));
	const insetRight = Math.max(0, w - (left + bWidth));

	if (rounded) {
		const radius = Math.min(bWidth, bHeight) / 2;
		return `inset(${insetTop}px ${insetRight}px ${insetBottom}px ${insetLeft}px round ${radius}px)`;
	}

	return `inset(${insetTop}px ${insetRight}px ${insetBottom}px ${insetLeft}px)`;
}

export function FlashySlideshow({
	children,
	width,
	height,
	preset,
	xBlocks,
	yBlocks,
	minBlockSize,
	delay,
	direction,
	style,
	translucent,
	sloppy,
	className,
	onSlideChange,
}: FlashySlideshowProps) {
	const slides = Children.toArray(children);
	const stateRef = useRef<AnimState | null>(null);
	const blockRefsRef = useRef<(HTMLDivElement | null)[]>([]);
	const onSlideChangeRef = useRef(onSlideChange);
	onSlideChangeRef.current = onSlideChange;

	const [currentSlide, setCurrentSlide] = useState(0);
	const [nextSlide, setNextSlide] = useState(1);
	const [showBlocks, setShowBlocks] = useState(false);

	const slideCount = slides.length;

	const getNextSlideIndex = useCallback(
		(current: number) => (current + 1 < slideCount ? current + 1 : 0),
		[slideCount],
	);

	// Compute options and block data (memoized to keep stable references)
	const opts = useMemo(() => {
		const presetOverrides = preset ? applyPreset(preset, width, height) : {};
		return resolveOptions(
			{ preset, xBlocks, yBlocks, minBlockSize, delay, direction, style, translucent, sloppy },
			width,
			height,
			presetOverrides,
		);
	}, [preset, xBlocks, yBlocks, minBlockSize, delay, direction, style, translucent, sloppy, width, height]);

	const blockW = Math.ceil(width / opts.xBlocks);
	const blockH = Math.ceil(height / opts.yBlocks);
	const totalBlocks = opts.xBlocks * opts.yBlocks;
	const rounded = opts.style === "rounded";

	// Build block data (memoized for stable reference)
	const blocks = useMemo(() => {
		const result: BlockData[] = [];
		for (let y = 0; y < opts.yBlocks; y++) {
			for (let x = 0; x < opts.xBlocks; x++) {
				result.push(createBlockData(x, y, blockW, blockH, opts, width, height));
			}
		}
		return result;
	}, [opts, blockW, blockH, width, height]);

	// Animation effect
	useEffect(() => {
		if (slideCount < 2) return;

		const state: AnimState = {
			currentSlide: 0,
			nextSlide: 1,
			completedBlocks: 0,
			totalBlocks,
			blocks,
			opts,
			blockW,
			blockH,
			timer: null,
			animating: false,
			mounted: true,
		};
		stateRef.current = state;

		function getBlockEls(): HTMLDivElement[] {
			return blockRefsRef.current.filter((el): el is HTMLDivElement => el !== null);
		}

		function resetBlocks() {
			const nextIdx = getNextSlideIndex(state.currentSlide);
			state.nextSlide = nextIdx;

			const blockEls = getBlockEls();

			for (let i = 0; i < blocks.length; i++) {
				const b = blocks[i];

				if (opts.direction === "random") {
					const dir = getRandomDirection();
					const pos = calculateStartPosition(
						dir,
						b.x,
						b.y,
						blockW,
						blockH,
						opts.minBlockSize,
						width,
						height,
					);
					b.startTop = pos.startTop;
					b.startLeft = pos.startLeft;
				}

				const el = blockEls[i];
				if (!el) continue;

				// Position clip at the start location (off-screen or edge)
				el.style.clipPath = computeClipInset(
					b.startTop,
					b.startLeft,
					opts.minBlockSize,
					opts.minBlockSize,
					width,
					height,
					rounded,
				);
				el.style.opacity = String(b.opacity);
			}

			setNextSlide(nextIdx);
		}

		function animateBlocks() {
			if (!state.mounted) return;
			state.completedBlocks = 0;
			state.animating = true;

			// Reset block positions while still hidden
			resetBlocks();

			setNextSlide(state.nextSlide);
			setShowBlocks(true);

			// Wait a frame so React renders the block content
			requestAnimationFrame(() => {
				if (!state.mounted) return;

				const blockEls = getBlockEls();

				for (let i = 0; i < blocks.length; i++) {
					const b = blocks[i];
					const el = blockEls[i];
					if (!el) continue;

					const midCenterX =
						blockW * b.x +
						blockW / 2 -
						opts.minBlockSize / 2 +
						(opts.sloppy ? randomRange(0, opts.minBlockSize) - opts.minBlockSize / 2 : 0);
					const midCenterY =
						blockH * b.y +
						blockH / 2 -
						opts.minBlockSize / 2 +
						(opts.sloppy ? randomRange(0, opts.minBlockSize) - opts.minBlockSize / 2 : 0);

					const phase1Duration = opts.sloppy ? randomRange(350, 1250) : 650;
					const phase2Duration = opts.sloppy ? randomRange(250, 850) : 650;

					const startClip = computeClipInset(
						b.startTop,
						b.startLeft,
						opts.minBlockSize,
						opts.minBlockSize,
						width,
						height,
						rounded,
					);

					const midClip = computeClipInset(
						midCenterY,
						midCenterX,
						opts.minBlockSize,
						opts.minBlockSize,
						width,
						height,
						rounded,
					);

					// Phase 1: move clip from start position to grid center
					const phase1 = el.animate(
						[
							{ clipPath: startClip },
							{ clipPath: midClip },
						],
						{ duration: phase1Duration, easing: "linear", fill: "forwards" },
					);

					phase1.onfinish = () => {
						if (!state.mounted) return;

						// Phase 2: expand clip from small at center to full cell
						const expandedClip = computeClipInset(
							b.endTop,
							b.endLeft,
							blockW * 2,
							blockH * 2,
							width,
							height,
							false,
						);

						const phase2 = el.animate(
							[
								{
									clipPath: midClip,
									opacity: String(b.opacity),
								},
								{
									clipPath: expandedClip,
									opacity: "1",
								},
							],
							{ duration: phase2Duration, fill: "forwards" },
						);

						phase2.onfinish = () => {
							if (!state.mounted) return;

							el.style.clipPath = expandedClip;
							el.style.opacity = "1";
							phase1.cancel();
							phase2.cancel();

							state.completedBlocks++;

							if (state.completedBlocks === state.totalBlocks) {
								const nextIdx = state.nextSlide;
								state.currentSlide = nextIdx;
								setCurrentSlide(nextIdx);
								setShowBlocks(false);

								onSlideChangeRef.current?.(state.currentSlide);

								state.timer = setTimeout(() => {
									if (state.mounted) animateBlocks();
								}, opts.delay);
							}
						};
					};
				}
			});
		}

		// Initialize
		state.timer = setTimeout(() => {
			if (state.mounted) animateBlocks();
		}, opts.delay);

		return () => {
			state.mounted = false;
			if (state.timer) clearTimeout(state.timer);

			const blockEls = getBlockEls();
			for (const el of blockEls) {
				for (const anim of el.getAnimations()) {
					anim.cancel();
				}
			}
		};
	}, [
		slideCount,
		width,
		height,
		totalBlocks,
		blocks,
		opts,
		blockW,
		blockH,
		rounded,
		getNextSlideIndex,
	]);

	if (slides.length === 0) return null;

	return (
		<div
			className={className}
			style={{
				position: "relative",
				width: `${width}px`,
				height: `${height}px`,
				overflow: "hidden",
			}}
		>
			{/* Bottom layer: current slide */}
			<div
				style={{
					position: "absolute",
					top: 0,
					left: 0,
					width: `${width}px`,
					height: `${height}px`,
					zIndex: 1,
					overflow: "hidden",
				}}
			>
				{slides[currentSlide]}
			</div>

			{/* Block layer: each block is a full-size div clipped to its grid cell */}
			{blocks.map((b, i) => (
				<div
					key={`${b.x}-${b.y}`}
					ref={(el) => {
						blockRefsRef.current[i] = el;
					}}
					className="cj-flashy-block"
					style={{
						position: "absolute",
						top: 0,
						left: 0,
						width: `${width}px`,
						height: `${height}px`,
						zIndex: 2,
						overflow: "hidden",
						pointerEvents: "none",
						visibility: showBlocks ? "visible" : "hidden",
					}}
				>
					{slides[nextSlide]}
				</div>
			))}
		</div>
	);
}
