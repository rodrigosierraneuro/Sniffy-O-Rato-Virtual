import { useState } from "react";
import { es } from "../../data/i18n/es";
import type { ScheduleKind } from "../../engine/types";

export interface ControlHandlers {
  onFood: () => void;
  onApplySchedule: (kind: ScheduleKind, param: number) => void;
  onCS: () => void;
  onCSUS: () => void;
  onUS: () => void;
  onTogglePause: () => void;
  onSetSpeed: (multiplier: number) => void;
  onSave: () => void;
  onLoad: (file: File) => void;
  onReset: () => void;
  onScenario: (id: string) => void;
  paused: boolean;
  speed: number;
}

const SCHEDULE_KINDS: ScheduleKind[] = ["EXT", "CRF", "FR", "VR", "FI", "VI"];

export function ControlPanel(h: ControlHandlers) {
  const [kind, setKind] = useState<ScheduleKind>("CRF");
  const [param, setParam] = useState(10);

  const needsParam = kind === "FR" || kind === "VR" || kind === "FI" || kind === "VI";
  const paramIsTime = kind === "FI" || kind === "VI";

  return (
    <div className="control-panel">
      <section>
        <h3>{es.control.speed}</h3>
        <div className="btn-row">
          <button onClick={h.onTogglePause}>
            {h.paused ? es.control.play : es.control.pause}
          </button>
          <button
            className={h.speed === 1 ? "active" : ""}
            onClick={() => h.onSetSpeed(1)}
          >
            {es.control.normal}
          </button>
          <button
            className={h.speed > 1 ? "active" : ""}
            onClick={() => h.onSetSpeed(40)}
          >
            {es.control.isolate}
          </button>
        </div>
      </section>

      <section>
        <h3>{es.control.food}</h3>
        <button className="primary" onClick={h.onFood}>
          🍖 {es.control.food}
        </button>
        <p className="hint">{es.control.foodHint}</p>
      </section>

      <section>
        <h3>{es.control.schedule}</h3>
        <select value={kind} onChange={(e) => setKind(e.target.value as ScheduleKind)}>
          {SCHEDULE_KINDS.map((k) => (
            <option key={k} value={k}>
              {es.schedules[k]}
            </option>
          ))}
        </select>
        {needsParam && (
          <label className="param">
            {paramIsTime ? "segundos" : "respuestas"}:
            <input
              type="number"
              min={1}
              value={param}
              onChange={(e) => setParam(Number(e.target.value))}
            />
          </label>
        )}
        <button onClick={() => h.onApplySchedule(kind, param)}>{es.control.apply}</button>
      </section>

      <section>
        <h3>{es.control.classical}</h3>
        <div className="btn-row">
          <button onClick={h.onCS}>🔔 {es.control.cs}</button>
          <button onClick={h.onCSUS}>🔔⚡ {es.control.csUs}</button>
          <button onClick={h.onUS}>⚡ {es.control.us}</button>
        </div>
      </section>

      <section>
        <h3>{es.control.scenarios}</h3>
        <select defaultValue="naive" onChange={(e) => h.onScenario(e.target.value)}>
          {Object.entries(es.scenarioNames).map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
      </section>

      <section>
        <div className="btn-row">
          <button onClick={h.onSave}>💾 {es.control.save}</button>
          <label className="file-btn">
            📂 {es.control.load}
            <input
              type="file"
              accept=".json"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) h.onLoad(f);
                e.target.value = "";
              }}
            />
          </label>
          <button onClick={h.onReset}>♻️ {es.control.reset}</button>
        </div>
      </section>
    </div>
  );
}
