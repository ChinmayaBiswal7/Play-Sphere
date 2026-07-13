/**
 * Football Legends - Stadium, Pitch markings, Goal Nets, VFX Module
 */

import { gameState, PITCH_LENGTH, PITCH_WIDTH, GOAL_WIDTH, GOAL_HEIGHT } from './state.js';

export const particles = [];
export const confetti = [];

/* ─── PITCH TEXTURE ────────────────────────────────────────────────────────── */
export function createStripePitchTexture() {
  const W = 2048, H = 2048;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Alternating grass stripes (8 bands)
  const stripeCount = 8;
  const stripeW = W / stripeCount;
  for (let i = 0; i < stripeCount; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#1a3e13' : '#20501a';
    ctx.fillRect(i * stripeW, 0, stripeW, H);
  }

  // Subtle noise / wear overlay
  for (let i = 0; i < 18000; i++) {
    const x = Math.random() * W;
    const y = Math.random() * H;
    const r = Math.random() * 1.5;
    const alpha = Math.random() * 0.04;
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Pitch wear strip in the centre (high traffic zone)
  const wearGrd = ctx.createLinearGradient(0, H * 0.35, 0, H * 0.65);
  wearGrd.addColorStop(0, 'rgba(255,255,255,0)');
  wearGrd.addColorStop(0.5, 'rgba(200,170,90,0.07)');
  wearGrd.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = wearGrd;
  ctx.fillRect(W * 0.3, 0, W * 0.4, H);

  // White line helper
  const line = (x1, y1, x2, y2, w = 8) => {
    ctx.strokeStyle = 'rgba(255,255,255,0.92)';
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  };

  const margin = 72;
  const fieldW = W - margin * 2;
  const fieldH = H - margin * 2;

  // Outer boundary
  ctx.strokeStyle = 'rgba(255,255,255,0.92)';
  ctx.lineWidth = 8;
  ctx.strokeRect(margin, margin, fieldW, fieldH);

  // Halfway line
  line(W / 2, margin, W / 2, H - margin);

  // Centre circle
  ctx.beginPath();
  ctx.arc(W / 2, H / 2, fieldH * 0.165, 0, Math.PI * 2);
  ctx.stroke();

  // Centre spot
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.beginPath();
  ctx.arc(W / 2, H / 2, 10, 0, Math.PI * 2);
  ctx.fill();

  // Penalty areas (left & right)
  const penW = fieldW * 0.155;   // depth into pitch
  const penH = fieldH * 0.44;   // width of penalty box
  const goalBoxW = fieldW * 0.058;
  const goalBoxH = fieldH * 0.20;
  const penSpotDist = fieldW * 0.105;
  const penSpotR = 8;

  // Left side
  ctx.strokeRect(margin, H / 2 - penH / 2, penW, penH);
  ctx.strokeRect(margin, H / 2 - goalBoxH / 2, goalBoxW, goalBoxH);
  // Penalty spot
  ctx.beginPath();
  ctx.arc(margin + penSpotDist, H / 2, penSpotR, 0, Math.PI * 2);
  ctx.fill();
  // Penalty arc
  ctx.beginPath();
  ctx.arc(margin + penSpotDist, H / 2, fieldH * 0.155, Math.PI * -0.38, Math.PI * 0.38);
  ctx.stroke();

  // Right side
  ctx.strokeRect(W - margin - penW, H / 2 - penH / 2, penW, penH);
  ctx.strokeRect(W - margin - goalBoxW, H / 2 - goalBoxH / 2, goalBoxW, goalBoxH);
  ctx.beginPath();
  ctx.arc(W - margin - penSpotDist, H / 2, penSpotR, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(W - margin - penSpotDist, H / 2, fieldH * 0.155, Math.PI * 0.62, Math.PI * 1.38);
  ctx.stroke();

  // Corner arcs
  const cornerR = fieldH * 0.025;
  [margin, W - margin].forEach(cx => {
    [margin, H - margin].forEach(cy => {
      const startAngle = cx === margin ? (cy === margin ? 0 : Math.PI * 1.5) : (cy === margin ? Math.PI * 0.5 : Math.PI);
      ctx.beginPath();
      ctx.arc(cx, cy, cornerR, startAngle, startAngle + Math.PI * 0.5);
      ctx.stroke();
    });
  });

  // Edge vignette
  const vgrd = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.72);
  vgrd.addColorStop(0, 'rgba(0,0,0,0)');
  vgrd.addColorStop(1, 'rgba(0,0,0,0.22)');
  ctx.fillStyle = vgrd;
  ctx.fillRect(0, 0, W, H);

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 16;
  return texture;
}

/* ─── SPECTATORS ────────────────────────────────────────────────────────────── */
export function createSpectators(scene) {
  const seatingMaterial = new THREE.MeshStandardMaterial({ color: 0x1c2333, roughness: 0.9 });

  const createTieredStand = (x, z, length, depth, height, isParallelToX) => {
    const standGroup = new THREE.Group();
    const tiers = 5;
    for (let t = 0; t < tiers; t++) {
      const w = isParallelToX ? length : depth - t * 2.0;
      const d = isParallelToX ? depth - t * 2.0 : length;
      const h = height + t * 1.6;
      const tierGeo = new THREE.BoxGeometry(w, h, d);
      const tier = new THREE.Mesh(tierGeo, seatingMaterial);
      let posX = 0, posZ = 0;
      if (isParallelToX) {
        posZ = (z < 0) ? (t * 2.0) : (-t * 2.0);
      } else {
        posX = (x < 0) ? (t * 2.0) : (-t * 2.0);
      }
      tier.position.set(posX, h / 2, posZ);
      tier.receiveShadow = true;
      tier.castShadow = true;
      standGroup.add(tier);
    }
    standGroup.position.set(x, 0, z);
    scene.add(standGroup);
  };

  createTieredStand(0, -PITCH_WIDTH / 2 - 15, PITCH_LENGTH + 22, 15, 3, true);
  createTieredStand(0, PITCH_WIDTH / 2 + 15, PITCH_LENGTH + 22, 15, 3, true);
  createTieredStand(-PITCH_LENGTH / 2 - 15, 0, PITCH_WIDTH, 15, 3, false);
  createTieredStand(PITCH_LENGTH / 2 + 15, 0, PITCH_WIDTH, 15, 3, false);

  // Roof canopy
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x0a1020, roughness: 0.5, metalness: 0.6, transparent: true, opacity: 0.85 });
  [-PITCH_WIDTH / 2 - 22, PITCH_WIDTH / 2 + 22].forEach((z, i) => {
    const roof = new THREE.Mesh(new THREE.BoxGeometry(PITCH_LENGTH + 44, 1.0, 16), roofMat);
    roof.position.set(0, 22, z);
    roof.rotation.x = (i === 0 ? 1 : -1) * 0.22;
    scene.add(roof);
  });

  // Crowd points
  const count = 2400;
  const geometry = new THREE.BufferGeometry();
  const positions = [], colors = [];
  window.spectatorsOriginalY = [];

  for (let i = 0; i < count; i++) {
    const stand = Math.floor(Math.random() * 4);
    const tier = Math.floor(Math.random() * 5);
    let x = 0, y = 1.6 + tier * 1.6 + Math.random() * 0.4, z = 0;
    if (stand === 0) { x = (Math.random() - 0.5) * (PITCH_LENGTH + 14); z = -PITCH_WIDTH / 2 - 15 + tier * 2.0 + (Math.random() - 0.5); }
    else if (stand === 1) { x = (Math.random() - 0.5) * (PITCH_LENGTH + 14); z = PITCH_WIDTH / 2 + 15 - tier * 2.0 + (Math.random() - 0.5); }
    else if (stand === 2) { x = -PITCH_LENGTH / 2 - 15 + tier * 2.0 + (Math.random() - 0.5); z = (Math.random() - 0.5) * PITCH_WIDTH; }
    else { x = PITCH_LENGTH / 2 + 15 - tier * 2.0 + (Math.random() - 0.5); z = (Math.random() - 0.5) * PITCH_WIDTH; }
    positions.push(x, y, z);
    window.spectatorsOriginalY.push(y);

    const rnd = Math.random();
    if (rnd < 0.30) colors.push(0.94, 0.27, 0.27);
    else if (rnd < 0.60) colors.push(0.22, 0.51, 0.96);
    else if (rnd < 0.78) colors.push(0.98, 0.76, 0.15);
    else colors.push(0.88, 0.88, 0.88);
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  window.spectatorMesh = new THREE.Points(geometry, new THREE.PointsMaterial({ size: 0.55, vertexColors: true }));
  scene.add(window.spectatorMesh);
}

