const byId = id => document.getElementById(id);

export function createDomBindings() {
  return {
    sceneContainer: byId('scene-container'),
    hud: byId('hud'),
    healthFill: byId('health-fill'),
    healthNum: byId('health-num'),
    staminaFill: byId('stamina-fill'),
    waveNum: byId('wave-num'),
    killsNum: byId('kills-num'),
    creditsNum: byId('credits-num'),
    creditsDelta: byId('credits-delta'),
    weaponBar: byId('weapon-bar'),
    weaponName: byId('weapon-name'),
    weaponLevel: byId('weapon-level'),
    ammoCount: byId('ammo-count'),
    ammoMag: byId('ammo-mag'),
    ammoReserve: byId('ammo-reserve'),
    reloadHint: byId('reload-hint'),
    banner: byId('banner'),
    toast: byId('toast'),
    fallbackHint: byId('fallback-hint'),
    interactionPrompt: byId('interaction-prompt'),
    interactionLabel: byId('interaction-label'),
    interactionCost: byId('interaction-cost'),
    interactionAction: byId('interaction-action'),
    interactionHold: byId('interaction-hold'),
    interactionHoldFill: byId('interaction-hold-fill'),
    objectivePanel: byId('objective-panel'),
    objectiveTitle: byId('objective-title'),
    objectiveDetail: byId('objective-detail'),
    objectiveProgress: byId('objective-progress'),
    objectiveProgressFill: byId('objective-progress-fill'),
    objectiveTimer: byId('objective-timer'),
    objectiveMarker: byId('objective-marker'),
    objectiveMarkerArrow: byId('objective-marker-arrow'),
    objectiveMarkerIcon: byId('objective-marker-icon'),
    objectiveMarkerDistance: byId('objective-marker-distance'),
    activeBuffs: byId('active-buffs'),
    crosshair: byId('crosshair'),
    hitmarker: byId('hitmarker'),
    vignette: byId('vignette'),
    damageFlash: byId('damage-flash'),
    touchUI: byId('touch-ui'),
    joyZone: byId('joystick-zone'),
    lookZone: byId('look-zone'),
    btnFire: byId('btn-fire'),
    btnReload: byId('btn-reload'),
    btnSprint: byId('btn-sprint'),
    btnSwitch: byId('btn-switch'),
    btnInteract: byId('btn-interact'),
    menuOverlay: byId('menu-overlay'),
    pauseOverlay: byId('pause-overlay'),
    perkOverlay: byId('perk-overlay'),
    perkOptions: byId('perk-options'),
    perkCards: [...document.querySelectorAll('.perk-card')],
    pausePerkList: byId('pause-perk-list'),
    gameoverOverlay: byId('gameover-overlay'),
    btnPlay: byId('btn-play'),
    btnResume: byId('btn-resume'),
    btnRetry: byId('btn-retry'),
    finalWave: byId('final-wave'),
    finalKills: byId('final-kills'),
    bestWaveEl: byId('best-wave'),
    finalEconomy: byId('final-economy'),
    finalObjectives: byId('final-objectives'),
    finalPerks: byId('final-perks')
  };
}

export class HUD {
  constructor(dom, { isTouch = false } = {}) {
    this.dom = dom;
    this.isTouch = isTouch;
    this.toastTimer = 0;
    this.hitmarkerTimer = 0;
    this.damageTimer = 0;
    this.creditsTimer = 0;
  }

  configureInputMode() {
    document.body.classList.add(this.isTouch ? 'touch-mode' : 'desktop-mode');
    if (!this.isTouch) return;
    this.dom.touchUI.classList.remove('hidden');
    document.querySelector('.controls-help.desktop-only')?.classList.add('hidden');
    document.querySelector('.controls-help.touch-only')?.classList.remove('hidden');
  }

  setStamina(value, maxValue) {
    this.dom.staminaFill.style.width = `${Math.max(0, value / maxValue) * 100}%`;
  }

  refreshVitals(health, maxHealth) {
    this.dom.healthNum.textContent = Math.round(health).toString();
    const percent = Math.max(0, health / maxHealth * 100);
    this.dom.healthFill.style.width = `${percent}%`;
    this.dom.healthFill.classList.toggle('low', percent <= 50 && percent > 25);
    this.dom.healthFill.classList.toggle('critical', percent <= 25);
    this.dom.vignette.style.opacity = `${Math.max(0, (55 - percent) / 80)}`;
  }

  refreshStats(wave, kills) {
    this.dom.waveNum.textContent = wave.toString();
    this.dom.killsNum.textContent = kills.toString();
  }

