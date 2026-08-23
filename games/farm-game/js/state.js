/* ==========================================================================
   GAME STATE & PERSISTENCE
   ========================================================================== */

import { sfxLevelUp } from './audio.js';

export const g = {
  coins: 100,
  gems: 5,
  level: 1,
  xp: 0,
  xpNext: 60,
  day: 1,
  timeMin: 480, // 08:00
  inventory: {},
  animals: [
    { type: 'chicken', x: -10, z: 4, tx: -10, tz: 4, timer: 0 }
  ],
  upgrades: { water: 0, speed: 0, inv: 0, market: 0 },
  activeTool: 'hand',
  missionIdx: 0,
  // Estado de las parcelas. Se rellena desde crops.js al iniciar la escena.
  plots: [],
  stats: {
    planted: 0,
    harvested: 0,
    sold: 0,
    totalEarned: 0,
    cooked: 0,
    animalsBought: 0
  }
};

const SAVE_KEY = 'granja_3d_state_v2';

export function saveGame() {
  try {
    const data = {
      coins: g.coins, gems: g.gems, level: g.level, xp: g.xp, xpNext: g.xpNext,
      day: g.day, timeMin: g.timeMin, inventory: g.inventory,
      animals: g.animals.map(a => ({ type: a.type })),
      upgrades: g.upgrades, missionIdx: g.missionIdx, stats: g.stats,
      plots: g.plots
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch(e) {}
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    Object.assign(g, data);
    g.plots = Array.isArray(data.plots) ? data.plots : [];
    g.inventory = data.inventory || {};
    g.upgrades = { water: 0, speed: 0, inv: 0, market: 0, ...(data.upgrades || {}) };
    g.stats = {
      planted: 0, harvested: 0, sold: 0, totalEarned: 0, cooked: 0, animalsBought: 0,
      ...(data.stats || {})
    };
    g.animals = (Array.isArray(data.animals) && data.animals.length > 0)
      ? data.animals.map((a, i) => ({
          type: a.type || 'chicken',
          x: -10 - (i % 3) * 2,
          z: 4 + Math.floor(i / 3) * 2,
          tx: -10 - (i % 3) * 2,
          tz: 4 + Math.floor(i / 3) * 2,
          timer: 0
        }))
      : [{ type: 'chicken', x: -10, z: 4, tx: -10, tz: 4, timer: 0 }];
  } catch(e) {
    console.error('Error al cargar partida:', e);
  }
}

export function countInv() {
  let c = 0;
  for (let k in g.inventory) c += g.inventory[k] || 0;
  return c;
}

export function getInvMax() {
  return 30 + (g.upgrades.inv || 0) * 15;
}

export function getPriceMult() {
  return 1 + (g.upgrades.market || 0) * 0.15;
}

export function addXP(amt, onLevelUpToast) {
  g.xp += amt;
  while (g.xp >= g.xpNext) {
    g.xp -= g.xpNext;
    g.level++;
    g.xpNext = Math.floor(g.xpNext * 1.45);
    g.coins += g.level * 50;
    g.gems += 2;
    sfxLevelUp();
    if (onLevelUpToast) onLevelUpToast(g.level);
  }
}
