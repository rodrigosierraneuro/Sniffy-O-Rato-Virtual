/**
 * RatStateMachine — Autonomous behavior controller for Sniffy the Virtual Rat
 *
 * Mirrors the original Sniffy Pro behavior states (Walking East/West/North/South,
 * Grooming, Sniffing, Rearing, Bar Press, etc.) with probabilistic transitions.
 */

'use strict';

// ── Constants ─────────────────────────────────────────────────────────────────

const DIR = { EAST: 'E', WEST: 'W', NORTH: 'N', SOUTH: 'S' };

const BEHAVIORS = {
  IDLE:         'idle',
  WALK:         'walk',
  RUN:          'run',
  TROT:         'trot',
  GROOM:        'groom',
  SNIFF:        'sniff',
  EAT:          'eat',
  DRINK:        'drink',
  REAR:         'rear',
  LEVER_PRESS:  'lever_press',
  EXPLORE:      'explore',
  TURN:         'turn',
  FREEZE:       'freeze',
};

/** Map (behavior, direction) → sprite group name */
const SPRITE_MAP = {
  walk_E:         'walk_right',
  walk_W:         'walk_left',
  walk_N:         'walk_up',
  walk_S:         'walk_down',
  run_E:          'run_right',
  run_W:          'run_left',
  run_N:          'run2_left',   // no dedicated run_up, reuse
  run_S:          'run2_right',
  trot_E:         'trot_right',
  trot_W:         'trot_left',
  trot_N:         'trot2_right',
  trot_S:         'trot2_left',
  groom_0:        'groom_a',
  groom_1:        'groom_b',
  groom_2:        'groom_c',
  groom_3:        'groom_d',
  groom_4:        'groom_e',
  sniff_E:        'sniff_right',
  sniff_W:        'sniff_left',
  sniff_N:        'sniff2_right',
  sniff_S:        'sniff2_left',
  eat_any:        'eat',
  drink_any:      'drink',
  rear_E:         'rear_left',
  rear_W:         'rear_up_a',
  lever_press_E:  'lever_press_r',
  lever_press_W:  'lever_press_l',
  explore_E:      'explore_right',
  explore_W:      'explore_left',
  turn_EW:        'turn_left',
  turn_WE:        'turn_right',
  turn_NS:        'turn_left',
  turn_SN:        'turn_right',
  freeze_any:     'freeze_a',
  idle_any:       'freeze_b',
};

// ── RatStateMachine ───────────────────────────────────────────────────────────

