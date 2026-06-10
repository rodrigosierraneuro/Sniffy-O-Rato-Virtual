import type { SimState, BehaviorTag } from "../engine/types";

/**
 * Dibuja la caja de Skinner y la rata en estilo vectorial 2.5D.
 * Todo el render es procedural (sin imágenes externas): rápido y nítido a
 * cualquier resolución. `phase` es un reloj de animación para el ciclo de
 * movimiento (patas, respiración, cola).
 */
export function drawChamber(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  state: SimState,
  phase: number,
): void {
  ctx.clearRect(0, 0, w, h);

  // Márgenes de la caja interior.
  const pad = Math.min(w, h) * 0.06;
  const box = { x: pad, y: pad, w: w - pad * 2, h: h - pad * 2 };

  drawRoom(ctx, w, h);
  drawCage(ctx, box);
  drawApparatus(ctx, box, state);

  // Posición de la rata dentro de la caja.
  const rx = box.x + state.pos.x * box.w;
  const floorY = box.y + box.h * 0.92;
  const ry = box.y + state.pos.y * box.h;
  drawRat(ctx, rx, Math.max(ry, floorY - 4), Math.min(w, h), state, phase);

  // Luz de la cámara encendida cuando hay CS (tono) — destello del panel.
  if (state.csOn) drawCueLight(ctx, box);
}

