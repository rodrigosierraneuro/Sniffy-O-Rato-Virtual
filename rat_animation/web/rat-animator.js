/**
 * RatAnimator — Modern HTML5 Canvas animation engine for Sniffy the Virtual Rat
 *
 * Uses:
 *  - requestAnimationFrame (vsync-aligned, no jitter)
 *  - createImageBitmap (GPU-decoded sprites)
 *  - Accumulator-based frame timing (drift-free)
 *  - Integer pixel snapping (crisp rendering)
 */

'use strict';

class RatAnimator {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {string} spritesBase  URL base for sprite sheets (e.g. '../sprites')
   */
  constructor(canvas, spritesBase = '../sprites') {
    this.canvas      = canvas;
    this.ctx         = canvas.getContext('2d');
    this.spritesBase = spritesBase.replace(/\/$/, '');

    // HiDPI setup
    this._setupHiDPI();

    // Sprite cache: name → { bitmap: ImageBitmap, meta: Object }
    this._cache   = new Map();
    this._loading = new Map();   // promises in flight

    // Animation state
    this._behavior    = null;    // current metadata object
    this._behaviorName = null;
    this._bitmap      = null;    // current ImageBitmap
    this._frame       = 0;
    this._accumulator = 0;
    this._lastTime    = null;
    this._rafId       = null;
    this._running     = false;
    this._speedMul    = 1.0;     // playback speed multiplier
    this._onComplete  = null;    // callback when non-loop animation ends

    // Rat position on the LOGICAL canvas (before HiDPI scaling)
    this.x = 0;
    this.y = 0;

    // Which rat variant: '' (standard) or '10' (alternate)
    this.ratVariant = '';
  }

  // ── HiDPI ─────────────────────────────────────────────────────────────────

  _setupHiDPI() {
    const dpr = window.devicePixelRatio || 1;
    const logW = parseInt(this.canvas.style.width)  || this.canvas.width;
    const logH = parseInt(this.canvas.style.height) || this.canvas.height;

    this.canvas.width  = logW * dpr;
    this.canvas.height = logH * dpr;
    this.canvas.style.width  = logW + 'px';
    this.canvas.style.height = logH + 'px';

    this.ctx.scale(dpr, dpr);
    this._dpr  = dpr;
    this._logW = logW;
    this._logH = logH;
  }

  // ── Sprite loading ─────────────────────────────────────────────────────────

  /**
   * Preloads a list of behavior names.
   * @param {string[]} names
   */
  async preload(names) {
    await Promise.all(names.map(n => this._loadSprite(n)));
  }

  async _loadSprite(name) {
    const fullName = this.ratVariant + name;
    if (this._cache.has(fullName)) return this._cache.get(fullName);
    if (this._loading.has(fullName)) return this._loading.get(fullName);

    const promise = (async () => {
      const [metaRes, imgRes] = await Promise.all([
        fetch(`${this.spritesBase}/${fullName}.json`),
        fetch(`${this.spritesBase}/${fullName}.png`),
      ]);
      if (!metaRes.ok) throw new Error(`Missing sprite metadata: ${fullName}`);
      if (!imgRes.ok)  throw new Error(`Missing sprite image: ${fullName}`);

      const meta = await metaRes.json();
      const blob = await imgRes.blob();
      const bitmap = await createImageBitmap(blob);

      const entry = { bitmap, meta };
      this._cache.set(fullName, entry);
      return entry;
    })();

    this._loading.set(fullName, promise);
    return promise;
  }

  // ── State control ──────────────────────────────────────────────────────────

  /**
   * Switch to a new behavior immediately.
   * @param {string} behaviorName  e.g. 'walk_left', 'groom_a'
   * @param {Function} [onComplete]  called when non-looping animation finishes
   */
  async setState(behaviorName, onComplete = null) {
    const entry = await this._loadSprite(behaviorName);
    this._behavior     = entry.meta;
    this._bitmap       = entry.bitmap;
    this._behaviorName = behaviorName;
    this._frame        = 0;
    this._accumulator  = 0;
    this._onComplete   = onComplete;
  }

  /** Set playback speed multiplier (1.0 = normal, 2.0 = 2× faster). */
  setSpeed(mul) {
    this._speedMul = Math.max(0.1, mul);
  }

  // ── Animation loop ─────────────────────────────────────────────────────────

  start() {
    if (this._running) return;
    this._running  = true;
    this._lastTime = null;
    this._rafId    = requestAnimationFrame(ts => this._loop(ts));
  }

  stop() {
    this._running = false;
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }

  _loop(timestamp) {
    if (!this._running) return;
    this._rafId = requestAnimationFrame(ts => this._loop(ts));

    if (this._lastTime === null) {
      this._lastTime = timestamp;
      return;
    }

    const delta = Math.min(timestamp - this._lastTime, 50); // cap spike at 50ms
    this._lastTime = timestamp;

    this._tick(delta);
    this._draw();
  }

  _tick(delta) {
    if (!this._behavior) return;

    const frameTime = (1000 / this._behavior.fps) / this._speedMul;
    this._accumulator += delta;

    while (this._accumulator >= frameTime) {
      this._accumulator -= frameTime;

      if (this._behavior.loop) {
        this._frame = (this._frame + 1) % this._behavior.frameCount;
      } else {
        if (this._frame < this._behavior.frameCount - 1) {
          this._frame++;
        } else {
          // Non-loop animation finished
          if (this._onComplete) {
            const cb = this._onComplete;
            this._onComplete = null;
            cb();
          }
          break;
        }
      }
    }
  }

  // ── Rendering ──────────────────────────────────────────────────────────────

  _draw() {
    if (!this._behavior || !this._bitmap) return;

    const meta  = this._behavior;
    const frame = meta.frames[this._frame];

    // Destination top-left: bottom-center anchor at (this.x, this.y)
    const dstX = Math.round(this.x - meta.cellWidth  / 2);
    const dstY = Math.round(this.y - meta.cellHeight);

    this.ctx.drawImage(
      this._bitmap,
      frame.srcX, frame.srcY, meta.cellWidth, meta.cellHeight,  // source rect
      dstX, dstY, meta.cellWidth, meta.cellHeight                // dest rect
    );
  }

  /**
   * Draw the sprite onto the canvas without clearing it first.
   * Used by RatScene to composite multiple layers.
   */
  drawFrame(ctx, x, y) {
    if (!this._behavior || !this._bitmap) return;

    const meta  = this._behavior;
    const frame = meta.frames[this._frame];

    const dstX = Math.round(x - meta.cellWidth  / 2);
    const dstY = Math.round(y - meta.cellHeight);

    ctx.drawImage(
      this._bitmap,
      frame.srcX, frame.srcY, meta.cellWidth, meta.cellHeight,
      dstX, dstY, meta.cellWidth, meta.cellHeight
    );
  }

  /** Advance frame index manually (for external control). */
  tickFrame() {
    if (!this._behavior) return;
    if (this._behavior.loop) {
      this._frame = (this._frame + 1) % this._behavior.frameCount;
    } else {
      this._frame = Math.min(this._frame + 1, this._behavior.frameCount - 1);
    }
    this._accumulator = 0;
  }

  get currentBehavior() { return this._behaviorName; }
  get frameIndex()       { return this._frame; }
  get frameCount()       { return this._behavior ? this._behavior.frameCount : 0; }
}
