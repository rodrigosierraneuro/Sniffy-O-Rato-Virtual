import { useEffect, useRef } from "react";
import type { Simulation } from "../engine/simulation";
import { drawChamber } from "./drawChamber";
import { RatAnimator } from "./ratAnimator";

/**
 * Lienzo de la caja de Skinner. Lee el estado de la simulación en cada frame y
 * lo pasa por un RatAnimator que produce movimiento continuo y suave (locomoción
 * real + transiciones de conducta), en vez de cambiar de postura cada tick.
 */
export function ChamberCanvas({ sim }: { sim: Simulation }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let last = performance.now();
    const animator = new RatAnimator();

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

    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      animator.update(sim, dt);
      const dpr = window.devicePixelRatio || 1;
      drawChamber(ctx, canvas.width / dpr, canvas.height / dpr, sim.state, {
        params: animator.params(),
        pos: animator.pos(),
      });
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
