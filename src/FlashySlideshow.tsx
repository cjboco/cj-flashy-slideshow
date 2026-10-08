import {
	Children,
	useCallback,
	useEffect,
	useId,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import {
	findMediaSource,
	GpuRenderer,
	gpuShape,
	type MediaSource,
	mediaReady,
	TILE_FLOATS,
	toGpuTile,
	writeTiles,
} from "./gpu";
import { planTile, type Rect, type TilePlan } from "./plan";
import { applyPreset } from "./presets";
import type { BlockData, FlashySlideshowProps, ResolvedOptions } from "./types";
import {
	calculateStartPosition,
	createBlockData,
	getRandomDirection,
	isWipeDirection,
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
	raf: number;
	animating: boolean;
	mounted: boolean;
}

interface Committed {
	currentSlide: number;
	nextSlide: number;
	showBlocks: boolean;
	domBlocks: boolean;
}

interface CommitWaiter {
	test: (c: Committed) => boolean;
	run: () => void;
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
	width: widthProp,
	height: heightProp,
	objectFit = "cover",
	preset,
	xBlocks,
	yBlocks,
	initialTileSize,
	delay,
	direction,
	style,
	translucent,
	randomize,
	randomness,
	pathSpeed,
	pathRotation,
	pathBlur,
	tileSpeed,
	tileRotation,
	tileBlur,
	tileExact,
	feather,
	className,
	onSlideChange,
}: FlashySlideshowProps) {
	const slides = Children.toArray(children);
	const stateRef = useRef<AnimState | null>(null);
	const blockRefsRef = useRef<(HTMLDivElement | null)[]>([]);
	const containerRef = useRef<HTMLDivElement | null>(null);
	const currentLayerRef = useRef<HTMLDivElement | null>(null);
	const nextLayerRef = useRef<HTMLDivElement | null>(null);
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	// false once WebGL2 turned out to be unavailable
	const gpuRef = useRef<GpuRenderer | false | null>(null);
	const onSlideChangeRef = useRef(onSlideChange);
	onSlideChangeRef.current = onSlideChange;
	const scopeId = useId();

	const [currentSlide, setCurrentSlide] = useState(0);
	const [nextSlide, setNextSlide] = useState(1);
	const [showBlocks, setShowBlocks] = useState(false);
	// Block divs are only mounted while the DOM renderer is in use
	const [domBlocks, setDomBlocks] = useState(false);
	const committedRef = useRef<Committed>({
		currentSlide: 0,
		nextSlide: 1,
		showBlocks: false,
		domBlocks: false,
	});
	const commitWaitersRef = useRef<CommitWaiter[]>([]);
	const [measuredSize, setMeasuredSize] = useState<{ w: number; h: number } | null>(null);

	const autoSize = widthProp == null || heightProp == null;

	// Measure container when no explicit width/height
	useEffect(() => {
		if (!autoSize) return;
		const el = containerRef.current;
		if (!el) return;

		const observer = new ResizeObserver((entries) => {
			const entry = entries[0];
			if (!entry) return;
			const { width: w, height: h } = entry.contentRect;
			if (w > 0 && h > 0) {
				setMeasuredSize((prev) =>
					prev && prev.w === Math.round(w) && prev.h === Math.round(h)
						? prev
						: { w: Math.round(w), h: Math.round(h) },
				);
			}
		});
		observer.observe(el);
		return () => observer.disconnect();
	}, [autoSize]);

	const width = widthProp ?? measuredSize?.w ?? 0;
	const height = heightProp ?? measuredSize?.h ?? 0;
	const hasSize = width > 0 && height > 0;

	const slideCount = slides.length;

	const getNextSlideIndex = useCallback(
		(current: number) => (current + 1 < slideCount ? current + 1 : 0),
		[slideCount],
	);

	// Compute options and block data (memoized to keep stable references)
	const opts = useMemo(() => {
		const presetOverrides = preset ? applyPreset(preset, width, height) : {};
		return resolveOptions(
			{ preset, xBlocks, yBlocks, initialTileSize, delay, direction, style, translucent, randomize, randomness, pathSpeed, pathRotation, pathBlur, tileSpeed, tileRotation, tileBlur, tileExact, feather },
			width,
			height,
			presetOverrides,
		);
	}, [preset, xBlocks, yBlocks, initialTileSize, delay, direction, style, translucent, randomize, randomness, pathSpeed, pathRotation, pathBlur, tileSpeed, tileRotation, tileBlur, tileExact, feather, width, height]);

	const blockW = Math.ceil(width / opts.xBlocks);
	const blockH = Math.ceil(height / opts.yBlocks);
	const wipeMode = isWipeDirection(opts.currentDirection);
	const wipePad = wipeMode ? 1 : 0;
	const gridXBlocks = opts.xBlocks + wipePad * 2;
	const gridYBlocks = opts.yBlocks + wipePad * 2;
	const totalBlocks = gridXBlocks * gridYBlocks;
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
	// For wipe modes, extend the grid 1 cell outside each edge so the
	// particle effect isn't cut off at the container border.
	const blocks = useMemo(() => {
		const result: BlockData[] = [];
		for (let y = -wipePad; y < opts.yBlocks + wipePad; y++) {
			for (let x = -wipePad; x < opts.xBlocks + wipePad; x++) {
				result.push(createBlockData(x, y, blockW, blockH, opts, width, height));
			}
		}
		return result;
	}, [opts, blockW, blockH, width, height, wipePad]);

	// Lets the animation effect act right after React commits a state change,
	// before the browser paints it
	useLayoutEffect(() => {
		const committed = { currentSlide, nextSlide, showBlocks, domBlocks };
		committedRef.current = committed;
		const waiters = commitWaitersRef.current;
		if (waiters.length === 0) return;
		commitWaitersRef.current = waiters.filter((w) => {
			if (!w.test(committed)) return true;
			w.run();
			return false;
		});
	});

	useEffect(
		() => () => {
			if (gpuRef.current) gpuRef.current.dispose();
			gpuRef.current = null;
		},
		[],
	);

	// Animation effect
	useEffect(() => {
		if (slideCount < 2) return;

		const staggerTimers: ReturnType<typeof setTimeout>[] = [];
		const shape = gpuShape(rounded, feathered);
		const startSlide =
			committedRef.current.currentSlide < slideCount ? committedRef.current.currentSlide : 0;

		const state: AnimState = {
			currentSlide: startSlide,
			nextSlide: getNextSlideIndex(startSlide),
			completedBlocks: 0,
			totalBlocks,
			blocks,
			opts,
			blockW,
			blockH,
			timer: null,
			raf: 0,
			animating: false,
			mounted: true,
		};
		stateRef.current = state;
		setCurrentSlide(startSlide);
		setNextSlide(state.nextSlide);

		function whenCommitted(test: (c: Committed) => boolean, run: () => void) {
			commitWaitersRef.current.push({ test, run: () => state.mounted && run() });
		}

		function getBlockEls(): HTMLDivElement[] {
			return blockRefsRef.current.filter((el): el is HTMLDivElement => el !== null);
		}

		function region(r: Rect) {
			return getRegionProps(r.y, r.x, r.w, r.h, width, height, rounded, feathered);
		}

		function scheduleNext() {
			state.timer = setTimeout(() => {
				if (state.mounted) void runTransition();
			}, opts.delay);
		}

		function finishTransition() {
			state.currentSlide = state.nextSlide;
			state.nextSlide = getNextSlideIndex(state.currentSlide);
			state.animating = false;
			onSlideChangeRef.current?.(state.currentSlide);
			scheduleNext();
		}

		function planTransition(): TilePlan[] {
			return blocks.map((b) => {
				if (opts.direction === "random") {
					const pos = calculateStartPosition(
						getRandomDirection(),
						b.x,
						b.y,
						blockW,
						blockH,
						opts.initialTileSize,
						width,
						height,
					);
					b.startTop = pos.startTop;
					b.startLeft = pos.startLeft;
				}
				return planTile(b, opts, blockW, blockH, rounded, feathered);
			});
		}

		async function runTransition() {
			for (const t of staggerTimers) clearTimeout(t);
			staggerTimers.length = 0;
			state.completedBlocks = 0;
			state.animating = true;

			const plans = planTransition();
			const gpu = await prepareGpu();
			if (!state.mounted) return;
			if (gpu) runGpu(gpu.renderer, gpu.media, plans);
			else runDom(plans);
		}

		// Returns a renderer loaded with the next slide, or null when the slide
		// has to go through the DOM renderer
		async function prepareGpu(): Promise<{ renderer: GpuRenderer; media: MediaSource } | null> {
			if (gpuRef.current === false) return null;
			if (committedRef.current.nextSlide !== state.nextSlide) return null;
			const layer = nextLayerRef.current;
			const canvas = canvasRef.current;
			if (!layer || !canvas) return null;

			const media = findMediaSource(layer);
			if (!media || !(await mediaReady(media)) || !state.mounted) return null;

			let renderer = gpuRef.current;
			if (!renderer || renderer.canvas !== canvas) {
				renderer?.dispose();
				renderer = GpuRenderer.create(canvas);
				gpuRef.current = renderer ?? false;
			}
			if (!renderer || renderer.lost) return null;

			renderer.resize(width, height, window.devicePixelRatio || 1);
			if (!renderer.setSource(media)) return null;
			return { renderer, media };
		}

		function runGpu(renderer: GpuRenderer, media: MediaSource, plans: TilePlan[]) {
			const tiles = plans.map((p) => toGpuTile(p, shape, width, height));
			const data = new Float32Array(tiles.length * TILE_FLOATS);
			const isVideo = media instanceof HTMLVideoElement;
			let start = -1;

			const frame = (now: number) => {
				if (!state.mounted) return;
				if (start < 0) start = now;
				const done = writeTiles(data, tiles, now - start, opts, shape);
				if (isVideo) renderer.upload(media);
				renderer.draw(data, tiles.length, shape, opts.feather / 100);
				if (!done) {
					state.raf = requestAnimationFrame(frame);
					return;
				}

				// The canvas holds the finished frame until the bottom layer can show
				// the same slide, then gets cleared
				const nextIdx = state.nextSlide;
				setCurrentSlide(nextIdx);
				setNextSlide(getNextSlideIndex(nextIdx));
				setDomBlocks(false);
				whenCommitted(
					(c) => c.currentSlide === nextIdx,
					() => {
						const img = currentLayerRef.current?.querySelector("img");
						const decoded = img ? img.decode().catch(() => {}) : Promise.resolve();
						void decoded.then(() => {
							if (!state.mounted) return;
							state.raf = requestAnimationFrame(() => {
								if (!state.mounted) return;
								renderer.clear();
								finishTransition();
							});
						});
					},
				);
			};
			state.raf = requestAnimationFrame(frame);
		}

		function runDom(plans: TilePlan[]) {
			const nextIdx = state.nextSlide;
			setNextSlide(nextIdx);
			setDomBlocks(true);
			setShowBlocks(true);

			whenCommitted(
				(c) => c.showBlocks && c.domBlocks && c.nextSlide === nextIdx,
				() => {
					// Runs before paint, so the blocks never show their previous end state
					const blockEls = getBlockEls();
					for (let i = 0; i < plans.length; i++) {
						const el = blockEls[i];
						if (!el) continue;
						applyRegionStyle(el, region(plans[i].initial));
						el.style.opacity = String(plans[i].initialOpacity);
						el.style.filter = opts.pathBlur > 0 ? `blur(${opts.pathBlur}px)` : "";
					}

					requestAnimationFrame(() => {
						if (!state.mounted) return;
						for (let i = 0; i < plans.length; i++) {
							const el = blockEls[i];
							if (!el) continue;
							const p = plans[i];
							if (p.delay > 0) {
								staggerTimers.push(setTimeout(() => animateDomBlock(el, p), p.delay));
							} else {
								animateDomBlock(el, p);
							}
						}
					});
				},
			);
		}

		function animateDomBlock(el: HTMLDivElement, p: TilePlan) {
			if (!state.mounted) return;
			el.style.opacity = String(p.opacity);

			const pathBlurVal = opts.pathBlur > 0 ? `blur(${opts.pathBlur}px)` : undefined;

			// Phase 1: move from start position to grid center
			const phase1 = el.animate(
				p.path.map((r) => ({ ...region(r), ...(pathBlurVal && { filter: pathBlurVal }) })),
				{ duration: p.phase1Duration, easing: "linear", fill: "forwards" },
			);

			phase1.onfinish = () => {
				if (!state.mounted) return;

				// Phase 2: expand from small at center to full cell
				const midProps = region(p.mid);
				const expandedProps = region(p.expanded);
				const finalProps = region(p.final);

				const tileBlurVal = opts.tileBlur > 0 ? `blur(${opts.tileBlur}px)` : undefined;

				// Set transform-origin to the tile's cell center so rotation
				// spins around the tile, not the full-size container center.
				const tileOrigin =
					p.tileRotation !== 0 ? { transformOrigin: `${p.originX}px ${p.originY}px` } : {};
				const tileRotStart =
					p.tileRotation !== 0
						? { transform: `rotate(${p.tileRotation}deg)`, ...tileOrigin }
						: {};
				const tileRotEnd =
					p.tileRotation !== 0 ? { transform: "rotate(0deg)", ...tileOrigin } : {};

				const phase2Keyframes: Keyframe[] = feathered
					? [
							{
								...midProps,
								opacity: String(p.opacity),
								...tileRotStart,
								...(tileBlurVal && { filter: tileBlurVal }),
								offset: 0,
							},
							{
								...expandedProps,
								opacity: "1",
								...tileRotEnd,
								...(tileBlurVal && { filter: "blur(0px)" }),
								offset: 0.75,
							},
							{
								...finalProps,
								opacity: "1",
								...tileRotEnd,
								...(tileBlurVal && { filter: "blur(0px)" }),
								offset: 1.0,
							},
						]
					: [
							{
								...midProps,
								opacity: String(p.opacity),
								...tileRotStart,
								...(tileBlurVal && { filter: tileBlurVal }),
							},
							{
								...expandedProps,
								opacity: "1",
								...tileRotEnd,
								...(tileBlurVal && { filter: "blur(0px)" }),
							},
						];

				const phase2 = el.animate(phase2Keyframes, { duration: p.phase2Duration, fill: "forwards" });

				phase2.onfinish = () => {
					if (!state.mounted) return;

					applyRegionStyle(el, finalProps);
					el.style.opacity = "1";
					el.style.filter = "";
					el.style.transform = "";
					phase1.cancel();
					phase2.cancel();

					state.completedBlocks++;

					if (state.completedBlocks === state.totalBlocks) {
						const nextIdx = state.nextSlide;
						setCurrentSlide(nextIdx);
						setNextSlide(getNextSlideIndex(nextIdx));
						setShowBlocks(false);
						finishTransition();
					}
				};
			};
		}

		scheduleNext();

		return () => {
			state.mounted = false;
			if (state.timer) clearTimeout(state.timer);
			cancelAnimationFrame(state.raf);
			for (const t of staggerTimers) clearTimeout(t);
			staggerTimers.length = 0;
			commitWaitersRef.current = [];
			if (gpuRef.current) gpuRef.current.clear();

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

	const cssScope = `[data-flashy="${CSS.escape(scopeId)}"]`;
	const fitStyle = `${cssScope} img,${cssScope} video{width:100%;height:100%;object-fit:${objectFit}}`;

	const containerStyle: React.CSSProperties = {
		position: "relative",
		overflow: "hidden",
		...(widthProp != null ? { width: `${widthProp}px` } : { width: "100%" }),
		...(heightProp != null ? { height: `${heightProp}px` } : { height: "100%" }),
	};

	const layerStyle: React.CSSProperties = {
		position: "absolute",
		top: 0,
		left: 0,
		width: `${width}px`,
		height: `${height}px`,
		overflow: "hidden",
	};

	return (
		<div ref={containerRef} className={className} data-flashy={scopeId} style={containerStyle}>
			<style>{fitStyle}</style>
			{hasSize && (
				<>
					{/* Hidden copy of the next slide: the GPU renderer's texture source */}
					{slideCount > 1 && (
						<div
							ref={nextLayerRef}
							aria-hidden="true"
							style={{ ...layerStyle, zIndex: 0, visibility: "hidden" }}
						>
							{slides[nextSlide]}
						</div>
					)}

					{/* Bottom layer: current slide */}
					<div ref={currentLayerRef} style={{ ...layerStyle, zIndex: 1 }}>
						{slides[currentSlide]}
					</div>

					{slideCount > 1 && (
						<canvas
							ref={canvasRef}
							style={{
								position: "absolute",
								top: 0,
								left: 0,
								width: `${width}px`,
								height: `${height}px`,
								zIndex: 2,
								pointerEvents: "none",
							}}
						/>
					)}

					{/* DOM fallback: each block is a full-size div clipped to its grid cell */}
					{domBlocks &&
						blocks.map((b, i) => (
							<div
								key={`${b.x}-${b.y}`}
								ref={(el) => {
									blockRefsRef.current[i] = el;
								}}
								className="cj-flashy-block"
								style={{
									...layerStyle,
									zIndex: 2,
									pointerEvents: "none",
									visibility: showBlocks ? "visible" : "hidden",
									...maskGradientStyle,
								}}
							>
								{slides[nextSlide]}
							</div>
						))}
				</>
			)}
		</div>
	);
}