class RatStateMachine {
  /**
   * @param {Object} options
   * @param {number} options.canvasW   Logical canvas width (pixels)
   * @param {number} options.canvasH   Logical canvas height (pixels)
   * @param {number} [options.speed]   Movement speed (pixels/second, default 60)
   * @param {Function} options.onStateChange  Callback(spriteName, state)
   */
  constructor({ canvasW, canvasH, speed = 60, onStateChange, ratVariant = '' }) {
    this.canvasW = canvasW;
    this.canvasH = canvasH;
    this.speed   = speed;    // px/sec
    this.onChange = onStateChange || (() => {});
    // Variant 2 ('10' prefix) has no lever_press animations
    this.ratVariant = ratVariant;

    // Rat logical position (bottom-center anchor)
    this.x = canvasW  / 2;
    this.y = canvasH  * 0.75;

    this._state     = null;
    this._direction = DIR.EAST;
    this._target    = null;     // { x, y } movement target
    this._groomIdx  = 0;
    this._stateTimer = 0;       // ms remaining in current state
    this._paused    = false;

    // Lever position (where bar press happens)
    this.leverX = canvasW * 0.3;
    this.leverY = canvasH * 0.6;
    this.leverEnabled = false;

    // Food hopper position
    this.hopperX = canvasW * 0.7;
    this.hopperY = canvasH * 0.6;

    this._startIdle();
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Update state machine. Call every frame with elapsed ms.
   * Returns { x, y } current rat position.
   */
  update(delta) {
    if (this._paused) return { x: this.x, y: this.y };

    this._stateTimer -= delta;

    if (this._state === BEHAVIORS.WALK || this._state === BEHAVIORS.RUN || this._state === BEHAVIORS.TROT) {
      this._moveTowardsTarget(delta);
    }

    if (this._stateTimer <= 0) {
      this._transition();
    }

    return { x: this.x, y: this.y };
  }

  pause()  { this._paused = true; }
  resume() { this._paused = false; }

  /** Force a specific behavior (for UI controls). */
  forceBehavior(behavior) {
    switch (behavior) {
      case 'walk':   this._startWalk(this._direction); break;
      case 'run':    this._startRun(this._direction);  break;
      case 'groom':  this._startGroom(); break;
      case 'sniff':  this._startSniff(); break;
      case 'eat':    this._startEat();   break;
      case 'drink':  this._startDrink(); break;
      case 'rear':   this._startRear();  break;
      case 'freeze': this._startFreeze(); break;
      case 'explore':this._startExplore(); break;
      default:       this._startIdle();
    }
  }

  get state()     { return this._state; }
  get direction() { return this._direction; }

  // ── Movement ───────────────────────────────────────────────────────────────

  _moveTowardsTarget(delta) {
    if (!this._target) return;

    const speedMult = this._state === BEHAVIORS.RUN  ? 2.2 :
                      this._state === BEHAVIORS.TROT ? 1.5 : 1.0;
    const spd = this.speed * speedMult * (delta / 1000);

    const dx = this._target.x - this.x;
    const dy = this._target.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist <= spd) {
      this.x = this._target.x;
      this.y = this._target.y;
      this._stateTimer = 0; // trigger transition
    } else {
      this.x += (dx / dist) * spd;
      this.y += (dy / dist) * spd;
      // Update direction based on movement
      this._direction = Math.abs(dx) >= Math.abs(dy)
        ? (dx > 0 ? DIR.EAST : DIR.WEST)
        : (dy > 0 ? DIR.SOUTH : DIR.NORTH);
    }

    // Clamp to canvas
    this.x = Math.max(30, Math.min(this.canvasW - 30, this.x));
    this.y = Math.max(60, Math.min(this.canvasH - 20, this.y));
  }

  _randomTarget() {
    return {
      x: 40 + Math.random() * (this.canvasW - 80),
      y: 60 + Math.random() * (this.canvasH - 80),
    };
  }

  _emitSprite(key) {
    const sprite = SPRITE_MAP[key];
    if (sprite) {
      this.onChange(sprite, { state: this._state, direction: this._direction, key });
    } else {
      console.warn('No sprite mapping for key:', key);
    }
  }

  // ── State starters ─────────────────────────────────────────────────────────

  _startIdle() {
    this._state = BEHAVIORS.IDLE;
    this._stateTimer = 500 + Math.random() * 1500;
    this._target = null;
    this._emitSprite('idle_any');
  }

  _startWalk(dir) {
    this._state     = BEHAVIORS.WALK;
    this._direction = dir || this._randomDir();
    this._target    = this._randomTarget();
    const dist      = Math.hypot(this._target.x - this.x, this._target.y - this.y);
    this._stateTimer = (dist / this.speed) * 1000 + 500;
    this._emitSprite(`walk_${this._direction}`);
  }

  _startRun(dir) {
    this._state     = BEHAVIORS.RUN;
    this._direction = dir || this._randomDir();
    this._target    = this._randomTarget();
    const dist      = Math.hypot(this._target.x - this.x, this._target.y - this.y);
    this._stateTimer = (dist / (this.speed * 2.2)) * 1000 + 300;
    this._emitSprite(`run_${this._direction}`);
  }

  _startTrot(dir) {
    this._state     = BEHAVIORS.TROT;
    this._direction = dir || this._randomDir();
    this._target    = this._randomTarget();
    const dist      = Math.hypot(this._target.x - this.x, this._target.y - this.y);
    this._stateTimer = (dist / (this.speed * 1.5)) * 1000 + 300;
    this._emitSprite(`trot_${this._direction}`);
  }

  _startGroom() {
    this._state      = BEHAVIORS.GROOM;
    this._target     = null;
    this._stateTimer = 3000 + Math.random() * 4000;
    this._groomIdx   = Math.floor(Math.random() * 5);
    this._emitSprite(`groom_${this._groomIdx}`);
  }

