import { useState, useEffect, useMemo, useCallback } from "react";
import { createRoot } from "react-dom/client";
import { FlashySlideshow } from "../src";
import type { Preset, Direction, BlockStyle } from "../src/types";
import { applyPreset } from "../src/presets";
import { resolveOptions } from "../src/utils";

// --- Constants ---

const W = 640;
const H = 400;

const PRESETS: { value: Preset; label: string; description: string }[] = [
	{ value: "bricks", label: "Bricks", description: "Classic brick-laying reveal from the left" },
	{ value: "cubism", label: "Cubism", description: "Abstract, overlapping translucent blocks" },
	{ value: "rain", label: "Rain", description: "Rounded drops falling from the top" },
	{ value: "blinds", label: "Blinds", description: "Horizontal blinds opening from the top" },
	{ value: "blinds2", label: "Blinds 2", description: "Vertical blinds opening from the top" },
	{ value: "transport", label: "Transport", description: "Translucent horizontal strips sliding in" },
	{ value: "transport2", label: "Transport 2", description: "Translucent vertical strips sliding in" },
	{ value: "spiral", label: "Spiral", description: "Blocks spiral in from random directions with blur" },
	{ value: "cascade", label: "Cascade", description: "Blocks tumble from the top like falling cards" },
	{ value: "dissolve", label: "Dissolve", description: "Soft fade-in with blur, no directional movement" },
	{ value: "vortex", label: "Vortex", description: "Spinning blocks swirl in from all directions" },
	{ value: "pixelate", label: "Pixelate", description: "Tiny blocks pop in at their grid positions" },
	{ value: "wipe", label: "Wipe", description: "Classic wipe transition with flashy particle edge" },
	{ value: "wipeDissolve", label: "Wipe Dissolve", description: "Soft wipe with blur and feathered particle edge" },
];

const DIRECTIONS: Direction[] = [
	"top", "topleft", "topright", "left",
	"bottom", "bottomleft", "bottomright", "right",
	"random", "none",
	"wipeLeft", "wipeRight", "wipeTop", "wipeBottom",
	"wipeTopLeft", "wipeTopRight", "wipeBottomLeft", "wipeBottomRight",
];

type SlideType = "images" | "html" | "mixed";

const SLIDE_TYPES: { value: SlideType; label: string }[] = [
	{ value: "images", label: "Images" },
	{ value: "html", label: "HTML" },
	{ value: "mixed", label: "Mixed" },
];

const PHOTOS = [
	"./images/photo_1.jpg",
	"./images/photo_2.jpg",
	"./images/photo_3.jpg",
	"./images/photo_4.jpg",
	"./images/photo_5.jpg",
];

