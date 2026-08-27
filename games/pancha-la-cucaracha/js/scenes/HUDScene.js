(function (P) {
  const { GAME_W, GAME_H, EVENTS } = P;

  /**
   * HUD: indicador de sigilo (ojo/barra), contador de migas, vidas y mensajes.
   */
  P.HUDScene = class HUDScene extends Phaser.Scene {
    constructor() {
      super('HUD');
    }

    create() {
      const pad = 14;
      const events = this.game.registry.get('events');

      // ---- Panel de sigilo (arriba izquierda) ----
      this.add.rectangle(pad + 110, pad + 18, 220, 36, 0x14100c, 0.75)
        .setOrigin(0).setStrokeStyle(2, 0x3a2c1a);

      this.eyeIcon = this.add.text(pad + 10, pad + 6, '👁', { fontSize: '22px' }).setOrigin(0);
      this.stealthBarBack = this.add.rectangle(pad + 42, pad + 12, 160, 12, 0x332211, 1).setOrigin(0);
      this.stealthBar = this.add.rectangle(pad + 42, pad + 12, 0, 12, 0x6fdc8c, 1).setOrigin(0);

      // marca de "crítico"
      this.dangerMark = this.add.rectangle(pad + 42 + 160 * 0.95, pad + 12, 4, 12, 0xff5a4e, 1).setOrigin(0.5, 0);

      // ---- Migas (arriba derecha) ----
      const panelX = this.scale.width - pad - 200;
      this.add.rectangle(panelX + 90, pad + 18, 200, 36, 0x14100c, 0.75)
        .setOrigin(0).setStrokeStyle(2, 0x3a2c1a);
      this.add.image(panelX + 26, pad + 18, 'atlas', 'crumb').setScale(0.7);
      this.crumbsText = this.add.text(panelX + 48, pad + 18, '0 / 0 · 0 pts', {
        fontFamily: 'Trebuchet MS', fontSize: '16px', color: '#ffd88a'
      }).setOrigin(0, 0.5);

      // ---- Vidas (debajo de migas) ----
      this.livesIcons = [];
      this.drawLives(0, P.MAX_DEATHS);

      // ---- Nivel / checkpoint (abajo derecha) ----
      this.levelText = this.add.text(this.scale.width - pad, this.scale.height - pad, '', {
        fontFamily: 'Trebuchet MS', fontSize: '15px', color: '#c9bfae'
      }).setOrigin(1, 1);

      // ---- Mensajes centrales ----
      this.messageText = this.add.text(GAME_W / 2, GAME_H * 0.35, '', {
        fontFamily: 'Trebuchet MS', fontSize: '34px', color: '#ffb340',
        stroke: '#14100c', strokeThickness: 6,
        align: 'center'
      }).setOrigin(0.5);

      events.on(EVENTS.EXPOSURE, this._onExposure, this);
      events.on(EVENTS.CRUMBS, this._onCrumbs, this);
      events.on(EVENTS.LEVEL, this._onLevel, this);
      events.on(EVENTS.CHECKPOINT, this._flashCheckpoint, this);
      events.on(EVENTS.DEATH, this._showDeathMsg, this);
      events.on(EVENTS.DEATH_BY_LIGHT, this._showSpotted, this);

      this.events.once('shutdown', () => {
        events.off(EVENTS.EXPOSURE, this._onExposure, this);
        events.off(EVENTS.CRUMBS, this._onCrumbs, this);
        events.off(EVENTS.LEVEL, this._onLevel, this);
        events.off(EVENTS.CHECKPOINT, this._flashCheckpoint, this);
        events.off(EVENTS.DEATH, this._showDeathMsg, this);
        events.off(EVENTS.DEATH_BY_LIGHT, this._showSpotted, this);
      });
    }

    drawLives(remaining, total) {
      // limpiar anteriores
      for (const ic of this.livesIcons) ic.destroy();
      this.livesIcons = [];

      const pad = 14;
      const startX = this.scale.width - pad - 180;
      const y = pad + 50;
      for (let i = 0; i < total; i++) {
        const filled = i < remaining;
        const dot = this.add.circle(startX + i * 18, y, 6,
          filled ? 0xff5a4e : 0x4a3a2a,
          filled ? 0.95 : 0.6)
          .setStrokeStyle(1.5, 0x14100c, 1);
        this.livesIcons.push(dot);
      }
    }

    _onExposure(value) {
      this.stealthBar.width = Math.max(2, 160 * value);
      const color = Phaser.Display.Color.Interpolate.ColorWithColor(
        Phaser.Display.Color.ValueToColor(0x6fdc8c),
        Phaser.Display.Color.ValueToColor(0xff5a4e),
        100, Math.round(value * 100)
      );
      this.stealthBar.fillColor = Phaser.Display.Color.GetColor(color.r, color.g, color.b);
      this.eyeIcon.setColor(value > 0.7 ? '#ff5a4e' : '#c9bfae');
    }

    _onCrumbs({ collected, total, points }) {
      this.crumbsText.setText(`${collected} / ${total} · ${points} pts`);
      this.tweens.add({
        targets: this.crumbsText,
        scale: { from: 1.25, to: 1 },
        duration: 180
      });
    }

    _onLevel({ name, level, total, lives }) {
      this.levelText.setText(`${name}   [${level}/${total}]`);
      if (typeof lives === 'number') {
        this.drawLives(lives, P.MAX_DEATHS);
      }
    }

    _flashCheckpoint({ index }) {
      this.showMessage(`¡Checkpoint ${index}!`, 1200, '#6fdc8c', 26);
    }

    _showDeathMsg({ remaining }) {
      if (typeof remaining === 'number') {
        this.drawLives(remaining, P.MAX_DEATHS);
      }
      this.showMessage('¡CHANCLAZO!', 900, '#ff5a4e', 40);
    }

    _showSpotted({ remaining }) {
      if (typeof remaining === 'number') {
        this.drawLives(remaining, P.MAX_DEATHS);
      }
      this.showMessage('¡TE HAN VISTO!', 900, '#ff5a4e', 40);
    }

    showMessage(text, duration = 1500, color = '#ffb340', size = 34) {
      if (!this.scene.isActive() || !this.messageText) return;
      this.messageText.setText(text).setColor(color).setFontSize(size).setAlpha(1);
      this.tweens.killTweensOf(this.messageText);
      this.tweens.add({
        targets: this.messageText,
        alpha: 0,
        delay: duration,
        duration: 400
      });
    }
  };
})(window.Pancha);
