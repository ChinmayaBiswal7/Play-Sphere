/**
 * game-06b-ai-brains.js — 15 Individual AI Driver Brains & Sequential ECU Simulation
 * 
 * Provides:
 * 1. AIEngineECU: 8-speed sequential transmission, RPM calculation (4,000-13,000), 
 *    throttle/brake telemetry, ERS energy harvesting/deploy, and DRS actuator control.
 * 2. 15 Dedicated AI Driver Brains:
 *    - Max Verstappen: Hyper-aggressive, late braking, sharp apex attack, inside defense.
 *    - Lewis Hamilton: V-line late apex for maximum exit drive, DRS tow mastery, patient stalker.
 *    - Charles Leclerc: Blistering raw qualifying/apex pace, aggressive curb attack, high entry speed.
 *    - Fernando Alonso: Tactical mastermind, 1-move defense, cuts corner exits for slipstream.
 *    - Lando Norris: High minimum apex speed, smooth inputs, opportunistic slingshot passes.
 *    - Carlos Sainz: "Smooth Operator", methodical braking points, disciplined tire conservation.
 *    - Sergio Perez: "Minister of Defence", wide defensive positioning, excellent exit traction.
 *    - George Russell: Assertive straight-line passes, proactive DRS overtaking, bold corner entry.
 *    - Oscar Piastri: Calm, unflappable, clinical clean overtakes, disciplined lane holding.
 *    - Pierre Gasly: Tenacious midfield fighter, late on brakes, stubborn battles.
 *    - Esteban Ocon: Fierce defender, uncompromising inside line, refuses to yield easily.
 *    - Nico Hulkenberg: Precise braking points, consistent lap times, clean racing.
 *    - Kevin Magnussen: Ultra-aggressive wheel-to-wheel battles, bold defense.
 *    - Alex Albon: Late braking specialist, excellent exit speed, spirited defense.
 *    - Lance Stroll: Direct straight-line attacks, reactive defending.
 *    (Plus dynamic fallback profiles for Bottas, Tsunoda, Zhou, Sargeant, Ricciardo).
 * 3. Proactive Anti-Pileup Radar: Prevents multi-car pileups with safe following buffers,
 *    closing-speed detection, emergency braking, and 2-wide racing room.
 */

// ── 1. Sequential 8-Speed ECU Powertrain Simulation ─────────────────────────
class AIEngineECU {
  constructor(driverName) {
    this.driverName = driverName;
    this.gear = 1;
    this.rpm = 4200;
    this.throttle = 0.0;
    this.brake = 0.0;
    this.ersEnergy = 100.0; // 0 - 100%
    this.ersMode = "BALANCED"; // BALANCED, OVERTAKE, DEFEND, HARVEST
    this.ersPower = 0.15;
    this.drsOpen = false;
    this.shiftTimer = 0.0;
  }

  reset() {
    this.gear = 1;
    this.rpm = 4200;
    this.throttle = 0.0;
    this.brake = 0.0;
    this.ersEnergy = 100.0;
    this.ersMode = "BALANCED";
    this.ersPower = 0.15;
    this.drsOpen = false;
    this.shiftTimer = 0.0;
  }

