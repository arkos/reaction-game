import {
  BoxGeometry,
  DynamicDrawUsage,
  InstancedMesh,
  MeshStandardMaterial,
  Object3D,
  OctahedronGeometry,
  TorusGeometry,
} from 'three';

const PER_KIND = 6; // 3 kinds × 6 = 18 shapes, drawn in 3 draw calls
const BOUNDS_X = 9;
const BOUNDS_Y = 5.5;
const Z_NEAR = -2;
const Z_FAR = -11;
const MAX_DRIFT = 0.25; // units/s
const MAX_SPIN = 0.5; // rad/s
const MAX_BOOST = 8; // extra speed multiplier at full burst intensity
const BOOST_DECAY = 1.8;

/** Small seeded PRNG so the composition is identical on every load (nice for screenshots/GIFs). */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function wrap(value, limit) {
  if (value > limit) return -limit;
  if (value < -limit) return limit;
  return value;
}

/**
 * Background shapes for depth. One InstancedMesh per geometry, all sharing one
 * material. Per-instance state lives in preallocated typed arrays, and matrices
 * are written through one reused Object3D, so update() allocates nothing.
 */
export function createAmbientShapes(palette, { reducedMotion = false, seed = 7 } = {}) {
  const geometries = [
    new TorusGeometry(0.32, 0.11, 6, 14),
    new OctahedronGeometry(0.4, 0),
    new BoxGeometry(0.48, 0.48, 0.48),
  ];
  const material = new MeshStandardMaterial({
    color: 0xffffff, // tinted per instance via instanceColor
    flatShading: true,
    roughness: 0.7,
    transparent: true,
    opacity: 0.3,
    depthWrite: false,
  });

  const total = geometries.length * PER_KIND;
  const position = new Float32Array(total * 3);
  const velocity = new Float32Array(total * 2);
  const rotation = new Float32Array(total * 2);
  const spin = new Float32Array(total * 2);
  const size = new Float32Array(total);
  const dummy = new Object3D();
  const rand = mulberry32(seed);
  const range = (min, max) => min + rand() * (max - min);

  const meshes = geometries.map((geometry) => {
    const mesh = new InstancedMesh(geometry, material, PER_KIND);
    mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    mesh.frustumCulled = false; // instances move; the geometry's bounds don't describe them
    return mesh;
  });

  for (let i = 0; i < total; i += 1) {
    position[i * 3] = range(-BOUNDS_X, BOUNDS_X);
    position[i * 3 + 1] = range(-BOUNDS_Y, BOUNDS_Y);
    position[i * 3 + 2] = range(Z_FAR, Z_NEAR);
    velocity[i * 2] = range(-MAX_DRIFT, MAX_DRIFT);
    velocity[i * 2 + 1] = range(-MAX_DRIFT, MAX_DRIFT) * 0.6;
    rotation[i * 2] = range(0, Math.PI * 2);
    rotation[i * 2 + 1] = range(0, Math.PI * 2);
    spin[i * 2] = range(-MAX_SPIN, MAX_SPIN);
    spin[i * 2 + 1] = range(-MAX_SPIN, MAX_SPIN);
    size[i] = range(0.6, 1.3);
    // i % 4 (coprime with the 3 kinds) spreads the accent tint across all shape kinds.
    meshes[i % meshes.length].setColorAt(Math.floor(i / meshes.length), i % 4 === 0 ? palette.accent : palette.muted);
  }
  meshes.forEach((mesh) => {
    mesh.instanceColor.needsUpdate = true;
  });

  let motionReduced = reducedMotion;
  let boost = 0;

  function writeMatrices() {
    for (let i = 0; i < total; i += 1) {
      dummy.position.set(position[i * 3], position[i * 3 + 1], position[i * 3 + 2]);
      dummy.rotation.set(rotation[i * 2], rotation[i * 2 + 1], 0);
      dummy.scale.setScalar(size[i]);
      dummy.updateMatrix();
      meshes[i % meshes.length].setMatrixAt(Math.floor(i / meshes.length), dummy.matrix);
    }
    for (let m = 0; m < meshes.length; m += 1) meshes[m].instanceMatrix.needsUpdate = true;
  }

  function update(dt) {
    if (motionReduced) return;
    const speed = 1 + boost;
    boost *= Math.exp(-dt * BOOST_DECAY);

    for (let i = 0; i < total; i += 1) {
      position[i * 3] = wrap(position[i * 3] + velocity[i * 2] * speed * dt, BOUNDS_X);
      position[i * 3 + 1] = wrap(position[i * 3 + 1] + velocity[i * 2 + 1] * speed * dt, BOUNDS_Y);
      rotation[i * 2] += spin[i * 2] * speed * dt;
      rotation[i * 2 + 1] += spin[i * 2 + 1] * speed * dt;
    }
    writeMatrices();
  }

  /** Brief speed-up as a celebration. `intensity` in [0, 1]. */
  function burst(intensity) {
    if (motionReduced) return;
    boost = Math.max(boost, intensity * MAX_BOOST);
  }

  function setReducedMotion(value) {
    motionReduced = value;
    if (value) boost = 0;
  }

  function dispose() {
    meshes.forEach((mesh) => mesh.dispose());
    geometries.forEach((geometry) => geometry.dispose());
    material.dispose();
  }

  writeMatrices();
  return { meshes, update, burst, setReducedMotion, dispose };
}
