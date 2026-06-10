import type { Simulation } from "./simulation";
import { suppressionRatio } from "./classical";

export type CerPhase = "idle" | "baseline" | "cs" | "done";

export interface CerTrialResult {
  trial: number;
  baselinePresses: number;
  csPresses: number;
  /** respuestas durante CS / (CS + línea base). 0.5 = sin supresión, 0 = total. */
  ratio: number;
  reinforced: boolean;
}

export interface CerConfig {
  trials: number;
  csSeconds: number;
  baselineSeconds: number;
  /** true = ensayos de adquisición (CS→US); false = extinción/prueba (CS solo). */
  shock: boolean;
}

export const DEFAULT_CER_CONFIG: CerConfig = {
  trials: 8,
  csSeconds: 30,
  baselineSeconds: 30,
  shock: true,
};

/**
 * Protocolo automático de Respuesta Emocional Condicionada (CER / supresión
 * condicionada). Alterna períodos de línea base y de CS, mide la razón de
 * supresión en cada ensayo y, en adquisición, entrega el US al final del CS.
 *
 * Es una máquina de estados conducida por el tiempo de simulación: `update` se
 * llama en cada frame con la simulación en curso.
 */
export class CerProtocol {
  config: CerConfig = { ...DEFAULT_CER_CONFIG };
  phase: CerPhase = "idle";
  results: CerTrialResult[] = [];
  trialIndex = 0;
  phaseEndTime = 0;

  private periodStart = 0;
  private baselinePresses = 0;

  start(sim: Simulation, config: CerConfig): void {
    this.config = { ...config };
    this.results = [];
    this.trialIndex = 0;
    this.beginBaseline(sim);
  }

  stop(): void {
    this.phase = "idle";
  }

  /** Tiempo restante (s) del período actual, para la cuenta atrás de la UI. */
  remaining(sim: Simulation): number {
    if (this.phase === "baseline" || this.phase === "cs") {
      return Math.max(0, this.phaseEndTime - sim.state.time);
    }
    return 0;
  }

  private beginBaseline(sim: Simulation): void {
    this.phase = "baseline";
    this.periodStart = sim.state.time;
    this.phaseEndTime = sim.state.time + this.config.baselineSeconds;
  }

  private beginCs(sim: Simulation): void {
    this.baselinePresses = sim.pressesInWindow(this.periodStart, sim.state.time);
    this.phase = "cs";
    this.periodStart = sim.state.time;
    this.phaseEndTime = sim.state.time + this.config.csSeconds;
    // presentCS se encarga de entregar el US al final si shock === true.
    sim.presentCS(this.config.csSeconds, this.config.shock);
  }

  private endTrial(sim: Simulation): void {
    const csPresses = sim.pressesInWindow(this.periodStart, sim.state.time);
    const ratio = suppressionRatio(csPresses, this.baselinePresses);
    this.results.push({
      trial: this.trialIndex + 1,
      baselinePresses: this.baselinePresses,
      csPresses,
      ratio,
      reinforced: this.config.shock,
    });
    this.trialIndex += 1;
    if (this.trialIndex >= this.config.trials) {
      this.phase = "done";
    } else {
      this.beginBaseline(sim);
    }
  }

  update(sim: Simulation): void {
    if (this.phase !== "baseline" && this.phase !== "cs") return;
    if (sim.state.time < this.phaseEndTime) return;
    if (this.phase === "baseline") this.beginCs(sim);
    else this.endTrial(sim);
  }
}
