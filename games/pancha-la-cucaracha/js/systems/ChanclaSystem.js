(function (P) {
  const { SHADOW_WARN_TIME, SLAM_STAY_TIME, CHANCLA_SIZE, CHANCLA_HIT_RADIUS } = P;

  /**
   * Sistema de chanclazos.
   * Cada nivel tiene una lista de patrones que se ejecutan en paralelo.
   *
   * Tipos de patrón:
   *   - fixed:    cicla por una lista de puntos (X, Y) donde cae la chancla.
   *   - random:   cae en un punto aleatorio dentro de un rectángulo.
   *   - row:      varias chanclas alineadas en una fila/columna a la vez.
   *   - aim:      la chancla apunta hacia la posición futura del jugador
   *               (predice 0.4s adelante). Nivel avanzado.
   */
  P.ChanclaSystem = class ChanclaSystem {
    constructor(scene, level, hooks) {
      this.scene = scene;
      this.hooks = hooks;
      this.patterns = level.patterns.map((p) => ({ ...p, timer: p.interval * 0.6 }));
      this.active = [];
      this._rot = 0;
    }

    update(delta, player = null) {
      const dt = delta / 1000;

      for (const pattern of this.patterns) {
        pattern.timer -= delta;
        if (pattern.timer <= 0) {
          pattern.timer = pattern.interval + Phaser.Math.Between(-250, 250);
          for (const spot of this._pickSpots(pattern, player)) {
            this._startStrike(spot.x, spot.y, spot.telegraphAngle);
          }
        }
      }

      for (const strike of this.active) strike.update(dt);
      this.active = this.active.filter((s) => s.alive);
    }

    _pickSpots(pattern, player) {
      switch (pattern.type) {
        case 'fixed': {
          const idx = this._rot % pattern.spots.length;
          this._rot++;
          return [{ x: pattern.spots[idx][0], y: pattern.spots[idx][1] }];
        }
        case 'random': {
          const a = pattern.area;
          return [{
            x: Phaser.Math.Between(a.x, a.x + a.w),
            y: Phaser.Math.Between(a.y, a.y + a.h)
          }];
        }
        case 'row': {
          const spots = [];
          const span = pattern.to - pattern.from;
          for (let i = 0; i < pattern.count; i++) {
            const t = (i + 0.5) / pattern.count;
            const pos = pattern.from + span * t + Phaser.Math.Between(-30, 30);
            if (pattern.axis === 'x') spots.push({ x: pattern.value, y: pos });
            else spots.push({ x: pos, y: pattern.value });
          }
          return spots;
        }
        case 'aim': {
          if (!player) return [];
          // predicción simple: posición futura del jugador según su velocidad
          const v = player.sprite.body.velocity;
          const predictTime = 0.35;
          const px = player.x + v.x * predictTime;
          const py = player.y + v.y * predictTime;
          // jitter alrededor de la predicción
          const jitter = pattern.jitter ?? 50;
          return [{
            x: px + Phaser.Math.Between(-jitter, jitter),
            y: py + Phaser.Math.Between(-jitter, jitter),
            telegraphAngle: Math.atan2(v.y, v.x)
          }];
        }
        default:
          return [];
      }
    }

    _startStrike(x, y, telegraphAngle = null) {
      this.active.push(new Strike(this.scene, this, x, y, telegraphAngle));
    }
  };

  /** Un chanclazo individual: advertencia → golpe → retirada. */
  class Strike {
    constructor(scene, system, x, y, telegraphAngle) {
      this.scene = scene;
      this.system = system;
      this.x = x;
      this.y = y;
      this.alive = true;
      this.state = 'warn';
      this.t = 0;

      this.shadow = scene.add.image(x, y, 'atlas', 'shadow_warn')
        .setDisplaySize(10, 10)
        .setDepth(50)
        .setAlpha(0.9);

      // Si telegraphAngle existe, dibujamos una flecha apuntando hacia donde caerá
      this.telegraphAngle = telegraphAngle;
      if (telegraphAngle != null) {
        const arrowLen = 90;
        this.telegraph = scene.add.graphics().setDepth(49);
        const tx = x - Math.cos(telegraphAngle) * arrowLen;
        const ty = y - Math.sin(telegraphAngle) * arrowLen;
        this.telegraph.lineStyle(3, 0xff5a4e, 0.85);
        this.telegraph.beginPath();
        this.telegraph.moveTo(tx, ty);
        this.telegraph.lineTo(x, y);
        this.telegraph.strokePath();
        // cabeza de flecha
        const headSize = 10;
        const a = telegraphAngle;
        this.telegraph.fillStyle(0xff5a4e, 0.85);
        this.telegraph.beginPath();
        this.telegraph.moveTo(x, y);
        this.telegraph.lineTo(x - Math.cos(a - 0.3) * headSize, y - Math.sin(a - 0.3) * headSize);
        this.telegraph.lineTo(x - Math.cos(a + 0.3) * headSize, y - Math.sin(a + 0.3) * headSize);
        this.telegraph.closePath();
        this.telegraph.fillPath();
      }

      this.angle = Phaser.Math.Between(0, 359);
    }

    update(dt) {
      this.t += dt;

      if (this.state === 'warn') {
        const p = Math.min(this.t / (SHADOW_WARN_TIME / 1000), 1);
        const size = 14 + (CHANCLA_SIZE - 14) * p;
        this.shadow.setDisplaySize(size, size).setAlpha(0.5 + 0.5 * p);
        // pulso rojo cuando está por caer
        if (p > 0.7) {
          const pulse = (Math.sin(this.t * 30) + 1) * 0.5;
          this.shadow.setTint(Phaser.Display.Color.GetColor(255, 60 + pulse * 80, 40));
        }
        if (p >= 1) this._slam();
      } else if (this.state === 'slam') {
        if (this.t >= SLAM_STAY_TIME / 1000) this._lift();
      }
    }

    _slam() {
      this.state = 'slam';
      this.t = 0;

      // Eliminar telegraph
      if (this.telegraph) this.telegraph.destroy();

      this.sprite = this.scene.add.image(this.x, this.y, 'atlas', 'chancla')
        .setDepth(60)
        .setRotation(Phaser.Math.DegToRad(this.angle))
        .setDisplaySize(CHANCLA_SIZE, CHANCLA_SIZE);

      this.sprite.setScale(CHANCLA_SIZE / 64 * 1.6);
      this.scene.tweens.add({
        targets: this.sprite,
        scaleX: CHANCLA_SIZE / 64,
        scaleY: CHANCLA_SIZE / 64,
        duration: 70,
        ease: 'Back.easeIn'
      });

      // Anillos de impacto
      const ring = this.scene.add.circle(this.x, this.y, 8, 0xffe9b0, 0.7)
        .setStrokeStyle(2, 0xffaa66, 0.8)
        .setDepth(55);
      this.scene.tweens.add({
        targets: ring,
        radius: CHANCLA_HIT_RADIUS * 1.4,
        alpha: 0,
        duration: 320,
        ease: 'Cubic.easeOut',
        onComplete: () => ring.destroy()
      });

      this.scene.cameras.main.shake(160, 0.012);
      this.scene.cameras.main.flash(80, 255, 220, 180, false);
      this.system.hooks.onSlam(this.x, this.y);
    }

    _lift() {
      this.alive = false;
      this.shadow.destroy();
      if (this.sprite) this.sprite.destroy();
    }
  }

  P.ChanclaSystem.Strike = Strike;
})(window.Pancha);
