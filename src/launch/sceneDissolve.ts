/** A short visual handoff between authored scenes, independent of simulation time.
 * Captures only at a switch; no extra render or full-size image is kept while idle.
 */
export function createSceneDissolve(host: HTMLElement, source: HTMLCanvasElement) {
  const overlay = document.createElement('canvas');
  overlay.className = 'launch-scene-dissolve';
  overlay.setAttribute('aria-hidden', 'true');
  Object.assign(overlay.style, { position: 'absolute', inset: '0', pointerEvents: 'none', display: 'none' });
  host.appendChild(overlay);
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let previousFrame = NaN, elapsed = 0, opacity = 0;
  const cancel = () => {
    opacity = 0; previousFrame = NaN; elapsed = 0; overlay.style.display = 'none';
    overlay.width = overlay.height = 1;
  };
  const begin = (renderPrevious: () => void) => {
    if (reducedMotion.matches || !source.width || !source.height) { cancel(); return; }
    // Rapid switches start with the currently visible blend, not an older endpoint.
    const snapshot = document.createElement('canvas');
    snapshot.width = source.width; snapshot.height = source.height;
    const context = snapshot.getContext('2d');
    if (!context) return;
    renderPrevious(); // WebGL's default buffer need not survive between animation frames.
    context.drawImage(source, 0, 0);
    if (opacity > 0) { context.globalAlpha = opacity; context.drawImage(overlay, 0, 0, snapshot.width, snapshot.height); }
    overlay.width = snapshot.width; overlay.height = snapshot.height;
    overlay.getContext('2d')?.drawImage(snapshot, 0, 0);
    snapshot.width = snapshot.height = 1;
    previousFrame = NaN; elapsed = 0; opacity = 1;
    overlay.style.opacity = '1'; overlay.style.display = 'block';
  };
  const update = (now: number) => {
    if (!opacity) return;
    // Start after the new scene's first rendered frame, including shader compilation.
    if (Number.isNaN(previousFrame)) previousFrame = now;
    const delta = Math.max(0, now - previousFrame); previousFrame = now;
    if (delta > 2000) { cancel(); return; }
    // A slow shader frame must not consume the whole visual transition at once.
    elapsed += Math.min(delta, 50);
    const t = Math.min(1, elapsed / 650);
    if (t === 1) { cancel(); return; }
    opacity = 1 - t * t * (3 - 2 * t);
    overlay.style.opacity = String(opacity);
  };
  // Direct manipulation takes priority; an old image must never cover the user's drag.
  source.addEventListener('pointerdown', cancel);
  source.addEventListener('wheel', cancel, { passive: true });
  source.addEventListener('keydown', cancel);
  reducedMotion.addEventListener('change', cancel);
  return { begin, update, cancel, dispose() {
    cancel(); overlay.remove();
    source.removeEventListener('pointerdown', cancel);
    source.removeEventListener('wheel', cancel);
    source.removeEventListener('keydown', cancel);
    reducedMotion.removeEventListener('change', cancel);
  } };
}
