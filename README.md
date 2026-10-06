# Reaction Timer 3D

A precise, accessible reaction-time game with a reactive Three.js scene.
Wait for the cue, respond as fast as you can, and track your progress.

**[▶ Live demo](https://YOUR-USERNAME.github.io/reaction-timer-3d/)** <!-- TODO: replace with your deployed URL -->

![Gameplay demo](docs/demo.gif) <!-- TODO: record a ~10s GIF of idle → wait → GO → result and save it as docs/demo.gif -->

## Features

- **Accurate timing.** The cue timestamp is taken in the same `requestAnimationFrame` callback that renders the cue in both the DOM and WebGL. Responses use the input event's own high-resolution timestamp.
- **Fair play.** A random 1–5 s delay. Pressing early is a false start ("Too soon!") and isn't recorded. Holding a key down doesn't repeat presses.
- **Progress.** Per-round verdict compared with the human average (~250 ms), session best and average, and an all-time best saved in `localStorage`.
- **Reactive 3D scene.** A low-poly hero shape mirrors every game state, and ambient shapes burst in celebration (faster time = bigger burst).
- **Works everywhere.** Mouse, touch (`pointerdown`, no tap delay) and keyboard (Space/Enter). Responsive. Falls back to a CSS-only background if WebGL is unavailable.
- **Accessible.** Semantic HTML, visible focus, an `aria-live` announcer, WCAG AA contrast, and `prefers-reduced-motion` support.

## Getting started

Requires Node 18.18+ (Node 22 recommended).

```bash
npm install        # install dependencies (commit the generated package-lock.json)
npm run dev        # start the dev server at http://localhost:5173
npm test           # run the unit tests once (Vitest)
npm run test:watch # run tests in watch mode
npm run build      # production build into dist/
npm run preview    # serve the production build locally
```

## Deploying

The build is a static site in `dist/`. Vite's `base: './'` makes it work at any path.

- **GitHub Pages:** push to `main`. `.github/workflows/deploy.yml` tests, builds and deploys. Under _Settings → Pages_, set **Source** to **GitHub Actions**.
- **Netlify:** build command `npm run build`, publish directory `dist`.
- **Vercel:** import the repo. The Vite preset is detected automatically.

## Project structure

```
src/
├── game/    Pure logic. No DOM, no Three.js. Fully unit-tested.
├── scene/   Three.js view. Reacts to game state; contains no rules.
├── ui/      DOM overlay, input, frame loop, browser environment.
├── config/  Shared palette (mirrors CSS custom properties).
└── main.js  Composition root that wires the layers together.
```

## Design decisions

**An explicit state machine.** `idle → waiting → go → result`, plus `waiting → tooSoon`, with every legal transition listed in `game/states.js`. An illegal transition throws, so bugs fail loudly instead of corrupting a round. The game exposes `press()`, `tick()`, `cancel()` and `subscribe()`. Time (`now`) and randomness (`random`) are injected, so tests run instantly and deterministically with a fake clock.

**Timing accuracy alongside the render loop.** The game uses no `setTimeout` for the cue. A single app-level `requestAnimationFrame` loop calls `game.tick()` first. When the delay has elapsed, `tick()` stamps `cueAt = performance.now()` and notifies subscribers synchronously, so the DOM overlay and the 3D scene both switch to "go". The scene then renders, still in the same callback. The timestamp therefore belongs to the frame that actually paints the cue, not to a timer that may fire mid-frame and be painted up to 16 ms later. Responses use `event.timeStamp` (same time origin), which excludes time an event waits in the main-thread queue. An input stamped *before* the cue frame is treated as a false start, not a 0 ms reaction. Remaining error is display and input hardware latency, which no web page can measure.

**The 3D layer is a view, not a participant.** `scene/` subscribes to game snapshots and decides only how to *look*. Input is handled on a full-screen DOM `<button>`, never through raycasting. Three.js is lazy-loaded with a dynamic `import()`, so the game is playable before the 3D chunk downloads. Remove the `mountScene()` call and the game still works fully.

**3D performance.**
- Pixel ratio capped at 2.
- Flat-shaded low-poly geometry.
- 18 ambient shapes drawn with 3 `InstancedMesh` draw calls that share one material.
- Per-instance state in preallocated typed arrays, matrices written through one reused `Object3D`, and no allocations in the render loop.
- Frame-rate-independent easing (`1 - e^(-k·dt)`) with clamped `dt`, so it looks the same at 60 Hz and 120 Hz and doesn't jump after a stall.
- With reduced motion, the scene renders only when something changes.
- On `visibilitychange` to hidden, the loop stops (pausing both the game tick and rendering) and any in-flight round is cancelled.
- Resizing uses `ResizeObserver`. Geometries, materials and the renderer are disposed on teardown or context loss.

**The cue is instant and never relies on color alone.** Most transitions ease within 120 ms, but "go" snaps on the first frame: mint color, emissive glow and a scale pop on the hero, and the DOM card jumps from dark indigo to bright mint *and* changes text from "Wait…" to "GO!". That large luminance jump reads clearly for colorblind players too.

**Resilience.** If `WebGLRenderer` can't be created, the Three.js chunk fails to load, or the WebGL context is lost, the app switches to a CSS-only backdrop driven by the same `data-state` attribute and the same palette. `localStorage` access is fully guarded, so the game works in private mode and when storage is blocked.

**Accessibility.**
- The whole screen is one real `<button>`, whose accessible name comes from the visible status card.
- A full-screen pad feels natural on touch. Global Space/Enter handling avoids the native button's keyup-delayed activation, which would inflate times. Synthetic clicks from assistive tech are still supported.
- An assertive `aria-live` region announces each state and result.
- The canvas is `aria-hidden`.
- Overlay text meets WCAG AA contrast in every state.
- Fixed-size text slots and tabular numerals prevent layout shift.

## Testing

`npm test` runs the Vitest suite in `tests/`:

| File | Covers |
| --- | --- |
| `reactionGame.test.js` | State machine, cue timing, false starts (early and pre-cue events), restart lock, cancel, personal best |
| `timing.test.js` | Delay range, reaction calculation, event-timestamp validation, tiers |
| `stats.test.js` | Best/average/rounds, false starts excluded |
| `bestTimeStore.test.js` | Persistence and graceful failure when storage throws |
| `copy.test.js` | Every state has distinct text; result interpretation |
| `frameLoop.test.js` | Tick-before-render ordering, `dt` clamping, pause/resume |
| `designTokens.test.js` | CSS and JS palettes stay in sync; burst scaling |

## Future improvements

Intentionally out of scope for this version:

- Global leaderboard and user accounts
- Additional game modes (e.g. choice reaction, audio cue)
- Sound effects
- Light theme / custom themes
- Orbit controls or free camera
- Playwright end-to-end and visual-regression tests
- History chart of recent rounds

## License

MIT
