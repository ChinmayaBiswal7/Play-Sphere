// 3D Visual Models & Geometries Builder Module
import { preloadFBXPlayers, createFBXPlayer } from './fbx_players.js?v=43';

// Expose FBX preload globally so triggerMatchLoading can call it
window._preloadFBXPlayers = preloadFBXPlayers;

const STADIUM_CONFIGS = {
  default: { name: "Default Procedural" },
  ekana: {
    name: "Ekana Stadium (Lucknow)",
    file: "ekana_stadium_low_poly_lucknow_city_game_asset.glb",
    scale: 56.81,
    posY: -0.01,
    rotY: 0,
    offsetZ: -29.06
  },
  stadium_usdz: {
    name: "USDZ Stadium",
    file: "cricket_stadium_usdz.glb",
    scale: 12.59,
    posY: -0.01,
    rotY: 0,
    offsetZ: -9.55
  },
  qaddafi: {
    name: "Qaddafi Stadium (Lahore)",
    file: "new_qaddafi_cricket_stadium_lahore_-_low_poly.glb",
    scale: 2.96,
    posY: -0.01,
    rotY: 0,
    offsetZ: -22.83
  },
  classic: {
    name: "Classic Cricket Stadium",
    file: "cricket_stadium (1).glb",
    scale: 8.0,
    posY: -0.01,
    rotY: 0,
    offsetZ: -10.0
  },
  grand: {
    name: "Grand Cricket Stadium",
    file: "cricket_stadium.glb",
    scale: 12.0,
    posY: -0.01,
    rotY: 0,
    offsetZ: -10.0
  },
  cricket_ground: {
    name: "Cricket Ground Arena",
    file: "cg_model_1_cricket_ground.glb",
    scale: 8.37,
    posY: -0.01,
    rotY: 0,
    offsetZ: -10.6
  }
};

export function cleanupStadium() {
  const THREE = window.THREE;
  const scene = window.scene;
  if (window.stadium) {
    window.stadium.traverse(node => {
      if (node.isMesh || node.isPoints) {
        if (node.geometry) node.geometry.dispose();
        if (node.material) {
          const mats = Array.isArray(node.material) ? node.material : [node.material];
          mats.forEach(mat => {
            for (const key in mat) {
              if (mat[key] && mat[key].isTexture) {
                mat[key].dispose();
              }
            }
            mat.dispose();
          });
        }
      }
    });
    scene.remove(window.stadium);
    window.stadium = null;
    window.activeStadiumModel = null;
  }
}
window.cleanupStadium = cleanupStadium;

export function realignStadiumModel() {
  const THREE = window.THREE;
  const model = window.activeStadiumModel;
  if (!model) return;

  const config = STADIUM_CONFIGS[window.currentStadiumVal];
  if (!config) return;

  const scale = window.currentStadiumScale !== null ? window.currentStadiumScale : config.scale;
  const height = window.currentStadiumHeight !== null ? window.currentStadiumHeight : config.posY;
  const offsetZ = config.offsetZ !== undefined ? config.offsetZ : -10.0;

  const origCenter = model.userData.originalCenter;
  const origGroundY = model.userData.originalGroundY !== undefined ? model.userData.originalGroundY : model.userData.originalMinY;

  if (origCenter && origGroundY !== undefined) {
    if (window.currentStadiumVal === 'ekana' || window.currentStadiumVal === 'stadium_usdz' || 
        window.currentStadiumVal === 'qaddafi' || window.currentStadiumVal === 'cricket_ground') {
      model.position.set(0, -origGroundY * scale + height, offsetZ);
    } else {
      model.position.set(
        -origCenter.x * scale,
        -origGroundY * scale + height,
        -origCenter.z * scale + offsetZ
      );
    }
  }
}
window.realignStadiumModel = realignStadiumModel;

function addStadiumLights(group) {
  const THREE = window.THREE;
  
  group.add(new THREE.AmbientLight('#b4c6e7', 0.8));
  
  const moon = new THREE.DirectionalLight('#a5b4fc', 0.7);
  moon.position.set(15, 30, -10);
  moon.castShadow = false;
  group.add(moon);

  // Dedicated fill so batsman is never a dark blob
  const frontFill = new THREE.PointLight('#ffffff', 2.2, 18);
  frontFill.position.set(0, 4.5, -5);
  group.add(frontFill);

  const backFill = new THREE.DirectionalLight('#ffe4b5', 1.0);
  backFill.position.set(0, 5, 8);
  group.add(backFill);

  // 4 Spotlights representing stadium floodlights
  const towers = [{ x:-52,z:-62 },{ x:52,z:-62 },{ x:-52,z:42 },{ x:52,z:42 }];
  towers.forEach(tp => {
    const spot = new THREE.SpotLight('#ffffff', 7, 140, 0.65, 0.5, 1.2);
    spot.position.set(tp.x, 26, tp.z);
    spot.target.position.set(0, 0, -10);
    spot.castShadow = false;
    spot.shadow.mapSize.width  = 1024;
    spot.shadow.mapSize.height = 1024;
    spot.shadow.bias = -0.0005;
    group.add(spot);
    group.add(spot.target);
  });
}

