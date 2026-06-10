# Sniffy — La Rata Virtual (versión web)

Simulador web de **condicionamiento operante y clásico** en una caja de Skinner,
para la enseñanza de la psicología del aprendizaje. Reimplementación propia,
ejecutable 100% en el navegador, inspirada en el clásico *Sniffy the Virtual Rat*.

> Este repositorio también conserva, como referencia histórica, los instaladores
> y la documentación del programa original de Windows.

## Características (primer corte)

- **Motor de simulación** determinista (semilla reproducible) que reproduce los
  fenómenos canónicos:
  - Entrenamiento de magazine (asociación sonido–comida, reforzador secundario).
  - Moldeamiento por aproximaciones sucesivas (fuerza de acción).
  - Programas de reforzamiento: CRF, RF, RV, IF, IV, y extinción.
  - Condicionamiento clásico / CER: asociación tono–choque (Rescorla-Wagner),
    miedo condicionado y razón de supresión.
- **Caja de Skinner 2.5D** dibujada de forma procedural (Canvas 2D): iluminación,
  sombras y perspectiva, con la rata orientada según su movimiento y su postura
  según la conducta (pelaje con degradado, bigotes, parpadeo).
- **Registro acumulativo** en vivo con marcas de reforzador (firmas de cada programa).
- **Sesión CER automática**: protocolo de ensayos línea base/EC con medición de
  la razón de supresión y gráfica de adquisición/extinción.
- **Ventanas de la mente**: visualización en tiempo real de las variables internas.
- **Panel de control**: dar comida, fijar programa, presentar EC/EI, "Aislar a
  Sniffy" (acelerar el tiempo), escenarios precargados, y guardar/cargar (local).
- Interfaz en **español**.

## Desarrollo

```bash
npm install
npm run dev       # servidor de desarrollo
npm test          # tests del motor (Vitest)
npm run build     # build estático en dist/
npm run preview   # sirve el build
```

## Arquitectura

El **motor** (`src/engine/`) no depende de la UI y es testeable de forma
*headless*. El **render** (`src/scene/`) y la **interfaz** (`src/ui/`) solo leen
el estado del motor. Esta separación permite acelerar el tiempo y, en el futuro,
añadir cuentas/backend sin reescribir el núcleo.

### Estructura

```
src/
  engine/       # Motor de simulación (modelo de aprendizaje), con tests
  scene/        # Render 2.5D de la caja de Skinner y la rata (Canvas 2D)
  ui/           # Ventanas de React: registro acumulativo, ventanas de la mente, controles
  data/         # i18n (es) y escenarios precargados
  persistence/  # Guardar/cargar/exportar experimentos
```