/* ─── GOAL NETS (direction-correct) ─────────────────────────────────────────── */
function addGoalNet(group, xDir, depth) {
  // xDir: -1 for left goal (net behind = more negative X), +1 for right goal
  const lineMat = new THREE.LineBasicMaterial({ color: 0xc8dce8, transparent: true, opacity: 0.50 });
  const pts = [];
  const hS = 14, vS = 8, dS = 7;
  const nW = GOAL_WIDTH, nH = GOAL_HEIGHT;

  // ── Back panel ──────────────────────────────────────────────────────────
  for (let i = 0; i <= hS; i++) {
    const z = -nW/2 + (i/hS)*nW;
    pts.push(xDir*depth, 0, z,  xDir*depth, nH, z);
  }
  for (let j = 0; j <= vS; j++) {
    const y = (j/vS)*nH;
    pts.push(xDir*depth, y, -nW/2,  xDir*depth, y, nW/2);
  }

  // ── Left side panel (z = -nW/2) ─────────────────────────────────────────
  for (let k = 0; k <= dS; k++) {
    const x = xDir*(k/dS)*depth;
    pts.push(x, 0, -nW/2,  x, nH, -nW/2);
  }
  for (let j = 0; j <= vS; j++) {
    const y = (j/vS)*nH;
    pts.push(0, y, -nW/2,  xDir*depth, y, -nW/2);
  }

  // ── Right side panel (z = +nW/2) ────────────────────────────────────────
  for (let k = 0; k <= dS; k++) {
    const x = xDir*(k/dS)*depth;
    pts.push(x, 0, nW/2,  x, nH, nW/2);
  }
  for (let j = 0; j <= vS; j++) {
    const y = (j/vS)*nH;
    pts.push(0, y, nW/2,  xDir*depth, y, nW/2);
  }

  // ── Top panel ───────────────────────────────────────────────────────────
  for (let i = 0; i <= hS; i++) {
    const z = -nW/2 + (i/hS)*nW;
    pts.push(0, nH, z,  xDir*depth, nH, z);
  }
  for (let k = 0; k <= dS; k++) {
    const x = xDir*(k/dS)*depth;
    pts.push(x, nH, -nW/2,  x, nH, nW/2);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  group.add(new THREE.LineSegments(geo, lineMat));
}

export function createGoalPost(scene, xPos) {
  const goalGroup = new THREE.Group();
  const postMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.12, metalness: 0.4 });
  const postR = 0.18;
  const netDepth = 2.8;
  const xDir = xPos < 0 ? -1 : 1; // direction net extends behind goal

  // Left post
  const leftPost = new THREE.Mesh(new THREE.CylinderGeometry(postR, postR, GOAL_HEIGHT, 18), postMat);
  leftPost.position.set(0, GOAL_HEIGHT / 2, -GOAL_WIDTH / 2);
  leftPost.castShadow = true;
  goalGroup.add(leftPost);

  // Right post
  const rightPost = leftPost.clone();
  rightPost.position.set(0, GOAL_HEIGHT / 2, GOAL_WIDTH / 2);
  goalGroup.add(rightPost);

  // Crossbar
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(postR, postR, GOAL_WIDTH + 0.36, 18), postMat);
  bar.rotation.x = Math.PI / 2;
  bar.position.set(0, GOAL_HEIGHT, 0);
  bar.castShadow = true;
  goalGroup.add(bar);

  // Back support uprights (relative to goalGroup, so use xDir*netDepth)
  const addBackSupport = (zOff) => {
    const sup = new THREE.Mesh(new THREE.CylinderGeometry(postR * 0.6, postR * 0.6, GOAL_HEIGHT, 8), postMat);
    sup.position.set(xDir * netDepth, GOAL_HEIGHT / 2, zOff);
    sup.castShadow = true;
    goalGroup.add(sup);
  };
  addBackSupport(-GOAL_WIDTH / 2);
  addBackSupport(GOAL_WIDTH / 2);

  // Back top bar
  const backBar = new THREE.Mesh(new THREE.CylinderGeometry(postR * 0.6, postR * 0.6, GOAL_WIDTH + 0.36, 18), postMat);
  backBar.rotation.x = Math.PI / 2;
  backBar.position.set(xDir * netDepth, GOAL_HEIGHT, 0);
  goalGroup.add(backBar);

  // Diagonal support bars (front post to back post)
  const diagBar = (zOff) => {
    const start = new THREE.Vector3(0, GOAL_HEIGHT, zOff);
    const end = new THREE.Vector3(xDir * netDepth, GOAL_HEIGHT, zOff);
    const dir = end.clone().sub(start);
    const len = dir.length();
    const mid = start.clone().add(end).multiplyScalar(0.5);
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(postR*0.5, postR*0.5, len, 8), postMat);
    mesh.position.copy(mid);
    mesh.rotation.z = Math.PI / 2;
    goalGroup.add(mesh);
  };
  diagBar(-GOAL_WIDTH / 2);
  diagBar(GOAL_WIDTH / 2);

  // Net (direction-correct)
  addGoalNet(goalGroup, xDir, netDepth);

  goalGroup.position.set(xPos, 0, 0);
  scene.add(goalGroup);
  return goalGroup;
}



