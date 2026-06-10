/**
 * Dibujo de la rata albina vista en 3/4 desde atrás-arriba, como en el Sniffy
 * original: se mira hacia dentro de la caja y se ve el lomo y los cuartos
 * traseros de la rata, con la cola rosada arrastrando hacia el espectador y la
 * cabeza orientada hacia el aparato del fondo.
 *
 * Render procedural con curvas Bézier y sombreado por capas (no figuras
 * geométricas apiladas). Coordenadas en unidades de `k`; origen (0,0) en el
 * centro de los cuartos traseros (lo más cercano al espectador); -y es "hacia
 * el fondo" (donde está la cabeza).
 */

export interface RatPose {
  /** "stand" quieta/caminando, "rear" erguida hacia la barra,
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
const FUR_LIGHT = "#f3f1ee";
const FUR_MID = "#e2ddd6";
const FUR_EDGE = "#c8c1b6";
const FUR_SHADE = "rgba(150,142,128,0.45)";
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
  drawRearView(ctx, k, pose);
  ctx.restore();
}

function drawRearView(
  ctx: CanvasRenderingContext2D,
  k: number,
  pose: RatPose,
): void {
  // Parámetros según la postura.
  const rear = pose.kind === "rear";
  const crouch = pose.kind === "crouch";
  // Longitud del cuerpo (rump→cabeza) y altura aparente.
  const len = rear ? 46 : crouch ? 30 : 36; // en k
  const headLift = rear ? 16 : pose.headDown ? -3 : 2; // cabeza más alta al erguirse
  const breathe = crouch ? 0 : Math.sin(pose.phase) * 0.5;
  const tailSide = pose.tailSide ?? -1;
  const sway = Math.sin(pose.phase * 1.3) * 2;

  // --- Cola (detrás, sale del rump hacia el espectador) ---
  drawTail(ctx, k, len, tailSide, sway);

  // --- Patas traseras (pies rosados a los lados del rump) ---
  drawHindFoot(ctx, k, -12, 3, -1);
  drawHindFoot(ctx, k, 12, 3, 1);

  // --- Cuerpo (lomo + cuartos traseros + cabeza), silueta lagrimal ---
  ctx.save();
  ctx.translate(0, -breathe * k);
  traceBody(ctx, k, len, headLift);

  // Relleno con volumen: luz desde arriba-centro.
  const g = ctx.createRadialGradient(
    -2 * k,
    -(len * 0.55) * k,
    2 * k,
    0,
    -(len * 0.3) * k,
    (len * 0.9) * k,
  );
  g.addColorStop(0, FUR_HI);
  g.addColorStop(0.35, FUR_LIGHT);
  g.addColorStop(0.75, FUR_MID);
  g.addColorStop(1, FUR_EDGE);
  ctx.fillStyle = g;
  ctx.fill();

  // Sombreado lateral para redondear los flancos.
  ctx.save();
  ctx.clip();
  const lshade = ctx.createLinearGradient(-16 * k, 0, -4 * k, 0);
  lshade.addColorStop(0, FUR_SHADE);
  lshade.addColorStop(1, "rgba(150,142,128,0)");
  ctx.fillStyle = lshade;
  ctx.fillRect(-18 * k, -len * k, 16 * k, (len + 6) * k);
  const rshade = ctx.createLinearGradient(16 * k, 0, 4 * k, 0);
  rshade.addColorStop(0, FUR_SHADE);
  rshade.addColorStop(1, "rgba(150,142,128,0)");
  ctx.fillStyle = rshade;
  ctx.fillRect(2 * k, -len * k, 16 * k, (len + 6) * k);
  // Surco central del lomo (línea de la columna), muy sutil.
  const spine = ctx.createLinearGradient(-3 * k, 0, 3 * k, 0);
  spine.addColorStop(0, "rgba(150,142,128,0)");
  spine.addColorStop(0.5, "rgba(150,142,128,0.16)");
  spine.addColorStop(1, "rgba(150,142,128,0)");
  ctx.fillStyle = spine;
  ctx.fillRect(-3 * k, -(len * 0.85) * k, 6 * k, (len * 0.8) * k);
  ctx.restore();

  // Contorno suave.
  ctx.lineWidth = 0.7 * k;
  ctx.strokeStyle = "rgba(140,130,116,0.35)";
  ctx.stroke();
  ctx.restore();

  // --- Cabeza, orejas y (si se ve) carita ---
  drawHead(ctx, k, len, headLift, pose);

  // --- Acicalarse: patitas delanteras hacia la cara ---
  if (pose.grooming) {
    const hy = -(len + headLift) * k;
    ctx.strokeStyle = SKIN;
    ctx.lineWidth = 2.2 * k;
    const gp = Math.sin(pose.phase * 6) * 1.4 * k;
    ctx.beginPath();
    ctx.moveTo(-3 * k, hy + 8 * k);
    ctx.quadraticCurveTo(-2 * k, hy + 2 * k, -1 * k, hy + gp);
    ctx.moveTo(3 * k, hy + 8 * k);
    ctx.quadraticCurveTo(2 * k, hy + 2 * k, 1 * k, hy + gp);
    ctx.stroke();
  }
}

/** Silueta lagrimal: ancha en los cuartos traseros (abajo), afina a la cabeza. */
function traceBody(
  ctx: CanvasRenderingContext2D,
  k: number,
  len: number,
  headLift: number,
): void {
  const rumpHalf = 14;
  const neckHalf = 7.5;
  const headHalf = 8;
  const headY = -(len + headLift * 0.2);
  ctx.beginPath();
  // Rump, centro inferior (cerca del espectador)
  ctx.moveTo(0, 5 * k);
  // Lado izquierdo: anca -> flanco -> cuello
  ctx.bezierCurveTo(-rumpHalf * k, 5 * k, -(rumpHalf + 1) * k, -3 * k, -rumpHalf * k, -10 * k);
  ctx.bezierCurveTo(-(rumpHalf - 1) * k, -(len * 0.45) * k, -(neckHalf + 2) * k, -(len * 0.72) * k, -neckHalf * k, -(len * 0.82) * k);
  // Cabeza izquierda y coronilla
  ctx.bezierCurveTo(-headHalf * k, (headY + 3) * k, -headHalf * 0.7 * k, headY * k, 0, headY * k);
  // Lado derecho (espejo)
  ctx.bezierCurveTo(headHalf * 0.7 * k, headY * k, headHalf * k, (headY + 3) * k, neckHalf * k, -(len * 0.82) * k);
  ctx.bezierCurveTo((neckHalf + 2) * k, -(len * 0.72) * k, (rumpHalf - 1) * k, -(len * 0.45) * k, rumpHalf * k, -10 * k);
  ctx.bezierCurveTo((rumpHalf + 1) * k, -3 * k, rumpHalf * k, 5 * k, 0, 5 * k);
  ctx.closePath();
}

function drawHead(
  ctx: CanvasRenderingContext2D,
  k: number,
  len: number,
  headLift: number,
  pose: RatPose,
): void {
  const hy = -(len + headLift) * k;
  // Orejas (dos, a los lados de la cabeza, vistas desde atrás).
  drawEar(ctx, k, -6.5 * k, hy + 7 * k);
  drawEar(ctx, k, 6.5 * k, hy + 7 * k);

  // Coronilla redondeada por encima del cuerpo.
  ctx.beginPath();
  ctx.ellipse(0, hy + 8 * k, 8 * k, 8.5 * k, 0, 0, Math.PI * 2);
  const g = ctx.createRadialGradient(-2 * k, hy + 5 * k, 1 * k, 0, hy + 8 * k, 11 * k);
  g.addColorStop(0, FUR_HI);
  g.addColorStop(0.6, FUR_LIGHT);
  g.addColorStop(1, FUR_MID);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 0.6 * k;
  ctx.strokeStyle = "rgba(140,130,116,0.3)";
  ctx.stroke();

  // Al erguirse o agacharse se intuye algo de la cara (ojos/hocico).
  if (pose.kind === "rear" || pose.headDown) {
    const fy = hy + 7 * k;
    // Hocico tenue.
    ctx.beginPath();
    ctx.ellipse(0, fy + 4 * k, 3.5 * k, 3 * k, 0, 0, Math.PI * 2);
    ctx.fillStyle = FUR_LIGHT;
    ctx.fill();
    // Naricita.
    ctx.beginPath();
    ctx.ellipse(0, fy + 6.5 * k, 1.3 * k, 1 * k, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#d98c9a";
    ctx.fill();
    // Ojos.
    if (!pose.blinking) {
      for (const sx of [-3.2, 3.2]) {
        ctx.beginPath();
        ctx.ellipse(sx * k, fy + 2 * k, 1.5 * k, 1.7 * k, 0, 0, Math.PI * 2);
        ctx.fillStyle = "#161013";
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse((sx - 0.4) * k, fy + 1.4 * k, 0.5 * k, 0.5 * k, 0, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.fill();
      }
    }
  }
}

function drawEar(ctx: CanvasRenderingContext2D, k: number, cx: number, cy: number): void {
  ctx.beginPath();
  ctx.ellipse(cx, cy, 4.2 * k, 4.6 * k, 0, 0, Math.PI * 2);
  ctx.fillStyle = EAR;
  ctx.fill();
  ctx.lineWidth = 0.6 * k;
  ctx.strokeStyle = EAR_IN;
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(cx, cy + 0.5 * k, 2.2 * k, 2.6 * k, 0, 0, Math.PI * 2);
  ctx.fillStyle = EAR_IN;
  ctx.fill();
}

function drawHindFoot(
  ctx: CanvasRenderingContext2D,
  k: number,
  x: number,
  y: number,
  dir: number,
): void {
  ctx.save();
  ctx.translate(x * k, y * k);
  ctx.rotate(dir * 0.5);
  ctx.fillStyle = SKIN;
  ctx.beginPath();
  ctx.ellipse(0, 0, 4.5 * k, 2.6 * k, 0, 0, Math.PI * 2);
  ctx.fill();
  // Dedos.
  ctx.strokeStyle = SKIN_DARK;
  ctx.lineWidth = 0.6 * k;
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(2 * k, i * 1.3 * k);
    ctx.lineTo(5 * k, i * 1.8 * k);
    ctx.stroke();
  }
  ctx.restore();
}

function drawTail(
  ctx: CanvasRenderingContext2D,
  k: number,
  _len: number,
  side: number,
  sway: number,
): void {
  // Sale del rump (0, 4k) y se arrastra hacia el espectador, curvándose a un lado.
  const pts: [number, number][] = [
    [0, 3 * k],
    [side * 6 * k, 10 * k],
    [side * 16 * k + sway * k, 16 * k],
    [side * 26 * k + sway * 2 * k, 14 * k],
    [side * 34 * k, 6 * k],
  ];
  const segs = 28;
  for (let i = 0; i < segs; i++) {
    const t = i / segs;
    const t2 = (i + 1) / segs;
    const p1 = bezierPoint(pts, t);
    const p2 = bezierPoint(pts, t2);
    ctx.lineWidth = (4 - 3.2 * t) * k;
    ctx.strokeStyle = i % 4 === 0 ? TAIL_DARK : TAIL;
    ctx.beginPath();
    ctx.moveTo(p1[0], p1[1]);
    ctx.lineTo(p2[0], p2[1]);
    ctx.stroke();
  }
}

/** Evalúa una Bézier de grado n (de Casteljau). */
function bezierPoint(pts: [number, number][], t: number): [number, number] {
  let a = pts.map((p) => [p[0], p[1]] as [number, number]);
  while (a.length > 1) {
    const b: [number, number][] = [];
    for (let i = 0; i < a.length - 1; i++) {
      b.push([
        a[i][0] + (a[i + 1][0] - a[i][0]) * t,
        a[i][1] + (a[i + 1][1] - a[i][1]) * t,
      ]);
    }
    a = b;
  }
  return a[0];
}