export function createStadium(selectedStadiumVal = 'default', onLoadCallback) {
  const THREE = window.THREE;
  const scene = window.scene;

  // Tuning values belong to one model. Reusing a previous model's scale is why newly selected stadiums were microscopic or far outside the camera.
  if (window.currentStadiumVal !== selectedStadiumVal) {
    window.currentStadiumScale = null;
    window.currentStadiumHeight = null;
    window.currentStadiumRotation = null;
  }
  window.currentStadiumVal = selectedStadiumVal;
  if (window.pitch) {
    window.pitch.visible = (selectedStadiumVal === 'default');
  }

  // Bump the load token so any in-flight GLB callbacks from a *previous*
  // createStadium call are discarded when the model finally arrives.
  window.stadiumLoadToken = (window.stadiumLoadToken || 0) + 1;
  const myToken = window.stadiumLoadToken;

  // Cleanup old stadium group & lights
  cleanupStadium();

  window.stadium = new THREE.Group();
  scene.add(window.stadium);

  // Add lights to the stadium group so they clean up automatically with it
  addStadiumLights(window.stadium);

  // ── 30-YARD INNER CIRCLE (Always render, centered around pitch) ───────────────────
  const innerCircleMat = new THREE.MeshBasicMaterial({
    color: '#ffffff',
    transparent: true,
    opacity: 0.45,
    side: THREE.DoubleSide,
    depthWrite: true
  });
  const innerCircle = new THREE.Mesh(
    new THREE.RingGeometry(27.3, 27.6, 128),
    innerCircleMat
  );
  innerCircle.rotation.x = -Math.PI / 2;
  innerCircle.position.set(0, 0.03, -10.6);  // centered on pitch midpoint (raised 3cm off ground)
  innerCircle.renderOrder = 10;
  window.stadium.add(innerCircle);

  // ── BOUNDARY ROPE & BOARDS ────────────────────────────────────────────────
  const ropeMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.8 });
  const ropeGroup = new THREE.Group();
  const BR = 54.9, RR = 0.22;

  // Visual rope center is z=-10.0 to align with pitch midpoint
  const boundaryZ = -10.0;

  const torusGeo = new THREE.TorusGeometry(BR, RR, 16, 256);
  const mainRope = new THREE.Mesh(torusGeo, ropeMat);
  mainRope.rotation.x = Math.PI / 2;
  mainRope.position.set(0, 0.08, boundaryZ);
  ropeGroup.add(mainRope);

  const SEG = 128;
  // Hoist geometry & materials out of the loop — every board is identical
  const boardGeo = new THREE.BoxGeometry(1.2, 0.45, 0.15);
  const boardMatRed = new THREE.MeshStandardMaterial({ color: '#b91c1c', roughness: 0.5 });
  const boardMatBlue = new THREE.MeshStandardMaterial({ color: '#1e3a8a', roughness: 0.5 });
  for (let i = 0; i < SEG; i++) {
    const a0 = (i / SEG) * Math.PI * 2, a1 = ((i + 1) / SEG) * Math.PI * 2;
    const mid = (a0 + a1) / 2;
    if (i % 4 === 0) {
      const board = new THREE.Mesh(boardGeo, i % 8 === 0 ? boardMatRed : boardMatBlue);
      board.position.set(Math.sin(mid) * (BR - 0.35), 0.225, Math.cos(mid) * (BR - 0.35) + boundaryZ);
      board.lookAt(0, 0.225, -10);
      ropeGroup.add(board);
    }
  }
  window.stadium.add(ropeGroup);

  // ── BOUNDARY FENCE POSTS / BRACKETS ─────────────────────────────────────
  // Small white fence posts every ~4 degrees around the boundary rope
  const postGeo = new THREE.BoxGeometry(0.12, 0.55, 0.12);
  const postMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.5 });
  const fenceGroup = new THREE.Group();
  const POST_COUNT = 90; // 90 posts = one every 4 degrees
  for (let i = 0; i < POST_COUNT; i++) {
    const angle = (i / POST_COUNT) * Math.PI * 2;
    const post = new THREE.Mesh(postGeo, postMat);
    post.position.set(
      Math.sin(angle) * (BR + 0.1),
      0.275,
      Math.cos(angle) * (BR + 0.1) + boundaryZ
    );
    fenceGroup.add(post);
  }
  window.stadium.add(fenceGroup);


  if (selectedStadiumVal === 'default') {
    // ── GRASS OUTFIELD with mowing stripes ──────────────────────────
    const grassCanvas = document.createElement('canvas');
    grassCanvas.width = 1024; grassCanvas.height = 1024;
    const gc = grassCanvas.getContext('2d');
    gc.fillStyle = '#15803d';
    gc.fillRect(0, 0, 1024, 1024);
    const sw = 1024 / 32;
    gc.fillStyle = '#166534';
    for (let i = 0; i < 1024; i += sw * 2) gc.fillRect(0, i, 1024, sw);
    for (let px = 0; px < 25000; px++) {
      const x = Math.random() * 1024, y = Math.random() * 1024, sz = 1.5 + Math.random() * 2;
      gc.fillStyle = Math.random() > 0.5 ? 'rgba(22,163,74,0.25)' : 'rgba(20,83,45,0.25)';
      gc.beginPath(); gc.arc(x, y, sz, 0, Math.PI * 2); gc.fill();
    }
    const grassTex = new THREE.CanvasTexture(grassCanvas);
    grassTex.wrapS = grassTex.wrapT = THREE.RepeatWrapping;

    const outfield = new THREE.Mesh(
      new THREE.CylinderGeometry(55, 55, 0.4, 128),
      new THREE.MeshStandardMaterial({ map: grassTex, roughness: 0.95, metalness: 0.02 })
    );
    outfield.position.set(0, -0.2, -10.0);
    outfield.receiveShadow = true;
    window.stadium.add(outfield);

    // ── STADIUM BOWL — 3 TIERS with ACTUAL COLORED SEAT ROWS ────────
    const tierConfigs = [
      { innerR: 57, outerR: 65, baseY: 0,    topY: 8,   rows: 12, seatColors: ['#dc2626','#1d4ed8','#dc2626','#f59e0b'] },
      { innerR: 64, outerR: 72, baseY: 7,    topY: 16,  rows: 10, seatColors: ['#1d4ed8','#ffffff','#1d4ed8','#dc2626'] },
      { innerR: 71, outerR: 79, baseY: 14.5, topY: 22,  rows: 8,  seatColors: ['#f59e0b','#dc2626','#ffffff','#1d4ed8'] }
    ];

    const concMat  = new THREE.MeshStandardMaterial({ color: '#374151', roughness: 0.9 });
    const darkConc = new THREE.MeshStandardMaterial({ color: '#1f2937', roughness: 0.95 });

    tierConfigs.forEach((tc, tIdx) => {
      const h = tc.topY - tc.baseY;
      const backing = new THREE.Mesh(
        new THREE.CylinderGeometry(tc.outerR + 1, tc.innerR - 1, h, 64, 1, true),
        tIdx % 2 === 0 ? concMat : darkConc
      );
      backing.position.set(0, tc.baseY + h / 2, -10.0);
      window.stadium.add(backing);

      for (let row = 0; row < tc.rows; row++) {
        const t = row / tc.rows;
        const rowR = tc.innerR + (tc.outerR - tc.innerR) * t;
        const rowY = tc.baseY + h * t + 0.8;
        const colIdx = row % tc.seatColors.length;
        const seatMat = new THREE.MeshStandardMaterial({ color: tc.seatColors[colIdx], roughness: 0.6 });

        const SEAT_SEGS = 96;
        // Hoist seat geometry — ~2,800 seats share one geometry
        const seatGeo = new THREE.BoxGeometry(0.5, 0.35, 0.4);
        for (let s = 0; s < SEAT_SEGS; s++) {
          const ang = (s / SEAT_SEGS) * Math.PI * 2;
          const seat = new THREE.Mesh(seatGeo, seatMat);
          seat.position.set(Math.sin(ang) * rowR, rowY, Math.cos(ang) * rowR - 10.0);
          seat.rotation.y = ang;
          window.stadium.add(seat);
        }
      }
    });

    // ── CANTILEVERED ROOF ────────────────────────────────────────────
    const roofMat = new THREE.MeshStandardMaterial({ color: '#1f2937', roughness: 0.7, side: THREE.DoubleSide });
    const roof = new THREE.Mesh(new THREE.RingGeometry(58, 80, 64), roofMat);
    roof.rotation.x = -Math.PI / 2;
    roof.position.set(0, 23, -10.0);
    window.stadium.add(roof);

    // Roof support pillars — hoist geometry/material out of loop
    const pillarGeo = new THREE.CylinderGeometry(0.5, 0.8, 23, 8);
    const pillarMat = new THREE.MeshStandardMaterial({ color: '#4b5563', roughness: 0.9 });
    for (let i = 0; i < 16; i++) {
      const ang = (i / 16) * Math.PI * 2;
      const pillar = new THREE.Mesh(pillarGeo, pillarMat);
      pillar.position.set(Math.sin(ang) * 79, 11.5, Math.cos(ang) * 79 - 10.0);
      window.stadium.add(pillar);
    }

    // ── CROWD PARTICLE LAYER (behind seats for depth) ────────────────
    const pCount = 8000;
    const pGeo = new THREE.BufferGeometry();
    const pos = new Float32Array(pCount * 3);
    const col = new Float32Array(pCount * 3);
    const cColors = [
      new THREE.Color('#38bdf8'), new THREE.Color('#ec4899'),
      new THREE.Color('#eab308'), new THREE.Color('#f97316'),
      new THREE.Color('#10b981'), new THREE.Color('#f8fafc')
    ];
    for (let i = 0; i < pCount; i++) {
      const ang = Math.random() * Math.PI * 2;
      const r   = 57 + Math.random() * 20;
      pos[i*3]   = Math.sin(ang) * r;
      pos[i*3+2] = Math.cos(ang) * r - 10.0;
      pos[i*3+1] = 1 + ((r - 57) / 20) * 20 + Math.random() * 0.4;
      const c = cColors[Math.floor(Math.random() * cColors.length)];
      col[i*3] = c.r; col[i*3+1] = c.g; col[i*3+2] = c.b;
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    pGeo.setAttribute('color',    new THREE.BufferAttribute(col, 3));
    window.stadium.add(new THREE.Points(pGeo, new THREE.PointsMaterial({
      size: 0.18, vertexColors: true, transparent: true,
      opacity: 0.9, blending: THREE.AdditiveBlending
    })));

    // ── SIGHTSCREENS (Behind wickets at both ends) ───────────────────
    const screenMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.9 });
    const frameMat = new THREE.MeshStandardMaterial({ color: '#1f2937', roughness: 0.7 });
    [[-67.5, 0], [47.5, Math.PI]].forEach(([sz, sRot]) => {
      const screenGroup = new THREE.Group();
      screenGroup.position.set(0, 0, sz);
      screenGroup.rotation.y = sRot;

      const board = new THREE.Mesh(new THREE.BoxGeometry(6.5, 4.8, 0.15), screenMat);
      board.position.set(0, 2.4, 0);
      board.castShadow = true;
      screenGroup.add(board);

      for (let side of [-1, 1]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 4.8, 8), frameMat);
        post.position.set(side * 3.3, 2.4, -0.1);
        post.castShadow = true;
        screenGroup.add(post);
      }
      window.stadium.add(screenGroup);
    });

    // ── 4 FLOODLIGHT TOWERS (Physical geometry) ───────────────────
    const metalMat = new THREE.MeshStandardMaterial({ color: '#1f2937', metalness: 0.8, roughness: 0.25 });
    const towers = [{ x:-52,z:-62 },{ x:52,z:-62 },{ x:-52,z:42 },{ x:52,z:42 }];
    towers.forEach(tp => {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.9, 26, 8), metalMat);
      pole.position.set(tp.x, 13, tp.z);
      pole.castShadow = true;
      window.stadium.add(pole);

      for (let arm = 0; arm < 3; arm++) {
        const crossArm = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 6, 6), metalMat);
        crossArm.rotation.z = Math.PI / 2;
        crossArm.position.set(tp.x, 20 + arm * 1.5, tp.z);
        window.stadium.add(crossArm);
      }

      const head = new THREE.Mesh(new THREE.BoxGeometry(5, 3, 0.8), metalMat);
      head.position.set(tp.x, 26, tp.z);
      head.lookAt(0, 5, -10);
      window.stadium.add(head);

      const bulbs = new THREE.Mesh(
        new THREE.PlaneGeometry(4.5, 2.6),
        new THREE.MeshBasicMaterial({ color: '#fef9c3' })
      );
      bulbs.position.set(tp.x, 26, tp.z);
      bulbs.lookAt(0, 5, -10);
      bulbs.translateZ(0.42);
      window.stadium.add(bulbs);
    });

    // ── SCOREBOARDS ──────────────────────────────────────────────────
    [{ x:0, y:18, z:-82, ry:0 }, { x:0, y:18, z:62, ry:Math.PI }].forEach(sp => {
      const frame = new THREE.Mesh(new THREE.BoxGeometry(14, 8, 1), metalMat);
      frame.position.set(sp.x, sp.y, sp.z);
      frame.rotation.y = sp.ry;
      window.stadium.add(frame);
      const screen = new THREE.Mesh(
        new THREE.PlaneGeometry(13, 7.2),
        new THREE.MeshBasicMaterial({ color: '#020617' })
      );
      screen.position.set(sp.x, sp.y, sp.z);
      screen.rotation.y = sp.ry;
      screen.translateZ(0.52);
      window.stadium.add(screen);
    });

    // ── PRESS BOX ────────────────────────────────────────────────────
    const pressBox = new THREE.Mesh(
      new THREE.BoxGeometry(12, 4, 3),
      new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.5 })
    );
    pressBox.position.set(0, 20, -77);
    window.stadium.add(pressBox);

    const glass = new THREE.Mesh(
      new THREE.PlaneGeometry(11.5, 3.5),
      new THREE.MeshStandardMaterial({ color: '#7dd3fc', transparent: true, opacity: 0.35, roughness: 0.05 })
    );
    glass.position.set(0, 20, -75.45);
    window.stadium.add(glass);

    // Reset tuning stats when default is loaded
    window.currentStadiumScale = 1.0;
    window.currentStadiumHeight = 0.0;
    window.currentStadiumRotation = 0.0;

    if (onLoadCallback) onLoadCallback();
  } else {
    const config = STADIUM_CONFIGS[selectedStadiumVal];
    if (!config) {
      console.error("Unknown stadium: " + selectedStadiumVal);
      createStadium('default', onLoadCallback);
      return;
    }

    // Debug: Log which stadium file is being loaded
    console.log("[StadiumLoader] Loading stadium file: " + config.file + " for " + selectedStadiumVal);

    // Guard: GLTFLoader may not exist if the CDN script failed to load.
    if (!window.THREE || !window.THREE.GLTFLoader) {
      console.warn("[StadiumLoader] THREE.GLTFLoader unavailable - falling back to default stadium.");
      createStadium('default', onLoadCallback);
      return;
    }

    const loader = new THREE.GLTFLoader();
    loader.load('models/stadiums/' + config.file, (gltf) => {
      // Staleness guard: if the user switched stadiums while this GLB was
      // downloading, discard the result - the new createStadium call owns
      // the stadium group now.
      if (window.stadiumLoadToken !== myToken) {
        console.log("[StadiumLoader] Discarding stale GLB load (token mismatch).");
        if (gltf.scene) {
          gltf.scene.traverse(node => {
            if (node.isMesh || node.isPoints) {
              if (node.geometry) node.geometry.dispose();
              if (node.material) {
                const mats = Array.isArray(node.material) ? node.material : [node.material];
                mats.forEach(mat => {
                  for (const key in mat) {
                    if (mat[key] && mat[key].isTexture) {
                      mat[key].dispose();
                    }
                  }
                  mat.dispose();
                });
              }
            }
          });
        }
        return;
      }

      const model = gltf.scene;

      // Strip any embedded lights from the GLB stadium model
      const GLBLights = [];
      model.traverse(node => {
        if (node.isLight) {
          GLBLights.push(node);
        }
      });
      GLBLights.forEach(l => { if (l.parent) l.parent.remove(l); });

      // Enable shadows and hide pre-defined stumps/wickets/pitches
      model.traverse(node => {
        if (node.isMesh) {
          node.castShadow = true;
          node.receiveShadow = true;

          // Name-based filtering to hide pre-defined wickets/stumps/pitches
          const name = node.name.toLowerCase();
          if (name.includes('stump') || name.includes('wicket') || name.includes('pitch') || name.includes('crease') || name.includes('bail')) {
            node.visible = false;
          }

          // Geometry-based stump detection for custom stadiums
          if (node.geometry) {
            node.geometry.computeBoundingBox();
            const bbox = node.geometry.boundingBox;
            if (bbox) {
              const centerPoint = new THREE.Vector3();
              bbox.getCenter(centerPoint);
              
              if (selectedStadiumVal === 'stadium_usdz') {
                const isNearPitchCenter = Math.abs(centerPoint.x) < 0.5;
                const isStumpHeight = centerPoint.y > 0.05 && centerPoint.y < 1.2;
                const isWicketZ = Math.abs(centerPoint.z - (-1.02)) < 0.25 || Math.abs(centerPoint.z - 0.85) < 0.25;
                if (isNearPitchCenter && isStumpHeight && isWicketZ) {
                  node.visible = false;
                }
              } else if (selectedStadiumVal === 'ekana') {
                const isNearPitchCenter = Math.abs(centerPoint.x) < 0.2;
                const isStumpHeight = centerPoint.y > 0.05 && centerPoint.y < 1.2;
                const isWicketZ = Math.abs(centerPoint.z - 0.117) < 0.1 || Math.abs(centerPoint.z - 0.533) < 0.1;
                if (isNearPitchCenter && isStumpHeight && isWicketZ) {
                  node.visible = false;
                }
              } else if (selectedStadiumVal === 'qaddafi') {
                const isNearPitchCenter = Math.abs(centerPoint.x) < 0.5;
                const isStumpHeight = centerPoint.y > 0.05 && centerPoint.y < 1.2;
                const isWicketZ = Math.abs(centerPoint.z - 0.146) < 0.2 || Math.abs(centerPoint.z - 8.115) < 0.2;
                if (isNearPitchCenter && isStumpHeight && isWicketZ) {
                  node.visible = false;
                }
              } else if (selectedStadiumVal === 'cricket_ground') {
                const isNearPitchCenter = Math.abs(centerPoint.x) < 0.5;
                const isStumpHeight = centerPoint.y > 0.05 && centerPoint.y < 1.2;
                const isWicketZ = Math.abs(centerPoint.z - (-1.41)) < 0.2 || Math.abs(centerPoint.z - 1.41) < 0.2;
                if (isNearPitchCenter && isStumpHeight && isWicketZ) {
                  node.visible = false;
                }
              }
            }
          }
        }
      });

      // Compute bounding box of unscaled model (scale = 1, pos = 0)
      const box = new THREE.Box3().setFromObject(model);
      const center = new THREE.Vector3();
      box.getCenter(center);

      model.userData.originalCenter = center;
      model.userData.originalMinY = box.min.y;

      // Playing field ground level is centered at Y = 0 in unscaled model space
      model.userData.originalGroundY = 0;

      window.activeStadiumModel = model;

      // 1. Get scale: saved tuning overrides config default
      if (window.currentStadiumScale === null || window.currentStadiumScale === undefined) {
        window.currentStadiumScale = config.scale;
      }
      model.scale.set(window.currentStadiumScale, window.currentStadiumScale, window.currentStadiumScale);

      // 2. Get Y offset (height): saved tuning overrides config default
      if (window.currentStadiumHeight === null || window.currentStadiumHeight === undefined) {
        window.currentStadiumHeight = config.posY;
      }

      // 3. Get rotation: saved tuning overrides config default
      if (window.currentStadiumRotation === null || window.currentStadiumRotation === undefined) {
        window.currentStadiumRotation = config.rotY;
      }
      model.rotation.y = window.currentStadiumRotation;

      // Center model centered on X and Z (Z offset aligned with pitch) and Y
      realignStadiumModel();

      window.stadium.add(model);

      if (onLoadCallback) onLoadCallback();
    },
    undefined,
    (err) => {
      console.error("Error loading GLB stadium:", err);
      // Fallback to default, but guard against infinite recursion if the
      // default stadium itself also triggers a GLB load that errors.
      if (selectedStadiumVal !== 'default') {
        createStadium('default', onLoadCallback);
      } else if (onLoadCallback) {
        onLoadCallback(); // proceed with empty stadium group rather than loop
      }
    });
  }
}

