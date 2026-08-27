(function (P) {
  /**
   * Menú principal: título, instrucciones y arranque de partida.
   */
  P.MenuScene = class MenuScene extends Phaser.Scene {
    constructor() {
      super(P.SCENES.MENU);
    }

    create() {
      const cx = P.GAME_W / 2;
      const cy = this.scale.height / 2;
      this.cameras.main.setBackgroundColor('#1a140d');

      // Piso de baldosas decorativo
      for (let x = 0; x < P.GAME_W; x += 64) {
        for (let y = 0; y < P.GAME_H; y += 64) {
          this.add.image(x + 32, y + 32, 'atlas', 'tile').setAlpha(0.12);
        }
      }

      this.add.rectangle(cx, cy, 620, 380, 0x14100c, 0.88)
        .setStrokeStyle(4, 0x5c3a1a);

      // Título con Pancha animada
      const pancha = this.add.image(cx - 190, cy - 110, 'atlas', 'pancha_right_0').setScale(1.6);
      this.tweens.add({
        targets: pancha,
        angle: { from: -8, to: 8 },
        duration: 700,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });

      this.add.text(cx - 150, cy - 130, 'PANCHA', {
        fontFamily: 'Trebuchet MS', fontSize: '64px', fontStyle: 'bold',
        color: '#ffb340', stroke: '#3a2008', strokeThickness: 8
      }).setOrigin(0);
      this.add.text(cx - 150, cy - 62, 'LA CUCARACHA', {
        fontFamily: 'Trebuchet MS', fontSize: '28px', color: '#e8dcc0'
      }).setOrigin(0);

      this.add.text(cx, cy + 6,
        'Cruza la cocina hasta tu nido sin que te aplaste la chancla.\n' +
        'Muévete por las sombras: a plena luz te ven.\n' +
        'Recoge migas — las de zonas iluminadas valen más puntos.',
        { fontFamily: 'Trebuchet MS', fontSize: '18px', color: '#c9bfae', align: 'center', lineSpacing: 8 }
      ).setOrigin(0.5);

      this.add.text(cx, cy + 96,
        'WASD / Flechas para moverte   ·   En móvil: joystick táctil\nNo hay ataque: esquiva y escóndete.',
        { fontFamily: 'Trebuchet MS', fontSize: '16px', color: '#8f8570', align: 'center' }
      ).setOrigin(0.5);

      const startBtn = this.add.text(cx, cy + 155, '▶  JUGAR', {
        fontFamily: 'Trebuchet MS', fontSize: '30px', fontStyle: 'bold',
        color: '#14100c', backgroundColor: '#ffb340',
        padding: { x: 26, y: 10 }
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      startBtn.on('pointerover', () => startBtn.setBackgroundColor('#ffd07a'));
      startBtn.on('pointerout', () => startBtn.setBackgroundColor('#ffb340'));
      startBtn.on('pointerdown', () => this.scene.start(P.SCENES.GAME));

      // También iniciar con cualquier tecla
      this.input.keyboard.once('keydown', () => this.scene.start(P.SCENES.GAME));
    }
  };
})(window.Pancha);
