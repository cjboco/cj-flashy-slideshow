import { useCallback, useEffect, useRef } from "react";
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
	currentImg: number;
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

export function FlashySlideshow({
	images,
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
	const containerRef = useRef<HTMLDivElement>(null);
	const bottomRef = useRef<HTMLDivElement>(null);
	const topRef = useRef<HTMLDivElement>(null);
	const stateRef = useRef<AnimState | null>(null);
	const onSlideChangeRef = useRef(onSlideChange);
	onSlideChangeRef.current = onSlideChange;

	const getNextImageIndex = useCallback(
		(current: number) => (current + 1 < images.length ? current + 1 : 0),
		[images.length],
	);

	useEffect(() => {
		if (images.length < 2 || !topRef.current) return;

		const presetOverrides = preset ? applyPreset(preset, width, height) : {};
		const opts = resolveOptions(
			{ preset, xBlocks, yBlocks, minBlockSize, delay, direction, style, translucent, sloppy },
			width,
			height,
			presetOverrides,
		);

		const blockW = Math.ceil(width / opts.xBlocks);
		const blockH = Math.ceil(height / opts.yBlocks);
		const totalBlocks = opts.xBlocks * opts.yBlocks;

		// Build block data
		const blocks: BlockData[] = [];
		for (let y = 0; y < opts.yBlocks; y++) {
			for (let x = 0; x < opts.xBlocks; x++) {
				blocks.push(createBlockData(x, y, blockW, blockH, opts, width, height));
			}
		}

		const state: AnimState = {
			currentImg: 0,
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

		// Create block DOM elements
		const topEl = topRef.current;
		topEl.innerHTML = "";

		const blockEls: HTMLDivElement[] = [];
		const maxDim = Math.max(width, height);

		for (let i = 0; i < blocks.length; i++) {
			const b = blocks[i];
			const el = document.createElement("div");
			el.className = "cj-flashy-block";
			el.style.position = "absolute";
			el.style.display = "block";
			el.style.margin = "0";
			el.style.padding = "0";
			el.style.backgroundRepeat = "no-repeat";
			el.style.backgroundAttachment = "fixed";
			el.style.top = `${b.startTop}px`;
			el.style.left = `${b.startLeft}px`;
			el.style.width = `${opts.minBlockSize}px`;
			el.style.height = `${opts.minBlockSize}px`;
			el.style.backgroundImage = `url(${images[getNextImageIndex(0)]})`;
			el.style.opacity = String(b.opacity);

			if (opts.style === "rounded") {
				el.style.borderRadius = `${maxDim}px`;
			}

			topEl.appendChild(el);
			blockEls.push(el);
		}

		// Set initial background position on blocks
		function correctOffset() {
			if (!containerRef.current) return;
			const rect = containerRef.current.getBoundingClientRect();
			const bp = `${rect.left}px ${rect.top}px`;
			for (const el of blockEls) {
				el.style.backgroundPosition = bp;
			}
		}
		correctOffset();

		const handleScroll = () => correctOffset();
		const handleResize = () => correctOffset();
		window.addEventListener("scroll", handleScroll);
		window.addEventListener("resize", handleResize);

		// Set initial bottom layer
		if (bottomRef.current) {
			bottomRef.current.style.backgroundImage = `url(${images[0]})`;
		}

		// Animation using Web Animations API
		function resetBlocks() {
			const nextIdx = getNextImageIndex(state.currentImg);
			const nextSrc = images[nextIdx];

			for (let i = 0; i < blocks.length; i++) {
				const b = blocks[i];

				// Recalculate start position for random direction
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
				el.style.top = `${b.startTop}px`;
				el.style.left = `${b.startLeft}px`;
				el.style.width = `${opts.minBlockSize}px`;
				el.style.height = `${opts.minBlockSize}px`;
				el.style.backgroundImage = `url(${nextSrc})`;
				el.style.opacity = String(b.opacity);
			}
			correctOffset();
		}

		function animateBlocks() {
			if (!state.mounted) return;
			state.completedBlocks = 0;
			state.animating = true;

			const nextIdx = getNextImageIndex(state.currentImg);

			for (let i = 0; i < blocks.length; i++) {
				const b = blocks[i];
				const el = blockEls[i];

				// Phase 1: fly to center position
				const midTop =
					blockH * b.y +
					blockH / 2 -
					opts.minBlockSize / 2 +
					(opts.sloppy ? randomRange(0, opts.minBlockSize) - opts.minBlockSize / 2 : 0);
				const midLeft =
					blockW * b.x +
					blockW / 2 -
					opts.minBlockSize / 2 +
					(opts.sloppy ? randomRange(0, opts.minBlockSize) - opts.minBlockSize / 2 : 0);
				const phase1Duration = opts.sloppy ? randomRange(350, 1250) : 650;
				const phase2Duration = opts.sloppy ? randomRange(250, 850) : 650;

				const phase1 = el.animate(
					[
						{
							top: `${b.startTop}px`,
							left: `${b.startLeft}px`,
							width: `${opts.minBlockSize}px`,
							height: `${opts.minBlockSize}px`,
						},
						{
							top: `${midTop}px`,
							left: `${midLeft}px`,
							width: `${opts.minBlockSize}px`,
							height: `${opts.minBlockSize}px`,
						},
					],
					{ duration: phase1Duration, easing: "linear", fill: "forwards" },
				);

				phase1.onfinish = () => {
					if (!state.mounted) return;

					// Phase 2: expand to full size
					const phase2 = el.animate(
						[
							{
								top: `${midTop}px`,
								left: `${midLeft}px`,
								width: `${opts.minBlockSize}px`,
								height: `${opts.minBlockSize}px`,
								opacity: String(b.opacity),
							},
							{
								top: `${b.endTop}px`,
								left: `${b.endLeft}px`,
								width: `${blockW * 2}px`,
								height: `${blockH * 2}px`,
								opacity: "1",
							},
						],
						{ duration: phase2Duration, fill: "forwards" },
					);

					phase2.onfinish = () => {
						if (!state.mounted) return;

						// Apply final styles directly
						el.style.top = `${b.endTop}px`;
						el.style.left = `${b.endLeft}px`;
						el.style.width = `${blockW * 2}px`;
						el.style.height = `${blockH * 2}px`;
						el.style.opacity = "1";

						// Cancel the animation to remove fill
						phase2.cancel();

						state.completedBlocks++;

						if (state.completedBlocks === state.totalBlocks) {
							// All blocks done - swap bottom image
							if (bottomRef.current) {
								bottomRef.current.style.backgroundImage = `url(${images[nextIdx]})`;
							}

							state.currentImg = nextIdx;
							onSlideChangeRef.current?.(state.currentImg);
							resetBlocks();

							state.timer = setTimeout(() => {
								if (state.mounted) animateBlocks();
							}, opts.delay);
						}
					};
				};
			}
		}

		// Start after initial delay
		state.timer = setTimeout(() => {
			if (state.mounted) animateBlocks();
		}, opts.delay);

		return () => {
			state.mounted = false;
			if (state.timer) clearTimeout(state.timer);
			window.removeEventListener("scroll", handleScroll);
			window.removeEventListener("resize", handleResize);

			// Cancel any running animations
			for (const el of blockEls) {
				for (const anim of el.getAnimations()) {
					anim.cancel();
				}
			}
		};
	}, [
		images,
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
		getNextImageIndex,
	]);

	if (images.length === 0) return null;

	return (
		<div
			ref={containerRef}
			className={className}
			style={{
				position: "relative",
				width: `${width}px`,
				height: `${height}px`,
				overflow: "hidden",
			}}
		>
			<div
				ref={bottomRef}
				style={{
					position: "absolute",
					top: 0,
					left: 0,
					display: "block",
					width: `${width}px`,
					height: `${height}px`,
					margin: 0,
					padding: 0,
					backgroundImage: images.length > 0 ? `url(${images[0]})` : undefined,
					backgroundRepeat: "no-repeat",
					backgroundPosition: "50% 50%",
					backgroundAttachment: "scroll",
					zIndex: 1,
					overflow: "hidden",
				}}
			/>
			<div
				ref={topRef}
				style={{
					position: "absolute",
					top: 0,
					left: 0,
					display: "block",
					width: `${width}px`,
					height: `${height}px`,
					margin: 0,
					padding: 0,
					zIndex: 2,
					overflow: "hidden",
				}}
			/>
		</div>
	);
}
