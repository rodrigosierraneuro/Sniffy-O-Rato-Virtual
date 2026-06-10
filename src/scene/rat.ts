/**
 * Dibujo de la rata albina vista en 3/4 desde atrás-arriba, como en el Sniffy
 * original: se mira hacia dentro de la caja y se ve el lomo y los cuartos
 * traseros, con la cola rosada arrastrando hacia el espectador y la cabeza
 * orientada hacia el aparato del fondo.
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
const FUR_LIGHT = "#f4f2ef";
const FUR_MID = "#e4ded7";
const FUR_EDGE = "#c6bfb4";
const SKIN = "#e9b9b0";
const SKIN_DARK = "#d19991";
const TAIL = "#e3bdb4";
const TAIL_DARK = "#c79890";
const EAR = "#e7b3ab";
const EAR_IN = "#cf8f88";

// Dirección de la luz (arriba-izquierda) para un sombreado coherente y 3/4.
const LIGHT_X = -0.5;

export function drawRat(
  ctx: CanvasRenderingContext2D,
  k: number,
  pose: RatPose,
): void {
  const tremor = pose.fear ? Math.sin(pose.phase * 22) * pose.fear * 1.3 * k : 0;
  ctx.save();
  ctx.translate(tremor, 0);
  // Leve giro 3/4 para que no se vea perfectamente simétrica de espaldas.
  ctx.rotate(0.04);
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
  const rear = pose.kind === "rear";
  const crouch = pose.kind === "crouch";
  const len = rear ? 46 : crouch ? 30 : 36;
  const headLift = rear ? 16 : pose.headDown ? -3 : 2;
  const breathe = crouch ? 0 : Math.sin(pose.phase) * 0.5;
  const tailSide = pose.tailSide ?? -1;
  const sway = Math.sin(pose.phase * 1.3) * 2;
  // Giro de la cabeza (3/4): se asoma ligeramente hacia un lado.
  const headTurn = 1.6;

  // --- Cola (detrás del cuerpo) ---
  drawTail(ctx, k, tailSide, sway);

  // --- Patas traseras (pies rosados a los lados del rump) ---
  drawHindFoot(ctx, k, -12, 3.5, -1);
  drawHindFoot(ctx, k, 12, 3.5, 1);

  // --- Cuerpo + cabeza en una sola silueta continua ---
  ctx.save();
  ctx.translate(0, -breathe * k);
  traceBody(ctx, k, len, headLift, headTurn);

  // Relleno con volumen: luz direccional desde arriba-izquierda.
  const cxHi = LIGHT_X * 6 * k;
  const g = ctx.createRadialGradient(
    cxHi,
    -(len * 0.5) * k,
    2 * k,
    cxHi * 0.3,
    -(len * 0.28) * k,
    (len * 0.95) * k,
  );
  g.addColorStop(0, FUR_HI);
  g.addColorStop(0.4, FUR_LIGHT);
  g.addColorStop(0.78, FUR_MID);
  g.addColorStop(1, FUR_EDGE);
  ctx.fillStyle = g;
  ctx.fill();

  // Sombreado y textura dentro de la silueta.
  ctx.save();
  ctx.clip();
  shadeBody(ctx, k, len);
  furTexture(ctx, k, len);
  ctx.restore();

  // Contorno muy suave.
  ctx.lineWidth = 0.7 * k;
  ctx.strokeStyle = "rgba(140,130,116,0.3)";
  ctx.stroke();
  ctx.restore();

  // --- Orejas, carita (si se ve) ---
  drawHead(ctx, k, len, headLift, headTurn, pose);

  // --- Acicalarse ---
  if (pose.grooming) {
    const hy = -(len + headLift) * k;
    ctx.strokeStyle = SKIN;
    ctx.lineWidth = 2.2 * k;
    const gp = Math.sin(pose.phase * 6) * 1.4 * k;
    ctx.beginPath();
    ctx.moveTo(-3 * k, hy + 9 * k);
    ctx.quadraticCurveTo(-2 * k, hy + 3 * k, -1 * k, hy + 1 * k + gp);
    ctx.moveTo(3 * k, hy + 9 * k);
    ctx.quadraticCurveTo(2 * k, hy + 3 * k, 1 * k, hy + 1 * k + gp);
    ctx.stroke();
  }
}

/**
 * Silueta continua de la rata vista de espaldas: cuartos traseros anchos abajo,
 * un leve estrechamiento de cuello y una cabeza redondeada arriba. `headTurn`
 * desplaza la cabeza a un lado para dar la sensación de 3/4.
 */
