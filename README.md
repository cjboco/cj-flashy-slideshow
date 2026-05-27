# CJ Flashy Slideshow

A React component that gives your slideshows some flash-like transitions.

[![npm version](https://img.shields.io/npm/v/cj-flashy-slideshow.svg)](https://www.npmjs.com/package/cj-flashy-slideshow)
[![license](https://img.shields.io/npm/l/cj-flashy-slideshow.svg)](https://github.com/cjboco/CJ-Flashy-Slideshow/blob/master/LICENSE)

View the [online demo](https://cjboco.github.io/CJ-Flashy-Slideshow/).

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
  <div style={{ background: "linear-gradient(135deg, #667eea, #764ba2)", color: "#fff" }}>
    <h2>Welcome</h2>
  </div>
  <div style={{ background: "linear-gradient(135deg, #f093fb, #f5576c)", color: "#fff" }}>
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

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `width` | `number` | *required* | Width of the slideshow in pixels |
| `height` | `number` | *required* | Height of the slideshow in pixels |
| `children` | `ReactNode[]` | *required* | Slide content (each child is one slide) |
| `preset` | `Preset` | `"bricks"` | Animation preset name |
| `delay` | `number` | varies | Milliseconds between transitions |
| `direction` | `Direction` | varies | Direction blocks enter from |
| `style` | `BlockStyle` | `"normal"` | Block shape (`"normal"` or `"rounded"`) |
| `translucent` | `boolean` | `false` | Semi-transparent blocks during transition |
| `sloppy` | `boolean` | `false` | Randomize block timing and positioning |
| `xBlocks` | `number` | varies | Number of horizontal blocks |
| `yBlocks` | `number` | varies | Number of vertical blocks |
| `minBlockSize` | `number` | varies | Minimum block size in pixels |
| `className` | `string` | — | CSS class for the container |
| `onSlideChange` | `(index: number) => void` | — | Callback when the active slide changes |

## Presets

| Preset | Description |
| --- | --- |
| `bricks` | Little bricks drop in from the left and expand to reveal the next slide. *(default)* |
| `cubism` | Random transparent blocks fly in from all sides. |
| `rain` | Small rounded drops fall from the top. |
| `blinds` | Horizontal bands expand to reveal the next slide. |
| `blinds2` | Vertical bands expand to reveal the next slide. |
| `transport` | Translucent horizontal strips slide in. |
| `transport2` | Translucent vertical strips slide in. |

## Types

```ts
type Preset = "bricks" | "cubism" | "rain" | "blinds" | "blinds2" | "transport" | "transport2";

type Direction = "top" | "topleft" | "topright" | "left" | "bottom" | "bottomleft" | "bottomright" | "right" | "random" | "none";

type BlockStyle = "normal" | "rounded";
```

## License

MIT — Copyright (c) Creative Juices Bo. Co. — Doug Jones ([cjboco.com](https://cjboco.com))
