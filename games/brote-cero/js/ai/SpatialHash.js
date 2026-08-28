export class SpatialHash {
  constructor(cellSize = 3) {
    this.cellSize = cellSize;
    this.cells = new Map();
    this.usedCells = [];
  }

  keyFor(x, z) {
    const cellX = Math.floor(x / this.cellSize);
    const cellZ = Math.floor(z / this.cellSize);
    return `${cellX},${cellZ}`;
  }

  beginFrame() {
    for (const cell of this.usedCells) cell.length = 0;
    this.usedCells.length = 0;
  }

  insert(agent) {
    const key = this.keyFor(agent.pos.x, agent.pos.z);
    let cell = this.cells.get(key);
    if (!cell) {
      cell = [];
      this.cells.set(key, cell);
    }
    if (cell.length === 0) this.usedCells.push(cell);
    cell.push(agent);
    agent.spatialCell = key;
  }

  forEachNearby(x, z, radius, callback) {
    const minX = Math.floor((x - radius) / this.cellSize);
    const maxX = Math.floor((x + radius) / this.cellSize);
    const minZ = Math.floor((z - radius) / this.cellSize);
    const maxZ = Math.floor((z + radius) / this.cellSize);

    for (let cellX = minX; cellX <= maxX; cellX++) {
      for (let cellZ = minZ; cellZ <= maxZ; cellZ++) {
        const cell = this.cells.get(`${cellX},${cellZ}`);
        if (!cell?.length) continue;
        for (let i = 0; i < cell.length; i++) callback(cell[i]);
      }
    }
  }

  clear() {
    this.cells.clear();
    this.usedCells.length = 0;
  }
}