  update(speed, targetSpeed, delta, canDRS, isEmergency) {
    // F1 8-Speed Gearbox Speed Windows (m/s)
    // 1st: 0-18 (0-65 km/h), 2nd: 18-28 (65-100 km/h), 3rd: 28-38 (100-137 km/h),
    // 4th: 38-48 (137-173 km/h), 5th: 48-59 (173-212 km/h), 6th: 59-71 (212-255 km/h),
    // 7th: 71-83 (255-300 km/h), 8th: 83+ (300-350+ km/h)
    const gearMins = [0, 0, 18, 28, 38, 48, 59, 71, 83];
    const gearMaxs = [0, 20, 31, 41, 51, 62, 74, 86, 115];

    let g = Math.max(1, Math.min(8, this.gear));
    const minS = gearMins[g];
    const maxS = gearMaxs[g];
    const fraction = Math.max(0.0, Math.min(1.0, (speed - minS) / Math.max(1.0, maxS - minS)));
    this.rpm = Math.floor(4500 + fraction * 8300); // 4500 to 12800 RPM

    // Automatic Sequential Shifting
    if (this.shiftTimer > 0) {
      this.shiftTimer -= delta;
    } else {
      if (this.rpm >= 12300 && g < 8) {
        this.gear = g + 1;
        this.shiftTimer = 0.06;
        this.rpm = 9400; // Drop revs on upshift
      } else if (this.rpm <= 6200 && g > 1 && speed < minS * 1.04) {
        this.gear = g - 1;
        this.shiftTimer = 0.06;
        this.rpm = 10600; // Blip revs on downshift
      }
    }

    // Throttle & Brake Modulation
    if (isEmergency) {
      this.throttle = 0.0;
      this.brake = 1.0;
    } else if (targetSpeed > speed + 0.5) {
      this.throttle = Math.min(1.0, this.throttle + delta * 6.0);
      this.brake = Math.max(0.0, this.brake - delta * 14.0);
    } else if (targetSpeed < speed - 1.2) {
      this.throttle = Math.max(0.0, this.throttle - delta * 10.0);
      const intensity = Math.min(1.0, (speed - targetSpeed) / 10.0);
      this.brake = Math.min(1.0, this.brake + delta * 8.0 * intensity);
    } else {
      this.throttle = THREE.MathUtils.lerp(this.throttle, 0.45, delta * 3.5);
      this.brake = 0.0;
    }

    // ERS Harvesting & Deployment
    if (this.brake > 0.15) {
      // MGU-K regenerative braking recharge
      this.ersEnergy = Math.min(100.0, this.ersEnergy + delta * 9.5 * this.brake);
      this.ersPower = 0.0;
    } else if (this.ersMode === "OVERTAKE" && this.ersEnergy > 2.0) {
      this.ersPower = 1.0;
      this.ersEnergy = Math.max(0.0, this.ersEnergy - delta * 5.0);
    } else if (this.ersMode === "DEFEND" && this.ersEnergy > 2.0) {
      this.ersPower = 0.75;
      this.ersEnergy = Math.max(0.0, this.ersEnergy - delta * 3.5);
    } else {
      this.ersPower = 0.18; // Balanced baseline hybrid boost
      if (this.throttle > 0.85 && this.ersEnergy > 5.0) {
        this.ersEnergy = Math.max(0.0, this.ersEnergy - delta * 1.2);
      }
    }

    // DRS Flap Deployment
    this.drsOpen = canDRS;
  }
}

// ── 2. Base AI Driver Brain ─────────────────────────────────────────────────
class AIDriverBrain {
  constructor(name, personality) {
    this.name = name;
    this.personality = personality || { speed: 0.85, aggr: 0.75, cons: 0.85, over: 0.80, def: 0.75, mistake: 0.10 };
    this.ecu = new AIEngineECU(name);

    // State Tracking
    this.overtakeState = "NONE"; // NONE, PLANNING, PULL_OUT, DRAFTING
    this.overtakeSide = 0; // -1 (left), 1 (right)
    this.overtakeTimer = 0.0;

    this.defendState = "NONE"; // NONE, COVER_INSIDE, BREAK_TOW
    this.defendSide = 0;
    this.defendTimer = 0.0;

    this.mistakeTimer = 0.0;
    this.mistakeOffset = 0.0;

    // Driver Unique Racing Line Preferences
    this.lineBias = 0.0; // Lateral preference (-1.5 to +1.5m)
    this.apexAggression = 1.0; // Sharpness of corner turn-in
    this.brakingBuffer = 0.0; // Offset on braking points
    this.followDistance = 6.5; // Safe following buffer in meters
  }

