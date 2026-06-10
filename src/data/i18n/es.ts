/** Cadenas de la interfaz en español. Estructura lista para añadir más idiomas. */
export const es = {
  appTitle: "Sniffy — La Rata Virtual",
  subtitle: "Laboratorio de condicionamiento operante y clásico",

  windows: {
    chamber: "Caja de Skinner",
    cumulative: "Registro acumulativo",
    mind: "Ventanas de la mente",
    control: "Panel de control",
  },

  control: {
    food: "Dar comida",
    foodHint: "Entrega un pellet (entrenamiento de magazine y moldeamiento)",
    schedule: "Programa de reforzamiento",
    param: "Parámetro",
    apply: "Aplicar",
    speed: "Velocidad",
    normal: "Tiempo real",
    isolate: "Aislar a Sniffy (acelerar)",
    pause: "Pausar",
    play: "Reanudar",
    reset: "Reiniciar rata",
    classical: "Condicionamiento clásico (CER)",
    cs: "Presentar tono (EC)",
    csUs: "Tono + choque (EC→EI)",
    us: "Choque (EI)",
    save: "Guardar",
    load: "Cargar",
    scenarios: "Escenarios",
  },

  schedules: {
    EXT: "Extinción (sin reforzador)",
    CRF: "Reforzamiento continuo (CRF)",
    FR: "Razón fija (RF)",
    VR: "Razón variable (RV)",
    FI: "Intervalo fijo (IF)",
    VI: "Intervalo variable (IV)",
  } as Record<string, string>,

  mind: {
    pressStrength: "Fuerza de presión de barra",
    nearBar: "Acercarse a la barra",
    rearAtBar: "Erguirse en la barra",
    soundFood: "Asociación sonido–comida",
    csUs: "Asociación tono–choque",
    fear: "Miedo / supresión",
  },

  stats: {
    time: "Tiempo",
    presses: "Respuestas",
    reinforcers: "Reforzadores",
    rate: "Tasa (resp/min)",
    suppression: "Razón de supresión",
  },

  behaviors: {
    wander: "explorando",
    sniff: "olfateando",
    rear: "erguida",
    groom: "acicalándose",
    approach_bar: "acercándose a la barra",
    press_bar: "presionando la barra",
    to_magazine: "yendo al comedero",
    eat: "comiendo",
    freeze: "congelada (miedo)",
  } as Record<string, string>,

  scenarioNames: {
    naive: "Rata ingenua (nueva)",
    magazine: "Entrenamiento de magazine",
    shaped: "Barra moldeada (lista para programas)",
    vr25: "Razón variable RV-25",
    cer: "Condicionamiento clásico (CER)",
  } as Record<string, string>,
};

export type Strings = typeof es;
