/* ==========================================================================
   UI CONTROLLER & MODALS
   ========================================================================== */

import { CROPS, ANIMALS, RECIPES, UPGRADES, MISSIONS } from './data.js';
import { countInv, getInvMax, getPriceMult, addXP } from './state.js';
import { sfxSell, sfxBuy, sfxHarvest, sfxGolden } from './audio.js';
import { spawnAnimalMesh } from './animals.js';

export function toast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.style.display = 'block';
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.style.display = 'none'; }, 2400);
}

export function updateHUD(g) {
  document.getElementById('coins').textContent = g.coins.toLocaleString();
  document.getElementById('gems').textContent = g.gems;
  document.getElementById('lvl').textContent = g.level;
  
  const xpPct = Math.min(100, Math.floor((g.xp / g.xpNext) * 100));
  document.getElementById('xp-bar').style.width = xpPct + '%';

  document.getElementById('day').textContent = g.day;
  const hh = String(Math.floor(g.timeMin / 60)).padStart(2, '0');
  const mm = String(Math.floor(g.timeMin % 60)).padStart(2, '0');
  document.getElementById('time-str').textContent = `${hh}:${mm}`;
  document.getElementById('inv-count').textContent = `${countInv()}/${getInvMax()}`;

  const mission = MISSIONS[g.missionIdx];
  if (mission) {
    document.getElementById('mission-txt').textContent = `${mission.txt} (+${mission.rwCoins}🪙)`;
  } else {
    document.getElementById('mission-txt').textContent = '🏆 ¡Todas las misiones completadas!';
  }
}

export function openModal(html) {
  const m = document.getElementById('modal');
  m.innerHTML = html;
  document.getElementById('overlay').classList.add('on');
}

export function closeModal() {
  document.getElementById('overlay').classList.remove('on');
}

// 1. SHOP MODAL
export function openShop(g, onSelectCrop) {
  let h = `<h2>🛒 Tienda del Granjero</h2>`;
  h += `<h3 style="font-size:13px;color:#FFE082;margin:8px 0 4px;">🌱 Semillas</h3>`;

  for (let k in CROPS) {
    const c = CROPS[k];
    const locked = c.unlockLvl > g.level;
    const canAfford = g.coins >= c.buy;
    h += `<div class="si-card">
      <div class="si-icon">${c.em}</div>
      <div class="si-info">
        <div class="si-nm">${c.nm} ${locked ? '🔒 (Nv.'+c.unlockLvl+')' : ''}</div>
        <div class="si-ds">Crece: ${c.gt}s · Venta: ${Math.floor(c.sell * getPriceMult())}🪙</div>
      </div>
      <button class="bb-action buy" id="buy-crop-${k}" ${locked || !canAfford ? 'disabled' : ''}>
        ${c.buy} 🪙
      </button>
    </div>`;
  }

  h += `<h3 style="font-size:13px;color:#FFE082;margin:12px 0 4px;">🐔 Animales</h3>`;
  for (let k in ANIMALS) {
    const a = ANIMALS[k];
    const count = g.animals.filter(x => x.type === k).length;
    const locked = a.unlockLvl > g.level;
    const canAfford = g.coins >= a.buy;
    h += `<div class="si-card">
      <div class="si-icon">${a.em}</div>
      <div class="si-info">
        <div class="si-nm">${a.nm} (Tienes: ${count})</div>
        <div class="si-ds">Produce ${a.res} cada ${a.rate}s · Vende: ${a.sp}🪙</div>
      </div>
      <button class="bb-action buy" id="buy-anim-${k}" ${locked || !canAfford ? 'disabled' : ''}>
        ${a.buy} 🪙
      </button>
    </div>`;
  }

  h += `<button class="bcl" id="close-modal-btn">Cerrar</button>`;
  openModal(h);

  // Bind events
  document.getElementById('close-modal-btn').onclick = closeModal;
  for (let k in CROPS) {
    const b = document.getElementById(`buy-crop-${k}`);
    if (b) b.onclick = () => { onSelectCrop(k); closeModal(); };
  }
  for (let k in ANIMALS) {
    const b = document.getElementById(`buy-anim-${k}`);
    if (b) b.onclick = () => buyAnimal(k, g, onSelectCrop);
  }
}

