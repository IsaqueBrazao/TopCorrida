import {
  TrackConfig,
  BikeConfig,
  CombatRacer,
  RoadSegment,
  GameControls,
  ResolutionMode,
} from './types';
import {
  SEGMENT_LENGTH,
  ROAD_WIDTH,
  DRAW_DISTANCE,
  CAMERA_HEIGHT,
  CAMERA_DEPTH,
  CAMERA_OFFSET_Z,
  buildRoad,
  project,
  projectPoint,
  drawPolygon,
  renderSegment,
  renderSprite,
  renderRacerSprite,
  renderPlayerBike,
  renderBackground,
} from './pseudo3d';
import { RIVAL_NAMES, RIVAL_COLORS } from './game-data';
import { audio } from './audio';

export interface CombatHitEffect {
  x: number;
  y: number;
  text: string;
  color: string;
  timer: number;
}

export class RoadkillGameEngine {
  public track: TrackConfig;
  public bike: BikeConfig;
  public segments: RoadSegment[] = [];

  // Player State
  public playerX: number = 0;       // -1 to 1 on road
  public playerZ: number = 0;       // distance along track
  public speed: number = 0;         // current speed
  public maxSpeed: number = 220;
  public accel: number = 60;
  public handling: number = 75;
  public playerHp: number = 100;
  public playerMaxHp: number = 100;
  public nitro: number = 100;        // 0 to 100%
  public nitroBurstTimer: number = 0; // Sustained nitro hyper-boost timer in seconds
  public nitroRechargeCooldown: number = 0; // Cooldown delay in seconds after use before recharge begins
  public isSuperNitro: boolean = false; // Fired at 100% nitro for ultra speed
  public currentSteer: number = 0;    // -1 for left, 1 for right, 0 for straight
  public isBoosting: boolean = false;
  public isWipedOut: boolean = false;
  public wipeoutTimer: number = 0;
  public isAttacking: 'LEFT' | 'RIGHT' | null = null;
  public attackType: 'PUNCH' | 'KICK' | 'WEAPON' = 'PUNCH';
  public attackCooldown: number = 0;

  // Race progress
  public currentLap: number = 1;
  public totalLaps: number = 2;
  public raceTime: number = 0;
  public bestLapTime: number = 0;
  public currentLapTime: number = 0;
  public raceFinished: boolean = false;
  public finishRank: number = 1;
  public knockdowns: number = 0;

  // AI Rivals
  public rivals: CombatRacer[] = [];

  // Effects & Screen shake
  public hitEffects: CombatHitEffect[] = [];
  public screenShake: number = 0;

  // Multi-layer parallax background offsets
  public bgSkyOffset: number = 0;
  public bgDistantOffset: number = 0;
  public bgMidOffset: number = 0;
  public bgNearOffset: number = 0;
  public lastObstacleHitSeg: number = -1;

  // Resolution mode
  public resolutionMode: ResolutionMode = 'ARCADE_256';

  // Internal buffers
  private renderCanvas: HTMLCanvasElement;
  private renderCtx: CanvasRenderingContext2D;

  constructor(track: TrackConfig, bike: BikeConfig, resolutionMode: ResolutionMode = 'ARCADE_256') {
    this.track = track;
    this.bike = bike;
    this.resolutionMode = resolutionMode;

    this.maxSpeed = bike.topSpeed;
    this.accel = bike.acceleration;
    this.handling = bike.handling;
    this.playerHp = bike.durability;
    this.playerMaxHp = bike.durability;
    this.totalLaps = track.laps;

    this.segments = buildRoad(track);

    // Setup offscreen canvas
    this.renderCanvas = document.createElement('canvas');
    const dims = this.getInternalDimensions();
    this.renderCanvas.width = dims.width;
    this.renderCanvas.height = dims.height;
    this.renderCtx = this.renderCanvas.getContext('2d', { alpha: false })!;
    this.renderCtx.imageSmoothingEnabled = false;

    this.initRivals();
  }

  public getInternalDimensions(): { width: number; height: number } {
    if (this.resolutionMode === 'RETRO_64') {
      return { width: 128, height: 72 };
    }
    return { width: 320, height: 180 };
  }

  public setResolutionMode(mode: ResolutionMode) {
    this.resolutionMode = mode;
    const dims = this.getInternalDimensions();
    this.renderCanvas.width = dims.width;
    this.renderCanvas.height = dims.height;
    this.renderCtx.imageSmoothingEnabled = false;
  }

  public raceStarted: boolean = false;