function drawRoom(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#1b2330");
  g.addColorStop(1, "#0d1117");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function drawCage(
  ctx: CanvasRenderingContext2D,
  box: { x: number; y: number; w: number; h: number },
): void {
  const depth = box.h * 0.16;

  // Pared trasera con perspectiva (2.5D).
  ctx.beginPath();
  ctx.moveTo(box.x, box.y);
  ctx.lineTo(box.x + box.w, box.y);
  ctx.lineTo(box.x + box.w - depth, box.y + depth);
  ctx.lineTo(box.x + depth, box.y + depth);
  ctx.closePath();
  ctx.fillStyle = "#cfd6dd";
  ctx.fill();

  // Suelo de rejilla con perspectiva.
  const floorTop = box.y + box.h * 0.82;
  const fg = ctx.createLinearGradient(0, floorTop, 0, box.y + box.h);
  fg.addColorStop(0, "#3a4350");
  fg.addColorStop(1, "#222a35");
  ctx.fillStyle = fg;
  ctx.fillRect(box.x, floorTop, box.w, box.y + box.h - floorTop);

  // Barras de la rejilla.
  ctx.strokeStyle = "rgba(180,190,200,0.5)";
  ctx.lineWidth = 2;
  const bars = 16;
  for (let i = 0; i <= bars; i++) {
    const x = box.x + (i / bars) * box.w;
    ctx.beginPath();
    ctx.moveTo(x, floorTop);
    ctx.lineTo(x, box.y + box.h);
    ctx.stroke();
  }

  // Paredes laterales claras.
  ctx.fillStyle = "rgba(207,214,221,0.85)";
  ctx.fillRect(box.x, box.y + depth, depth * 0.25, box.h - depth);
  ctx.fillRect(box.x + box.w - depth * 0.25, box.y + depth, depth * 0.25, box.h - depth);

  // Marco exterior de la caja.
  ctx.strokeStyle = "#8b97a3";
  ctx.lineWidth = 3;
  ctx.strokeRect(box.x, box.y, box.w, box.h);
}

function drawApparatus(
  ctx: CanvasRenderingContext2D,
  box: { x: number; y: number; w: number; h: number },
  state: SimState,
): void {
  // Barra/palanca a la izquierda.
  const barX = box.x + box.w * 0.18;
  const barY = box.y + box.h * 0.55;
  const pressed = state.behavior === "press_bar";
  ctx.save();
  ctx.translate(barX, barY);
  ctx.rotate(pressed ? 0.18 : 0);
  ctx.fillStyle = "#9aa6b2";
  ctx.strokeStyle = "#5c6670";
  ctx.lineWidth = 2;
  roundRect(ctx, -6, -6, 48, 12, 4);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Comedero (bandeja) bajo la barra.
  const cupX = box.x + box.w * 0.18;
  const cupY = box.y + box.h * 0.8;
  ctx.fillStyle = "#2b3240";
  roundRect(ctx, cupX - 18, cupY - 10, 40, 22, 5);
  ctx.fill();
  ctx.strokeStyle = "#5c6670";
  ctx.stroke();
  if (state.pelletAvailable) {
    ctx.fillStyle = "#e8c98b";
    ctx.beginPath();
    ctx.arc(cupX + 2, cupY + 2, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Altavoz (arriba a la derecha).
  const spX = box.x + box.w * 0.86;
  const spY = box.y + box.h * 0.14;
  ctx.fillStyle = "#3a4350";
  ctx.beginPath();
  ctx.arc(spX, spY, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1b2330";
  ctx.beginPath();
  ctx.arc(spX, spY, 5, 0, Math.PI * 2);
  ctx.fill();

  // Luz indicadora del comedero.
  const lightX = box.x + box.w * 0.18;
  const lightY = box.y + box.h * 0.42;
  ctx.beginPath();
  ctx.arc(lightX + 16, lightY, 5, 0, Math.PI * 2);
  ctx.fillStyle = state.pelletAvailable ? "#ffd866" : "#4a5360";
  ctx.fill();
}

function drawCueLight(
  ctx: CanvasRenderingContext2D,
  box: { x: number; y: number; w: number; h: number },
): void {
  const spX = box.x + box.w * 0.86;
  const spY = box.y + box.h * 0.14;
  const grd = ctx.createRadialGradient(spX, spY, 2, spX, spY, 40);
  grd.addColorStop(0, "rgba(120,200,255,0.55)");
  grd.addColorStop(1, "rgba(120,200,255,0)");
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.arc(spX, spY, 40, 0, Math.PI * 2);
  ctx.fill();
}

/** Dibuja a la rata. Postura y movimiento dependen de la conducta. */
function drawRat(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scaleRef: number,
  state: SimState,
  phase: number,
): void {
  const s = scaleRef * 0.0016; // escala global de la rata
  const tag = state.behavior;
  const upright = tag === "press_bar" || tag === "rear";
  const breathing = Math.sin(phase) * 1.5 * s * 10;
  const fear = state.mind.fear;

  ctx.save();
  ctx.translate(x, y);

  // Sombra en el suelo.
  ctx.save();
  ctx.scale(1, 0.35);
  ctx.beginPath();
  ctx.arc(0, 10 * s * 10, 26 * s * 10, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fill();
  ctx.restore();

  const bodyColor = "#d9d2cb";
  const shade = "#bfb7ae";

  if (upright) {
    drawRatUpright(ctx, s, phase, bodyColor, shade, tag);
  } else if (tag === "eat" || tag === "to_magazine") {
    drawRatCrouched(ctx, s, phase, bodyColor, shade, true);
  } else if (tag === "groom") {
    drawRatCrouched(ctx, s, phase, bodyColor, shade, false, true);
  } else if (tag === "freeze") {
    drawRatCrouched(ctx, s, phase * 0.2, bodyColor, shade, false, false, fear);
  } else {
    drawRatHorizontal(ctx, s, phase, bodyColor, shade, breathing);
  }

  ctx.restore();
}

function ellipse(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  fill: string,
): void {
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
}

function drawRatHorizontal(
  ctx: CanvasRenderingContext2D,
  s: number,
  phase: number,
  body: string,
  shade: string,
  breathing: number,
): void {
  const k = s * 10;
  // Cola sinuosa.
  ctx.strokeStyle = "#c8a9a0";
  ctx.lineWidth = 3 * s * 4;
  ctx.beginPath();
  ctx.moveTo(22 * k, -6 * k);
  ctx.quadraticCurveTo(
    40 * k,
    -10 * k + Math.sin(phase) * 4 * k,
    52 * k,
    -2 * k + Math.sin(phase * 1.2) * 6 * k,
  );
  ctx.stroke();

  // Patas (movimiento de marcha).
  const step = Math.sin(phase * 2) * 4 * k;
  ctx.strokeStyle = shade;
  ctx.lineWidth = 3 * s * 4;
  drawLeg(ctx, -8 * k, -2 * k, step);
  drawLeg(ctx, 10 * k, -2 * k, -step);

  // Cuerpo.
  ellipse(ctx, 4 * k, -10 * k - breathing, 22 * k, 12 * k, body);
  ellipse(ctx, -2 * k, -7 * k, 18 * k, 8 * k, shade);

  // Cabeza.
  ellipse(ctx, -20 * k, -12 * k, 9 * k, 8 * k, body);
  // Oreja.
  ellipse(ctx, -22 * k, -19 * k, 4 * k, 4 * k, "#e7b8b0");
  // Hocico.
  ellipse(ctx, -28 * k, -10 * k, 4 * k, 3 * k, body);
  // Ojo.
  ellipse(ctx, -23 * k, -13 * k, 1.4 * k, 1.4 * k, "#1a1a1a");
  // Nariz.
  ellipse(ctx, -31 * k, -9 * k, 1.4 * k, 1.4 * k, "#d98c9a");
}

function drawLeg(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  dx: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + dx, y + 14);
  ctx.stroke();
}

function drawRatUpright(
  ctx: CanvasRenderingContext2D,
  s: number,
  phase: number,
  body: string,
  shade: string,
  tag: BehaviorTag,
): void {
  const k = s * 10;
  const reach = tag === "press_bar" ? Math.sin(phase * 3) * 2 * k : 0;
  // Cola.
  ctx.strokeStyle = "#c8a9a0";
  ctx.lineWidth = 3 * s * 4;
  ctx.beginPath();
  ctx.moveTo(8 * k, 4 * k);
  ctx.quadraticCurveTo(24 * k, 8 * k, 30 * k, -4 * k);
  ctx.stroke();

  // Patas traseras apoyadas.
  ctx.strokeStyle = shade;
  ctx.lineWidth = 3 * s * 4;
  drawLeg(ctx, -4 * k, 2 * k, -2 * k);
  drawLeg(ctx, 6 * k, 2 * k, 2 * k);

  // Cuerpo erguido.
  ellipse(ctx, 0, -16 * k, 13 * k, 20 * k, body);
  ellipse(ctx, 0, -10 * k, 11 * k, 12 * k, shade);

  // Patas delanteras estiradas hacia la barra (izquierda).
  ctx.strokeStyle = shade;
  ctx.beginPath();
  ctx.moveTo(-6 * k, -26 * k);
  ctx.lineTo(-18 * k - reach, -30 * k);
  ctx.moveTo(-4 * k, -24 * k);
  ctx.lineTo(-16 * k - reach, -26 * k);
  ctx.stroke();

  // Cabeza arriba.
  ellipse(ctx, -8 * k, -36 * k, 9 * k, 8 * k, body);
  ellipse(ctx, -6 * k, -44 * k, 4 * k, 4 * k, "#e7b8b0");
  ellipse(ctx, -16 * k, -36 * k, 4 * k, 3 * k, body);
  ellipse(ctx, -11 * k, -38 * k, 1.4 * k, 1.4 * k, "#1a1a1a");
  ellipse(ctx, -19 * k, -35 * k, 1.4 * k, 1.4 * k, "#d98c9a");
}

function drawRatCrouched(
  ctx: CanvasRenderingContext2D,
  s: number,
  phase: number,
  body: string,
  shade: string,
  headDown = false,
  groom = false,
  fear = 0,
): void {
  const k = s * 10;
  const tremor = fear > 0 ? Math.sin(phase * 20) * fear * 1.5 * k : 0;
  ctx.save();
  ctx.translate(tremor, 0);

  // Cola.
  ctx.strokeStyle = "#c8a9a0";
  ctx.lineWidth = 3 * s * 4;
  ctx.beginPath();
  ctx.moveTo(20 * k, -6 * k);
  ctx.quadraticCurveTo(36 * k, -2 * k, 44 * k, -10 * k);
  ctx.stroke();

  // Cuerpo compacto.
  ellipse(ctx, 2 * k, -9 * k, 20 * k, 11 * k, body);
  ellipse(ctx, -2 * k, -6 * k, 16 * k, 8 * k, shade);

  // Cabeza.
  const hx = headDown ? -22 * k : -20 * k;
  const hy = headDown ? -4 * k : -12 * k;
  ellipse(ctx, hx, hy, 9 * k, 8 * k, body);
  ellipse(ctx, hx - 2 * k, hy - 7 * k, 4 * k, 4 * k, "#e7b8b0");
  ellipse(ctx, hx - 8 * k, hy + 2 * k, 4 * k, 3 * k, body);
  ellipse(ctx, hx - 3 * k, hy - 1 * k, 1.4 * k, 1.4 * k, "#1a1a1a");

  if (groom) {
    // Patas delanteras junto a la cara.
    ctx.strokeStyle = shade;
    ctx.beginPath();
    const g = Math.sin(phase * 6) * 2 * k;
    ctx.moveTo(hx - 6 * k, hy + 2 * k);
    ctx.lineTo(hx - 9 * k, hy - 4 * k + g);
    ctx.stroke();
  }
  ctx.restore();
}

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
