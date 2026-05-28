# CJ Flashy Slideshow

A React component that gives your slideshows some flash-like transitions.

[![npm version](https://img.shields.io/npm/v/@cjboco/cj-flashy-slideshow.svg)](https://www.npmjs.com/package/@cjboco/cj-flashy-slideshow)
[![license](https://img.shields.io/badge/license-BSD--3--Clause-blue.svg)](https://github.com/cjboco/cj-flashy-slideshow/blob/master/LICENSE)
[![deploy](https://img.shields.io/github/actions/workflow/status/cjboco/cj-flashy-slideshow/deploy-demo.yml?label=demo)](https://cjboco.github.io/cj-flashy-slideshow/)

View the [online demo](https://cjboco.github.io/cj-flashy-slideshow/).

## Install

```bash
npm install cj-flashy-slideshow
```

## Requirements

- React 18+ (works with React 19)

## Usage

Pass any content as children — images, HTML elements, or a mix of both. Each direct child is treated as a slide.

```tsx
import { FlashySlideshow } from "cj-flashy-slideshow";

function App() {
  return (
    <FlashySlideshow width={640} height={400} preset="bricks">
      <img src="/photos/nature-1.jpg" alt="Nature" />
      <img src="/photos/nature-2.jpg" alt="Mountains" />
      <img src="/photos/nature-3.jpg" alt="Forest" />
    </FlashySlideshow>
  );
}
```

### HTML Slides

Slides don't have to be images. Any React node works:

```tsx
<FlashySlideshow width={640} height={400} preset="cubism">
  <div
    style={{
      background: "linear-gradient(135deg, #667eea, #764ba2)",
      color: "#fff",
    }}
  >
    <h2>Welcome</h2>
  </div>
  <div
    style={{
      background: "linear-gradient(135deg, #f093fb, #f5576c)",
      color: "#fff",
    }}
  >
    <h2>Beautiful Transitions</h2>
  </div>
</FlashySlideshow>
```

### Mixed Content

You can freely mix images and HTML slides:

```tsx
<FlashySlideshow width={640} height={400}>
  <img src="/photos/nature-1.jpg" alt="Nature" />
  <div className="slide-gradient">
    <h2>HTML Slide</h2>
  </div>
  <img src="/photos/nature-2.jpg" alt="Mountains" />
</FlashySlideshow>
```

### Auto-Sizing

When `width` and `height` are omitted, the slideshow fills its parent container at 100%. The component uses a `ResizeObserver` internally to measure pixel dimensions for the animation math. The `objectFit` prop controls how `<img>` and `<video>` children fill the space.

```tsx
{/* Fills the parent container, images cover the area */}
<div style={{ width: "100vw", height: "100vh" }}>
  <FlashySlideshow preset="dissolve">
    <img src="/photos/wide.jpg" alt="Wide" />
    <img src="/photos/tall.jpg" alt="Tall" />
  </FlashySlideshow>
</div>

{/* Contain images (letterboxed) instead of cropping */}
<div style={{ width: 800, height: 600 }}>
  <FlashySlideshow objectFit="contain" preset="bricks">
    <img src="/photos/nature-1.jpg" alt="Nature" />
    <img src="/photos/nature-2.jpg" alt="Mountains" />
  </FlashySlideshow>
</div>
```

> **Note:** The parent element must have a defined height when using auto-sizing, otherwise the `100%` height will collapse to zero.

### Wipe Transitions

Wipe directions create a classic film-style wipe where the transition edge has a flashy particle effect. The reveal sweeps across the image as a wave — blocks behind the edge are fully revealed, blocks at the edge are mid-animation, and blocks ahead are untouched.

```tsx
<FlashySlideshow width={640} height={400} preset="wipe">
  <img src="/photos/nature-1.jpg" alt="Nature" />
  <img src="/photos/nature-2.jpg" alt="Mountains" />
</FlashySlideshow>
```

You can use any `wipe*` direction with custom settings:

```tsx
<FlashySlideshow
  width={640}
  height={400}
  direction="wipeTopLeft"
  randomize
  pathBlur={3}
>
  {/* slides */}
</FlashySlideshow>
```

## Props

### General

| Prop            | Type                      | Default    | Description                                          |
| --------------- | ------------------------- | ---------- | ---------------------------------------------------- |
| `children`      | `ReactNode[]`             | _required_ | Slide content (each child is one slide)              |
| `width`         | `number`                  | `100%`     | Width of the slideshow in pixels (omit for auto)     |
| `height`        | `number`                  | `100%`     | Height of the slideshow in pixels (omit for auto)    |
| `objectFit`     | `ObjectFit`               | `"cover"`  | How `<img>`/`<video>` children fill the container    |
| `preset`        | `Preset`                  | `"bricks"` | Animation preset name                                |
| `delay`         | `number`                  | varies     | Milliseconds between transitions                     |
| `direction`     | `Direction`               | varies     | Direction blocks enter from (includes wipe variants) |
| `style`         | `BlockStyle`              | `"normal"` | Block shape (`"normal"` or `"rounded"`)              |
| `translucent`   | `boolean`                 | `false`    | Semi-transparent blocks during transition            |
| `randomize`     | `boolean`                 | `false`    | Randomize block timing and positioning               |
| `randomness`    | `number`                  | `50`       | Timing variance percentage when randomize is on (0-100) |
| `xBlocks`       | `number`                  | varies     | Number of horizontal blocks                          |
| `yBlocks`       | `number`                  | varies     | Number of vertical blocks                            |
| `minBlockSize`  | `number`                  | varies     | Minimum block size in pixels during flight           |
| `feather`       | `number`                  | `0`        | Soft edge percentage (0-50) using gradient masks     |
| `className`     | `string`                  | —          | CSS class for the container                          |
| `onSlideChange` | `(index: number) => void` | —          | Callback when the active slide changes               |

### Path Props — How blocks travel to their position

Think of each block as a little piece of the next image. During a transition, these pieces **fly in from outside** the slideshow toward where they belong in the grid. The "path" is the route each piece takes to get there.

| Prop            | Type     | Default | Description                                          |
| --------------- | -------- | ------- | ---------------------------------------------------- |
| `pathSpeed`     | `number` | `650`   | How fast each block flies in, in milliseconds (100-2500). Lower = faster. |
| `pathRotation`  | `number` | `0`     | Makes blocks fly in along a curved, spiral-like arc instead of a straight line. The value is degrees of curve — `0` means straight, `360` is one full loop, and higher values create tighter spirals. Requires `minBlockSize` > 0 to be visible. |
| `pathBlur`      | `number` | `0`     | Adds a blur effect (in pixels) while the block is flying in. Creates a motion-blur look. |

### Tile Props — How blocks reveal once they arrive

Once a block reaches its spot in the grid, it **expands to fill its cell** — like a puzzle piece snapping into place. The "tile" is the block as it grows from a small dot into its final size, revealing the next image underneath.

| Prop            | Type     | Default | Description                                          |
| --------------- | -------- | ------- | ---------------------------------------------------- |
| `tileSpeed`     | `number` | `650`   | How fast each block expands to fill its cell, in milliseconds (100-2500). Lower = faster. |
| `tileRotation`  | `number` | `0`     | Spins the block as it expands. The value is how many degrees it rotates — `180` is a half turn, `360` is a full spin, `720` is two full spins, etc. Works even when `minBlockSize` is 0. |
| `tileBlur`      | `number`  | `0`     | Starts the block blurry and gradually sharpens as it expands. The value is the starting blur in pixels. |
| `tileExact`     | `boolean` | `false` | When off, tiles grow slightly larger than their cell so they overlap and blend together seamlessly. When on, each tile fits its cell exactly with no overlap — like a clean grid of puzzle pieces. Especially useful with `tileRotation`, where overlapping tiles can look messy. |

## Presets

| Preset       | Description                                                                          |
| ------------ | ------------------------------------------------------------------------------------ |
| `bricks`     | Little bricks drop in from the left and expand to reveal the next slide. _(default)_ |
| `cubism`     | Random transparent blocks fly in from all sides.                                     |
| `rain`       | Small rounded drops fall from the top.                                               |
| `blinds`     | Horizontal bands expand to reveal the next slide.                                    |
| `blinds2`    | Vertical bands expand to reveal the next slide.                                      |
| `transport`  | Translucent horizontal strips slide in.                                              |
| `transport2` | Translucent vertical strips slide in.                                                |
| `spiral`     | Rounded blocks spiral in from random directions with blur.                           |
| `cascade`    | Blocks tumble from the top like falling cards.                                       |
| `dissolve`   | Soft fade-in with blur and feathered edges, no directional movement.                 |
| `vortex`     | Spinning blocks swirl in from all directions.                                        |
| `pixelate`   | Tiny blocks pop in at their grid positions, materializing the image.                 |
| `wipe`         | Classic wipe from the left with a flashy particle edge.                              |
| `wipeDissolve` | Soft wipe with rounded blocks, blur, and feathered particle edge.                    |

## Types

```ts
type Preset =
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

type Direction =
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

type BlockStyle = "normal" | "rounded";

type ObjectFit = "cover" | "contain";
```

## License

BSD-3-Clause — Copyright (c) Creative Juices Bo. Co. — Doug Jones ([cjboco.com](https://cjboco.com))