  refreshWeapon(weapon, ammo, reloading, level = 1) {
    if (!weapon || !ammo) return;
    this.dom.weaponName.textContent = weapon.name;
    this.dom.weaponLevel.textContent = `LVL ${level}`;
    this.dom.ammoMag.textContent = ammo.mag.toString();
    this.dom.ammoReserve.textContent = ammo.reserve === Infinity ? '∞' : ammo.reserve.toString();
    this.dom.reloadHint.classList.toggle(
      'hidden',
      ammo.mag > 0 || (ammo.reserve <= 0 && ammo.reserve !== Infinity) || reloading
    );
  }

  refreshCredits(credits, delta = 0, spent = false) {
    this.dom.creditsNum.textContent = `${Math.max(0, Math.round(credits))} C`;
    if (!delta) return;
    this.dom.creditsDelta.textContent = `${spent ? '-' : '+'}${Math.abs(Math.round(delta))}`;
    this.dom.creditsDelta.classList.toggle('spend', spent);
    this.dom.creditsDelta.classList.remove('hidden');
    void this.dom.creditsDelta.offsetWidth;
    clearTimeout(this.creditsTimer);
    this.creditsTimer = setTimeout(() => this.dom.creditsDelta.classList.add('hidden'), 780);
  }

  showInteraction(prompt) {
    if (!prompt) {
      this.dom.interactionPrompt.classList.add('hidden');
      this.dom.btnInteract?.classList.add('hidden');
      this.showHold(null);
      return;
    }
    this.dom.interactionLabel.textContent = prompt.label;
    this.dom.interactionCost.textContent = prompt.costText || (Number.isFinite(prompt.cost) ? `${prompt.cost} C` : '');
    const hold = prompt.mode === 'HOLD';
    this.dom.interactionAction.textContent = hold
      ? (this.isTouch ? 'MANTÉN ✋' : 'MANTÉN [E]')
      : (this.isTouch ? 'TOCA ✋ PARA INTERACTUAR' : '[E] INTERACTUAR');
    this.dom.interactionHold.classList.toggle('hidden', !hold);
    this.dom.interactionPrompt.classList.remove('hidden');
    this.dom.btnInteract?.classList.toggle('hidden', !this.isTouch);
  }

  showHold(state) {
    if (!state) {
      this.dom.interactionHoldFill.style.width = '0%';
      this.dom.interactionHold.classList.add('hidden');
      return;
    }
    this.dom.interactionHold.classList.remove('hidden');
    this.dom.interactionHold.classList.toggle('active', state.active);
    this.dom.interactionHoldFill.style.width = `${Math.max(0, Math.min(1, state.progress)) * 100}%`;
  }

  showObjective({ title, detail = '', progress = 0, showProgress = true, time = null }) {
    this.dom.objectiveTitle.textContent = title;
    this.dom.objectiveDetail.textContent = detail;
    this.dom.objectiveProgress.classList.toggle('hidden', !showProgress);
    this.dom.objectiveProgressFill.style.width = `${Math.max(0, Math.min(1, progress)) * 100}%`;
    this.dom.objectiveTimer.textContent = Number.isFinite(time) ? `${Math.max(0, Math.ceil(time))}s` : '';
    this.dom.objectivePanel.classList.remove('hidden');
  }

  hideObjective() {
    this.dom.objectivePanel.classList.add('hidden');
    this.dom.objectiveMarker.classList.add('hidden');
  }

  showPerkOffer(offer) {
    this.dom.perkOptions.classList.remove('choosing');
    this.dom.perkCards.forEach((card, index) => {
      const perk = offer[index];
      card.classList.remove('chosen');
      card.disabled = !perk;
      card.querySelector('strong').textContent = perk?.name || '';
      card.querySelector('span').textContent = perk?.description || '';
      card.querySelector('small').textContent = perk && perk.maxStacks > 1
        ? `NIVEL ${perk.currentStacks + 1} / ${perk.maxStacks}`
        : '';
    });
    this.dom.perkOverlay.classList.remove('hidden');
  }

  confirmPerkChoice(index) {
    this.dom.perkOptions.classList.add('choosing');
    this.dom.perkCards.forEach((card, cardIndex) => {
      card.disabled = true;
      card.classList.toggle('chosen', cardIndex === index);
    });
  }

  hidePerkOffer() {
    this.dom.perkOverlay.classList.add('hidden');
    this.dom.perkOptions.classList.remove('choosing');
  }

  updatePerkList(perks = []) {
    this.dom.pausePerkList.replaceChildren();
    if (!perks.length) {
      const item = document.createElement('li');
      item.textContent = 'Ninguna todavía';
      this.dom.pausePerkList.append(item);
      return;
    }
    for (const perk of perks) {
      const item = document.createElement('li');
      item.textContent = `${perk.name}${perk.maxStacks > 1 ? ` ${perk.stacks}/${perk.maxStacks}` : ''}`;
      this.dom.pausePerkList.append(item);
    }
  }

