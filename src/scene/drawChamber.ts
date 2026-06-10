import type { SimState } from "../engine/types";
import { drawRat as drawRatArt, type RatParams } from "./rat";

/** Salida del animador: parámetros de postura + posición visible de la rata. */
export interface RatAnim {
  params: RatParams;
  pos: { x: number; y: number };
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Geometría en perspectiva de la caja (se mira hacia dentro). */
interface Persp {
  fx0: number; fx1: number; fy0: number; fy1: number; // frente (cerca)
  bx0: number; bx1: number; by0: number; by1: number; // fondo (lejos)
}

/**
 * Dibuja la caja de Skinner como en el Sniffy original: la cámara mira hacia
 * dentro de la caja, con el aparato en la pared del fondo, el piso de rejilla
 * en fuga y la rata albina sobre el piso, vista desde atrás.
 */
export function drawChamber(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  state: SimState,
  anim: RatAnim,
): void {
  ctx.clearRect(0, 0, w, h);
  drawRoom(ctx, w, h);

  const pad = Math.min(w, h) * 0.05;
  const box: Box = { x: pad, y: pad, w: w - pad * 2, h: h - pad * 2 };
  const p = makePersp(box);

  drawCage(ctx, p);
  drawApparatus(ctx, p, state, anim.params.upright);

  // --- Rata sobre el piso (posición visible del animador), escalada por profundidad ---
  const depth = clamp((anim.pos.y - 0.45) / 0.5, 0, 1); // 0 fondo, 1 cerca
  const floorL = lerp(p.bx0, p.fx0, depth);
  const floorR = lerp(p.bx1, p.fx1, depth);
  const ratX = lerp(floorL, floorR, anim.pos.x);
  const ratY = lerp(p.by1, p.fy1, depth);
  const k = Math.min(w, h) * 0.006 * lerp(0.62, 1.15, depth);
  drawRatShadow(ctx, ratX, ratY, k);
  ctx.save();
  ctx.translate(ratX, ratY);
  drawRatArt(ctx, k, anim.params);
  ctx.restore();

  if (state.csOn) drawCueGlow(ctx, p);
  drawVignette(ctx, w, h);
}

function makePersp(b: Box): Persp {
  return {
    fx0: b.x, fx1: b.x + b.w, fy0: b.y, fy1: b.y + b.h,
    bx0: b.x + b.w * 0.2, bx1: b.x + b.w * 0.8,
    by0: b.y + b.h * 0.1, by1: b.y + b.h * 0.52,
  };
}

function drawRoom(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.fillStyle = "#0a0e14";
  ctx.fillRect(0, 0, w, h);
}

function quad(
  ctx: CanvasRenderingContext2D,
  pts: [number, number][],
  fill: string | CanvasGradient,
): void {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

function drawCage(ctx: CanvasRenderingContext2D, p: Persp): void {
  // Techo.
  quad(ctx, [[p.fx0, p.fy0], [p.fx1, p.fy0], [p.bx1, p.by0], [p.bx0, p.by0]], "#aeb8c2");
  // Pared izquierda.
  quad(ctx, [[p.fx0, p.fy0], [p.bx0, p.by0], [p.bx0, p.by1], [p.fx0, p.fy1]], "#9aa6b2");
  // Pared derecha.
  quad(ctx, [[p.fx1, p.fy0], [p.bx1, p.by0], [p.bx1, p.by1], [p.fx1, p.fy1]], "#8a96a3");
  // Pared del fondo con leve degradado.
  const back = ctx.createLinearGradient(0, p.by0, 0, p.by1);
  back.addColorStop(0, "#c2ccd6");
  back.addColorStop(1, "#aab4c0");
  quad(ctx, [[p.bx0, p.by0], [p.bx1, p.by0], [p.bx1, p.by1], [p.bx0, p.by1]], back);

  // Piso (rejilla) en fuga.
  const floor = ctx.createLinearGradient(0, p.by1, 0, p.fy1);
  floor.addColorStop(0, "#7f8896");
  floor.addColorStop(1, "#aeb6c0");
  quad(ctx, [[p.bx0, p.by1], [p.bx1, p.by1], [p.fx1, p.fy1], [p.fx0, p.fy1]], floor);

  // Barras horizontales de la rejilla (separación creciente hacia el frente).
  ctx.strokeStyle = "rgba(60,68,80,0.55)";
  const rows = 16;
  for (let i = 1; i <= rows; i++) {
    const t = Math.pow(i / rows, 1.7); // perspectiva: juntas atrás, separadas adelante
    const yy = lerp(p.by1, p.fy1, t);
    const xl = lerp(p.bx0, p.fx0, t);
    const xr = lerp(p.bx1, p.fx1, t);
    ctx.lineWidth = lerp(1, 3, t);
    ctx.beginPath();
    ctx.moveTo(xl, yy);
    ctx.lineTo(xr, yy);
    ctx.stroke();
    // brillo metálico sobre cada barra
    ctx.strokeStyle = "rgba(230,238,246,0.25)";
    ctx.lineWidth = lerp(0.5, 1.4, t);
    ctx.beginPath();
    ctx.moveTo(xl, yy - lerp(0.6, 1.6, t));
    ctx.lineTo(xr, yy - lerp(0.6, 1.6, t));
    ctx.stroke();
    ctx.strokeStyle = "rgba(60,68,80,0.55)";
  }

  // Bordes de la caja.
  ctx.strokeStyle = "rgba(40,46,56,0.7)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(p.bx0, p.by1); ctx.lineTo(p.fx0, p.fy1);
  ctx.moveTo(p.bx1, p.by1); ctx.lineTo(p.fx1, p.fy1);
  ctx.stroke();
}

function drawApparatus(ctx: CanvasRenderingContext2D, p: Persp, state: SimState, upright: number): void {
  const bw = p.bx1 - p.bx0;
  const bh = p.by1 - p.by0;
  const cx = (x: number) => p.bx0 + bw * x;
  const cy = (y: number) => p.by0 + bh * y;

  // Altavoz (mesh) arriba a la derecha.
  drawSpeaker(ctx, cx(0.82), cy(0.18), bw * 0.1);

  // Luz indicadora (domo) arriba al centro.
  drawDomeLight(ctx, cx(0.5), cy(0.16), bw * 0.04, state.csOn);

  // Palanca (barra) latón, a la izquierda-centro.
  drawLever(ctx, cx(0.34), cy(0.58), bw * 0.12, upright > 0.5);

  // Comedero / magazine, centro.
  drawMagazine(ctx, cx(0.56), cy(0.66), bw * 0.13, state.pelletAvailable);

  // Ranura del dispensador sobre el comedero.
  ctx.fillStyle = "#3a4350";
  const sl = bw * 0.12;
  roundRect(ctx, cx(0.56) - sl / 2, cy(0.44), sl, bh * 0.05, 3);
  ctx.fill();
}

function drawSpeaker(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.save();
  ctx.fillStyle = "#6b6256";
  roundRect(ctx, x - r, y - r, r * 2, r * 2, r * 0.25);
  ctx.fill();
  ctx.strokeStyle = "#4a4338";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // malla de puntos
  ctx.fillStyle = "rgba(30,28,24,0.6)";
  const n = 5;
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      ctx.beginPath();
      ctx.arc(x - r * 0.7 + (i / (n - 1)) * r * 1.4, y - r * 0.7 + (j / (n - 1)) * r * 1.4, r * 0.09, 0, Math.PI * 2);
      ctx.fill();
    }
  ctx.restore();
}

function drawDomeLight(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  on: boolean,
): void {
  const g = ctx.createRadialGradient(x - r * 0.4, y - r * 0.4, r * 0.2, x, y, r);
  if (on) {
    g.addColorStop(0, "#d8ffe0");
    g.addColorStop(1, "#2f9d57");
  } else {
    g.addColorStop(0, "#3f7a55");
    g.addColorStop(1, "#1d4630");
  }
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#10331f";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  if (on) {
    const glow = ctx.createRadialGradient(x, y, r * 0.5, x, y, r * 3);
    glow.addColorStop(0, "rgba(120,255,160,0.35)");
    glow.addColorStop(1, "rgba(120,255,160,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, r * 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function brass(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number): CanvasGradient {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, "#d9b65a");
  g.addColorStop(0.5, "#b8923a");
  g.addColorStop(1, "#8c6e29");
  return g;
}

function drawLever(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  pressed: boolean,
): void {
  // Placa de montaje.
  ctx.fillStyle = brass(ctx, x - w * 0.4, y - w * 0.5, x + w * 0.4, y + w * 0.5);
  roundRect(ctx, x - w * 0.38, y - w * 0.5, w * 0.5, w, 3);
  ctx.fill();
  ctx.strokeStyle = "#6e561f";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // Barra que sobresale hacia el espectador.
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(pressed ? 0.16 : 0);
  ctx.fillStyle = brass(ctx, 0, -w * 0.15, w, w * 0.15);
  roundRect(ctx, 0, -w * 0.13, w * 0.95, w * 0.26, w * 0.13);
  ctx.fill();
  ctx.strokeStyle = "#6e561f";
  ctx.stroke();
  ctx.restore();
}

function drawMagazine(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  pellet: boolean,
): void {
  // Caja del comedero.
  ctx.fillStyle = brass(ctx, x - w / 2, y - w * 0.4, x + w / 2, y + w * 0.4);
  roundRect(ctx, x - w / 2, y - w * 0.4, w, w * 0.8, 4);
  ctx.fill();
  ctx.strokeStyle = "#6e561f";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // Hueco oscuro central.
  ctx.fillStyle = "#241c12";
  ctx.beginPath();
  ctx.ellipse(x, y + w * 0.06, w * 0.26, w * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
  if (pellet) {
    const g = ctx.createRadialGradient(x, y + w * 0.04, 1, x, y + w * 0.06, w * 0.14);
    g.addColorStop(0, "#f5e2b0");
    g.addColorStop(1, "#c79a52");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y + w * 0.06, w * 0.12, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawRatShadow(ctx: CanvasRenderingContext2D, x: number, y: number, k: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, 0.4);
  const g = ctx.createRadialGradient(0, 6 * k, 2, 0, 6 * k, 22 * k);
  g.addColorStop(0, "rgba(0,0,0,0.4)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 6 * k, 22 * k, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawCueGlow(ctx: CanvasRenderingContext2D, p: Persp): void {
  const x = lerp(p.bx0, p.bx1, 0.5);
  const y = lerp(p.by0, p.by1, 0.16);
  const g = ctx.createRadialGradient(x, y, 4, x, y, (p.bx1 - p.bx0) * 0.4);
  g.addColorStop(0, "rgba(120,255,160,0.25)");
  g.addColorStop(1, "rgba(120,255,160,0)");
  ctx.fillStyle = g;
  ctx.fillRect(p.bx0, p.by0, p.bx1 - p.bx0, (p.by1 - p.by0) * 0.6);
}

function drawVignette(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.72);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,0.4)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/* utilidades */
function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
