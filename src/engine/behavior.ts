import type { SimState, BehaviorTag } from "./types";
import type { Rng } from "./rng";
import { SECONDS_PER_TICK } from "./constants";
import { clamp } from "./util";

/**
 * Probabilidad momentánea de presionar la barra en este tick.
 *
 * Combina la fuerza operante (PRESS) con la modulación característica de cada
 * programa, de modo que el registro acumulativo muestre las firmas canónicas:
 *  - Razón (FR/VR): tasa alta y sostenida.
 *  - Intervalo fijo (IF): festón — tasa baja tras el reforzador que acelera al
 *    acercarse el fin del intervalo (discriminación temporal).
 *  - Intervalo variable (IV): tasa moderada y constante.
 *  - El miedo condicionado (CER) suprime la respuesta.
 */
export function momentaryPressProbability(state: SimState): number {
  const strength = state.mind.approximation.PRESS;
  // Tasa base por segundo en su máximo, escalada por la fuerza operante.
  const maxPerSecond = 1.6;
  let p = strength * maxPerSecond * SECONDS_PER_TICK;

  const { schedule, scheduleState, time } = state;
  switch (schedule.kind) {
    case "FR":
    case "VR":
    case "CRF":
      // Las contingencias de razón sostienen tasas altas.
      p *= 1.0;
      break;
    case "FI": {
      // Festón: cerca de 0 tras el reforzador, sube hacia el fin del intervalo.
      const elapsed = time - scheduleState.lastReinforcerTime;
      const frac = clamp(elapsed / Math.max(0.001, schedule.param), 0, 1.2);
      p *= 0.1 + 0.9 * frac * frac;
      break;
    }
    case "VI":
      // Intervalo impredecible: tasa moderada y estable.
      p *= 0.55;
      break;
    case "EXT":
    default:
      p *= 1.0;
  }

  // La respuesta emocional condicionada (miedo al CS) suprime la conducta.
  p *= 1 - state.mind.fear;
  return clamp(p, 0, 1);
}

/**
 * Selecciona una conducta "de relleno" (no-presión) ponderada por las fuerzas
 * de aproximación. Usada cuando la rata no presiona en este tick.
 */
export function selectIdleBehavior(state: SimState, rng: Rng): BehaviorTag {
  // Si hay un pellet disponible, ir a comer tiene prioridad.
  if (state.pelletAvailable) return "to_magazine";

  // El miedo intenso produce congelamiento.
  if (state.mind.fear > 0.6 && rng.chance(state.mind.fear)) return "freeze";

  const a = state.mind.approximation;
  const weights: [BehaviorTag, number][] = [
    ["wander", a.WANDER + 0.05],
    ["sniff", a.WANDER * 0.6 + 0.03],
    ["groom", 0.06],
    ["rear", a.WANDER * 0.3 + 0.03],
    ["approach_bar", a.NEAR_BAR * 1.5],
    ["rear", a.REAR_AT_BAR * 1.5], // erguirse junto a la barra
  ];
  const total = weights.reduce((s, [, w]) => s + w, 0);
  let r = rng.next() * total;
  for (const [tag, w] of weights) {
    r -= w;
    if (r <= 0) return tag;
  }
  return "wander";
}

/** Posición objetivo (normalizada) hacia la que se dirige cada conducta. */
export function behaviorTarget(tag: BehaviorTag): { x: number; y: number } {
  switch (tag) {
    case "press_bar":
    case "approach_bar":
      return { x: 0.18, y: 0.55 }; // barra a la izquierda
    case "to_magazine":
    case "eat":
      return { x: 0.18, y: 0.78 }; // comedero bajo la barra
    case "rear":
      return { x: 0.22, y: 0.5 };
    case "freeze":
      return { x: 0.5, y: 0.7 };
    default:
      return { x: 0.5 + 0, y: 0.65 };
  }
}
