export class InputManager {
  constructor({
    dom,
    controls,
    isTouch,
    mouseSensitivity,
    touchSensitivity,
    sensitivityInputs = [],
    sensitivityMultiplier = 1,
    onSensitivityChange = () => {},
    isGameplayActive,
    onUserGesture,
    onLook,
    onFire,
    onReload,
    onCycleWeapon,
    onSelectWeapon,
    onInteractStart,
    onInteractEnd,
    onPause,
    onToggleFlashlight,
    isPerkSelectionActive = () => false,
    onPerkChoice = () => {}
  }) {
    this.dom = dom;
    this.controls = controls;
    this.isTouch = isTouch;
    this.baseMouseSensitivity = mouseSensitivity;
    this.mouseSensitivity = mouseSensitivity;
    this.touchSensitivity = touchSensitivity;
    this.sensitivityInputs = [...sensitivityInputs];
    this.sensitivityMultiplier = sensitivityMultiplier;
    this.onSensitivityChange = onSensitivityChange;
    this.isGameplayActive = isGameplayActive;
    this.onUserGesture = onUserGesture;
    this.onLook = onLook;
    this.onFire = onFire;
    this.onReload = onReload;
    this.onCycleWeapon = onCycleWeapon;
    this.onSelectWeapon = onSelectWeapon;
    this.onInteractStart = onInteractStart;
    this.onInteractEnd = onInteractEnd;
    this.onPause = onPause;
    this.onToggleFlashlight = onToggleFlashlight;
    this.isPerkSelectionActive = isPerkSelectionActive;
    this.onPerkChoice = onPerkChoice;

    this.keys = Object.create(null);
    this.pressed = new Set();
    this.triggerDown = false;
    this.sprintTouch = false;
    this.joyX = 0;
    this.joyY = 0;
    this.leftDrag = false;
    this.rightDrag = false;
    this.touchLookId = null;
    this.lastTouchX = 0;
    this.lastTouchY = 0;
    this.joystick = null;

    this.handlers = {
      keydown: event => this.handleKeyDown(event),
      keyup: event => this.handleKeyUp(event),
      wheel: () => this.handleWheel(),
      mousedown: event => this.handleMouseDown(event),
      mouseup: event => this.handleMouseUp(event),
      mousemove: event => this.handleMouseMove(event),
      contextmenu: event => event.preventDefault(),
      blur: () => this.resetTransient(),
      weaponClick: event => this.handleWeaponClick(event),
      touchLookStart: event => this.handleTouchLookStart(event),
      touchLookMove: event => this.handleTouchLookMove(event),
      touchLookEnd: event => this.handleTouchLookEnd(event),
      touchFireStart: event => this.handleTouchFireStart(event),
      touchFireEnd: event => this.handleTouchFireEnd(event),
      touchReload: event => { event.preventDefault(); this.onReload(); },
      touchSwitch: event => { event.preventDefault(); this.onCycleWeapon(); },
      touchInteractStart: event => { event.preventDefault(); this.onUserGesture(); this.onInteractStart(); },
      touchInteractEnd: event => { event.preventDefault(); this.onInteractEnd(); },
      touchSprint: event => this.handleTouchSprint(event),
      sensitivity: event => this.setSensitivityMultiplier(Number(event.currentTarget.value))
    };
    this.setSensitivityMultiplier(sensitivityMultiplier, false);
  }

