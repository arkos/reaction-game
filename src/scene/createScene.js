import { AmbientLight, Color, DirectionalLight, Fog, PerspectiveCamera, Scene, WebGLRenderer } from 'three';
import { COLORS } from '../config/colors.js';
import { STATES } from '../game/states.js';
import { createAmbientShapes } from './ambientShapes.js';
import { createHeroShape } from './heroShape.js';
import { burstIntensity } from './burst.js';

const MAX_PIXEL_RATIO = 2;
const CAMERA_Z = 7;
const MIN_FIT_ASPECT = 0.6;

function toPalette(colors) {
  return Object.fromEntries(Object.entries(colors).map(([name, hex]) => [name, new Color(hex)]));
}

function createRenderer(canvas) {
  try {
    return new WebGLRenderer({ canvas, antialias: true, powerPreference: 'default' });
  } catch (error) {
    console.warn('[scene] WebGL unavailable, using CSS fallback.', error);
    return null;
  }
}

/**
 * Builds the Three.js scene. Returns null if WebGL is unavailable.
 *
 * The scene is a view: it receives game snapshots through setState() and has
 * no knowledge of rules or timing. It does not own a render loop either;
 * render() is called by the app's frame loop after the game has ticked.
 */
export function createScene({ canvas, reducedMotion = false, onContextLost = () => {} }) {
  const renderer = createRenderer(canvas);
  if (!renderer) return null;

  const palette = toPalette(COLORS);
  renderer.setClearColor(palette.bg, 1);

  const scene = new Scene();
  scene.fog = new Fog(palette.bg, 7, 19);

  const camera = new PerspectiveCamera(45, 1, 0.1, 40);
  camera.position.set(0, 0, CAMERA_Z);

  const sun = new DirectionalLight(0xffffff, 1.6);
  sun.position.set(3, 4, 5);
  scene.add(new AmbientLight(0xffffff, 0.55), sun);

  const hero = createHeroShape(palette, { reducedMotion });
  const ambient = createAmbientShapes(palette, { reducedMotion });
  scene.add(hero.mesh, ...ambient.meshes);

  let motionReduced = reducedMotion;
  let needsRender = true;
  let contextLost = false;

  function resize() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width === 0 || height === 0) return;

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO));
    renderer.setSize(width, height, false); // CSS owns the canvas's display size
    camera.aspect = width / height;
    // Pull the camera back on portrait screens so the hero fits horizontally.
    camera.position.z = CAMERA_Z / Math.sqrt(Math.min(1, Math.max(camera.aspect, MIN_FIT_ASPECT)));
    camera.updateProjectionMatrix();
    needsRender = true;
  }

  const resizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null;
  if (resizeObserver) resizeObserver.observe(canvas);
  window.addEventListener('resize', resize); // also catches devicePixelRatio changes

  function handleContextLost(event) {
    event.preventDefault();
    contextLost = true;
    onContextLost();
  }
  canvas.addEventListener('webglcontextlost', handleContextLost);

  function setState(snapshot, previousState) {
    hero.setState(snapshot.state);
    const justScored = snapshot.state === STATES.RESULT && previousState === STATES.GO;
    if (justScored && snapshot.lastRound?.ms != null) {
      ambient.burst(burstIntensity(snapshot.lastRound.ms));
    }
    needsRender = true;
  }

  function render(_time, dt) {
    if (contextLost) return;
    // With reduced motion nothing moves, so only draw when something changed.
    if (motionReduced && !needsRender) return;
    hero.update(dt);
    ambient.update(dt);
    renderer.render(scene, camera);
    needsRender = false;
  }

  function setReducedMotion(value) {
    motionReduced = value;
    hero.setReducedMotion(value);
    ambient.setReducedMotion(value);
    needsRender = true;
  }

  function dispose() {
    resizeObserver?.disconnect();
    window.removeEventListener('resize', resize);
    canvas.removeEventListener('webglcontextlost', handleContextLost);
    hero.dispose();
    ambient.dispose();
    renderer.dispose();
  }

  resize();
  return { setState, render, setReducedMotion, dispose };
}
