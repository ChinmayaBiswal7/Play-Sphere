/**
 * Football Pro 2026 - Human Player Agent Class & Mesh Builder Module
 */

import { gameState, TEAMS, TEAM_DATA } from './state.js';
import { AudioSynth } from './audio.js';
import { spawnGrassPuff } from './stadium.js';

export function createJerseyTexture(colorHex, number, isGoalkeeper = false) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  
  // Base jersey color
  ctx.fillStyle = colorHex;
  ctx.fillRect(0, 0, 128, 128);
  
  if (isGoalkeeper) {
    // Goalkeeper styling stripes
    ctx.fillStyle = '#06b6d4';
    ctx.fillRect(0, 0, 128, 26);
    ctx.fillRect(0, 70, 128, 14);
  } else {
    // Stripe detail
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.fillRect(48, 0, 32, 128);
  }

  // Draw player numbers
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Back number
  ctx.font = '900 52px "Orbitron", sans-serif';
  ctx.fillText(number.toString(), 96, 64);
  
  // Front number
  ctx.font = '900 20px "Orbitron", sans-serif';
  ctx.fillText(number.toString(), 32, 45);

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

export class PlayerAgent {
  constructor(team, number, initialPos, isGoalkeeper = false) {
    this.team = team;
    this.number = number;
    this.isGoalkeeper = isGoalkeeper;
    
    this.speed = 11.5; 
    this.sprintSpeed = 18.5;
    this.tackleCooldown = 0;
    this.isTackling = false;
    this.tackleTime = 0;
    this.kickCooldown = 0;
    
    // Stamina System
    this.stamina = 100;
    this.maxStamina = 100;
    this.staminaRecovery = 6.0;
    this.staminaDrainSprint = 15.0;
    this.staminaDrainDribble = 5.0;
    this.staminaDrainTackle = 10.0;
    
    // States
    this.isDribbling = false;
    this.isStumbling = false;
    this.stumbleTime = 0;
    this.stumbleDuration = 0.8;
    this.isHoldingBall = false;
    this.holdBallTime = 0;
    this.yellowCards = 0;
    this.isRedCarded = false;
    this.isFallen = false;
    this.fallTime = 0;
    
    this.velocity = new THREE.Vector3();
    this.facingDir = new THREE.Vector3(0, 0, 1);
    this.animTime = 0;

    // Root Group
    this.group = new THREE.Group();
    
    // Read Team colors
    let baseColorHex = "#1e293b";
    let secColorVal = 0xfacc15;
    if (team !== 'referee') {
      const teamCfg = team === TEAMS.RED ? TEAM_DATA[gameState.userTeamName] : TEAM_DATA[gameState.oppTeamName];
      baseColorHex = isGoalkeeper ? "#10b981" : teamCfg.colorHex;
      secColorVal = isGoalkeeper ? 0x064e3b : teamCfg.secondary;
    }

    // Materials
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xffdbac, roughness: 0.6 });
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x271708, roughness: 0.9 });
    const socksPantsMat = new THREE.MeshStandardMaterial({ color: secColorVal, roughness: 0.5 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.3 });

    // 1. Torso Jersey Texture
    const jerseyTex = createJerseyTexture(baseColorHex, this.number, this.isGoalkeeper);
    const bodyMat = new THREE.MeshStandardMaterial({ map: jerseyTex, roughness: 0.4 });
    this.torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.52, 1.1, 8, 16), bodyMat);
    this.torso.position.y = 1.6;
    this.torso.castShadow = true;
    this.torso.receiveShadow = true;
    this.group.add(this.torso);

    // 2. Shorts Pants
    this.shorts = new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.54, 0.42, 16), socksPantsMat);
    this.shorts.position.y = 1.02;
    this.shorts.castShadow = true;
    this.group.add(this.shorts);

    // 3. Head & Hair
    this.head = new THREE.Mesh(new THREE.SphereGeometry(0.38, 16, 16), skinMat);
    this.head.position.y = 2.42;
    this.head.castShadow = true;
    this.group.add(this.head);

    // Hair
    const hairGeo = new THREE.SphereGeometry(0.39, 12, 12, 0, Math.PI*2, 0, Math.PI/2);
    this.hair = new THREE.Mesh(hairGeo, hairMat);
    this.hair.position.y = 2.46;
    this.hair.rotation.x = -0.1;
    this.hair.castShadow = true;
    this.group.add(this.hair);

    // 4. Arms & Hands
    const armGeo = new THREE.CapsuleGeometry(0.13, 0.8, 6, 12);
    
    this.leftArm = new THREE.Group();
    const lArmMesh = new THREE.Mesh(armGeo, bodyMat);
    lArmMesh.position.y = -0.4;
    lArmMesh.castShadow = true;
    const lHand = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), skinMat);
    lHand.position.y = -0.85;
    this.leftArm.add(lArmMesh, lHand);
    this.leftArm.position.set(-0.65, 2.0, 0);
    this.group.add(this.leftArm);

    this.rightArm = new THREE.Group();
    const rArmMesh = new THREE.Mesh(armGeo, bodyMat);
    rArmMesh.position.y = -0.4;
    rArmMesh.castShadow = true;
    const rHand = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), skinMat);
    rHand.position.y = -0.85;
    this.rightArm.add(rArmMesh, rHand);
    this.rightArm.position.set(0.65, 2.0, 0);
    this.group.add(this.rightArm);

    // 5. Legs
    const buildLeg = (offset) => {
      const legGroup = new THREE.Group();
      
      const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.45, 6, 12), socksPantsMat);
      thigh.position.y = -0.2;
      thigh.castShadow = true;
      legGroup.add(thigh);
      
      const calf = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.45, 6, 12), whiteMat);
      calf.position.y = -0.55;
      calf.castShadow = true;
      legGroup.add(calf);

      const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.18, 0.38), shoeMat);
      shoe.position.set(0, -0.8, 0.08);
      shoe.castShadow = true;
      legGroup.add(shoe);

      legGroup.position.set(offset, 0.88, 0);
      return legGroup;
    };

    this.leftLeg = buildLeg(0.24);
    this.rightLeg = buildLeg(-0.24);
    this.group.add(this.leftLeg, this.rightLeg);

    // Active selector cone
    const chevronGeo = new THREE.ConeGeometry(0.28, 0.52, 4);
    const chevronMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    this.chevron = new THREE.Mesh(chevronGeo, chevronMat);
    this.chevron.rotation.x = Math.PI;
    this.chevron.position.set(0, 3.2, 0);
    this.chevron.visible = false;
    this.group.add(this.chevron);

    this.group.scale.set(0.58, 0.58, 0.58);
    this.group.position.copy(initialPos);
    gameState.scene.add(this.group);
  }

  update(dt, isUserControlled) {
    this.chevron.visible = isUserControlled;
    
    if (this.tackleCooldown > 0) this.tackleCooldown -= dt;
    if (this.kickCooldown > 0) this.kickCooldown -= dt;

    // Fallen flat animation (Fouled)
    if (this.isFallen) {
      this.fallTime -= dt;
      if (this.fallTime <= 0) {
        this.isFallen = false;
        this.fallTime = 0;
      }
      this.group.rotation.x = THREE.MathUtils.lerp(this.group.rotation.x, -Math.PI / 2.0, 0.12);
      this.torso.rotation.x = 0;
      this.torso.rotation.z = 0;
      this.leftLeg.rotation.x = 0;
      this.rightLeg.rotation.x = 0;
      this.leftArm.rotation.set(0, 0, 0.1);
      this.rightArm.rotation.set(0, 0, -0.1);
      return;
    } else {
      this.group.rotation.x = 0;
    }

    // Stumble balance loss state
    if (this.isStumbling) {
      this.stumbleTime -= dt;
      if (this.stumbleTime <= 0) {
        this.isStumbling = false;
        this.stumbleTime = 0;
      }
      this.torso.rotation.z = 0.45;
      this.torso.rotation.x = 0.25;
      this.leftLeg.rotation.x = 0.6;
      this.rightLeg.rotation.x = -0.6;
      this.leftArm.rotation.x = 0.8;
      this.rightArm.rotation.x = -0.8;
      return;
    } else {
      this.torso.rotation.z = 0;
    }

    if (this.isTackling) {
      this.tackleTime += dt;
      if (this.tackleTime > 0.4) {
        this.isTackling = false;
        this.tackleTime = 0;
      }
      this.torso.rotation.z = Math.sin(this.tackleTime * Math.PI * 2) * 0.4;
      this.leftLeg.rotation.x = -1.2;
      this.rightLeg.rotation.x = -0.2;
      this.leftArm.rotation.x = -0.8;
      this.rightArm.rotation.x = 0.8;
      return; 
    }

    const speed = this.velocity.length();
    
    // Stamina calculation
    const isSprinting = speed > this.speed + 1.0;
    if (isSprinting) {
      this.stamina = Math.max(0, this.stamina - this.staminaDrainSprint * dt);
    } else if (this.isDribbling) {
      this.stamina = Math.max(0, this.stamina - this.staminaDrainDribble * dt);
    } else {
      this.stamina = Math.min(this.maxStamina, this.stamina + this.staminaRecovery * dt);
    }

    if (speed > 0.1) {
      this.animTime += speed * dt * 0.8;
      
      this.leftLeg.rotation.x = Math.sin(this.animTime) * 0.65;
      this.rightLeg.rotation.x = -Math.sin(this.animTime) * 0.65;
      
      this.leftArm.rotation.x = -Math.sin(this.animTime) * 0.5;
      this.rightArm.rotation.x = Math.sin(this.animTime) * 0.5;
      
      this.torso.rotation.x = 0.15;
    } else {
      this.animTime = 0;
      this.leftLeg.rotation.x = 0;
      this.rightLeg.rotation.x = 0;
      this.leftArm.rotation.x = 0.08;
      this.rightArm.rotation.x = -0.08;
      this.leftArm.rotation.z = 0.1;
      this.rightArm.rotation.z = -0.1;
      this.torso.rotation.x = 0;
    }
  }

  triggerTackle() {
    this.isTackling = true;
    this.tackleTime = 0;
    this.tackleCooldown = 1.8;
    this.stamina = Math.max(0, this.stamina - this.staminaDrainTackle);
    AudioSynth.playKick(); 
    spawnGrassPuff(this.group.position);
  }

  triggerStumble() {
    this.isStumbling = true;
    this.stumbleTime = this.stumbleDuration;
  }
}