  showActiveBuffs(buffs = []) {
    this.dom.activeBuffs.replaceChildren();
    for (const buff of buffs.slice(0, 3)) {
      const item = document.createElement('span');
      item.className = 'active-buff';
      item.textContent = buff.name;
      const time = document.createElement('b');
      time.textContent = `${Math.max(0, buff.remaining).toFixed(1)}s`;
      item.append(time);
      this.dom.activeBuffs.append(item);
    }
    this.dom.activeBuffs.classList.toggle('hidden', buffs.length === 0);
  }

  updateObjectiveMarker({ visible, x = 0, y = 0, angle = 0, distance = 0, icon = '◆', onScreen = false }) {
    this.dom.objectiveMarker.classList.toggle('hidden', !visible);
    if (!visible) return;
    this.dom.objectiveMarker.style.left = `${x}px`;
    this.dom.objectiveMarker.style.top = `${y}px`;
    this.dom.objectiveMarker.classList.toggle('on-screen', onScreen);
    this.dom.objectiveMarkerArrow.style.transform = `rotate(${angle}rad)`;
    this.dom.objectiveMarkerIcon.textContent = icon;
    this.dom.objectiveMarkerDistance.textContent = `${Math.round(distance)}m`;
  }

  updateWeaponBar(weaponsConfig, unlockedWeapons, weapons, currentWeapon) {
    for (const id in weaponsConfig) {
      const slot = byId(`slot-${id}`);
      const ammo = byId(`slot-ammo-${id}`);
      if (!slot) continue;
      const unlocked = Boolean(unlockedWeapons[id]);
      slot.classList.toggle('locked', !unlocked);
      slot.classList.toggle('active', unlocked && currentWeapon === id);
      if (ammo && unlocked && weapons[id]) ammo.textContent = weapons[id].mag.toString();
    }
  }

  showBanner(text, danger = false) {
    this.dom.banner.textContent = text;
    this.dom.banner.classList.toggle('danger', danger);
    this.dom.banner.classList.remove('hidden');
  }

  hideBanner() {
    this.dom.banner.classList.add('hidden');
  }

  showToast(text) {
    this.dom.toast.textContent = text;
    this.dom.toast.classList.remove('hidden');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.dom.toast.classList.add('hidden'), 2000);
  }

  showHitmarker(kill) {
    this.dom.hitmarker.classList.remove('hidden', 'kill');
    if (kill) this.dom.hitmarker.classList.add('kill');
    void this.dom.hitmarker.offsetWidth;
    clearTimeout(this.hitmarkerTimer);
    this.hitmarkerTimer = setTimeout(() => this.dom.hitmarker.classList.add('hidden'), 120);
  }

  flashDamage(opacity = 1) {
    this.dom.damageFlash.style.opacity = `${opacity}`;
    clearTimeout(this.damageTimer);
    this.damageTimer = setTimeout(() => { this.dom.damageFlash.style.opacity = '0'; }, 160);
  }

  showGameplay() {
    this.dom.menuOverlay.classList.add('hidden');
    this.dom.gameoverOverlay.classList.add('hidden');
    this.dom.pauseOverlay.classList.add('hidden');
    this.hidePerkOffer();
    this.dom.hud.classList.remove('hidden');
  }

  showPause() {
    this.dom.pauseOverlay.classList.remove('hidden');
  }

  hidePause() {
    this.dom.pauseOverlay.classList.add('hidden');
  }

  showGameOver({ wave, kills, bestWave, economy = null, objectives = null, perks = 0 }) {
    this.dom.finalWave.textContent = wave.toString();
    this.dom.finalKills.textContent = kills.toString();
    this.dom.bestWaveEl.textContent = bestWave.toString();
    this.dom.finalEconomy.textContent = economy ? `${economy.earned} / ${economy.spent}` : '0 / 0';
    this.dom.finalObjectives.textContent = objectives ? `${objectives.completed}` : '0';
    this.dom.finalPerks.textContent = `${perks}`;
    this.dom.gameoverOverlay.classList.remove('hidden');
  }

  resetTransientEffects() {
    clearTimeout(this.toastTimer);
    clearTimeout(this.hitmarkerTimer);
    clearTimeout(this.damageTimer);
    clearTimeout(this.creditsTimer);
    this.dom.toast.classList.add('hidden');
    this.dom.hitmarker.classList.add('hidden');
    this.dom.damageFlash.style.opacity = '0';
    this.dom.creditsDelta.classList.add('hidden');
    this.showInteraction(null);
    this.hideObjective();
    this.hidePerkOffer();
    this.showActiveBuffs([]);
  }

  dispose() {
    this.resetTransientEffects();
  }
}
