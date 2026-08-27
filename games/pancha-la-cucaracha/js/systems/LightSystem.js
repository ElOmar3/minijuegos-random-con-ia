(function (P) {
  const { LIGHT_EXPOSED_THRESHOLD, EXPOSURE_RISE_RATE, EXPOSURE_DECAY_RATE,
          EXPOSURE_DEAD_THRESHOLD, LINTERNA_RADIUS } = P;

  /**
   * Sistema de luz y sombra.
   * - Zonas de luz fijas (rectángulos): luz de techo, ventanas, etc.
   * - Muebles proyectan sombra.
   * - Linternas en movimiento (opcional) añaden exposición si Pancha está en el haz.
   */
  P.LightSystem = class LightSystem {
    constructor(scene, level, linternaSystem = null, isZoneActive = null) {
      this.scene = scene;
      this.lightZones = level.lightZones || [];
      this.furniture = level.furniture || [];
      this.linternaSystem = linternaSystem;
      // Función opcional (zone) => bool que dice si la zona está activa
      // (usada para zonas dinámicas que se apagan/encienden)
      this.isZoneActive = isZoneActive || (() => true);
    }

    static inRect(x, y, r) {
      return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
    }

    /** Exposición [0..1] en el punto dado (sin linterna). */
    _staticExposure(x, y) {
      for (const zone of this.lightZones) {
        if (LightSystem.inRect(x, y, zone)) {
          // si la zona está apagada dinámicamente, la ignoramos
          if (!this.isZoneActive(zone)) continue;
          if (!this._underFurnitureShadow(x, y)) return 1;
          return 0.15;
        }
      }
      return this._underFurnitureShadow(x, y) ? 0 : 0.25;
    }

    /** Exposición [0..1] total (luces estáticas + linternas). */
    getExposure(x, y) {
      const base = this._staticExposure(x, y);
      if (this.linternaSystem) {
        const lamp = this.linternaSystem.getExposureAt(x, y);
        return Math.max(base, lamp);
      }
      return base;
    }

    _underFurnitureShadow(x, y) {
      const pad = 26;
      for (const f of this.furniture) {
        if (x >= f.x - pad && x <= f.x + f.w + pad &&
            y >= f.y - pad && y <= f.y + f.h + pad) {
          return true;
        }
      }
      return false;
    }

    isExposed(exposure) {
      return exposure >= LIGHT_EXPOSED_THRESHOLD;
    }

    isCritical(exposure) {
      return exposure >= EXPOSURE_DEAD_THRESHOLD;
    }

    /** Velocidad de cambio de la barra de exposición */
    getRate(exposure) {
      return exposure >= LIGHT_EXPOSED_THRESHOLD
        ? EXPOSURE_RISE_RATE * exposure
        : -EXPOSURE_DECAY_RATE;
    }
  };
})(window.Pancha);