export function createPitch() {
  const THREE = window.THREE;
  const CANNON = window.CANNON;
  const scene = window.scene;
  const physicsWorld = window.physicsWorld;

  window.pitch = new THREE.Group();
  window.pitch.position.set(0, 0, -10.0);

  // Clay base
  const clay = new THREE.Mesh(
    new THREE.BoxGeometry(4.0, 0.1, 23),
    new THREE.MeshStandardMaterial({ color: '#a17c4e', roughness: 0.95 })
  );
  clay.position.y = -0.05;
  clay.receiveShadow = true;
  window.pitch.add(clay);

  // Surface turf
  const turf = new THREE.Mesh(
    new THREE.PlaneGeometry(4.0, 23),
    new THREE.MeshStandardMaterial({ color: '#c8a96e', roughness: 0.95 })
  );
  turf.rotation.x = -Math.PI / 2;
  turf.position.y = 0.001;
  turf.receiveShadow = true;
  window.pitch.add(turf);

  // Wear marks in the middle (rough zone) - Commented out to remove the yellow patch
  /*
  const wear = new THREE.Mesh(
    new THREE.PlaneGeometry(1.0, 3.5),
    new THREE.MeshStandardMaterial({ color: '#8b6914', roughness: 1.0 })
  );
  wear.rotation.x = -Math.PI / 2;
  wear.position.set(0, 0.002, 2);
  window.pitch.add(wear);
  */

  // ─── FULL SYMMETRIC CREASE SYSTEM ──────────────────────────────────────────
  // Pitch group is at world (0,0,-10), so local Z = world Z + 10.
  // Batsman stumps world z=1.2  → local z=11.2
  // Bowler   stumps world z=-21.2 → local z=-11.2
  //
  // At each end we draw:
  //   1. Bowling crease  — horizontal at stumps Z, 2.64m wide
  //   2. Popping crease  — horizontal 1.22m inside, 3.66m wide (extends beyond pitch sides)
  //   3. Return creases  — two vertical lines at x=±1.32, spanning 2.44m
  //      (from the popping crease through the bowling crease and 1.22m beyond)
  //   4. Wide guide lines — vertical at x=±1.15, from stumps to popping crease (1.22m)
  // ──────────────────────────────────────────────────────────────────────────
  const creaseMat = new THREE.MeshBasicMaterial({ color: '#ffffff', side: THREE.DoubleSide });

  function addLine(w, h, x, z) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), creaseMat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.053, z);
    window.pitch.add(m);
  }

  // Both ends: batsman local z=+11.2 (dir=-1 toward center), bowler local z=-12.4 (dir=+1)
  // Bowler end stumps at world -22.4, so local Z = -22.4 - (-10.0) = -12.4
  [
    { stumpsZ: 11.2,  dir: -1 },   // batsman end
    { stumpsZ: -12.4, dir:  1 }    // bowler end
  ].forEach(({ stumpsZ, dir }) => {
    const poppingZ = stumpsZ + dir * 1.22;   // 1.22m in front of stumps (toward centre)

    // 1. Bowling crease — at the stumps line itself, 2.64m wide
    addLine(2.64, 0.05, 0, stumpsZ);

    // 2. Popping crease — 3.66m wide (wider than pitch to match ICC rules)
    addLine(3.66, 0.05, 0, poppingZ);

    // 3. Return creases — x = ±1.32, total span 2.44m centred on stumpsZ
    //    This means they go 1.22m each side of the stumps line, spanning:
    //    from poppingZ through the bowling crease and 1.22m beyond
    const rcLength = 2.44;
    addLine(0.05, rcLength, -1.32, stumpsZ);
    addLine(0.05, rcLength,  1.32, stumpsZ);

    // 4. Wide guide lines — x = ±1.15 (slightly wider for visual scale)
    //    From stumps toward popping crease, length 1.22m, centred between the two
    const wideLineCenter = stumpsZ + dir * 0.61;
    addLine(0.05, 1.22, -1.15, wideLineCenter);
    addLine(0.05, 1.22,  1.15, wideLineCenter);
  });

  window.pitch.visible = (window.currentStadiumVal === 'default' || !window.currentStadiumVal);
  scene.add(window.pitch);

  const groundBody = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
  groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
  groundBody.position.set(0, 0.001, -10.0);
  physicsWorld.addBody(groundBody);
  window.pitchBody = groundBody;

  // Ball landing spot marker (hidden by default, fades in on bounce)
  const markerGeo = new THREE.RingGeometry(0.24, 0.32, 32);
  const markerMat = new THREE.MeshBasicMaterial({
    color: '#f59e0b',
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0,
    depthWrite: false
  });
  window.landingMarker = new THREE.Mesh(markerGeo, markerMat);
  window.landingMarker.rotation.x = -Math.PI / 2;
  window.landingMarker.position.set(0, 0.052, -10.0);
  window.landingMarker.visible = true;  // opacity will control actual visibility
  scene.add(window.landingMarker);
}

