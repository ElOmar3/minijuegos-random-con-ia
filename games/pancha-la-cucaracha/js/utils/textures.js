(function (P) {
  /**
   * Genera todos los gráficos del juego de forma procedural (sin assets externos)
   * y los registra como frames nombrados de una textura tipo spritesheet.
   */
  P.buildTextures = function (scene) {
    const frameW = 64;
    const frameH = 64;
    const pendingFrames = [];
    let index = 0;

    // Registra un frame de 64x64 y devuelve su offset X para dibujar
    const addFrame = (name) => {
      const ox = index * frameW;
      pendingFrames.push({ name, ox });
      index++;
      return ox;
    };

    const canvasTex = scene.textures.createCanvas('atlas', frameW * 24, frameH);
    const ctx = canvasTex.getContext();

    // ===== Cucaracha Pancha (4 direcciones x 2 frames) =====
    drawCockroach(ctx, addFrame('pancha_down_0'), '#5c3317', Math.PI / 2);
    drawCockroach(ctx, addFrame('pancha_down_1'), '#6b3d1c', Math.PI / 2);
    drawCockroach(ctx, addFrame('pancha_up_0'),   '#4a2911', -Math.PI / 2);
    drawCockroach(ctx, addFrame('pancha_up_1'),   '#572f15', -Math.PI / 2);
    drawCockroach(ctx, addFrame('pancha_left_0'), '#553014', Math.PI);
    drawCockroach(ctx, addFrame('pancha_left_1'), '#633818', Math.PI);
    drawCockroach(ctx, addFrame('pancha_right_0'),'#63381a', 0);
    drawCockroach(ctx, addFrame('pancha_right_1'),'#724020', 0);

    // ===== Chancla (vista aérea) =====
    drawChancla(ctx, addFrame('chancla'));

    // ===== Sombra de advertencia =====
    drawShadowWarn(ctx, addFrame('shadow_warn'));

    // ===== Miga de pan =====
    drawCrumb(ctx, addFrame('crumb'));

    // ===== Nido =====
    drawNest(ctx, addFrame('nest'));

    // ===== Checkpoint =====
    drawCheckpoint(ctx, addFrame('checkpoint'));

    // ===== Baldosa cocina =====
    drawTile(ctx, addFrame('tile'));

    // ===== Muebles =====
    drawCounter(ctx, addFrame('counter'));
    drawFridge(ctx, addFrame('fridge'));
    drawTable(ctx, addFrame('table'));

    // ===== Linterna: halo y glare =====
    drawLinternaHalo(ctx, addFrame('linterna_halo'));
    drawLinternaGlare(ctx, addFrame('linterna_glare'));

    // ===== Estallido al recoger miga =====
    drawCrumbsPop(ctx, addFrame('crumbs_pop'));

    // ===== Luz crítica (icono de alerta) =====
    drawAlert(ctx, addFrame('alert'));

    // Registrar cada frame dentro de la textura (por NOMBRE, no índice)
    for (const f of pendingFrames) {
      canvasTex.add(f.name, 0, f.ox, 0, frameW, frameH);
    }

    canvasTex.refresh();
  };

  // =================================================================
  // Helpers de color
  // =================================================================
  function lighten(hex, amount) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.min(255, (n >> 16) + amount);
    const g = Math.min(255, ((n >> 8) & 0xff) + amount);
    const b = Math.min(255, (n & 0xff) + amount);
    return `rgb(${r},${g},${b})`;
  }

  function darken(hex, amount) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.max(0, (n >> 16) - amount);
    const g = Math.max(0, ((n >> 8) & 0xff) - amount);
    const b = Math.max(0, (n & 0xff) - amount);
    return `rgb(${r},${g},${b})`;
  }

  // =================================================================
  // Cucaracha Pancha — más detalle: patas articuladas, antenas con bulbo,
  // ojos compuestos, segmentos abdominales, doble brillo, sombra propia.
  // =================================================================
  function drawCockroach(ctx, ox, bodyColor, angleDeg) {
    const cx = ox + 32;
    const cy = 32;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angleDeg + Math.PI / 2);

    // Sombra bajo el cuerpo
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(2, 4, 13, 19, 0, 0, Math.PI * 2);
    ctx.fill();

    // Patas (segmento proximal + distal)
    ctx.strokeStyle = '#1f1107';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    for (let side = -1; side <= 1; side += 2) {
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(side * 7, i * 6);
        ctx.lineTo(side * 16, i * 9 + (i === 0 ? side * 3 : 0));
        ctx.moveTo(side * 16, i * 9 + (i === 0 ? side * 3 : 0));
        ctx.lineTo(side * 24, i * 12);
        ctx.stroke();
      }
    }

    // Antenas con bulbo en la punta
    ctx.strokeStyle = '#2a1608';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-4, -14); ctx.quadraticCurveTo(-14, -26, -22, -32);
    ctx.moveTo(4, -14); ctx.quadraticCurveTo(14, -26, 22, -32);
    ctx.stroke();
    ctx.fillStyle = '#3a2008';
    ctx.beginPath();
    ctx.arc(-22, -32, 1.8, 0, Math.PI * 2);
    ctx.arc(22, -32, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Cuerpo con gradiente rico
    const grad = ctx.createRadialGradient(-3, -4, 2, 0, 2, 18);
    grad.addColorStop(0,    lighten(bodyColor, 60));
    grad.addColorStop(0.4,  lighten(bodyColor, 25));
    grad.addColorStop(1,    bodyColor);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(0, 0, 12, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    // Línea media del tórax
    ctx.strokeStyle = 'rgba(40,20,6,0.85)';
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, -11);
    ctx.lineTo(0, 15);
    ctx.stroke();

    // Segmentos abdominales
    ctx.strokeStyle = 'rgba(20,10,4,0.55)';
    ctx.lineWidth = 1;
    for (let i = -1; i <= 3; i++) {
      const y = 2 + i * 4;
      ctx.beginPath();
      ctx.moveTo(-10, y);
      ctx.quadraticCurveTo(0, y + 1.5, 10, y);
      ctx.stroke();
    }

    // Doble brillo en el caparazón
    ctx.strokeStyle = 'rgba(255,225,160,0.55)';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(-3, -5, 10, Math.PI * 1.15, Math.PI * 1.65);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,235,180,0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(-1, 6, 6, Math.PI * 1.2, Math.PI * 1.55);
    ctx.stroke();

    // Cabeza con gradiente
    const headGrad = ctx.createRadialGradient(0, -16, 1, 0, -15, 7);
    headGrad.addColorStop(0, lighten(bodyColor, 35));
    headGrad.addColorStop(1, darken(bodyColor, 15));
    ctx.fillStyle = headGrad;
    ctx.beginPath();
    ctx.ellipse(0, -15, 5.5, 6.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Ojos compuestos
    ctx.fillStyle = '#1a0a02';
    ctx.beginPath();
    ctx.arc(-2.5, -16, 1.4, 0, Math.PI * 2);
    ctx.arc(2.5, -16, 1.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.arc(-2.2, -16.4, 0.5, 0, Math.PI * 2);
    ctx.arc(2.8, -16.4, 0.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.lineCap = 'butt';
    ctx.restore();
  }

  // =================================================================
  // Chancla — más detalle: sombra dura, gradiente de cuero, trama
  // perpendicular, tira con brillo, nudo decorativo.
  // =================================================================
  function drawChancla(ctx, ox) {
    ctx.save();
    ctx.translate(ox + 32, 32);

    // Sombra dura bajo la chancla
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.ellipse(2, 6, 22, 26, 0, 0, Math.PI * 2);
    ctx.fill();

    // Suela con gradiente de cuero
    const soleGrad = ctx.createLinearGradient(-26, -28, 20, 30);
    soleGrad.addColorStop(0, '#d99a5c');
    soleGrad.addColorStop(0.5, '#c98b4e');
    soleGrad.addColorStop(1, '#8a5728');
    ctx.fillStyle = soleGrad;
    ctx.beginPath();
    ctx.moveTo(-14, -26);
    ctx.bezierCurveTo(-26, -18, -24, 14, -12, 24);
    ctx.bezierCurveTo(0, 32, 16, 26, 18, 12);
    ctx.bezierCurveTo(20, -4, 16, -22, 6, -27);
    ctx.closePath();
    ctx.fill();

    // Textura tramada (muchas líneas finas)
    ctx.strokeStyle = 'rgba(120,70,25,0.55)';
    ctx.lineWidth = 1.2;
    for (let y = -20; y <= 22; y += 5) {
      ctx.beginPath();
      ctx.moveTo(-18 + Math.abs(y) * 0.2, y);
      ctx.lineTo(16 - Math.abs(y) * 0.15, y + 1);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(120,70,25,0.25)';
    ctx.lineWidth = 1;
    for (let x = -16; x <= 16; x += 6) {
      ctx.beginPath();
      ctx.moveTo(x, -22 + Math.abs(x) * 0.1);
      ctx.lineTo(x + 1, 22 - Math.abs(x) * 0.1);
      ctx.stroke();
    }

    // Tira con sombra interior
    ctx.strokeStyle = '#7a4520';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-10, -14);
    ctx.quadraticCurveTo(6, -6, 8, 10);
    ctx.stroke();
    ctx.strokeStyle = '#a66433';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-9, -16);
    ctx.quadraticCurveTo(5, -8, 7, 8);
    ctx.stroke();

    // Contorno oscuro
    ctx.strokeStyle = '#3f1f08';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-14, -26);
    ctx.bezierCurveTo(-26, -18, -24, 14, -12, 24);
    ctx.bezierCurveTo(0, 32, 16, 26, 18, 12);
    ctx.bezierCurveTo(20, -4, 16, -22, 6, -27);
    ctx.closePath();
    ctx.stroke();

    // Nudo decorativo
    ctx.fillStyle = '#5f2f12';
    ctx.beginPath();
    ctx.arc(8, 10, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#8a4f22';
    ctx.beginPath();
    ctx.arc(8, 10, 1.6, 0, Math.PI * 2);
    ctx.fill();

    ctx.lineCap = 'butt';
    ctx.restore();
  }

  // =================================================================
  // Sombra de advertencia: halo + anillo punteado + silueta de chancla
  // =================================================================
  function drawShadowWarn(ctx, ox) {
    const cx = ox + 32;
    const cy = 32;
    const grad = ctx.createRadialGradient(cx, cy, 4, cx, cy, 32);
    grad.addColorStop(0,    'rgba(15,5,0,0.85)');
    grad.addColorStop(0.55, 'rgba(15,5,0,0.5)');
    grad.addColorStop(0.85, 'rgba(15,5,0,0.18)');
    grad.addColorStop(1,    'rgba(15,5,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(ox, 0, 64, 64);

    ctx.strokeStyle = 'rgba(255,80,40,0.55)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.arc(cx, cy, 26, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = 'rgba(255,60,30,0.4)';
    ctx.beginPath();
    ctx.ellipse(cx, cy - 4, 9, 13, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // =================================================================
  // Miga de pan: migajas dispersas, porosidad, brillo
  // =================================================================
  function drawCrumb(ctx, ox) {
    ctx.save();
    ctx.translate(ox + 32, 32);
    ctx.rotate(0.5);

    ctx.fillStyle = 'rgba(220,180,110,0.6)';
    for (const [px, py, s] of [[-14, 4, 1.4], [12, -10, 1], [14, 10, 1.3], [-10, -14, 1.1]]) {
      ctx.beginPath();
      ctx.arc(px, py, s, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#e8c07a';
    ctx.strokeStyle = '#a07a3a';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-8, -5);
    ctx.lineTo(-2, -10);
    ctx.lineTo(7, -6);
    ctx.lineTo(9, 3);
    ctx.lineTo(2, 10);
    ctx.lineTo(-7, 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = 'rgba(120,80,30,0.55)';
    ctx.beginPath();
    ctx.arc(-2, 0, 1, 0, Math.PI * 2);
    ctx.arc(3, 3, 0.8, 0, Math.PI * 2);
    ctx.arc(-4, -3, 0.7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,245,210,0.85)';
    ctx.fillRect(-4, -6, 5, 3);
    ctx.restore();
  }

  // =================================================================
  // Nido: halo cálido + agujero profundo + grietas + brillo interior
  // =================================================================
  function drawNest(ctx, ox) {
    const cx = ox + 32;
    const cy = 32;

    const warm = ctx.createRadialGradient(cx, cy, 20, cx, cy, 32);
    warm.addColorStop(0, 'rgba(255,180,90,0)');
    warm.addColorStop(1, 'rgba(255,140,60,0.25)');
    ctx.fillStyle = warm;
    ctx.beginPath();
    ctx.arc(cx, cy, 32, 0, Math.PI * 2);
    ctx.fill();

    const g = ctx.createRadialGradient(cx - 2, cy - 2, 2, cx, cy, 26);
    g.addColorStop(0,    '#000000');
    g.addColorStop(0.55, '#150c05');
    g.addColorStop(0.85, '#2a1d10');
    g.addColorStop(1,    '#3a2914');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 26, 21, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#241708';
    ctx.lineWidth = 2;
    for (const a of [0.4, 1.1, 1.6, 2.4, 2.8, 3.6, 4.4, 5.0, 5.5]) {
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * 24, cy + Math.sin(a) * 19);
      ctx.lineTo(cx + Math.cos(a) * 30, cy + Math.sin(a) * 24);
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(255,200,120,0.35)';
    ctx.beginPath();
    ctx.arc(cx, cy + 4, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // =================================================================
  // Checkpoint: aura + anillo punteado + mini-cucaracha
  // =================================================================
  function drawCheckpoint(ctx, ox) {
    const cx = ox + 32;
    const cy = 32;
    const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, 22);
    g.addColorStop(0,   'rgba(150,255,180,0.9)');
    g.addColorStop(0.5, 'rgba(140,255,170,0.4)');
    g.addColorStop(1,   'rgba(140,255,170,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, 22, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(190,255,210,0.95)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(cx, cy, 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#6b3d1c';
    ctx.beginPath();
    ctx.ellipse(cx, cy, 4, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#2a1608';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(cx - 2, cy - 6); ctx.lineTo(cx - 6, cy - 9);
    ctx.moveTo(cx + 2, cy - 6); ctx.lineTo(cx + 6, cy - 9);
    ctx.stroke();
  }

  // =================================================================
  // Baldosa: juntas con sombra interior, vetas curvas, mancha realista
  // =================================================================
  function drawTile(ctx, ox) {
    ctx.fillStyle = '#d8cfbe';
    ctx.fillRect(ox, 0, 64, 64);
    ctx.strokeStyle = '#a89a82';
    ctx.lineWidth = 2;
    ctx.strokeRect(ox + 1, 1, 62, 62);
    ctx.strokeStyle = 'rgba(140,120,90,0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(ox + 1.5, ox + 62.5);
    ctx.lineTo(ox + 62.5, ox + 62.5);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(160,148,125,0.32)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(ox + 8 + i * 14, 6 + i * 5);
      ctx.quadraticCurveTo(ox + 30 + i * 10, 32 + i * 4, ox + 56 + (i % 2) * 4, 58 - i * 4);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(160,140,110,0.18)';
    ctx.beginPath();
    ctx.ellipse(ox + 40, 28, 6, 3, 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  // =================================================================
  // Counter (mesada): madera veteada + tapa de mármol
  // =================================================================
  function drawCounter(ctx, ox) {
    ctx.fillStyle = '#7a5230';
    ctx.fillRect(ox, 0, 64, 64);
    // vetas de la madera
    ctx.strokeStyle = 'rgba(60,38,18,0.55)';
    ctx.lineWidth = 1.2;
    for (let y = 22; y < 64; y += 6) {
      ctx.beginPath();
      ctx.moveTo(ox + 4, y);
      ctx.lineTo(ox + 60, y + (y % 2 ? 2 : -1));
      ctx.stroke();
    }
    // tapa de mármol
    const top = ctx.createLinearGradient(0, 0, 0, 18);
    top.addColorStop(0, '#f4eee4');
    top.addColorStop(1, '#cfc4ad');
    ctx.fillStyle = top;
    ctx.fillRect(ox, 0, 64, 18);
    // vetas del mármol
    ctx.strokeStyle = 'rgba(140,120,90,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(ox + 4, 6);  ctx.lineTo(ox + 30, 4);
    ctx.moveTo(ox + 36, 12); ctx.lineTo(ox + 58, 8);
    ctx.stroke();
    // línea de unión
    ctx.strokeStyle = '#9a8d72';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ox, 18); ctx.lineTo(ox + 64, 18);
    ctx.stroke();
    // sombra inferior de la tapa
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(ox, 19, 64, 2);
  }

  // =================================================================
  // Heladera: cuerpo metálico + manijas + reflejo
  // =================================================================
  function drawFridge(ctx, ox) {
    ctx.fillStyle = '#cfd6da';
    ctx.fillRect(ox, 0, 64, 64);
    // gradiente metálico sutil
    const grad = ctx.createLinearGradient(0, 0, 64, 0);
    grad.addColorStop(0, '#a8b1b8');
    grad.addColorStop(0.5, '#d8dde0');
    grad.addColorStop(1, '#a8b1b8');
    ctx.fillStyle = grad;
    ctx.fillRect(ox, 0, 64, 64);
    ctx.fillStyle = '#cfd6da';
    ctx.fillRect(ox + 4, 0, 56, 64);

    ctx.strokeStyle = '#9aa4aa';
    ctx.lineWidth = 2;
    ctx.strokeRect(ox + 2, 2, 60, 60);
    ctx.beginPath();
    ctx.moveTo(ox, 22);
    ctx.lineTo(ox + 64, 22);
    ctx.stroke();

    // manijas
    ctx.fillStyle = '#7d888e';
    ctx.fillRect(ox + 50, 8, 5, 12);
    ctx.fillRect(ox + 50, 28, 5, 28);
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillRect(ox + 50.5, 9, 1, 9);
    ctx.fillRect(ox + 50.5, 29, 1, 26);

    // reflejo vertical
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillRect(ox + 8, 6, 6, 52);
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(ox + 16, 6, 3, 52);
  }

  // =================================================================
  // Mesa de madera
  // =================================================================
  function drawTable(ctx, ox) {
    ctx.fillStyle = '#8a5a2e';
    ctx.fillRect(ox, 0, 64, 64);
    const g = ctx.createLinearGradient(0, 0, 64, 64);
    g.addColorStop(0, '#9c6a36');
    g.addColorStop(1, '#6b421f');
    ctx.fillStyle = g;
    ctx.fillRect(ox, 0, 64, 64);

    ctx.strokeStyle = '#6b421f';
    ctx.lineWidth = 3;
    ctx.strokeRect(ox + 3, 3, 58, 58);

    ctx.strokeStyle = 'rgba(50,28,10,0.6)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(ox + 6, 20); ctx.quadraticCurveTo(ox + 32, 14, ox + 58, 22);
    ctx.moveTo(ox + 6, 40); ctx.quadraticCurveTo(ox + 36, 46, ox + 58, 38);
    ctx.stroke();

    // nudos
    ctx.fillStyle = 'rgba(60,30,12,0.5)';
    ctx.beginPath();
    ctx.arc(ox + 20, 30, 2, 0, Math.PI * 2);
    ctx.arc(ox + 46, 50, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // =================================================================
  // Halo de linterna (círculo amarillo translúcido)
  // =================================================================
  function drawLinternaHalo(ctx, ox) {
    const cx = ox + 32, cy = 32;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 32);
    g.addColorStop(0,    'rgba(255, 235, 170, 0.95)');
    g.addColorStop(0.25, 'rgba(255, 220, 130, 0.55)');
    g.addColorStop(0.55, 'rgba(255, 200, 100, 0.25)');
    g.addColorStop(1,    'rgba(255, 180,  80, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, 32, 0, Math.PI * 2);
    ctx.fill();
  }

  // =================================================================
  // Glare central de la linterna (núcleo blanco brillante)
  // =================================================================
  function drawLinternaGlare(ctx, ox) {
    const cx = ox + 32, cy = 32;
    const g = ctx.createRadialGradient(cx, cy, 1, cx, cy, 14);
    g.addColorStop(0,    'rgba(255, 255, 255, 1)');
    g.addColorStop(0.4,  'rgba(255, 250, 220, 0.8)');
    g.addColorStop(1,    'rgba(255, 240, 180, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, 14, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fffbe6';
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // =================================================================
  // Estallido al recoger miga (chispas)
  // =================================================================
  function drawCrumbsPop(ctx, ox) {
    const cx = ox + 32, cy = 32;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 30);
    g.addColorStop(0,    'rgba(255, 230, 160, 0.9)');
    g.addColorStop(0.5,  'rgba(255, 200, 120, 0.4)');
    g.addColorStop(1,    'rgba(255, 180, 100, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, 30, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 220, 140, 0.9)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const r1 = 8 + Math.random() * 4;
      const r2 = 22 + Math.random() * 6;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
      ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
      ctx.stroke();
    }
  }

  // =================================================================
  // Icono de alerta (exposición crítica)
  // =================================================================
  function drawAlert(ctx, ox) {
    const cx = ox + 32, cy = 32;
    // triángulo de advertencia
    ctx.fillStyle = '#ff4040';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 18);
    ctx.lineTo(cx + 16, cy + 10);
    ctx.lineTo(cx - 16, cy + 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // signo de exclamación
    ctx.fillStyle = '#fff';
    ctx.fillRect(cx - 1.5, cy - 8, 3, 10);
    ctx.beginPath();
    ctx.arc(cx, cy + 8, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
})(window.Pancha);
