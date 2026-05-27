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
	| "none";

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
	| "pixelate";

export interface FlashySlideshowOptions {
	preset?: Preset;
	xBlocks?: number;
	yBlocks?: number;
	minBlockSize?: number;
	delay?: number;
	direction?: Direction;
	style?: BlockStyle;
	translucent?: boolean;
	sloppy?: boolean;
	rotation?: number;
	blur?: number;
	feather?: number;
}

export interface FlashySlideshowProps extends FlashySlideshowOptions {
	children: ReactNode[];
	width: number;
	height: number;
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
	sloppy: boolean;
	rotation: number;
	blur: number;
	feather: number;
}
