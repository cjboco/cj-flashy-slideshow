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
	if (rounded) {
		const cx = left + bWidth / 2;
		const cy = top + bHeight / 2;
		const radius = Math.min(bWidth, bHeight) / 2;
		return `circle(${radius}px at ${cx}px ${cy}px)`;
	}

	const insetTop = Math.max(0, top);
	const insetLeft = Math.max(0, left);
	const insetBottom = Math.max(0, h - (top + bHeight));
	const insetRight = Math.max(0, w - (left + bWidth));
	return `inset(${insetTop}px ${insetRight}px ${insetBottom}px ${insetLeft}px)`;
}

// Returns keyframe-compatible properties for either clip-path or mask
function getRegionProps(
	top: number, left: number, bW: number, bH: number,
	containerW: number, containerH: number,
	rounded: boolean, feathered: boolean,
): Record<string, string> {
	if (feathered) {
		const pos = `${left}px ${top}px`;
		const size = `${bW}px ${bH}px`;
		return { maskPosition: pos, maskSize: size, webkitMaskPosition: pos, webkitMaskSize: size };
	}
	return { clipPath: computeClipInset(top, left, bW, bH, containerW, containerH, rounded) };
}

// Apply clip or mask properties to an element's inline style
function applyRegionStyle(el: HTMLDivElement, props: Record<string, string>) {
	if ("clipPath" in props) {
		el.style.clipPath = props.clipPath;
	} else {
		el.style.setProperty("mask-position", props.maskPosition);
		el.style.setProperty("mask-size", props.maskSize);
		el.style.setProperty("-webkit-mask-position", props.maskPosition);
		el.style.setProperty("-webkit-mask-size", props.maskSize);
	}
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
	rotation,
	blur,
	feather,
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
			{ preset, xBlocks, yBlocks, minBlockSize, delay, direction, style, translucent, sloppy, rotation, blur, feather },
			width,
			height,
			presetOverrides,
		);
	}, [preset, xBlocks, yBlocks, minBlockSize, delay, direction, style, translucent, sloppy, rotation, blur, feather, width, height]);

	const blockW = Math.ceil(width / opts.xBlocks);
	const blockH = Math.ceil(height / opts.yBlocks);
	const totalBlocks = opts.xBlocks * opts.yBlocks;
	const rounded = opts.style === "rounded";
	const feathered = opts.feather > 0;

	// Static mask gradient style (only when feathered)
	const maskGradientStyle = useMemo((): React.CSSProperties => {
		if (!feathered) return {};
		const f = opts.feather;
		if (rounded) {
			const img = `radial-gradient(closest-side, black ${Math.max(0, 100 - f * 2)}%, transparent 100%)`;
			return {
				maskImage: img,
				maskRepeat: "no-repeat",
				WebkitMaskImage: img,
				WebkitMaskRepeat: "no-repeat",
			} as React.CSSProperties;
		}
		const img = [
			`linear-gradient(to right, transparent 0%, black ${f}%, black ${100 - f}%, transparent 100%)`,
			`linear-gradient(to bottom, transparent 0%, black ${f}%, black ${100 - f}%, transparent 100%)`,
		].join(", ");
		return {
			maskImage: img,
			maskRepeat: "no-repeat",
			maskComposite: "intersect",
			WebkitMaskImage: img,
			WebkitMaskRepeat: "no-repeat",
			WebkitMaskComposite: "source-in",
		} as React.CSSProperties;
	}, [feathered, opts.feather, rounded]);

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

				applyRegionStyle(el, getRegionProps(
					b.startTop, b.startLeft, opts.minBlockSize, opts.minBlockSize,
					width, height, rounded, feathered,
				));
				el.style.opacity = String(b.opacity);
				el.style.filter = opts.blur > 0 ? `blur(${opts.blur}px)` : "";
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

					const mbs = opts.minBlockSize;

					const midCenterX =
						blockW * b.x +
						blockW / 2 -
						mbs / 2 +
						(opts.sloppy ? randomRange(0, mbs) - mbs / 2 : 0);
					const midCenterY =
						blockH * b.y +
						blockH / 2 -
						mbs / 2 +
						(opts.sloppy ? randomRange(0, mbs) - mbs / 2 : 0);

					const phase1Duration = opts.sloppy ? randomRange(350, 1250) : 650;
					const phase2Duration = opts.sloppy ? randomRange(250, 850) : 650;

					const midProps = getRegionProps(
						midCenterY, midCenterX, mbs, mbs,
						width, height, rounded, feathered,
					);

					// Build phase 1 keyframes — spiral path when rotation > 0
					const blockRotation = opts.sloppy && opts.rotation !== 0
						? opts.rotation + randomRange(-180, 180)
						: opts.rotation;

					const phase1Keyframes: Keyframe[] = [];

					const blurVal = opts.blur > 0 ? `blur(${opts.blur}px)` : undefined;

					if (blockRotation === 0) {
						// Straight path
						const startProps = getRegionProps(
							b.startTop, b.startLeft, mbs, mbs,
							width, height, rounded, feathered,
						);
						phase1Keyframes.push(
							{ ...startProps, ...(blurVal && { filter: blurVal }) },
							{ ...midProps, ...(blurVal && { filter: blurVal }) },
						);
					} else {
						// Spiral arc path from start to center
						const startCX = b.startLeft + mbs / 2;
						const startCY = b.startTop + mbs / 2;
						const midCX = midCenterX + mbs / 2;
						const midCY = midCenterY + mbs / 2;
						const dx = startCX - midCX;
						const dy = startCY - midCY;
						const startAngle = Math.atan2(dy, dx);
						const startRadius = Math.sqrt(dx * dx + dy * dy);
						const rotRad = (blockRotation * Math.PI) / 180;
						const steps = Math.max(8, Math.ceil(Math.abs(blockRotation) / 30));

						for (let k = 0; k <= steps; k++) {
							const t = k / steps;
							const angle = startAngle + rotRad * t;
							const radius = startRadius * (1 - t);
							const cx = midCX + Math.cos(angle) * radius;
							const cy = midCY + Math.sin(angle) * radius;
							const clipX = cx - mbs / 2;
							const clipY = cy - mbs / 2;
							phase1Keyframes.push({
								...getRegionProps(clipY, clipX, mbs, mbs, width, height, rounded, feathered),
								...(blurVal && { filter: blurVal }),
							});
						}
					}

					// Phase 1: move from start position to grid center
					const phase1 = el.animate(
						phase1Keyframes,
						{ duration: phase1Duration, easing: "linear", fill: "forwards" },
					);

					phase1.onfinish = () => {
						if (!state.mounted) return;

						// Phase 2: expand from small at center to full cell
						let expandTop: number, expandLeft: number, expandW: number, expandH: number;
						if (rounded) {
							const cx = blockW * b.x + blockW / 2;
							const cy = blockH * b.y + blockH / 2;
							const bigR = Math.ceil(Math.hypot(blockW, blockH));
							expandTop = cy - bigR;
							expandLeft = cx - bigR;
							expandW = bigR * 2;
							expandH = bigR * 2;
						} else {
							expandTop = b.endTop;
							expandLeft = b.endLeft;
							expandW = blockW * 2;
							expandH = blockH * 2;
						}

						const expandedProps = getRegionProps(
							expandTop, expandLeft, expandW, expandH,
							width, height, rounded, feathered,
						);

						// When feathered, inflate the final mask so soft edges
						// get pushed outside the visible area
						let finalProps: Record<string, string>;
						if (feathered) {
							const inflate = opts.feather / 100;
							const padW = expandW * inflate;
							const padH = expandH * inflate;
							finalProps = getRegionProps(
								expandTop - padH, expandLeft - padW,
								expandW + padW * 2, expandH + padH * 2,
								width, height, rounded, true,
							);
						} else {
							finalProps = expandedProps;
						}

						const phase2Keyframes: Keyframe[] = feathered
							? [
								{
									...midProps,
									opacity: String(b.opacity),
									...(blurVal && { filter: blurVal }),
									offset: 0,
								},
								{
									...expandedProps,
									opacity: "1",
									...(blurVal && { filter: "blur(0px)" }),
									offset: 0.75,
								},
								{
									...finalProps,
									opacity: "1",
									offset: 1.0,
								},
							]
							: [
								{
									...midProps,
									opacity: String(b.opacity),
									...(blurVal && { filter: blurVal }),
								},
								{
									...expandedProps,
									opacity: "1",
									...(blurVal && { filter: "blur(0px)" }),
								},
							];

						const phase2 = el.animate(
							phase2Keyframes,
							{ duration: phase2Duration, fill: "forwards" },
						);

						phase2.onfinish = () => {
							if (!state.mounted) return;

							applyRegionStyle(el, finalProps);
							el.style.opacity = "1";
							el.style.filter = "";
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
		feathered,
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
						...maskGradientStyle,
					}}
				>
					{slides[nextSlide]}
				</div>
			))}
		</div>
	);
}