  reset() {
    this.ecu.reset();
    this.overtakeState = "NONE";
    this.overtakeSide = 0;
    this.overtakeTimer = 0.0;
    this.defendState = "NONE";
    this.defendSide = 0;
    this.defendTimer = 0.0;
    this.mistakeTimer = 0.0;
    this.mistakeOffset = 0.0;
  }

  // ── Proactive Radar: Anti-Pileup & Spatial Traffic Awareness ──
  scanTraffic(racer, racers, trackCurve) {
    let closestAhead = null;
    let minGapAhead = Infinity;
    let closestBehind = null;
    let minGapBehind = Infinity;
    let alongsideLeft = false;
    let alongsideRight = false;

    const myProgress = (racer.completedLaps || 0) + (racer.currentOffset || 0.0);
    const myPos = racer.mesh ? racer.mesh.position : null;

    for (let i = 0; i < racers.length; i++) {
      const other = racers[i];
      if (other === racer) continue;
      if (!other.mesh || !other.mesh.visible) continue;
      if (other.isTrackActive === false || other.qualifyingState === "GARAGE") continue;

      // Both on track or both in pit (pit isolation)
      const myInPit = racer.inPitLane || racer.isPitting;
      const otherInPit = other.inPitLane || other.isPitting;
      if (myInPit !== otherInPit) continue;

      // Longitudinal gap along circuit (handling lap wraparound properly within [-0.5, 0.5])
      let diff = (other.currentOffset || 0.0) - (racer.currentOffset || 0.0);
      while (diff > 0.5) diff -= 1.0;
      while (diff < -0.5) diff += 1.0;
      const tLen = (typeof trackCurve !== 'undefined' && trackCurve) ? trackCurve.getLength() : 5280.0;
      const gapMeters = diff * tLen;

      // Detect Car Ahead (forward cone up to 55m)
      if (gapMeters > 0.0 && gapMeters < 55.0) {
        if (gapMeters < minGapAhead) {
          minGapAhead = gapMeters;
          closestAhead = other;
        }
      }

      // Detect Car Behind (rear cone up to 35m)
      if (gapMeters < 0.0 && Math.abs(gapMeters) < 35.0) {
        if (Math.abs(gapMeters) < minGapBehind) {
          minGapBehind = Math.abs(gapMeters);
          closestBehind = other;
        }
      }

      // Detect Side-by-Side Traffic (Longitudinal < 5.0m, Lateral < 3.4m)
      if (Math.abs(gapMeters) < 5.0) {
        const sideDiff = other.sideOffset - racer.sideOffset;
        if (sideDiff < -0.8 && sideDiff > -3.4) {
          alongsideLeft = true;
        } else if (sideDiff > 0.8 && sideDiff < 3.4) {
          alongsideRight = true;
        }
      }
    }

    return {
      closestAhead,
      gapAhead: minGapAhead,
      closestBehind,
      gapBehind: minGapBehind,
      alongsideLeft,
      alongsideRight
    };
  }

