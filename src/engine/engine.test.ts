import { describe, it, expect } from "vitest";
import { Rng } from "./rng";
import { Simulation } from "./simulation";
import { createInitialState } from "./state";
import {
  reinforceBehavior,
  extinguishBehavior,
  pairSoundWithFood,
} from "./operant";
import { pairCsWithUs, extinguishCs, suppressionRatio } from "./classical";
import { armSchedule, pressDelivers } from "./schedules";
import type { ScheduleState } from "./types";

function freshScheduleState(): ScheduleState {
  return {
    pressesSinceReinforcer: 0,
    ratioTarget: 1,
    lastReinforcerTime: 0,
    intervalTarget: 0,
  };
}

describe("Rng", () => {
  it("es determinista con la misma semilla", () => {
    const a = new Rng(42);
    const b = new Rng(42);
    const seqA = Array.from({ length: 5 }, () => a.next());
    const seqB = Array.from({ length: 5 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });
});

describe("Aprendizaje operante (fuerza de acción)", () => {
  it("la adquisición es monótona y negativamente acelerada", () => {
    const mind = createInitialState().mind;
    const deltas: number[] = [];
    let prev = mind.approximation.PRESS;
    for (let i = 0; i < 8; i++) {
      reinforceBehavior(mind, "PRESS");
      const cur = mind.approximation.PRESS;
      deltas.push(cur - prev);
      prev = cur;
    }
    // Crece siempre...
    expect(deltas.every((d) => d > 0)).toBe(true);
    // ...pero cada incremento es menor que el anterior (asintótico).
    for (let i = 1; i < deltas.length; i++) {
      expect(deltas[i]).toBeLessThan(deltas[i - 1]);
    }
    expect(mind.approximation.PRESS).toBeGreaterThan(0.5);
  });

  it("la extinción reduce la fuerza operante", () => {
    const mind = createInitialState().mind;
    reinforceBehavior(mind, "PRESS");
    reinforceBehavior(mind, "PRESS");
    const before = mind.approximation.PRESS;
    for (let i = 0; i < 5; i++) extinguishBehavior(mind, "PRESS");
    expect(mind.approximation.PRESS).toBeLessThan(before);
  });
});

describe("Entrenamiento de magazine (sonido-comida)", () => {
  it("crece hacia la asíntota de forma negativamente acelerada", () => {
    const mind = createInitialState().mind;
    let prev = mind.soundFoodAssoc;
    const deltas: number[] = [];
    for (let i = 0; i < 10; i++) {
      pairSoundWithFood(mind);
      deltas.push(mind.soundFoodAssoc - prev);
      prev = mind.soundFoodAssoc;
    }
    expect(deltas[0]).toBeGreaterThan(deltas[deltas.length - 1]);
    expect(mind.soundFoodAssoc).toBeGreaterThan(0.8);
  });
});

describe("Programas de reforzamiento", () => {
  it("CRF refuerza cada respuesta", () => {
    const st = freshScheduleState();
    const sch = { kind: "CRF" as const, param: 0 };
    const rng = new Rng(1);
    armSchedule(sch, st, 0, rng);
    for (let i = 0; i < 5; i++) {
      expect(pressDelivers(sch, st, i, rng)).toBe(true);
    }
  });

  it("FR-5 refuerza exactamente cada quinta respuesta", () => {
    const st = freshScheduleState();
    const sch = { kind: "FR" as const, param: 5 };
    const rng = new Rng(1);
    armSchedule(sch, st, 0, rng);
    const results = Array.from({ length: 10 }, (_, i) =>
      pressDelivers(sch, st, i, rng),
    );
    expect(results).toEqual([
      false, false, false, false, true,
      false, false, false, false, true,
    ]);
  });

  it("EXT no refuerza nunca", () => {
    const st = freshScheduleState();
    const sch = { kind: "EXT" as const, param: 0 };
    const rng = new Rng(1);
    for (let i = 0; i < 10; i++) {
      expect(pressDelivers(sch, st, i, rng)).toBe(false);
    }
  });
});

describe("Condicionamiento clásico (CER)", () => {
  it("el emparejamiento CS-US incrementa la asociación; la extinción la reduce", () => {
    const mind = createInitialState().mind;
    for (let i = 0; i < 10; i++) pairCsWithUs(mind);
    const acquired = mind.csUsAssoc;
    expect(acquired).toBeGreaterThan(0.8);
    for (let i = 0; i < 10; i++) extinguishCs(mind);
    expect(mind.csUsAssoc).toBeLessThan(acquired);
  });

  it("la razón de supresión cae con el miedo condicionado", () => {
    // Sin supresión: respuestas iguales en CS y línea base.
    expect(suppressionRatio(20, 20)).toBeCloseTo(0.5);
    // Supresión fuerte: pocas respuestas durante el CS.
    expect(suppressionRatio(2, 20)).toBeLessThan(0.2);
    // Supresión total.
    expect(suppressionRatio(0, 20)).toBe(0);
  });
});

describe("Simulación integrada", () => {
  it("una rata entrenada responde bajo CRF y acumula reforzadores", () => {
    const sim = new Simulation(7);
    // Entrenamos magazine y fuerza operante.
    sim.state.mind.soundFoodAssoc = 1;
    sim.state.mind.approximation.PRESS = 0.9;
    sim.setSchedule({ kind: "CRF", param: 0 });
    sim.run(1000);
    expect(sim.state.totals.presses).toBeGreaterThan(50);
    expect(sim.state.totals.reinforcers).toBeGreaterThan(50);
  });

  it("la extinción reduce la tasa de respuesta frente a CRF", () => {
    const crf = new Simulation(3);
    crf.state.mind.approximation.PRESS = 0.9;
    crf.setSchedule({ kind: "CRF", param: 0 });
    crf.run(1500);
    const crfPresses = crf.state.totals.presses;

    const ext = new Simulation(3);
    ext.state.mind.approximation.PRESS = 0.9;
    ext.setSchedule({ kind: "EXT", param: 0 });
    ext.run(1500);
    const extPresses = ext.state.totals.presses;

    // La fuerza operante decae en extinción.
    expect(ext.state.mind.approximation.PRESS).toBeLessThan(0.9);
    // Y a la larga responde menos que bajo reforzamiento continuo.
    expect(extPresses).toBeLessThan(crfPresses);
  });

  it("VR produce más respuestas que VI en el mismo tiempo", () => {
    const vr = new Simulation(11);
    vr.state.mind.approximation.PRESS = 0.9;
    vr.setSchedule({ kind: "VR", param: 10 });
    vr.run(2000);

    const vi = new Simulation(11);
    vi.state.mind.approximation.PRESS = 0.9;
    vi.setSchedule({ kind: "VI", param: 10 });
    vi.run(2000);

    expect(vr.state.totals.presses).toBeGreaterThan(vi.state.totals.presses);
  });

  it("un CS condicionado suprime la respuesta operante (CER)", () => {
    const sim = new Simulation(5);
    sim.state.mind.approximation.PRESS = 0.9;
    sim.state.mind.csUsAssoc = 1; // CS plenamente condicionado al miedo
    sim.setSchedule({ kind: "VI", param: 10 });

    // Línea base: 60 s sin CS.
    sim.run(Math.round(60 / 0.2));
    const baseStart = 0;
    const baseEnd = sim.state.time;
    const basePresses = sim.pressesInWindow(baseStart, baseEnd);

    // Presentamos el CS durante 60 s y medimos.
    const csStart = sim.state.time;
    sim.presentCS(60, false);
    sim.run(Math.round(60 / 0.2));
    const csPresses = sim.pressesInWindow(csStart, sim.state.time);

    expect(csPresses).toBeLessThan(basePresses);
    expect(suppressionRatio(csPresses, basePresses)).toBeLessThan(0.4);
  });
});
