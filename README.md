<div align="center">

# 🪐 Cosmos Arcade
### Laboratorio Experimental de Minijuegos Creados por Inteligencia Artificial

[![Live Demo](https://img.shields.io/badge/DEMO%20EN%20VIVO-games.laniatek.online-00f0ff?style=for-the-badge&logo=cloudflare-pages&logoColor=white)](https://games.laniatek.online)
[![License: MIT](https://img.shields.io/badge/Licencia-MIT-a855f7?style=for-the-badge&logo=opensourceinitiative&logoColor=white)](LICENSE)
[![Vanilla JS](https://img.shields.io/badge/JavaScript-ES6+-f7df1e?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/es/docs/Web/JavaScript)
[![Three.js](https://img.shields.io/badge/Three.js-3D%20Graphics-white?style=for-the-badge&logo=threedotjs&logoColor=black)](https://threejs.org/)

<p align="center">
  <b>Un hub modular donde distintos modelos de Inteligencia Artificial (Gemini 3.7 Flash, 0x Alpha y más) compiten y colaboran creando experiencias interactivas nativas en el navegador.</b>
</p>

[🎮 Jugar Ahora](https://games.laniatek.online) • [📖 Arquitectura](#-arquitectura-modular) • [🕹️ Catálogo](#-catálogo-de-minijuegos) • [🚀 Agregar un Minijuego](#-cómo-agregar-un-nuevo-minijuego)

---

</div>

## 🌌 ¿De qué va este proyecto?

**Cosmos Arcade** es un portal web interactivo diseñado para albergar una colección creciente de minijuegos generados por Inteligencias Artificiales. 

Cada juego representa un desafío técnico y creativo donde se evalúan las capacidades de distintos modelos de IA para diseñar:
- 🎨 **Gráficos y Shaders:** Desde estética *retro neón* en 2D hasta entornos 3D en primera persona con Three.js.
- ⚙️ **Físicas y Balística:** Detección de colisiones, trayectorias de proyectiles y movimiento fluido.
- 🔊 **Audio Sintetizado:** Efectos sonoros posicionales 3D generados en tiempo real mediante la **Web Audio API**.
- 📱 **Soporte Móvil Universal:** Joysticks virtuales y esquemas táctiles adaptados para smartphones y tablets.

---

## 🏛️ Pilares del Proyecto

| Pilar | Descripción |
| :--- | :--- |
| **🛡️ Aislamiento Dimensional** | Los juegos se cargan en `<iframe>` independientes. Ningún script, variable global ni estilo CSS puede colisionar con el portal u otros juegos. |
| **🤖 Duelos & Autoría IA** | Cada título muestra qué IA lo programó, la complejidad algorítmica y las tecnologías empleadas. |
| **⚡ 100% Nativo en Navegador** | Cero descargas, cero frameworks pesados. Rendimiento a 60 FPS garantizado con JavaScript puro. |
| **📱 Multiplataforma** | Compatible con teclado y ratón en PC, y joysticks dinámicos en pantallas táctiles de celular o tablet. |

---

## 🕹️ Catálogo de Minijuegos

<table>
  <thead>
    <tr>
      <th width="25%">Minijuego</th>
      <th width="20%">IA Desarrolladora</th>
      <th width="15%">Dificultad</th>
      <th width="40%">Descripción y Tecnologías</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>
        <b>🏓 Neon Pong Arcade</b><br>
        <code>/games/neon-pong/</code>
      </td>
      <td><code>🤖 Gemini 3.7 Flash</code></td>
      <td>🟢 Fácil (1/5)</td>
      <td>
        Clásico Pong arcade con estética retro neón, IA táctica con predicción balística, efectos de partículas y Web Audio.<br>
        <small><b>Stack:</b> Canvas 2D • JavaScript • Web Audio API</small>
      </td>
    </tr>
    <tr>
      <td>
        <b>🧟 Brote Cero</b><br>
        <code>/games/brote-cero/</code>
      </td>
      <td><code>🤖 0x Alpha + Gemini 3.7 Flash</code></td>
      <td>🔴 Difícil (5/5)</td>
      <td>
        FPS 3D de supervivencia y terror contra oleadas infinitas. Incluye 6 tipos de zombis con habilidades especiales, 6 armas 3D, selector visual y audio espacial.<br>
        <small><b>Stack:</b> Three.js 3D • Web Audio API • nipple.js</small>
      </td>
    </tr>
    <tr>
      <td>
        <b>🌾 Granja Mágica 3D</b><br>
        <code>/games/farm-game/</code>
      </td>
      <td><code>🤖 MiMo V2.5 + Gemini 3.7 Flash + OpenAI Codex</code></td>
      <td>🟡 Media (3/5)</td>
      <td>
        Simulador 3D low-poly de granja: planta, riega, cosecha, cría animales, cocina y mejora tu terreno. OpenAI Codex aportó la mejora de jugabilidad, persistencia local y una carga autónoma del motor 3D.<br>
        <small><b>Stack:</b> Three.js 3D local • JavaScript modular • Web Audio API</small>
      </td>
    </tr>
  </tbody>
</table>

---

## 📂 Arquitectura del Repositorio

```text
minijuegos-random/
├── index.html              # Hub principal y visor de juegos
├── styles.css              # Sistema de diseño cósmico y responsive
├── main.js                 # Lógica del portal, filtros y starfield interactivo
├── games.json              # Manifiesto central de juegos registrados
├── LICENSE                 # Licencia libre MIT
├── README.md               # Documentación del proyecto
└── games/                  # Directorio de minijuegos independientes
    ├── neon-pong/          # Minijuego: Neon Pong Arcade
    │   ├── index.html      # Punto de entrada autónomo
    │   ├── style.css       # Estilos exclusivos del juego
    │   ├── script.js       # Lógica del juego
    │   └── thumbnail.svg   # Miniatura de galería
    └── brote-cero/         # Minijuego: Brote Cero
        ├── index.html      # Punto de entrada autónomo (Three.js)
        ├── style.css       # HUD y controles táctiles
        └── thumbnail.png   # Miniatura de galería
```

---

## 🚀 Cómo Agregar un Nuevo Minijuego

Cualquier desarrollador o Inteligencia Artificial puede añadir un minijuego siguiendo estas **3 reglas de oro**:

### 1. Crea la carpeta del juego
Dentro de `games/`, crea un directorio único para tu juego (por ejemplo: `games/mi-juego/`):
```text
games/mi-juego/
├── index.html
├── style.css
├── script.js (opcional)
└── thumbnail.png (16:9)
```

### 2. Hazlo 100% autónomo
- El archivo `index.html` debe ser jugable de forma directa en el navegador.
- Si usas librerías externas (como Three.js o PixiJS), cárgalas mediante CDNs oficiales en el propio `index.html`.
- Agrega controles táctiles para celulares si aplica.

### 3. Regístralo en `games.json`
Añade la entrada correspondiente en el archivo [`games.json`](games.json):

```json
{
  "id": "mi-juego",
  "titulo": "Nombre del Juego",
  "descripcion": "Breve descripción de la jugabilidad y objetivo del juego.",
  "dificultad": "medio",
  "dificultad_creacion": "Medio",
  "esfuerzo_ia": "Medio (3/5)",
  "ia": "Tu Modelo de IA",
  "tecnologia": "Canvas 2D / Web Audio",
  "carpeta": "games/mi-juego",
  "miniatura": "games/mi-juego/thumbnail.png"
}
```

El portal detectará el nuevo juego automáticamente y lo renderizará en la galería con sus filtros y visor de pantalla completa.

---

## 💻 Despliegue

Este proyecto está configurado para desplegarse automáticamente en **Cloudflare Pages** conectado a la rama `main`.

1. Clona el repositorio:
   ```bash
   git clone https://github.com/ElOmar3/minijuegos-random-con-ia.git
   ```
2. Ábrelo con cualquier servidor local estático (como Live Server en VS Code o `npx serve .`).

---

## 📄 Licencia

Este proyecto está bajo la Licencia **MIT**. Consulta el archivo [LICENSE](LICENSE) para más detalles.

---

<div align="center">
  <sub>Desarrollado con ❤️ para la experimentación abierta de Inteligencias Artificiales en la Web.</sub>
</div>
