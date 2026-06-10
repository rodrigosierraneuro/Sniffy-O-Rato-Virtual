/**
 * Generador de números pseudoaleatorios con semilla (mulberry32).
 * Determinista: la misma semilla produce siempre la misma secuencia, lo que
 * permite reproducir experimentos y escribir tests estables.
 */
export class Rng {
  private state: number;

  constructor(seed = 1) {
    // Aseguramos un entero de 32 bits distinto de cero.
    this.state = (seed >>> 0) || 0x9e3779b9;
  }

  /** Número en [0, 1). */
  next(): number {
    this.state |= 0;
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Entero en [min, max] inclusive. */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  /** True con probabilidad p. */
  chance(p: number): boolean {
    return this.next() < p;
  }

  /** Muestra de una exponencial con media `mean` (para programas de intervalo variable). */
  exponential(mean: number): number {
    return -Math.log(1 - this.next()) * mean;
  }

  /** Estado serializable para guardar/cargar. */
  snapshot(): number {
    return this.state;
  }

  restore(state: number): void {
    this.state = state >>> 0;
  }
}