export function createWickets() {
  const THREE  = window.THREE;
  const CANNON = window.CANNON;
  const scene  = window.scene;
  const physicsWorld = window.physicsWorld;
  const WICKET_Z = window.WICKET_Z;

  window.wicketsGroup = new THREE.Group();

  const stumpMat = new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.2, metalness: 0.0 });
  const bailMat  = new THREE.MeshStandardMaterial({ color: '#f59e0b', roughness: 0.3 }); // gold bails

  const SR = 0.024, SH = 0.72, SP = 0.11;
  window.stumpsVisuals = [];
  window.stumpBodies   = [];
  window.bailsVisuals = [];
  window.bailBodies   = [];

  // Spawn wickets at BOTH ends: batsman end (Z = WICKET_Z = 1.2) and bowler end (Z = -22.4)
  const wicketZs = [WICKET_Z, -22.4];

  wicketZs.forEach(wz => {
    for (let i = -1; i <= 1; i++) {
      const x = i * SP;
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(SR, SR, SH, 12), stumpMat);
      mesh.position.set(x, SH / 2, wz);
      mesh.castShadow = true;
      window.wicketsGroup.add(mesh);
      window.stumpsVisuals.push(mesh);

      // Decorative rings
      [0.15, 0.55].forEach(yOff => {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(SR + 0.005, 0.008, 6, 12),
          new THREE.MeshStandardMaterial({ color: '#f59e0b', roughness: 0.3 })
        );
        ring.rotation.x = Math.PI / 2;
        ring.position.set(x, yOff, wz);
        window.wicketsGroup.add(ring);
      });

      const body = new CANNON.Body({ mass: 0 });
      body.addShape(new CANNON.Cylinder(SR, SR, SH, 10));
      body.position.set(x, SH / 2, wz);
      physicsWorld.addBody(body);
      window.stumpBodies.push(body);
    }

    // Bails
    const BL = 0.105, BR = 0.013;
    [[-SP / 2, wz], [SP / 2, wz]].forEach(([x, z]) => {
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(BR, BR, BL, 8), bailMat);
      mesh.rotation.z = Math.PI / 2;
      mesh.position.set(x, SH + BR + 0.005, z);
      window.wicketsGroup.add(mesh);
      window.bailsVisuals.push(mesh);

      const body = new CANNON.Body({ mass: 0 });
      body.addShape(new CANNON.Cylinder(BR, BR, BL, 8));
      body.position.set(x, SH + BR + 0.005, z);
      const q = new CANNON.Quaternion();
      q.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), Math.PI / 2);
      body.quaternion.copy(q);
      physicsWorld.addBody(body);
      window.bailBodies.push(body);
    });
  });

  scene.add(window.wicketsGroup);
}