/* ─── CORNER FLAGS ──────────────────────────────────────────────────────────── */
function addCornerFlags(scene) {
  const corners = [
    [-PITCH_LENGTH / 2, -PITCH_WIDTH / 2],
    [-PITCH_LENGTH / 2, PITCH_WIDTH / 2],
    [PITCH_LENGTH / 2, -PITCH_WIDTH / 2],
    [PITCH_LENGTH / 2, PITCH_WIDTH / 2],
  ];

  const poleMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
  const flagColors = [0xff2233, 0x2244ff, 0xffdd00, 0x22cc44];

  corners.forEach(([cx, cz], i) => {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.0, 8), poleMat);
    pole.position.set(cx, 1.5, cz);
    scene.add(pole);

    const flagMat = new THREE.MeshBasicMaterial({ color: flagColors[i], side: THREE.DoubleSide });
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.45), flagMat);
    flag.position.set(cx + (cx < 0 ? 0.35 : -0.35), 2.85, cz);
    scene.add(flag);
  });
}

/* ─── LED ADVERTISING BOARDS ────────────────────────────────────────────────── */
function addAdvertisingBoards(scene) {
  const boardH = 1.0;
  const boardThk = 0.12;

  const makeBoard = (w, x, z, rotY, color1 = 0x1a1aff, color2 = 0x10b981) => {
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x111827 });
    const frame = new THREE.Mesh(new THREE.BoxGeometry(w, boardH + 0.12, boardThk + 0.04), frameMat);
    frame.position.set(x, boardH / 2, z);
    frame.rotation.y = rotY;
    scene.add(frame);

    // LED panel (emissive, alternating colours)
    const ledCanvas = document.createElement('canvas');
    ledCanvas.width = 512; ledCanvas.height = 64;
    const ctx = ledCanvas.getContext('2d');
    const grd = ctx.createLinearGradient(0, 0, 512, 0);
    grd.addColorStop(0, '#' + color1.toString(16).padStart(6, '0'));
    grd.addColorStop(0.5, '#ffffff');
    grd.addColorStop(1, '#' + color2.toString(16).padStart(6, '0'));
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, 512, 64);
    ctx.fillStyle = 'white';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('⚽ FOOTBALL LEGENDS ⚽', 256, 42);
    const ledTex = new THREE.CanvasTexture(ledCanvas);

    const ledMat = new THREE.MeshBasicMaterial({ map: ledTex });
    const led = new THREE.Mesh(new THREE.BoxGeometry(w - 0.1, boardH, boardThk), ledMat);
    led.position.set(x, boardH / 2, z);
    led.rotation.y = rotY;
    scene.add(led);
  };

  const segments = 5;
  const segLen = PITCH_LENGTH / segments;

  for (let i = 0; i < segments; i++) {
    const xPos = -PITCH_LENGTH / 2 + segLen * i + segLen / 2;
    makeBoard(segLen - 0.5, xPos, -PITCH_WIDTH / 2 - 1.0, 0);
    makeBoard(segLen - 0.5, xPos, PITCH_WIDTH / 2 + 1.0, Math.PI);
  }
}

