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
    let prevX = sim.state.pos.x;
    let facing = -1; // -1 mira a la izquierda (hacia la barra), 1 a la derecha
    let blink = 0;

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
      // Orientación según el desplazamiento horizontal (con histéresis).
      const dx = sim.state.pos.x - prevX;
      if (dx > 0.0015) facing = 1;
      else if (dx < -0.0015) facing = -1;
      prevX = sim.state.pos.x;
      // Parpadeo ocasional.
      blink = blink > 0 ? blink - 1 : Math.random() < 0.004 ? 8 : 0;
      const dpr = window.devicePixelRatio || 1;
      drawChamber(ctx, canvas.width / dpr, canvas.height / dpr, sim.state, {
        phase,
        facing,
        blinking: blink > 0,
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
