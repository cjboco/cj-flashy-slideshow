import React from "react";
import { createRoot } from "react-dom/client";
import { FlashySlideshow } from "../src";

const images = [
	"./images/image_a.jpg",
	"./images/image_b.jpg",
	"./images/image_c.jpg",
];

function App() {
	return (
		<div style={{ fontFamily: "Helvetica, Arial, sans-serif", padding: "20px" }}>
			<h1>CJ Flashy Slideshow - React</h1>
			<p>A React component that gives your slideshows some flash-like transitions.</p>

			<h3>Bricks (Default)</h3>
			<div style={{ marginBottom: 30, border: "10px solid #000" }}>
				<FlashySlideshow images={images} width={250} height={150} />
			</div>

			<h3>Cubism</h3>
			<div style={{ marginBottom: 30, border: "10px solid #000" }}>
				<FlashySlideshow images={images} width={250} height={150} preset="cubism" />
			</div>

			<h3>Rain</h3>
			<div style={{ marginBottom: 30, border: "10px solid #000" }}>
				<FlashySlideshow images={images} width={250} height={150} preset="rain" />
			</div>

			<h3>Blinds</h3>
			<div style={{ marginBottom: 30, border: "10px solid #000" }}>
				<FlashySlideshow images={images} width={250} height={150} preset="blinds" />
			</div>

			<h3>Blinds2</h3>
			<div style={{ marginBottom: 30, border: "10px solid #000" }}>
				<FlashySlideshow images={images} width={250} height={150} preset="blinds2" />
			</div>

			<h3>Transport</h3>
			<div style={{ marginBottom: 30, border: "10px solid #000" }}>
				<FlashySlideshow images={images} width={250} height={150} preset="transport" />
			</div>

			<h3>Transport2</h3>
			<div style={{ marginBottom: 30, border: "10px solid #000" }}>
				<FlashySlideshow images={images} width={250} height={150} preset="transport2" />
			</div>

			<h3>Custom</h3>
			<div style={{ marginBottom: 30, border: "10px solid #000" }}>
				<FlashySlideshow
					images={images}
					width={250}
					height={150}
					xBlocks={1}
					yBlocks={1}
					minBlockSize={100}
					style="normal"
					delay={900}
					direction="random"
					translucent={false}
					sloppy={false}
				/>
			</div>
		</div>
	);
}

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
