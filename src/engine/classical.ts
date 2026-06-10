import type { MindState } from "./types";
import { CLASSICAL } from "./constants";
import { clamp } from "./util";

/**
 * Condicionamiento clásico (CER). Modelo Rescorla-Wagner de la asociación
 * CS-US. El CS (tono) gana fuerza asociativa cuando va seguido del US (choque).
 */

/** Emparejamiento CS→US: la asociación crece hacia la asíntota. */
export function pairCsWithUs(mind: MindState): void {
  const v = mind.csUsAssoc;
  mind.csUsAssoc = clamp(v + CLASSICAL.alpha * (CLASSICAL.lambda - v), 0, 1);
}

/** CS presentado sin US: extinción de la asociación. */
export function extinguishCs(mind: MindState): void {
  const v = mind.csUsAssoc;
  mind.csUsAssoc = clamp(v - CLASSICAL.extinctionAlpha * v, 0, 1);
}

/**
 * Recuperación espontánea: tras un descanso, parte de la asociación extinta
 * reaparece. Modelado como un leve retorno del miedo hacia la asociación
 * latente durante el paso del tiempo sin CS.
 */
export function spontaneousRecovery(mind: MindState): void {
  // El miedo "olvidado" se recupera lentamente hacia el valor asociativo actual.
  mind.fear = clamp(
    mind.fear + CLASSICAL.spontaneousRecovery * (mind.csUsAssoc - mind.fear),
    0,
    1,
  );
}

/**
 * Mientras el CS está presente, el miedo tiende hacia la fuerza asociativa.
 * Ese miedo es el que suprime la conducta operante (respuesta emocional
 * condicionada).
 */
export function updateFearDuringCs(mind: MindState, csOn: boolean): void {
  const target = csOn ? mind.csUsAssoc : 0;
  // Subida rápida al aparecer el CS, bajada al desaparecer.
  const rate = csOn ? 0.25 : 0.15;
  mind.fear = clamp(mind.fear + rate * (target - mind.fear), 0, 1);
}

/**
 * Razón de supresión = respuestas durante el CS / (respuestas durante CS +
 * respuestas en línea base de igual duración). Valores cercanos a 0 indican
 * supresión total (miedo condicionado); 0.5 indica ausencia de supresión.
 */
export function suppressionRatio(
  pressesDuringCs: number,
  pressesBaseline: number,
): number {
  const denom = pressesDuringCs + pressesBaseline;
  if (denom === 0) return 0.5;
  return pressesDuringCs / denom;
}
