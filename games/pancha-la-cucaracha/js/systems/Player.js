(function (P) {
  const { PLAYER_SPEED, RESPAWN_INVULN_MS, EXPOSURE_DEAD_THRESHOLD } = P;

  /**
   * Pancha: movimiento, exposición a la luz, animación y muerte.
   */
  P.Player = class Player {
    constructor(scene, spawn) {
      this.scene = scene;
      this.speed = PLAYER_SPEED;
      this.exposure = 0;
      this.dead = false;
      this.deathCause = null;
      this.invulnUntil = 0;

      const dirFrames = ['down', 'up', 'left', 'right'];
      if (!scene.anims.exists('walk_down')) {
        for (const dir of dirFrames) {
          scene.anims.create({
            key: `walk_${dir}`,
            frames: [
              { key: 'atlas', frame: `pancha_${dir}_0` },
              { key: 'atlas', frame: `pancha_${dir}_1` }
            ],
            frameRate: 10,
            repeat: -1
          });
        }
      }

      this.sprite = scene.physics.add.sprite(spawn.x, spawn.y, 'atlas', 'pancha_down_0')
        .setDepth(40)
        .setScale(0.75);

      this.sprite.body.setCircle(20, 12, 12);
      this.sprite.body.setCollideWorldBounds(true);

      // Icono de alerta (se muestra cuando la exposición es crítica)
      this.alertIcon = scene.add.image(spawn.x, spawn.y - 30, 'atlas', 'alert')
        .setDepth(50).setVisible(false).setScale(0.6);
    }

    update(delta, inputVector, lightSystem, emitter) {
      if (this.dead) return;

      const dt = delta / 1000;
      const body = this.sprite.body;

      body.setVelocity(inputVector.x * this.speed, inputVector.y * this.speed);

      // Exposición actual
      const lightExposure = lightSystem.getExposure(this.sprite.x, this.sprite.y);
      this.exposure = Phaser.Math.Clamp(this.exposure + lightSystem.getRate(lightExposure) * dt, 0, 1);
      emitter.emit(P.EVENTS.EXPOSURE, this.exposure);

      // Muerte por exposición crítica (solo si no hay invulnerabilidad)
      if (this.exposure >= EXPOSURE_DEAD_THRESHOLD && this.scene.time.now >= this.invulnUntil) {
        this._dieByLight();
        return;
      }

      // Visibilidad del sprite según luz
      const visibility = 0.35 + 0.65 * Math.max(lightExposure, this.exposure * 0.6);
      this.sprite.setAlpha(visibility);

      // Icono de alerta parpadeante en exposición crítica
      const critical = lightSystem.isCritical(this.exposure);
      this.alertIcon.setVisible(critical && !this.dead);
      this.alertIcon.setPosition(this.sprite.x, this.sprite.y - 28);
      if (critical) {
        this.alertIcon.setAlpha(0.6 + 0.4 * Math.sin(this.scene.time.now / 60));
      }

      // Animación / dirección
      if (inputVector.lengthSq() > 0.01) {
        const dir =
          Math.abs(inputVector.x) > Math.abs(inputVector.y)
            ? (inputVector.x > 0 ? 'right' : 'left')
            : (inputVector.y > 0 ? 'down' : 'up');
        this.sprite.play(`walk_${dir}`, true);
      } else {
        this.sprite.stop();
        const current = this.sprite.anims.currentAnim
          ? this.sprite.anims.currentAnim.key.replace('walk_', '')
          : 'down';
        this.sprite.setFrame(`pancha_${current}_0`);
      }
    }

    /** Devuelve true si el golpe fue letal (sin invulnerabilidad). */
    hitBySlam(x, y, radius, time) {
      if (this.dead) return false;
      if (time < this.invulnUntil) return false;

      const dx = this.sprite.x - x;
      const dy = this.sprite.y - y;
      if (dx * dx + dy * dy <= radius * radius) {
        this._dieByChancla();
        return true;
      }
      return false;
    }

    _dieByChancla() {
      this.dead = true;
      this.deathCause = 'chancla';
      this.alertIcon.setVisible(false);
      this.sprite.body.enable = false;
      this.scene.tweens.add({
        targets: this.sprite,
        alpha: 0,
        scale: 0.2,
        angle: 180,
        duration: 400,
        ease: 'Back.easeIn'
      });
    }

    _dieByLight() {
      this.dead = true;
      this.deathCause = 'light';
      this.alertIcon.setVisible(false);
      this.sprite.body.enable = false;
      // efecto de "te vieron": flash blanco y desvanecer
      this.scene.cameras.main.flash(200, 255, 255, 200);
      this.scene.tweens.add({
        targets: this.sprite,
        alpha: 0,
        scale: 1.4,
        duration: 350,
        ease: 'Cubic.easeOut'
      });
    }

    respawn(checkpoint) {
      this.dead = false;
      this.deathCause = null;
      this.exposure = 0;
      this.invulnUntil = this.scene.time.now + RESPAWN_INVULN_MS;
      this.sprite.setPosition(checkpoint.x, checkpoint.y)
        .setAlpha(1)
        .setScale(0.75)
        .setAngle(0);
      this.sprite.body.enable = true;
      this.sprite.body.reset(checkpoint.x, checkpoint.y);
      this.alertIcon.setPosition(checkpoint.x, checkpoint.y - 28);

      this.scene.tweens.add({
        targets: this.sprite,
        alpha: 0.3,
        duration: 120,
        yoyo: true,
        repeat: Math.floor(RESPAWN_INVULN_MS / 240),
        onComplete: () => this.sprite.setAlpha(1)
      });
    }

    get x() { return this.sprite.x; }
    get y() { return this.sprite.y; }
  };
})(window.Pancha);
