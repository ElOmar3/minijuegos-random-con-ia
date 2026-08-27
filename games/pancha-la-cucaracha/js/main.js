(function (P) {
  // Arranque del juego (compatible con file:// — sin módulos ES)
  const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: P.GAME_W,
    height: P.GAME_H,
    backgroundColor: '#1a140d',
    pixelArt: true,
    physics: {
      default: 'arcade',
      arcade: {
        debug: false
      }
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: [P.BootScene, P.MenuScene, P.GameScene, P.HUDScene]
  };

  window.addEventListener('load', () => {
    const game = new Phaser.Game(config);
    window.__panchaGame = game; // útil para depuración en consola
  });
})(window.Pancha);
