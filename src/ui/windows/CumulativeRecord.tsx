import { useEffect, useRef } from "react";
import type { Simulation } from "../../engine/simulation";

/**
 * Registro acumulativo: el eje Y acumula respuestas (presiones de barra) y el
 * eje X es el tiempo. La pendiente = tasa de respuesta. Las marcas oblicuas
 * señalan los reforzadores. Reproduce las firmas de cada programa (festones de
 * IF, escalones de RF, tasa constante de RV/IV).
 */
export function CumulativeRecord({ sim }: { sim: Simulation }) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = parent.clientWidth * dpr;
      canvas.height = parent.clientHeight * dpr;
      canvas.style.width = `${parent.clientWidth}px`;
      canvas.style.height = `${parent.clientHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    const WINDOW_SECONDS = 240; // ventana visible (se desplaza con el tiempo)

    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#0f141b";
      ctx.fillRect(0, 0, w, h);

      const padL = 38;
      const padB = 22;
      const padT = 10;
      const padR = 10;
      const plotW = w - padL - padR;
      const plotH = h - padT - padB;

      const now = sim.state.time;
      const t0 = Math.max(0, now - WINDOW_SECONDS);
      const tSpan = Math.max(1, now - t0 || WINDOW_SECONDS);

      // Respuestas dentro de la ventana.
      const presses = sim.events.filter(
        (e) => e.kind === "press" && e.time >= t0,
      );
      const reinforcers = sim.events.filter(
        (e) => e.kind === "reinforcer" && e.time >= t0,
      );
      const maxCount = Math.max(20, presses.length);

      const xOf = (t: number) => padL + ((t - t0) / tSpan) * plotW;
      const yOf = (c: number) => padT + plotH - (c / maxCount) * plotH;

      // Ejes.
      ctx.strokeStyle = "#2b3340";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padL, padT);
      ctx.lineTo(padL, padT + plotH);
      ctx.lineTo(padL + plotW, padT + plotH);
      ctx.stroke();

      // Línea acumulativa escalonada.
      ctx.strokeStyle = "#7fd1ff";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(xOf(t0), yOf(0));
      let count = 0;
      for (const e of presses) {
        const x = xOf(e.time);
        ctx.lineTo(x, yOf(count));
        count += 1;
        ctx.lineTo(x, yOf(count));
      }
      ctx.lineTo(xOf(now), yOf(count));
      ctx.stroke();

      // Marcas de reforzador (pequeñas diagonales sobre la curva).
      ctx.strokeStyle = "#ffd866";
      ctx.lineWidth = 1.4;
      for (const r of reinforcers) {
        const idx = presses.filter((p) => p.time <= r.time).length;
        const x = xOf(r.time);
        const y = yOf(idx);
        ctx.beginPath();
        ctx.moveTo(x - 4, y + 4);
        ctx.lineTo(x + 4, y - 4);
        ctx.stroke();
      }

      // Etiquetas.
      ctx.fillStyle = "#8b97a3";
      ctx.font = "10px system-ui, sans-serif";
      ctx.fillText(`${maxCount} resp`, 4, padT + 8);
      ctx.fillText("0", 28, padT + plotH);
      ctx.fillText(`${Math.round(tSpan)} s`, padL + plotW - 28, h - 6);

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [sim]);

  return <canvas ref={ref} className="record-canvas" />;
}
