/** Tipos compartidos del motor de simulación. */

/** Programas de reforzamiento. */
export type ScheduleKind = "CRF" | "FR" | "VR" | "FI" | "VI" | "EXT";

export interface Schedule {
  kind: ScheduleKind;
  /** Parámetro: n respuestas (FR/VR) o t segundos (FI/VI). Ignorado en CRF/EXT. */
  param: number;
}

/**
 * Niveles de aproximación para el moldeamiento por aproximaciones sucesivas.
 * Reforzar un nivel eleva su fuerza y la rata progresa naturalmente hacia el
 * siguiente. PRESS es la respuesta operante objetivo (presionar la barra).
 */
export type Approximation = "WANDER" | "NEAR_BAR" | "REAR_AT_BAR" | "PRESS";

export const APPROXIMATION_ORDER: Approximation[] = [
  "WANDER",
  "NEAR_BAR",
  "REAR_AT_BAR",
  "PRESS",
];

/** Conducta visible que la rata está ejecutando en un instante dado. */
export type BehaviorTag =
  | "wander"
  | "sniff"
  | "rear"
  | "groom"
  | "approach_bar"
  | "press_bar"
  | "to_magazine"
  | "eat"
  | "freeze"; // congelamiento por CER (supresión)

export type EventKind =
  | "press" // respuesta operante (presión de barra)
  | "reinforcer" // entrega de comida (reforzador primario)
  | "feeder_click" // clic del comedero (reforzador secundario)
  | "cs_on"
  | "cs_off"
  | "us"; // choque (estímulo incondicionado)

export interface SimEvent {
  kind: EventKind;
  /** Tiempo de simulación en segundos. */
  time: number;
}

export interface MindState {
  /** Fuerza de cada conducta de aproximación (moldeamiento). */
  approximation: Record<Approximation, number>;
  /** Valor asociativo del sonido del comedero (reforzador secundario). */
  soundFoodAssoc: number;
  /** Asociación CS-US del condicionamiento clásico (Rescorla-Wagner). */
  csUsAssoc: number;
  /** Nivel actual de miedo/supresión inducido por el CS (0..1). */
  fear: number;
}

export interface ScheduleState {
  /** Presiones desde el último reforzador (para FR/VR). */
  pressesSinceReinforcer: number;
  /** Objetivo actual de presiones (VR sortea uno nuevo cada vez). */
  ratioTarget: number;
  /** Tiempo del último reforzador (para FI/VI). */
  lastReinforcerTime: number;
  /** Intervalo objetivo actual en segundos (FI/VI). */
  intervalTarget: number;
}

export interface SimState {
  time: number; // segundos de simulación transcurridos
  tick: number; // número de paso
  schedule: Schedule;
  scheduleState: ScheduleState;
  mind: MindState;
  behavior: BehaviorTag;
  /** Posición normalizada de la rata en la caja (0..1 en X e Y). */
  pos: { x: number; y: number };
  /** Contadores acumulados. */
  totals: {
    presses: number;
    reinforcers: number;
  };
  /** ¿Hay un CS sonando ahora? (condicionamiento clásico) */
  csOn: boolean;
  /** Pellet disponible para comer en el comedero. */
  pelletAvailable: boolean;
  rngSnapshot: number;
}