function createNumberTexture(numberString, textColorHex) {
  const THREE = window.THREE;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  
  // Clear transparent
  ctx.clearRect(0, 0, 128, 128);
  
  // Draw clean text
  ctx.fillStyle = textColorHex;
  ctx.font = 'bold 90px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(numberString, 64, 64);
  
  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

// ── DETAILED PLAYER ─────────────────────────────────────────────
export function createDetailedPlayer(
  isBatsman,
  primaryColor, secondaryColor, pantColor, helmetCapColor,
  skinColor = '#fed7aa', hairColor = '#3f2e1a', padColor = '#3b82f6',
  hasGloves = false,
  jerseyNumber = ''
) {
  const THREE = window.THREE;
  const playerGroup = new THREE.Group();
  playerGroup.parts = {};

  const skinMat    = new THREE.MeshStandardMaterial({ color: skinColor,       roughness: 0.6 });
  const jerseyMat  = new THREE.MeshStandardMaterial({ color: primaryColor,    roughness: 0.5 });
  const trimMat    = new THREE.MeshStandardMaterial({ color: secondaryColor,  roughness: 0.5 });
  const pantMat    = new THREE.MeshStandardMaterial({ color: pantColor,       roughness: 0.6 });
  const shoeMat    = new THREE.MeshStandardMaterial({ color: '#f8fafc',       roughness: 0.4 });
  const soleMat    = new THREE.MeshStandardMaterial({ color: '#1f2937',       roughness: 0.8 });
  // Dynamic customized bat material (Golden Bat or Carbon Fibre Bat)
  let batColor = '#d97706';
  let batMetalness = 0.0;
  let batRoughness = 0.7;
  
  if (isBatsman && window.profile) {
    const equipped = window.profile.equippedBat || 'default';
    if (equipped === 'golden') {
      batColor = '#f59e0b';
      batMetalness = 0.9;
      batRoughness = 0.15;
    } else if (equipped === 'carbon') {
      batColor = '#1e293b';
      batMetalness = 0.65;
      batRoughness = 0.25;
    }
  }
  const woodMat    = new THREE.MeshStandardMaterial({ color: batColor, roughness: batRoughness, metalness: batMetalness });
  const gripMat    = new THREE.MeshStandardMaterial({ color: '#dc2626',       roughness: 0.5 });
  const gloveMat   = new THREE.MeshStandardMaterial({ color: '#ffffff',       roughness: 0.4 });
  const padMat     = new THREE.MeshStandardMaterial({ color: padColor,        roughness: 0.5 });
  const helmetMat  = new THREE.MeshStandardMaterial({ color: helmetCapColor,  roughness: 0.4 });
  const strapMat   = new THREE.MeshStandardMaterial({ color: '#1e2937',       roughness: 0.9 });
  const hairMat    = new THREE.MeshStandardMaterial({ color: hairColor,       roughness: 0.9 });

  function sh(m) { m.castShadow = true; m.receiveShadow = true; }

  // ── TORSO (Tapered Athletic V-Shape: Chest, Waist, Hips, Neck) ──
  const torsoGroup = new THREE.Group();
  torsoGroup.position.set(0, 0.6, 0);

  // Upper Chest (V-shape shoulders width = 0.28)
  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.22, 0.18), jerseyMat);
  chest.position.set(0, 0.11, 0);
  sh(chest); torsoGroup.add(chest);

  // Waist (tapering to 0.21)
  const waist = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.16, 0.15), jerseyMat);
  waist.position.set(0, -0.08, 0);
  sh(waist); torsoGroup.add(waist);

  // Hips
  const hips = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.10, 0.15), pantMat);
  hips.position.set(0, -0.21, 0);
  sh(hips); torsoGroup.add(hips);

  // Neck
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.08, 8), skinMat);
  neck.position.set(0, 0.24, 0);
  sh(neck); torsoGroup.add(neck);

  // Narrower Shoulder Joints
  [-0.18, 0.18].forEach(sx => {
    const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 8), jerseyMat);
    shoulder.position.set(sx, 0.2, 0); sh(shoulder); torsoGroup.add(shoulder);
  });
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.04, 12), trimMat);
  collar.position.y = 0.22; sh(collar); torsoGroup.add(collar);

  // Number on jersey back
  if (jerseyNumber) {
    const numTexture = createNumberTexture(jerseyNumber, secondaryColor);
    const numMat = new THREE.MeshBasicMaterial({
      map: numTexture,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const numMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.12), numMat);
    numMesh.position.set(0, 0.05, -0.091); // Back of chest
    numMesh.rotation.y = Math.PI; // Face backwards so readable from behind
    torsoGroup.add(numMesh);
  }

  playerGroup.parts.torso = torsoGroup;

  // ── HEAD (helmet or cap depending on role) ─────────────────────
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.30, 0);

  const face = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 16), skinMat);
  sh(face); headGroup.add(face);

  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.025, 0.02), skinMat);
  nose.position.set(0, 0, 0.09); headGroup.add(nose);

  const hairM = new THREE.Mesh(new THREE.SphereGeometry(0.092, 16, 16), hairMat);
  hairM.position.set(0, 0.03, -0.01);
  hairM.scale.set(1.02, 0.98, 1.02);
  sh(hairM);

  if (isBatsman) {
    // Helmet dome
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.10, 16, 16), helmetMat);
    dome.position.y = 0.015; sh(dome); headGroup.add(dome);

    // Visor
    const visor = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.012, 0.07),
      new THREE.MeshStandardMaterial({ color: '#1e2937', roughness: 0.1, metalness: 0.9 })
    );
    visor.position.set(0, 0.015, 0.08);
    visor.rotation.x = Math.PI / 18;
    headGroup.add(visor);

    // Steel grill (detailed horizontal/vertical bars instead of simple wireframe)
    const grillGroup = new THREE.Group();
    grillGroup.position.set(0, -0.03, 0.065);
    const grillMetal = new THREE.MeshStandardMaterial({ color: '#94a3b8', roughness: 0.1, metalness: 0.9 });
    for (let b = -1; b <= 1; b++) {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.09, 6), grillMetal);
      bar.rotation.z = Math.PI / 2;
      bar.position.set(0, b * 0.018, 0.007 * (1 - Math.abs(b)));
      grillGroup.add(bar);
    }
    for (let side of [-1, 1]) {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.05, 6), grillMetal);
      bar.position.set(side * 0.032, -0.007, 0);
      grillGroup.add(bar);
    }
    headGroup.add(grillGroup);

    // Chin strap
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.05, 0.09), strapMat);
    strap.position.set(0, -0.07, 0); headGroup.add(strap);
  } else {
    // Cap
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.095, 12, 12), helmetMat);
    cap.position.set(0, 0.03, -0.007);
    cap.scale.set(1.01, 0.88, 1.01); sh(cap); headGroup.add(cap);
    const peak = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.008, 0.065), helmetMat);
    peak.position.set(0, 0.025, 0.095);
    peak.rotation.x = Math.PI / 18; sh(peak); headGroup.add(peak);
    headGroup.add(hairM);
  }

  // Sunglasses/visor strip
  const shades = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.015, 0.035),
    new THREE.MeshBasicMaterial({ color: '#090d16' })
  );
  shades.position.set(0, 0.015, 0.07); headGroup.add(shades);

  torsoGroup.add(headGroup);

  // ── ARMS (With Elbow and Wrist Joints) ───────────────────────────
  function makeArm(side) { // side = -1 (left) or +1 (right)
    const armGroup = new THREE.Group();
    armGroup.position.set(side * 0.18, 0.2, 0);

    const trim = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), trimMat);
    sh(trim); armGroup.add(trim);

    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.038, 0.24, 8), jerseyMat);
    upper.position.y = -0.12; sh(upper); armGroup.add(upper);

    const foreGroup = new THREE.Group();
    foreGroup.position.set(0, -0.24, 0);

    // Elbow Joint Sphere
    const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.038, 8, 8), skinMat);
    elbow.position.set(0, 0, 0); sh(elbow); foreGroup.add(elbow);

    const fore = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.032, 0.20, 8), skinMat);
    fore.position.y = -0.10; sh(fore); foreGroup.add(fore);

    // Wrist Pivot Group
    const handGroup = new THREE.Group();
    handGroup.position.set(0, -0.20, 0); // pivoted at wrist!

    const isGlovesArm = isBatsman || hasGloves;
    const handMat = (isGlovesArm) ? gloveMat : skinMat;
    
    // Wrist joint sphere
    const wristJoint = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), skinMat);
    sh(wristJoint); handGroup.add(wristJoint);

    // Palm / Glove shape
    const palm = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.06, 0.025), handMat);
    palm.position.y = -0.03;
    sh(palm); handGroup.add(palm);

    foreGroup.add(handGroup);

    // ── BAT (RIGHT ARM ONLY, pivoted from HANDLE TOP, attached to RIGHT HAND) ──────────
    if (isBatsman && side === 1) {
      const batPivot = new THREE.Group();
      batPivot.position.set(0, -0.04, 0.03); // attached to right hand palm!

      // Handle — hangs below pivot
      const handle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.014, 0.014, 0.32, 8), gripMat
      );
      handle.position.y = -0.16;
      sh(handle); batPivot.add(handle);

      // Blade — below handle
      const blade = new THREE.Mesh(
        new THREE.BoxGeometry(0.07, 0.54, 0.03), woodMat
      );
      blade.position.y = -0.59;
      sh(blade); batPivot.add(blade);

      // Brand sticker on blade
      const sticker = new THREE.Mesh(
        new THREE.PlaneGeometry(0.05, 0.26),
        new THREE.MeshStandardMaterial({ color: '#b91c1c', roughness: 0.1 })
      );
      sticker.position.set(0, -0.59, 0.016); batPivot.add(sticker);

      // Rest idle angle — bat points diagonally UP and BACK (guard stance)
      batPivot.rotation.set(0.4, 0, 0.15);

      handGroup.add(batPivot);
      playerGroup.parts.bat = batPivot;
      playerGroup.parts.batBlade = blade;
    }

    armGroup.add(foreGroup);
    return { armGroup, foreGroup, handGroup };
  }

  const { armGroup: leftArmGroup,  foreGroup: leftForeGroup,  handGroup: leftHandGroup  } = makeArm(-1);
  const { armGroup: rightArmGroup, foreGroup: rightForeGroup, handGroup: rightHandGroup } = makeArm(1);

  torsoGroup.add(leftArmGroup);
  torsoGroup.add(rightArmGroup);
  playerGroup.parts.leftArm      = leftArmGroup;
  playerGroup.parts.leftForearm  = leftForeGroup;
  playerGroup.parts.leftHand     = leftHandGroup;
  playerGroup.parts.rightArm     = rightArmGroup;
  playerGroup.parts.rightForearm = rightForeGroup;
  playerGroup.parts.rightHand    = rightHandGroup;

  playerGroup.add(torsoGroup);

  // ── LEGS (With Knee and Ankle Joints) ────────────────────────────
  function makeLeg(side) { // side = -1 (left) or +1 (right)
    const legGroup = new THREE.Group();
    legGroup.position.set(side * 0.09, 0.6, 0); // PIVOT at hip

    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.055, 0.30, 8), pantMat);
    thigh.position.y = -0.15; sh(thigh); legGroup.add(thigh);

    const lowerGroup = new THREE.Group();
    lowerGroup.position.set(0, -0.30, 0); // pivot at knee

    // Knee Joint Sphere
    const knee = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), pantMat);
    knee.position.set(0, 0, 0); sh(knee); lowerGroup.add(knee);

    const calf = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.048, 0.26, 8), pantMat);
    calf.position.y = -0.13; sh(calf); lowerGroup.add(calf);

    // Foot Pivot Group (Ankle Joint)
    const footGroup = new THREE.Group();
    footGroup.position.set(0, -0.26, 0); // pivoted at ankle!

    // Ankle Joint Sphere
    const ankle = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), shoeMat);
    sh(ankle); footGroup.add(ankle);

    // Shoe (repositioned relative to footGroup)
    const shoeUpper = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.045, 0.12), shoeMat);
    shoeUpper.position.set(0, 0, 0.015); sh(shoeUpper); footGroup.add(shoeUpper);
    
    const shoeSole = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.02, 0.13), soleMat);
    shoeSole.position.set(0, -0.03, 0.015); sh(shoeSole); footGroup.add(shoeSole);

    lowerGroup.add(footGroup);

    if (isBatsman) {
      // Batting pads
      const pad = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.44, 0.08), padMat);
      pad.position.set(0, -0.12, 0.055); sh(pad); lowerGroup.add(pad);

      const kneeRoll = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.06, 0.09), padMat);
      kneeRoll.position.set(0, -0.01, 0.06); sh(kneeRoll); lowerGroup.add(kneeRoll);

      const strapT = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.015, 0.09), strapMat);
      strapT.position.set(0, -0.09, -0.01); sh(strapT); lowerGroup.add(strapT);
      const strapB = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.015, 0.08), strapMat);
      strapB.position.set(0, -0.19, -0.01); sh(strapB); lowerGroup.add(strapB);
    }

    legGroup.add(lowerGroup);
    return { legGroup, lowerGroup };
  }

  const { legGroup: leftLegGroup,  lowerGroup: leftLowerLeg  } = makeLeg(-1);
  const { legGroup: rightLegGroup, lowerGroup: rightLowerLeg } = makeLeg(1);

  playerGroup.add(leftLegGroup);
  playerGroup.add(rightLegGroup);
  playerGroup.parts.leftLeg      = leftLegGroup;
  playerGroup.parts.rightLeg     = rightLegGroup;
  playerGroup.parts.leftLowerLeg  = leftLowerLeg;
  playerGroup.parts.rightLowerLeg = rightLowerLeg;

  return playerGroup;
}

