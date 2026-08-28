import * as THREE from 'three';
import { ZombieStates } from './ZombieStates.js';

const STATE_COLORS = Object.freeze({
  [ZombieStates.IDLE]: new THREE.Color(0x94a3b8),
  [ZombieStates.INVESTIGATE]: new THREE.Color(0xfacc15),
  [ZombieStates.CHASE]: new THREE.Color(0xfb923c),
  [ZombieStates.ATTACK]: new THREE.Color(0xef4444),
  [ZombieStates.STAGGER]: new THREE.Color(0x22d3ee),
  [ZombieStates.SPAWNING]: new THREE.Color(0xa855f7),
  [ZombieStates.DEAD]: new THREE.Color(0x475569)
});

export class AIDebugRenderer {
  constructor({ scene, zombies, enabled = false, getDirectorState = () => null }) {
    this.scene = scene;
    this.zombies = zombies;
    this.enabled = enabled;
    this.getDirectorState = getDirectorState;
    this.geometry = null;
    this.lines = null;
    this.overlay = null;

    if (!enabled) return;
    const vertices = new Float32Array(zombies.length * 2 * 3);
    const colors = new Float32Array(zombies.length * 2 * 3);
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const material = new THREE.LineBasicMaterial({ vertexColors: true, depthTest: false, transparent: true, opacity: 0.8 });
    this.lines = new THREE.LineSegments(this.geometry, material);
    this.lines.renderOrder = 1000;
    scene.add(this.lines);

    this.overlay = document.createElement('div');
    this.overlay.id = 'ai-debug';
    Object.assign(this.overlay.style, {
      position: 'fixed', left: '8px', bottom: '8px', zIndex: '9999', pointerEvents: 'none',
      padding: '6px 8px', color: '#fff', background: '#020617cc', font: '11px monospace',
      whiteSpace: 'pre', border: '1px solid #334155'
    });
    document.body.appendChild(this.overlay);
  }

  update() {
    if (!this.enabled) return;
    const positions = this.geometry.attributes.position.array;
    const colors = this.geometry.attributes.color.array;
    const counts = Object.create(null);
    let vertex = 0;
    let targetDistance = 0;
    let movingCount = 0;
    let routedCount = 0;
    let stuckCount = 0;

    for (const zombie of this.zombies) {
      if (!zombie.active) continue;
      counts[zombie.state] = (counts[zombie.state] || 0) + 1;
      if (!zombie.ai || zombie.state === ZombieStates.DEAD) continue;
      const target = zombie.ai.steeringTarget;
      targetDistance += Math.hypot(target.x - zombie.pos.x, target.z - zombie.pos.z);
      movingCount++;
      if (zombie.ai.path.length > 0) routedCount++;
      if (zombie.stuckCount > 0) stuckCount++;
      positions[vertex * 3] = zombie.pos.x;
      positions[vertex * 3 + 1] = 1.1;
      positions[vertex * 3 + 2] = zombie.pos.z;
      positions[(vertex + 1) * 3] = target.x;
      positions[(vertex + 1) * 3 + 1] = 0.12;
      positions[(vertex + 1) * 3 + 2] = target.z;
      const color = STATE_COLORS[zombie.state] || STATE_COLORS[ZombieStates.IDLE];
      for (let endpoint = 0; endpoint < 2; endpoint++) color.toArray(colors, (vertex + endpoint) * 3);
      vertex += 2;
    }

    this.geometry.setDrawRange(0, vertex);
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    const stateText = Object.entries(counts).map(([state, count]) => `${state}: ${count}`).join('\n') || 'Sin zombis activos';
    const director = this.getDirectorState();
    const directorText = director ? `\nOleada: ${director.wave} · ${director.phase} · Intensidad ${director.intensity.toFixed(2)}` : '';
    this.overlay.textContent = `${stateText}\nDist. objetivo: ${movingCount ? (targetDistance / movingCount).toFixed(1) : '-'}\nRutas: ${routedCount} · Atascados: ${stuckCount}${directorText}`;
  }

  dispose() {
    if (!this.enabled) return;
    this.scene.remove(this.lines);
    this.geometry.dispose();
    this.lines.material.dispose();
    this.overlay?.remove();
  }
}
