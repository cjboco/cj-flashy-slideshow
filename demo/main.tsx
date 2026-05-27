import { useState, useMemo } from "react";
import { createRoot } from "react-dom/client";
import { FlashySlideshow } from "../src";
import type { Preset } from "../src/types";

const PRESETS: { value: Preset; label: string; description: string }[] = [
	{ value: "bricks", label: "Bricks", description: "Classic brick-laying reveal from the left" },
	{ value: "cubism", label: "Cubism", description: "Abstract, overlapping translucent blocks" },
	{ value: "rain", label: "Rain", description: "Rounded drops falling from the top" },
	{ value: "blinds", label: "Blinds", description: "Horizontal blinds opening from the top" },
	{ value: "blinds2", label: "Blinds 2", description: "Vertical blinds opening from the top" },
	{ value: "transport", label: "Transport", description: "Translucent horizontal strips sliding in" },
	{ value: "transport2", label: "Transport 2", description: "Translucent vertical strips sliding in" },
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
	{
		bg: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
		title: "Welcome",
		subtitle: "CJ Flashy Slideshow",
	},
	{
		bg: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
		title: "Beautiful",
		subtitle: "Flash-like transitions",
	},
	{
		bg: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
		title: "Flexible",
		subtitle: "7 built-in presets",
	},
	{
		bg: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
		title: "Lightweight",
		subtitle: "Zero dependencies",
	},
	{
		bg: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
		title: "React",
		subtitle: "Built for modern apps",
	},
];

const W = 640;
const H = 400;

function ImageSlide({ src }: { src: string }) {
	return (
		<img
			src={src}
			alt=""
			style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
		/>
	);
}

