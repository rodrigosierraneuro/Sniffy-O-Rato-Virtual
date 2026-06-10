import { useEffect, useRef } from "react";
import type { Simulation } from "../engine/simulation";
import { drawChamber } from "./drawChamber";

/**
 * Lienzo de la caja de Skinner. Lee el estado de la simulación en cada frame
 * (no a través de React) para una animación fluida. La rata se dibuja en estilo
 * vectorial 2.5D, animada según la conducta actual del motor.
 */
export function ChamberCanvas({ sim }: { sim: Simulation }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let phase = 0;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = window.devicePixelRatio || 1;
      const w = parent.clientWidth;
      const h = parent.clientHeight;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    const loop = () => {
      phase += 0.06;
      const dpr = window.devicePixelRatio || 1;
      drawChamber(ctx, canvas.width / dpr, canvas.height / dpr, sim.state, phase);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [sim]);

  return <canvas ref={canvasRef} className="chamber-canvas" />;
}