  public initRivals() {
    this.rivals = [];
    const count = this.track.rivalCount;
    // STANDARDIZED POLE POSITION STARTING GRID (Visible Staggered Pairs / Fileiras em Pares)
    // Row 1 (Front Leaders): P1 Pole (Left, z: 1800), P2 (Right, z: 1550)
    // Row 2 (Mid-Front):     P3 (Left, z: 1200), P4 (Right, z: 950)
    // Row 3 (Mid-Pack):      P5 (Left, z: 650),  P6 (Right, z: 420)
    // Row 4 (Rear Pack):     P7 (Left, z: 200),  Player (Right, z: 0)
    const gridPositions = [
       { x: -0.42, z: 1800 }, // P1: Pole Position (Fileira 1 Esquerda - Bem na frente!)
       { x: 0.42, z: 1550 },  // P2: Fileira 1 Direita (Escalonado)
       { x: -0.42, z: 1200 }, // P3: Fileira 2 Esquerda
       { x: 0.42, z: 950 },   // P4: Fileira 2 Direita
       { x: -0.42, z: 650 },  // P5: Fileira 3 Esquerda
       { x: 0.42, z: 420 },   // P6: Fileira 3 Direita
       { x: -0.42, z: 200 },  // P7: Fileira 4 Esquerda (Logo à frente do jogador)
    ];

    // STRONGLY DIFFERENTIATED SPEED & ACCELERATION SPECTRUM
    const rivalProfiles = [
      { speedMult: 1.25, accelMult: 1.35, name: 'Viper Rex (POLE)' }, // P1: Hypercar Leader (~275 km/h)
      { speedMult: 1.12, accelMult: 1.18, name: 'Axle Crash' },       // P2: High-speed GT (~248 km/h)
      { speedMult: 1.02, accelMult: 1.05, name: 'Nitro Jones' },      // P3: Fast Tuner (~225 km/h)
      { speedMult: 0.90, accelMult: 0.92, name: 'Raven' },            // P4: Balanced Mid-pack (~198 km/h)
      { speedMult: 0.80, accelMult: 0.82, name: 'Spike Miller' },     // P5: Touring Class (~176 km/h)
      { speedMult: 0.70, accelMult: 0.72, name: 'Scarlet' },          // P6: Heavy Muscle (~154 km/h)
      { speedMult: 0.58, accelMult: 0.60, name: 'Bone Crusher' },     // P7: Slow Heavy Cruiser (~128 km/h)
    ];

    for (let i = 0; i < count; i++) {
      const colors = RIVAL_COLORS[i % RIVAL_COLORS.length];
      const grid = gridPositions[i % gridPositions.length];
      const profile = rivalProfiles[i % rivalProfiles.length];
      const startZ = grid.z;
      const startX = grid.x;

      this.rivals.push({
        id: `rival_${i}`,
        name: profile.name || RIVAL_NAMES[i % RIVAL_NAMES.length],
        isPlayer: false,
        x: startX,
        z: startZ,
        speed: 0,
        maxSpeed: this.maxSpeed * profile.speedMult,
        accel: this.accel * profile.accelMult,
        hp: 85 + i * 6,
        maxHp: 85 + i * 6,
        bikeColor: colors.bike,
        suitColor: colors.suit,
        bikeId: 'rival_bike',
        attackCooldown: 1.0 + Math.random() * 1.5,
        isAttacking: null,
        attackType: i % 2 === 0 ? 'PUNCH' : 'KICK',
        isWipedOut: false,
        wipeoutTimer: 0,
        staggerTimer: 0,
        weapon: i > 3 ? 'CHAIN_WHIP' : 'BASEBALL_BAT',
        rank: i + 2,
        aiAggression: 0.5 + (profile.speedMult - 0.58) * 0.8,
        aiFlankTimer: Math.random() * 1.5,
        lap: 1,
        totalDistance: startZ,
      });
    }
  }