function traceBody(
  ctx: CanvasRenderingContext2D,
  k: number,
  len: number,
  headLift: number,
  headTurn: number,
): void {
  const rumpHalf = 14;
  const shoulderHalf = 10;
  const neckHalf = 6.5;
  const headHalf = 7.5;
  const ht = headTurn;
  const neckY = -(len * 0.78);
  const headY = -(len + headLift * 0.15);
  ctx.beginPath();
  ctx.moveTo(0, 5.5 * k);
  // Lado izquierdo: anca -> flanco -> hombro -> cuello
  ctx.bezierCurveTo(-rumpHalf * k, 5.5 * k, -(rumpHalf + 1) * k, -3 * k, -rumpHalf * k, -11 * k);
  ctx.bezierCurveTo(-(rumpHalf - 0.5) * k, -(len * 0.4) * k, -(shoulderHalf + 1) * k, -(len * 0.62) * k, -neckHalf * k, neckY * k);
  // Cuello -> cabeza (con giro) -> coronilla redondeada (domo amplio)
  ctx.bezierCurveTo(-(headHalf + 1) * k + ht * k, (neckY - 4) * k, -(headHalf + 0.5) * k + ht * k, (headY + 1.5) * k, ht * k, headY * k);
  // Lado derecho (espejo, mismo giro)
  ctx.bezierCurveTo((headHalf + 0.5) * k + ht * k, (headY + 1.5) * k, (headHalf + 1) * k + ht * k, (neckY - 4) * k, neckHalf * k, neckY * k);
  ctx.bezierCurveTo((shoulderHalf + 1) * k, -(len * 0.62) * k, (rumpHalf - 0.5) * k, -(len * 0.4) * k, rumpHalf * k, -11 * k);
  ctx.bezierCurveTo((rumpHalf + 1) * k, -3 * k, rumpHalf * k, 5.5 * k, 0, 5.5 * k);
  ctx.closePath();
}

/** Sombras internas: flancos, ancas, surco de la columna y oclusión del cuello. */
function shadeBody(ctx: CanvasRenderingContext2D, k: number, len: number): void {
  const shade = "rgba(150,142,128,";
  // Flanco derecho (lado en sombra por la luz de la izquierda).
  const rs = ctx.createLinearGradient(15 * k, 0, 2 * k, 0);
  rs.addColorStop(0, shade + "0.5)");
  rs.addColorStop(1, shade + "0)");
  ctx.fillStyle = rs;
  ctx.fillRect(2 * k, -len * k, 16 * k, (len + 8) * k);
  // Flanco izquierdo (más tenue, lado iluminado).
  const ls = ctx.createLinearGradient(-15 * k, 0, -3 * k, 0);
  ls.addColorStop(0, shade + "0.28)");
  ls.addColorStop(1, shade + "0)");
  ctx.fillStyle = ls;
  ctx.fillRect(-18 * k, -len * k, 15 * k, (len + 8) * k);

  // Ancas: insinuación sutil del volumen de los muslos (sin marcar "dos bolas").
  for (const sx of [-1, 1]) {
    const hg = ctx.createRadialGradient(sx * 7 * k, -1 * k, 2 * k, sx * 7 * k, -1 * k, 8 * k);
    hg.addColorStop(0, shade + "0)");
    hg.addColorStop(0.78, shade + "0)");
    hg.addColorStop(1, shade + "0.18)");
    ctx.fillStyle = hg;
    ctx.beginPath();
    ctx.arc(sx * 7 * k, -1 * k, 8 * k, 0, Math.PI * 2);
    ctx.fill();
  }

  // Surco de la columna.
  const spine = ctx.createLinearGradient(-3 * k, 0, 3 * k, 0);
  spine.addColorStop(0, shade + "0)");
  spine.addColorStop(0.5, shade + "0.14)");
  spine.addColorStop(1, shade + "0)");
  ctx.fillStyle = spine;
  ctx.fillRect(-3 * k, -(len * 0.85) * k, 6 * k, (len * 0.82) * k);

  // Oclusión bajo la cabeza (donde el cuello se une al lomo).
  const occ = ctx.createRadialGradient(0, -(len * 0.78) * k, 1 * k, 0, -(len * 0.78) * k, 9 * k);
  occ.addColorStop(0, shade + "0.32)");
  occ.addColorStop(1, shade + "0)");
  ctx.fillStyle = occ;
  ctx.fillRect(-10 * k, -(len * 0.86) * k, 20 * k, 12 * k);
}

