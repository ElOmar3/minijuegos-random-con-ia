# Créditos — Pancha la Cucaracha

## Juego
- **Concepto y diseño:** Omar (`ElOmar3`)
- **Stack:** Phaser 3, nipple.js (joystick virtual), JavaScript modular

## Mejoras v2.0.0 (2026-08-27)
Implementadas con asistencia de IA.

### Mecánicas nuevas
- Sistema de **linterna de muñeca** con tres modos de movimiento:
  patrulla por waypoints, barrido angular y persecución lenta.
  Hasta 3 linternas simultáneas en el nivel jefe.
- **Exposición crítica letal:** si la barra de sigilo llega al tope,
  Pancha muere por luz (no solo por chancla).
- **Chanclas inteligentes con predicción (patrón `aim`):** predicen la
  posición del jugador 0.35 s adelante y dibujan una flecha roja
  indicando hacia dónde caerán.
- **Zonas de luz dinámicas con temporizador:** se encienden y apagan
  rítmicamente, obligando a memorizar el ciclo.
- **Sistema de vidas (5)** con indicadores en el HUD, partículas y
  anillos de impacto al recibir chanclazos.

### Niveles (8 en total)
1. La cocina (tutorial)
2. Más ojos arriba
3. La hora pico
4. **La linterna** — primera vez con linterna
5. **Cocina dividida** — dos linternas en barrido angular
6. **Doble acecho** — dos linternas + chanclas rápidas
7. **La trampa** — zonas dinámicas + chanclas que persiguen
8. **La hora del juicio (jefe)** — linterna perseguidora + 2巡逻 + todas las chanclas

### Pulido visual y de lógica
- Pancha: patas articuladas, antenas con bulbo, ojos compuestos,
  doble brillo en el caparazón, sombra propia, segmentos abdominales.
- Chancla: sombra dura, gradiente de cuero, trama perpendicular,
  tira con brillo y nudo decorativo.
- Baldosas con vetas curvas y juntas con sombra interior.
- Nido con halo cálido y grietas realistas.
- Migas con migajas dispersas, porosidad y brillo.
- HUD con marca de "crítico" en la barra de sigilo.
- Anillos de impacto expansivos en chanclazos, flash de cámara mejorado.

### Cómo abrir el juego
- **Doble clic en `index.html`** — funciona vía `file://` (compatible con
  la convención del portal, sin necesidad de servidor).
- O cargarlo desde el portal `index.html`.

## Colaboradores
Este minijuego fue desarrollado con asistencia del modelo de IA
**MiniMax-M3** (minimax-m3) de opencode-go, integrado en opencode.
El modelo asistió con el diseño de mecánicas, implementación de sistemas,
pulido visual, balance de dificultad y validación headless con
Chrome DevTools Protocol.
