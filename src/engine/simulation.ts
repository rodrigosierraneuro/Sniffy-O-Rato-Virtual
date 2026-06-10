import { Rng } from "./rng";
import { createInitialState } from "./state";
import { SECONDS_PER_TICK, MAGAZINE } from "./constants";
import type {
  SimState,
  SimEvent,
  Schedule,
  Approximation,
  BehaviorTag,
} from "./types";
import { armSchedule, pressDelivers } from "./schedules";
import {
  reinforceBehavior,
  extinguishBehavior,
  decayBehaviors,
  pairSoundWithFood,
  soundIsEffectiveReinforcer,
} from "./operant";
import {
  pairCsWithUs,
  extinguishCs,
  updateFearDuringCs,
  spontaneousRecovery,
} from "./classical";
import {
  momentaryPressProbability,
  selectIdleBehavior,
  behaviorTarget,
} from "./behavior";
import { lerp, clamp } from "./util";

const MAX_EVENTS = 8000;

/**
 * Orquestador del motor. Mantiene el estado, el generador aleatorio y el log de
 * eventos, y avanza la simulación en pasos de tiempo fijo. No depende de UI ni
 * de render: es testeable de forma "headless".
 */
export class Simulation {
  state: SimState;
  rng: Rng;
  events: SimEvent[] = [];

  // Estado del CS en curso (condicionamiento clásico).
  private csTimer = 0; // ticks restantes del CS actual
  private csWillShock = false; // ¿este CS termina en US?

  constructor(seed = 12345) {
    this.rng = new Rng(seed);
    this.state = createInitialState();
    this.state.rngSnapshot = this.rng.snapshot();
  }

  private log(kind: SimEvent["kind"]): void {
    this.events.push({ kind, time: this.state.time });
    if (this.events.length > MAX_EVENTS) this.events.shift();
  }

  /** Mapea la conducta actual a su clase de aproximación (para el moldeamiento). */
  private currentApproximation(): Approximation {
    const s = this.state;
    if (s.behavior === "press_bar") return "PRESS";
    if (s.behavior === "rear" && s.pos.x < 0.3) return "REAR_AT_BAR";
    if (s.behavior === "approach_bar" || s.pos.x < 0.3) return "NEAR_BAR";
    return "WANDER";
  }

  /**
   * Entrega un reforzador: clic del comedero + pellet. Marca (refuerza) la
   * conducta indicada. Si no se indica, refuerza la conducta actual (moldeamiento).
   */
  private deliverReinforcer(target?: Approximation): void {
    const approx = target ?? this.currentApproximation();
    // El clic marca la conducta; su eficacia depende del entrenamiento de magazine.
    const scale = soundIsEffectiveReinforcer(this.state.mind)
      ? 1
      : Math.max(0.25, this.state.mind.soundFoodAssoc / MAGAZINE.effectiveThreshold);
    reinforceBehavior(this.state.mind, approx, scale);
    pairSoundWithFood(this.state.mind); // entrenamiento de magazine
    this.state.pelletAvailable = true;
    this.state.totals.reinforcers += 1;
    this.log("feeder_click");
    this.log("reinforcer");
  }

  /** El experimentador entrega comida manualmente (magazine training / shaping). */
  deliverFoodManually(): void {
    this.deliverReinforcer();
  }

  setSchedule(schedule: Schedule): void {
    this.state.schedule = schedule;
    armSchedule(schedule, this.state.scheduleState, this.state.time, this.rng);
  }

  /** Presenta el CS (tono) durante `seconds`; si `withShock`, termina en US. */
  presentCS(seconds: number, withShock: boolean): void {
    this.csTimer = Math.max(1, Math.round(seconds / SECONDS_PER_TICK));
    this.csWillShock = withShock;
    this.state.csOn = true;
    this.log("cs_on");
  }

  /** Aplica el US (choque) de inmediato. */
  presentUS(): void {
    this.log("us");
    if (this.state.csOn) pairCsWithUs(this.state.mind);
    this.state.mind.fear = clamp(this.state.mind.fear + 0.5, 0, 1);
  }

  private endCS(): void {
    this.state.csOn = false;
    this.log("cs_off");
    if (this.csWillShock) {
      this.presentUS();
    } else {
      // CS sin US => ensayo de extinción.
      extinguishCs(this.state.mind);
    }
    this.csWillShock = false;
  }

  private moveToward(tag: BehaviorTag): void {
    const t = behaviorTarget(tag);
    const speed = 0.12;
    this.state.pos.x = lerp(this.state.pos.x, t.x, speed);
    this.state.pos.y = lerp(this.state.pos.y, t.y, speed);
  }

  /** Avanza un único tick de simulación. */
  step(): void {
    const s = this.state;
    s.tick += 1;
    s.time += SECONDS_PER_TICK;

    // --- Condicionamiento clásico: gestión del CS en curso ---
    if (this.csTimer > 0) {
      this.csTimer -= 1;
      if (this.csTimer === 0) this.endCS();
    }
    updateFearDuringCs(s.mind, s.csOn);
    if (!s.csOn) spontaneousRecovery(s.mind);

    decayBehaviors(s.mind);

    // --- Comer un pellet disponible ---
    if (s.pelletAvailable) {
      this.moveToward("to_magazine");
      if (s.pos.x < 0.25 && s.pos.y > 0.7) {
        s.behavior = "eat";
        s.pelletAvailable = false;
      } else {
        s.behavior = "to_magazine";
      }
      this.persistRng();
      return;
    }

    // --- ¿Presiona la barra en este tick? ---
    const pPress = momentaryPressProbability(s);
    if (this.rng.chance(pPress)) {
      s.behavior = "press_bar";
      this.moveToward("press_bar");
      s.totals.presses += 1;
      this.log("press");
      const delivered = pressDelivers(
        s.schedule,
        s.scheduleState,
        s.time,
        this.rng,
      );
      if (delivered) {
        this.deliverReinforcer("PRESS");
      } else if (s.schedule.kind === "EXT") {
        // Respuesta no reforzada en extinción: la fuerza operante decae.
        extinguishBehavior(s.mind, "PRESS");
      }
      this.persistRng();
      return;
    }

    // --- Conducta de relleno (no-presión) ---
    const tag = selectIdleBehavior(s, this.rng);
    s.behavior = tag;
    this.moveToward(tag);
    this.persistRng();
  }

  private persistRng(): void {
    this.state.rngSnapshot = this.rng.snapshot();
  }

  /** Avanza `n` ticks (usado por "Aislar a Sniffy" para acelerar el tiempo). */
  run(n: number): void {
    for (let i = 0; i < n; i++) this.step();
  }

  /** Razón de supresión sobre la ventana de tiempo reciente [from, to] seg. */
  pressesInWindow(from: number, to: number): number {
    let count = 0;
    for (const e of this.events) {
      if (e.kind === "press" && e.time >= from && e.time <= to) count += 1;
    }
    return count;
  }
}