  // --- GAME UPDATE TICK (delta in seconds) ---
  public update(dt: number, controls: GameControls) {
    if (this.raceFinished) return;

    // Track time
    this.raceTime += dt;
    this.currentLapTime += dt;

    if (this.screenShake > 0) {
      this.screenShake = Math.max(0, this.screenShake - dt * 25);
    }

    // Hit effects countdown
    for (let i = this.hitEffects.length - 1; i >= 0; i--) {
      this.hitEffects[i].timer -= dt;
      this.hitEffects[i].y -= dt * 25;
      if (this.hitEffects[i].timer <= 0) {
        this.hitEffects.splice(i, 1);
      }
    }

    // --- PLAYER BREAKDOWN & REPAIR (0 HP or Wiped Out) ---
    // If HP hits 0, the car comes to a COMPLETE STOP and is immobilized until 100% HP is restored!
    if (this.isWipedOut || this.playerHp <= 0) {
      this.isWipedOut = true;
      this.speed = 0; // Completely stopped!
      this.isBoosting = false;
      this.isSuperNitro = false;
      this.nitroBurstTimer = 0;

      // Gradually repair HP from 0 to 100% (+22 HP/sec ~ 4.5s repair time)
      this.playerHp = Math.min(this.playerMaxHp, this.playerHp + dt * 22);

      // ONLY starts driving again once HP hits 100%!
      if (this.playerHp >= this.playerMaxHp) {
        this.playerHp = this.playerMaxHp;
        this.isWipedOut = false;
        audio.playRepairSuccess();
        this.addHitEffect('🔧 MOTOR 100% REPARADO! ACELERE!', '#22c55e');
      }
    } else {
      // Nitro Boost handling: Spacebar engages sustained hyper-speed rocket boost
      // When activated at 100% Nitro, triggers ULTRA NITRO with extreme speed!
      if (controls.nitro && this.nitro > 10 && this.nitroBurstTimer <= 0.3) {
        this.isSuperNitro = (this.nitro >= 98);
        this.nitroBurstTimer = 3.5; // 3.5 full seconds of sustained hyper-nitro
        this.nitroRechargeCooldown = 4.0; // 4 seconds delay after boost before recharge starts
        audio.playNitro();
        if (this.isSuperNitro) {
          this.addHitEffect('⚡ ULTRA NITRO 100%! VELOCIDADE MÁXIMA', '#38bdf8');
          this.screenShake = 8.0;
        } else {
          this.addHitEffect('⚡ NITRO ATIVADO!', '#38bdf8');
          this.screenShake = 5.0;
        }
      }

      if (this.nitroBurstTimer > 0 && this.nitro > 0) {
        this.nitroBurstTimer -= dt;
        this.nitro = Math.max(0, this.nitro - dt * 25);
        this.nitroRechargeCooldown = 4.0;
        this.isBoosting = true;
        this.screenShake = Math.max(this.screenShake, this.isSuperNitro ? 6.5 : 4.5);
      } else if (controls.nitro && this.nitro > 0) {
        this.isBoosting = true;
        this.nitro = Math.max(0, this.nitro - dt * 30);
        this.nitroRechargeCooldown = 4.0;
        this.screenShake = Math.max(this.screenShake, 4.0);
      } else {
        this.isBoosting = false;
        this.isSuperNitro = false;
        this.nitroBurstTimer = 0;

        // Cooldown delay countdown before recharge begins
        if (this.nitroRechargeCooldown > 0) {
          this.nitroRechargeCooldown = Math.max(0, this.nitroRechargeCooldown - dt);
        } else {
          // Slower, measured recharge: takes ~20 seconds to go from 0% to 100% (+5% per sec)
          this.nitro = Math.min(100, this.nitro + dt * 5.0);
        }
      }

      // Acceleration & Hyper-Speed Braking
      // When Ultra Nitro is engaged (fired at 100%), speed is even faster!
      let effectiveMax = this.maxSpeed;
      let effectiveAccel = this.accel;

      if (this.isBoosting) {
        if (this.isSuperNitro) {
          effectiveMax = this.maxSpeed * 2.20; // Blistering ~480+ km/h
          effectiveAccel = this.accel * 5.0;
        } else {
          effectiveMax = this.maxSpeed * 1.65; // ~365 km/h
          effectiveAccel = this.accel * 3.6;
        }
      }

      if (this.isBoosting) {
        // Automatic rocket propulsion during Nitro
        this.speed = Math.min(effectiveMax, this.speed + effectiveAccel * dt * 2.5);
      } else if (controls.up) {
        this.speed = Math.min(effectiveMax, this.speed + effectiveAccel * dt * 2.2);
      } else if (controls.down) {
        this.speed = Math.max(0, this.speed - this.accel * dt * 3.5);
      } else {
        // Natural coasting deceleration
        this.speed = Math.max(0, this.speed - dt * 35);
      }

      // Steering & Active Turn Rotation
      const speedFactor = this.speed / this.maxSpeed;
      if (controls.left) {
        this.playerX -= dt * (this.handling / 55) * Math.max(0.2, speedFactor * 1.4);
        this.currentSteer = -1;
      } else if (controls.right) {
        this.playerX += dt * (this.handling / 55) * Math.max(0.2, speedFactor * 1.4);
        this.currentSteer = 1;
      } else {
        this.currentSteer = 0;
      }

      // Centrifugal force from road curve
      const currentSegment = this.findSegment(this.playerZ);
      if (currentSegment && currentSegment.curve !== 0) {
        this.playerX -= currentSegment.curve * speedFactor * dt * 0.8;
      }

      // Off-road friction penalty & screen shake
      if (Math.abs(this.playerX) > 1.0) {
        // Riding on grass / dirt
        this.speed = Math.max(0, this.speed - dt * 90);
        this.screenShake = Math.max(this.screenShake, 1.5);
        if (Math.abs(this.playerX) > 1.8) {
          // Guardrail friction bump
          this.playerX = Math.sign(this.playerX) * 1.72;
          this.speed = Math.max(30, this.speed * 0.75 - 10);
          this.screenShake = 6;
          audio.playCrash();
          this.addHitEffect('BARREIRA!', '#f59e0b');
        }
      }

      // Check Road Potholes & Hazards Collision on current segment
      if (currentSegment && currentSegment.sprites.length > 0 && this.lastObstacleHitSeg !== currentSegment.index) {
        for (const sprite of currentSegment.sprites) {
          if (Math.abs(sprite.offset) <= 0.85) {
            const dist = Math.abs(this.playerX - sprite.offset);
            if (dist < 0.28) {
              this.lastObstacleHitSeg = currentSegment.index;
              if (sprite.type === 'POTHOLE') {
                this.speed = Math.max(25, this.speed * 0.58 - 14);
                this.screenShake = 7.5;
                audio.playCrash();
                this.addHitEffect('💥 BURACO! -40% VEL.', '#ef4444');
                this.playerHp = Math.max(0, this.playerHp - 5);
              } else if (sprite.type === 'ROAD_BARRIER') {
                this.speed = Math.max(15, this.speed * 0.45 - 22);
                this.screenShake = 9.0;
                audio.playCrash();
                this.addHitEffect('🚧 BARREIRA! -VELOCIDADE', '#f97316');
                this.playerHp = Math.max(0, this.playerHp - 10);
              } else if (sprite.type === 'OIL_SLICK') {
                this.speed = Math.max(25, this.speed * 0.70);
                this.playerX += (Math.random() > 0.5 ? 0.35 : -0.35);
                this.screenShake = 4.0;
                audio.playScreech();
                this.addHitEffect('⚠️ ÓLEO NA PISTA! DERRAPOU', '#eab308');
              } else if (sprite.type === 'ROAD_CONE') {
                this.speed = Math.max(20, this.speed - 18);
                this.screenShake = 3.0;
                this.addHitEffect('⚠️ CONE! -VELOCIDADE', '#fbbf24');
              }
              break;
            }
          }
        }
      }

      // Update Multi-Layer Parallax Background Offsets (Subtle, slow and realistic pan)
      const curveSpeed = (currentSegment ? currentSegment.curve : 0) * speedFactor * 0.7;
      const steerSpeed = (controls.left ? -1 : controls.right ? 1 : 0) * speedFactor * 0.35;
      const totalPan = curveSpeed + steerSpeed;

      this.bgSkyOffset += totalPan * 0.02 * dt * 60;
      this.bgDistantOffset += totalPan * 0.05 * dt * 60;
      this.bgMidOffset += totalPan * 0.11 * dt * 60;
      this.bgNearOffset += totalPan * 0.22 * dt * 60;

      // Audio engine update
      audio.updateEngineSound(this.speed / this.maxSpeed, this.isBoosting);

      // Player Attacks
      if (this.attackCooldown > 0) {
        this.attackCooldown -= dt;
      }

      if (this.attackCooldown <= 0) {
        if (controls.punchLeft) {
          this.executePlayerAttack('LEFT', 'PUNCH');
        } else if (controls.punchRight) {
          this.executePlayerAttack('RIGHT', 'PUNCH');
        } else if (controls.kick) {
          this.executePlayerAttack(this.playerX < 0 ? 'RIGHT' : 'LEFT', 'KICK');
        }
      }

      // Reset attack animation frame
      if (this.attackCooldown < 0.25) {
        this.isAttacking = null;
      }
    }

    const trackLength = this.track.totalSegments * SEGMENT_LENGTH;

    // --- REALISTIC KINETIC BUMP & COLLISION PHYSICS ---
    if (this.raceStarted) {
      for (const rival of this.rivals) {
        let dz = rival.z - this.playerZ;
        while (dz < -trackLength / 2) dz += trackLength;
        while (dz > trackLength / 2) dz -= trackLength;
        const dx = rival.x - this.playerX;

        // 1. REAR-END COLLISION: Player hits Rival from behind
        // Player is behind (dz > 0), within 135 world units, and aligned in same lane
        if (dz > 0 && dz < 135 && Math.abs(dx) < 0.48) {
          if (this.speed > rival.speed) {
            // Player rear-ends another car: loses HP and speed!
            const damage = Math.round(5 + (this.speed / this.maxSpeed) * 5);
            this.playerHp = Math.max(0, this.playerHp - damage);
            this.speed = Math.max(0, this.speed * 0.28 - 20);

            rival.speed = Math.min(rival.maxSpeed * 1.80, rival.speed + 75);
            rival.z += 40;
            rival.staggerTimer = 0.4;
            this.screenShake = 16;
            audio.playCrash();
            this.addHitEffect(`💥 BATIDA NA TRASEIRA! -${damage} HP`, '#ef4444');

            if (this.playerHp <= 0) {
              this.isWipedOut = true;
              this.speed = 0;
              this.addHitEffect('⚠️ VEÍCULO DESTRUÍDO! MOTOR EM REPARO...', '#f87171');
            }
          }
        }
        // 2. REAR-END COLLISION: Rival hits Player from behind
        // Player is in front (dz < 0), within 135 world units, and aligned
        else if (dz < 0 && dz > -135 && Math.abs(dx) < 0.48) {
          if (rival.speed > this.speed) {
            // Massive kinetic transfer: Rival (behind) loses heavy speed, Player (in front) shoots ahead with immense rocket boost!
            rival.speed = Math.max(25, rival.speed * 0.38 - 25);
            this.speed = Math.min(this.maxSpeed * 1.70, this.speed + 75);
            this.nitro = Math.min(100, this.nitro + 35);
            this.screenShake = 14;
            audio.playKick();
            this.addHitEffect('🚀 SUPER BOOST TRASEIRO!', '#22c55e');
          }
        }
        // 3. LATERAL RUBBING & SIDE-BY-SIDE CONTACT
        else if (Math.abs(dz) < 110 && Math.abs(dx) < 0.42) {
          const push = (0.42 - Math.abs(dx)) * 1.4;
          this.playerX += (dx < 0 ? 0.08 : -0.08) + Math.sign(this.playerX - rival.x) * push;
          rival.x -= Math.sign(this.playerX - rival.x) * push;
          this.speed = Math.max(25, this.speed - dt * 25);
          rival.speed = Math.max(25, rival.speed - dt * 25);
          rival.staggerTimer = 0.2;
          this.screenShake = Math.max(this.screenShake, 3);
        }
      }
    }

    // Move player distance Z
    this.playerZ += this.speed * dt * 14;

    if (this.playerZ >= trackLength) {
      this.playerZ -= trackLength;
      audio.playCheckpoint();
      if (this.bestLapTime === 0 || this.currentLapTime < this.bestLapTime) {
        this.bestLapTime = this.currentLapTime;
      }
      this.currentLapTime = 0;
      this.currentLap++;

      if (this.currentLap > this.totalLaps) {
        // Finish Race!
        this.currentLap = this.totalLaps;
        this.raceFinished = true;
        this.calculateRanks();
        audio.stopEngineSound();
      }
    }

    // Update AI Rivals
    this.updateRivals(dt);

    // Calculate current race position
    this.calculateRanks();
  }