export function cleanupPlayers() {
  const scene = window.scene;
  const physicsWorld = window.physicsWorld;
  if (!scene) return;

  // Helper to destroy an entity
  const destroyEntity = (mesh) => {
    if (!mesh) return;
    scene.remove(mesh);
    if (mesh.destroyFBX) {
      mesh.destroyFBX();
    }
    // FBX clones share cached geometry/material resources. Disposing a
    // clone here makes every player created afterwards render invisible.
    if (mesh.isFBX) return;
    mesh.traverse(node => {
      if (node.isMesh) {
        if (node.geometry) node.geometry.dispose();
        if (node.material) {
          const mats = Array.isArray(node.material) ? node.material : [node.material];
          mats.forEach(mat => mat.dispose());
        }
      }
    });
  };

  // 1. Clean up key player meshes
  destroyEntity(window.batsmanMesh);
  destroyEntity(window.bowlerMesh);
  destroyEntity(window.keeperMesh);
  destroyEntity(window.nonStrikerMesh);
  destroyEntity(window.umpireMain);
  destroyEntity(window.umpireSquareLeg);

  // Player recreation also recreates the ball and bat. Remove their old
  // physics bodies first so invisible duplicate balls cannot collide.
  if (physicsWorld) {
    if (window.ballBody) physicsWorld.removeBody(window.ballBody);
    if (window.batBody) physicsWorld.removeBody(window.batBody);
  }
  destroyEntity(window.ballMesh);

  window.batsmanMesh = null;
  window.bowlerMesh = null;
  window.keeperMesh = null;
  window.nonStrikerMesh = null;
  window.umpireMain = null;
  window.umpireSquareLeg = null;
  window.ballMesh = null;
  window.ballBody = null;
  window.batBody = null;

  // Clean up keeper radar dot from the circle
  const rc = document.getElementById('radar-circle');
  if (rc) {
    const keeperDots = rc.getElementsByClassName('keeper');
    while (keeperDots.length > 0) {
      keeperDots[0].remove();
    }
  }

  // 2. Clean up fielders
  if (window.fielders) {
    window.fielders.forEach(f => {
      destroyEntity(f.mesh);
      if (f.radarDot) {
        f.radarDot.remove();
      }
    });
    window.fielders = [];
  }
}
window.cleanupPlayers = cleanupPlayers;

