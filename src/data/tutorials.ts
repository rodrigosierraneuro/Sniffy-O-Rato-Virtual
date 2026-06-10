import type { Simulation } from "../engine/simulation";
import type { CerProtocol } from "../engine/cerProtocol";
import type { ScheduleKind } from "../engine/types";

/** Contexto que el tutorial usa para preparar la simulación y leer su estado. */
export interface TutorialCtx {
  sim: Simulation;
  protocol: CerProtocol;
  loadScenario: (id: string) => void;
  setSchedule: (kind: ScheduleKind, param: number) => void;
  setSpeed: (multiplier: number) => void;
  setRecordTab: (tab: "cumulative" | "cer") => void;
}

export interface TutorialStep {
  text: string;
  /** Acción concreta que se pide al estudiante (se muestra resaltada). */
  action?: string;
  /** Pista adicional. */
  hint?: string;
  /** Prepara la simulación al entrar en el paso (una sola vez). */
  setup?: (ctx: TutorialCtx) => void;
  /** Si se cumple, el paso se completa y avanza automáticamente. */
  advanceWhen?: (ctx: TutorialCtx) => boolean;
  /** Progreso 0..1 para la barra (objetivos medibles). */
  progress?: (ctx: TutorialCtx) => number;
}

export interface Tutorial {
  id: string;
  title: string;
  summary: string;
  steps: TutorialStep[];
}