  private executePlayerAttack(side: 'LEFT' | 'RIGHT', type: 'PUNCH' | 'KICK') {
    this.isAttacking = side;
    this.attackType = type;
    this.attackCooldown = 0.45;

    let hitSomeone = false;

    // Check tactical side ram against nearby rivals
    const attackRangeX = 0.55;
    const trackLength = this.track.totalSegments * SEGMENT_LENGTH;

    for (const rival of this.rivals) {
      let dz = rival.z - this.playerZ;
      while (dz < -trackLength / 2) dz += trackLength;
      while (dz > trackLength / 2) dz -= trackLength;
      const dx = rival.x - this.playerX;

      // Within distance along track
      if (Math.abs(dz) < 180) {
        const correctSide = side === 'LEFT' ? dx < 0 : dx > 0;
        if (correctSide && Math.abs(dx) <= attackRangeX + 0.35) {
          // Tactical Ram connected!
          hitSomeone = true;
          rival.staggerTimer = 0.35;
          this.screenShake = 7;

          // Shove rival outward and steal momentum
          rival.x += (side === 'RIGHT' ? 0.55 : -0.55);
          rival.speed = Math.max(30, rival.speed - 24);
          this.speed = Math.min(this.maxSpeed * 1.18, this.speed + 16);
          this.nitro = Math.min(100, this.nitro + 25);
          this.knockdowns++;

          audio.playKick();
          this.addHitEffect('BATIDA TÁTICA!', '#38bdf8');
          break;
        }
      }
    }

    if (!hitSomeone) {
      audio.playKick();
    }
  }

