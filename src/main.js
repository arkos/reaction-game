import './styles/main.css';
import { createReactionGame } from './game/reactionGame.js';
import { createBestTimeStore } from './game/bestTimeStore.js';
import { STATES } from './game/states.js';
import { createOverlay } from './ui/overlay.js';
import { bindInput } from './ui/input.js';
import { createFrameLoop } from './ui/frameLoop.js';
import { getLocalStorage, watchReducedMotion, watchVisibility } from './ui/environment.js';

/**
 * Composition root: wires game ↔ UI ↔ scene. The scene is optional. Delete the
 * mountScene() call and the game still works fully with the CSS backdrop.
 */
function startApp() {
  const now = () => performance.now();
  const root = document.documentElement;
  const cleanups = [];

  const bestStore = createBestTimeStore(getLocalStorage());
  const game = createReactionGame({ now, random: Math.random, personalBest: bestStore.load() });
  const overlay = createOverlay(document);
  const loop = createFrameLoop();

  cleanups.push(game.subscribe(overlay.render));
  cleanups.push(
    game.subscribe((snapshot, previousState) => {
      const scored = snapshot.state === STATES.RESULT && previousState === STATES.GO;
      if (scored && snapshot.lastRound.isNewPersonalBest) bestStore.save(snapshot.personalBest);
    }),
  );

  // Registered first: if the cue fires this frame, the DOM and scene both update
  // synchronously, then the scene renders. One callback, one painted frame.
  cleanups.push(loop.add(() => game.tick()));

  cleanups.push(
    bindInput({ surface: document.getElementById('play-surface'), onPress: game.press, now }),
  );

  cleanups.push(
    watchVisibility({
      onHidden: () => {
        loop.stop(); // pauses the game tick and the 3D render loop together
        game.cancel('hidden'); // a round timed across a hidden tab is meaningless
      },
      onVisible: () => loop.start(),
    }),
  );

  let sceneHandle = null;
  let destroyed = false;

  const motion = watchReducedMotion((reduced) => sceneHandle?.setReducedMotion(reduced));
  cleanups.push(motion.dispose);

  function useFallback() {
    root.classList.remove('webgl');
    root.classList.add('no-webgl');
  }

  async function mountScene() {
    try {
      // Lazy-loaded: the game is interactive before Three.js has even downloaded.
      const { createScene } = await import('./scene/createScene.js');
      if (destroyed) return;

      let unmount = null;
      const scene = createScene({
        canvas: document.getElementById('scene'),
        reducedMotion: motion.matches,
        onContextLost: () => {
          unmount?.();
          useFallback();
        },
      });
      if (!scene) return useFallback();

      sceneHandle = scene;
      root.classList.add('webgl');
      const unsubscribe = game.subscribe(scene.setState);
      const removeRender = loop.add(scene.render);
      unmount = () => {
        unsubscribe();
        removeRender();
        scene.dispose();
        sceneHandle = null;
      };
      cleanups.push(() => sceneHandle && unmount());
    } catch (error) {
      console.warn('[app] 3D scene failed to load, using CSS fallback.', error);
      useFallback();
    }
  }

  if (!document.hidden) loop.start();
  mountScene();

  return function destroy() {
    destroyed = true;
    loop.stop();
    cleanups.reverse().forEach((cleanup) => cleanup());
  };
}

const destroy = startApp();

if (import.meta.hot) {
  import.meta.hot.dispose(destroy);
}
