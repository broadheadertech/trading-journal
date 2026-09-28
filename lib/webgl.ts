/**
 * One definition of "can this browser give us a WebGL context".
 *
 * Both globes in the app (the landing hero's custom three.js scene in
 * components/originkit/ui/hero-24/globe.tsx, and the dashboard's
 * react-globe.gl map in components/WorldGlobe.tsx) fall over hard without
 * one: three throws from the WebGLRenderer constructor, which escapes React
 * and replaces the whole route with a runtime error overlay. Both need the
 * same answer to the same question, so it lives here rather than being
 * probed twice with two slightly different implementations.
 *
 * Why this happens in the wild, not just in theory: graphics acceleration
 * switched off in the browser, a blocklisted or virtualised GPU, remote
 * desktop / VM sessions, and older hardware all report no context. The
 * observed failure looks like
 *   GL_VENDOR = Disabled, GL_RENDERER = Disabled, Sandboxed = yes
 */

/** Cached so repeated reads never allocate another context. */
let cached: boolean | null = null;

/**
 * True when a WebGL context can actually be created.
 *
 * The probe context is released through WEBGL_lose_context as soon as the
 * answer is known: browsers cap how many live contexts a page may hold
 * (commonly ~16), and silently drop the oldest once past it. Leaking one
 * here would spend part of that budget for nothing — and on a page that
 * already runs a globe, pushing past the cap is one of the few ways a
 * browser WITH WebGL support still refuses a context.
 */
export function detectWebGLSupport(): boolean {
  if (cached !== null) return cached;
  if (typeof document === 'undefined') return true; // SSR: assume yes, the client re-checks

  try {
    const canvas = document.createElement('canvas');
    const gl =
      (canvas.getContext('webgl2') as WebGLRenderingContext | null) ??
      (canvas.getContext('webgl') as WebGLRenderingContext | null);
    cached = !!gl;
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    // some browsers throw rather than return null when WebGL is disabled
    cached = false;
  }
  return cached;
}

/* ---- useSyncExternalStore bindings -------------------------------------
   Support is a property of the environment, not React state, and it cannot
   be read during a server render. useSyncExternalStore is the sanctioned
   way to read it: it renders the server snapshot during hydration and then
   swaps in the client value, so there is no markup mismatch and no
   setState-in-an-effect (which also keeps react-hooks/set-state-in-effect
   satisfied). The value never changes after load, so subscribe is a no-op. */

export const subscribeWebGL = () => () => {};
export const getWebGLSnapshot = () => detectWebGLSupport();
export const getWebGLServerSnapshot = () => true;
