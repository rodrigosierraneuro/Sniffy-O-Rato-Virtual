import type { Simulation } from "../engine/simulation";
import type { SimState, SimEvent } from "../engine/types";

const FORMAT = "sniffy-virtual-rat";
const VERSION = 1;

export interface SaveFile {
  format: typeof FORMAT;
  version: number;
  savedAt: string;
  state: SimState;
  events: SimEvent[];
  rng: number;
}

export function serialize(sim: Simulation): SaveFile {
  return {
    format: FORMAT,
    version: VERSION,
    savedAt: new Date().toISOString(),
    state: structuredClone(sim.state),
    events: structuredClone(sim.events),
    rng: sim.rng.snapshot(),
  };
}

export function applySave(sim: Simulation, data: SaveFile): void {
  if (data.format !== FORMAT) throw new Error("Archivo no compatible");
  sim.state = structuredClone(data.state);
  sim.events = structuredClone(data.events);
  sim.rng.restore(data.rng);
}

/** Descarga el experimento como archivo .json. */
export function downloadSave(sim: Simulation, name = "experimento"): void {
  const blob = new Blob([JSON.stringify(serialize(sim), null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}.sniffy.json`;
  a.click();
  URL.revokeObjectURL(url);
}

const LS_KEY = "sniffy:lastExperiment";

export function saveToLocal(sim: Simulation): void {
  localStorage.setItem(LS_KEY, JSON.stringify(serialize(sim)));
}

export function loadFromLocal(): SaveFile | null {
  const raw = localStorage.getItem(LS_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SaveFile;
  } catch {
    return null;
  }
}
