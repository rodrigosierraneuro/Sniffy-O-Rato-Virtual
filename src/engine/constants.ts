/**
 * Parámetros del modelo de aprendizaje.
 *
 * Estos valores controlan la velocidad y forma de las curvas de adquisición y
 * extinción. Están elegidos para que los fenómenos canónicos (adquisición
 * negativamente acelerada, festones de IF, estallido de extinción, etc.) se
 * vean "como en el libro de texto" en una sesión de duración razonable.
 * Ajustables sin tocar la lógica.
 */
export const SECONDS_PER_TICK = 0.2;

/** Modelo operante (fuerza de acción / moldeamiento). */
export const OPERANT = {
  /** Incremento de fuerza al reforzar la conducta activa (aprendizaje). */
  reinforceGain: 0.18,
  /** Generalización a conductas de nivel de aproximación adyacente. */
  generalization: 0.5,
  /** Decremento por respuesta no reforzada (extinción). */
  extinctionLoss: 0.012,
  /** Decaimiento espontáneo por tick (olvido lento). */
  decayPerTick: 0.00008,
  /** Fuerza máxima de una conducta. */
  maxStrength: 1,
  /** Fuerza mínima (línea base de conducta operante libre). */
  minStrength: 0,
} as const;

/** Asociación sonido-comida (reforzador secundario, entrenamiento de magazine). */
export const MAGAZINE = {
  /** Tasa de aprendizaje Rescorla-Wagner del emparejamiento sonido→comida. */
  alpha: 0.25,
  /** Asíntota (lambda) cuando el sonido predice comida. */
  lambda: 1,
  /** Extinción del valor del sonido si suena sin comida. */
  extinctionAlpha: 0.05,
  /** Umbral a partir del cual el clic actúa como reforzador secundario eficaz. */
  effectiveThreshold: 0.3,
} as const;

/** Condicionamiento clásico (CER / supresión condicionada). */
export const CLASSICAL = {
  /** Tasa de aprendizaje CS-US (Rescorla-Wagner). */
  alpha: 0.2,
  /** Asíntota de la asociación con el US presente. */
  lambda: 1,
  /** Tasa de extinción cuando el CS se presenta sin US. */
  extinctionAlpha: 0.08,
  /** Decaimiento que habilita la recuperación espontánea tras descanso. */
  spontaneousRecovery: 0.0004,
} as const;