  attach() {
    document.addEventListener('keydown', this.handlers.keydown);
    document.addEventListener('keyup', this.handlers.keyup);
    document.addEventListener('wheel', this.handlers.wheel, { passive: true });
    document.addEventListener('mousedown', this.handlers.mousedown);
    document.addEventListener('mouseup', this.handlers.mouseup);
    document.addEventListener('mousemove', this.handlers.mousemove);
    document.addEventListener('contextmenu', this.handlers.contextmenu);
    window.addEventListener('blur', this.handlers.blur);
    this.dom.weaponBar.addEventListener('click', this.handlers.weaponClick);
    for (const slider of this.sensitivityInputs) {
      slider.addEventListener('input', this.handlers.sensitivity);
    }

    if (!this.isTouch) return;
    if (window.nipplejs) {
      this.joystick = window.nipplejs.create({
        zone: this.dom.joyZone,
        mode: 'dynamic',
        color: 'rgba(126, 200, 80, 0.75)',
        size: 100
      });
      this.joystick.on('move', (event, data) => {
        if (data?.vector) {
          this.joyX = data.vector.x;
          this.joyY = data.vector.y;
        }
      });
      this.joystick.on('end', () => {
        this.joyX = 0;
        this.joyY = 0;
      });
    }

    this.dom.lookZone.addEventListener('touchstart', this.handlers.touchLookStart, { passive: false });
    this.dom.lookZone.addEventListener('touchmove', this.handlers.touchLookMove, { passive: false });
    this.dom.lookZone.addEventListener('touchend', this.handlers.touchLookEnd);
    this.dom.lookZone.addEventListener('touchcancel', this.handlers.touchLookEnd);
    this.dom.btnFire.addEventListener('touchstart', this.handlers.touchFireStart, { passive: false });
    this.dom.btnFire.addEventListener('touchend', this.handlers.touchFireEnd, { passive: false });
    this.dom.btnFire.addEventListener('touchcancel', this.handlers.touchFireEnd, { passive: false });
    this.dom.btnReload.addEventListener('touchstart', this.handlers.touchReload, { passive: false });
    this.dom.btnSwitch.addEventListener('touchstart', this.handlers.touchSwitch, { passive: false });
    this.dom.btnInteract.addEventListener('touchstart', this.handlers.touchInteractStart, { passive: false });
    this.dom.btnInteract.addEventListener('touchend', this.handlers.touchInteractEnd, { passive: false });
    this.dom.btnInteract.addEventListener('touchcancel', this.handlers.touchInteractEnd, { passive: false });
    this.dom.btnSprint.addEventListener('touchstart', this.handlers.touchSprint, { passive: false });
  }

  isDown(code) {
    return Boolean(this.keys[code]);
  }

  consumePressed(code) {
    const wasPressed = this.pressed.has(code);
    this.pressed.delete(code);
    return wasPressed;
  }

  setSensitivityMultiplier(value, notify = true) {
    const multiplier = Math.max(0.5, Math.min(2, Number.isFinite(value) ? value : 1));
    this.sensitivityMultiplier = multiplier;
    this.mouseSensitivity = this.baseMouseSensitivity * multiplier;
    for (const slider of this.sensitivityInputs) {
      slider.value = multiplier.toFixed(2);
      const output = slider.parentElement?.querySelector('.sensitivity-value');
      if (output) output.value = `${multiplier.toFixed(2)}×`;
    }
    if (notify) this.onSensitivityChange(multiplier);
  }

  handleKeyDown(event) {
    this.onUserGesture();
    if (!event.repeat) this.pressed.add(event.code);
    this.keys[event.code] = true;
    if (event.code.startsWith('Arrow') || event.code === 'Space') event.preventDefault();
    if (!event.repeat && this.isPerkSelectionActive()) {
      const choice = { Digit1: 0, Numpad1: 0, Digit2: 1, Numpad2: 1, Digit3: 2, Numpad3: 2 }[event.code];
      if (Number.isInteger(choice)) {
        event.preventDefault();
        this.onPerkChoice(choice);
      }
      return;
    }
    if (event.repeat || !this.isGameplayActive()) return;

    const weaponByKey = {
      Digit1: 'pistol', Digit2: 'shotgun', Digit3: 'smg',
      Digit4: 'rifle', Digit5: 'sniper', Digit6: 'rpg'
    };
    if (event.code === 'KeyR') this.onReload();
    else if (event.code === 'KeyE') this.onInteractStart();
    else if (event.code === 'Escape') this.onPause();
    else if (weaponByKey[event.code]) this.onSelectWeapon(weaponByKey[event.code]);
    else if (event.code === 'KeyQ') this.onCycleWeapon();
    else if (event.code === 'KeyF') this.onToggleFlashlight();
  }

  handleKeyUp(event) {
    this.keys[event.code] = false;
    if (event.code === 'KeyE') this.onInteractEnd();
  }

  handleWheel() {
    if (this.isGameplayActive()) this.onCycleWeapon();
  }

  handleMouseDown(event) {
    this.onUserGesture();
    if (this.isTouch || !this.isGameplayActive()) return;
    if (event.button === 0) {
      this.triggerDown = true;
      this.leftDrag = true;
      this.onFire();
    } else if (event.button === 2) {
      this.rightDrag = true;
    }
  }

  handleMouseUp(event) {
    if (event.button === 0) {
      this.triggerDown = false;
      this.leftDrag = false;
    }
    if (event.button === 2) this.rightDrag = false;
  }

