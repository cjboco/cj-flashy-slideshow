import React from "react";
import { createRoot } from "react-dom/client";
import { FlashySlideshow } from "../src";

const W = 250;
const H = 150;

const imageSlide = (src: string) => (
	<img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
);

const htmlSlide = (bg: string, text: string) => (
	<div
		style={{
			width: "100%",
			height: "100%",
			display: "flex",
			alignItems: "center",
			justifyContent: "center",
			background: bg,
			color: "#fff",
			fontSize: "18px",
			fontWeight: "bold",
			textAlign: "center",
		}}
	>
		{text}
	</div>
);

function App() {
	return (
		<div style={{ fontFamily: "Helvetica, Arial, sans-serif", padding: "20px" }}>
			<h1>CJ Flashy Slideshow - React</h1>
			<p>A React component that gives your slideshows some flash-like transitions.</p>

			<h3>Bricks (Default) - Images</h3>
			<div style={{ display: "inline-block", marginBottom: 30, border: "10px solid #000" }}>
				<FlashySlideshow width={W} height={H}>
					{imageSlide("./images/image_a.jpg")}
					{imageSlide("./images/image_b.jpg")}
					{imageSlide("./images/image_c.jpg")}
				</FlashySlideshow>
			</div>

			<h3>Cubism - HTML Content</h3>
			<div style={{ display: "inline-block", marginBottom: 30, border: "10px solid #000" }}>
				<FlashySlideshow width={W} height={H} preset="cubism">
					{htmlSlide("linear-gradient(135deg, #667eea 0%, #764ba2 100%)", "Slide One")}
					{htmlSlide("linear-gradient(135deg, #f093fb 0%, #f5576c 100%)", "Slide Two")}
					{htmlSlide("linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)", "Slide Three")}
				</FlashySlideshow>
			</div>

			<h3>Rain - Mixed Content</h3>
			<div style={{ display: "inline-block", marginBottom: 30, border: "10px solid #000" }}>
				<FlashySlideshow width={W} height={H} preset="rain">
					{imageSlide("./images/image_a.jpg")}
					{htmlSlide("linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)", "HTML Slide")}
					{imageSlide("./images/image_c.jpg")}
				</FlashySlideshow>
			</div>

			<h3>Blinds</h3>
			<div style={{ display: "inline-block", marginBottom: 30, border: "10px solid #000" }}>
				<FlashySlideshow width={W} height={H} preset="blinds">
					{imageSlide("./images/image_a.jpg")}
					{imageSlide("./images/image_b.jpg")}
					{imageSlide("./images/image_c.jpg")}
				</FlashySlideshow>
			</div>

			<h3>Blinds2</h3>
			<div style={{ display: "inline-block", marginBottom: 30, border: "10px solid #000" }}>
				<FlashySlideshow width={W} height={H} preset="blinds2">
					{imageSlide("./images/image_a.jpg")}
					{imageSlide("./images/image_b.jpg")}
					{imageSlide("./images/image_c.jpg")}
				</FlashySlideshow>
			</div>

			<h3>Transport</h3>
			<div style={{ display: "inline-block", marginBottom: 30, border: "10px solid #000" }}>
				<FlashySlideshow width={W} height={H} preset="transport">
					{imageSlide("./images/image_a.jpg")}
					{imageSlide("./images/image_b.jpg")}
					{imageSlide("./images/image_c.jpg")}
				</FlashySlideshow>
			</div>

			<h3>Transport2</h3>
			<div style={{ display: "inline-block", marginBottom: 30, border: "10px solid #000" }}>
				<FlashySlideshow width={W} height={H} preset="transport2">
					{imageSlide("./images/image_a.jpg")}
					{imageSlide("./images/image_b.jpg")}
					{imageSlide("./images/image_c.jpg")}
				</FlashySlideshow>
			</div>

			<h3>Custom</h3>
			<div style={{ display: "inline-block", marginBottom: 30, border: "10px solid #000" }}>
				<FlashySlideshow
					width={W}
					height={H}
					xBlocks={1}
					yBlocks={1}
					minBlockSize={100}
					style="normal"
					delay={900}
					direction="random"
					translucent={false}
					sloppy={false}
				>
					{imageSlide("./images/image_a.jpg")}
					{imageSlide("./images/image_b.jpg")}
					{imageSlide("./images/image_c.jpg")}
				</FlashySlideshow>
			</div>
		</div>
	);
}

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
