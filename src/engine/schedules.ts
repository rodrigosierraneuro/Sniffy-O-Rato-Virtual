import type { Schedule, ScheduleState } from "./types";
import type { Rng } from "./rng";

/** (Re)inicializa el objetivo de un programa tras un reforzador o un cambio. */
export function armSchedule(
  schedule: Schedule,
  st: ScheduleState,
  time: number,
  rng: Rng,
): void {
  st.pressesSinceReinforcer = 0;
  st.lastReinforcerTime = time;
  switch (schedule.kind) {
    case "FR":
      st.ratioTarget = Math.max(1, Math.round(schedule.param));
      break;
    case "VR":
      // Razón sorteada alrededor de la media `param`, mínimo 1.
      st.ratioTarget = Math.max(1, Math.round(rng.exponential(schedule.param)));
      break;
    case "FI":
      st.intervalTarget = Math.max(0, schedule.param);
      break;
    case "VI":
      st.intervalTarget = Math.max(0, rng.exponential(schedule.param));
      break;
    default:
      st.ratioTarget = 1;
      st.intervalTarget = 0;
  }
}

/**
 * Decide si una presión de barra produce reforzador bajo el programa actual.
 * Actualiza el estado del programa y lo re-arma si entrega.
 */
export function pressDelivers(
  schedule: Schedule,
  st: ScheduleState,
  time: number,
  rng: Rng,
): boolean {
  st.pressesSinceReinforcer += 1;
  let deliver = false;
  switch (schedule.kind) {
    case "CRF":
      deliver = true;
      break;
    case "FR":
    case "VR":
      deliver = st.pressesSinceReinforcer >= st.ratioTarget;
      break;
    case "FI":
    case "VI":
      deliver = time - st.lastReinforcerTime >= st.intervalTarget;
      break;
    case "EXT":
    default:
      deliver = false;
  }
  if (deliver) armSchedule(schedule, st, time, rng);
  return deliver;
}
