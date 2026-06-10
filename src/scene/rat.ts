/**
 * Dibujo de la rata albina vista en 3/4 desde atrás, como en el Sniffy original:
 * se mira hacia dentro de la caja y se ve a la rata sobre el piso, con el cuerpo
 * alargado, la cabeza pequeña extendida hacia el aparato del fondo y la cola
 * rosada arrastrando hacia el espectador.
 *
 * Render procedural con curvas Bézier y sombreado por capas. Coordenadas en `k`;
 * origen (0,0) en los cuartos traseros (lo más cercano al espectador); -y es
 * "hacia el fondo" (donde está la cabeza).
 */

export interface RatPose {
  /** "stand" en cuatro patas, "rear" erguida hacia la barra,
   *  "crouch" agachada (comer/acicalar/congelar). */
  kind: "stand" | "rear" | "crouch";
  phase: number;
  blinking: boolean;
  fear?: number;
  headDown?: boolean;
  grooming?: boolean;
  /** Lado al que se arrastra la cola (-1 izquierda, 1 derecha). */
  tailSide?: number;
}

const FUR_HI = "#ffffff";
const FUR_LIGHT = "#f4f2ef";
const FUR_MID = "#e4ded7";
const FUR_EDGE = "#c6bfb4";
const SKIN = "#e9b9b0";
const SKIN_DARK = "#d19991";
const TAIL = "#e3bdb4";
const TAIL_DARK = "#c79890";
const EAR = "#e7b3ab";
const EAR_IN = "#cf8f88";

export function drawRat(
  ctx: CanvasRenderingContext2D,
  k: number,
  pose: RatPose,
): void {
  const tremor = pose.fear ? Math.sin(pose.phase * 22) * pose.fear * 1.3 * k : 0;
  ctx.save();
  ctx.translate(tremor, 0);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  if (pose.kind === "rear") drawRearing(ctx, k, pose);
  else drawQuadruped(ctx, k, pose);
  ctx.restore();
}

/* ============================ Cuadrúpedo (3/4) ============================ */