  // ── Core Update: Computes Target Speed, Offset, and ECU Inputs ──
  think(racer, racers, baseSpeed, upcomingCurvature, isStraightZone, delta, clockTime) {
    const radar = this.scanTraffic(racer, racers, null);
    let targetSpeed = baseSpeed * (0.94 + this.personality.speed * 0.12);
    let targetOffset = 0.0;
    let isEmergency = false;

    // 1. Unique Racing Line Calculation with Driver Bias
    let optimalLine = -upcomingCurvature * 135.0 * this.apexAggression;
    optimalLine = THREE.MathUtils.clamp(optimalLine, -5.2, 5.2);
    targetOffset = optimalLine + this.lineBias;

    // 2. Cornering Deceleration vs Straightaway Top Speed (F1 High-Downforce Aero Model)
    const absCurvature = Math.abs(upcomingCurvature);
    if (absCurvature > 0.035) {
      // Modern high-downforce F1 cornering limits:
      // Gentle sweepers (c ~ 0.06): ~310 km/h (86 m/s)
      // Medium bends (c ~ 0.15): ~260 km/h (72 m/s)
      // Chicanes (c ~ 0.30): ~130 km/h (36 m/s)
      // Tight technical hairpins (Fairmont/Rascasse c > 0.35): ~50-65 km/h (14-18 m/s)
      const minCornerSpeed = (absCurvature > 0.35) ? 14.5 : 34.0;
      const cornerLimit = Math.max(minCornerSpeed, targetSpeed - (absCurvature - 0.035) * 145.0);
      targetSpeed = Math.min(targetSpeed, cornerLimit * (0.97 + this.personality.cons * 0.06));
    }

    // 3. Straightaway DRS Boost
    const canDRS = isStraightZone && (radar.closestAhead && radar.gapAhead < 35.0);
    if (isStraightZone) {
      if (canDRS) {
        targetSpeed += 8.5; // DRS straightaway top-end advantage
      } else {
        targetSpeed += 4.5;
      }
    }

    // 4. Proactive Collision Avoidance & Safe Following Regulation
    if (radar.closestAhead) {
      const leader = radar.closestAhead;
      const gap = radar.gapAhead;
      const closingSpeed = racer.speed - leader.speed;
      const latDiff = Math.abs(racer.sideOffset - leader.sideOffset);

      // A. Emergency Rear-End Prevention Zone (< 5.5m & Same Corridor)
      if (gap < 5.5 && latDiff < 2.0 && closingSpeed > -1.0) {
        isEmergency = true;
        targetSpeed = Math.min(targetSpeed, leader.speed * 0.85);
        // Evade sideways to clear space
        if (!radar.alongsideLeft && racer.sideOffset > -6.5) {
          targetOffset = leader.sideOffset - 3.2;
        } else if (!radar.alongsideRight && racer.sideOffset < 6.5) {
          targetOffset = leader.sideOffset + 3.2;
        }
      }
      // B. Following & Speed Matching Zone (5.5m - 14.0m)
      else if (gap < 14.0 && latDiff < 2.2) {
        if (closingSpeed > 0.5) {
          // Smoothly match leader speed to maintain healthy racing gap
          const targetGap = this.followDistance;
          if (gap < targetGap) {
            targetSpeed = Math.min(targetSpeed, leader.speed * 0.96);
          } else {
            targetSpeed = Math.min(targetSpeed, leader.speed * 1.01);
          }
        }
      }

      // C. Tactical Overtaking (Attack when within 32m on straights or corner exits)
      const attackRange = 32.0 * (0.8 + this.personality.aggr * 0.4);
      if (gap < attackRange && !isEmergency && Math.abs(closingSpeed) >= -2.0) {
        if (this.overtakeTimer <= 0.0) {
          // Check left & right corridors
          const leftTarget = leader.sideOffset - 3.2;
          const rightTarget = leader.sideOffset + 3.2;
          const leftClear = !radar.alongsideLeft && leftTarget >= -7.2;
          const rightClear = !radar.alongsideRight && rightTarget <= 7.2;

          let chosenSide = 0;
          if (leftClear && rightClear) {
            // Pick inside of upcoming corner, or side with more track width
            if (absCurvature > 0.002) {
              chosenSide = (upcomingCurvature > 0) ? -1 : 1;
            } else {
              chosenSide = (leader.sideOffset >= 0) ? -1 : 1;
            }
          } else if (leftClear) {
            chosenSide = -1;
          } else if (rightClear) {
            chosenSide = 1;
          }

          if (chosenSide !== 0) {
            this.overtakeState = "PULL_OUT";
            this.overtakeSide = chosenSide;
            this.overtakeTimer = 1.6 + this.personality.aggr * 1.0;
            this.ecu.ersMode = "OVERTAKE"; // Deploy full ERS boost!
          }
        } else {
          this.overtakeTimer -= delta;
          if (this.overtakeTimer <= 0.0) {
            this.overtakeState = "NONE";
            this.ecu.ersMode = "BALANCED";
          }
        }

        if (this.overtakeState === "PULL_OUT") {
          targetOffset = leader.sideOffset + this.overtakeSide * 3.4;
          targetSpeed += 3.5; // Attacking acceleration push
        }
      }
    }

    // 5. Authentic FIA Article 33.4 Defensive Racecraft
    if (radar.closestBehind && radar.gapBehind < 26.0 && this.overtakeState === "NONE") {
      const pursuer = radar.closestBehind;
      if (this.defendTimer <= 0.0) {
        // FIA: Exactly 1 decisive move to cover the line
        if (absCurvature > 0.003) {
          // Defend inside apex of upcoming turn
          this.defendSide = (upcomingCurvature > 0) ? -1 : 1;
          this.defendTimer = 1.4;
          this.defendState = "COVER_INSIDE";
        } else {
          // Straight: cover the attacker's lane to break slipstream tow
          const sideDiff = pursuer.sideOffset - racer.sideOffset;
          this.defendSide = (sideDiff >= 0) ? 1 : -1;
          this.defendTimer = 1.1 + this.personality.def * 0.6;
          this.defendState = "BREAK_TOW";
        }

        // Deploy ERS to defend track position
        if (radar.gapBehind < 18.0) {
          this.ecu.ersMode = "DEFEND";
        }
      } else {
        this.defendTimer -= delta;
        if (this.defendTimer <= 0.0) {
          this.defendState = "NONE";
          this.ecu.ersMode = "BALANCED";
        }
      }

      if (this.defendState !== "NONE") {
        targetOffset += this.defendSide * (2.8 * this.personality.def);
      }
    }

    // 6. 2-Wide Racing Room Rule: Always leave 1 car width (> 2.4m) for cars alongside
    if (radar.alongsideLeft && targetOffset < -3.8) {
      targetOffset = -3.8; // Don't squeeze cars on left off track
    }
    if (radar.alongsideRight && targetOffset > 3.8) {
      targetOffset = 3.8; // Don't squeeze cars on right off track
    }

    // 7. Human-like Driver Mistakes (Occasional lockup / wide line under pressure)
    if (this.mistakeTimer <= 0.0) {
      if (radar.closestBehind && radar.gapBehind < 12.0 && Math.random() < (this.personality.mistake * delta * 0.15)) {
        this.mistakeOffset = (Math.random() < 0.5 ? -1 : 1) * (1.2 + Math.random() * 1.5);
        this.mistakeTimer = 1.5;
      }
    } else {
      this.mistakeTimer -= delta;
      targetOffset += this.mistakeOffset;
      if (this.mistakeTimer <= 0.0) this.mistakeOffset = 0.0;
    }

    // Clamp side offset to drivable track boundary
    targetOffset = THREE.MathUtils.clamp(targetOffset, -7.2, 7.2);

    // Update ECU
    this.ecu.update(racer.speed, targetSpeed, delta, canDRS, isEmergency);

    return {
      targetSpeed,
      targetOffset,
      isEmergency,
      gear: this.ecu.gear,
      rpm: this.ecu.rpm,
      throttle: this.ecu.throttle,
      brake: this.ecu.brake,
      ersPower: this.ecu.ersPower
    };
  }
}

