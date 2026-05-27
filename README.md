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
  blur={3}
>
  {/* slides */}
</FlashySlideshow>
```

## Props

| Prop            | Type                      | Default    | Description                                          |
| --------------- | ------------------------- | ---------- | ---------------------------------------------------- |
| `width`         | `number`                  | `100%`     | Width of the slideshow in pixels (omit for auto)     |
| `height`        | `number`                  | `100%`     | Height of the slideshow in pixels (omit for auto)    |
| `objectFit`     | `ObjectFit`               | `"cover"`  | How `<img>`/`<video>` children fill the container    |
| `children`      | `ReactNode[]`             | _required_ | Slide content (each child is one slide)              |
| `preset`        | `Preset`                  | `"bricks"` | Animation preset name                                |
| `delay`         | `number`                  | varies     | Milliseconds between transitions                     |
| `direction`     | `Direction`               | varies     | Direction blocks enter from (includes wipe variants) |
| `style`         | `BlockStyle`              | `"normal"` | Block shape (`"normal"` or `"rounded"`)              |
| `translucent`   | `boolean`                 | `false`    | Semi-transparent blocks during transition            |
| `speed`         | `number`                  | `650`      | Base duration per animation phase in ms (100-2500)   |
| `randomize`     | `boolean`                 | `false`    | Randomize block timing and positioning               |
| `randomness`    | `number`                  | `50`       | Timing variance percentage when randomize is on (0-100) |
| `xBlocks`       | `number`                  | varies     | Number of horizontal blocks                          |
| `yBlocks`       | `number`                  | varies     | Number of vertical blocks                            |
| `minBlockSize`  | `number`                  | varies     | Minimum block size in pixels                         |
| `rotation`      | `number`                  | `0`        | Degrees of arc for the block flight path (0 = straight line) |
| `blur`          | `number`                  | `0`        | Starting blur in pixels (clears as blocks expand)    |
| `feather`       | `number`                  | `0`        | Soft edge percentage (0-50) using gradient masks     |
| `className`     | `string`                  | —          | CSS class for the container                          |
| `onSlideChange` | `(index: number) => void` | —          | Callback when the active slide changes               |

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
