import type { Rect, TilePlan } from "./plan";
import type { ResolvedOptions } from "./types";

export type MediaSource = HTMLImageElement | HTMLVideoElement;

// Fragment shader shapes. Each mirrors one of the DOM renderer's region styles.
export const SHAPE_RECT = 0; // clip-path: inset()
export const SHAPE_CIRCLE = 1; // clip-path: circle()
export const SHAPE_FEATHER_RECT = 2; // two linear-gradient masks, intersected
export const SHAPE_FEATHER_ELLIPSE = 3; // radial-gradient(closest-side) mask

export function gpuShape(rounded: boolean, feathered: boolean): number {
	if (feathered) return rounded ? SHAPE_FEATHER_ELLIPSE : SHAPE_FEATHER_RECT;
	return rounded ? SHAPE_CIRCLE : SHAPE_RECT;
}

// Per-instance layout: quad x,y,w,h | opacity, blur, rotation (rad), unused | origin x,y
export const TILE_FLOATS = 10;

const VERT = `#version 300 es
layout(location = 0) in vec2 a_corner;
layout(location = 1) in vec4 a_quad;
layout(location = 2) in vec4 a_params;
layout(location = 3) in vec2 a_origin;
uniform vec2 u_size;
uniform float u_pad;
out vec2 v_pos;
flat out vec4 v_quad;
flat out vec2 v_params;
void main() {
	vec2 q = a_quad.xy - u_pad + a_corner * (a_quad.zw + 2.0 * u_pad);
	float c = cos(a_params.z);
	float s = sin(a_params.z);
	vec2 d = q - a_origin;
	vec2 p = a_origin + vec2(c * d.x - s * d.y, s * d.x + c * d.y);
	v_pos = q;
	v_quad = a_quad;
	v_params = a_params.xy;
	vec2 ndc = p / u_size * 2.0 - 1.0;
	gl_Position = vec4(ndc.x, -ndc.y, 0.0, 1.0);
}`;

// v_pos is the unrotated position, so the region test and the image lookup
// both rotate with the tile, the same as a CSS transform on the block div.
const FRAG = `#version 300 es
precision highp float;
uniform sampler2D u_tex;
uniform vec2 u_size;
uniform int u_shape;
uniform float u_feather;
uniform vec4 u_fit;
uniform float u_texelsPerPx;
uniform float u_dpr;
in vec2 v_pos;
flat in vec4 v_quad;
flat in vec2 v_params;
out vec4 outColor;

vec4 tap(vec2 uv, float lod) {
	return textureLod(u_tex, uv, lod);
}

// Mip level as a prefilter plus a 3x3 binomial kernel spaced at the blur radius.
// Close enough to CSS blur() at the radii the presets use.
vec4 sampleBlurred(vec2 uv, float blur) {
	float baseLod = log2(max(1.0, u_texelsPerPx / u_dpr));
	if (blur <= 0.0) return tap(uv, baseLod);
	float lod = max(baseLod, log2(max(1.0, blur * u_texelsPerPx)) - 1.0);
	vec2 dx = vec2(blur / u_fit.z, 0.0);
	vec2 dy = vec2(0.0, blur / u_fit.w);
	vec4 c = tap(uv, lod) * 4.0;
	c += (tap(uv + dx, lod) + tap(uv - dx, lod) + tap(uv + dy, lod) + tap(uv - dy, lod)) * 2.0;
	c += tap(uv + dx + dy, lod) + tap(uv + dx - dy, lod) + tap(uv - dx + dy, lod) + tap(uv - dx - dy, lod);
	return c / 16.0;
}

void main() {
	vec2 pos = v_pos;
	if (any(lessThan(pos, vec2(0.0))) || any(greaterThan(pos, u_size))) discard;
	vec2 rel = (pos - v_quad.xy) / v_quad.zw;
	float a = 1.0;
	if (u_shape == 0) {
		if (any(lessThan(rel, vec2(0.0))) || any(greaterThan(rel, vec2(1.0)))) discard;
	} else if (u_shape == 1) {
		float r = v_quad.z * 0.5;
		if (r <= 0.0) discard;
		a = clamp(r - distance(pos, v_quad.xy + r) + 0.5, 0.0, 1.0);
	} else if (u_shape == 2) {
		vec2 e = min(rel, 1.0 - rel) / u_feather;
		a = clamp(e.x, 0.0, 1.0) * clamp(e.y, 0.0, 1.0);
	} else {
		float d = length(rel * 2.0 - 1.0);
		a = clamp((1.0 - d) / (2.0 * u_feather), 0.0, 1.0);
	}
	vec2 uv = (pos - u_fit.xy) / u_fit.zw;
	if (any(lessThan(uv, vec2(0.0))) || any(greaterThan(uv, vec2(1.0)))) discard;
	a *= v_params.x;
	if (a <= 0.0) discard;
	outColor = sampleBlurred(uv, v_params.y) * a;
}`;

function compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
	const shader = gl.createShader(type);
	if (!shader) throw new Error("createShader failed");
	gl.shaderSource(shader, src);
	gl.compileShader(shader);
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		const log = gl.getShaderInfoLog(shader);
		gl.deleteShader(shader);
		throw new Error(`Shader compile failed: ${log}`);
	}
	return shader;
}

export class GpuRenderer {
	readonly canvas: HTMLCanvasElement;
	lost = false;
	private gl: WebGL2RenderingContext;
	private program: WebGLProgram;
	private vao: WebGLVertexArrayObject;
	private cornerBuf: WebGLBuffer;
	private instanceBuf: WebGLBuffer;
	private tex: WebGLTexture;
	private capacity = 0;
	private width = 0;
	private height = 0;
	private dpr = 1;
	private fit: [number, number, number, number] = [0, 0, 1, 1];
	private texelsPerPx = 1;
	private loc: Record<string, WebGLUniformLocation | null>;
	private onLost = () => {
		this.lost = true;
	};

	static create(canvas: HTMLCanvasElement): GpuRenderer | null {
		const gl = canvas.getContext("webgl2", {
			alpha: true,
			premultipliedAlpha: true,
			antialias: false,
			preserveDrawingBuffer: false,
		});
		if (!gl || gl.isContextLost()) return null;
		try {
			return new GpuRenderer(canvas, gl);
		} catch {
			return null;
		}
	}

	private constructor(canvas: HTMLCanvasElement, gl: WebGL2RenderingContext) {
		this.canvas = canvas;
		this.gl = gl;

		const program = gl.createProgram();
		const vs = compile(gl, gl.VERTEX_SHADER, VERT);
		const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
		gl.attachShader(program, vs);
		gl.attachShader(program, fs);
		gl.linkProgram(program);
		gl.deleteShader(vs);
		gl.deleteShader(fs);
		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
			const log = gl.getProgramInfoLog(program);
			gl.deleteProgram(program);
			throw new Error(`Program link failed: ${log}`);
		}
		this.program = program;

		this.loc = {};
		for (const name of [
			"u_tex",
			"u_size",
			"u_pad",
			"u_shape",
			"u_feather",
			"u_fit",
			"u_texelsPerPx",
			"u_dpr",
		]) {
			this.loc[name] = gl.getUniformLocation(program, name);
		}

		this.vao = gl.createVertexArray();
		gl.bindVertexArray(this.vao);