export const tutorials: Tutorial[] = [
  {
    id: "magazine",
    title: "1 · Entrenamiento de magazine",
    summary:
      "Asocia el sonido del comedero con la comida para crear un reforzador secundario.",
    steps: [
      {
        text: "El primer paso para entrenar a una rata es el entrenamiento de magazine: lograr que el clic del comedero (un sonido) anuncie de forma fiable la llegada de comida. Así el clic se convierte en un reforzador secundario que luego usaremos para moldear conductas.",
        setup: (c) => {
          c.loadScenario("naive");
          c.setSchedule("EXT", 0);
          c.setSpeed(1);
        },
      },
      {
        text: "Pulsa varias veces «🍖 Dar comida». Cada entrega hace sonar el comedero y deja un pellet. Observa cómo sube la barra «Asociación sonido–comida» en las Ventanas de la mente.",
        action: "Pulsa «Dar comida» unas 5–8 veces",
        advanceWhen: (c) => c.sim.state.mind.soundFoodAssoc >= 0.5,
        progress: (c) => c.sim.state.mind.soundFoodAssoc / 0.5,
      },
      {
        text: "Sigue entregando comida hasta que la asociación sonido–comida esté bien consolidada (cerca del 90 %). Cuanto más fuerte sea, más eficaz será el clic como reforzador.",
        action: "Continúa hasta que la asociación supere el 90 %",
        advanceWhen: (c) => c.sim.state.mind.soundFoodAssoc >= 0.9,
        progress: (c) => c.sim.state.mind.soundFoodAssoc / 0.9,
      },
      {
        text: "¡Listo! El comedero ya es un reforzador secundario: su clic puede reforzar conductas por sí mismo. Con esto preparado, podemos pasar al moldeamiento de la presión de barra.",
      },
    ],
  },
  {
    id: "shaping",
    title: "2 · Moldeamiento de la barra",
    summary:
      "Refuerza aproximaciones sucesivas hasta que la rata presione la barra.",
    steps: [
      {
        text: "El moldeamiento por aproximaciones sucesivas consiste en reforzar conductas cada vez más cercanas a la respuesta objetivo (presionar la barra). Partimos de una rata con el magazine ya entrenado.",
        setup: (c) => {
          c.loadScenario("magazine");
          c.setSchedule("EXT", 0);
          c.setSpeed(1);
        },
      },
      {
        text: "Observa a la rata moverse. Cuando se acerque a la zona de la barra (a la izquierda, junto al aparato), pulsa «Dar comida». Estás reforzando «acercarse a la barra»: verás subir esa barra en las Ventanas de la mente.",
        action: "Refuerza cuando la rata se acerque a la barra",
        advanceWhen: (c) => c.sim.state.mind.approximation.NEAR_BAR >= 0.45,
        progress: (c) => c.sim.state.mind.approximation.NEAR_BAR / 0.45,
      },
      {
        text: "Ahora sé más exigente: refuerza solo cuando la rata se yerga junto a la barra. Así desplazas la conducta hacia la respuesta objetivo (aproximaciones sucesivas).",
        action: "Refuerza cuando la rata se yerga junto a la barra",
        advanceWhen: (c) => c.sim.state.mind.approximation.PRESS >= 0.5,
        progress: (c) => c.sim.state.mind.approximation.PRESS / 0.5,
        hint: "Si tarda, refuerza cualquier intento de tocar la barra. Puedes usar «Aislar a Sniffy» para acelerar.",
      },
      {
        text: "¡Excelente! La fuerza de presión de barra ya es alta: la rata presiona por sí sola. Has moldeado una conducta operante. Ahora podemos ponerla bajo distintos programas de reforzamiento.",
      },
    ],
  },
  {
    id: "schedules",
    title: "3 · Programas de reforzamiento",
    summary:
      "Compara CRF, razón y intervalo, y reconoce sus firmas en el registro acumulativo.",
    steps: [
      {
        text: "Con la barra ya moldeada, estudiaremos los programas de reforzamiento. Cada uno produce un patrón característico en el registro acumulativo (eje Y = respuestas acumuladas, pendiente = tasa).",
        setup: (c) => {
          c.loadScenario("shaped");
          c.setRecordTab("cumulative");
          c.setSchedule("CRF", 0);
          c.setSpeed(40);
        },
      },
      {
        text: "Estamos en reforzamiento continuo (CRF): cada respuesta produce comida. Observa el registro acumulativo subir de forma regular. (Activamos «Aislar a Sniffy» para acelerar el tiempo.)",
        action: "Observa unas 20 respuestas bajo CRF",
        advanceWhen: (c) => c.sim.state.totals.presses >= 20,
        progress: (c) => c.sim.state.totals.presses / 20,
      },
      {
        text: "Aplica ahora una razón variable: elige «Razón variable (RV)», pon 10 y pulsa «Aplicar». Las contingencias de razón producen tasas altas y constantes: la curva se vuelve más empinada.",
        action: "Aplica RV-10 y observa la tasa alta",
        advanceWhen: (c) =>
          c.sim.state.schedule.kind === "VR" && c.sim.state.totals.presses >= 70,
        progress: (c) =>
          c.sim.state.schedule.kind === "VR"
            ? (c.sim.state.totals.presses - 20) / 50
            : 0,
      },
      {
        text: "Prueba un intervalo fijo: elige «Intervalo fijo (IF)», pon 15 segundos y aplica. Aparece el «festón»: tras cada reforzador la tasa baja y se acelera al acercarse el fin del intervalo.",
        action: "Aplica IF-15 y observa el festón",
        advanceWhen: (c) =>
          c.sim.state.schedule.kind === "FI" && c.sim.state.totals.presses >= 120,
        progress: (c) =>
          c.sim.state.schedule.kind === "FI"
            ? (c.sim.state.totals.presses - 70) / 50
            : 0,
      },
      {
        text: "Has visto cómo CRF, razón e intervalo generan patrones distintos. Experimenta también con razón fija (RF) e intervalo variable (IV) cuando quieras. El siguiente tema: qué ocurre al retirar el reforzador.",
      },
    ],
  },
  {
    id: "extinction",
    title: "4 · Extinción",
    summary:
      "Retira el reforzador y observa el estallido de extinción y la caída de la respuesta.",
    steps: [
      {
        text: "La extinción consiste en dejar de reforzar una respuesta previamente reforzada. Primero estableceremos una respuesta sólida bajo CRF.",
        setup: (c) => {
          c.loadScenario("shaped");
          c.setRecordTab("cumulative");
          c.setSchedule("CRF", 0);
          c.setSpeed(40);
        },
        advanceWhen: (c) => c.sim.state.totals.presses >= 30,
        progress: (c) => c.sim.state.totals.presses / 30,
        action: "Deja acumular unas 30 respuestas reforzadas",
      },
      {
        text: "Ahora aplica «Extinción (sin reforzador)» y pulsa «Aplicar». Al principio suele haber un estallido de extinción (un breve aumento de la respuesta) y luego la tasa cae. Observa también bajar la «Fuerza de presión de barra».",
        action: "Aplica Extinción y observa la caída",
        advanceWhen: (c) =>
          c.sim.state.schedule.kind === "EXT" &&
          c.sim.state.mind.approximation.PRESS < 0.45,
        progress: (c) =>
          c.sim.state.schedule.kind === "EXT"
            ? (0.85 - c.sim.state.mind.approximation.PRESS) / 0.4
            : 0,
        hint: "Usa «Aislar a Sniffy» para acelerar; la extinción puede tardar.",
      },
      {
        text: "La conducta se ha extinguido: sin reforzador, la fuerza de la respuesta decae. Tras un descanso podría haber recuperación espontánea. Pasemos al condicionamiento clásico.",
      },
    ],
  },
  {
    id: "cer",
    title: "5 · Condicionamiento clásico (CER)",
    summary:
      "Empareja un tono con un choque y mide la supresión condicionada de la respuesta.",
    steps: [
      {
        text: "El condicionamiento clásico se estudia con la Respuesta Emocional Condicionada (CER): un tono (EC) se empareja con un choque (EI). El miedo condicionado al tono suprime la conducta operante en curso. Partimos de una rata que responde en un programa de intervalo.",
        setup: (c) => {
          c.loadScenario("cer");
          c.setRecordTab("cer");
          c.setSpeed(40);
        },
      },
      {
        text: "En la pestaña «CER» tienes el protocolo automático: alterna períodos de línea base y de tono, y entrega el choque al final del tono. Pulsa «Iniciar sesión» y observa la gráfica de la razón de supresión.",
        action: "Pulsa «Iniciar sesión» en la pestaña CER",
        advanceWhen: (c) => c.protocol.results.length >= 1,
        progress: (c) => Math.min(1, c.protocol.results.length / 1),
      },
      {
        text: "A medida que avanzan los ensayos, la razón de supresión cae hacia 0: el tono predice el choque y la rata «se congela», suprimiendo la presión de barra. Observa también subir «Asociación tono–choque».",
        action: "Deja correr la sesión (al menos 4 ensayos)",
        advanceWhen: (c) => c.protocol.results.length >= 4,
        progress: (c) => Math.min(1, c.protocol.results.length / 4),
      },
      {
        text: "¡Has completado los tutoriales! Ya conoces el ciclo completo: magazine, moldeamiento, programas de reforzamiento, extinción y condicionamiento clásico. Explora libremente y diseña tus propios experimentos.",
      },
    ],
  },
];

export function getTutorial(id: string): Tutorial | undefined {
  return tutorials.find((t) => t.id === id);
}
