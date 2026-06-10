import type { MindState, Approximation } from "./types";
import { APPROXIMATION_ORDER } from "./types";
import { OPERANT, MAGAZINE } from "./constants";
import { clamp } from "./util";

/**
 * Refuerza una conducta de aproximación y generaliza a niveles adyacentes.
 * `scale` (0..1) reduce la ganancia cuando el clic del comedero aún no es un
 * reforzador secundario eficaz (magazine sin entrenar): así se enseña que el
 * entrenamiento de magazine debe preceder al moldeamiento.
 */
export function reinforceBehavior(
  mind: MindState,
  target: Approximation,
  scale = 1,
): void {
  const idx = APPROXIMATION_ORDER.indexOf(target);
  for (let i = 0; i < APPROXIMATION_ORDER.length; i++) {
    const key = APPROXIMATION_ORDER[i];
    const distance = Math.abs(i - idx);
    const factor = Math.pow(OPERANT.generalization, distance);
    const gain = OPERANT.reinforceGain * factor * scale;
    // Aprendizaje hacia la asíntota: gana menos cuanto más fuerte ya es.
    const v = mind.approximation[key];
    mind.approximation[key] = clamp(
      v + gain * (OPERANT.maxStrength - v),
      OPERANT.minStrength,
      OPERANT.maxStrength,
    );
  }
}

/** Aplica extinción a una conducta emitida sin reforzador. */
export function extinguishBehavior(
  mind: MindState,
  target: Approximation,
): void {
  const v = mind.approximation[target];
  mind.approximation[target] = clamp(
    v - OPERANT.extinctionLoss,
    OPERANT.minStrength,
    OPERANT.maxStrength,
  );
}

/** Decaimiento espontáneo lento de todas las conductas (olvido). */
export function decayBehaviors(mind: MindState): void {
  for (const key of APPROXIMATION_ORDER) {
    if (key === "WANDER") continue; // la línea base exploratoria no decae
    mind.approximation[key] = clamp(
      mind.approximation[key] - OPERANT.decayPerTick,
      OPERANT.minStrength,
      OPERANT.maxStrength,
    );
  }
}

/**
 * Entrenamiento de magazine: empareja el sonido del comedero con la comida.
 * Rescorla-Wagner hacia la asíntota; el sonido gana valor como reforzador
 * secundario.
 */
export function pairSoundWithFood(mind: MindState): void {
  const v = mind.soundFoodAssoc;
  mind.soundFoodAssoc = clamp(
    v + MAGAZINE.alpha * (MAGAZINE.lambda - v),
    0,
    1,
  );
}

/** El clic del comedero sin comida pierde valor (extinción del secundario). */
export function extinguishSound(mind: MindState): void {
  const v = mind.soundFoodAssoc;
  mind.soundFoodAssoc = clamp(v - MAGAZINE.extinctionAlpha * v, 0, 1);
}

/** ¿El clic del comedero ya funciona como reforzador secundario eficaz? */
export function soundIsEffectiveReinforcer(mind: MindState): boolean {
  return mind.soundFoodAssoc >= MAGAZINE.effectiveThreshold;
}
