const NEIGHBORS = [
  [-1, 0, 1], [1, 0, 1], [0, -1, 1], [0, 1, 1],
  [-1, -1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [1, 1, Math.SQRT2]
];

export class GridNavigation {
  constructor({ min = -29, max = 29, config, isBlocked }) {
    this.min = min;
    this.max = max;
    this.config = config;
    this.isBlocked = isBlocked;
    this.cellSize = config.cellSize;
    this.width = Math.ceil((max - min) / this.cellSize);
    this.total = this.width * this.width;
    this.walkable = new Uint8Array(this.total);
    this.gScore = new Float32Array(this.total);
    this.fScore = new Float32Array(this.total);
    this.cameFrom = new Int32Array(this.total);
    this.openFlags = new Uint8Array(this.total);
    this.closedFlags = new Uint8Array(this.total);
    this.open = [];
    this.rebuild();
  }

  index(cellX, cellZ) {
    return cellZ * this.width + cellX;
  }

  cellFromWorld(value) {
    return Math.max(0, Math.min(this.width - 1, Math.floor((value - this.min) / this.cellSize)));
  }

  worldFromCell(cell) {
    return this.min + (cell + 0.5) * this.cellSize;
  }

  rebuild() {
    for (let z = 0; z < this.width; z++) {
      for (let x = 0; x < this.width; x++) {
        const worldX = this.worldFromCell(x);
        const worldZ = this.worldFromCell(z);
        this.walkable[this.index(x, z)] = this.isBlocked(worldX, worldZ, this.config.clearance) ? 0 : 1;
      }
    }
  }

  isWalkable(cellX, cellZ) {
    return cellX >= 0 && cellZ >= 0 && cellX < this.width && cellZ < this.width && this.walkable[this.index(cellX, cellZ)] === 1;
  }

  nearestWalkable(cellX, cellZ) {
    if (this.isWalkable(cellX, cellZ)) return [cellX, cellZ];
    for (let radius = 1; radius <= 3; radius++) {
      for (let dz = -radius; dz <= radius; dz++) {
        for (let dx = -radius; dx <= radius; dx++) {
          if (Math.abs(dx) !== radius && Math.abs(dz) !== radius) continue;
          const x = cellX + dx;
          const z = cellZ + dz;
          if (this.isWalkable(x, z)) return [x, z];
        }
      }
    }
    return null;
  }

  heuristic(aX, aZ, bX, bZ) {
    const dx = Math.abs(aX - bX);
    const dz = Math.abs(aZ - bZ);
    return Math.max(dx, dz) + (Math.SQRT2 - 1) * Math.min(dx, dz);
  }

  findPath(start, target, outPath) {
    outPath.length = 0;
    let startCell = this.nearestWalkable(this.cellFromWorld(start.x), this.cellFromWorld(start.z));
    let targetCell = this.nearestWalkable(this.cellFromWorld(target.x), this.cellFromWorld(target.z));
    if (!startCell || !targetCell) return false;

    const [startX, startZ] = startCell;
    const [targetX, targetZ] = targetCell;
    const startIndex = this.index(startX, startZ);
    const targetIndex = this.index(targetX, targetZ);
    if (startIndex === targetIndex) return true;

    this.gScore.fill(Infinity);
    this.fScore.fill(Infinity);
    this.cameFrom.fill(-1);
    this.openFlags.fill(0);
    this.closedFlags.fill(0);
    this.open.length = 0;

    this.gScore[startIndex] = 0;
    this.fScore[startIndex] = this.heuristic(startX, startZ, targetX, targetZ);
    this.open.push(startIndex);
    this.openFlags[startIndex] = 1;

    let visited = 0;
    while (this.open.length && visited < this.config.maxSearchNodes) {
      visited++;
      let bestOpen = 0;
      for (let i = 1; i < this.open.length; i++) {
        if (this.fScore[this.open[i]] < this.fScore[this.open[bestOpen]]) bestOpen = i;
      }
      const current = this.open[bestOpen];
      this.open[bestOpen] = this.open[this.open.length - 1];
      this.open.pop();
      this.openFlags[current] = 0;
      if (current === targetIndex) return this.reconstructPath(current, startIndex, outPath);
      this.closedFlags[current] = 1;

      const currentX = current % this.width;
      const currentZ = Math.floor(current / this.width);
      for (const [dx, dz, cost] of NEIGHBORS) {
        const nextX = currentX + dx;
        const nextZ = currentZ + dz;
        if (!this.isWalkable(nextX, nextZ)) continue;
        if (dx !== 0 && dz !== 0 && (!this.isWalkable(currentX + dx, currentZ) || !this.isWalkable(currentX, currentZ + dz))) continue;
        const next = this.index(nextX, nextZ);
        if (this.closedFlags[next]) continue;
        const tentative = this.gScore[current] + cost;
        if (tentative >= this.gScore[next]) continue;
        this.cameFrom[next] = current;
        this.gScore[next] = tentative;
        this.fScore[next] = tentative + this.heuristic(nextX, nextZ, targetX, targetZ);
        if (!this.openFlags[next]) {
          this.openFlags[next] = 1;
          this.open.push(next);
        }
      }
    }
    return false;
  }

  reconstructPath(current, startIndex, outPath) {
    while (current >= 0 && current !== startIndex) {
      const x = current % this.width;
      const z = Math.floor(current / this.width);
      outPath.push({ x: this.worldFromCell(x), z: this.worldFromCell(z) });
      current = this.cameFrom[current];
    }
    outPath.reverse();
    return outPath.length > 0;
  }

  hasLineOfSight(from, to, radius = 0.5) {
    const dx = to.x - from.x;
    const dz = to.z - from.z;
    const distance = Math.hypot(dx, dz);
    const steps = Math.max(1, Math.ceil(distance / 0.8));
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      if (this.isBlocked(from.x + dx * t, from.z + dz * t, radius)) return false;
    }
    return true;
  }

  writeRecoveryDirection(position, seed, out) {
    const baseAngle = seed * 2.399963229728653;
    for (let i = 0; i < 8; i++) {
      const angle = baseAngle + i * Math.PI * 0.25;
      const x = Math.sin(angle);
      const z = Math.cos(angle);
      if (!this.isBlocked(position.x + x * 1.8, position.z + z * 1.8, this.config.clearance)) {
        out.set(x, 0, z);
        return true;
      }
    }
    return false;
  }
}
