import type { Simulation } from "../../engine/simulation";
import type { Schedule } from "../../engine/types";

export interface Scenario {
  id: string;
  /** Aplica el escenario sobre una simulación recién creada. */
  apply: (sim: Simulation) => void;
}

/**
 * Escenarios precargados, inspirados en los archivos de muestra del Sniffy
 * original (MagTrain, ShapeBP, VR-25, ClassAcq). Permiten al estudiante partir
 * de distintos puntos sin tener que entrenar a la rata cada vez.
 */
export const scenarios: Scenario[] = [
  {
    id: "naive",
    apply: () => {
      // Estado por defecto: rata ingenua. No cambia nada.
    },
  },
  {
    id: "magazine",
    apply: (sim) => {
      sim.state.mind.soundFoodAssoc = 1; // magazine ya entrenado
    },
  },
  {
    id: "shaped",
    apply: (sim) => {
      sim.state.mind.soundFoodAssoc = 1;
      sim.state.mind.approximation.NEAR_BAR = 0.8;
      sim.state.mind.approximation.REAR_AT_BAR = 0.7;
      sim.state.mind.approximation.PRESS = 0.85;
    },
  },
  {
    id: "vr25",
    apply: (sim) => {
      sim.state.mind.soundFoodAssoc = 1;
      sim.state.mind.approximation.PRESS = 0.9;
      const sch: Schedule = { kind: "VR", param: 25 };
      sim.setSchedule(sch);
    },
  },
  {
    id: "cer",
    apply: (sim) => {
      sim.state.mind.soundFoodAssoc = 1;
      sim.state.mind.approximation.PRESS = 0.85;
      sim.setSchedule({ kind: "VI", param: 30 });
    },
  },
];

export function getScenario(id: string): Scenario | undefined {
  return scenarios.find((s) => s.id === id);
}