		this.cornerBuf = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.cornerBuf);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
		gl.enableVertexAttribArray(0);
		gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

		this.instanceBuf = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuf);
		const stride = TILE_FLOATS * 4;
		gl.enableVertexAttribArray(1);
		gl.vertexAttribPointer(1, 4, gl.FLOAT, false, stride, 0);
		gl.vertexAttribDivisor(1, 1);
		gl.enableVertexAttribArray(2);
		gl.vertexAttribPointer(2, 4, gl.FLOAT, false, stride, 16);
		gl.vertexAttribDivisor(2, 1);
		gl.enableVertexAttribArray(3);
		gl.vertexAttribPointer(3, 2, gl.FLOAT, false, stride, 32);
		gl.vertexAttribDivisor(3, 1);
		gl.bindVertexArray(null);

		this.tex = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, this.tex);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

		canvas.addEventListener("webglcontextlost", this.onLost);
	}

	resize(width: number, height: number, dpr: number) {
		this.width = width;
		this.height = height;
		this.dpr = dpr;
		const bw = Math.round(width * dpr);
		const bh = Math.round(height * dpr);
		if (this.canvas.width !== bw) this.canvas.width = bw;
		if (this.canvas.height !== bh) this.canvas.height = bh;
	}

	// Uploads the media and works out where object-fit places it in the container.
	// Returns false when the browser refuses the upload (cross-origin without CORS).
	setSource(media: MediaSource): boolean {
		const iw = media instanceof HTMLVideoElement ? media.videoWidth : media.naturalWidth;
		const ih = media instanceof HTMLVideoElement ? media.videoHeight : media.naturalHeight;
		if (!iw || !ih) return false;

		let sx = this.width / iw;
		let sy = this.height / ih;
		switch (getComputedStyle(media).objectFit) {
			case "cover":
				sx = sy = Math.max(sx, sy);
				break;
			case "contain":
				sx = sy = Math.min(sx, sy);
				break;
			case "none":
				sx = sy = 1;
				break;
			case "scale-down":
				sx = sy = Math.min(1, sx, sy);
				break;
		}
		const dw = iw * sx;
		const dh = ih * sy;
		this.fit = [(this.width - dw) / 2, (this.height - dh) / 2, dw, dh];
		this.texelsPerPx = iw / dw;
		return this.upload(media);
	}

	upload(media: MediaSource): boolean {
		const gl = this.gl;
		gl.bindTexture(gl.TEXTURE_2D, this.tex);
		gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
		try {
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, media);
		} catch {
			return false;
		}
		gl.generateMipmap(gl.TEXTURE_2D);
		return gl.getError() === gl.NO_ERROR;
	}

	draw(data: Float32Array, count: number, shape: number, feather: number) {
		const gl = this.gl;
		gl.viewport(0, 0, this.canvas.width, this.canvas.height);
		gl.clearColor(0, 0, 0, 0);
		gl.clear(gl.COLOR_BUFFER_BIT);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuf);
		if (data.length > this.capacity) {
			gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
			this.capacity = data.length;
		} else {
			gl.bufferSubData(gl.ARRAY_BUFFER, 0, data, 0, count * TILE_FLOATS);
		}

		// biome-ignore lint/correctness/useHookAtTopLevel: WebGL call, not a React hook
		gl.useProgram(this.program);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this.tex);
		gl.uniform1i(this.loc.u_tex, 0);
		gl.uniform2f(this.loc.u_size, this.width, this.height);
		gl.uniform1f(this.loc.u_pad, shape === SHAPE_CIRCLE ? 1 : 0);
		gl.uniform1i(this.loc.u_shape, shape);
		gl.uniform1f(this.loc.u_feather, feather);
		gl.uniform4f(this.loc.u_fit, ...this.fit);
		gl.uniform1f(this.loc.u_texelsPerPx, this.texelsPerPx);
		gl.uniform1f(this.loc.u_dpr, this.dpr);

		gl.enable(gl.BLEND);
		gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
		gl.bindVertexArray(this.vao);
		gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count);
		gl.bindVertexArray(null);
	}

	clear() {
		const gl = this.gl;
		gl.clearColor(0, 0, 0, 0);
		gl.clear(gl.COLOR_BUFFER_BIT);
	}

	// Frees GL objects but leaves the context alive, since getContext() on the
	// same canvas would hand a lost context back to the next renderer.
	dispose() {
		const gl = this.gl;
		this.canvas.removeEventListener("webglcontextlost", this.onLost);
		gl.deleteTexture(this.tex);
		gl.deleteBuffer(this.cornerBuf);
		gl.deleteBuffer(this.instanceBuf);
		gl.deleteVertexArray(this.vao);
		gl.deleteProgram(this.program);
	}
}

// The slide qualifies when its only content is one img/video that fills the
// layer untransformed. Anything else stays on the DOM renderer.
export function findMediaSource(layer: HTMLElement): MediaSource | null {
	let media: Element | null = null;
	for (const node of layer.childNodes) {
		if (node.nodeType === Node.TEXT_NODE) {
			if (node.textContent?.trim()) return null;
		} else if (node.nodeType === Node.ELEMENT_NODE) {
			if (media) return null;
			media = node as Element;
		}
	}
	if (!(media instanceof HTMLImageElement || media instanceof HTMLVideoElement)) return null;

	const cs = getComputedStyle(media);
	if (
		cs.objectPosition !== "50% 50%" ||
		cs.transform !== "none" ||
		cs.filter !== "none" ||
		cs.clipPath !== "none" ||
		cs.opacity !== "1"
	) {
		return null;
	}

	const a = layer.getBoundingClientRect();
	const b = media.getBoundingClientRect();
	if (
		Math.abs(a.left - b.left) > 1 ||
		Math.abs(a.top - b.top) > 1 ||
		Math.abs(a.width - b.width) > 1 ||
		Math.abs(a.height - b.height) > 1
	) {
		return null;
	}
	return media;
}

export async function mediaReady(media: MediaSource, timeoutMs = 2000): Promise<boolean> {
	if (media instanceof HTMLVideoElement) return media.readyState >= 2 && media.videoWidth > 0;
	const decoded = media.decode().then(
		() => true,
		() => false,
	);
	const timeout = new Promise<boolean>((resolve) => setTimeout(() => resolve(false), timeoutMs));
	return (await Promise.race([decoded, timeout])) && media.naturalWidth > 0;
}

type Vec4 = [number, number, number, number];