// ── 3. 15 Dedicated Driver Brain Classes ────────────────────────────────────

// 1. Max Verstappen: Ruthless late braking, razor apex, fierce inside defense
class VerstappenBrain extends AIDriverBrain {
  constructor() {
    super("Max Verstappen", { speed: 0.98, aggr: 0.93, cons: 0.97, over: 0.97, def: 0.92, mistake: 0.03 });
    this.lineBias = -0.4; // Tight inside line
    this.apexAggression = 1.15;
    this.followDistance = 5.2; // Aggressive tailgating
  }
}

// 2. Sergio Perez: "Minister of Defence", tire preservation, wide defensive placement
class PerezBrain extends AIDriverBrain {
  constructor() {
    super("Sergio Perez", { speed: 0.88, aggr: 0.72, cons: 0.85, over: 0.80, def: 0.88, mistake: 0.10 });
    this.lineBias = 0.5;
    this.apexAggression = 0.92;
    this.followDistance = 6.8;
  }
}

// 3. Charles Leclerc: Blistering raw qualifying & apex speed, high entry commitment
class LeclercBrain extends AIDriverBrain {
  constructor() {
    super("Charles Leclerc", { speed: 0.94, aggr: 0.86, cons: 0.86, over: 0.89, def: 0.80, mistake: 0.12 });
    this.lineBias = 0.0;
    this.apexAggression = 1.12;
    this.followDistance = 5.6;
  }
}

