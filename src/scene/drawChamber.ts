import type { SimState, BehaviorTag } from "../engine/types";

export interface RatAnim {
  phase: number;
  facing: 1 | -1 | number;
  blinking: boolean;
}

/**
 * Dibuja la caja de Skinner y la rata en estilo vectorial 2.5D.
 * Render procedural (sin imágenes externas): rápido y nítido a cualquier
 * resolución. La rata se orienta según su movimiento y su postura depende de la
 * conducta actual del motor.
 */
export function drawChamber(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  state: SimState,
  anim: RatAnim,
): void {
  ctx.clearRect(0, 0, w, h);

  const pad = Math.min(w, h) * 0.06;
  const box = { x: pad, y: pad, w: w - pad * 2, h: h - pad * 2 };

  drawRoom(ctx, w, h);
  drawCage(ctx, box);
  drawApparatus(ctx, box, state);

  const rx = box.x + state.pos.x * box.w;
  const floorY = box.y + box.h * 0.92;
  const ry = box.y + state.pos.y * box.h;
  drawRat(ctx, rx, Math.max(ry, floorY - 4), Math.min(w, h), state, anim);

  if (state.csOn) drawCueLight(ctx, box);
  drawVignette(ctx, w, h);
}

function drawRoom(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#1b2330");
  g.addColorStop(1, "#0a0e14");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function drawVignette(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const g = ctx.createRadialGradient(
    w / 2,
    h / 2,
    Math.min(w, h) * 0.3,
    w / 2,
    h / 2,
    Math.max(w, h) * 0.7,
  );
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,0.45)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function drawCage(
  ctx: CanvasRenderingContext2D,
  box: { x: number; y: number; w: number; h: number },
): void {
  const depth = box.h * 0.16;

  // Pared trasera con perspectiva e iluminación ambiental.
  ctx.beginPath();
  ctx.moveTo(box.x, box.y);
  ctx.lineTo(box.x + box.w, box.y);
  ctx.lineTo(box.x + box.w - depth, box.y + depth);
  ctx.lineTo(box.x + depth, box.y + depth);
  ctx.closePath();
  const back = ctx.createLinearGradient(0, box.y, 0, box.y + depth);
  back.addColorStop(0, "#e3e8ee");
  back.addColorStop(1, "#c2cad2");
  ctx.fillStyle = back;
  ctx.fill();

  // Paredes laterales en perspectiva.
  ctx.beginPath();
  ctx.moveTo(box.x, box.y);
  ctx.lineTo(box.x + depth, box.y + depth);
  ctx.lineTo(box.x + depth, box.y + box.h);
  ctx.lineTo(box.x, box.y + box.h);
  ctx.closePath();
  ctx.fillStyle = "#aab4bf";
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(box.x + box.w, box.y);
  ctx.lineTo(box.x + box.w - depth, box.y + depth);
  ctx.lineTo(box.x + box.w - depth, box.y + box.h);
  ctx.lineTo(box.x + box.w, box.y + box.h);
  ctx.closePath();
  ctx.fillStyle = "#9fa9b4";
  ctx.fill();

  // Suelo claro de fondo (entre pared trasera y rejilla).
  const wallBottom = box.y + box.h * 0.82;
  ctx.fillStyle = "#cfd6dd";
  ctx.fillRect(box.x + depth, box.y + depth, box.w - depth * 2, wallBottom - (box.y + depth));

  // Foco cenital sobre el suelo.
  const spot = ctx.createRadialGradient(
    box.x + box.w * 0.45,
    box.y + box.h * 0.5,
    10,
    box.x + box.w * 0.45,
    box.y + box.h * 0.6,
    box.w * 0.6,
  );
  spot.addColorStop(0, "rgba(255,255,240,0.25)");
  spot.addColorStop(1, "rgba(255,255,240,0)");
  ctx.fillStyle = spot;
  ctx.fillRect(box.x, box.y, box.w, box.h);

  // Suelo de rejilla con perspectiva y degradado.
  const floorTop = wallBottom;
  const fg = ctx.createLinearGradient(0, floorTop, 0, box.y + box.h);
  fg.addColorStop(0, "#404a58");
  fg.addColorStop(1, "#1d242e");
  ctx.fillStyle = fg;
  ctx.fillRect(box.x, floorTop, box.w, box.y + box.h - floorTop);

  // Barras de la rejilla, separación creciente hacia el frente (perspectiva).
  ctx.strokeStyle = "rgba(190,200,210,0.55)";
  ctx.lineWidth = 1.5;
  const bars = 18;
  for (let i = 0; i <= bars; i++) {
    const t = i / bars;
    const x = box.x + t * box.w;
    ctx.beginPath();
    ctx.moveTo(x, floorTop);
    ctx.lineTo(x, box.y + box.h);
    ctx.stroke();
  }
  // Reflejo metálico horizontal.
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(box.x, floorTop + (box.y + box.h - floorTop) * 0.35);
  ctx.lineTo(box.x + box.w, floorTop + (box.y + box.h - floorTop) * 0.35);
  ctx.stroke();

  // Marco exterior.
  ctx.strokeStyle = "#7f8b97";
  ctx.lineWidth = 3;
  strokeRoundRect(ctx, box.x, box.y, box.w, box.h, 6);
}

function drawApparatus(
  ctx: CanvasRenderingContext2D,
  box: { x: number; y: number; w: number; h: number },
  state: SimState,
): void {
  const barX = box.x + box.w * 0.18;
  const barY = box.y + box.h * 0.55;
  const pressed = state.behavior === "press_bar";

  // Soporte de la palanca.
  ctx.fillStyle = "#5c6670";
  roundRect(ctx, barX - 10, barY - 4, 10, 26, 3);
  ctx.fill();

  // Palanca con degradado metálico.
  ctx.save();
  ctx.translate(barX, barY);
  ctx.rotate(pressed ? 0.2 : 0);
  const lever = ctx.createLinearGradient(0, -6, 0, 6);
  lever.addColorStop(0, "#c4ccd4");
  lever.addColorStop(1, "#828d99");
  ctx.fillStyle = lever;
  ctx.strokeStyle = "#4a535d";
  ctx.lineWidth = 1.5;
  roundRect(ctx, -4, -6, 50, 12, 5);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Comedero.
  const cupX = box.x + box.w * 0.18;
  const cupY = box.y + box.h * 0.8;
  const cup = ctx.createLinearGradient(0, cupY - 10, 0, cupY + 12);
  cup.addColorStop(0, "#3a4350");
  cup.addColorStop(1, "#1b212b");
  ctx.fillStyle = cup;
  roundRect(ctx, cupX - 20, cupY - 10, 44, 24, 6);
  ctx.fill();
  ctx.strokeStyle = "#5c6670";
  ctx.lineWidth = 2;
  ctx.stroke();
  if (state.pelletAvailable) {
    const p = ctx.createRadialGradient(cupX, cupY + 1, 1, cupX + 2, cupY + 3, 6);
    p.addColorStop(0, "#f5e2b0");
    p.addColorStop(1, "#c79a52");
    ctx.fillStyle = p;
    ctx.beginPath();
    ctx.arc(cupX + 2, cupY + 2, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Altavoz (arriba a la derecha).
  const spX = box.x + box.w * 0.86;
  const spY = box.y + box.h * 0.14;
  ctx.fillStyle = "#3a4350";
  ctx.beginPath();
  ctx.arc(spX, spY, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#11161d";
  ctx.beginPath();
  ctx.arc(spX, spY, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#5c6670";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(spX, spY, 13, 0, Math.PI * 2);
  ctx.stroke();

  // Luz indicadora del comedero (se enciende con pellet disponible).
  const lightX = box.x + box.w * 0.18 + 18;
  const lightY = box.y + box.h * 0.42;
  if (state.pelletAvailable) {
    const glow = ctx.createRadialGradient(lightX, lightY, 1, lightX, lightY, 16);
    glow.addColorStop(0, "rgba(255,216,102,0.7)");
    glow.addColorStop(1, "rgba(255,216,102,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(lightX, lightY, 16, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(lightX, lightY, 5, 0, Math.PI * 2);
  ctx.fillStyle = state.pelletAvailable ? "#ffd866" : "#454e5b";
  ctx.fill();
}

function drawCueLight(
  ctx: CanvasRenderingContext2D,
  box: { x: number; y: number; w: number; h: number },
): void {
  const spX = box.x + box.w * 0.86;
  const spY = box.y + box.h * 0.14;
  const grd = ctx.createRadialGradient(spX, spY, 2, spX, spY, 46);
  grd.addColorStop(0, "rgba(130,205,255,0.6)");
  grd.addColorStop(1, "rgba(130,205,255,0)");
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.arc(spX, spY, 46, 0, Math.PI * 2);
  ctx.fill();
}

/* ----------------------------- LA RATA ----------------------------- */

function drawRat(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scaleRef: number,
  state: SimState,
  anim: RatAnim,
): void {
  const k = scaleRef * 0.016; // unidad de escala de la rata
  const tag = state.behavior;
  const upright = tag === "press_bar" || tag === "rear";
  const fear = state.mind.fear;

  ctx.save();
  ctx.translate(x, y);

  // Sombra proyectada en el suelo.
  ctx.save();
  ctx.scale(1, 0.32);
  const sh = ctx.createRadialGradient(0, 10 * k, 2, 0, 10 * k, 30 * k);
  sh.addColorStop(0, "rgba(0,0,0,0.45)");
  sh.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = sh;
  ctx.beginPath();
  ctx.arc(0, 10 * k, 30 * k, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Orientación: por defecto la rata mira a -x; si va a la derecha, se voltea.
  const facing = anim.facing >= 0 ? 1 : -1;
  if (facing > 0) ctx.scale(-1, 1);

  if (upright) drawRatUpright(ctx, k, anim, tag);
  else if (tag === "eat" || tag === "to_magazine")
    drawRatCrouched(ctx, k, anim, true);
  else if (tag === "groom") drawRatCrouched(ctx, k, anim, false, true);
  else if (tag === "freeze") drawRatCrouched(ctx, k, anim, false, false, fear);
  else drawRatHorizontal(ctx, k, anim);

  ctx.restore();
}

function furGradient(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
): CanvasGradient {
  const g = ctx.createRadialGradient(cx - r * 0.4, cy - r * 0.5, r * 0.2, cx, cy, r);
  g.addColorStop(0, "#efeae4");
  g.addColorStop(0.6, "#dcd5cc");
  g.addColorStop(1, "#bdb4a9");
  return g;
}

function ellipse(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  fill: string | CanvasGradient,
): void {
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
}

function drawHead(
  ctx: CanvasRenderingContext2D,
  k: number,
  hx: number,
  hy: number,
  blinking: boolean,
): void {
  // Oreja.
  ellipse(ctx, hx + 2 * k, hy - 7 * k, 4 * k, 4 * k, "#e7b8b0");
  ellipse(ctx, hx + 2 * k, hy - 7 * k, 2 * k, 2 * k, "#d49aa0");
  // Cabeza.
  ellipse(ctx, hx, hy, 9 * k, 8 * k, furGradient(ctx, hx, hy, 9 * k));
  // Hocico.
  ellipse(ctx, hx - 8 * k, hy + 1 * k, 4.5 * k, 3.2 * k, "#e9e3dc");
  // Ojo (o párpado al parpadear).
  if (blinking) {
    ctx.strokeStyle = "#3a2f2a";
    ctx.lineWidth = 1.2 * k;
    ctx.beginPath();
    ctx.moveTo(hx - 4 * k, hy - 1 * k);
    ctx.lineTo(hx - 1 * k, hy - 1 * k);
    ctx.stroke();
  } else {
    ellipse(ctx, hx - 2.5 * k, hy - 1 * k, 1.6 * k, 1.8 * k, "#1a1416");
    ellipse(ctx, hx - 3 * k, hy - 1.6 * k, 0.5 * k, 0.5 * k, "#ffffff");
  }
  // Nariz.
  ellipse(ctx, hx - 11 * k, hy + 2 * k, 1.6 * k, 1.4 * k, "#d98c9a");
  // Bigotes.
  ctx.strokeStyle = "rgba(120,110,105,0.7)";
  ctx.lineWidth = 0.6 * k;
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(hx - 10 * k, hy + 2 * k);
    ctx.lineTo(hx - 20 * k, hy + 2 * k + i * 3 * k);
    ctx.stroke();
  }
}

function tail(
  ctx: CanvasRenderingContext2D,
  k: number,
  x0: number,
  y0: number,
  cx: number,
  cy: number,
  x1: number,
  y1: number,
): void {
  ctx.strokeStyle = "#cda9a0";
  ctx.lineWidth = 2.6 * k;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.quadraticCurveTo(cx, cy, x1, y1);
  ctx.stroke();
}

function leg(ctx: CanvasRenderingContext2D, k: number, x: number, y: number, dx: number): void {
  ctx.strokeStyle = "#c2b9ae";
  ctx.lineWidth = 2.6 * k;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + dx, y + 14 * k);
  ctx.stroke();
}

function drawRatHorizontal(ctx: CanvasRenderingContext2D, k: number, anim: RatAnim): void {
  const { phase } = anim;
  const breathing = Math.sin(phase) * 0.8 * k;
  tail(ctx, k, 22 * k, -6 * k, 40 * k, -10 * k + Math.sin(phase) * 4 * k, 54 * k, -2 * k + Math.sin(phase * 1.2) * 6 * k);
  const step = Math.sin(phase * 2) * 4 * k;
  leg(ctx, k, -8 * k, -2 * k, step);
  leg(ctx, k, 10 * k, -2 * k, -step);
  // Cuerpo.
  ellipse(ctx, 4 * k, -10 * k - breathing, 22 * k, 12 * k, furGradient(ctx, 4 * k, -10 * k, 22 * k));
  drawHead(ctx, k, -22 * k, -12 * k, anim.blinking);
}

function drawRatUpright(
  ctx: CanvasRenderingContext2D,
  k: number,
  anim: RatAnim,
  tag: BehaviorTag,
): void {
  const { phase } = anim;
  const reach = tag === "press_bar" ? Math.sin(phase * 3) * 2 * k : 0;
  tail(ctx, k, 8 * k, 4 * k, 24 * k, 8 * k, 30 * k, -4 * k);
  leg(ctx, k, -4 * k, 2 * k, -2 * k);
  leg(ctx, k, 6 * k, 2 * k, 2 * k);
  // Cuerpo erguido.
  ellipse(ctx, 0, -16 * k, 13 * k, 20 * k, furGradient(ctx, 0, -16 * k, 20 * k));
  // Patas delanteras estiradas hacia la barra.
  ctx.strokeStyle = "#c2b9ae";
  ctx.lineWidth = 2.4 * k;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-6 * k, -26 * k);
  ctx.lineTo(-18 * k - reach, -30 * k);
  ctx.moveTo(-4 * k, -24 * k);
  ctx.lineTo(-16 * k - reach, -26 * k);
  ctx.stroke();
  drawHead(ctx, k, -8 * k, -36 * k, anim.blinking);
}

function drawRatCrouched(
  ctx: CanvasRenderingContext2D,
  k: number,
  anim: RatAnim,
  headDown = false,
  groom = false,
  fear = 0,
): void {
  const { phase } = anim;
  const tremor = fear > 0 ? Math.sin(phase * 20) * fear * 1.5 * k : 0;
  ctx.save();
  ctx.translate(tremor, 0);
  tail(ctx, k, 20 * k, -6 * k, 36 * k, -2 * k, 44 * k, -10 * k);
  ellipse(ctx, 2 * k, -9 * k, 20 * k, 11 * k, furGradient(ctx, 2 * k, -9 * k, 20 * k));
  const hx = headDown ? -22 * k : -20 * k;
  const hy = headDown ? -4 * k : -10 * k;
  drawHead(ctx, k, hx, hy, anim.blinking);
  if (groom) {
    ctx.strokeStyle = "#c2b9ae";
    ctx.lineWidth = 2.2 * k;
    ctx.lineCap = "round";
    const g = Math.sin(phase * 6) * 2 * k;
    ctx.beginPath();
    ctx.moveTo(hx - 6 * k, hy + 2 * k);
    ctx.lineTo(hx - 9 * k, hy - 4 * k + g);
    ctx.stroke();
  }
  ctx.restore();
}

/* ----------------------------- utilidades ----------------------------- */

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function strokeRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  roundRect(ctx, x, y, w, h, r);
  ctx.stroke();
}