  private addHitEffect(text: string, color: string) {
    // Disabled per user request
  }

  private updateRivals(dt: number) {
    const trackLength = this.track.totalSegments * SEGMENT_LENGTH;

    for (const rival of this.rivals) {
      if (!this.raceStarted) {
        // Engines revving on starting grid
        rival.speed = 0;
        continue;
      }

      if (rival.staggerTimer > 0) {
        rival.staggerTimer -= dt;
      }

      // Natural speed rhythm with individual variance according to rival tier
      let targetSpeed = rival.maxSpeed;
      const speedWave = Math.sin((Date.now() / 2200) + rival.z * 0.004) * 6;
      targetSpeed += speedWave;

      // Distance relative to player
      let distToPlayer = rival.z - this.playerZ;
      while (distToPlayer < -trackLength / 2) distToPlayer += trackLength;
      while (distToPlayer > trackLength / 2) distToPlayer -= trackLength;

      // Subtle catch-up only when extremely far away, preserving true speed differences
      if (distToPlayer > 3500) {
        targetSpeed = rival.maxSpeed * 0.92;
      } else if (distToPlayer < -2500) {
        targetSpeed = rival.maxSpeed * 1.08;
      }

      if (rival.speed < targetSpeed) {
        rival.speed = Math.min(targetSpeed, rival.speed + rival.accel * dt * 2.0);
      } else {
        rival.speed = Math.max(targetSpeed, rival.speed - dt * 20);
      }

      // Move rival distance along track
      const rivalDistDelta = rival.speed * dt * 14;
      rival.z += rivalDistDelta;
      rival.totalDistance = (rival.totalDistance || rival.z) + rivalDistDelta;
      if (rival.z >= trackLength) {
        rival.z -= trackLength;
        rival.lap = (rival.lap || 1) + 1;
      }

      // AI Flanking and bumper bump toward player
      let dz = rival.z - this.playerZ;
      while (dz < -trackLength / 2) dz += trackLength;
      while (dz > trackLength / 2) dz -= trackLength;
      const dx = this.playerX - rival.x;

      if (Math.abs(dz) < 260) {
        // Move towards player to contest racing line
        if (Math.abs(dx) > 0.32) {
          rival.x += Math.sign(dx) * dt * 0.7;
        }

        // AI Side Ram trigger against player
        rival.attackCooldown -= dt;
        if (rival.attackCooldown <= 0 && Math.abs(dx) < 0.55) {
          rival.attackCooldown = 1.2 + Math.random() * 1.5;
          rival.isAttacking = dx > 0 ? 'RIGHT' : 'LEFT';

          // Ram hits player?
          if (Math.abs(dz) < 150) {
            this.screenShake = 8;
            // Push player sideways
            this.playerX += (dx > 0 ? 0.32 : -0.32);
            this.speed = Math.max(30, this.speed - 12);
            audio.playKick();
            this.addHitEffect(`${rival.name} RAM!`, '#f43f5e');
          }

          // Reset rival attack animation after 0.25s
          setTimeout(() => {
            rival.isAttacking = null;
          }, 250);
        }
      } else {
        // Natural lane wandering
        rival.aiFlankTimer = (rival.aiFlankTimer || 0) - dt;
        if (rival.aiFlankTimer <= 0) {
          rival.aiFlankTimer = 1.2 + Math.random() * 1.8;
          const targetX = ((Math.random() * 1.4) - 0.7);
          rival.x += (targetX - rival.x) * 0.3;
        }
      }

      // Keep within track bounds
      rival.x = Math.max(-1.3, Math.min(1.3, rival.x));
    }

    // --- COMPETITOR VS COMPETITOR (AI VS AI) BUMP DRAFTING & CONTACT ---
    if (this.raceStarted) {
      for (let i = 0; i < this.rivals.length; i++) {
        const r1 = this.rivals[i];

        for (let j = i + 1; j < this.rivals.length; j++) {
          const r2 = this.rivals[j];

          let dz = r2.z - r1.z;
          while (dz < -trackLength / 2) dz += trackLength;
          while (dz > trackLength / 2) dz -= trackLength;
          const dx = r1.x - r2.x;

          // Rear-end bump between AI competitors:
          // r1 is behind r2
          if (dz > 0 && dz < 125 && Math.abs(dx) < 0.46) {
            if (r1.speed > r2.speed) {
              r1.speed = Math.max(25, r1.speed * 0.40);
              r2.speed = Math.min(r2.maxSpeed * 1.75, r2.speed + 60);
              r2.z += 35;
            }
          } else if (dz < 0 && dz > -125 && Math.abs(dx) < 0.46) {
            // r2 is behind r1
            if (r2.speed > r1.speed) {
              r2.speed = Math.max(25, r2.speed * 0.40);
              r1.speed = Math.min(r1.maxSpeed * 1.75, r1.speed + 60);
              r1.z += 35;
            }
          }
          // Lateral rubbing
          else if (Math.abs(dz) < 100 && Math.abs(dx) < 0.40) {
            const push = (0.40 - Math.abs(dx)) * 0.8;
            r1.x += Math.sign(r1.x - r2.x) * push;
            r2.x -= Math.sign(r1.x - r2.x) * push;
          }
        }
      }
    }
  }