function drawQuadruped(
  ctx: CanvasRenderingContext2D,
  k: number,
  pose: RatPose,
): void {
  const crouch = pose.kind === "crouch";
  const len = crouch ? 42 : 48;
  // La cabeza se extiende hacia el fondo; algo más baja al comer.
  const headDip = pose.headDown ? 3 : 0;
  const breathe = crouch ? 0 : Math.sin(pose.phase) * 0.5;
  const tailSide = pose.tailSide ?? -1;
  const sway = Math.sin(pose.phase * 1.3) * 2;
  const stepA = crouch ? 0 : Math.sin(pose.phase * 2) * 2;
  const stepB = crouch ? 0 : Math.sin(pose.phase * 2 + Math.PI) * 2;
  // Giro 3/4: el cuerpo se ladea ligeramente y la cabeza se desplaza.
  const yaw = 0.06;
  const headX = 2.4;

  ctx.save();
  ctx.rotate(yaw);

  // --- Cola (detrás) ---
  drawTail(ctx, k, tailSide, sway);

  // --- Cuerpo + cabeza ---
  ctx.save();
  ctx.translate(0, -breathe * k);
  traceQuadBody(ctx, k, len, headX, headDip);

  // Volumen: luz direccional arriba-izquierda.
  const g = ctx.createRadialGradient(-5 * k, -(len * 0.5) * k, 2 * k, -2 * k, -(len * 0.28) * k, len * k);
  g.addColorStop(0, FUR_HI);
  g.addColorStop(0.4, FUR_LIGHT);
  g.addColorStop(0.78, FUR_MID);
  g.addColorStop(1, FUR_EDGE);
  ctx.fillStyle = g;
  ctx.fill();

  ctx.save();
  ctx.clip();
  shadeQuadBody(ctx, k, len);
  furTexture(ctx, k, len, 12);
  ctx.restore();

  ctx.lineWidth = 0.7 * k;
  ctx.strokeStyle = "rgba(140,130,116,0.3)";
  ctx.stroke();
  ctx.restore();

  // --- Pies traseros rosados a los lados del rump ---
  drawHindFoot(ctx, k, -11.5 + stepA, 4, -1);
  drawHindFoot(ctx, k, 11.5 + stepB, 4, 1);

  // --- Cabeza pequeña, orejas y carita ---
  drawQuadHead(ctx, k, len, headX, headDip, pose);

  // --- Acicalarse: patitas hacia la cara ---
  if (pose.grooming) {
    const hy = -(len + 1) * k;
    ctx.strokeStyle = SKIN;
    ctx.lineWidth = 2 * k;
    const gp = Math.sin(pose.phase * 6) * 1.3 * k;
    ctx.beginPath();
    ctx.moveTo((headX - 2) * k, hy + 9 * k);
    ctx.quadraticCurveTo((headX - 1) * k, hy + 4 * k, headX * k, hy + 2 * k + gp);
    ctx.moveTo((headX + 2) * k, hy + 9 * k);
    ctx.quadraticCurveTo((headX + 1) * k, hy + 4 * k, headX * k, hy + 2 * k + gp);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Silueta alargada del cuadrúpedo: cuartos traseros anchos (cerca), lomo
 * arqueado que se afina hacia los hombros y una cabeza pequeña que se proyecta
 * hacia el fondo. Asimétrica (más llena en el flanco izquierdo) para el 3/4.
 */
function traceQuadBody(
  ctx: CanvasRenderingContext2D,
  k: number,
  len: number,
  headX: number,
  headDip: number,
): void {
  const rumpHalf = 13;
  const shoulderHalf = 8.5;
  const headHalf = 5;
  const neckY = -(len * 0.74);
  const tipY = -(len - 1 + headDip * 0.3); // coronilla redondeada (sin punta)
  const hx = headX;
  ctx.beginPath();
  ctx.moveTo(0, 6 * k);
  // Flanco izquierdo (cercano, más lleno)
  ctx.bezierCurveTo(-(rumpHalf + 1.5) * k, 5 * k, -(rumpHalf + 2) * k, -4 * k, -rumpHalf * k, -12 * k);
  ctx.bezierCurveTo(-(rumpHalf - 0.5) * k, -(len * 0.42) * k, -(shoulderHalf + 1.5) * k, -(len * 0.62) * k, -shoulderHalf * k, neckY * k);
  // Cuello -> cabeza redondeada (domo), sin hocico puntiagudo
  ctx.bezierCurveTo(-(headHalf + 1.5) * k + hx * k, (neckY - 2) * k, -(headHalf + 1) * k + hx * k, (tipY + 2.5) * k, hx * k, tipY * k);
  ctx.bezierCurveTo((headHalf + 1) * k + hx * k, (tipY + 2.5) * k, (headHalf + 1.5) * k + hx * k, (neckY - 2) * k, shoulderHalf * k, neckY * k);
  // Flanco derecho (lejano, más recto)
  ctx.bezierCurveTo((shoulderHalf + 1) * k, -(len * 0.62) * k, (rumpHalf - 0.5) * k, -(len * 0.42) * k, rumpHalf * k, -12 * k);
  ctx.bezierCurveTo((rumpHalf + 1.5) * k, -4 * k, (rumpHalf + 1) * k, 5 * k, 0, 6 * k);
  ctx.closePath();
}

function shadeQuadBody(ctx: CanvasRenderingContext2D, k: number, len: number): void {
  const shade = "rgba(150,142,128,";
  // Flanco derecho (lado en sombra).
  const rs = ctx.createLinearGradient(13 * k, 0, 1 * k, 0);
  rs.addColorStop(0, shade + "0.5)");
  rs.addColorStop(1, shade + "0)");
  ctx.fillStyle = rs;
  ctx.fillRect(1 * k, -len * k, 16 * k, (len + 8) * k);
  // Flanco izquierdo (más tenue).
  const ls = ctx.createLinearGradient(-14 * k, 0, -2 * k, 0);
  ls.addColorStop(0, shade + "0.24)");
  ls.addColorStop(1, shade + "0)");
  ctx.fillStyle = ls;
  ctx.fillRect(-17 * k, -len * k, 15 * k, (len + 8) * k);
  // Sombra de los muslos (insinúa los dos cuartos traseros).
  for (const sx of [-1, 1]) {
    const hg = ctx.createRadialGradient(sx * 7 * k, -2 * k, 2 * k, sx * 7 * k, -2 * k, 8 * k);
    hg.addColorStop(0, shade + "0)");
    hg.addColorStop(0.82, shade + "0)");
    hg.addColorStop(1, shade + "0.1)");
    ctx.fillStyle = hg;
    ctx.beginPath();
    ctx.arc(sx * 7 * k, -2 * k, 8 * k, 0, Math.PI * 2);
    ctx.fill();
  }
  // Surco de la columna.
  const spine = ctx.createLinearGradient(-3 * k + 2 * k, 0, 3 * k + 2 * k, 0);
  spine.addColorStop(0, shade + "0)");
  spine.addColorStop(0.5, shade + "0.12)");
  spine.addColorStop(1, shade + "0)");
  ctx.fillStyle = spine;
  ctx.fillRect(-1 * k, -(len * 0.82) * k, 6 * k, (len * 0.72) * k);
  // Oclusión bajo el cuello.
  const occ = ctx.createRadialGradient(2 * k, -(len * 0.74) * k, 1 * k, 2 * k, -(len * 0.74) * k, 8 * k);
  occ.addColorStop(0, shade + "0.28)");
  occ.addColorStop(1, shade + "0)");
  ctx.fillStyle = occ;
  ctx.fillRect(-8 * k, -(len * 0.82) * k, 20 * k, 12 * k);
}

function drawQuadHead(
  ctx: CanvasRenderingContext2D,
  k: number,
  len: number,
  headX: number,
  headDip: number,
  pose: RatPose,
): void {
  const hx = headX * k;
  const baseY = -(len * 0.9 + headDip * 0.3) * k;
  // Orejas pequeñas a los lados de la cabeza (3/4: izquierda algo mayor).
  drawEar(ctx, k, hx - 5.2 * k, baseY + 3 * k, 0.92);
  drawEar(ctx, k, hx + 5 * k, baseY + 3 * k, 0.8);

  // Volumen de la cabeza (pequeña).
  const g = ctx.createRadialGradient(hx - 1.5 * k, baseY, 1 * k, hx, baseY + 1 * k, 7 * k);
  g.addColorStop(0, "rgba(255,255,255,0.5)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(hx, baseY + 1 * k, 5.5 * k, 5 * k, 0, 0, Math.PI * 2);
  ctx.fill();

  // Carita visible al comer/agacharse o erguirse.
  if (pose.headDown || pose.kind === "crouch") {
    const fy = baseY + 1 * k;
    ctx.beginPath();
    ctx.ellipse(hx, fy + 3 * k, 2.6 * k, 2.2 * k, 0, 0, Math.PI * 2);
    ctx.fillStyle = FUR_LIGHT;
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(hx, fy + 4.8 * k, 1.1 * k, 0.9 * k, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#d98c9a";
    ctx.fill();
    if (!pose.blinking) {
      for (const sx of [-2.4, 2.4]) {
        ctx.beginPath();
        ctx.ellipse(hx + sx * k, fy + 1.5 * k, 1.3 * k, 1.5 * k, 0, 0, Math.PI * 2);
        ctx.fillStyle = "#161013";
        ctx.fill();
      }
    }
  }
}

/* ============================ Erguida (barra) ============================ */

function drawRearing(ctx: CanvasRenderingContext2D, k: number, pose: RatPose): void {
  const len = 50;
  const headX = 1.5;
  ctx.save();
  ctx.rotate(0.03);

  drawTail(ctx, k, pose.tailSide ?? -1, Math.sin(pose.phase * 1.3) * 2);
  drawHindFoot(ctx, k, -9, 4, -1);
  drawHindFoot(ctx, k, 9, 4, 1);

  ctx.translate(0, -(Math.sin(pose.phase) * 0.5) * k);
  // Cuerpo vertical en forma de pera.
  traceRearBody(ctx, k, len, headX);
  const g = ctx.createRadialGradient(-5 * k, -(len * 0.5) * k, 2 * k, -2 * k, -(len * 0.3) * k, len * k);
  g.addColorStop(0, FUR_HI);
  g.addColorStop(0.4, FUR_LIGHT);
  g.addColorStop(0.78, FUR_MID);
  g.addColorStop(1, FUR_EDGE);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
  shadeQuadBody(ctx, k, len);
  furTexture(ctx, k, len, 12);
  ctx.restore();
  ctx.lineWidth = 0.7 * k;
  ctx.strokeStyle = "rgba(140,130,116,0.3)";
  ctx.stroke();

  // Patitas delanteras hacia la barra (arriba).
  const reach = Math.sin(pose.phase * 3) * 1.6 * k;
  ctx.strokeStyle = SKIN;
  ctx.lineWidth = 2.2 * k;
  const topY = -(len) * k;
  ctx.beginPath();
  ctx.moveTo(-3 * k, topY + 8 * k);
  ctx.quadraticCurveTo(-1 * k, topY + 2 * k, 0 * k, topY - 2 * k - reach);
  ctx.moveTo(3 * k, topY + 8 * k);
  ctx.quadraticCurveTo(2 * k, topY + 2 * k, 3 * k, topY - 1 * k - reach);
  ctx.stroke();

  drawQuadHead(ctx, k, len, headX, 0, { ...pose, headDown: true });
  ctx.restore();
}

function traceRearBody(ctx: CanvasRenderingContext2D, k: number, len: number, headX: number): void {
  const hx = headX;
  ctx.beginPath();
  ctx.moveTo(0, 6 * k);
  ctx.bezierCurveTo(-13 * k, 5 * k, -14 * k, -8 * k, -12 * k, -(len * 0.45) * k);
  ctx.bezierCurveTo(-11 * k, -(len * 0.7) * k, -(7) * k + hx * k, -(len * 0.9) * k, hx * k, -len * k);
  ctx.bezierCurveTo(7 * k + hx * k, -(len * 0.9) * k, 11 * k, -(len * 0.7) * k, 12 * k, -(len * 0.45) * k);
  ctx.bezierCurveTo(14 * k, -8 * k, 13 * k, 5 * k, 0, 6 * k);
  ctx.closePath();
}

/* ============================ piezas comunes ============================ */

function drawEar(ctx: CanvasRenderingContext2D, k: number, cx: number, cy: number, scale: number): void {
  const r = 4 * scale;
  ctx.beginPath();
  ctx.ellipse(cx, cy, r * k, (r + 0.4) * k, 0, 0, Math.PI * 2);
  ctx.fillStyle = EAR;
  ctx.fill();
  ctx.lineWidth = 0.6 * k;
  ctx.strokeStyle = EAR_IN;
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(cx, cy + 0.5 * k, r * 0.5 * k, r * 0.6 * k, 0, 0, Math.PI * 2);
  ctx.fillStyle = EAR_IN;
  ctx.fill();
}

function drawHindFoot(ctx: CanvasRenderingContext2D, k: number, x: number, y: number, dir: number): void {
  ctx.save();
  ctx.translate(x * k, y * k);
  ctx.rotate(dir * 0.5);
  ctx.fillStyle = SKIN;
  ctx.beginPath();
  ctx.ellipse(0, 0, 4.2 * k, 2.4 * k, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = SKIN_DARK;
  ctx.lineWidth = 0.6 * k;
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(2 * k, i * 1.2 * k);
    ctx.lineTo(4.6 * k, i * 1.7 * k);
    ctx.stroke();
  }
  ctx.restore();
}

function furTexture(ctx: CanvasRenderingContext2D, k: number, len: number, halfW: number): void {
  ctx.lineWidth = 0.5 * k;
  const n = 80;
  for (let i = 0; i < n; i++) {
    const r1 = frac(i * 12.9898);
    const r2 = frac(i * 78.233);
    const r3 = frac(i * 43.137);
    const x = (r1 * 2 - 1) * halfW * k;
    const y = -(r2 * len + 2) * k;
    const lenStroke = (2.5 + r3 * 3) * k;
    const dir = Math.sign(x) || 1;
    ctx.strokeStyle = r3 > 0.5 ? "rgba(255,255,255,0.10)" : "rgba(150,140,125,0.08)";
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + dir * 1.5 * k, y + lenStroke * 0.6, x + dir * 2.2 * k, y + lenStroke);
    ctx.stroke();
  }
}

function frac(v: number): number {
  return v - Math.floor(v);
}

function drawTail(ctx: CanvasRenderingContext2D, k: number, side: number, sway: number): void {
  const pts: [number, number][] = [
    [0, 4 * k],
    [side * 6 * k, 12 * k],
    [side * 16 * k + sway * k, 18 * k],
    [side * 27 * k + sway * 2 * k, 15 * k],
    [side * 36 * k, 6 * k],
  ];
  const segs = 30;
  const mids: [number, number][] = [];
  for (let i = 0; i < segs; i++) {
    const t = i / segs;
    const p1 = bezierPoint(pts, t);
    const p2 = bezierPoint(pts, (i + 1) / segs);
    mids.push(p1);
    ctx.lineWidth = (4.2 - 3.4 * t) * k;
    ctx.strokeStyle = i % 4 === 0 ? TAIL_DARK : TAIL;
    ctx.beginPath();
    ctx.moveTo(p1[0], p1[1]);
    ctx.lineTo(p2[0], p2[1]);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(255,255,255,0.28)";
  ctx.lineWidth = 0.8 * k;
  ctx.beginPath();
  mids.forEach((p, i) => (i === 0 ? ctx.moveTo(p[0], p[1] - 1.2 * k) : ctx.lineTo(p[0], p[1] - 1.2 * k)));
  ctx.stroke();
}

function bezierPoint(pts: [number, number][], t: number): [number, number] {
  let a = pts.map((p) => [p[0], p[1]] as [number, number]);
  while (a.length > 1) {
    const b: [number, number][] = [];
    for (let i = 0; i < a.length - 1; i++) {
      b.push([a[i][0] + (a[i + 1][0] - a[i][0]) * t, a[i][1] + (a[i + 1][1] - a[i][1]) * t]);
    }
    a = b;
  }
  return a[0];
}