// A plan converted into the shape's interpolation space. CSS interpolates
// inset() edges, circle() center/radius, and mask position/size, so the GPU
// has to lerp the same quantities to land on the same in-between frames.
export interface GpuTile {
	plan: TilePlan;
	initial: Vec4;
	path: Vec4[];
	mid: Vec4;
	expanded: Vec4;
	final: Vec4;
}

function toRegion(r: Rect, shape: number, w: number, h: number): Vec4 {
	if (shape === SHAPE_RECT) {
		return [Math.max(0, r.x), Math.max(0, r.y), Math.min(w, r.x + r.w), Math.min(h, r.y + r.h)];
	}
	if (shape === SHAPE_CIRCLE) return [r.x + r.w / 2, r.y + r.h / 2, Math.min(r.w, r.h) / 2, 0];
	return [r.x, r.y, r.w, r.h];
}

export function toGpuTile(plan: TilePlan, shape: number, w: number, h: number): GpuTile {
	const region = (r: Rect) => toRegion(r, shape, w, h);
	return {
		plan,
		initial: region(plan.initial),
		path: plan.path.map(region),
		mid: region(plan.mid),
		expanded: region(plan.expanded),
		final: region(plan.final),
	};
}

const scratch: Vec4 = [0, 0, 0, 0];

function lerp4(a: Vec4, b: Vec4, t: number) {
	for (let k = 0; k < 4; k++) scratch[k] = a[k] + (b[k] - a[k]) * t;
}

// Fills one frame of instance data. Returns true once every tile has finished.
export function writeTiles(
	out: Float32Array,
	tiles: GpuTile[],
	elapsed: number,
	opts: ResolvedOptions,
	shape: number,
): boolean {
	const feathered = shape === SHAPE_FEATHER_RECT || shape === SHAPE_FEATHER_ELLIPSE;
	let allDone = true;

	for (let i = 0; i < tiles.length; i++) {
		const tile = tiles[i];
		const p = tile.plan;
		const local = elapsed - p.delay;
		let opacity: number;
		let blur: number;
		let rotation = 0;

		if (local < 0) {
			lerp4(tile.initial, tile.initial, 0);
			opacity = p.initialOpacity;
			blur = opts.pathBlur;
			allDone = false;
		} else if (local < p.phase1Duration) {
			const s = (local / p.phase1Duration) * (tile.path.length - 1);
			const k = Math.min(Math.floor(s), tile.path.length - 2);
			lerp4(tile.path[k], tile.path[k + 1], s - k);
			opacity = p.opacity;
			blur = opts.pathBlur;
			allDone = false;
		} else if (local < p.phase1Duration + p.phase2Duration) {
			const s = (local - p.phase1Duration) / p.phase2Duration;
			let tileBlur = 0;
			if (feathered && s >= 0.75) {
				lerp4(tile.expanded, tile.final, (s - 0.75) / 0.25);
				opacity = 1;
			} else {
				const u = feathered ? s / 0.75 : s;
				lerp4(tile.mid, tile.expanded, u);
				opacity = p.opacity + (1 - p.opacity) * u;
				rotation = p.tileRotation * (1 - u);
				tileBlur = opts.tileBlur * (1 - u);
			}
			// Without a tileBlur keyframe the DOM block keeps phase 1's filled-forward
			// pathBlur until phase 2 finishes
			blur = opts.tileBlur > 0 ? tileBlur : opts.pathBlur;
			allDone = false;
		} else {
			lerp4(tile.final, tile.final, 0);
			opacity = 1;
			blur = 0;
		}

		const o = i * TILE_FLOATS;
		if (shape === SHAPE_RECT) {
			out[o] = scratch[0];
			out[o + 1] = scratch[1];
			out[o + 2] = Math.max(0, scratch[2] - scratch[0]);
			out[o + 3] = Math.max(0, scratch[3] - scratch[1]);
		} else if (shape === SHAPE_CIRCLE) {
			const r = Math.max(0, scratch[2]);
			out[o] = scratch[0] - r;
			out[o + 1] = scratch[1] - r;
			out[o + 2] = r * 2;
			out[o + 3] = r * 2;
		} else {
			out[o] = scratch[0];
			out[o + 1] = scratch[1];
			out[o + 2] = Math.max(0, scratch[2]);
			out[o + 3] = Math.max(0, scratch[3]);
		}
		out[o + 4] = opacity;
		out[o + 5] = blur;
		out[o + 6] = (rotation * Math.PI) / 180;
		out[o + 7] = 0;
		out[o + 8] = p.originX;
		out[o + 9] = p.originY;
	}
	return allDone;
}