// 4. Carlos Sainz: "Smooth Operator", methodical, tactical braking, disciplined racing
class SainzBrain extends AIDriverBrain {
  constructor() {
    super("Carlos Sainz", { speed: 0.90, aggr: 0.76, cons: 0.91, over: 0.84, def: 0.83, mistake: 0.08 });
    this.lineBias = 0.2;
    this.apexAggression = 0.96;
    this.followDistance = 6.4;
  }
}

// 5. Lewis Hamilton: Master of racecraft, V-line corner exit drive, DRS tow perfection
class HamiltonBrain extends AIDriverBrain {
  constructor() {
    super("Lewis Hamilton", { speed: 0.95, aggr: 0.82, cons: 0.95, over: 0.94, def: 0.89, mistake: 0.04 });
    this.lineBias = 0.3; // Wide entry, sharp exit V-line
    this.apexAggression = 1.05;
    this.followDistance = 5.8;
  }
}

// 6. George Russell: Bold straight-line overtakes, assertive corner entries
class RussellBrain extends AIDriverBrain {
  constructor() {
    super("George Russell", { speed: 0.91, aggr: 0.80, cons: 0.89, over: 0.88, def: 0.82, mistake: 0.07 });
    this.lineBias = -0.2;
    this.apexAggression = 1.04;
    this.followDistance = 6.0;
  }
}

// 7. Fernando Alonso: Master tactician, 1-move defense, cuts corner exits for slipstream
class AlonsoBrain extends AIDriverBrain {
  constructor() {
    super("Fernando Alonso", { speed: 0.92, aggr: 0.88, cons: 0.93, over: 0.93, def: 0.94, mistake: 0.05 });
    this.lineBias = -0.5; // Hugs inside to block passes
    this.apexAggression = 1.08;
    this.followDistance = 5.4;
  }
}

// 8. Lance Stroll: Direct straight-line attacks, reactive defending
class StrollBrain extends AIDriverBrain {
  constructor() {
    super("Lance Stroll", { speed: 0.82, aggr: 0.65, cons: 0.75, over: 0.70, def: 0.68, mistake: 0.17 });
    this.lineBias = 0.4;
    this.apexAggression = 0.88;
    this.followDistance = 7.2;
  }
}

// 9. Lando Norris: High minimum apex speed, smooth inputs, slingshot overtakes
class NorrisBrain extends AIDriverBrain {
  constructor() {
    super("Lando Norris", { speed: 0.93, aggr: 0.84, cons: 0.89, over: 0.90, def: 0.82, mistake: 0.07 });
    this.lineBias = -0.1;
    this.apexAggression = 1.06;
    this.followDistance = 5.7;
  }
}

// 10. Oscar Piastri: Calm, unflappable, clinical clean passes, disciplined lane holding
class PiastriBrain extends AIDriverBrain {
  constructor() {
    super("Oscar Piastri", { speed: 0.89, aggr: 0.74, cons: 0.86, over: 0.84, def: 0.77, mistake: 0.09 });
    this.lineBias = 0.1;
    this.apexAggression = 0.98;
    this.followDistance = 6.2;
  }
}