/* ─── VFX ─────────────────────────────────────────────────────────────────── */
export function spawnGrassPuff(pos) {
  const count = 12;
  const mat = new THREE.MeshBasicMaterial({ color: 0x4d7c0f, transparent: true, opacity: 0.8 });
  for (let i = 0; i < count; i++) {
    const mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(0.12 + Math.random() * 0.12), mat.clone());
    mesh.position.set(pos.x + (Math.random() - 0.5) * 0.5, 0.1, pos.z + (Math.random() - 0.5) * 0.5);
    const vel = new THREE.Vector3((Math.random() - 0.5) * 4, 2.5 + Math.random() * 3, (Math.random() - 0.5) * 4);
    gameState.scene.add(mesh);
    particles.push({ mesh, vel, type: 'grass', life: 0.6 });
  }
}

export function spawnKickFlash(pos) {
  const count = 15;
  const mat = new THREE.MeshBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.9 });
  for (let i = 0; i < count; i++) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), mat.clone());
    mesh.position.copy(pos);
    const vel = new THREE.Vector3((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12);
    gameState.scene.add(mesh);
    particles.push({ mesh, vel, type: 'spark', life: 0.35 });
  }
}

export function spawnConfetti() {
  const count = 160;
  const colors = [0xfacc15, 0x3b82f6, 0xef4444, 0x10b981, 0xec4899];
  for (let i = 0; i < count; i++) {
    const mat = new THREE.MeshBasicMaterial({ color: colors[Math.floor(Math.random() * colors.length)] });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.05, 0.2), mat);
    mesh.position.set((Math.random() - 0.5) * 35, 12 + Math.random() * 15, (Math.random() - 0.5) * 40);
    const vel = new THREE.Vector3((Math.random() - 0.5) * 5, -3 - Math.random() * 4, (Math.random() - 0.5) * 5);
    gameState.scene.add(mesh);
    confetti.push({ mesh, vel, rotSpeed: Math.random() * 6, life: 3.5 });
  }
}

