import type { SimState, Schedule } from "./types";

export function defaultSchedule(): Schedule {
  return { kind: "EXT", param: 0 };
}

/** Estado inicial de un experimento nuevo (rata "ingenua"). */
export function createInitialState(): SimState {
  return {
    time: 0,
    tick: 0,
    schedule: defaultSchedule(),
    scheduleState: {
      pressesSinceReinforcer: 0,
      ratioTarget: 1,
      lastReinforcerTime: 0,
      intervalTarget: 0,
    },
    mind: {
      approximation: {
        WANDER: 0.25, // conducta exploratoria de línea base
        NEAR_BAR: 0.04,
        REAR_AT_BAR: 0.02,
        PRESS: 0.01, // presión accidental ocasional al inicio
      },
      soundFoodAssoc: 0,
      csUsAssoc: 0,
      fear: 0,
    },
    behavior: "wander",
    pos: { x: 0.5, y: 0.6 },
    totals: { presses: 0, reinforcers: 0 },
    csOn: false,
    pelletAvailable: false,
    rngSnapshot: 0,
  };
}