// 11. Pierre Gasly: Hard midfield racer, late on brakes, stubborn battles
class GaslyBrain extends AIDriverBrain {
  constructor() {
    super("Pierre Gasly", { speed: 0.85, aggr: 0.80, cons: 0.82, over: 0.81, def: 0.78, mistake: 0.12 });
    this.lineBias = -0.3;
    this.apexAggression = 1.02;
    this.followDistance = 6.1;
  }
}

// 12. Esteban Ocon: Fierce defender, uncompromising inside line, refuses to yield
class OconBrain extends AIDriverBrain {
  constructor() {
    super("Esteban Ocon", { speed: 0.84, aggr: 0.78, cons: 0.81, over: 0.78, def: 0.84, mistake: 0.13 });
    this.lineBias = -0.4;
    this.apexAggression = 0.99;
    this.followDistance = 6.2;
  }
}

// 13. Nico Hulkenberg: Precise braking points, consistent lap times, clean racing
class HulkenbergBrain extends AIDriverBrain {
  constructor() {
    super("Nico Hulkenberg", { speed: 0.83, aggr: 0.72, cons: 0.83, over: 0.77, def: 0.74, mistake: 0.11 });
    this.lineBias = 0.0;
    this.apexAggression = 0.95;
    this.followDistance = 6.5;
  }
}

// 14. Kevin Magnussen: Ultra-aggressive wheel-to-wheel battles, bold defense
class MagnussenBrain extends AIDriverBrain {
  constructor() {
    super("Kevin Magnussen", { speed: 0.81, aggr: 0.90, cons: 0.75, over: 0.78, def: 0.86, mistake: 0.17 });
    this.lineBias = 0.4;
    this.apexAggression = 1.06;
    this.followDistance = 5.5;
  }
}

// 15. Alex Albon: Late braking specialist, excellent exit speed, spirited defense
class AlbonBrain extends AIDriverBrain {
  constructor() {
    super("Alex Albon", { speed: 0.86, aggr: 0.75, cons: 0.84, over: 0.83, def: 0.76, mistake: 0.10 });
    this.lineBias = -0.2;
    this.apexAggression = 1.01;
    this.followDistance = 6.3;
  }
}

// ── 4. AI Brain Manager: Dispatches & Manages 15 Dedicated Driver Brains ────
const BRAIN_REGISTRY = {
  "Max Verstappen":   VerstappenBrain,
  "Sergio Perez":     PerezBrain,
  "Charles Leclerc":  LeclercBrain,
  "Carlos Sainz":     SainzBrain,
  "Lewis Hamilton":   HamiltonBrain,
  "George Russell":   RussellBrain,
  "Fernando Alonso":  AlonsoBrain,
  "Lance Stroll":     StrollBrain,
  "Lando Norris":     NorrisBrain,
  "Oscar Piastri":    PiastriBrain,
  "Pierre Gasly":     GaslyBrain,
  "Esteban Ocon":     OconBrain,
  "Nico Hulkenberg":  HulkenbergBrain,
  "Kevin Magnussen":  MagnussenBrain,
  "Alex Albon":       AlbonBrain,
};

window.AIBrainManager = {
  driverBrains: new Map(),

  getBrainForRacer(racer) {
    if (!racer || racer.isPlayer) return null;
    const name = racer.name || "AI Racer";
    if (this.driverBrains.has(name)) {
      return this.driverBrains.get(name);
    }

    const BrainClass = BRAIN_REGISTRY[name];
    let brain;
    if (BrainClass) {
      brain = new BrainClass();
    } else {
      const personality = (window.AI_PERSONALITIES && window.AI_PERSONALITIES[name]) || {
        speed: 0.82, aggr: 0.72, cons: 0.80, over: 0.76, def: 0.72, mistake: 0.13
      };
      brain = new AIDriverBrain(name, personality);
    }

    this.driverBrains.set(name, brain);
    return brain;
  },

  resetAll() {
    this.driverBrains.forEach(brain => brain.reset());
  }
};
