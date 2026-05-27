import type { ReactNode } from "react";

export type Direction =
	| "top"
	| "topleft"
	| "topright"
	| "left"
	| "bottom"
	| "bottomleft"
	| "bottomright"
	| "right"
	| "random"
	| "none"
	| "wipeLeft"
	| "wipeRight"
	| "wipeTop"
	| "wipeBottom"
	| "wipeTopLeft"
	| "wipeTopRight"
	| "wipeBottomLeft"
	| "wipeBottomRight";

export type BlockStyle = "normal" | "rounded";

export type Preset =
	| "bricks"
	| "cubism"
	| "rain"
	| "blinds"
	| "blinds2"
	| "transport"
	| "transport2"
	| "spiral"
	| "cascade"
	| "dissolve"
	| "vortex"
	| "pixelate"
	| "wipe"
	| "wipeDissolve";

export interface FlashySlideshowOptions {
	preset?: Preset;
	xBlocks?: number;
	yBlocks?: number;
	minBlockSize?: number;
	delay?: number;
	direction?: Direction;
	style?: BlockStyle;
	translucent?: boolean;
	randomize?: boolean;
	speed?: number;
	randomness?: number;
	rotation?: number;
	blur?: number;
	feather?: number;
}

export type ObjectFit = "cover" | "contain";

export interface FlashySlideshowProps extends FlashySlideshowOptions {
	children: ReactNode[];
	width?: number;
	height?: number;
	objectFit?: ObjectFit;
	className?: string;
	onSlideChange?: (index: number) => void;
}

export interface BlockData {
	x: number;
	y: number;
	startTop: number;
	startLeft: number;
	endTop: number;
	endLeft: number;
	opacity: number;
}

export interface ResolvedOptions {
	xBlocks: number;
	yBlocks: number;
	minBlockSize: number;
	delay: number;
	direction: Direction;
	currentDirection: Direction;
	style: BlockStyle;
	translucent: boolean;
	randomize: boolean;
	speed: number;
	randomness: number;
	rotation: number;
	blur: number;
	feather: number;
}
