/* ==========================================================================
   3D CROPS & PLOTS SYSTEM
   ========================================================================== */

import { scene } from './world.js';
import { CROPS } from './data.js';
import { sfxPlant, sfxWater, sfxHarvest, sfxGolden } from './audio.js';

export const plots = [];
const PLOT_ROWS = 4, PLOT_COLS = 4;
const PLOT_SIZE = 2.4;

export function initCrops(g) {
  const plotsGroup = new THREE.Group();

  for (let r = 0; r < PLOT_ROWS; r++) {
    for (let c = 0; c < PLOT_COLS; c++) {
      const px = (c - (PLOT_COLS - 1) / 2) * (PLOT_SIZE + 0.5);
      const pz = (r - (PLOT_ROWS - 1) / 2) * (PLOT_SIZE + 0.5);

      const soilGeo = new THREE.BoxGeometry(PLOT_SIZE, 0.25, PLOT_SIZE);
      const soilMat = new THREE.MeshLambertMaterial({ color: 0x8d5b2d });
      const soil = new THREE.Mesh(soilGeo, soilMat);
      soil.position.set(px, 0.12, pz);
      soil.receiveShadow = true;
      plotsGroup.add(soil);

      const cropGroup = new THREE.Group();
      soil.add(cropGroup);

      const saved = (Array.isArray(g.plots) && g.plots[plots.length]) || {};
      const plot = {
        r, c, mesh: soil, cropGroup,
        planted: saved.planted || null,
        stage: saved.stage || 0,
        progress: Math.max(0, Math.min(1, saved.progress || 0)),
        watered: Boolean(saved.watered),
        ready: Boolean(saved.ready),
        isGolden: Boolean(saved.isGolden)
      };
      if (plot.ready && plot.stage < 3) plot.stage = 3;
      if (!plot.planted) {
        plot.stage = 0;
        plot.progress = 0;
        plot.ready = false;
        plot.watered = false;
        plot.isGolden = false;
      }
      soil.material.color.setHex(plot.watered ? 0x4a2e16 : 0x8d5b2d);
      plots.push(plot);
      render3DCrop(plot);
    }
  }
  scene.add(plotsGroup);
}

export function updateCrops(dt, g) {
  plots.forEach(p => {
    if (p.planted && !p.ready) {
      const crop = CROPS[p.planted];
      const waterBoost = p.watered ? 1.4 : 0.7;
      const speedBoost = 1 + (g.upgrades.speed || 0) * 0.15;
      // `gt` es el tiempo total anunciado al jugador; hay dos transiciones visuales.
      p.progress += (2 / crop.gt) * waterBoost * speedBoost * dt;

      if (p.progress >= 1) {
        p.progress = 0;
        p.stage++;
        if (p.stage >= 3) {
          p.ready = true;
        }
        render3DCrop(p);
      }
    }
  });
}

export function render3DCrop(plot) {
  while (plot.cropGroup.children.length > 0) {
    plot.cropGroup.remove(plot.cropGroup.children[0]);
  }
  if (!plot.planted) return;

  const crop = CROPS[plot.planted];
  const scale = 0.25 + (plot.stage / 3) * 0.75;

  if (plot.stage === 1) { // Sprout
    const sprout = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.4, 5), new THREE.MeshLambertMaterial({ color: 0x76ff03 }));
    sprout.position.y = 0.2;
    plot.cropGroup.add(sprout);
  } else if (plot.stage === 2) { // Growing Stem
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, 0.8, 6), new THREE.MeshLambertMaterial({ color: 0x4caf50 }));
    stem.position.y = 0.4;
    plot.cropGroup.add(stem);
  } else { // Stage 3: Fully Grown 3D model
    const matColor = plot.isGolden ? 0xFFD700 : crop.col;
    const mat = new THREE.MeshLambertMaterial({ color: matColor });
    let fruit;

    if (plot.planted === 'pumpkin') {
      fruit = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 8), mat);
      fruit.scale.set(1.2, 0.9, 1.2);
    } else if (plot.planted === 'carrot') {
      fruit = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.8, 6), mat);
      fruit.rotation.x = Math.PI;
    } else if (plot.planted === 'wheat' || plot.planted === 'corn') {
      fruit = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.15, 1.1, 5), mat);
    } else if (plot.planted === 'sunflower') {
      fruit = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.1, 8), mat);
      fruit.rotation.x = Math.PI / 3;
    } else {
      fruit = new THREE.Mesh(new THREE.DodecahedronGeometry(0.4), mat);
    }

    fruit.position.y = 0.5;
    fruit.castShadow = true;
    plot.cropGroup.add(fruit);
  }

  plot.cropGroup.scale.set(scale, scale, scale);
}

export function plantPlot(plot, cropKey, g) {
  const crop = CROPS[cropKey];
  if (g.coins < crop.buy) return false;
  g.coins -= crop.buy;
  g.stats.planted++;
  plot.planted = cropKey;
  plot.stage = 1;
  plot.progress = 0;
  plot.ready = false;
  plot.isGolden = Math.random() < 0.07;
  plot.watered = g.upgrades.water > 0;
  plot.mesh.material.color.setHex(plot.watered ? 0x4a2e16 : 0x8d5b2d);
  render3DCrop(plot);
  sfxPlant();
  syncPlotsToState(g);
  return true;
}

export function waterPlot(plot, g) {
  plot.watered = true;
  plot.mesh.material.color.setHex(0x4a2e16);
  sfxWater();
  syncPlotsToState(g);
}

export function harvestPlot(plot, g) {
  const crop = CROPS[plot.planted];
  const itemIcon = plot.isGolden ? '✨' + crop.em : crop.em;
  g.inventory[itemIcon] = (g.inventory[itemIcon] || 0) + 1;
  g.stats.harvested++;
  
  if (plot.isGolden) sfxGolden(); else sfxHarvest();
  
  plot.planted = null;
  plot.stage = 0;
  plot.ready = false;
  plot.isGolden = false;
  plot.mesh.material.color.setHex(0x8d5b2d);
  render3DCrop(plot);
  syncPlotsToState(g);
  return crop;
}

export function resetDailyWater(g) {
  plots.forEach(p => {
    p.watered = Boolean(p.planted) && g.upgrades.water > 0;
    p.mesh.material.color.setHex(p.watered ? 0x4a2e16 : 0x8d5b2d);
  });
  syncPlotsToState(g);
}

export function syncPlotsToState(g) {
  g.plots = plots.map(p => ({
    planted: p.planted,
    stage: p.stage,
    progress: p.progress,
    watered: p.watered,
    ready: p.ready,
    isGolden: p.isGolden
  }));
}