const HTML_SLIDES = [
	{ bg: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", title: "Welcome", subtitle: "CJ Flashy Slideshow" },
	{ bg: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)", title: "Beautiful", subtitle: "Flash-like transitions" },
	{ bg: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)", title: "Flexible", subtitle: "12 built-in presets" },
	{ bg: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)", title: "Lightweight", subtitle: "Zero dependencies" },
	{ bg: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)", title: "React", subtitle: "Built for modern apps" },
];

// --- Settings ---

interface Settings {
	usePreset: boolean;
	preset: Preset;
	slideType: SlideType;
	xBlocks: number;
	yBlocks: number;
	minBlockSize: number;
	delay: number;
	direction: Direction;
	style: BlockStyle;
	translucent: boolean;
	randomize: boolean;
	speed: number;
	randomness: number;
	rotation: number;
	rotationEnabled: boolean;
	blur: number;
	blurEnabled: boolean;
	feather: number;
	featherEnabled: boolean;
}

const PROP_DEFAULTS = {
	xBlocks: 12, yBlocks: 3, minBlockSize: 3, delay: 3000,
	direction: "left" as Direction, style: "normal" as BlockStyle,
	translucent: false, randomize: false, speed: 650, randomness: 50,
	rotation: 180, rotationEnabled: false,
	blur: 4, blurEnabled: false,
	feather: 15, featherEnabled: false,
};

function resolvePresetValues(preset: Preset): Omit<Settings, "usePreset" | "preset" | "slideType"> {
	const overrides = applyPreset(preset, W, H);
	const resolved = resolveOptions({ preset, ...overrides }, W, H, overrides);
	return {
		xBlocks: resolved.xBlocks,
		yBlocks: resolved.yBlocks,
		minBlockSize: resolved.minBlockSize,
		delay: resolved.delay,
		direction: resolved.direction,
		style: resolved.style,
		translucent: resolved.translucent,
		randomize: resolved.randomize,
		speed: resolved.speed,
		randomness: resolved.randomness,
		rotation: resolved.rotation !== 0 ? resolved.rotation : 180,
		rotationEnabled: resolved.rotation !== 0,
		blur: resolved.blur !== 0 ? resolved.blur : 4,
		blurEnabled: resolved.blur !== 0,
		feather: resolved.feather !== 0 ? resolved.feather : 15,
		featherEnabled: resolved.feather !== 0,
	};
}

// --- URL helpers ---

function settingsToUrl(s: Settings): string {
	const p = new URLSearchParams();
	if (s.usePreset) p.set("preset", s.preset);
	if (s.slideType !== "images") p.set("st", s.slideType);
	p.set("xb", String(s.xBlocks));
	p.set("yb", String(s.yBlocks));
	p.set("mbs", String(s.minBlockSize));
	p.set("d", String(s.delay));
	p.set("dir", s.direction);
	p.set("sty", s.style);
	if (s.translucent) p.set("tr", "1");
	if (s.randomize) p.set("rnd", "1");
	p.set("spd", String(s.speed));
	if (s.randomize) p.set("rns", String(s.randomness));
	if (s.rotationEnabled) p.set("rot", String(s.rotation));
	if (s.blurEnabled) p.set("bl", String(s.blur));
	if (s.featherEnabled) p.set("fe", String(s.feather));
	const qs = p.toString();
	return qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
}

function parseUrlSettings(): Settings {
	const p = new URLSearchParams(window.location.search);

	if (!p.toString()) {
		return { usePreset: true, preset: "bricks", slideType: "images", ...resolvePresetValues("bricks") };
	}

	const presetName = p.get("preset") as Preset | null;
	const usePreset = presetName !== null;
	const preset: Preset = presetName || "bricks";
	const base = usePreset ? resolvePresetValues(preset) : PROP_DEFAULTS;

	return {
		usePreset,
		preset,
		slideType: (p.get("st") as SlideType) || "images",
		xBlocks: p.has("xb") ? Number(p.get("xb")) : base.xBlocks,
		yBlocks: p.has("yb") ? Number(p.get("yb")) : base.yBlocks,
		minBlockSize: p.has("mbs") ? Number(p.get("mbs")) : base.minBlockSize,
		delay: p.has("d") ? Number(p.get("d")) : base.delay,
		direction: p.has("dir") ? (p.get("dir") as Direction) : base.direction,
		style: p.has("sty") ? (p.get("sty") as BlockStyle) : base.style,
		translucent: p.has("tr") ? p.get("tr") === "1" : base.translucent,
		randomize: p.has("rnd") ? p.get("rnd") === "1" : base.randomize,
		speed: p.has("spd") ? Number(p.get("spd")) : base.speed,
		randomness: p.has("rns") ? Number(p.get("rns")) : base.randomness,
		rotation: p.has("rot") ? Number(p.get("rot")) : base.rotation,
		rotationEnabled: p.has("rot"),
		blur: p.has("bl") ? Number(p.get("bl")) : base.blur,
		blurEnabled: p.has("bl"),
		feather: p.has("fe") ? Number(p.get("fe")) : base.feather,
		featherEnabled: p.has("fe"),
	};
}

// --- Styles ---

const labelStyle: React.CSSProperties = {
	display: "flex",
	justifyContent: "space-between",
	alignItems: "center",
	fontSize: "11px",
	fontWeight: 600,
	textTransform: "uppercase",
	letterSpacing: "0.05em",
	color: "#8b949e",
	marginBottom: "2px",
};

const selectStyle: React.CSSProperties = {
	appearance: "none",
	background: "#21262d",
	color: "#f0f6fc",
	border: "1px solid #30363d",
	borderRadius: "4px",
	padding: "4px 28px 4px 8px",
	fontSize: "13px",
	width: "100%",
	boxSizing: "border-box",
	cursor: "pointer",
	backgroundImage:
		"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%238b949e' viewBox='0 0 16 16'%3E%3Cpath d='M4.427 7.427l3.396 3.396a.25.25 0 00.354 0l3.396-3.396A.25.25 0 0011.396 7H4.604a.25.25 0 00-.177.427z'/%3E%3C/svg%3E\")",
	backgroundRepeat: "no-repeat",
	backgroundPosition: "right 8px center",
};

// --- Control components ---

function RangeControl({
	label, value, onChange, min, max, step, suffix, disabled,
}: {
	label: string; value: number; onChange: (v: number) => void;
	min: number; max: number; step: number; suffix?: string; disabled?: boolean;
}) {
	return (
		<div style={{ opacity: disabled ? 0.35 : 1 }}>
			<div style={labelStyle}>
				<span>{label}</span>
				<span style={{ color: "#f0f6fc", fontVariantNumeric: "tabular-nums" }}>{value}{suffix}</span>
			</div>
			<input
				type="range"
				min={min} max={max} step={step}
				value={value}
				disabled={disabled}
				onChange={(e) => onChange(Number(e.target.value))}
				style={{ width: "100%", accentColor: "#388bfd", cursor: disabled ? "default" : "pointer" }}
			/>
		</div>
	);
}

function OptionalRangeControl({
	label, value, enabled, onToggle, onChange, min, max, step, suffix,
}: {
	label: string; value: number; enabled: boolean;
	onToggle: (on: boolean) => void; onChange: (v: number) => void;
	min: number; max: number; step: number; suffix?: string;
}) {
	return (
		<div style={{ opacity: enabled ? 1 : 0.35 }}>
			<div style={labelStyle}>
				<label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
					<input
						type="checkbox"
						checked={enabled}
						onChange={(e) => onToggle(e.target.checked)}
						style={{ accentColor: "#388bfd", cursor: "pointer", margin: 0 }}
					/>
					<span>{label}</span>
				</label>
				<span style={{ color: enabled ? "#f0f6fc" : "#484f58", fontVariantNumeric: "tabular-nums" }}>
					{enabled ? `${value}${suffix || ""}` : "off"}
				</span>
			</div>
			<input
				type="range"
				min={min} max={max} step={step}
				value={value}
				disabled={!enabled}
				onChange={(e) => onChange(Number(e.target.value))}
				style={{ width: "100%", accentColor: "#388bfd", cursor: enabled ? "pointer" : "default" }}
			/>
		</div>
	);
}

function SelectControl<T extends string>({
	label, value, onChange, options,
}: {
	label: string; value: T; onChange: (v: T) => void;
	options: { value: T; label: string }[];
}) {
	return (
		<div>
			<div style={labelStyle}><span>{label}</span></div>
			<select value={value} onChange={(e) => onChange(e.target.value as T)} style={selectStyle}>
				{options.map((o) => (
					<option key={o.value} value={o.value}>{o.label}</option>
				))}
			</select>
		</div>
	);
}

// --- Slide components ---

function ImageSlide({ src }: { src: string }) {
	return <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />;
}

function HtmlSlide({ bg, title, subtitle }: { bg: string; title: string; subtitle: string }) {
	return (
		<div
			style={{
				width: "100%", height: "100%", display: "flex", flexDirection: "column",
				alignItems: "center", justifyContent: "center", background: bg,
				color: "#fff", textAlign: "center", fontFamily: "'Segoe UI', system-ui, sans-serif",
			}}
		>
			<div style={{ fontSize: "42px", fontWeight: 700, marginBottom: "8px", textShadow: "0 2px 8px rgba(0,0,0,0.2)" }}>
				{title}
			</div>
			<div style={{ fontSize: "18px", fontWeight: 400, opacity: 0.9, textShadow: "0 1px 4px rgba(0,0,0,0.15)" }}>
				{subtitle}
			</div>
		</div>
	);
}

// --- Code example ---

function buildCodeExample(s: Settings): string {
	if (s.usePreset) {
		const prop = s.preset === "bricks" ? "" : `\n  preset="${s.preset}"`;
		return `<FlashySlideshow\n  width={${W}}\n  height={${H}}${prop}\n>\n  {/* slides */}\n</FlashySlideshow>`;
	}

	const lines: string[] = [`  width={${W}}`, `  height={${H}}`];
	if (s.xBlocks !== 12) lines.push(`  xBlocks={${s.xBlocks}}`);
	if (s.yBlocks !== 3) lines.push(`  yBlocks={${s.yBlocks}}`);
	if (s.minBlockSize !== 3) lines.push(`  minBlockSize={${s.minBlockSize}}`);
	if (s.delay !== 3000) lines.push(`  delay={${s.delay}}`);
	if (s.direction !== "left") lines.push(`  direction="${s.direction}"`);
	if (s.style !== "normal") lines.push(`  style="${s.style}"`);
	if (s.translucent) lines.push("  translucent");
	if (s.randomize) lines.push("  randomize");
	if (s.speed !== 650) lines.push(`  speed={${s.speed}}`);
	if (s.randomize && s.randomness !== 50) lines.push(`  randomness={${s.randomness}}`);
	if (s.rotationEnabled) lines.push(`  rotation={${s.rotation}}`);
	if (s.blurEnabled) lines.push(`  blur={${s.blur}}`);
	if (s.featherEnabled) lines.push(`  feather={${s.feather}}`);
	return `<FlashySlideshow\n${lines.join("\n")}\n>\n  {/* slides */}\n</FlashySlideshow>`;
}

// --- App ---

function App() {
	const [settings, setSettings] = useState<Settings>(parseUrlSettings);
	const [slideIndex, setSlideIndex] = useState(0);
	const [copied, setCopied] = useState(false);

	const update = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
		setSettings((prev) => {
			const next = { ...prev, [key]: value };
			if (key !== "usePreset" && key !== "preset" && key !== "slideType") {
				next.usePreset = false;
			}
			return next;
		});
	}, []);

	const handlePresetChange = useCallback((value: string) => {
		if (value === "custom") {
			setSettings((prev) => ({ ...prev, usePreset: false }));
		} else {
			const preset = value as Preset;
			const values = resolvePresetValues(preset);
			setSettings((prev) => ({ ...prev, usePreset: true, preset, ...values }));
		}
	}, []);

	const toggleOptional = useCallback((prop: "rotation" | "blur" | "feather", on: boolean) => {
		setSettings((prev) => {
			const enabledKey = `${prop}Enabled` as keyof Settings;
			return { ...prev, [enabledKey]: on, usePreset: false };
		});
	}, []);

	// Sync to URL
	useEffect(() => {
		window.history.replaceState(null, "", settingsToUrl(settings));
	}, [settings]);

	const copyUrl = useCallback(() => {
		navigator.clipboard.writeText(window.location.href);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	}, []);

	const code = useMemo(() => buildCodeExample(settings), [settings]);
	const slideshowKey = JSON.stringify(settings);
	const activePreset = PRESETS.find((p) => p.value === settings.preset);

	return (
		<div style={{ minHeight: "100vh", background: "#0f1117", color: "#e1e4e8" }}>
			{/* Header */}
			<header
				style={{
					borderBottom: "1px solid #21262d",
					padding: "24px 0",
					background: "linear-gradient(180deg, #161b22 0%, #0f1117 100%)",
				}}
			>
				<div style={{ maxWidth: "1080px", margin: "0 auto", padding: "0 24px" }}>
					<h1 style={{ margin: 0, fontSize: "28px", fontWeight: 700, color: "#f0f6fc" }}>
						CJ Flashy Slideshow
					</h1>
					<p style={{ margin: "8px 0 0", fontSize: "16px", color: "#8b949e" }}>
						A React component with flash-inspired transition effects. Pass any content as children &mdash; images, HTML, or both.
					</p>
				</div>
			</header>

			<main style={{ maxWidth: "1080px", margin: "0 auto", padding: "32px 24px 64px" }}>
				{/* Top controls row */}
				<div style={{ display: "flex", gap: "16px", marginBottom: "24px", flexWrap: "wrap", alignItems: "flex-end" }}>
					<div>
						<div style={labelStyle}><span>Preset</span></div>
						<select
							value={settings.usePreset ? settings.preset : "custom"}
							onChange={(e) => handlePresetChange(e.target.value)}
							style={{ ...selectStyle, width: "auto" }}
						>
							{PRESETS.map((p) => (
								<option key={p.value} value={p.value}>{p.label}</option>
							))}
							<option value="custom">Custom</option>
						</select>
					</div>

					<div>
						<div style={labelStyle}><span>Slide Content</span></div>
						<div style={{ display: "flex", background: "#21262d", borderRadius: "6px", border: "1px solid #30363d", overflow: "hidden" }}>
							{SLIDE_TYPES.map((st) => (
								<button
									key={st.value}
									type="button"
									onClick={() => update("slideType", st.value)}
									style={{
										padding: "5px 14px", fontSize: "13px", border: "none", cursor: "pointer",
										background: settings.slideType === st.value ? "#388bfd" : "transparent",
										color: settings.slideType === st.value ? "#fff" : "#8b949e",
										fontWeight: settings.slideType === st.value ? 600 : 400,
									}}
								>
									{st.label}
								</button>
							))}
						</div>
					</div>

					<button
						type="button"
						onClick={copyUrl}
						style={{
							padding: "5px 14px", fontSize: "13px", fontWeight: 600,
							border: "1px solid #30363d", borderRadius: "6px",
							background: copied ? "#238636" : "#21262d",
							color: copied ? "#fff" : "#c9d1d9", cursor: "pointer", whiteSpace: "nowrap",
						}}
					>
						{copied ? "Copied!" : "Copy URL"}
					</button>

					{settings.usePreset && activePreset && (
						<div style={{ flex: 1, minWidth: "180px" }}>
							<div style={{ fontSize: "13px", color: "#8b949e", background: "#161b22", border: "1px solid #21262d", borderRadius: "6px", padding: "7px 12px" }}>
								<strong style={{ color: "#f0f6fc" }}>{activePreset.label}:</strong> {activePreset.description}
							</div>
						</div>
					)}
				</div>

				{/* Slideshow + Controls side by side */}
				<div style={{ display: "flex", gap: "24px", alignItems: "flex-start", marginBottom: "32px" }}>
					{/* Left: Slideshow */}
					<div style={{ flexShrink: 0 }}>
						<div
							style={{
								borderRadius: "8px", overflow: "hidden",
								border: "1px solid #30363d",
								boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
								marginBottom: "8px",
							}}
						>
							<FlashySlideshow
								key={slideshowKey}
								width={W}
								height={H}
								xBlocks={settings.xBlocks}
								yBlocks={settings.yBlocks}
								minBlockSize={settings.minBlockSize}
								delay={settings.delay}
								direction={settings.direction}
								style={settings.style}
								translucent={settings.translucent}
								randomize={settings.randomize}
								speed={settings.speed}
								randomness={settings.randomness}
								rotation={settings.rotationEnabled ? settings.rotation : 0}
								blur={settings.blurEnabled ? settings.blur : 0}
								feather={settings.featherEnabled ? settings.feather : 0}
								onSlideChange={setSlideIndex}
							>
								{settings.slideType === "images" &&
									PHOTOS.map((src, i) => <ImageSlide key={i} src={src} />)}
								{settings.slideType === "html" &&
									HTML_SLIDES.map((s, i) => (
										<HtmlSlide key={i} bg={s.bg} title={s.title} subtitle={s.subtitle} />
									))}
								{settings.slideType === "mixed" && [
									<ImageSlide key="m1" src={PHOTOS[0]} />,
									<HtmlSlide key="m2" bg={HTML_SLIDES[1].bg} title={HTML_SLIDES[1].title} subtitle={HTML_SLIDES[1].subtitle} />,
									<ImageSlide key="m3" src={PHOTOS[2]} />,
									<HtmlSlide key="m4" bg={HTML_SLIDES[3].bg} title={HTML_SLIDES[3].title} subtitle={HTML_SLIDES[3].subtitle} />,
									<ImageSlide key="m5" src={PHOTOS[4]} />,
								]}
							</FlashySlideshow>
						</div>
						<div style={{ fontSize: "13px", color: "#484f58" }}>
							Slide {slideIndex + 1} of 5
						</div>
					</div>

					{/* Right: Controls column */}
					<div
						style={{
							flex: 1, minWidth: "260px",
							background: "#161b22",
							border: "1px solid #21262d",
							borderRadius: "8px",
							padding: "16px",
							display: "flex",
							flexDirection: "column",
							gap: "12px",
						}}
					>
						<RangeControl
							label="xBlocks" value={settings.xBlocks}
							onChange={(v) => update("xBlocks", v)}
							min={1} max={50} step={1}
						/>
						<RangeControl
							label="yBlocks" value={settings.yBlocks}
							onChange={(v) => update("yBlocks", v)}
							min={1} max={50} step={1}
						/>
						<RangeControl
							label="minBlockSize" value={settings.minBlockSize}
							onChange={(v) => update("minBlockSize", v)}
							min={0} max={200} step={1}
						/>
						<RangeControl
							label="delay" value={settings.delay}
							onChange={(v) => update("delay", v)}
							min={0} max={10000} step={100} suffix="ms"
						/>
						<SelectControl
							label="Direction" value={settings.direction}
							onChange={(v) => update("direction", v)}
							options={DIRECTIONS.map((d) => ({ value: d, label: d }))}
						/>
						<SelectControl
							label="Style" value={settings.style}
							onChange={(v) => update("style", v)}
							options={[
								{ value: "normal" as BlockStyle, label: "normal" },
								{ value: "rounded" as BlockStyle, label: "rounded" },
							]}
						/>
						<RangeControl
							label="speed" value={settings.speed}
							onChange={(v) => update("speed", v)}
							min={100} max={2500} step={50} suffix="ms"
						/>
						<div style={{ display: "flex", gap: "20px", padding: "4px 0" }}>
							<label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "12px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#8b949e" }}>
								<input type="checkbox" checked={settings.translucent} onChange={(e) => update("translucent", e.target.checked)} style={{ accentColor: "#388bfd", cursor: "pointer", margin: 0 }} />
								translucent
							</label>
							<label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "12px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#8b949e" }}>
								<input type="checkbox" checked={settings.randomize} onChange={(e) => update("randomize", e.target.checked)} style={{ accentColor: "#388bfd", cursor: "pointer", margin: 0 }} />
								randomize
							</label>
						</div>
						{settings.randomize && (
							<RangeControl
								label="randomness" value={settings.randomness}
								onChange={(v) => update("randomness", v)}
								min={0} max={100} step={5} suffix="%"
							/>
						)}
						<div style={{ borderTop: "1px solid #21262d", margin: "2px 0" }} />
						<OptionalRangeControl
							label="rotation" value={settings.rotation}
							enabled={settings.rotationEnabled}
							onToggle={(on) => toggleOptional("rotation", on)}
							onChange={(v) => update("rotation", v)}
							min={0} max={1080} step={15} suffix="°"
						/>
						<OptionalRangeControl
							label="blur" value={settings.blur}
							enabled={settings.blurEnabled}
							onToggle={(on) => toggleOptional("blur", on)}
							onChange={(v) => update("blur", v)}
							min={0} max={20} step={0.5} suffix="px"
						/>
						<OptionalRangeControl
							label="feather" value={settings.feather}
							enabled={settings.featherEnabled}
							onToggle={(on) => toggleOptional("feather", on)}
							onChange={(v) => update("feather", v)}
							min={0} max={50} step={1} suffix="%"
						/>
					</div>
				</div>

				{/* Code example */}
				<div style={{ marginBottom: "48px" }}>
					<h3 style={{ fontSize: "16px", fontWeight: 600, color: "#f0f6fc", margin: "0 0 12px" }}>Code</h3>
					<div style={{ background: "#161b22", border: "1px solid #21262d", borderRadius: "8px", overflow: "hidden" }}>
						<div style={{ padding: "4px 12px", background: "#1c2128", borderBottom: "1px solid #21262d", fontSize: "12px", color: "#484f58" }}>
							tsx
						</div>
						<pre
							style={{
								margin: 0, padding: "16px", fontSize: "13px", lineHeight: 1.6, color: "#c9d1d9", overflowX: "auto",
								fontFamily: "'SF Mono', 'Fira Code', 'Fira Mono', Menlo, Consolas, monospace",
							}}
						>
							<code>{code}</code>
						</pre>
					</div>
				</div>

				{/* Install */}
				<div style={{ background: "#161b22", border: "1px solid #21262d", borderRadius: "8px", padding: "20px" }}>
					<h3 style={{ margin: "0 0 12px", fontSize: "16px", fontWeight: 600, color: "#f0f6fc" }}>Install</h3>
					<pre
						style={{
							margin: 0, background: "#0d1117", borderRadius: "6px", padding: "12px",
							fontSize: "13px", color: "#7ee787", fontFamily: "'SF Mono', Menlo, Consolas, monospace",
						}}
					>
						npm install cj-flashy-slideshow
					</pre>
				</div>
			</main>
		</div>
	);
}

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
