import { useEffect, useRef, useState } from "react";
import type { Simulation } from "../../engine/simulation";
import {
  CerProtocol,
  DEFAULT_CER_CONFIG,
  type CerConfig,
} from "../../engine/cerProtocol";
import { es } from "../../data/i18n/es";

/**
 * Panel de la sesión CER: configura y ejecuta el protocolo de supresión
 * condicionada y grafica la razón de supresión a lo largo de los ensayos
 * (adquisición = la razón cae hacia 0; extinción = se recupera hacia 0.5).
 */
export function CerPanel({
  sim,
  protocol,
  onTick,
}: {
  sim: Simulation;
  protocol: CerProtocol;
  onTick: number; // cambia cada frame de React para refrescar
}) {
  const [cfg, setCfg] = useState<CerConfig>({ ...DEFAULT_CER_CONFIG });
  const graphRef = useRef<HTMLCanvasElement | null>(null);

  const running = protocol.phase === "baseline" || protocol.phase === "cs";

  // Dibuja la gráfica de razón de supresión por ensayo.
  useEffect(() => {
    const canvas = graphRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const parent = canvas.parentElement;
    if (!parent) return;
    canvas.width = parent.clientWidth * dpr;
    canvas.height = parent.clientHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const w = parent.clientWidth;
    const h = parent.clientHeight;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#0f141b";
    ctx.fillRect(0, 0, w, h);

    const padL = 30;
    const padB = 18;
    const padT = 8;
    const padR = 8;
    const plotW = w - padL - padR;
    const plotH = h - padT - padB;
    const n = Math.max(cfg.trials, protocol.results.length);

    const xOf = (i: number) => padL + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
    const yOf = (r: number) => padT + plotH - (r / 0.5) * plotH; // 0..0.5 -> abajo..arriba

    // Línea de referencia 0.5 (sin supresión).
    ctx.strokeStyle = "#2b3340";
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(padL, yOf(0.5));
    ctx.lineTo(padL + plotW, yOf(0.5));
    ctx.stroke();
    ctx.setLineDash([]);

    // Ejes.
    ctx.strokeStyle = "#2b3340";
    ctx.beginPath();
    ctx.moveTo(padL, padT);
    ctx.lineTo(padL, padT + plotH);
    ctx.lineTo(padL + plotW, padT + plotH);
    ctx.stroke();
    ctx.fillStyle = "#8b97a3";
    ctx.font = "9px system-ui, sans-serif";
    ctx.fillText("0.5", 6, yOf(0.5) + 3);
    ctx.fillText("0", 16, padT + plotH);

    // Curva de resultados.
    const pts = protocol.results;
    if (pts.length > 0) {
      ctx.strokeStyle = "#ff9f7f";
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      pts.forEach((p, i) => {
        const x = xOf(i);
        const y = yOf(p.ratio);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.fillStyle = "#ffd0bf";
      pts.forEach((p, i) => {
        ctx.beginPath();
        ctx.arc(xOf(i), yOf(p.ratio), 2.6, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  }, [onTick, cfg.trials, protocol.results]);

  const set = (k: keyof CerConfig, v: number | boolean) =>
    setCfg((c) => ({ ...c, [k]: v }));

  const phaseLabel = () => {
    switch (protocol.phase) {
      case "baseline":
        return `${es.cer.phaseBaseline} · ${es.cer.trial} ${protocol.trialIndex + 1}/${cfg.trials}`;
      case "cs":
        return `${es.cer.phaseCs} · ${es.cer.trial} ${protocol.trialIndex + 1}/${cfg.trials}`;
      case "done":
        return es.cer.phaseDone;
      default:
        return es.cer.phaseIdle;
    }
  };

  const last = protocol.results[protocol.results.length - 1];

  return (
    <div className="cer-panel">
      <div className="cer-config">
        <label>
          {es.cer.trials}
          <input
            type="number"
            min={1}
            max={40}
            value={cfg.trials}
            disabled={running}
            onChange={(e) => set("trials", Number(e.target.value))}
          />
        </label>
        <label>
          {es.cer.csSeconds}
          <input
            type="number"
            min={5}
            value={cfg.csSeconds}
            disabled={running}
            onChange={(e) => set("csSeconds", Number(e.target.value))}
          />
        </label>
        <label>
          {es.cer.baselineSeconds}
          <input
            type="number"
            min={5}
            value={cfg.baselineSeconds}
            disabled={running}
            onChange={(e) => set("baselineSeconds", Number(e.target.value))}
          />
        </label>
        <label className="cer-check">
          <input
            type="checkbox"
            checked={cfg.shock}
            disabled={running}
            onChange={(e) => set("shock", e.target.checked)}
          />
          {es.cer.shock}
        </label>
      </div>

      <div className="cer-actions">
        {running ? (
          <button onClick={() => protocol.stop()}>{es.cer.stop}</button>
        ) : (
          <button className="primary" onClick={() => protocol.start(sim, cfg)}>
            {es.cer.start}
          </button>
        )}
        <span className="cer-phase">
          {phaseLabel()}
          {running && ` · ${protocol.remaining(sim).toFixed(0)}s ${es.cer.remaining}`}
        </span>
      </div>

      <div className="cer-graph-host">
        <canvas ref={graphRef} className="cer-graph" />
      </div>
      <div className="cer-foot">
        <span>{es.cer.graphHint}</span>
        {last && (
          <span className="cer-last">
            {es.cer.ratio}: <b>{last.ratio.toFixed(2)}</b>
          </span>
        )}
      </div>
    </div>
  );
}
