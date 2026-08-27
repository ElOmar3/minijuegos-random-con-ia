(function (P) {
  /**
   * Escena de arranque: genera las texturas procedurales y salta al menú.
   */
  P.BootScene = class BootScene extends Phaser.Scene {
    constructor() {
      super(P.SCENES.BOOT);
    }

    create() {
      P.buildTextures(this);
      this.scene.start(P.SCENES.MENU);
    }
  };
})(window.Pancha);
