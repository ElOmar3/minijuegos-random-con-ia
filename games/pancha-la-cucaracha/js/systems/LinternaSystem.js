(function (P) {
  /**
   * Sistema de linterna de muñeca: una "persona" en el escenario que mueve un
   * haz de luz visible. Si Pancha entra en el haz, queda TOTALMENTE expuesta.
   *
   * Patrones de movimiento:
   *   - patrol:  la linterna recorre una lista de puntos (waypoints) a velocidad constante
   *   - chase:   la linterna "persigue" lentamente al jugador (para el jefe final)
   *   - sweep:   la linterna gira sobre un punto fijo como un faro (rotación angular)
   */

  P.LinternaSystem = class LinternaSystem {
    constructor(scene, level) {
      this.scene = scene;
      this.linternas = [];
      this.hazes = [];      // gráficos del haz
      this.glares = [];     // punto brillante central

      if (!level.linternas || level.linternas.length === 0) return;

      for (const cfg of level.linternas) {
        this._spawnLinterna(cfg);
      }
    }

    _spawnLinterna(cfg) {
      const scene = this.scene;
      const graphics = scene.add.graphics().setDepth(8);
      const glare = scene.add.image(cfg.x, cfg.y, 'atlas', 'linterna_glare')
        .setDepth(9).setScale(0.9);

      // Halo de luz visible (círculo radial)
      const halo = scene.add.image(cfg.x, cfg.y, 'atlas', 'linterna_halo')
        .setBlendMode(Phaser.BlendModes.SCREEN)
        .setDepth(7);

      const linterna = {
        cfg,
        x: cfg.x,
        y: cfg.y,
        angle: cfg.startAngle ?? 0,
        radius: cfg.radius ?? 70,        // radio del haz
        graphics,
        halo,
        glare,
        targetAngle: cfg.startAngle ?? 0,
        waypointIndex: 0,
        sweepDir: 1,
        bobTime: Math.random() * Math.PI * 2,
      };

      this.linternas.push(linterna);
      this.hazes.push(graphics);
      this.glares.push(glare);
    }

    update(delta, player) {
      const dt = delta / 1000;
      for (const l of this.linternas) this._updateLinterna(l, dt, player);
      this._drawHazes();
    }

    _updateLinterna(l, dt, player) {
      const cfg = l.cfg;

      switch (cfg.type) {
        case 'patrol': {
          if (!cfg.waypoints || cfg.waypoints.length === 0) break;
          const target = cfg.waypoints[l.waypointIndex];
          const dx = target.x - l.x;
          const dy = target.y - l.y;
          const dist = Math.hypot(dx, dy);
          const speed = cfg.speed ?? 80;
          if (dist < 4) {
            l.waypointIndex = (l.waypointIndex + 1) % cfg.waypoints.length;
          } else {
            l.x += (dx / dist) * speed * dt;
            l.y += (dy / dist) * speed * dt;
          }
          l.targetAngle = Math.atan2(dy, dx);
          break;
        }

        case 'sweep': {
          l.angle += (cfg.sweepSpeed ?? 1.2) * dt * l.sweepDir;
          const minA = cfg.minAngle ?? -Math.PI / 3;
          const maxA = cfg.maxAngle ?? Math.PI / 3;
          if (l.angle > maxA) { l.angle = maxA; l.sweepDir = -1; }
          if (l.angle < minA) { l.angle = minA; l.sweepDir = 1; }
          l.targetAngle = l.angle + Math.PI / 2; // haz apunta hacia donde mira el ángulo
          // ligero bamboleo
          l.bobTime += dt * 4;
          l.y = (cfg.y ?? l.y) + Math.sin(l.bobTime) * 3;
          break;
        }

        case 'chase': {
          if (!player) break;
          const dx = player.x - l.x;
          const dy = player.y - l.y;
          const desired = Math.atan2(dy, dx);
          // suaviza el ángulo hacia el jugador
          let diff = desired - l.targetAngle;
          while (diff > Math.PI) diff -= 2 * Math.PI;
          while (diff < -Math.PI) diff += 2 * Math.PI;
          l.targetAngle += diff * Math.min(1, (cfg.turnRate ?? 0.8) * dt);
          // se mueve lento hacia el jugador
          const dist = Math.hypot(dx, dy);
          const speed = cfg.speed ?? 45;
          if (dist > 60) {
            l.x += Math.cos(l.targetAngle) * speed * dt;
            l.y += Math.sin(l.targetAngle) * speed * dt;
          }
          break;
        }
      }

      // Suavizar el ángulo real hacia el target (no teleporta)
      let diff = l.targetAngle - l.angle;
      while (diff > Math.PI) diff -= 2 * Math.PI;
      while (diff < -Math.PI) diff += 2 * Math.PI;
      l.angle += diff * Math.min(1, 4 * dt);

      l.halo.setPosition(l.x, l.y);
      l.glare.setPosition(l.x, l.y).setRotation(l.angle);
    }

    _drawHazes() {
      // Solo necesitamos actualizar posiciones; los gráficos del cono se redibujan por linterna
      for (let i = 0; i < this.linternas.length; i++) {
        const l = this.linternas[i];
        const g = l.graphics;
        g.clear();

        // Cono: un sector que parte de la posición en dirección l.angle
        const coneLen = l.radius * 2.4;
        const coneWidth = Math.PI / 4; // 45° total
        const segments = 14;

        g.fillStyle(0xffe9b0, 0.18);
        g.beginPath();
        g.moveTo(l.x, l.y);
        for (let i = 0; i <= segments; i++) {
          const t = i / segments;
          const a = l.angle - coneWidth / 2 + coneWidth * t;
          // distancia decrece en los extremos para que parezca haz enfocado
          const r = coneLen * (1 - Math.abs(t - 0.5) * 0.5);
          g.lineTo(l.x + Math.cos(a) * r, l.y + Math.sin(a) * r);
        }
        g.closePath();
        g.fillPath();

        // Contorno sutil
        g.lineStyle(1, 0xffd07a, 0.15);
        g.strokePath();
      }
    }

    /**
     * ¿El punto (x, y) está dentro del haz de alguna linterna?
     * Retorna el nivel de exposición adicional (0..1) o 0 si está fuera.
     */
    getExposureAt(x, y) {
      let maxExposure = 0;
      for (const l of this.linternas) {
        const dx = x - l.x;
        const dy = y - l.y;
        const dist = Math.hypot(dx, dy);
        if (dist > l.radius * 2.4) continue;

        // ángulo del punto relativo a la linterna
        const pointAngle = Math.atan2(dy, dx);
        let diff = pointAngle - l.angle;
        while (diff > Math.PI) diff -= 2 * Math.PI;
        while (diff < -Math.PI) diff += 2 * Math.PI;

        const coneWidth = Math.PI / 4;
        if (Math.abs(diff) > coneWidth / 2) continue;

        // qué tan centrado en el cono está (1 = centro, 0 = borde)
        const centerFactor = 1 - Math.abs(diff) / (coneWidth / 2);
        // atenuación por distancia
        const distFactor = Math.max(0, 1 - dist / (l.radius * 2.4));

        const exposure = centerFactor * distFactor;
        if (exposure > maxExposure) maxExposure = exposure;
      }
      return maxExposure;
    }

    destroy() {
      for (const l of this.linternas) {
        l.graphics.destroy();
        l.halo.destroy();
        l.glare.destroy();
      }
      this.linternas = [];
    }
  };
})(window.Pancha);
