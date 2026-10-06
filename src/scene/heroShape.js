import { IcosahedronGeometry, Mesh, MeshStandardMaterial } from 'three';
import { STATES } from '../game/states.js';

const RADIUS = 1;
const BASE_Y = 0.8;
const SMOOTHING = 6; // higher = faster easing toward the target style
const POP_STRENGTH = 0.28;
const POP_DECAY = 7;
const SHAKE_DURATION_S = 0.45;
const SHAKE_AMPLITUDE = 0.18;
const SHAKE_FREQUENCY = 55;
const FLOAT_AMPLITUDE = 0.12;

/** Visual targets per game state. `spin` is rad/s, `float` scales the bob. */
function buildStyles(palette) {
  return {
    [STATES.IDLE]: { color: palette.accent, glow: 0.08, scale: 1, spin: 0.35, float: 1 },
    [STATES.WAITING]: { color: palette.wait, glow: 0, scale: 0.84, spin: 0.08, float: 0.25 },
    [STATES.GO]: { color: palette.go, glow: 0.85, scale: 1.1, spin: 1.4, float: 0 },
    [STATES.TOO_SOON]: { color: palette.early, glow: 0.25, scale: 1, spin: 0.2, float: 0.4 },
    [STATES.RESULT]: { color: palette.accent, glow: 0.08, scale: 1, spin: 0.35, float: 1 },
  };
}

/** The central low-poly icosahedron that mirrors the game state. */
export function createHeroShape(palette, { reducedMotion = false } = {}) {
  const styles = buildStyles(palette);
  const geometry = new IcosahedronGeometry(RADIUS, 0);
  const material = new MeshStandardMaterial({
    color: palette.accent.clone(),
    emissive: palette.accent.clone(),
    emissiveIntensity: styles[STATES.IDLE].glow,
    flatShading: true,
    roughness: 0.45,
    metalness: 0.1,
  });
  const mesh = new Mesh(geometry, material);
  mesh.position.y = BASE_Y;

  let target = styles[STATES.IDLE];
  let scale = target.scale;
  let spin = target.spin;
  let float = target.float;
  let pop = 0;
  let shakeLeft = 0;
  let elapsed = 0;
  let motionReduced = reducedMotion;

  function snapToTarget() {
    material.color.copy(target.color);
    material.emissive.copy(target.color);
    material.emissiveIntensity = target.glow;
  }

  function setState(state) {
    target = styles[state] ?? styles[STATES.IDLE];

    if (state === STATES.GO) {
      // The cue must look complete on the very frame it fires: snap, never ease in.
      snapToTarget();
      scale = target.scale;
      spin = target.spin;
      pop = motionReduced ? 0 : 1;
    } else if (state === STATES.TOO_SOON && !motionReduced) {
      shakeLeft = SHAKE_DURATION_S;
    }

    // Reduced motion: color changes are instant, never animated.
    if (motionReduced) snapToTarget();
  }

  function update(dt) {
    // Frame-rate independent exponential easing (same feel at 60 Hz and 120 Hz).
    const k = 1 - Math.exp(-dt * SMOOTHING);
    material.color.lerp(target.color, k);
    material.emissive.lerp(target.color, k);
    material.emissiveIntensity += (target.glow - material.emissiveIntensity) * k;

    if (motionReduced) {
      mesh.scale.setScalar(1);
      mesh.position.set(0, BASE_Y, 0);
      return;
    }

    elapsed += dt;
    scale += (target.scale - scale) * k;
    spin += (target.spin - spin) * k;
    float += (target.float - float) * k;
    pop *= Math.exp(-dt * POP_DECAY);

    let offsetX = 0;
    if (shakeLeft > 0) {
      shakeLeft = Math.max(0, shakeLeft - dt);
      offsetX = Math.sin(elapsed * SHAKE_FREQUENCY) * SHAKE_AMPLITUDE * (shakeLeft / SHAKE_DURATION_S);
    }

    mesh.scale.setScalar(scale * (1 + POP_STRENGTH * pop));
    mesh.rotation.x += spin * 0.6 * dt;
    mesh.rotation.y += spin * dt;
    mesh.position.set(offsetX, BASE_Y + Math.sin(elapsed * 0.9) * FLOAT_AMPLITUDE * float, 0);
  }

  function setReducedMotion(value) {
    motionReduced = value;
    if (value) {
      pop = 0;
      shakeLeft = 0;
      snapToTarget();
    }
  }

  function dispose() {
    geometry.dispose();
    material.dispose();
  }

  return { mesh, setState, update, setReducedMotion, dispose };
}
