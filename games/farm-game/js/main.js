/* ==========================================================================
   MAIN GAME CONTROLLER & LOOP
   ========================================================================== */

import { initWorld, renderer, scene, camera, windmillBlades, updateDayNight } from './world.js';
import { initPlayer, player, updatePlayer } from './player.js';
import { initCrops, plots, updateCrops, plantPlot, waterPlot, harvestPlot, resetDailyWater, syncPlotsToState } from './crops.js';
import { initAnimals, updateAnimals } from './animals.js';
import { g, loadGame, saveGame, countInv, getInvMax, addXP } from './state.js';
import { initAudio, toggleAudio } from './audio.js';
import { CROPS } from './data.js';
import {
  updateHUD,
  openShop,
  openInv,
  openKitchen,
  openUpgrades,
  sellAll,
  checkMissions,
  closeModal,
  toast
} from './ui.js';

let currentAction = null;
let lastTime = performance.now();
let lastHUDUpdate = 0;
let lastAutosave = 0;

function init() {
  loadGame();
  
  const container = document.getElementById('webgl-container');
  initWorld(container);
  initPlayer();
  initCrops(g);
  initAnimals(g);
  
  setupUIEvents();
  updateHUD(g);

  // La partida se conserva al cerrar la pestaña y cada pocos segundos.
  window.addEventListener('beforeunload', saveProgress);
  
  requestAnimationFrame(gameLoop);
}

function setupUIEvents() {
  // Sound & Modals
  document.getElementById('snd-toggle').onclick = toggleAudio;
  document.getElementById('btn-shop').onclick = () => openShop(g, selectTool);
  document.getElementById('btn-inv').onclick = () => openInv(g);
  document.getElementById('btn-cook').onclick = () => openKitchen(g);
  document.getElementById('btn-upg').onclick = () => openUpgrades(g);
  document.getElementById('btn-sell').onclick = () => sellAll(g);
  document.getElementById('action-prompt').onclick = triggerAction;
  
  const mobAct = document.getElementById('btn-mobile-act');
  if (mobAct) mobAct.onclick = triggerAction;

  document.getElementById('overlay').onclick = e => {
    if (e.target.id === 'overlay') closeModal();
  };

  // Hotbar Slot Selection
  const tools = ['hand', 'water', 'wheat', 'carrot', 'tomato', 'pumpkin', 'strawberry', 'corn', 'watermelon', 'sunflower'];
  tools.forEach(t => {
    const el = document.getElementById('slot-' + t);
    if (el) el.onclick = () => selectTool(t);
  });

  // Spacebar to trigger action
  window.addEventListener('keydown', e => {
    if (e.target.matches('input, textarea, select')) return;
    if (e.code === 'Space' || e.key.toLowerCase() === 'e') {
      e.preventDefault();
      triggerAction();
    }
    const shortcutTools = ['hand', 'water', 'wheat', 'carrot', 'tomato', 'pumpkin', 'strawberry', 'corn', 'watermelon', 'sunflower'];
    const shortcut = e.key === '0' ? 9 : Number(e.key) - 1;
    if (Number.isInteger(shortcut) && shortcut >= 0 && shortcut < shortcutTools.length) {
      e.preventDefault();
      selectTool(shortcutTools[shortcut]);
    }
  });
}

function selectTool(toolKey) {
  if (CROPS[toolKey] && CROPS[toolKey].unlockLvl > g.level) {
    toast(`🔒 Se desbloquea en Nivel ${CROPS[toolKey].unlockLvl}`);
    return;
  }
  g.activeTool = toolKey;
  document.querySelectorAll('.tool-slot').forEach(el => el.classList.remove('active'));
  const el = document.getElementById('slot-' + toolKey);
  if (el) el.classList.add('active');
}

function checkPlotProximity() {
  const px = player.position.x;
  const pz = player.position.z;
  const promptEl = document.getElementById('action-prompt');

  let nearestPlot = null;
  let minDist = 2.1;

  for (let p of plots) {
    const dist = Math.hypot(px - p.mesh.position.x, pz - p.mesh.position.z);
    if (dist < minDist) {
      minDist = dist;
      nearestPlot = p;
    }
  }

  const showPrompt = (icon, text, action = null) => {
    currentAction = action;
    document.getElementById('prompt-icon').textContent = icon;
    document.getElementById('prompt-txt').textContent = text;
    promptEl.style.display = 'flex';
  };

  if (nearestPlot) {
    if (!nearestPlot.planted) {
      if (!CROPS[g.activeTool]) {
        showPrompt('🌱', 'Elige una semilla para plantar');
        return;
      }
      const cropKey = g.activeTool;
      const c = CROPS[cropKey];
      showPrompt('🌱', `Plantar ${c.nm} (${c.buy}🪙)`, () => {
        if (plantPlot(nearestPlot, cropKey, g)) {
          saveProgress();
          updateHUD(g);
          checkPlotProximity();
        } else {
          toast('🪙 Monedas insuficientes');
        }
      });
      return;
    } else if (nearestPlot.ready) {
      if (g.activeTool !== 'hand') {
        showPrompt('✋', 'Selecciona Mano para cosechar');
        return;
      }
      showPrompt('✨', `Cosechar ${CROPS[nearestPlot.planted].nm}`, () => {
        if (countInv() >= getInvMax()) {
          toast('🎒 Mochila llena');
          return;
        }
        const crop = harvestPlot(nearestPlot, g);
        addXP(8, lvl => toast(`⭐ ¡Nivel ${lvl}!`));
        toast(`+1 ${crop.em} ${crop.nm}`);
        saveProgress();
        updateHUD(g);
        checkPlotProximity();
      });
      return;
    } else if (!nearestPlot.watered) {
      if (g.activeTool !== 'water') {
        showPrompt('💧', 'Selecciona Regar para cuidar el cultivo');
        return;
      }
      showPrompt('💧', 'Regar cultivo', () => {
        waterPlot(nearestPlot, g);
        saveProgress();
        checkPlotProximity();
      });
      return;
    }

    const crop = CROPS[nearestPlot.planted];
    const progress = Math.min(99, Math.floor(((nearestPlot.stage - 1 + nearestPlot.progress) / 2) * 100));
    showPrompt(crop.em, `${crop.nm} creciendo · ${progress}%`);
    return;
  }

  currentAction = null;
  promptEl.style.display = 'none';
}

function triggerAction() {
  if (document.getElementById('overlay').classList.contains('on')) return;
  initAudio();
  if (currentAction) currentAction();
}

function saveProgress() {
  syncPlotsToState(g);
  saveGame();
}

function gameLoop(now) {
  requestAnimationFrame(gameLoop);
  const dt = Math.min(0.1, (now - lastTime) / 1000);
  lastTime = now;

  // Clock & Day Progression
  g.timeMin += dt * 4.5;
  if (g.timeMin >= 1440) {
    g.timeMin = 0;
    g.day++;
    resetDailyWater(g);
    saveProgress();
    toast(`🌅 ¡Comienza el Día ${g.day}!`);
    updateHUD(g);
  }

  updateDayNight(g.timeMin);
  windmillBlades.rotation.z += dt * 1.5;

  updatePlayer(dt, g.activeTool);
  updateCrops(dt, g);
  updateAnimals(dt, g, player.position);
  checkPlotProximity();
  checkMissions(g);

  if (now - lastHUDUpdate > 500) {
    updateHUD(g);
    lastHUDUpdate = now;
  }
  if (now - lastAutosave > 5000) {
    saveProgress();
    lastAutosave = now;
  }

  renderer.render(scene, camera);
}

// Start game when page loads
window.addEventListener('DOMContentLoaded', init);
