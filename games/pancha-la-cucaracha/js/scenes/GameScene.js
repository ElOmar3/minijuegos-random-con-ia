(function (P) {
  const { EVENTS, TILE, CRUMB_POINTS_LIGHT, CRUMB_POINTS_SHADOW, MAX_DEATHS,
          CHANCLA_HIT_RADIUS } = P;

  /**
   * Escena de juego: monta el nivel actual y coordina los sistemas.
   * Maneja: luz/sombra, linterna, chanclas, migas, checkpoints, vidas.
   */
  P.GameScene = class GameScene extends Phaser.Scene {
    constructor() {
      super('Game');
    }

    create() {
      this.gameEvents = new Phaser.Events.EventEmitter();
      this.game.registry.set('events', this.gameEvents);

      this.levelIndex = 0;
      this.totalPoints = 0;
      this.livesRemaining = MAX_DEATHS;
      this.ended = false;
      this.transitioning = false;

      this._startLevel(0);

      if (!this.scene.isActive('HUD')) {
        this.scene.launch('HUD');
      }
    }

    _startLevel(index) {
      this.levelIndex = index;
      this.level = P.LEVELS[index];
      this.checkpoint = { ...this.level.start };
      this.transitioning = false;
      // al cambiar de nivel las vidas se mantienen

      if (this.levelGroup) this.levelGroup.clear(true, true);
      this.levelGroup = this.add.group();

      this._buildFloor();
      this._buildWalls();
      this._buildFurniture();
      this._buildNest();
      this._buildCheckpoints();
      this._buildCrumbs();

      // Sistemas: linterna (si hay) → luz → chanclas
      this.linternaSystem = new P.LinternaSystem(this, this.level);

      // Marcamos qué zonas están activas (las dinámicas pueden estar apagadas)
      this._activeZones = new Set();
      for (const z of (this.level.lightZones || [])) {
        this._activeZones.add(z);
      }
      const isZoneActive = (zone) => this._activeZones.has(zone);

      this.lightSystem = new P.LightSystem(this, this.level, this.linternaSystem, isZoneActive);
      this.player = new P.Player(this, this.level.start);
      this.physics.add.collider(this.player.sprite, this.solidBodies);
      this.physics.add.overlap(this.player.sprite, this.nestZone, () => this._reachNest());

      this.chanclaSystem = new P.ChanclaSystem(this, this.level, {
        onSlam: (x, y) => this._handleSlam(x, y)
      });

      if (!this.inputSystem) {
        this.inputSystem = new P.InputSystem(this);
      }

      // Zonas de luz dinámicas (alternan on/off según timer)
      this.dynamicZones = [];
      for (const zone of (this.level.lightZones || [])) {
        if (zone.timer) {
          const entry = {
            x: zone.x, y: zone.y, w: zone.w, h: zone.h,
            on: true,
            period: zone.timer,
            offset: zone.timerOffset || 0,
            t: zone.timerOffset || 0,
            graphics: this.add.rectangle(zone.x + zone.w / 2, zone.y + zone.h / 2, zone.w, zone.h, 0xffe9b0, 0.18)
              .setBlendMode(Phaser.BlendModes.SCREEN).setDepth(2)
          };
          this.dynamicZones.push({ zone, entry });
        }
      }

      this.crumbState = { collected: 0, total: this.crumbs.length, points: this.totalPoints };
      this._emitCrumbs();

      this.gameEvents.emit(EVENTS.LEVEL, {
        name: this.level.name,
        level: index + 1,
        total: P.LEVELS.length,
        lives: this.livesRemaining
      });

      const hud = this.scene.get('HUD');
      hud?.showMessage?.(this.level.name, 1800, '#ffb340', 28);
    }

    _emitCrumbs() {
      this.gameEvents.emit(EVENTS.CRUMBS, { ...this.crumbState });
    }

    _addToLevel(obj) {
      this.levelGroup.add(obj);
      return obj;
    }

    _buildFloor() {
      for (let x = TILE / 2; x < this.scale.width; x += TILE) {
        for (let y = TILE / 2; y < this.scale.height; y += TILE) {
          this._addToLevel(
            this.add.image(x, y, 'atlas', 'tile').setDepth(0).setTint(this.level.floorTint)
          );
        }
      }
    }

    _buildWalls() {
      this.solidBodies = [];
      for (const r of [...(this.level.walls || []), ...(this.level.furniture || [])]) {
        const zone = this.add.zone(r.x + r.w / 2, r.y + r.h / 2, r.w, r.h);
        this.physics.add.existing(zone, true);
        this.solidBodies.push(zone);
        this._addToLevel(zone);
      }

      for (const w of (this.level.walls || [])) {
        this._addToLevel(
          this.add.rectangle(w.x + w.w / 2, w.y + w.h / 2, w.w, w.h, 0x3a2c1a)
            .setStrokeStyle(2, 0x241a0e).setDepth(10)
        );
      }
    }

    _buildFurniture() {
      for (const f of (this.level.furniture || [])) {
        const frame = f.w > f.h ? (f.h <= 60 ? 'fridge' : 'counter') : 'counter';

        const body = this.add.tileSprite(
          f.x + f.w / 2, f.y + f.h / 2, f.w, f.h, 'atlas', frame
        ).setDepth(20);

        const shadowHalo = this.add.rectangle(
          f.x + f.w / 2, f.y + f.h / 2, f.w + 52, f.h + 52
        ).setFillStyle(0x000000, 0.22).setDepth(5);

        this._addToLevel(body);
        this._addToLevel(shadowHalo);
      }
    }

    _buildNest() {
      const { x, y } = this.level.nest;
      this.nestZone = this.add.zone(x, y, 56, 48);
      this.physics.add.existing(this.nestZone, true);
      this._addToLevel(
        this.add.image(x, y, 'atlas', 'nest').setDepth(15).setScale(1.1)
      );
      this._addToLevel(this.nestZone);
    }

    _buildCheckpoints() {
      this.checkpointMarkers = [];
      this.level.checkpoints.forEach((cp, i) => {
        const marker = this.add.image(cp.x, cp.y, 'atlas', 'checkpoint')
          .setDepth(8).setAlpha(0.55);
        this.tweens.add({
          targets: marker,
          alpha: { from: 0.35, to: 0.7 },
          scale: { from: 0.95, to: 1.1 },
          duration: 1200,
          yoyo: true,
          repeat: -1
        });
        this.checkpointMarkers.push(marker);
      });
    }

    _buildCrumbs() {
      this.crumbs = [];
      for (const c of (this.level.crumbs || [])) {
        const sprite = this.add.image(c.x, c.y, 'atlas', 'crumb')
          .setDepth(12)
          .setScale(c.lit ? 1 : 0.85);
        if (!c.lit) sprite.setTint(0xbba070);

        this.tweens.add({
          targets: sprite,
          scale: sprite.scale * 1.15,
          duration: Phaser.Math.Between(700, 1100),
          yoyo: true,
          repeat: -1,
          delay: Phaser.Math.Between(0, 500)
        });

        sprite.crumbData = c;
        this.crumbs.push(sprite);
        this._addToLevel(sprite);
      }
    }

    update(time, delta) {
      if (!this.player || this.ended || this.transitioning) return;

      this.inputSystem.update();

      // Actualizar zonas dinámicas ANTES del sistema de luz para que cuenten
      this._updateDynamicZones(delta);

      // muerte por luz crítica (la dispara el propio Player.update)
      this.player.update(delta, this.inputSystem.vector, this.lightSystem, this.gameEvents);

      if (this.linternaSystem) this.linternaSystem.update(delta, this.player);
      this.chanclaSystem.update(delta, this.player);

      // Si el jugador murió por luz en player.update, manejarlo aquí
      if (this.player.dead && this.player.deathCause === 'light' && !this._handlingDeath) {
        this._handleDeathByLight();
        return;
      }

      if (this.player.dead) return;

      this._checkCrumbPickup();
      this._checkCheckpoint();
    }

    _updateDynamicZones(delta) {
      const dt = delta / 1000;
      for (const { zone, entry } of this.dynamicZones) {
        entry.t += dt;
        if (entry.t >= entry.period) {
          entry.t = 0;
          entry.on = !entry.on;
          if (entry.on) this._activeZones.add(zone);
          else this._activeZones.delete(zone);

          entry.graphics.setAlpha(entry.on ? 0.18 : 0);
          this.tweens.add({
            targets: entry.graphics,
            alpha: entry.on ? 0.18 : 0,
            duration: 400,
            ease: 'Cubic.easeOut'
          });
        }
      }
    }

    _checkCrumbPickup() {
      for (const crumb of this.crumbs) {
        if (crumb.collected) continue;
        const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, crumb.x, crumb.y);
        if (d < 26) {
          crumb.collected = true;
          const lit = crumb.crumbData.lit;
          const px = crumb.x;
          const py = crumb.y;
          crumb.destroy();

          const pts = lit ? CRUMB_POINTS_LIGHT : CRUMB_POINTS_SHADOW;
          this.totalPoints += pts;
          this.crumbState.collected++;
          this.crumbState.points = this.totalPoints;
          this._emitCrumbs();

          // explosión de migajas
          this.add.image(px, py, 'atlas', 'crumbs_pop').setDepth(70).setScale(1.2);
          this.tweens.add({
            targets: this.children.list[this.children.list.length - 1],
            scale: { from: 0.4, to: 1.6 },
            alpha: { from: 1, to: 0 },
            duration: 500,
            onComplete: (t) => t.destroy()
          });

          const popup = this.add.text(px, py - 14, `+${pts}`, {
            fontFamily: 'Trebuchet MS', fontSize: '16px', fontStyle: 'bold',
            color: lit ? '#ffd88a' : '#bba070'
          }).setOrigin(0.5).setDepth(71);
          this.tweens.add({
            targets: popup,
            y: py - 44,
            alpha: 0,
            duration: 800,
            onComplete: () => popup.destroy()
          });
        }
      }
    }

    _checkCheckpoint() {
      this.level.checkpoints.forEach((cp, i) => {
        if (cp.reached) return;
        const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, cp.x, cp.y);
        if (d < 30) {
          cp.reached = true;
          this.checkpoint = { x: cp.x, y: cp.y };
          this.checkpointMarkers[i].setAlpha(0.9).setTint(0x8cffaa);
          this.gameEvents.emit(EVENTS.CHECKPOINT, { index: i + 1 });
        }
      });
    }

    _handleSlam(x, y) {
      if (this.ended || this.transitioning) return;
      const killed = this.player.hitBySlam(x, y, CHANCLA_HIT_RADIUS, this.time.now);
      if (!killed) return;

      this.livesRemaining = Math.max(0, this.livesRemaining - 1);
      this.gameEvents.emit(EVENTS.DEATH, { remaining: this.livesRemaining });

      if (this.livesRemaining <= 0) {
        this._gameOver();
        return;
      }

      this.time.delayedCall(900, () => {
        if (this.scene.isActive() && !this.ended && this.player.deathCause === 'chancla') {
          this.player.respawn(this.checkpoint);
        }
      });
    }

    _handleDeathByLight() {
      if (this._handlingDeath) return;
      this._handlingDeath = true;

      this.livesRemaining = Math.max(0, this.livesRemaining - 1);
      this.gameEvents.emit(EVENTS.DEATH_BY_LIGHT, { remaining: this.livesRemaining });

      if (this.livesRemaining <= 0) {
        this._gameOver();
        this._handlingDeath = false;
        return;
      }

      this.time.delayedCall(900, () => {
        if (this.scene.isActive() && !this.ended && this.player.deathCause === 'light') {
          this.player.respawn(this.checkpoint);
        }
        this._handlingDeath = false;
      });
    }

    _reachNest() {
      if (this.ended || this.transitioning || this.player.dead) return;

      if (this.levelIndex + 1 < P.LEVELS.length) {
        this.transitioning = true;
        const next = this.levelIndex + 1;
        const hud = this.scene.get('HUD');
        hud?.showMessage?.('¡Nido alcanzado!', 1000, '#6fdc8c', 32);
        this.cameras.main.flash(300, 120, 255, 160);
        if (this.player.sprite.body) this.player.sprite.body.stop();
        this.time.delayedCall(1000, () => this._startLevel(next));
      } else {
        this._victory();
      }
    }

    _victory() {
      this.ended = true;
      const hud = this.scene.get('HUD');
      hud?.showMessage?.(`¡Pancha a salvo! ${this.totalPoints} pts`, 4000, '#6fdc8c', 34);
      this.gameEvents.emit(EVENTS.VICTORY, { points: this.totalPoints });
      this._endScreen('¡GANASTE!',
        `Pancha llegó a su nido.\nPuntaje final: ${this.totalPoints} puntos`, '#6fdc8c');
    }

    _gameOver() {
      this.ended = true;
      const hud = this.scene.get('HUD');
      hud?.showMessage?.('GAME OVER', 4000, '#ff5a4e', 40);
      this.gameEvents.emit(EVENTS.GAME_OVER, { points: this.totalPoints });
      this._endScreen('GAME OVER',
        `La cocina ganó esta vez...\nMigas: ${this.crumbState.collected}/${this.crumbState.total} · ${this.totalPoints} pts`,
        '#ff5a4e');
    }

    _endScreen(title, subtitle, color) {
      const cx = this.scale.width / 2;
      const cy = this.scale.height / 2;

      this.add.rectangle(cx, cy, this.scale.width, this.scale.height, 0x14100c, 0.75)
        .setDepth(90);

      this.add.text(cx, cy - 80, title, {
        fontFamily: 'Trebuchet MS', fontSize: '52px', fontStyle: 'bold',
        color, stroke: '#14100c', strokeThickness: 8
      }).setOrigin(0.5).setDepth(91);

      this.add.text(cx, cy - 10, subtitle, {
        fontFamily: 'Trebuchet MS', fontSize: '22px', color: '#e8dcc0', align: 'center'
      }).setOrigin(0.5).setDepth(91);

      // Botón "Volver a jugar" — siempre visible y clickeable
      const btnW = 280;
      const btnH = 64;
      const btnY = cy + 90;

      const btnBg = this.add.rectangle(cx, btnY, btnW, btnH, 0xffb340)
        .setStrokeStyle(3, 0x3a2008)
        .setDepth(91)
        .setInteractive({ useHandCursor: true });

      const btnText = this.add.text(cx, btnY, '▶  VOLVER A JUGAR', {
        fontFamily: 'Trebuchet MS', fontSize: '24px', fontStyle: 'bold',
        color: '#14100c'
      }).setOrigin(0.5).setDepth(92);

      // detener chanclas y movimiento del player
      if (this.chanclaSystem) this.chanclaSystem.active.length = 0;
      if (this.player && this.player.sprite.body) this.player.sprite.body.enable = false;
      if (this.linternaSystem) {
        for (const l of this.linternaSystem.linternas) {
          this.tweens.killTweensOf(l.halo);
          this.tweens.killTweensOf(l.glare);
        }
      }

      // pequeño parpadeo para llamar la atención
      this.tweens.add({
        targets: [btnBg, btnText],
        scaleX: { from: 1, to: 1.04 },
        scaleY: { from: 1, to: 1.04 },
        duration: 700,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });

      // hover effects (escritorio)
      btnBg.on('pointerover', () => {
        btnBg.setFillStyle(0xffd07a);
        btnBg.setScale(1.06);
      });
      btnBg.on('pointerout', () => {
        btnBg.setFillStyle(0xffb340);
        btnBg.setScale(1);
      });

      const restart = () => {
        if (this._restarting) return;
        this._restarting = true;
        this.tweens.killAll();
        if (this.inputSystem) {
          this.inputSystem.destroy();
          this.inputSystem = null;
        }
        this.scene.stop('HUD');
        this.scene.restart();
      };

      btnBg.on('pointerdown', restart);

      // atajo de teclado: cualquier tecla también reinicia
      // (registramos después de un pequeño delay para no capturar la tecla
      //  que causó la muerte/victoria)
      this.time.delayedCall(1200, () => {
        this.input.keyboard.once('keydown', restart);
      });
    }
  };

  })(window.Pancha);