  private calculateRanks() {
    const trackLength = this.track.totalSegments * SEGMENT_LENGTH;
    const playerTotalZ = Math.max(0, this.currentLap - 1) * trackLength + this.playerZ;

    const allRacers = [
      { id: 'player', totalZ: playerTotalZ, isPlayer: true },
      ...this.rivals.map((r) => ({ id: r.id, totalZ: r.totalDistance || r.z, isPlayer: false })),
    ];

    allRacers.sort((a, b) => b.totalZ - a.totalZ);

    const playerIndex = allRacers.findIndex((r) => r.isPlayer);
    this.finishRank = playerIndex + 1;
  }

  public findSegment(z: number): RoadSegment {
    const trackLength = this.track.totalSegments * SEGMENT_LENGTH;
    const normalizedZ = ((z % trackLength) + trackLength) % trackLength;
    const index = Math.floor(normalizedZ / SEGMENT_LENGTH) % this.track.totalSegments;
    return this.segments[index];
  }

  // --- RENDER PASS ---
  public render(targetCanvas: HTMLCanvasElement) {
    const dims = this.getInternalDimensions();
    const ctx = this.renderCtx;
    const w = dims.width;
    const h = dims.height;

    ctx.save();

    // Screen shake offset
    if (this.screenShake > 0) {
      const sx = (Math.random() - 0.5) * this.screenShake;
      const sy = (Math.random() - 0.5) * this.screenShake;
      ctx.translate(sx, sy);
    }

    // 1. Draw Multi-Layer Parallax Sky & Horizon Backdrop
    const currentSeg = this.findSegment(this.playerZ);
    renderBackground(
      ctx,
      w,
      h,
      this.track.skyColors,
      this.track.horizonType,
      this.bgSkyOffset,
      this.bgDistantOffset,
      this.bgMidOffset,
      this.bgNearOffset,
      this.raceTime
    );

    // 2. Solid ground grass base below horizon
    ctx.fillStyle = currentSeg.color.grass;
    ctx.fillRect(0, h / 2, w, h / 2);

    // 3. Camera Elevation & 3D Parameters
    const totalSegs = this.track.totalSegments;
    const trackLength = totalSegs * SEGMENT_LENGTH;
    const cameraHeight = CAMERA_HEIGHT;
    const cameraDepth = CAMERA_DEPTH;
    const cameraOffsetZ = CAMERA_OFFSET_Z; // 840 world units behind player

    // Camera is positioned behind player to give third-person chase perspective (always strictly positive)
    let cameraZ = (this.playerZ - cameraOffsetZ + trackLength) % trackLength;
    const camBaseSeg = this.findSegment(cameraZ);
    const camPercent = (cameraZ % SEGMENT_LENGTH) / SEGMENT_LENGTH;

    // Follow road surface elevation smoothly
    const pY1 = camBaseSeg.p1.world.y;
    const pY2 = camBaseSeg.p2.world.y;
    const roadYAtCamera = pY1 + (pY2 - pY1) * camPercent;
    const cameraY = roadYAtCamera + cameraHeight;
    const cameraX = this.playerX * ROAD_WIDTH;

    // 4. Clear car arrays for visible segments & assign competitors to their segments
    for (let n = 0; n < DRAW_DISTANCE; n++) {
      const segIndex = (camBaseSeg.index + n) % totalSegs;
      this.segments[segIndex].cars = [];
    }

    for (const rival of this.rivals) {
      let relZ = rival.z - cameraZ;
      while (relZ < -trackLength / 2) relZ += trackLength;
      while (relZ > trackLength / 2) relZ -= trackLength;

      // In front of camera and within draw distance
      if (relZ > 20 && relZ < (DRAW_DISTANCE - 1) * SEGMENT_LENGTH) {
        const segOffset = Math.floor(relZ / SEGMENT_LENGTH);
        const targetSeg = this.segments[(camBaseSeg.index + segOffset) % totalSegs];
        if (targetSeg) {
          targetSeg.cars.push({
            racer: rival,
            percent: (relZ % SEGMENT_LENGTH) / SEGMENT_LENGTH,
          });
        }
      }
    }

    // 5. FRONT-TO-BACK Road Polygon Rendering (Painter's algorithm with crest occlusion)
    let maxy = h;
    let x = 0;
    let dx = -(camBaseSeg.curve * camPercent);

    for (let n = 0; n < DRAW_DISTANCE; n++) {
      const segIndex = (camBaseSeg.index + n) % totalSegs;
      const segment = this.segments[segIndex];
      const looped = segIndex < camBaseSeg.index;
      const segZ1 = segment.p1.world.z + (looped ? trackLength : 0);
      const segZ2 = segment.p2.world.z + (looped ? trackLength : 0);

      const p1 = projectPoint(
        x,
        segment.p1.world.y,
        segZ1,
        cameraX,
        cameraY,
        cameraZ,
        cameraDepth,
        w,
        h,
        ROAD_WIDTH
      );

      const p2 = projectPoint(
        x + dx,
        segment.p2.world.y,
        segZ2,
        cameraX,
        cameraY,
        cameraZ,
        cameraDepth,
        w,
        h,
        ROAD_WIDTH
      );

      x += dx;
      dx += segment.curve;

      segment.p1.screen.x = p1.screenX;
      segment.p1.screen.y = p1.screenY;
      segment.p1.screen.w = p1.roadW;
      segment.p1.screen.scale = p1.scale;

      segment.p2.screen.x = p2.screenX;
      segment.p2.screen.y = p2.screenY;
      segment.p2.screen.w = p2.roadW;
      segment.p2.screen.scale = p2.scale;

      segment.clip = maxy;

      // Skip segments behind camera, facing away, or behind an earlier hill crest
      if (p1.transZ <= 0.001 || p2.screenY >= maxy || p2.screenY >= p1.screenY) {
        continue;
      }

      renderSegment(
        ctx,
        w,
        2,
        p1.screenX,
        p1.screenY,
        p1.roadW,
        p2.screenX,
        p2.screenY,
        p2.roadW,
        1 - n / DRAW_DISTANCE,
        segment.color,
        segment.isFinishLine,
        segment.gridSlot
      );

      maxy = p2.screenY;
    }

    // 5. BACK-TO-FRONT Scenery Sprites and Competitor Cars Rendering
    for (let n = DRAW_DISTANCE - 1; n >= 0; n--) {
      const segIndex = (camBaseSeg.index + n) % totalSegs;
      const segment = this.segments[segIndex];

      // Draw roadside scenery sprites
      for (const spr of segment.sprites) {
        const sprX = segment.p1.screen.x + spr.offset * segment.p1.screen.w;
        const sprY = segment.p1.screen.y;
        if (sprY > 0 && sprY <= h + 50) {
          renderSprite(
            ctx,
            spr.type,
            sprX,
            sprY,
            segment.p1.screen.scale,
            this.track.horizonType,
            segment.p1.screen.w,
            segment.clip
          );
        }
      }

      // Draw competitor combat cars
      for (const car of segment.cars) {
        if (!car.racer) continue;
        const rival = car.racer;
        const p1 = segment.p1.screen;
        const p2 = segment.p2.screen;
        const pct = car.percent || 0;

        const roadCenterX = p1.x + (p2.x - p1.x) * pct;
        const roadW = p1.w + (p2.w - p1.w) * pct;
        const roadY = p1.y + (p2.y - p1.y) * pct;
        const scale = p1.scale + (p2.scale - p1.scale) * pct;

        const carScreenX = roadCenterX + rival.x * roadW;
        const carScreenY = roadY;

        if (carScreenY > 0 && carScreenY <= h + 150) {
          renderRacerSprite(
            ctx,
            rival,
            carScreenX,
            carScreenY,
            scale,
            true,
            roadW,
            segment.clip
          );
        }
      }
    }

    // 6. Render Player Sports Car in Foreground (Fixed at screen center with subtle turn rotation)
    renderPlayerBike(
      ctx,
      w,
      h,
      this.speed / this.maxSpeed,
      this.currentSteer,
      this.isBoosting,
      this.isAttacking,
      this.attackType,
      this.bike.color,
      this.bike.weapon,
      this.isWipedOut
    );

    ctx.restore();

    // 8. Scale and blit internal canvas to target visual canvas
    const targetCtx = targetCanvas.getContext('2d', { alpha: false });
    if (targetCtx) {
      targetCtx.imageSmoothingEnabled = false;
      targetCtx.drawImage(this.renderCanvas, 0, 0, targetCanvas.width, targetCanvas.height);
    }
  }
}