export function createPlayers() {
  const THREE = window.THREE;
  const CANNON = window.CANNON;
  const scene = window.scene;
  const physicsWorld = window.physicsWorld;
  const BATSMAN_CREASE_Z = window.BATSMAN_CREASE_Z;

  // Cleanup existing players first to prevent overlaps and leaks
  cleanupPlayers();

  console.log("Current Global Scene Children Tree Array:", scene.children);

  // Read team selections from window.MATCH
  const userTeamVal = window.MATCH.userTeam || 'IND';
  const oppTeamVal = window.MATCH.oppTeam || 'AUS';
  const userTeam = window.TEAMS[userTeamVal] || window.TEAMS.IND;
  const oppTeam = window.TEAMS[oppTeamVal] || window.TEAMS.AUS;

  const battingTeam = window.MATCH.userIsBatting ? userTeam : oppTeam;
  const fieldingTeam = window.MATCH.userIsBatting ? oppTeam : userTeam;

  // 1. Striker Batsman — Batting Team Colors, Jersey #18
  let striker = null;
  let isStrikerFBX = false;
  if (window.FBXPlayers && window.FBXPlayers.isPreloaded) {
    striker = window.FBXPlayers.createFBXPlayer({ role: 'batsman' });
    if (striker) {
      isStrikerFBX = true;
      striker.scale.setScalar(0.015);
    }
  }
  if (!striker) {
    striker = createDetailedPlayer(
      true, 
      battingTeam.primary, 
      battingTeam.secondary, 
      battingTeam.pant, 
      battingTeam.helmet, 
      '#e0a96d', 
      '#1a1a1a', 
      battingTeam.secondary, 
      true, 
      '18'
    );
    striker.scale.set(1.5, 1.5, 1.5);
  }
  window.batsmanMesh = striker;
  window.batsmanMesh.isFBX = isStrikerFBX;
  window.batsmanMesh.position.set(window.stanceX, 0, BATSMAN_CREASE_Z);
  scene.add(window.batsmanMesh);
  window.batMesh = window.batsmanMesh.parts ? window.batsmanMesh.parts.batBlade : null;

  // 2. Bowler — Fielding Team Colors, Jersey #88
  let bowler = null;
  let isBowlerFBX = false;
  if (window.FBXPlayers && window.FBXPlayers.isPreloaded) {
    bowler = window.FBXPlayers.createFBXPlayer({ role: 'bowler' });
    if (bowler) {
      isBowlerFBX = true;
      bowler.scale.setScalar(0.014);
    }
  }
  if (!bowler) {
    bowler = createDetailedPlayer(
      false, 
      fieldingTeam.primary, 
      fieldingTeam.secondary, 
      fieldingTeam.pant, 
      fieldingTeam.helmet, 
      '#fed7aa', 
      '#3f2e1a', 
      fieldingTeam.secondary, 
      false, 
      '88'
    );
    bowler.scale.set(1.4, 1.4, 1.4);
  }
  window.bowlerMesh = bowler;
  window.bowlerMesh.isFBX = isBowlerFBX;
  window.bowlerMesh.position.set(0.6, 0, -23.2);
  scene.add(window.bowlerMesh);

  // 3. Wicketkeeper behind batsman stumps (Z = 2.8) — Fielding Team Colors, Jersey #7
  let keeper = null;
  let isKeeperFBX = false;
  if (window.FBXPlayers && window.FBXPlayers.isPreloaded) {
    keeper = window.FBXPlayers.createFBXPlayer({ role: 'keeper' });
    if (keeper) {
      isKeeperFBX = true;
      keeper.scale.setScalar(0.014);
    }
  }
  if (!keeper) {
    keeper = createDetailedPlayer(
      false, 
      fieldingTeam.primary, 
      fieldingTeam.secondary, 
      fieldingTeam.pant, 
      fieldingTeam.helmet, 
      '#fed7aa', 
      '#3f2e1a', 
      fieldingTeam.secondary, 
      true, 
      '7'
    );
    keeper.scale.set(1.4, 1.4, 1.4);
  }
  window.keeperMesh = keeper;
  window.keeperMesh.isFBX = isKeeperFBX;
  window.keeperMesh.position.set(0, 0, 3.8);
  window.keeperMesh.rotation.set(0, Math.PI, 0); // Face the stumps
  scene.add(window.keeperMesh);

  // Wicketkeeper radar dot
  const keeperDot = document.createElement('div');
  keeperDot.className = 'radar-dot keeper';
  const rc = document.getElementById('radar-circle');
  if (rc) rc.appendChild(keeperDot);
  window.keeperMesh.radarDot = keeperDot;

  // 4. Non-striker batsman at bowler end crease (Z = -21.2) — Batting Team Colors, Jersey #45
  let nonStriker = null;
  let isNonStrikerFBX = false;
  if (window.FBXPlayers && window.FBXPlayers.isPreloaded) {
    nonStriker = window.FBXPlayers.createFBXPlayer({ role: 'nonStriker' });
    if (nonStriker) {
      isNonStrikerFBX = true;
      nonStriker.scale.setScalar(0.015);
    }
  }
  if (!nonStriker) {
    nonStriker = createDetailedPlayer(
      true, 
      battingTeam.primary, 
      battingTeam.secondary, 
      battingTeam.pant, 
      battingTeam.helmet, 
      '#e0a96d', 
      '#1a1a1a', 
      battingTeam.secondary, 
      true, 
      '45'
    );
    nonStriker.scale.set(1.5, 1.5, 1.5);
  }
  window.nonStrikerMesh = nonStriker;
  window.nonStrikerMesh.isFBX = isNonStrikerFBX;
  window.nonStrikerMesh.position.set(-1.2, 0, -21.2);
  window.nonStrikerMesh.rotation.set(0, 0, 0);
  scene.add(window.nonStrikerMesh);

  // 5. Main bowler-end Umpire (behind bowler stumps)
  let umpire1 = null;
  let isUmpire1FBX = false;
  if (window.FBXPlayers && window.FBXPlayers.isPreloaded) {
    umpire1 = window.FBXPlayers.createFBXPlayer({ role: 'umpire' });
    if (umpire1) {
      isUmpire1FBX = true;
      umpire1.scale.setScalar(0.014);
    }
  }
  if (!umpire1) {
    umpire1 = createDetailedPlayer(false, '#f8fafc', '#111827', '#111827', '#111827', '#fed7aa', '#1a1a1a');
    umpire1.scale.set(1.4, 1.4, 1.4);
  }
  window.umpireMain = umpire1;
  window.umpireMain.isFBX = isUmpire1FBX;
  window.umpireMain.position.set(0, 0, -23.8);
  scene.add(window.umpireMain);

  // 6. Square leg Umpire (to the side)
  let umpire2 = null;
  let isUmpire2FBX = false;
  if (window.FBXPlayers && window.FBXPlayers.isPreloaded) {
    umpire2 = window.FBXPlayers.createFBXPlayer({ role: 'umpire' });
    if (umpire2) {
      isUmpire2FBX = true;
      umpire2.scale.setScalar(0.014);
    }
  }
  if (!umpire2) {
    umpire2 = createDetailedPlayer(false, '#f8fafc', '#111827', '#111827', '#111827', '#fed7aa', '#1a1a1a');
    umpire2.scale.set(1.4, 1.4, 1.4);
  }
  window.umpireSquareLeg = umpire2;
  window.umpireSquareLeg.isFBX = isUmpire2FBX;
  window.umpireSquareLeg.position.set(16.0, 0, 0.0);
  window.umpireSquareLeg.rotation.set(0, -Math.PI / 2, 0);
  scene.add(window.umpireSquareLeg);

  // Ball
  const ballR = 0.045;
  window.ballMesh = new THREE.Mesh(
    new THREE.SphereGeometry(ballR, 16, 16),
    new THREE.MeshStandardMaterial({ color: '#ff1111', roughness: 0.25, metalness: 0.15, emissive: '#3a0202' })
  );
  window.ballMesh.castShadow = true;
  scene.add(window.ballMesh);

  // Ball seam detail
  const seamMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.8 });
  const seam1 = new THREE.Mesh(new THREE.TorusGeometry(ballR + 0.002, 0.003, 6, 32), seamMat);
  window.ballMesh.add(seam1);
  const seam2 = new THREE.Mesh(new THREE.TorusGeometry(ballR + 0.002, 0.003, 6, 32), seamMat);
  seam2.rotation.y = Math.PI / 2;
  window.ballMesh.add(seam2);

  // Physics ball
  window.ballBody = new CANNON.Body({ mass: 0.16, linearDamping: 0.02, angularDamping: 0.05 });
  window.ballBody.addShape(new CANNON.Sphere(ballR));
  window.ballBody.position.set(0.8, 1.8, -23.2);
  physicsWorld.addBody(window.ballBody);

