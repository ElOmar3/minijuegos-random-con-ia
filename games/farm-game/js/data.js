/* ==========================================================================
   GAME DATABASE: CROPS, ANIMALS, RECIPES, UPGRADES, MISSIONS
   ========================================================================== */

export const CROPS = {
  wheat:      { nm: 'Trigo',        em: '🌾', gt: 6,  buy: 5,   sell: 12,  col: 0xDAA520, unlockLvl: 1 },
  carrot:     { nm: 'Zanahoria',    em: '🥕', gt: 12, buy: 10,  sell: 24,  col: 0xFF8C00, unlockLvl: 1 },
  tomato:     { nm: 'Tomate',       em: '🍅', gt: 18, buy: 18,  sell: 42,  col: 0xFF3D00, unlockLvl: 2 },
  pumpkin:    { nm: 'Calabaza',     em: '🎃', gt: 26, buy: 30,  sell: 75,  col: 0xFF6F00, unlockLvl: 3 },
  strawberry: { nm: 'Fresa',        em: '🍓', gt: 36, buy: 45,  sell: 120, col: 0xE91E63, unlockLvl: 4 },
  corn:       { nm: 'Maíz',         em: '🌽', gt: 48, buy: 60,  sell: 170, col: 0xFFD600, unlockLvl: 5 },
  watermelon: { nm: 'Sandía',       em: '🍉', gt: 60, buy: 85,  sell: 250, col: 0x2E7D32, unlockLvl: 6 },
  sunflower:  { nm: 'Girasol Oro',  em: '🌻', gt: 80, buy: 120, sell: 400, col: 0xFFEA00, unlockLvl: 7 }
};

export const ANIMALS = {
  chicken: { nm: 'Gallina', em: '🐔', buy: 60,  res: '🥚', rn: 'Huevo',   rate: 10, sp: 15, unlockLvl: 1 },
  cow:     { nm: 'Vaca',    em: '🐮', buy: 180, res: '🥛', rn: 'Leche',   rate: 16, sp: 35, unlockLvl: 2 },
  sheep:   { nm: 'Oveja',   em: '🐑', buy: 350, res: '🧶', rn: 'Lana',    rate: 24, sp: 65, unlockLvl: 3 },
  pig:     { nm: 'Cerdito', em: '🐷', buy: 600, res: '🍄', rn: 'Trufa',   rate: 32, sp: 120, unlockLvl: 4 }
};

export const RECIPES = {
  bread:    { nm: 'Pan Casero',        em: '🍞', req: { '🌾': 2 },                  sell: 35,  xp: 15 },
  cheese:   { nm: 'Queso Añejo',       em: '🧀', req: { '🥛': 2 },                  sell: 90,  xp: 25 },
  pie:      { nm: 'Pastel de Calabaza',em: '🥧', req: { '🎃': 1, '🥚': 1, '🌾': 1 }, sell: 220, xp: 55 },
  cake:     { nm: 'Tarta de Fresa',    em: '🍰', req: { '🍓': 2, '🥛': 1, '🥚': 1 }, sell: 320, xp: 80 },
  pizza:    { nm: 'Pizza Rústica',     em: '🍕', req: { '🍅': 2, '🌾': 1, '🍄': 1 }, sell: 420, xp: 110 },
  popcorn:  { nm: 'Palomitas de Maíz', em: '🍿', req: { '🌽': 2 },                  sell: 380, xp: 95 }
};

export const UPGRADES = [
  { id: 'water',  nm: 'Aspersor Automático', desc: 'Riega cultivos solos al amanecer', base: 150, mult: 2.2, max: 3 },
  { id: 'speed',  nm: 'Fertilizante Mágico', desc: '-15% tiempo de crecimiento',      base: 100, mult: 2.0, max: 4 },
  { id: 'inv',    nm: 'Mochila de Cuero',    desc: '+15 espacio de inventario',        base: 80,  mult: 1.8, max: 5 },
  { id: 'market', nm: 'Puesto de Mercado',   desc: '+15% precio de venta total',       base: 120, mult: 2.1, max: 4 }
];

export const MISSIONS = [
  { txt: '🌱 Sembrar 3 cultivos', check: g => g.stats.planted >= 3, rwCoins: 40, rwXP: 25 },
  { txt: '🌾 Cosechar 5 cultivos', check: g => g.stats.harvested >= 5, rwCoins: 60, rwXP: 35 },
  { txt: '🐔 Comprar una gallina', check: g => g.stats.animalsBought >= 1, rwCoins: 80, rwXP: 45 },
  { txt: '💰 Ganar 200 monedas vendiendo', check: g => g.stats.totalEarned >= 200, rwCoins: 100, rwXP: 60 },
  { txt: '🍞 Cocinar un Pan en el molino', check: g => g.stats.cooked >= 1, rwCoins: 120, rwXP: 75 },
  { txt: '🥕 Cosechar 10 zanahorias', check: g => g.stats.harvested >= 10, rwCoins: 150, rwXP: 90 },
  { txt: '⭐ Alcanzar el Nivel 3 de granja', check: g => g.level >= 3, rwCoins: 250, rwXP: 150 }
];
