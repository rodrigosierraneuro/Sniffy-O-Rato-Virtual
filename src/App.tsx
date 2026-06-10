import { useEffect, useRef, useState } from "react";
import { Simulation } from "./engine/simulation";
import { SECONDS_PER_TICK } from "./engine/constants";
import type { ScheduleKind } from "./engine/types";
import { ChamberCanvas } from "./scene/ChamberCanvas";
import { CumulativeRecord } from "./ui/windows/CumulativeRecord";
import { CerPanel } from "./ui/windows/CerPanel";
import { MindWindows } from "./ui/windows/MindWindows";
import { ControlPanel } from "./ui/controls/ControlPanel";
import { CerProtocol } from "./engine/cerProtocol";
import { createInitialState } from "./engine/state";
import { getScenario } from "./data/scenarios";
import { downloadSave, applySave, type SaveFile } from "./persistence/save";
import { es } from "./data/i18n/es";

export function App() {
  const simRef = useRef<Simulation>(new Simulation());
  const protocolRef = useRef<CerProtocol>(new CerProtocol());
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [recordTab, setRecordTab] = useState<"cumulative" | "cer">("cumulative");
  const [frame, forceRender] = useState(0);

  const pausedRef = useRef(paused);
  const speedRef = useRef(speed);
  pausedRef.current = paused;
  speedRef.current = speed;

  // Bucle de simulación de paso fijo, desacoplado del render.
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (!pausedRef.current) {
        acc += dt * speedRef.current;
        let ticks = Math.floor(acc / SECONDS_PER_TICK);
        acc -= ticks * SECONDS_PER_TICK;
        if (ticks > 3000) ticks = 3000; // tope de seguridad
        // El protocolo CER debe evaluarse en cada tick para detectar los
        // cambios de fase aunque se avancen muchos ticks por frame.
        for (let i = 0; i < ticks; i++) {
          simRef.current.step();
          protocolRef.current.update(simRef.current);
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Re-render periódico de los paneles de React (los lienzos se animan solos).
  useEffect(() => {
    const id = setInterval(() => forceRender((n) => n + 1), 100);
    return () => clearInterval(id);
  }, []);

  const sim = simRef.current;

  // --- Estadísticas en vivo ---
  const now = sim.state.time;
  const ratePerMin = sim.pressesInWindow(Math.max(0, now - 60), now);

  const handlers = {
    paused,
    speed,
    onFood: () => sim.deliverFoodManually(),
    onApplySchedule: (kind: ScheduleKind, param: number) =>
      sim.setSchedule({ kind, param }),
    onCS: () => sim.presentCS(30, false),
    onCSUS: () => sim.presentCS(30, true),
    onUS: () => sim.presentUS(),
    onTogglePause: () => setPaused((p) => !p),
    onSetSpeed: (m: number) => setSpeed(m),
    onSave: () => downloadSave(sim),
    onLoad: (file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(String(reader.result)) as SaveFile;
          applySave(sim, data);
          forceRender((n) => n + 1);
        } catch (err) {
          alert("No se pudo cargar el archivo: " + (err as Error).message);
        }
      };
      reader.readAsText(file);
    },
    onReset: () => {
      protocolRef.current.stop();
      sim.state = createInitialState();
      sim.events = [];
      forceRender((n) => n + 1);
    },
    onScenario: (id: string) => {
      protocolRef.current.stop();
      sim.state = createInitialState();
      sim.events = [];
      getScenario(id)?.apply(sim);
      forceRender((n) => n + 1);
    },
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>{es.appTitle}</h1>
        <span className="subtitle">{es.subtitle}</span>
      </header>

      <main className="layout">
        <section className="panel chamber-panel">
          <div className="panel-title">
            {es.windows.chamber}
            <span className="behavior-tag">
              {es.behaviors[sim.state.behavior] ?? sim.state.behavior}
            </span>
          </div>
          <div className="chamber-host">
            <ChamberCanvas sim={sim} />
          </div>
          <div className="stats-bar">
            <Stat label={es.stats.time} value={`${now.toFixed(1)} s`} />
            <Stat label={es.stats.presses} value={String(sim.state.totals.presses)} />
            <Stat label={es.stats.reinforcers} value={String(sim.state.totals.reinforcers)} />
            <Stat label={es.stats.rate} value={String(ratePerMin)} />
          </div>
        </section>

        <section className="panel record-panel">
          <div className="panel-title tabs">
            <button
              className={recordTab === "cumulative" ? "tab active" : "tab"}
              onClick={() => setRecordTab("cumulative")}
            >
              {es.cer.tabCumulative}
            </button>
            <button
              className={recordTab === "cer" ? "tab active" : "tab"}
              onClick={() => setRecordTab("cer")}
            >
              {es.cer.tabCer}
            </button>
          </div>
          <div className="record-host">
            {recordTab === "cumulative" ? (
              <CumulativeRecord sim={sim} />
            ) : (
              <CerPanel sim={sim} protocol={protocolRef.current} onTick={frame} />
            )}
          </div>
        </section>

        <section className="panel mind-panel">
          <div className="panel-title">{es.windows.mind}</div>
          <MindWindows sim={sim} />
        </section>

        <section className="panel control-panel-wrap">
          <div className="panel-title">{es.windows.control}</div>
          <ControlPanel {...handlers} />
        </section>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
