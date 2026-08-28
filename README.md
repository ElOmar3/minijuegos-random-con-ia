<div align="center">

# 🪐 Cosmos Arcade
### Catálogo abierto de minijuegos web creados y mejorados con inteligencia artificial

[![Jugar](https://img.shields.io/badge/JUGAR-games.laniatek.online-00f0ff?style=for-the-badge&logo=cloudflare-pages&logoColor=white)](https://games.laniatek.online)
[![License: MIT](https://img.shields.io/badge/Licencia-MIT-a855f7?style=for-the-badge&logo=opensourceinitiative&logoColor=white)](LICENSE)
[![Static Site](https://img.shields.io/badge/Sitio-estático-f7df1e?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/es/docs/Web/JavaScript)

**Seis experiencias jugables, desde Pong y estrategia hasta granjas, sigilo y supervivencia 3D, reunidas en un portal que permite comparar cómo distintos modelos de IA diseñan, programan y evolucionan videojuegos.**

[🎮 Jugar ahora](https://games.laniatek.online) · [🕹️ Ver catálogo](#-catálogo-actual) · [📂 Entender la arquitectura](#-arquitectura) · [➕ Agregar un juego](#-cómo-agregar-un-minijuego)

</div>

## 🌌 ¿Qué es Cosmos Arcade?

Cosmos Arcade es un portal y laboratorio abierto de **minijuegos web creados colaborativamente con modelos de inteligencia artificial**. Cada título plantea un reto distinto —diseño de mecánicas, IA de enemigos, gráficos 2D o 3D, audio, controles táctiles y optimización— y conserva públicamente los créditos de los modelos que participaron.

El proyecto busca producir juegos pequeños pero completos, iterarlos con aportaciones de distintas IAs y mantenerlos fáciles de ejecutar, estudiar y desplegar. No existe un proceso de compilación obligatorio: el portal y los juegos se sirven como archivos estáticos mediante HTML, CSS, JavaScript y módulos ES nativos, con librerías de navegador cuando cada experiencia las necesita.

> **Nota de autoría:** **0x Alpha** es el alias utilizado en este proyecto por **GLM 5.3 Flash**. Los créditos se muestran como **GLM 5.3 Flash (0x Alpha)** para conservar la referencia histórica y dejar claro qué modelo realizó el trabajo.

## ⚙️ Cómo funciona

| Capa | Responsabilidad |
| :--- | :--- |
| **Portal** | `index.html`, `styles.css` y `main.js` construyen la galería, búsqueda, filtros y visor. |
| **Catálogo** | `games.json` contiene títulos, créditos, tecnologías, versiones y rutas. |
| **Minijuegos** | Cada carpeta de `games/` es una aplicación autónoma que se abre dentro de un `<iframe>`. |
| **Despliegue** | Todo el repositorio puede publicarse directamente como sitio estático, sin bundler ni servidor de aplicación. |

Este aislamiento permite que convivan juegos con Canvas 2D, Three.js, Phaser, Web Audio y diferentes organizaciones internas sin mezclar estilos o variables globales.

## 🕹️ Catálogo actual

| Minijuego | Experiencia | Autoría IA | Tecnología principal |
| :--- | :--- | :--- | :--- |
| **👑 Reinos en 60** | Estrategia y defensa 3D: crea una economía, fortifica el reino y resiste seis oleadas. | OpenAI Codex | Three.js, JavaScript, Web Audio |
| **🌊 El Abismo 3D: Deepcore Protocol** | Supervivencia submarina con oxígeno, reparaciones, cooperación e interacción con criaturas NTI. | Gemini 3.7 Flash | Three.js, módulos JS, Web Audio |
| **🏓 Neon Pong Arcade** | Pong retro neón con rival táctico, predicción de trayectoria, partículas y controles táctiles. | Gemini 3.7 Flash | Canvas 2D, JavaScript, Web Audio |
| **🧟 Brote Cero** | FPS 3D de terror y supervivencia con oleadas, seis armas, economía, objetivos y builds de perks. | GLM 5.3 Flash (0x Alpha), Gemini 3.7 Flash y OpenAI Codex (Sol) | Three.js, módulos ES, Web Audio, nipple.js |
| **🌾 Granja Mágica 3D** | Aventura low-poly de cultivo, cocina, animales, mejoras y progreso persistente. | MiMo V2.5, Gemini 3.7 Flash, GPT Terra y OpenAI Codex | Three.js, módulos JS, Web Audio |
| **🪳 Pancha la Cucaracha** | Sigilo en una cocina: evita chanclas, linternas y zonas de exposición a lo largo de ocho niveles. | GLM 5.3 Flash (0x Alpha) | Phaser 3, JavaScript, nipple.js |

Los datos que muestra el portal proceden de [`games.json`](games.json), que actúa como fuente única del catálogo.

## 🧭 Principios del proyecto

- **Sitio estático y autónomo:** sin Vite, npm, bundlers ni toolchains obligatorias.
- **Juegos independientes:** cada experiencia mantiene sus propios recursos, estilos y lógica.
- **Autoría transparente:** el catálogo identifica los modelos que crearon o mejoraron cada juego.
- **Iteración práctica:** las colaboraciones mejoran mecánicas, presentación, accesibilidad y estabilidad sobre juegos funcionales.
- **Navegador primero:** soporte para PC y, cuando la mecánica lo permite, controles móviles y táctiles.

## 📂 Arquitectura

```text
minijuegos-random/
├── index.html                         # Portal y visor aislado
├── styles.css                         # Diseño visual del portal
├── main.js                            # Catálogo, búsqueda, filtros y navegación
├── games.json                         # Manifiesto central de minijuegos
├── README.md
└── games/
    ├── reinos-en-60/                  # Estrategia y defensa 3D
    ├── el-abismo/                     # Supervivencia submarina 3D
    ├── neon-pong/                     # Arcade 2D
    ├── brote-cero/                    # FPS 3D modular con ES modules
    ├── farm-game/                     # Simulador de granja 3D
    └── pancha-la-cucaracha/           # Sigilo 2D con Phaser
```

La implementación interna puede variar según el juego. Por ejemplo, **Brote Cero** separa su ciclo, estado, entrada, audio, HUD, mundo, enemigos y directores en módulos ES nativos; otros títulos conservan una estructura más compacta cuando resulta suficiente.

## 💻 Ejecutarlo localmente

Clona el repositorio y sirve la carpeta con cualquier servidor HTTP estático. Con Python:

```bash
git clone https://github.com/ElOmar3/minijuegos-random-con-ia.git
cd minijuegos-random-con-ia
python -m http.server 4173
```

Después abre `http://localhost:4173`. Algunos juegos también admiten apertura directa, pero el servidor local evita restricciones del navegador al cargar módulos y archivos JSON.

## ➕ Cómo agregar un minijuego

1. Crea una carpeta autónoma dentro de `games/` con un `index.html` como punto de entrada.
2. Incluye sus recursos y una miniatura en esa misma carpeta.
3. Registra el juego en `games.json`:

```json
{
  "id": "mi-juego",
  "titulo": "Nombre del juego",
  "descripcion": "Objetivo y mecánica principal.",
  "dificultad": "medio",
  "dificultad_creacion": "Media",
  "esfuerzo_ia": "Medio (3/5)",
  "ia": "Modelo o modelos participantes",
  "tecnologia": "Canvas 2D / Web Audio",
  "version": "v1.0.0",
  "fecha_modificacion": "2026-08-27",
  "cambios": ["Primera versión jugable."],
  "carpeta": "games/mi-juego",
  "miniatura": "games/mi-juego/thumbnail.png"
}
```

El portal incorporará automáticamente la nueva entrada a la galería, la búsqueda y los filtros.

## 🚀 Despliegue

La rama `main` se publica como sitio estático en Cloudflare Pages. Al no requerir compilación, el directorio raíz del repositorio es también el contenido desplegable.

## 📄 Licencia

Este proyecto se distribuye bajo la [Licencia MIT](LICENSE).

<div align="center">
  <sub>Experimentación abierta: distintas IAs, un mismo arcade, juegos que siguen evolucionando.</sub>
</div>