  _startSniff() {
    this._state      = BEHAVIORS.SNIFF;
    this._target     = null;
    this._stateTimer = 1500 + Math.random() * 2000;
    this._emitSprite(`sniff_${this._direction}`);
  }

  _startEat() {
    this._state      = BEHAVIORS.EAT;
    this._target     = null;
    this._stateTimer = 2000 + Math.random() * 2000;
    this._emitSprite('eat_any');
  }

  _startDrink() {
    this._state      = BEHAVIORS.DRINK;
    this._target     = null;
    this._stateTimer = 1500 + Math.random() * 1500;
    this._emitSprite('drink_any');
  }

  _startRear() {
    this._state      = BEHAVIORS.REAR;
    this._target     = null;
    this._stateTimer = 1000 + Math.random() * 1000;
    this._emitSprite(`rear_${this._direction}`);
  }

  _startExplore() {
    this._state      = BEHAVIORS.EXPLORE;
    this._target     = this._randomTarget();
    this._stateTimer = 3000 + Math.random() * 3000;
    this._emitSprite(`explore_${this._direction}`);
  }

  _startFreeze() {
    this._state      = BEHAVIORS.FREEZE;
    this._target     = null;
    this._stateTimer = 800 + Math.random() * 1200;
    this._emitSprite('freeze_any');
  }

  _startLeverPress() {
    // Lever press is only available for rat variant 1 (not variant '10')
    if (this.ratVariant === '10') { this._startIdle(); return; }
    this._state      = BEHAVIORS.LEVER_PRESS;
    this._target     = null;
    this._stateTimer = 1200;
    this._emitSprite(`lever_press_${this._direction}`);
  }

  /** Update rat variant at runtime (e.g. when user switches variant selector). */
  setVariant(variant) { this.ratVariant = variant; }

  // ── Transitions ────────────────────────────────────────────────────────────

  _transition() {
    const r = Math.random();

    // From IDLE
    if (this._state === BEHAVIORS.IDLE) {
      if      (r < 0.35) this._startWalk(this._randomDir());
      else if (r < 0.55) this._startGroom();
      else if (r < 0.70) this._startSniff();
      else if (r < 0.78) this._startRear();
      else if (r < 0.84) this._startFreeze();
      else if (r < 0.90) this._startExplore();
      else if (r < 0.95) this._startRun(this._randomDir());
      else                this._startTrot(this._randomDir());
      return;
    }

    // From locomotion: back to idle or groom
    if ([BEHAVIORS.WALK, BEHAVIORS.RUN, BEHAVIORS.TROT].includes(this._state)) {
      if      (r < 0.50) this._startIdle();
      else if (r < 0.65) this._startGroom();
      else if (r < 0.75) this._startSniff();
      else if (r < 0.80) this._startWalk(this._randomDir());
      else if (r < 0.90) this._startExplore();
      else                this._startFreeze();
      return;
    }

    // From GROOM: sniff or idle
    if (this._state === BEHAVIORS.GROOM) {
      if      (r < 0.55) this._startIdle();
      else if (r < 0.75) this._startSniff();
      else if (r < 0.85) this._startWalk(this._randomDir());
      else                this._startGroom(); // continue grooming
      return;
    }

    // From SNIFF
    if (this._state === BEHAVIORS.SNIFF) {
      if      (r < 0.40) this._startIdle();
      else if (r < 0.60) this._startWalk(this._direction);
      else if (r < 0.75) this._startGroom();
      else if (r < 0.85) this._startEat();
      else                this._startDrink();
      return;
    }

    // From EAT/DRINK
    if ([BEHAVIORS.EAT, BEHAVIORS.DRINK].includes(this._state)) {
      if      (r < 0.60) this._startIdle();
      else if (r < 0.80) this._startGroom();
      else                this._startWalk(this._randomDir());
      return;
    }

    // From REAR / FREEZE / EXPLORE
    if      (r < 0.60) this._startIdle();
    else if (r < 0.80) this._startWalk(this._randomDir());
    else                this._startGroom();
  }

  _randomDir() {
    const dirs = [DIR.EAST, DIR.WEST, DIR.NORTH, DIR.SOUTH];
    return dirs[Math.floor(Math.random() * dirs.length)];
  }
}