  handleMouseMove(event) {
    if (this.isTouch || !this.isGameplayActive()) return;
    if (this.controls.isLocked || this.rightDrag || this.leftDrag) {
      this.onLook(event.movementX * this.mouseSensitivity, event.movementY * this.mouseSensitivity);
    }
  }

  handleWeaponClick(event) {
    const slot = event.target.closest('.weapon-slot');
    if (!slot) return;
    const weaponId = slot.getAttribute('data-slot');
    if (weaponId) this.onSelectWeapon(weaponId);
  }

  handleTouchLookStart(event) {
    this.onUserGesture();
    for (const touch of event.changedTouches) {
      if (this.touchLookId !== null) break;
      this.touchLookId = touch.identifier;
      this.lastTouchX = touch.clientX;
      this.lastTouchY = touch.clientY;
    }
  }

  handleTouchLookMove(event) {
    event.preventDefault();
    for (const touch of event.changedTouches) {
      if (touch.identifier !== this.touchLookId) continue;
      const dx = touch.clientX - this.lastTouchX;
      const dy = touch.clientY - this.lastTouchY;
      this.lastTouchX = touch.clientX;
      this.lastTouchY = touch.clientY;
      this.onLook(dx * this.touchSensitivity, dy * this.touchSensitivity);
    }
  }

  handleTouchLookEnd(event) {
    for (const touch of event.changedTouches) {
      if (touch.identifier === this.touchLookId) this.touchLookId = null;
    }
  }

  handleTouchFireStart(event) {
    event.preventDefault();
    this.onUserGesture();
    this.triggerDown = true;
    this.onFire();
  }

  handleTouchFireEnd(event) {
    event.preventDefault();
    this.triggerDown = false;
  }

  handleTouchSprint(event) {
    event.preventDefault();
    this.sprintTouch = !this.sprintTouch;
    this.dom.btnSprint.classList.toggle('active', this.sprintTouch);
  }

  resetTransient() {
    this.onInteractEnd?.();
    this.keys = Object.create(null);
    this.pressed.clear();
    this.triggerDown = false;
    this.leftDrag = false;
    this.rightDrag = false;
    this.joyX = 0;
    this.joyY = 0;
  }

  dispose() {
    document.removeEventListener('keydown', this.handlers.keydown);
    document.removeEventListener('keyup', this.handlers.keyup);
    document.removeEventListener('wheel', this.handlers.wheel);
    document.removeEventListener('mousedown', this.handlers.mousedown);
    document.removeEventListener('mouseup', this.handlers.mouseup);
    document.removeEventListener('mousemove', this.handlers.mousemove);
    document.removeEventListener('contextmenu', this.handlers.contextmenu);
    window.removeEventListener('blur', this.handlers.blur);
    this.dom.weaponBar.removeEventListener('click', this.handlers.weaponClick);
    for (const slider of this.sensitivityInputs) {
      slider.removeEventListener('input', this.handlers.sensitivity);
    }

    if (this.isTouch) {
      this.dom.lookZone.removeEventListener('touchstart', this.handlers.touchLookStart);
      this.dom.lookZone.removeEventListener('touchmove', this.handlers.touchLookMove);
      this.dom.lookZone.removeEventListener('touchend', this.handlers.touchLookEnd);
      this.dom.lookZone.removeEventListener('touchcancel', this.handlers.touchLookEnd);
      this.dom.btnFire.removeEventListener('touchstart', this.handlers.touchFireStart);
      this.dom.btnFire.removeEventListener('touchend', this.handlers.touchFireEnd);
      this.dom.btnFire.removeEventListener('touchcancel', this.handlers.touchFireEnd);
      this.dom.btnReload.removeEventListener('touchstart', this.handlers.touchReload);
      this.dom.btnSwitch.removeEventListener('touchstart', this.handlers.touchSwitch);
      this.dom.btnInteract.removeEventListener('touchstart', this.handlers.touchInteractStart);
      this.dom.btnInteract.removeEventListener('touchend', this.handlers.touchInteractEnd);
      this.dom.btnInteract.removeEventListener('touchcancel', this.handlers.touchInteractEnd);
      this.dom.btnSprint.removeEventListener('touchstart', this.handlers.touchSprint);
      this.joystick?.destroy();
    }
    this.resetTransient();
  }
}