function buyAnimal(k, g, onSelectCrop) {
  const a = ANIMALS[k];
  if (g.coins < a.buy) return;
  g.coins -= a.buy;
  g.stats.animalsBought = (g.stats.animalsBought || 0) + 1;
  const newAnimal = { type: k, x: -11, z: 7, tx: -11, tz: 7, timer: 0 };
  g.animals.push(newAnimal);
  spawnAnimalMesh(newAnimal);
  sfxBuy();
  toast(`🎉 ¡Has comprado un(a) ${a.nm}!`);
  updateHUD(g);
  openShop(g, onSelectCrop);
}

// 2. INVENTORY MODAL
export function openInv(g) {
  let h = `<h2>🎒 Mochila de Productos</h2>`;
  h += `<p style="text-align:center;font-size:12px;color:#D7CCC8;margin-bottom:8px">Espacio: ${countInv()}/${getInvMax()}</p>`;

  let hasAny = false;
  for (let icon in g.inventory) {
    const amt = g.inventory[icon];
    if (amt > 0) {
      hasAny = true;
      h += `<div class="si-card">
        <div class="si-icon">${icon}</div>
        <div class="si-info"><div class="si-nm">Cantidad: x${amt}</div></div>
        <button class="bb-action sell" id="sell-item-${icon}">Vender</button>
      </div>`;
    }
  }

  if (!hasAny) h += `<p style="text-align:center;padding:16px;">Mochila vacía. ¡Cosecha productos!</p>`;
  h += `<button class="bcl" id="close-modal-btn">Cerrar</button>`;
  openModal(h);

  document.getElementById('close-modal-btn').onclick = closeModal;
  for (let icon in g.inventory) {
    const btn = document.getElementById(`sell-item-${icon}`);
    if (btn) btn.onclick = () => sellSingle(icon, g);
  }
}

function sellSingle(icon, g) {
  const amt = g.inventory[icon] || 0;
  if (amt <= 0) return;
  let price = 15;
  for (let k in CROPS) {
    if (CROPS[k].em === icon) price = CROPS[k].sell;
    if ('✨' + CROPS[k].em === icon) price = CROPS[k].sell * 4;
  }
  for (let k in ANIMALS) if (ANIMALS[k].res === icon) price = ANIMALS[k].sp;
  for (let k in RECIPES) if (RECIPES[k].em === icon) price = RECIPES[k].sell;

  const total = Math.floor(price * getPriceMult()) * amt;
  g.coins += total;
  g.stats.sold += amt;
  g.stats.totalEarned += total;
  g.inventory[icon] = 0;
  sfxSell();
  toast(`💰 +${total} monedas obtenidas`);
  updateHUD(g);
  openInv(g);
}

export function sellAll(g) {
  let total = 0, count = 0;
  for (let icon in g.inventory) {
    const amt = g.inventory[icon];
    if (amt > 0) {
      let price = 15;
      for (let k in CROPS) {
        if (CROPS[k].em === icon) price = CROPS[k].sell;
        if ('✨' + CROPS[k].em === icon) price = CROPS[k].sell * 4;
      }
      for (let k in ANIMALS) if (ANIMALS[k].res === icon) price = ANIMALS[k].sp;
      for (let k in RECIPES) if (RECIPES[k].em === icon) price = RECIPES[k].sell;

      total += Math.floor(price * getPriceMult()) * amt;
      count += amt;
      g.inventory[icon] = 0;
    }
  }

  if (count === 0) { toast('🎒 Nada para vender'); return; }
  g.coins += total;
  g.stats.sold += count;
  g.stats.totalEarned += total;
  sfxSell();
  toast(`💰 ¡Has vendido ${count} productos por ${total} monedas!`);
  updateHUD(g);
}

