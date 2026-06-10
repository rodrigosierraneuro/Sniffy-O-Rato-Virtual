import type { Simulation } from "../engine/simulation";
import type { RatParams } from "./rat";

/**
 * Animador de la rata: capa intermedia entre el motor (que decide la conducta
 * cada tick) y el render. Su trabajo es producir un movimiento continuo y
 * autónomo, como el empalme de clips del Sniffy original:
 *
 *  - Locomoción real: posee su propia posición visible que persigue la posición
 *    objetivo del motor a una velocidad creíble (la rata "camina" hacia el sitio
 *    en vez de teletransportarse).
 *  - Transiciones suaves: todos los parámetros de postura se suavizan con
 *    interpolación exponencial, evitando el parpadeo de poses por tick.
 *  - Pulsos de acción: una presión de barra dispara un breve "clip" de erguirse
 *    que se mantiene mientras haya presiones frecuentes.
 */
export class RatAnimator {
  // Posición visible (normalizada 0..1).
  private vx = 0.5;
  private vy = 0.85;
  private facing = -1;
  private phase = 0;

  // Parámetros de postura suavizados.
  private upright = 0;
  private crouch = 0;
  private headDip = 0;
  private groom = 0;
  private fear = 0;
  private walk = 0;

  private lastPresses = 0;
  private pressHold = 0; // segundos restantes del "clip" de presión
  private initialized = false;

  private init(sim: Simulation): void {
    this.vx = sim.state.pos.x;
    this.vy = sim.state.pos.y;
    this.lastPresses = sim.state.totals.presses;
    this.initialized = true;
  }

  /** Avanza la animación `dt` segundos leyendo el estado actual del motor. */
  update(sim: Simulation, dt: number): void {
    if (!this.initialized) this.init(sim);
    const s = sim.state;
    const d = Math.min(dt, 0.05); // estabilidad ante saltos de tiempo

    // --- Locomoción: perseguir la posición objetivo a velocidad fija ---
    const gx = s.pos.x;
    const gy = s.pos.y;
    const dx = gx - this.vx;
    const dy = gy - this.vy;
    const dist = Math.hypot(dx, dy);
    const maxStep = 0.55 * d; // unidades normalizadas por segundo
    let moving = false;
    if (dist > 0.003) {
      const step = Math.min(dist, maxStep);
      this.vx += (dx / dist) * step;
      this.vy += (dy / dist) * step;
      moving = dist > 0.02;
      if (Math.abs(dx) > 0.001) this.facing = dx > 0 ? 1 : -1;
    }

    // --- Detección de presión de barra (pulso de erguirse) ---
    if (s.totals.presses > this.lastPresses) this.pressHold = 0.5;
    this.lastPresses = s.totals.presses;
    if (s.behavior === "press_bar") this.pressHold = Math.max(this.pressHold, 0.35);
    if (this.pressHold > 0) this.pressHold -= d;

    // --- Conducta objetivo según el motor ---
    const pressing = this.pressHold > 0 && !moving;
    const eating = (s.behavior === "eat" || s.behavior === "to_magazine" || s.pelletAvailable) && !moving;
    const grooming = s.behavior === "groom" && !moving;
    const freezing = (s.behavior === "freeze" || s.mind.fear > 0.55) && !moving;

    // --- Suavizado exponencial de los parámetros ---
    const ease = (cur: number, target: number, rate: number) =>
      cur + (target - cur) * Math.min(1, d * rate);

    this.walk = ease(this.walk, moving ? 1 : 0, 8);
    this.upright = ease(this.upright, pressing ? 1 : 0, 11);
    this.crouch = ease(this.crouch, (eating || grooming || freezing) && !pressing ? 1 : 0, 6);
    this.headDip = ease(this.headDip, eating && !pressing ? 1 : 0, 6);
    this.groom = ease(this.groom, grooming && !pressing ? 1 : 0, 6);
    this.fear = ease(this.fear, freezing ? Math.max(0.45, s.mind.fear) : 0, 5);

    // --- Reloj de animación (más rápido al caminar o presionar) ---
    const rate = pressing ? 9 : moving ? 5 + this.walk * 4 : 3;
    this.phase += d * rate;
  }

  params(): RatParams {
    return {
      upright: this.upright,
      crouch: this.crouch,
      headDip: this.headDip,
      groom: this.groom,
      fear: this.fear,
      walk: this.walk,
      phase: this.phase,
      facing: this.facing,
      tailSide: this.facing >= 0 ? 1 : -1,
    };
  }

  /** Posición visible (no la del motor) para colocar la rata en la caja. */
  pos(): { x: number; y: number } {
    return { x: this.vx, y: this.vy };
  }
}
