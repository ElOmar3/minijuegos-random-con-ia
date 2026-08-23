/* ==========================================================================
   3D WORLD ENVIRONMENT & SCENE
   ========================================================================== */

export let scene, camera, renderer, dirLight, hemiLight;
export const windmillBlades = new THREE.Group();

export function initWorld(container) {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87CEEB);
  scene.fog = new THREE.Fog(0x87CEEB, 35, 80);

  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
  
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // Lighting
  hemiLight = new THREE.HemisphereLight(0xffffff, 0x446622, 0.65);
  scene.add(hemiLight);

  dirLight = new THREE.DirectionalLight(0xfffaed, 0.85);
  dirLight.position.set(20, 35, 20);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 1024;
  dirLight.shadow.mapSize.height = 1024;
  dirLight.shadow.camera.near = 0.5;
  dirLight.shadow.camera.far = 80;
  const d = 26;
  dirLight.shadow.camera.left = -d;
  dirLight.shadow.camera.right = d;
  dirLight.shadow.camera.top = d;
  dirLight.shadow.camera.bottom = -d;
  scene.add(dirLight);

  buildTerrain();
  buildStructures();
}

function buildTerrain() {
  // Main Grass Base
  const groundGeo = new THREE.PlaneGeometry(85, 85, 16, 16);
  const groundMat = new THREE.MeshLambertMaterial({ color: 0x5dae3c });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Cobblestone Path to Farmhouse & Mill
  const pathMat = new THREE.MeshLambertMaterial({ color: 0x9e9e9e });
  const pathGeo = new THREE.PlaneGeometry(2.2, 24);
  const path = new THREE.Mesh(pathGeo, pathMat);
  path.rotation.x = -Math.PI / 2;
  path.position.set(0, 0.01, 0);
  scene.add(path);

  // Perimeter Trees
  const treePositions = [
    [-18, -14], [-14, -18], [16, -14], [18, 12],
    [-18, 16], [14, 16], [-12, -8], [12, -8],
    [20, 0], [-20, 0], [0, -18]
  ];
  treePositions.forEach(p => createTree(p[0], p[1]));
}

function createTree(x, z) {
  const group = new THREE.Group();
  const trunkGeo = new THREE.CylinderGeometry(0.25, 0.35, 1.4, 6);
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x6d4c41 });
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.position.y = 0.7;
  trunk.castShadow = true;
  group.add(trunk);

  const leavesGeo = new THREE.DodecahedronGeometry(1.2, 1);
  const leavesMat = new THREE.MeshLambertMaterial({ color: 0x388e3c });
  const leaves = new THREE.Mesh(leavesGeo, leavesMat);
  leaves.position.y = 2.0;
  leaves.castShadow = true;
  group.add(leaves);

  group.position.set(x, 0, z);
  scene.add(group);
}

function buildStructures() {
  // Red Barn
  const barn = new THREE.Group();
  const barnGeo = new THREE.BoxGeometry(5.5, 3.8, 4.5);
  const barnMat = new THREE.MeshLambertMaterial({ color: 0xc62828 });
  const barnMesh = new THREE.Mesh(barnGeo, barnMat);
  barnMesh.position.y = 1.9;
  barnMesh.castShadow = true;
  barn.add(barnMesh);

  const roofGeo = new THREE.ConeGeometry(4.2, 2.2, 4);
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x37474f });
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.position.y = 4.8;
  roof.rotation.y = Math.PI / 4;
  barn.add(roof);
  barn.position.set(-13, 0, -11);
  scene.add(barn);

  // Windmill
  const windmill = new THREE.Group();
  const wmBaseGeo = new THREE.CylinderGeometry(1.3, 2.0, 5.5, 8);
  const wmBaseMat = new THREE.MeshLambertMaterial({ color: 0xd7ccc8 });
  const wmBase = new THREE.Mesh(wmBaseGeo, wmBaseMat);
  wmBase.position.y = 2.75;
  wmBase.castShadow = true;
  windmill.add(wmBase);

  const wmRoofGeo = new THREE.ConeGeometry(1.6, 1.6, 8);
  const wmRoofMat = new THREE.MeshLambertMaterial({ color: 0x8d6e63 });
  const wmRoof = new THREE.Mesh(wmRoofGeo, wmRoofMat);
  wmRoof.position.y = 6.2;
  windmill.add(wmRoof);

  // Windmill 4 Blades
  windmillBlades.position.set(0, 4.8, 1.4);
  for (let i = 0; i < 4; i++) {
    const bladeGeo = new THREE.BoxGeometry(0.35, 2.4, 0.05);
    const bladeMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    blade.position.y = 1.2;
    const pivot = new THREE.Group();
    pivot.rotation.z = (Math.PI / 2) * i;
    pivot.add(blade);
    windmillBlades.add(pivot);
  }
  windmill.add(windmillBlades);
  windmill.position.set(13, 0, -11);
  scene.add(windmill);

  // Cute Water Pond
  const pondGeo = new THREE.CircleGeometry(3.6, 16);
  const pondMat = new THREE.MeshLambertMaterial({ color: 0x29b6f6 });
  const pond = new THREE.Mesh(pondGeo, pondMat);
  pond.rotation.x = -Math.PI / 2;
  pond.position.set(13, 0.02, 9);
  scene.add(pond);

  // Animal Pasture Fence
  const fenceMat = new THREE.MeshLambertMaterial({ color: 0x8d6e63 });
  const penX = -11, penZ = 7, penW = 8, penH = 8;
  const fenceGeo = new THREE.BoxGeometry(penW, 0.5, 0.15);
  
  const fenceTop = new THREE.Mesh(fenceGeo, fenceMat);
  fenceTop.position.set(penX, 0.25, penZ - penH/2);
  scene.add(fenceTop);

  const fenceBot = new THREE.Mesh(fenceGeo, fenceMat);
  fenceBot.position.set(penX, 0.25, penZ + penH/2);
  scene.add(fenceBot);
}

export function updateDayNight(timeMin) {
  const t = timeMin / 1440; // 0 to 1
  let skyHex = 0x87CEEB, lightIntensity = 0.85;

  if (t < 0.25 || t > 0.85) { // Night
    skyHex = 0x0d1b2a;
    lightIntensity = 0.2;
  } else if (t < 0.35) { // Dawn
    skyHex = 0xffb703;
    lightIntensity = 0.6;
  } else if (t > 0.75) { // Sunset
    skyHex = 0xe85d04;
    lightIntensity = 0.65;
  }

  scene.background.setHex(skyHex);
  scene.fog.color.setHex(skyHex);
  dirLight.intensity = lightIntensity;
}