// 3. KITCHEN / RECIPES
export function openKitchen(g) {
  let h = `<h2>🍳 Molino & Cocina</h2>`;
  h += `<p style="text-align:center;font-size:11px;color:#D7CCC8;margin-bottom:10px">Elabora recetas deliciosas de alto valor</p>`;

  for (let k in RECIPES) {
    const r = RECIPES[k];
    let canCook = true;
    let reqArr = [];
    for (let ing in r.req) {
      const have = g.inventory[ing] || 0;
      const need = r.req[ing];
      reqArr.push(`${ing} ${have}/${need}`);
      if (have < need) canCook = false;
    }

    h += `<div class="si-card">
      <div class="si-icon">${r.em}</div>
      <div class="si-info">
        <div class="si-nm">${r.nm}</div>
        <div class="si-ds">Ingredientes: ${reqArr.join(' · ')} · Venta: ${Math.floor(r.sell * getPriceMult())}🪙</div>
      </div>
      <button class="bb-action cook" id="cook-${k}" ${!canCook ? 'disabled' : ''}>Cocinar</button>
    </div>`;
  }
  h += `<button class="bcl" id="close-modal-btn">Cerrar</button>`;
  openModal(h);

  document.getElementById('close-modal-btn').onclick = closeModal;
  for (let k in RECIPES) {
    const b = document.getElementById(`cook-${k}`);
    if (b) b.onclick = () => cookRecipe(k, g);
  }
}

function cookRecipe(k, g) {
  const r = RECIPES[k];
  for (let ing in r.req) {
    if ((g.inventory[ing] || 0) < r.req[ing]) return;
  }
  for (let ing in r.req) {
    g.inventory[ing] -= r.req[ing];
  }
  g.inventory[r.em] = (g.inventory[r.em] || 0) + 1;
  g.stats.cooked++;
  addXP(r.xp, lvl => toast(`⭐ ¡Nivel ${lvl}!`));
  sfxGolden();
  toast(`🍳 ¡Cocinado: ${r.nm}! (+${r.xp} XP)`);
  updateHUD(g);
  openKitchen(g);
}

// 4. UPGRADES
export function openUpgrades(g) {
  let h = `<h2>⬆️ Mejoras de Granja</h2>`;
  UPGRADES.forEach(u => {
    const cur = g.upgrades[u.id] || 0;
    const isMax = cur >= u.max;
    const cost = Math.floor(u.base * Math.pow(u.mult, cur));
    h += `<div class="si-card">
      <div class="si-info">
        <div class="si-nm">${u.nm} (Nv. ${cur}/${u.max})</div>
        <div class="si-ds">${u.desc}</div>
      </div>
      <button class="bb-action buy" id="upg-${u.id}" ${isMax || g.coins < cost ? 'disabled' : ''}>
        ${isMax ? 'MAX' : cost + ' 🪙'}
      </button>
    </div>`;
  });
  h += `<button class="bcl" id="close-modal-btn">Cerrar</button>`;
  openModal(h);

  document.getElementById('close-modal-btn').onclick = closeModal;
  UPGRADES.forEach(u => {
    const b = document.getElementById(`upg-${u.id}`);
    if (b) b.onclick = () => buyUpgrade(u.id, g);
  });
}

function buyUpgrade(id, g) {
  const u = UPGRADES.find(x => x.id === id);
  const cur = g.upgrades[id] || 0;
  if (cur >= u.max) return;
  const cost = Math.floor(u.base * Math.pow(u.mult, cur));
  if (g.coins < cost) return;

  g.coins -= cost;
  g.upgrades[id]++;
  sfxBuy();
  toast(`⬆️ ¡Mejora: ${u.nm}!`);
  updateHUD(g);
  openUpgrades(g);
}

// 5. MISSIONS CHECK
export function checkMissions(g) {
  const m = MISSIONS[g.missionIdx];
  if (m && m.check(g)) {
    g.coins += m.rwCoins;
    addXP(m.rwXP, lvl => toast(`⭐ ¡Nivel ${lvl}!`));
    sfxGolden();
    toast(`🎉 ¡Misión Completada! +${m.rwCoins}🪙 y +${m.rwXP}XP`);
    g.missionIdx++;
    updateHUD(g);
  }
}
