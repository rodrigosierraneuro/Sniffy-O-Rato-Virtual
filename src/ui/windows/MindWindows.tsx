import type { Simulation } from "../../engine/simulation";
import { es } from "../../data/i18n/es";

function Bar({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  const pct = Math.round(value * 100);
  return (
    <div className="bar-row">
      <div className="bar-label">{label}</div>
      <div className="bar-track">
        <div
          className="bar-fill"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <div className="bar-value">{pct}%</div>
    </div>
  );
}

/** Visualiza en tiempo real las variables internas ("la mente" de la rata). */
export function MindWindows({ sim }: { sim: Simulation }) {
  const m = sim.state.mind;
  return (
    <div className="mind-windows">
      <div className="mind-group-title">Operante</div>
      <Bar label={es.mind.pressStrength} value={m.approximation.PRESS} color="#7fd1ff" />
      <Bar label={es.mind.rearAtBar} value={m.approximation.REAR_AT_BAR} color="#9ad0c2" />
      <Bar label={es.mind.nearBar} value={m.approximation.NEAR_BAR} color="#9ad0c2" />
      <Bar label={es.mind.soundFood} value={m.soundFoodAssoc} color="#ffd866" />

      <div className="mind-group-title">Clásico (CER)</div>
      <Bar label={es.mind.csUs} value={m.csUsAssoc} color="#ff9f7f" />
      <Bar label={es.mind.fear} value={m.fear} color="#ff6b6b" />
    </div>
  );
}