function HtmlSlide({ bg, title, subtitle }: { bg: string; title: string; subtitle: string }) {
	return (
		<div
			style={{
				width: "100%",
				height: "100%",
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				background: bg,
				color: "#fff",
				textAlign: "center",
				fontFamily: "'Segoe UI', system-ui, sans-serif",
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

function buildCodeExample(preset: Preset, slideType: SlideType): string {
	const presetProp = preset === "bricks" ? "" : ` preset="${preset}"`;

	if (slideType === "images") {
		return `<FlashySlideshow width={${W}} height={${H}}${presetProp}>
  <img src="/photos/nature-1.jpg" alt="Nature" />
  <img src="/photos/nature-2.jpg" alt="Mountains" />
  <img src="/photos/nature-3.jpg" alt="Forest" />
</FlashySlideshow>`;
	}

	if (slideType === "html") {
		return `<FlashySlideshow width={${W}} height={${H}}${presetProp}>
  <div className="slide slide-blue">
    <h2>Welcome</h2>
    <p>CJ Flashy Slideshow</p>
  </div>
  <div className="slide slide-pink">
    <h2>Beautiful</h2>
    <p>Flash-like transitions</p>
  </div>
  <div className="slide slide-teal">
    <h2>Flexible</h2>
    <p>7 built-in presets</p>
  </div>
</FlashySlideshow>`;
	}

	return `<FlashySlideshow width={${W}} height={${H}}${presetProp}>
  <img src="/photos/nature-1.jpg" alt="Nature" />
  <div className="slide slide-gradient">
    <h2>HTML Slide</h2>
  </div>
  <img src="/photos/nature-2.jpg" alt="Mountains" />
</FlashySlideshow>`;
}

function App() {
	const [preset, setPreset] = useState<Preset>("bricks");
	const [slideType, setSlideType] = useState<SlideType>("images");
	const [slideIndex, setSlideIndex] = useState(0);

	const activePreset = PRESETS.find((p) => p.value === preset)!;
	const code = useMemo(() => buildCodeExample(preset, slideType), [preset, slideType]);

	// Use a key to force remount when preset or slide type changes
	const slideshowKey = `${preset}-${slideType}`;

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
				<div style={{ maxWidth: "960px", margin: "0 auto", padding: "0 24px" }}>
					<h1 style={{ margin: 0, fontSize: "28px", fontWeight: 700, color: "#f0f6fc" }}>
						CJ Flashy Slideshow
					</h1>
					<p style={{ margin: "8px 0 0", fontSize: "16px", color: "#8b949e" }}>
						A React component with flash-inspired transition effects. Pass any content as children &mdash; images, HTML, or both.
					</p>
				</div>
			</header>

			<main style={{ maxWidth: "960px", margin: "0 auto", padding: "32px 24px 64px" }}>
				{/* Controls */}
				<div
					style={{
						display: "flex",
						gap: "24px",
						marginBottom: "24px",
						flexWrap: "wrap",
						alignItems: "flex-end",
					}}
				>
					{/* Preset selector */}
					<div>
						<label
							style={{
								display: "block",
								fontSize: "12px",
								fontWeight: 600,
								textTransform: "uppercase",
								letterSpacing: "0.05em",
								color: "#8b949e",
								marginBottom: "8px",
							}}
						>
							Preset
						</label>
						<select
							value={preset}
							onChange={(e) => setPreset(e.target.value as Preset)}
							style={{
								appearance: "none",
								background: "#21262d",
								color: "#f0f6fc",
								border: "1px solid #30363d",
								borderRadius: "6px",
								padding: "8px 32px 8px 12px",
								fontSize: "14px",
								cursor: "pointer",
								backgroundImage:
									"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%238b949e' viewBox='0 0 16 16'%3E%3Cpath d='M4.427 7.427l3.396 3.396a.25.25 0 00.354 0l3.396-3.396A.25.25 0 0011.396 7H4.604a.25.25 0 00-.177.427z'/%3E%3C/svg%3E\")",
								backgroundRepeat: "no-repeat",
								backgroundPosition: "right 10px center",
							}}
						>
							{PRESETS.map((p) => (
								<option key={p.value} value={p.value}>
									{p.label}
								</option>
							))}
						</select>
					</div>

					{/* Slide type tabs */}
					<div>
						<label
							style={{
								display: "block",
								fontSize: "12px",
								fontWeight: 600,
								textTransform: "uppercase",
								letterSpacing: "0.05em",
								color: "#8b949e",
								marginBottom: "8px",
							}}
						>
							Slide Content
						</label>
						<div
							style={{
								display: "flex",
								background: "#21262d",
								borderRadius: "6px",
								border: "1px solid #30363d",
								overflow: "hidden",
							}}
						>
							{SLIDE_TYPES.map((st) => (
								<button
									key={st.value}
									type="button"
									onClick={() => setSlideType(st.value)}
									style={{
										padding: "8px 16px",
										fontSize: "14px",
										border: "none",
										cursor: "pointer",
										background: slideType === st.value ? "#388bfd" : "transparent",
										color: slideType === st.value ? "#fff" : "#8b949e",
										fontWeight: slideType === st.value ? 600 : 400,
										transition: "background 0.15s, color 0.15s",
									}}
								>
									{st.label}
								</button>
							))}
						</div>
					</div>

					{/* Preset description */}
					<div style={{ flex: 1, minWidth: "200px" }}>
						<div
							style={{
								fontSize: "13px",
								color: "#8b949e",
								background: "#161b22",
								border: "1px solid #21262d",
								borderRadius: "6px",
								padding: "10px 14px",
							}}
						>
							<strong style={{ color: "#f0f6fc" }}>{activePreset.label}:</strong>{" "}
							{activePreset.description}
						</div>
					</div>
				</div>

				{/* Slideshow */}
				<div
					style={{
						borderRadius: "8px",
						overflow: "hidden",
						border: "1px solid #30363d",
						boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
						marginBottom: "8px",
						display: "inline-block",
					}}
				>
					<FlashySlideshow
						key={slideshowKey}
						width={W}
						height={H}
						preset={preset}
						onSlideChange={setSlideIndex}
					>
						{slideType === "images" &&
							PHOTOS.map((src, i) => <ImageSlide key={i} src={src} />)}
						{slideType === "html" &&
							HTML_SLIDES.map((s, i) => (
								<HtmlSlide key={i} bg={s.bg} title={s.title} subtitle={s.subtitle} />
							))}
						{slideType === "mixed" && [
							<ImageSlide key="m1" src={PHOTOS[0]} />,
							<HtmlSlide
								key="m2"
								bg={HTML_SLIDES[1].bg}
								title={HTML_SLIDES[1].title}
								subtitle={HTML_SLIDES[1].subtitle}
							/>,
							<ImageSlide key="m3" src={PHOTOS[2]} />,
							<HtmlSlide
								key="m4"
								bg={HTML_SLIDES[3].bg}
								title={HTML_SLIDES[3].title}
								subtitle={HTML_SLIDES[3].subtitle}
							/>,
							<ImageSlide key="m5" src={PHOTOS[4]} />,
						]}
					</FlashySlideshow>
				</div>

				{/* Slide indicator */}
				<div style={{ fontSize: "13px", color: "#484f58", marginBottom: "32px" }}>
					Slide {slideIndex + 1} of 5
				</div>

				{/* Code example */}
				<div>
					<h3
						style={{
							fontSize: "16px",
							fontWeight: 600,
							color: "#f0f6fc",
							margin: "0 0 12px",
						}}
					>
						Code
					</h3>
					<div
						style={{
							background: "#161b22",
							border: "1px solid #21262d",
							borderRadius: "8px",
							overflow: "hidden",
						}}
					>
						<div
							style={{
								padding: "4px 12px",
								background: "#1c2128",
								borderBottom: "1px solid #21262d",
								fontSize: "12px",
								color: "#484f58",
							}}
						>
							tsx
						</div>
						<pre
							style={{
								margin: 0,
								padding: "16px",
								fontSize: "13px",
								lineHeight: 1.6,
								color: "#c9d1d9",
								overflowX: "auto",
								fontFamily: "'SF Mono', 'Fira Code', 'Fira Mono', Menlo, Consolas, monospace",
							}}
						>
							<code>{code}</code>
						</pre>
					</div>
				</div>

				{/* Install / Props reference */}
				<div style={{ marginTop: "48px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
					{/* Install */}
					<div
						style={{
							background: "#161b22",
							border: "1px solid #21262d",
							borderRadius: "8px",
							padding: "20px",
						}}
					>
						<h3 style={{ margin: "0 0 12px", fontSize: "16px", fontWeight: 600, color: "#f0f6fc" }}>
							Install
						</h3>
						<pre
							style={{
								margin: 0,
								background: "#0d1117",
								borderRadius: "6px",
								padding: "12px",
								fontSize: "13px",
								color: "#7ee787",
								fontFamily: "'SF Mono', Menlo, Consolas, monospace",
							}}
						>
							npm install cj-flashy-slideshow
						</pre>
					</div>

					{/* Props */}
					<div
						style={{
							background: "#161b22",
							border: "1px solid #21262d",
							borderRadius: "8px",
							padding: "20px",
						}}
					>
						<h3 style={{ margin: "0 0 12px", fontSize: "16px", fontWeight: 600, color: "#f0f6fc" }}>
							Props
						</h3>
						<table
							style={{
								width: "100%",
								fontSize: "13px",
								borderCollapse: "collapse",
								color: "#c9d1d9",
							}}
						>
							<tbody>
								{[
									["width / height", "number", "Required dimensions"],
									["preset", "Preset", "Animation preset name"],
									["delay", "number", "ms between transitions"],
									["direction", "Direction", "Block entry direction"],
									["translucent", "boolean", "Semi-transparent blocks"],
									["sloppy", "boolean", "Randomize timing"],
								].map(([name, type, desc]) => (
									<tr key={name} style={{ borderBottom: "1px solid #21262d" }}>
										<td style={{ padding: "6px 8px 6px 0", fontFamily: "monospace", color: "#79c0ff" }}>
											{name}
										</td>
										<td style={{ padding: "6px 8px", color: "#8b949e" }}>{type}</td>
										<td style={{ padding: "6px 0 6px 8px", color: "#8b949e" }}>{desc}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			</main>
		</div>
	);
}

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