/** Textura de pelaje: trazos cortos que rompen el aspecto liso/plástico. */
function furTexture(ctx: CanvasRenderingContext2D, k: number, len: number): void {
  ctx.lineWidth = 0.5 * k;
  const n = 70;
  for (let i = 0; i < n; i++) {
    // Distribución pseudoaleatoria determinista.
    const r1 = frac(i * 12.9898);
    const r2 = frac(i * 78.233);
    const r3 = frac(i * 43.137);
    const x = (r1 * 2 - 1) * 13 * k;
    const y = -(r2 * len + 2) * k;
    const lenStroke = (2.5 + r3 * 3) * k;
    // Dirección: ligeramente radial desde el centro hacia los flancos.
    const dir = Math.sign(x) || 1;
    const light = r3 > 0.5;
    ctx.strokeStyle = light
      ? "rgba(255,255,255,0.10)"
      : "rgba(150,140,125,0.08)";
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(
      x + dir * 1.5 * k,
      y + lenStroke * 0.6,
      x + dir * 2.2 * k,
      y + lenStroke,
    );
    ctx.stroke();
  }
}

function frac(v: number): number {
  return v - Math.floor(v);
}

function drawHead(
  ctx: CanvasRenderingContext2D,
  k: number,
  len: number,
  headLift: number,
  headTurn: number,
  pose: RatPose,
): void {
  const hy = -(len + headLift) * k;
  const ht = headTurn * k;
  // Orejas (3/4: la del lado girado se ve un poco mayor y más adelantada).
  drawEar(ctx, k, -6.5 * k + ht, hy + 8 * k, 1.05);
  drawEar(ctx, k, 6.8 * k + ht, hy + 8 * k, 0.92);

  // Brillo en la coronilla (volumen de la cabeza).
  const g = ctx.createRadialGradient(ht - 2 * k, hy + 5 * k, 1 * k, ht, hy + 7 * k, 10 * k);
  g.addColorStop(0, "rgba(255,255,255,0.38)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(ht, hy + 7 * k, 8 * k, 8 * k, 0, 0, Math.PI * 2);
  ctx.fill();

  // Al erguirse o agacharse se intuye la cara.
  if (pose.kind === "rear" || pose.headDown) {
    const fy = hy + 8 * k;
    ctx.beginPath();
    ctx.ellipse(ht, fy + 4 * k, 3.6 * k, 3 * k, 0, 0, Math.PI * 2);
    ctx.fillStyle = FUR_LIGHT;
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(ht, fy + 6.6 * k, 1.3 * k, 1 * k, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#d98c9a";
    ctx.fill();
    if (!pose.blinking) {
      for (const sx of [-3.2, 3.2]) {
        ctx.beginPath();
        ctx.ellipse(sx * k + ht, fy + 2 * k, 1.5 * k, 1.7 * k, 0, 0, Math.PI * 2);
        ctx.fillStyle = "#161013";
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse((sx - 0.4) * k + ht, fy + 1.4 * k, 0.5 * k, 0.5 * k, 0, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.fill();
      }
    }
  }
}

function drawEar(
  ctx: CanvasRenderingContext2D,
  k: number,
  cx: number,
  cy: number,
  scale: number,
): void {
  const r = 4.2 * scale;
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
  side: number,
  sway: number,
): void {
  const pts: [number, number][] = [
    [0, 3 * k],
    [side * 6 * k, 11 * k],
    [side * 16 * k + sway * k, 17 * k],
    [side * 26 * k + sway * 2 * k, 14 * k],
    [side * 34 * k, 5 * k],
  ];
  const segs = 30;
  const mids: [number, number][] = [];
  for (let i = 0; i < segs; i++) {
    const t = i / segs;
    const t2 = (i + 1) / segs;
    const p1 = bezierPoint(pts, t);
    const p2 = bezierPoint(pts, t2);
    mids.push(p1);
    ctx.lineWidth = (4.2 - 3.4 * t) * k;
    ctx.strokeStyle = i % 4 === 0 ? TAIL_DARK : TAIL;
    ctx.beginPath();
    ctx.moveTo(p1[0], p1[1]);
    ctx.lineTo(p2[0], p2[1]);
    ctx.stroke();
  }
  // Brillo a lo largo de la cola.
  ctx.strokeStyle = "rgba(255,255,255,0.3)";
  ctx.lineWidth = 0.8 * k;
  ctx.beginPath();
  mids.forEach((p, i) => (i === 0 ? ctx.moveTo(p[0], p[1] - 1.2 * k) : ctx.lineTo(p[0], p[1] - 1.2 * k)));
  ctx.stroke();
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
