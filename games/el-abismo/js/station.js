/**
 * EL ABISMO 3D: DEEPCORE PROTOCOL
 * Gestión del Estado de la Estación Submarina Deepcore y Eventos
 */

class Station {
  constructor(difficultyConfig) {
    this.config = difficultyConfig;
    this.oxygen = 100;
    this.hullIntegrity = 100;
    this.reactorEnergy = 100;
    this.ntiHarmony = 25;
    this.waterTotal = 0;

    // Inicializar salas
    this.rooms = {};
    for (const key in CONSTANTS.ROOMS) {
      const r = CONSTANTS.ROOMS[key];
      this.rooms[r.id] = {
        ...r,
        waterLevel: 0,
        activeCrisis: null
      };
    }

    this.corridors = CONSTANTS.CORRIDORS;
    this.crisisTimer = 0;
    this.nextCrisisTime = 3500;
    this.ntiBonusActive = false;
    this.ntiBonusTimer = 0;

    // Transmisión de radio activa
    this.currentComms = null;
    this.commsTimer = 0;

    this.triggerComms(CONSTANTS.COMMS_MESSAGES.WELCOME);
  }

  triggerComms(msgObj) {
    this.currentComms = msgObj;
    this.commsTimer = 5500;
  }

  update(dt, audio) {
    // Decaimiento natural de oxígeno y reactor
    this.oxygen = Math.max(0, this.oxygen - this.config.oxigenoDecay * (dt / 1000) * 10);
    this.reactorEnergy = Math.max(0, this.reactorEnergy - 0.02 * (dt / 1000) * 10);

    if (this.oxygen < 30 && this.oxygen > 28 && this.commsTimer <= 0) {
      this.triggerComms(CONSTANTS.COMMS_MESSAGES.O2_LOW);
      audio.playAlarm();
    }

    if (this.oxygen <= 10 || this.reactorEnergy <= 5) {
      this.hullIntegrity = Math.max(0, this.hullIntegrity - 0.08 * (dt / 1000) * 10);
    }

    // Actualizar inundación en salas
    let totalWater = 0;
    for (const id in this.rooms) {
      const room = this.rooms[id];
      if (room.activeCrisis && room.activeCrisis.id === 'HULL_LEAK') {
        room.waterLevel = Math.min(100, room.waterLevel + this.config.tasaInundacion * (dt / 16));
      }

      if (room.waterLevel > 75) {
        this.hullIntegrity = Math.max(0, this.hullIntegrity - 0.035 * (dt / 16));
      }
      totalWater += room.waterLevel;
    }
    this.waterTotal = totalWater / Object.keys(this.rooms).length;

    if (this.waterTotal > 40 && this.waterTotal < 43 && this.commsTimer <= 0) {
      this.triggerComms(CONSTANTS.COMMS_MESSAGES.PUMP_ADVICE);
    }

    // Crisis
    this.crisisTimer += dt;
    if (this.crisisTimer >= this.nextCrisisTime) {
      this.crisisTimer = 0;
      this.nextCrisisTime = this.config.frecuenciaCrisis + (Math.random() - 0.5) * 2000;
      this.spawnRandomCrisis(audio);
    }

    // Bonificación NTI
    if (this.ntiBonusActive) {
      this.ntiBonusTimer -= dt;
      if (this.ntiBonusTimer <= 0) {
        this.ntiBonusActive = false;
      }
    }

    // Temporizador de radio
    if (this.commsTimer > 0) {
      this.commsTimer -= dt;
      if (this.commsTimer <= 0) {
        this.currentComms = null;
      }
    }
  }