export function updateVFXParticles(dt) {
  particles.forEach((p, idx) => {
    p.life -= dt;
    if (p.life <= 0) {
      gameState.scene.remove(p.mesh);
      particles.splice(idx, 1);
    } else {
      p.vel.y -= 9.81 * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      p.mesh.material.opacity = Math.max(0, p.life / (p.type === 'grass' ? 0.6 : 0.35));
    }
  });

  confetti.forEach((c, idx) => {
    c.life -= dt;
    if (c.life <= 0) {
      gameState.scene.remove(c.mesh);
      confetti.splice(idx, 1);
    } else {
      c.mesh.position.addScaledVector(c.vel, dt);
      c.mesh.rotation.x += c.rotSpeed * dt;
      c.mesh.rotation.y += c.rotSpeed * dt;
    }
  });
}

/* ─── ENGINE INIT ────────────────────────────────────────────────────────────── */
export function initEngine3D() {
  const container = document.getElementById('canvas-container');

  gameState.scene = new THREE.Scene();
  gameState.scene.background = new THREE.Color(0x05080f);
  gameState.scene.fog = new THREE.FogExp2(0x05080f, 0.006);

  gameState.camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.5, 1200);
  gameState.camera.position.set(0, 36, 48);

  gameState.renderer = new THREE.WebGLRenderer({ antialias: true });
  gameState.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  gameState.renderer.setSize(window.innerWidth, window.innerHeight);
  gameState.renderer.shadowMap.enabled = true;
  gameState.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  gameState.renderer.toneMapping = THREE.ACESFilmicToneMapping;
  gameState.renderer.toneMappingExposure = 1.1;
  container.appendChild(gameState.renderer.domElement);

  gameState.orbitControls = new THREE.OrbitControls(gameState.camera, gameState.renderer.domElement);
  gameState.orbitControls.enableDamping = true;
  gameState.orbitControls.dampingFactor = 0.05;
  gameState.orbitControls.maxPolarAngle = Math.PI / 2.05;
  gameState.orbitControls.enabled = false;

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xd0e8ff, 0.48);
  gameState.scene.add(ambientLight);

  const hemi = new THREE.HemisphereLight(0x334466, 0x112211, 0.45);
  gameState.scene.add(hemi);

  const floodlightPositions = [
    [-PITCH_LENGTH / 2 - 4, 30, -PITCH_WIDTH / 2 - 12],
    [PITCH_LENGTH / 2 + 4, 30, -PITCH_WIDTH / 2 - 12],
    [-PITCH_LENGTH / 2 - 4, 30, PITCH_WIDTH / 2 + 12],
    [PITCH_LENGTH / 2 + 4, 30, PITCH_WIDTH / 2 + 12],
  ];

  const polemat = new THREE.MeshStandardMaterial({ color: 0x374151, metalness: 0.6, roughness: 0.4 });
  floodlightPositions.forEach(([x, y, z]) => {
    // Spot light
    const spot = new THREE.SpotLight(0xdbeafe, 2.2, 200, Math.PI / 3.8, 0.55);
    spot.position.set(x, y, z);
    spot.castShadow = true;
    spot.shadow.mapSize.width = 1024;
    spot.shadow.mapSize.height = 1024;
    spot.shadow.bias = -0.001;
    gameState.scene.add(spot);

    // Pole
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, y, 8), polemat);
    pole.position.set(x, y / 2, z);
    pole.castShadow = true;
    gameState.scene.add(pole);

    // Lamp housing
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.6, 1.2), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    lamp.position.set(x, y + 0.3, z);
    gameState.scene.add(lamp);
  });

  // Pitch floor
  const pitchGeo = new THREE.PlaneGeometry(PITCH_LENGTH + 12, PITCH_WIDTH + 12, 1, 1);
  const pitchTexture = createStripePitchTexture();
  pitchTexture.wrapS = THREE.RepeatWrapping;
  pitchTexture.wrapT = THREE.RepeatWrapping;
  pitchTexture.repeat.set(1, 1);
  const pitchMaterial = new THREE.MeshStandardMaterial({ map: pitchTexture, roughness: 0.78, metalness: 0.01 });
  const pitchFloor = new THREE.Mesh(pitchGeo, pitchMaterial);
  pitchFloor.rotation.x = -Math.PI / 2;
  pitchFloor.receiveShadow = true;
  gameState.scene.add(pitchFloor);

  // Surround (dark track around pitch)
  const surroundGeo = new THREE.PlaneGeometry(PITCH_LENGTH + 60, PITCH_WIDTH + 60, 1, 1);
  const surroundMat = new THREE.MeshStandardMaterial({ color: 0x0a0f1a, roughness: 0.9 });
  const surround = new THREE.Mesh(surroundGeo, surroundMat);
  surround.rotation.x = -Math.PI / 2;
  surround.position.y = -0.05;
  gameState.scene.add(surround);

  // Goals
  createGoalPost(gameState.scene, -PITCH_LENGTH / 2);
  createGoalPost(gameState.scene, PITCH_LENGTH / 2);

  // Corner flags
  addCornerFlags(gameState.scene);

  // Advertising boards
  addAdvertisingBoards(gameState.scene);

  // Spectators
  createSpectators(gameState.scene);

  // Ball
  const ballGeo = new THREE.SphereGeometry(gameState.ballRadius, 24, 24);
  const canvasBall = document.createElement('canvas');
  canvasBall.width = 256; canvasBall.height = 256;
  const cbCtx = canvasBall.getContext('2d');
  cbCtx.fillStyle = '#f0f0f0';
  cbCtx.fillRect(0, 0, 256, 256);
  // Pentagon patches (simplified)
  const patchPositions = [[128, 128], [128, 72], [172, 96], [172, 160], [128, 184], [84, 160], [84, 96]];
  cbCtx.fillStyle = '#1a1a1a';
  patchPositions.slice(0, 3).forEach(([px, py]) => {
    cbCtx.beginPath();
    cbCtx.arc(px, py, 28, 0, Math.PI * 2);
    cbCtx.fill();
  });
  const ballTex = new THREE.CanvasTexture(canvasBall);
  const ballMat = new THREE.MeshStandardMaterial({ map: ballTex, roughness: 0.22, metalness: 0.08 });
  gameState.ballMesh = new THREE.Mesh(ballGeo, ballMat);
  gameState.ballMesh.position.set(0, gameState.ballRadius, 0);
  gameState.ballMesh.castShadow = true;
  gameState.scene.add(gameState.ballMesh);

  // Ball trail
  const trailMat = new THREE.LineBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.8, linewidth: 3 });
  const maxTrailPoints = 25;
  const trailPositions = new Float32Array(maxTrailPoints * 3);
  const trailGeo = new THREE.BufferGeometry();
  trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
  window.ballTrailLine = new THREE.Line(trailGeo, trailMat);
  window.ballTrailPoints = [];
  gameState.scene.add(window.ballTrailLine);

  // Resize handler
  window.addEventListener('resize', () => {
    gameState.camera.aspect = window.innerWidth / window.innerHeight;
    gameState.camera.updateProjectionMatrix();
    gameState.renderer.setSize(window.innerWidth, window.innerHeight);
  });
}
