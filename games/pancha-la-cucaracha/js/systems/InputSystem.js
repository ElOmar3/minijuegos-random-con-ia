(function (P) {
  /**
   * Sistema de entrada unificado: teclado (WASD/flechas) + joystick virtual
   * nipple.js en móvil. Expone un vector de movimiento normalizado.
   */

  // Joystick singleton: sobrevive a reinicios de escena sin duplicarse en el DOM
  let sharedJoystick = null;
  const joystickVec = new Phaser.Math.Vector2(0, 0);

  P.InputSystem = class InputSystem {
    constructor(scene) {
      this.scene = scene;
      this.vector = new Phaser.Math.Vector2(0, 0);
      this._keyboardVec = new Phaser.Math.Vector2(0, 0);
      this._joystickVec = joystickVec;

      this._setupKeyboard();
      this._setupTouch();
    }

    _setupKeyboard() {
      this.keys = this.scene.input.keyboard.addKeys({
        up: 'W', down: 'S', left: 'A', right: 'D',
        arrUp: 'UP', arrDown: 'DOWN', arrLeft: 'LEFT', arrRight: 'RIGHT'
      });
    }

    _setupTouch() {
      if (!('ontouchstart' in window) && !navigator.maxTouchPoints) return;

      document.body.classList.add('touch-mode');
      this.isTouch = true;

      if (sharedJoystick) return; // ya existe, reutilizar

      const zone = document.getElementById('joystick-zone');
      sharedJoystick = nipplejs.create({
        zone,
        mode: 'dynamic',
        position: { left: '120px', bottom: '120px' },
        size: 110,
        color: '#ffb340'
      });

      sharedJoystick.on('move', (_evt, data) => {
        const force = Math.min(data.force ?? 0, 1);
        const rad = (data.angle?.radian) ?? 0;
        joystickVec.set(Math.cos(rad) * force, -Math.sin(rad) * force);
      });

      const reset = () => joystickVec.set(0, 0);
      sharedJoystick.on('end', reset);
    }

    update() {
      const k = this.keys;
      let x = 0;
      let y = 0;
      if (k.left.isDown || k.arrLeft.isDown) x -= 1;
      if (k.right.isDown || k.arrRight.isDown) x += 1;
      if (k.up.isDown || k.arrUp.isDown) y -= 1;
      if (k.down.isDown || k.arrDown.isDown) y += 1;
      this._keyboardVec.set(x, y).normalize();

      // El joystick tiene prioridad si está activo
      if (this._joystickVec.lengthSq() > 0.01) {
        this.vector.copy(this._joystickVec);
      } else {
        this.vector.copy(this._keyboardVec);
      }
    }

    destroy() {
      document.body.classList.remove('touch-mode');
      joystickVec.set(0, 0);
    }
  };
})(window.Pancha);