  spawnRandomCrisis(audio) {
    const roomKeys = Object.keys(this.rooms);
    const availableRooms = roomKeys.filter(k => !this.rooms[k].activeCrisis);
    if (availableRooms.length === 0) return;

    const chosenRoomId = availableRooms[Math.floor(Math.random() * availableRooms.length)];
    const chosenRoom = this.rooms[chosenRoomId];

    const crisisKeys = Object.keys(CONSTANTS.CRISIS_TYPES);
    const chosenCrisisKey = crisisKeys[Math.floor(Math.random() * crisisKeys.length)];
    const crisisTemplate = CONSTANTS.CRISIS_TYPES[chosenCrisisKey];

    chosenRoom.activeCrisis = {
      ...crisisTemplate,
      progress: 0,
      x: chosenRoom.x + chosenRoom.w * (0.35 + Math.random() * 0.3),
      y: chosenRoom.y + chosenRoom.h * (0.35 + Math.random() * 0.3)
    };

    audio.playAlarm();

    if (crisisTemplate.id === 'HULL_LEAK') {
      this.triggerComms(CONSTANTS.COMMS_MESSAGES.LEAK_ALERT);
    }
  }

  resolveCrisis(room) {
    if (!room.activeCrisis) return;
    room.activeCrisis = null;
    this.hullIntegrity = Math.min(100, this.hullIntegrity + 8);
  }

  restoreOxygen(amount) {
    this.oxygen = Math.min(100, this.oxygen + amount);
  }

  stabilizeReactor(amount) {
    this.reactorEnergy = Math.min(100, this.reactorEnergy + amount);
  }

  drainAllRooms(amount) {
    for (const id in this.rooms) {
      this.rooms[id].waterLevel = Math.max(0, this.rooms[id].waterLevel - amount);
    }
  }

  communeWithNTI(amount) {
    this.ntiHarmony = Math.min(100, this.ntiHarmony + amount);
    if (this.ntiHarmony >= 100) {
      this.ntiHarmony = 35;
      this.oxygen = 100;
      this.reactorEnergy = 100;
      this.hullIntegrity = Math.min(100, this.hullIntegrity + 30);
      this.drainAllRooms(60);
      this.ntiBonusActive = true;
      this.ntiBonusTimer = 9000;
      this.triggerComms(CONSTANTS.COMMS_MESSAGES.NTI_GIFT);
    }
  }

  getMostCriticalIssue(x, y) {
    let closestIssue = null;
    let minDistance = Infinity;

    for (const id in this.rooms) {
      const r = this.rooms[id];
      if (r.activeCrisis) {
        const dist = Math.hypot(r.activeCrisis.x - x, r.activeCrisis.y - y);
        if (dist < minDistance) {
          minDistance = dist;
          closestIssue = { x: r.activeCrisis.x, y: r.activeCrisis.y, type: 'CRISIS', room: r };
        }
      }
    }
    return closestIssue;
  }

  getFloodedRoom() {
    for (const id in this.rooms) {
      if (this.rooms[id].waterLevel > 35) {
        return this.rooms[id];
      }
    }
    return null;
  }

  getRoomAt(x, y) {
    for (const id in this.rooms) {
      const r = this.rooms[id];
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
        return r;
      }
    }
    return null;
  }

  getNearbyTerminal(x, y, maxDist = 55) {
    for (const id in this.rooms) {
      const r = this.rooms[id];
      if (r.terminal) {
        const dist = Math.hypot(r.terminal.x - x, r.terminal.y - y);
        if (dist <= maxDist) {
          return r.terminal;
        }
      }
    }
    return null;
  }

  isInsideWalkable(x, y, radius = 12) {
    for (const id in this.rooms) {
      const r = this.rooms[id];
      if (
        x >= r.x + 8 &&
        x <= r.x + r.w - 8 &&
        y >= r.y + 8 &&
        y <= r.y + r.h - 8
      ) {
        return true;
      }
    }

    for (const c of this.corridors) {
      if (
        x >= c.x + 4 &&
        x <= c.x + c.w - 4 &&
        y >= c.y + 4 &&
        y <= c.y + c.h - 4
      ) {
        return true;
      }
    }

    return false;
  }
}