window.ballBody.addEventListener('collide', (e) => {
     // Bounce detection for boundary/fielding logic is handled in fielders.js.
     // Intentionally minimal to avoid console spam during physics ticks.
   });

  // Bat physics body
  window.batBody = new CANNON.Body({ mass: 0, type: CANNON.Body.KINEMATIC });
  window.batBody.addShape(new CANNON.Box(new CANNON.Vec3(0.06 * 1.5, 0.45 * 1.5, 0.04 * 1.5)));
  physicsWorld.addBody(window.batBody);

  // ── FIELDERS ──────────────────────────────────────────────────
  const skinTones  = ['#fed7aa','#e0a96d','#c38e55','#a76d43','#8a5229','#ffedd5','#fcd34d'];
  const hairColors = ['#1a1a1a','#2d1a0e','#3f2e1a','#5c3e21','#1f2937','#b45309'];

  const placements = [
    { name: 'Slip',        angle: -Math.PI * 0.15, dist: 6.5 },
    { name: 'Third Man',   angle: -Math.PI * 0.28, dist: 42 },
    { name: 'Deep Point',  angle: -Math.PI * 0.5,  dist: 35 },
    { name: 'Cover',       angle: -Math.PI * 0.35, dist: 20 },
    { name: 'Long Off',    angle: -Math.PI * 0.88, dist: 42 },
    { name: 'Long On',     angle:  Math.PI * 0.88, dist: 42 },
    { name: 'Mid Wicket',  angle:  Math.PI * 0.35, dist: 20 },
    { name: 'Square Leg',  angle:  Math.PI * 0.5,  dist: 20 },
    { name: 'Fine Leg',    angle:  Math.PI * 0.28, dist: 42 }
  ];

  window.fielders = [];
  placements.forEach((pl, idx) => {
    const fx = Math.sin(pl.angle) * pl.dist;
    const fz = Math.cos(pl.angle) * pl.dist - 10.0;

    let f = null;
    let isFBX = false;
    if (window.FBXPlayers && window.FBXPlayers.isPreloaded) {
      f = window.FBXPlayers.createFBXPlayer({ role: 'fielder' });
      if (f) {
        isFBX = true;
        f.scale.setScalar(0.014);
      }
    }

    if (!f) {
      f = createDetailedPlayer(
        false, 
        fieldingTeam.primary, 
        fieldingTeam.secondary, 
        fieldingTeam.pant, 
        fieldingTeam.helmet,
        skinTones[idx % skinTones.length], 
        hairColors[idx % hairColors.length],
        fieldingTeam.secondary,
        false,
        (idx + 10).toString()
      );
      f.scale.set(1.4, 1.4, 1.4);
    }

    f.position.set(fx, 0, fz);
    f.rotation.set(0, Math.atan2(-fx, -10 - fz), 0);
    scene.add(f);

    const dot = document.createElement('div');
    dot.className = 'radar-dot fielder';
    const rc = document.getElementById('radar-circle');
    if (rc) rc.appendChild(dot);

    window.fielders.push({
      mesh: f,
      isFBX,
      startPos:     new THREE.Vector3(fx, 0, fz),
      homePosition: new THREE.Vector3(fx, 0, fz),
      pos:          new THREE.Vector3(fx, 0, fz),
      vel:          new THREE.Vector3(0, 0, 0),
      targetPos:    new THREE.Vector3(fx, 0, fz),
      speed: 7.2,
      radarDot: dot,
      state: 'idle',
      walkCycle: 0,
      idleOffset: Math.random() * Math.PI * 2,
      collectTimer: 0,
      throwTimer: 0,
      isClosest: false
    });
  });
}

// ── MATCH TROPHY ─────────────────────────────────────────────────────────────
export function cleanupMatchTrophy() {
  const trophy = window.matchTrophy;
  if (!trophy) return;
  if (window.scene) window.scene.remove(trophy);
  trophy.traverse(node => {
    if (!node.isMesh) return;
    if (node.geometry) node.geometry.dispose();
    const mats = Array.isArray(node.material) ? node.material : [node.material];
    mats.filter(Boolean).forEach(mat => mat.dispose());
  });
  window.matchTrophy = null;
}

export function showMatchTrophy() {
  cleanupMatchTrophy();
  if (!window.THREE || !window.THREE.GLTFLoader || !window.scene) return;

  new window.THREE.GLTFLoader().load(
    'models/trophy/icc_cricket_world_cup.glb',
    gltf => {
      const trophy = gltf.scene;
      const box = new window.THREE.Box3().setFromObject(trophy);
      const size = new window.THREE.Vector3();
      const center = new window.THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);
      const fit = 1.35 / Math.max(size.y, 0.001);
      trophy.scale.setScalar(fit);
      trophy.position.sub(center.multiplyScalar(fit));

      const holder = new window.THREE.Group();
      holder.add(trophy);
      holder.userData.spin = 0;
      window.matchTrophy = holder;
      window.scene.add(holder);
    },
    undefined,
    err => console.warn('[Trophy] Model failed to load:', err)
  );
}

export function updateMatchTrophy(dt) {
  const holder = window.matchTrophy;
  const camera = window.camera;
  if (!holder || !camera) return;
  holder.userData.spin = (holder.userData.spin || 0) + dt * 0.7;
  const offset = new window.THREE.Vector3(2.2, -0.25, -4.2).applyQuaternion(camera.quaternion);
  holder.position.copy(camera.position).add(offset);
  holder.quaternion.copy(camera.quaternion);
  holder.rotateY(holder.userData.spin);
}

window.createStadium = createStadium;
window.createPitch   = createPitch;
window.createWickets = createWickets;
window.createPlayers = createPlayers;
window.showMatchTrophy = showMatchTrophy;
window.cleanupMatchTrophy = cleanupMatchTrophy;
window.updateMatchTrophy = updateMatchTrophy;
