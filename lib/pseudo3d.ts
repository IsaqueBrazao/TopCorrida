// Pseudo-3D Road Engine based on Lou's Pseudo-3D Racing tutorial
// With Road Rash-style combat racing, roadside scenery, and visceral car brawls

import { RoadSegment, TrackConfig, CombatRacer, ResolutionMode } from './types';

export const SEGMENT_LENGTH = 200; // length of each road segment in world units
export const ROAD_WIDTH = 2000;    // half width of road in world units
export const DRAW_DISTANCE = 180;  // segments visible in front of camera (36,000 world units)
export const CAMERA_HEIGHT = 1000;
export const CAMERA_DEPTH = 0.84;  // field of view factor (FOV ~ 100 deg)
export const CAMERA_OFFSET_Z = CAMERA_HEIGHT * CAMERA_DEPTH; // 840 world units behind player

export interface Camera {
  x: number;
  y: number;
  z: number;
}

export function projectPoint(
  worldX: number,
  worldY: number,
  worldZ: number,
  cameraX: number,
  cameraY: number,
  cameraZ: number,
  cameraDepth: number,
  width: number,
  height: number,
  roadWidth: number
): { screenX: number; screenY: number; roadW: number; scale: number; transZ: number } {
  const transX = worldX - cameraX;
  const transY = worldY - cameraY;
  const transZ = worldZ - cameraZ;

  if (transZ <= 0.001) {
    return { screenX: Math.round(width / 2), screenY: height * 2, roadW: 0, scale: 0, transZ };
  }

  const scale = cameraDepth / transZ;
  const screenX = Math.round(width / 2 + (scale * transX * width) / 2);
  const screenY = Math.round(height / 2 - (scale * transY * height) / 2);
  const roadW = Math.round((scale * roadWidth * width) / 2);

  return { screenX, screenY, roadW, scale, transZ };
}

export function project(
  p: { world: { x: number; y: number; z: number }; screen: { x: number; y: number; w: number; scale: number } },
  cameraX: number,
  cameraY: number,
  cameraZ: number,
  cameraDepth: number,
  width: number,
  height: number,
  roadWidth: number,
  customZ?: number
) {
  const z = customZ !== undefined ? customZ : p.world.z;
  const res = projectPoint(
    p.world.x,
    p.world.y,
    z,
    cameraX,
    cameraY,
    cameraZ,
    cameraDepth,
    width,
    height,
    roadWidth
  );
  p.screen.scale = res.scale;
  p.screen.x = res.screenX;
  p.screen.y = res.screenY;
  p.screen.w = res.roadW;
}

// Easing utilities for smooth curve and hill transitions
function easeIn(a: number, b: number, percent: number): number {
  return a + (b - a) * Math.pow(percent, 2);
}
function easeOut(a: number, b: number, percent: number): number {
  return a + (b - a) * (1 - Math.pow(1 - percent, 2));
}
function easeInOut(a: number, b: number, percent: number): number {
  return a + (b - a) * ((-Math.cos(percent * Math.PI) / 2) + 0.5);
}

// Add road segment sequences with smooth curve and hill profiles
function addRoadSection(
  segments: RoadSegment[],
  track: TrackConfig,
  enter: number,
  hold: number,
  leave: number,
  curve: number,
  targetY: number,
  startY: number
): number {
  const total = enter + hold + leave;
  for (let n = 0; n < total; n++) {
    const idx = segments.length;
    let segmentCurve = 0;
    if (n < enter) {
      segmentCurve = easeIn(0, curve, n / enter);
    } else if (n < enter + hold) {
      segmentCurve = curve;
    } else {
      segmentCurve = easeOut(curve, 0, (n - enter - hold) / leave);
    }

    const currentY = easeInOut(startY, targetY, n / total);
    const nextY = easeInOut(startY, targetY, (n + 1) / total);

    const isEven = Math.floor(idx / 3) % 2 === 0;

    // Add scenery roadside sprites
    const sprites: RoadSegment['sprites'] = [];
    if (idx % 6 === 0 && idx > 15) {
      const spriteType = track.scenerySprites[idx % track.scenerySprites.length];
      const side = (idx / 6) % 2 === 0 ? 1 : -1;
      const offset = side * (1.6 + (idx % 3) * 0.4);
      sprites.push({
        type: spriteType,
        offset,
        scale: 1.0,
      });
    }

    segments.push({
      index: idx,
      p1: {
        world: { x: 0, y: Math.round(currentY), z: idx * SEGMENT_LENGTH },
        screen: { x: 0, y: 0, w: 0, scale: 0 },
      },
      p2: {
        world: { x: 0, y: Math.round(nextY), z: (idx + 1) * SEGMENT_LENGTH },
        screen: { x: 0, y: 0, w: 0, scale: 0 },
      },
      curve: segmentCurve,
      sprites,
      cars: [],
      color: {
        road: isEven ? track.roadColors.roadDark : track.roadColors.roadLight,
        grass: isEven ? track.roadColors.grassDark : track.roadColors.grassLight,
        rumble: isEven ? track.roadColors.rumbleDark : track.roadColors.rumbleLight,
        lane: isEven ? track.roadColors.laneColor : undefined,
      },
      isFinishLine: idx === 0 || idx === 1,
    });
  }
  return targetY;
}

export function buildRoad(track: TrackConfig): RoadSegment[] {
  const segments: RoadSegment[] = [];
  const targetCount = track.totalSegments;
  let currentY = 0;

  const hillScale = track.hillComplexity * 190;
  const curveScale = track.curveComplexity * 1.35;

  // 1. Starting Grid Straightaway
  currentY = addRoadSection(segments, track, 15, 30, 15, 0, 0, currentY);

  // Custom track-specific layouts tailored to each country and environment
  type SectionDef = { enter: number; hold: number; leave: number; curve: number; hill: number };
  let sections: SectionDef[] = [];

  if (track.id === 'track_usa') {
    // USA: Fast sweeping desert canyon with high-speed straights & elevation dips
    sections = [
      { enter: 25, hold: 45, leave: 25, curve: 1.1 * curveScale, hill: 0.5 * hillScale },
      { enter: 15, hold: 30, leave: 15, curve: 0, hill: -0.4 * hillScale },
      { enter: 20, hold: 40, leave: 20, curve: -1.3 * curveScale, hill: 0.8 * hillScale },
      { enter: 20, hold: 35, leave: 20, curve: 0.7 * curveScale, hill: -0.6 * hillScale },
      { enter: 25, hold: 50, leave: 25, curve: -1.4 * curveScale, hill: 0.3 * hillScale },
      { enter: 15, hold: 40, leave: 15, curve: 0, hill: 0 },
      { enter: 25, hold: 45, leave: 25, curve: 1.5 * curveScale, hill: -0.7 * hillScale },
    ];
  } else if (track.id === 'track_italy') {
    // Italy: Serpentine Amalfi coastal cliffs with double S-bends and undulating hills
    sections = [
      { enter: 20, hold: 35, leave: 20, curve: 1.6 * curveScale, hill: 0.9 * hillScale },
      { enter: 15, hold: 25, leave: 15, curve: -1.5 * curveScale, hill: 0.4 * hillScale },
      { enter: 25, hold: 40, leave: 25, curve: 1.8 * curveScale, hill: -0.8 * hillScale },
      { enter: 15, hold: 30, leave: 15, curve: 0, hill: 0.6 * hillScale },
      { enter: 20, hold: 35, leave: 20, curve: -1.7 * curveScale, hill: -0.7 * hillScale },
      { enter: 20, hold: 30, leave: 20, curve: 1.4 * curveScale, hill: 0.5 * hillScale },
      { enter: 25, hold: 45, leave: 25, curve: -1.9 * curveScale, hill: -0.5 * hillScale },
    ];
  } else if (track.id === 'track_japan') {
    // Japan: Neo-Tokyo multi-level expressway with 90-degree street corners & chicanes
    sections = [
      { enter: 20, hold: 35, leave: 20, curve: 2.2 * curveScale, hill: 0.5 * hillScale },
      { enter: 10, hold: 20, leave: 10, curve: -2.0 * curveScale, hill: 0 },
      { enter: 20, hold: 40, leave: 20, curve: 0, hill: 1.2 * hillScale }, // Elevated flyover
      { enter: 25, hold: 40, leave: 25, curve: 2.4 * curveScale, hill: -1.0 * hillScale },
      { enter: 12, hold: 15, leave: 12, curve: -1.8 * curveScale, hill: 0 }, // Quick chicane
      { enter: 12, hold: 15, leave: 12, curve: 1.8 * curveScale, hill: 0 },
      { enter: 25, hold: 50, leave: 25, curve: -2.2 * curveScale, hill: 0.6 * hillScale },
    ];
  } else if (track.id === 'track_france') {
    // France: Mountain Alpine Pass with hairpin switchbacks (cotovelo) and steep climbs
    sections = [
      { enter: 25, hold: 40, leave: 25, curve: 2.6 * curveScale, hill: 1.6 * hillScale }, // Steep climb
      { enter: 12, hold: 25, leave: 12, curve: -2.7 * curveScale, hill: 0.8 * hillScale }, // Hairpin left
      { enter: 15, hold: 30, leave: 15, curve: 0, hill: 0 },
      { enter: 12, hold: 25, leave: 12, curve: 2.8 * curveScale, hill: -1.5 * hillScale }, // Hairpin right descent
      { enter: 20, hold: 35, leave: 20, curve: -2.2 * curveScale, hill: -1.2 * hillScale },
      { enter: 25, hold: 40, leave: 25, curve: 2.5 * curveScale, hill: 0.9 * hillScale },
      { enter: 15, hold: 35, leave: 15, curve: -1.6 * curveScale, hill: -0.6 * hillScale },
    ];
  } else {
    // Brazil: Rio Coastal Highway with smooth, wide and stable curves & long straights for effortless control
    sections = [
      { enter: 25, hold: 60, leave: 25, curve: 0.8 * curveScale, hill: 0.2 * hillScale },
      { enter: 20, hold: 50, leave: 20, curve: -0.7 * curveScale, hill: -0.1 * hillScale },
      { enter: 30, hold: 70, leave: 30, curve: 0, hill: 0 },
      { enter: 20, hold: 50, leave: 20, curve: 0.9 * curveScale, hill: 0.3 * hillScale },
      { enter: 25, hold: 60, leave: 25, curve: -0.8 * curveScale, hill: -0.2 * hillScale },
    ];
  }

  let s = 0;
  while (segments.length < targetCount - 60) {
    const sec = sections[s % sections.length];
    currentY = addRoadSection(segments, track, sec.enter, sec.hold, sec.leave, sec.curve, sec.hill, currentY);
    s++;
  }

  // Smooth ease back to Y = 0 and curve = 0 before finish line
  const remaining = targetCount - segments.length;
  if (remaining > 20) {
    const half = Math.floor(remaining / 2);
    currentY = addRoadSection(segments, track, 10, Math.max(0, half - 20), 10, 0, currentY * 0.4, currentY);
    addRoadSection(segments, track, 10, Math.max(0, remaining - half - 20), 10, 0, 0, currentY);
  }

  // Fill any remaining segments up to exact targetCount with straight road
  while (segments.length < targetCount) {
    const idx = segments.length;
    const isEven = Math.floor(idx / 3) % 2 === 0;
    segments.push({
      index: idx,
      p1: { world: { x: 0, y: 0, z: idx * SEGMENT_LENGTH }, screen: { x: 0, y: 0, w: 0, scale: 0 } },
      p2: { world: { x: 0, y: 0, z: (idx + 1) * SEGMENT_LENGTH }, screen: { x: 0, y: 0, w: 0, scale: 0 } },
      curve: 0,
      sprites: [],
      cars: [],
      color: {
        road: isEven ? track.roadColors.roadDark : track.roadColors.roadLight,
        grass: isEven ? track.roadColors.grassDark : track.roadColors.grassLight,
        rumble: isEven ? track.roadColors.rumbleDark : track.roadColors.rumbleLight,
        lane: isEven ? track.roadColors.laneColor : undefined,
      },
    });
  }

  if (segments.length > targetCount) {
    segments.length = targetCount;
  }

  // Re-index cleanly
  for (let i = 0; i < targetCount; i++) {
    segments[i].index = i;
    segments[i].p1.world.z = i * SEGMENT_LENGTH;
    segments[i].p2.world.z = (i + 1) * SEGMENT_LENGTH;
  }

  // 2. ENRICH ROAD WITH ROADSIDE SIGNS & SPARSE, HIGH-VISIBILITY HAZARDS
  for (let i = 35; i < targetCount - 35; i++) {
    const seg = segments[i];
    const prevSeg = segments[i - 1];

    // A. Roadside Warning Signs placed before sharp curves (anticipation)
    if (Math.abs(seg.curve) > 0.85 && Math.abs(prevSeg?.curve || 0) <= 0.85) {
      // Place curve sign 4 segments before the turn on the outer roadside
      const signSegIdx = Math.max(20, i - 4);
      const isTurnLeft = seg.curve < 0;
      if (segments[signSegIdx]) {
        segments[signSegIdx].sprites.push({
          type: isTurnLeft ? 'SIGN_LEFT' : 'SIGN_RIGHT',
          offset: isTurnLeft ? 1.45 : -1.45,
          scale: 1.2,
        });
      }
    }

    // B. Speed Limit Signs on long straightaways (sparse)
    if (i % 140 === 0 && Math.abs(seg.curve) < 0.2) {
      seg.sprites.push({
        type: 'SIGN_SPEED',
        offset: (i % 280 === 0) ? -1.45 : 1.45,
        scale: 1.1,
      });
    }

    // C. (Obstacles removed per request)
  }

  // Checkered finish line at the start of lap
  segments[0].isFinishLine = true;
  segments[1].isFinishLine = true;

  // Standardized Pole Position starting grid boxes on asphalt for each row pair
  if (segments[9]) segments[9].gridSlot = 'LEFT';  // Fileira 1 Esquerda (P1 Pole)
  if (segments[8]) segments[8].gridSlot = 'RIGHT'; // Fileira 1 Direita (P2)
  if (segments[6]) segments[6].gridSlot = 'LEFT';  // Fileira 2 Esquerda (P3)
  if (segments[5]) segments[5].gridSlot = 'RIGHT'; // Fileira 2 Direita (P4)
  if (segments[3]) segments[3].gridSlot = 'LEFT';  // Fileira 3 Esquerda (P5)
  if (segments[2]) segments[2].gridSlot = 'RIGHT'; // Fileira 3 Direita (P6)
  if (segments[1]) segments[1].gridSlot = 'LEFT';  // Fileira 4 Esquerda (P7)
  if (segments[0]) segments[0].gridSlot = 'RIGHT'; // Fileira 4 Direita (Jogador)

  return segments;
}

// Draw a polygon strip for road / grass / rumble
export function drawPolygon(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
  x4: number,
  y4: number,
  color: string
) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineTo(x3, y3);
  ctx.lineTo(x4, y4);
  ctx.closePath();
  ctx.fill();
}

// Render a single road segment slice from p1 (closer) to p2 (farther)
export function renderSegment(
  ctx: CanvasRenderingContext2D,
  width: number,
  lanes: number,
  x1: number,
  y1: number,
  w1: number,
  x2: number,
  y2: number,
  w2: number,
  fog: number,
  color: RoadSegment['color'],
  isFinishLine?: boolean,
  gridSlot?: 'LEFT' | 'RIGHT' | 'BOTH'
) {
  const r1 = Math.max(2, w1 / 6);
  const r2 = Math.max(1, w2 / 6);

  // 1. Grass strip across the full width for this vertical slice [y2 .. y1]
  ctx.fillStyle = color.grass;
  ctx.fillRect(0, y2, width, Math.max(1, y1 - y2));

  // 2. Left Rumble strip
  drawPolygon(ctx, x1 - w1 - r1, y1, x1 - w1, y1, x2 - w2, y2, x2 - w2 - r2, y2, color.rumble);
  // 3. Right Rumble strip
  drawPolygon(ctx, x1 + w1, y1, x1 + w1 + r1, y1, x2 + w2 + r2, y2, x2 + w2, y2, color.rumble);

  // 4. Asphalt Road surface
  drawPolygon(ctx, x1 - w1, y1, x1 + w1, y1, x2 + w2, y2, x2 - w2, y2, color.road);

  // 5. Finish Line (checkered black & white flag blocks)
  if (isFinishLine) {
    const numChecks = 16;
    const checkW1 = (w1 * 2) / numChecks;
    const checkW2 = (w2 * 2) / numChecks;
    for (let c = 0; c < numChecks; c++) {
      const cx1 = x1 - w1 + c * checkW1;
      const cx2 = x2 - w2 + c * checkW2;
      const isWhite = c % 2 === 0;
      ctx.fillStyle = isWhite ? '#ffffff' : '#000000';
      drawPolygon(ctx, cx1, y1, cx1 + checkW1, y1, cx2 + checkW2, y2, cx2, y2, ctx.fillStyle);
    }
  } else if (gridSlot) {
    // Starting Grid Box lines on asphalt
    if (gridSlot === 'LEFT' || gridSlot === 'BOTH') {
      const bx1 = x1 - w1 * 0.60;
      const bx2 = x1 - w1 * 0.10;
      const fbx1 = x2 - w2 * 0.60;
      const fbx2 = x2 - w2 * 0.10;
      drawPolygon(ctx, bx1, y1, bx2, y1, fbx2, y2, fbx1, y2, 'rgba(255,255,255,0.75)');
    }
    if (gridSlot === 'RIGHT' || gridSlot === 'BOTH') {
      const bx1 = x1 + w1 * 0.10;
      const bx2 = x1 + w1 * 0.60;
      const fbx1 = x2 + w2 * 0.10;
      const fbx2 = x2 + w2 * 0.60;
      drawPolygon(ctx, bx1, y1, bx2, y1, fbx2, y2, fbx1, y2, 'rgba(255,255,255,0.75)');
    }
  } else if (color.lane) {
    // 6. Dashed White / Yellow Center Lane
    const lw1 = Math.max(2, w1 / 26);
    const lw2 = Math.max(1, w2 / 26);
    drawPolygon(ctx, x1 - lw1, y1, x1 + lw1, y1, x2 + lw2, y2, x2 - lw2, y2, color.lane);
  }
}

// Draw pixel-style scenery elements (Cactus, Palm, Villa, Cherry Blossom, Neon Billboard, Pine, Windmill, Rock, Sign)
export function renderSprite(
  ctx: CanvasRenderingContext2D,
  type: string,
  screenX: number,
  screenY: number,
  scale: number,
  horizonType: string,
  roadW?: number,
  clipY?: number
) {
  if (clipY !== undefined && screenY >= clipY) return;

  const baseSize = roadW ? roadW * 0.72 : Math.max(10, scale * 110000);
  const size = Math.max(6, Math.min(260, Math.round(baseSize)));
  const w = size;
  const h = Math.round(size * 1.3);
  const x = Math.round(screenX - w / 2);
  const y = Math.round(screenY - h);

  if (size < 3) return;

  ctx.save();

  switch (type) {
    case 'CACTUS': {
      // Saguaro cactus
      ctx.fillStyle = '#15803d';
      // Main trunk
      ctx.fillRect(x + w * 0.42, y, w * 0.16, h);
      // Left arm
      ctx.fillRect(x + w * 0.15, y + h * 0.35, w * 0.28, h * 0.12);
      ctx.fillRect(x + w * 0.15, y + h * 0.15, w * 0.14, h * 0.25);
      // Right arm
      ctx.fillRect(x + w * 0.55, y + h * 0.45, w * 0.3, h * 0.12);
      ctx.fillRect(x + w * 0.72, y + h * 0.25, w * 0.14, h * 0.25);
      // Highlight
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(x + w * 0.45, y, w * 0.05, h);
      break;
    }
    case 'PALM': {
      // Palm tree
      ctx.fillStyle = '#78350f';
      ctx.fillRect(x + w * 0.45, y + h * 0.3, w * 0.1, h * 0.7);
      // Palm fronds
      ctx.fillStyle = '#16a34a';
      ctx.beginPath();
      ctx.arc(x + w * 0.5, y + h * 0.3, w * 0.45, Math.PI, 2 * Math.PI);
      ctx.fill();
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.arc(x + w * 0.3, y + h * 0.35, w * 0.3, 0.8 * Math.PI, 1.8 * Math.PI);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + w * 0.7, y + h * 0.35, w * 0.3, 1.2 * Math.PI, 2.2 * Math.PI);
      ctx.fill();
      break;
    }
    case 'CHERRY_BLOSSOM': {
      // Cherry blossom tree for Neo-Tokyo
      ctx.fillStyle = '#451a03';
      ctx.fillRect(x + w * 0.44, y + h * 0.4, w * 0.12, h * 0.6);
      ctx.fillStyle = '#f472b6';
      ctx.beginPath();
      ctx.arc(x + w * 0.5, y + h * 0.35, w * 0.4, 0, 2 * Math.PI);
      ctx.fill();
      ctx.fillStyle = '#fbcfe8';
      ctx.beginPath();
      ctx.arc(x + w * 0.45, y + h * 0.28, w * 0.25, 0, 2 * Math.PI);
      ctx.fill();
      break;
    }
    case 'NEON_BILLBOARD': {
      // Cyberpunk billboard
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(x, y + h * 0.1, w, h * 0.5);
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = Math.max(1, Math.round(3 * scale));
      ctx.strokeRect(x, y + h * 0.1, w, h * 0.5);
      ctx.fillStyle = '#ec4899';
      ctx.fillRect(x + w * 0.1, y + h * 0.22, w * 0.8, h * 0.25);
      // Legs
      ctx.fillStyle = '#334155';
      ctx.fillRect(x + w * 0.2, y + h * 0.6, w * 0.08, h * 0.4);
      ctx.fillRect(x + w * 0.72, y + h * 0.6, w * 0.08, h * 0.4);
      break;
    }
    case 'PINE': {
      // Alpine pine tree
      ctx.fillStyle = '#451a03';
      ctx.fillRect(x + w * 0.44, y + h * 0.7, w * 0.12, h * 0.3);
      ctx.fillStyle = '#166534';
      // Triangle layers
      for (let i = 0; i < 3; i++) {
        const topY = y + i * h * 0.22;
        const botY = topY + h * 0.38;
        const spread = w * (0.28 + i * 0.16);
        ctx.beginPath();
        ctx.moveTo(x + w * 0.5, topY);
        ctx.lineTo(x + w * 0.5 - spread, botY);
        ctx.lineTo(x + w * 0.5 + spread, botY);
        ctx.closePath();
        ctx.fill();
      }
      break;
    }
    case 'ROCK': {
      ctx.fillStyle = horizonType === 'DESERT' ? '#b45309' : '#64748b';
      ctx.beginPath();
      ctx.ellipse(x + w * 0.5, y + h * 0.7, w * 0.4, h * 0.25, 0, 0, 2 * Math.PI);
      ctx.fill();
      ctx.fillStyle = horizonType === 'DESERT' ? '#f59e0b' : '#94a3b8';
      ctx.beginPath();
      ctx.ellipse(x + w * 0.45, y + h * 0.65, w * 0.25, h * 0.15, -0.2, 0, 2 * Math.PI);
      ctx.fill();
      break;
    }
    case 'POTHOLE': {
      // High-Visibility Asphalt Pothole / Crater (Buraco com marcação amarela e fenda profunda)
      // 1. Neon/Yellow Road-Work Caution Spray Paint Outline (makes it pop instantly on road)
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.ellipse(screenX, screenY - 4, w * 0.52, h * 0.28, 0, 0, Math.PI * 2);
      ctx.fill();

      // 2. Asphalt Rim
      ctx.fillStyle = '#18181b';
      ctx.beginPath();
      ctx.ellipse(screenX, screenY - 4, w * 0.46, h * 0.24, 0, 0, Math.PI * 2);
      ctx.fill();

      // 3. Deep Pit Abyss Center
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.ellipse(screenX, screenY - 3, w * 0.38, h * 0.18, 0, 0, Math.PI * 2);
      ctx.fill();

      // 4. Sharp Asphalt Cracks Radiating Out
      ctx.fillStyle = '#facc15';
      ctx.fillRect(screenX - w * 0.50, screenY - 8, w * 0.15, 2);
      ctx.fillRect(screenX + w * 0.35, screenY - 7, w * 0.18, 2);
      ctx.fillStyle = '#3f3f46';
      ctx.fillRect(screenX - w * 0.25, screenY - 3, w * 0.16, 2);
      ctx.fillRect(screenX + w * 0.10, screenY - 2, w * 0.20, 2);

      // 5. High-contrast gravel chunks
      ctx.fillStyle = '#d4d4d8';
      ctx.fillRect(screenX - w * 0.35, screenY - 6, Math.max(3, w * 0.05), Math.max(2, h * 0.04));
      ctx.fillRect(screenX + w * 0.30, screenY - 5, Math.max(3, w * 0.05), Math.max(2, h * 0.04));
      break;
    }
    case 'OIL_SLICK': {
      // Iridescent High-Visibility Oil Slick on asphalt
      // 1. Dark glossy base puddle
      ctx.fillStyle = '#050508';
      ctx.beginPath();
      ctx.ellipse(screenX, screenY - 4, w * 0.56, h * 0.24, 0, 0, Math.PI * 2);
      ctx.fill();

      // 2. Neon Electric Cyan Iridescence
      ctx.fillStyle = 'rgba(6, 182, 212, 0.75)';
      ctx.beginPath();
      ctx.ellipse(screenX - w * 0.12, screenY - 5, w * 0.34, h * 0.14, -0.2, 0, Math.PI * 2);
      ctx.fill();

      // 3. Neon Magenta / Violet Iridescence
      ctx.fillStyle = 'rgba(217, 70, 239, 0.75)';
      ctx.beginPath();
      ctx.ellipse(screenX + w * 0.14, screenY - 4, w * 0.28, h * 0.12, 0.25, 0, Math.PI * 2);
      ctx.fill();

      // 4. Acid Yellow-Green Gleam
      ctx.fillStyle = 'rgba(163, 230, 53, 0.7)';
      ctx.beginPath();
      ctx.ellipse(screenX, screenY - 3, w * 0.18, h * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'ROAD_BARRIER': {
      // Heavy Traffic Construction Barrier (Red/White Chevrons + Flashing Light)
      const barW = Math.max(20, w * 0.95);
      const barH = Math.max(16, h * 0.65);
      const barX = screenX - barW / 2;
      const barY = screenY - barH;

      // Heavy black rubber footings
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(barX + barW * 0.08, screenY - 5, barW * 0.18, 5);
      ctx.fillRect(barX + barW * 0.74, screenY - 5, barW * 0.18, 5);
      ctx.fillRect(barX + barW * 0.14, barY + 4, barW * 0.06, barH - 4);
      ctx.fillRect(barX + barW * 0.80, barY + 4, barW * 0.06, barH - 4);

      // Barrier Plank Background (White)
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(barX, barY + barH * 0.18, barW, barH * 0.58);

      // Bright Orange-Red Diagonal Chevrons
      ctx.fillStyle = '#f97316';
      const stripeW = barW * 0.20;
      for (let s = -stripeW; s < barW + stripeW; s += stripeW * 2) {
        ctx.beginPath();
        ctx.moveTo(barX + s, barY + barH * 0.18);
        ctx.lineTo(barX + s + stripeW, barY + barH * 0.18);
        ctx.lineTo(barX + s + stripeW - barW * 0.12, barY + barH * 0.76);
        ctx.lineTo(barX + s - barW * 0.12, barY + barH * 0.76);
        ctx.closePath();
        ctx.fill();
      }

      // Dark Border
      ctx.strokeStyle = '#09090b';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(barX, barY + barH * 0.18, barW, barH * 0.58);

      // Glowing Amber Flashing Light on Top
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(screenX, barY + barH * 0.1, Math.max(4, barW * 0.12), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(screenX, barY + barH * 0.1, Math.max(2.5, barW * 0.07), 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'ROAD_CONE': {
      // 3D Fluorescent Traffic Safety Cone
      const coneW = Math.max(14, w * 0.55);
      const coneH = Math.max(18, h * 0.80);
      const coneX = screenX;
      const coneY = screenY;

      // Black rubber base
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(coneX - coneW * 0.5, coneY - 4, coneW, 4);

      // Bright Fluorescent Orange cone body
      ctx.fillStyle = '#ff6b00';
      ctx.beginPath();
      ctx.moveTo(coneX, coneY - coneH);
      ctx.lineTo(coneX + coneW * 0.45, coneY - 4);
      ctx.lineTo(coneX - coneW * 0.45, coneY - 4);
      ctx.closePath();
      ctx.fill();

      // Top Reflective White Safety Band
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(coneX - coneW * 0.20, coneY - coneH * 0.65);
      ctx.lineTo(coneX + coneW * 0.20, coneY - coneH * 0.65);
      ctx.lineTo(coneX + coneW * 0.28, coneY - coneH * 0.45);
      ctx.lineTo(coneX - coneW * 0.28, coneY - coneH * 0.45);
      ctx.closePath();
      ctx.fill();

      // Bottom Reflective White Safety Band
      ctx.beginPath();
      ctx.moveTo(coneX - coneW * 0.32, coneY - coneH * 0.35);
      ctx.lineTo(coneX + coneW * 0.32, coneY - coneH * 0.35);
      ctx.lineTo(coneX + coneW * 0.40, coneY - coneH * 0.18);
      ctx.lineTo(coneX - coneW * 0.40, coneY - coneH * 0.18);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'SIGN_LEFT': {
      // Roadside Curve Left Sign (Placa de curva perigosa à esquerda)
      const postW = Math.max(2, w * 0.08);
      const signW = Math.max(14, w * 0.65);
      const signH = signW;
      const postH = h * 0.95;

      // Post
      ctx.fillStyle = '#64748b';
      ctx.fillRect(screenX - postW / 2, screenY - postH, postW, postH);

      // Yellow Diamond Warning Sign
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.moveTo(screenX, screenY - postH);
      ctx.lineTo(screenX + signW / 2, screenY - postH + signH / 2);
      ctx.lineTo(screenX, screenY - postH + signH);
      ctx.lineTo(screenX - signW / 2, screenY - postH + signH / 2);
      ctx.closePath();
      ctx.fill();

      // Black arrow pointing LEFT
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(screenX - signW * 0.20, screenY - postH + signH * 0.5);
      ctx.lineTo(screenX + signW * 0.15, screenY - postH + signH * 0.25);
      ctx.lineTo(screenX + signW * 0.15, screenY - postH + signH * 0.42);
      ctx.lineTo(screenX + signW * 0.25, screenY - postH + signH * 0.42);
      ctx.lineTo(screenX + signW * 0.25, screenY - postH + signH * 0.58);
      ctx.lineTo(screenX + signW * 0.15, screenY - postH + signH * 0.58);
      ctx.lineTo(screenX + signW * 0.15, screenY - postH + signH * 0.75);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'SIGN_RIGHT': {
      // Roadside Curve Right Sign (Placa de curva perigosa à direita)
      const postW = Math.max(2, w * 0.08);
      const signW = Math.max(14, w * 0.65);
      const signH = signW;
      const postH = h * 0.95;

      // Post
      ctx.fillStyle = '#64748b';
      ctx.fillRect(screenX - postW / 2, screenY - postH, postW, postH);

      // Yellow Diamond Warning Sign
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.moveTo(screenX, screenY - postH);
      ctx.lineTo(screenX + signW / 2, screenY - postH + signH / 2);
      ctx.lineTo(screenX, screenY - postH + signH);
      ctx.lineTo(screenX - signW / 2, screenY - postH + signH / 2);
      ctx.closePath();
      ctx.fill();

      // Black arrow pointing RIGHT
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(screenX + signW * 0.20, screenY - postH + signH * 0.5);
      ctx.lineTo(screenX - signW * 0.15, screenY - postH + signH * 0.25);
      ctx.lineTo(screenX - signW * 0.15, screenY - postH + signH * 0.42);
      ctx.lineTo(screenX - signW * 0.25, screenY - postH + signH * 0.42);
      ctx.lineTo(screenX - signW * 0.25, screenY - postH + signH * 0.58);
      ctx.lineTo(screenX - signW * 0.15, screenY - postH + signH * 0.58);
      ctx.lineTo(screenX - signW * 0.15, screenY - postH + signH * 0.75);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'SIGN_SPEED': {
      // Speed limit sign
      const postW = Math.max(2, w * 0.08);
      const signR = Math.max(7, w * 0.28);
      const postH = h * 0.9;
      // Post
      ctx.fillStyle = '#64748b';
      ctx.fillRect(screenX - postW / 2, screenY - postH, postW, postH);
      // Red circular border
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(screenX, screenY - postH + signR, signR, 0, Math.PI * 2);
      ctx.fill();
      // White center
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(screenX, screenY - postH + signR, signR * 0.78, 0, Math.PI * 2);
      ctx.fill();
      // Number 120
      ctx.fillStyle = '#09090b';
      ctx.font = `bold ${Math.max(6, Math.round(signR * 0.85))}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('120', screenX, screenY - postH + signR);
      break;
    }
    case 'SIGN_DANGER': {
      // Danger exclamation sign
      const postW = Math.max(2, w * 0.08);
      const signW = Math.max(14, w * 0.65);
      const signH = signW * 0.85;
      const postH = h * 0.95;
      // Post
      ctx.fillStyle = '#64748b';
      ctx.fillRect(screenX - postW / 2, screenY - postH, postW, postH);
      // Yellow Triangle
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.moveTo(screenX, screenY - postH);
      ctx.lineTo(screenX + signW / 2, screenY - postH + signH);
      ctx.lineTo(screenX - signW / 2, screenY - postH + signH);
      ctx.closePath();
      ctx.fill();
      // Black exclamation mark
      ctx.fillStyle = '#09090b';
      ctx.fillRect(screenX - 1.5, screenY - postH + signH * 0.35, 3, signH * 0.35);
      ctx.fillRect(screenX - 1.5, screenY - postH + signH * 0.80, 3, 3);
      break;
    }
    case 'SIGN':
    default: {
      // Road hazard / chevron sign
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(x + w * 0.45, y + h * 0.4, w * 0.1, h * 0.6);
      ctx.fillStyle = '#eab308';
      ctx.fillRect(x + w * 0.15, y + h * 0.1, w * 0.7, h * 0.4);
      ctx.fillStyle = '#0f172a';
      // Chevron arrow
      ctx.beginPath();
      ctx.moveTo(x + w * 0.35, y + h * 0.2);
      ctx.lineTo(x + w * 0.65, y + h * 0.3);
      ctx.lineTo(x + w * 0.35, y + h * 0.4);
      ctx.closePath();
      ctx.fill();
      break;
    }
  }

  ctx.restore();
}

// Render rival combat car on the road (MUSCULAR COMBAT CAR WITH REALISTIC PERSPECTIVE)
export function renderRacerSprite(
  ctx: CanvasRenderingContext2D,
  racer: CombatRacer,
  screenX: number,
  screenY: number,
  scale: number,
  isOpponent: boolean = true,
  roadW?: number,
  clipY?: number
) {
  // If base of car is below hill clip, it is hidden behind a hill crest
  if (clipY !== undefined && screenY >= clipY) return;

  // Car occupies approx 38% of projected road width for seamless 3D perspective
  const baseW = (roadW && roadW > 0) ? roadW * 0.38 : Math.max(18, scale * 95000);
  const w = Math.max(18, Math.min(240, Math.round(baseW)));
  const h = Math.round(w * 0.62);
  const x = Math.round(screenX - w / 2);
  const y = Math.round(screenY - h);

  if (isNaN(w) || isNaN(h) || isNaN(x) || isNaN(y) || w < 8 || h < 6) return;

  ctx.save();

  // Contact / bump friction flash
  if (racer.staggerTimer > 0 && Math.floor(Date.now() / 50) % 2 === 0) {
    ctx.filter = 'brightness(1.8) contrast(1.4)';
  }

  // 1. Soft ground contact shadow
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.beginPath();
  ctx.ellipse(screenX, screenY - 2, w * 0.52, h * 0.16, 0, 0, 2 * Math.PI);
  ctx.fill();

  // 2. Wide Racing Tires (Left and Right)
  const wheelW = Math.max(3, w * 0.18);
  const wheelH = Math.max(4, h * 0.44);
  
  // Left Tire
  ctx.fillStyle = '#09090b';
  ctx.fillRect(x + w * 0.03, y + h * 0.54, wheelW, wheelH);
  // Right Tire
  ctx.fillRect(x + w * 0.79, y + h * 0.54, wheelW, wheelH);

  // Tire Treads & Rim Spoke highlights
  ctx.fillStyle = '#27272a';
  ctx.fillRect(x + w * 0.05, y + h * 0.60, wheelW * 0.75, wheelH * 0.32);
  ctx.fillRect(x + w * 0.81, y + h * 0.60, wheelW * 0.75, wheelH * 0.32);
  
  // Alloy wheel rims
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(x + w * 0.07, y + h * 0.66, wheelW * 0.52, wheelH * 0.35);
  ctx.fillRect(x + w * 0.83, y + h * 0.66, wheelW * 0.52, wheelH * 0.35);

  // 3. Lower Rear Carbon Diffuser
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(x + w * 0.12, y + h * 0.68, w * 0.76, h * 0.22);

  // Dual Exhaust Tips
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(x + w * 0.22, y + h * 0.80, w * 0.10, h * 0.10);
  ctx.fillRect(x + w * 0.68, y + h * 0.80, w * 0.10, h * 0.10);
  ctx.fillStyle = '#09090b';
  ctx.fillRect(x + w * 0.24, y + h * 0.82, w * 0.06, h * 0.06);
  ctx.fillRect(x + w * 0.70, y + h * 0.82, w * 0.06, h * 0.06);

  // Dynamic exhaust fire flames when speeding
  if (racer.speed > 80 && Math.random() > 0.25) {
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(x + w * 0.23, y + h * 0.88, w * 0.08, h * 0.16 + Math.random() * 4);
    ctx.fillRect(x + w * 0.69, y + h * 0.88, w * 0.08, h * 0.16 + Math.random() * 4);
  }

  // 4. Main Aerodynamic Car Bodywork (Sculpted Muscular Rear)
  ctx.fillStyle = racer.bikeColor;
  ctx.beginPath();
  ctx.moveTo(x + w * 0.08, y + h * 0.70);
  ctx.lineTo(x + w * 0.14, y + h * 0.34);
  ctx.lineTo(x + w * 0.86, y + h * 0.34);
  ctx.lineTo(x + w * 0.92, y + h * 0.70);
  ctx.lineTo(x + w * 0.84, y + h * 0.86);
  ctx.lineTo(x + w * 0.16, y + h * 0.86);
  ctx.closePath();
  ctx.fill();

  // Glossy Body Highlight
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.fillRect(x + w * 0.16, y + h * 0.35, w * 0.68, h * 0.08);

  // Racing Center Livery Stripe
  ctx.fillStyle = racer.suitColor;
  ctx.fillRect(x + w * 0.44, y + h * 0.34, w * 0.12, h * 0.52);

  // 5. Rear Tinted Windshield & Cabin Roof
  ctx.fillStyle = '#020617';
  ctx.beginPath();
  ctx.moveTo(x + w * 0.24, y + h * 0.38);
  ctx.lineTo(x + w * 0.30, y + h * 0.14);
  ctx.lineTo(x + w * 0.70, y + h * 0.14);
  ctx.lineTo(x + w * 0.76, y + h * 0.38);
  ctx.closePath();
  ctx.fill();

  // Glass specular reflection
  ctx.fillStyle = '#38bdf8';
  ctx.beginPath();
  ctx.moveTo(x + w * 0.32, y + h * 0.34);
  ctx.lineTo(x + w * 0.38, y + h * 0.18);
  ctx.lineTo(x + w * 0.48, y + h * 0.18);
  ctx.lineTo(x + w * 0.42, y + h * 0.34);
  ctx.closePath();
  ctx.fill();

  // 6. Aerodynamic Rear GT Wing / Spoiler
  ctx.fillStyle = racer.bikeColor;
  ctx.fillRect(x + w * 0.06, y + h * 0.20, w * 0.88, h * 0.10);
  // Spoiler struts
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(x + w * 0.24, y + h * 0.28, w * 0.06, h * 0.12);
  ctx.fillRect(x + w * 0.70, y + h * 0.28, w * 0.06, h * 0.12);
  // Spoiler wing endplates
  ctx.fillStyle = '#09090b';
  ctx.fillRect(x + w * 0.04, y + h * 0.16, w * 0.04, h * 0.18);
  ctx.fillRect(x + w * 0.92, y + h * 0.16, w * 0.04, h * 0.18);

  // 7. Glowing LED Taillights (Modern lightbar)
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(x + w * 0.14, y + h * 0.48, w * 0.72, h * 0.08);
  ctx.fillStyle = '#fecaca';
  ctx.fillRect(x + w * 0.16, y + h * 0.50, w * 0.68, h * 0.03);

  // 8. Dynamic Bump Friction Sparks when in contact
  if (racer.staggerTimer > 0) {
    ctx.fillStyle = '#fef08a';
    for (let s = 0; s < 6; s++) {
      ctx.fillRect(
        x + Math.random() * w,
        y + h * 0.4 + Math.random() * h * 0.5,
        Math.max(2, w * 0.03),
        Math.max(2, w * 0.03)
      );
    }
  }

  ctx.restore();
}

// Render Player Sports Car in cockpit/third-person view at bottom center
export function renderPlayerBike(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  speedRatio: number,
  steer: number,
  isBoosting: boolean,
  isAttacking: 'LEFT' | 'RIGHT' | null,
  attackType: 'PUNCH' | 'KICK' | 'WEAPON',
  bikeColor: string,
  weapon: string,
  isWipedOut: boolean
) {
  renderPlayerCar(
    ctx,
    width,
    height,
    speedRatio,
    steer,
    isBoosting,
    isAttacking,
    attackType,
    bikeColor,
    weapon,
    isWipedOut
  );
}

export function renderPlayerCar(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  speedRatio: number,
  steer: number,
  isBoosting: boolean,
  isAttacking: 'LEFT' | 'RIGHT' | null,
  attackType: 'PUNCH' | 'KICK' | 'WEAPON',
  carColor: string,
  weapon: string,
  isWipedOut: boolean
) {
  const carWidth = Math.round(width * 0.35);
  const carHeight = Math.round(height * 0.25);
  // Car remains anchored fixed at the exact center of the screen
  const centerX = width / 2;
  const centerY = height - 10;

  ctx.save();

  // Dynamic engine and speed rumble vibration
  const shakeX = (Math.random() - 0.5) * speedRatio * 2.5;
  const shakeY = (Math.random() - 0.5) * speedRatio * 1.8;

  ctx.translate(centerX + shakeX, centerY + shakeY);

  // Rotate slightly in the direction the car is turning (steer: -1 = left, +1 = right)
  const turnRotation = steer * 0.085;
  if (turnRotation !== 0) {
    ctx.rotate(turnRotation);
  }

  // 1. Ground Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.beginPath();
  ctx.ellipse(0, -6, carWidth * 0.52, carHeight * 0.16, 0, 0, 2 * Math.PI);
  ctx.fill();

  // 2. Nitro Boost Rocket Exhaust Flames
  if (isBoosting) {
    // Left Thruster Flame
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(-carWidth * 0.28, -carHeight * 0.14);
    ctx.lineTo(-carWidth * 0.22, carHeight * 0.24 + Math.random() * 26);
    ctx.lineTo(-carWidth * 0.16, -carHeight * 0.14);
    ctx.fill();

    // Right Thruster Flame
    ctx.beginPath();
    ctx.moveTo(carWidth * 0.16, -carHeight * 0.14);
    ctx.lineTo(carWidth * 0.22, carHeight * 0.24 + Math.random() * 26);
    ctx.lineTo(carWidth * 0.28, -carHeight * 0.14);
    ctx.fill();

    // Inner White-Hot Flame Core
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(-carWidth * 0.24, -carHeight * 0.10, carWidth * 0.05, carHeight * 0.20);
    ctx.fillRect(carWidth * 0.19, -carHeight * 0.10, carWidth * 0.05, carHeight * 0.20);
  }

  // 3. Wide Rear Racing Tires (Left & Right)
  const tireW = carWidth * 0.18;
  const tireH = carHeight * 0.48;

  // Left Rear Tire
  ctx.fillStyle = '#09090b';
  ctx.fillRect(-carWidth * 0.48, -carHeight * 0.52, tireW, tireH);
  // Right Rear Tire
  ctx.fillRect(carWidth * 0.30, -carHeight * 0.52, tireW, tireH);

  // Tire Treads animation matching road speed
  ctx.fillStyle = '#27272a';
  const treadOffset = (Date.now() / 12) % 18;
  for (let t = -carHeight * 0.48; t < -carHeight * 0.08; t += 14) {
    ctx.fillRect(-carWidth * 0.46, t + (treadOffset % 14), tireW * 0.8, 4);
    ctx.fillRect(carWidth * 0.32, t + (treadOffset % 14), tireW * 0.8, 4);
  }

  // Brembo Brake Calipers
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(-carWidth * 0.34, -carHeight * 0.36, 6, 16);
  ctx.fillRect(carWidth * 0.32, -carHeight * 0.36, 6, 16);

  // 4. Rear Lower Carbon Diffuser & Quad Exhausts
  ctx.fillStyle = '#18181b';
  ctx.fillRect(-carWidth * 0.36, -carHeight * 0.32, carWidth * 0.72, carHeight * 0.24);

  // Quad Chrome Exhausts
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(-carWidth * 0.30, -carHeight * 0.22, carWidth * 0.07, carHeight * 0.12);
  ctx.fillRect(-carWidth * 0.20, -carHeight * 0.22, carWidth * 0.07, carHeight * 0.12);
  ctx.fillRect(carWidth * 0.13, -carHeight * 0.22, carWidth * 0.07, carHeight * 0.12);
  ctx.fillRect(carWidth * 0.23, -carHeight * 0.22, carWidth * 0.07, carHeight * 0.12);

  // Exhaust dark holes
  ctx.fillStyle = '#09090b';
  ctx.fillRect(-carWidth * 0.29, -carHeight * 0.18, carWidth * 0.05, carHeight * 0.06);
  ctx.fillRect(-carWidth * 0.19, -carHeight * 0.18, carWidth * 0.05, carHeight * 0.06);
  ctx.fillRect(carWidth * 0.14, -carHeight * 0.18, carWidth * 0.05, carHeight * 0.06);
  ctx.fillRect(carWidth * 0.24, -carHeight * 0.18, carWidth * 0.05, carHeight * 0.06);

  // 5. Main Car Rear Bodywork (Sculpted Muscular Haunches)
  ctx.fillStyle = carColor;
  ctx.beginPath();
  ctx.moveTo(-carWidth * 0.44, -carHeight * 0.46);
  ctx.lineTo(-carWidth * 0.38, -carHeight * 0.74);
  ctx.lineTo(carWidth * 0.38, -carHeight * 0.74);
  ctx.lineTo(carWidth * 0.44, -carHeight * 0.46);
  ctx.lineTo(carWidth * 0.38, -carHeight * 0.24);
  ctx.lineTo(-carWidth * 0.38, -carHeight * 0.24);
  ctx.closePath();
  ctx.fill();

  // Specular Top Gloss Highlight
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(-carWidth * 0.36, -carHeight * 0.72, carWidth * 0.72, carHeight * 0.06);

  // Racing Center Dual Stripes
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(-carWidth * 0.06, -carHeight * 0.74, carWidth * 0.05, carHeight * 0.48);
  ctx.fillRect(carWidth * 0.01, -carHeight * 0.74, carWidth * 0.05, carHeight * 0.48);

  // 6. Rear Slanted Window & Roof
  ctx.fillStyle = '#020617';
  ctx.beginPath();
  ctx.moveTo(-carWidth * 0.28, -carHeight * 0.72);
  ctx.lineTo(-carWidth * 0.20, -carHeight * 0.94);
  ctx.lineTo(carWidth * 0.20, -carHeight * 0.94);
  ctx.lineTo(carWidth * 0.28, -carHeight * 0.72);
  ctx.closePath();
  ctx.fill();

  // Rear window aerodynamic glass reflections
  ctx.fillStyle = '#38bdf8';
  ctx.beginPath();
  ctx.moveTo(-carWidth * 0.16, -carHeight * 0.74);
  ctx.lineTo(-carWidth * 0.12, -carHeight * 0.90);
  ctx.lineTo(0, -carHeight * 0.90);
  ctx.lineTo(-carWidth * 0.04, -carHeight * 0.74);
  ctx.closePath();
  ctx.fill();

  // Internal roll cage
  ctx.strokeStyle = '#f87171';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-carWidth * 0.18, -carHeight * 0.75);
  ctx.lineTo(carWidth * 0.18, -carHeight * 0.92);
  ctx.stroke();

  // 7. Full-Width Glowing LED Taillight Array
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(-carWidth * 0.36, -carHeight * 0.58, carWidth * 0.72, carHeight * 0.10);
  ctx.fillStyle = '#fecaca';
  ctx.fillRect(-carWidth * 0.34, -carHeight * 0.56, carWidth * 0.68, carHeight * 0.04);

  // Rear Racing Plate
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(-carWidth * 0.11, -carHeight * 0.44, carWidth * 0.22, carHeight * 0.09);
  ctx.fillStyle = '#f8fafc';
  ctx.font = `900 ${Math.max(8, Math.round(carWidth * 0.038))}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillText('ROADKILL', 0, -carHeight * 0.375);

  // 8. Elevated High-Downforce GT Spoiler / Wing
  ctx.fillStyle = carColor;
  ctx.fillRect(-carWidth * 0.48, -carHeight * 0.88, carWidth * 0.96, carHeight * 0.09);
  // Carbon wing struts
  ctx.fillStyle = '#09090b';
  ctx.fillRect(-carWidth * 0.26, -carHeight * 0.82, carWidth * 0.06, carHeight * 0.12);
  ctx.fillRect(carWidth * 0.20, -carHeight * 0.82, carWidth * 0.06, carHeight * 0.12);
  // Wing endplates
  ctx.fillStyle = '#18181b';
  ctx.fillRect(-carWidth * 0.50, -carHeight * 0.92, carWidth * 0.04, carHeight * 0.16);
  ctx.fillRect(carWidth * 0.46, -carHeight * 0.92, carWidth * 0.04, carHeight * 0.16);

  // 9. Tactical Side-Bump Ram Effects when attacking
  if (isAttacking) {
    const isLeft = isAttacking === 'LEFT';
    const ramSide = isLeft ? -1 : 1;
    const ramStartX = ramSide * (carWidth * 0.44);
    const ramY = -carHeight * 0.48;

    // Heavy reinforced bumper shockplate
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(
      isLeft ? ramStartX - carWidth * 0.18 : ramStartX,
      ramY,
      carWidth * 0.18,
      carHeight * 0.14
    );

    // Friction sparks
    ctx.fillStyle = '#fef08a';
    for (let k = 0; k < 6; k++) {
      ctx.fillRect(
        ramStartX + ramSide * (Math.random() * carWidth * 0.20),
        ramY + (Math.random() - 0.5) * carHeight * 0.2,
        4,
        4
      );
    }
  }

  ctx.restore();
}

// Draw multi-layered parallax sky and landscapes (OutRun / Road Rash arcade style)
export function renderBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  skyColors: [string, string],
  horizonType: string,
  skyOffset: number = 0,
  distantOffset: number = 0,
  midOffset: number = 0,
  nearOffset: number = 0,
  raceTime: number = 0
) {
  const horizonY = height / 2;

  // 1. Base Sky Gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY);
  skyGrad.addColorStop(0, skyColors[0]);
  skyGrad.addColorStop(1, skyColors[1]);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, width, horizonY);

  // Helper for periodic wrap-around positioning
  const wrap = (val: number, period: number = width) => {
    return ((val % period) + period) % period;
  };

  ctx.save();

  // 2. CELESTIAL BODIES & AMBIENT CLOUDS (Gentle, very slow drift)
  const cloudPan = wrap(-skyOffset * 0.04 - raceTime * 1.5, width);

  if (horizonType === 'CITY_NIGHT') {
    // Night Stars & Glowing Moon
    ctx.fillStyle = '#f8fafc';
    for (let s = 0; s < 25; s++) {
      const starX = wrap(s * 73 + skyOffset * 0.05, width);
      const starY = (s * 37) % (horizonY * 0.7);
      const twinkle = ((Math.sin(raceTime * 3 + s) + 1) / 2) > 0.3 ? 1.5 : 0.8;
      ctx.fillRect(starX, starY, twinkle, twinkle);
    }
    // Neon Crescent Moon
    const moonX = wrap(width * 0.78 + skyOffset * 0.08, width);
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(moonX, horizonY * 0.28, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = skyColors[0];
    ctx.beginPath();
    ctx.arc(moonX + 5, horizonY * 0.25, 12, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Glowing Sun
    const sunX = wrap(width * 0.72 + skyOffset * 0.06, width);
    const sunY = horizonY * 0.35;
    ctx.fillStyle = horizonType === 'DESERT' ? 'rgba(251, 146, 60, 0.45)' : 'rgba(254, 240, 138, 0.35)';
    ctx.beginPath();
    ctx.arc(sunX, sunY, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = horizonType === 'DESERT' ? '#fdba74' : '#fef08a';
    ctx.beginPath();
    ctx.arc(sunX, sunY, 15, 0, Math.PI * 2);
    ctx.fill();

    // Floating Puffy Arcade Clouds
    ctx.fillStyle = horizonType === 'DESERT' ? 'rgba(254, 215, 170, 0.35)' : 'rgba(255, 255, 255, 0.45)';
    for (let c = -1; c <= 2; c++) {
      const cx = c * (width * 0.7) + cloudPan;
      ctx.beginPath();
      ctx.ellipse(cx + 40, horizonY * 0.22, 35, 10, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + 65, horizonY * 0.18, 26, 12, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + 85, horizonY * 0.22, 28, 9, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ==========================================
  // LAYER 1: DISTANT PARALLAX BACKDROP (Slow)
  // ==========================================
  const panDist = wrap(-distantOffset * 0.08, width);

  if (horizonType === 'DESERT') {
    // Distant Purple Mountain Ridge
    ctx.fillStyle = '#581c87';
    for (let i = -1; i <= 2; i++) {
      const baseX = i * width + panDist;
      ctx.beginPath();
      ctx.moveTo(baseX, horizonY);
      ctx.lineTo(baseX + width * 0.15, horizonY - height * 0.22);
      ctx.lineTo(baseX + width * 0.35, horizonY - height * 0.14);
      ctx.lineTo(baseX + width * 0.60, horizonY - height * 0.26);
      ctx.lineTo(baseX + width * 0.85, horizonY - height * 0.16);
      ctx.lineTo(baseX + width, horizonY);
      ctx.closePath();
      ctx.fill();
    }
  } else if (horizonType === 'COAST') {
    // Distant Ocean Island Headlands
    ctx.fillStyle = '#0369a1';
    for (let i = -1; i <= 2; i++) {
      const baseX = i * width + panDist;
      ctx.beginPath();
      ctx.ellipse(baseX + width * 0.25, horizonY, width * 0.30, height * 0.12, 0, Math.PI, 2 * Math.PI);
      ctx.ellipse(baseX + width * 0.75, horizonY, width * 0.22, height * 0.09, 0, Math.PI, 2 * Math.PI);
      ctx.fill();
    }
  } else if (horizonType === 'CITY_NIGHT') {
    // Distant Skyline & Snow-capped Mount Fuji
    for (let i = -1; i <= 2; i++) {
      const baseX = i * width + panDist;
      // Mount Fuji silhouette
      ctx.fillStyle = '#1e1b4b';
      ctx.beginPath();
      ctx.moveTo(baseX + width * 0.55, horizonY);
      ctx.lineTo(baseX + width * 0.75, horizonY - height * 0.30);
      ctx.lineTo(baseX + width * 0.95, horizonY);
      ctx.closePath();
      ctx.fill();
      // Mount Fuji Snow Cap
      ctx.fillStyle = '#e0e7ff';
      ctx.beginPath();
      ctx.moveTo(baseX + width * 0.70, horizonY - height * 0.225);
      ctx.lineTo(baseX + width * 0.75, horizonY - height * 0.30);
      ctx.lineTo(baseX + width * 0.80, horizonY - height * 0.225);
      ctx.closePath();
      ctx.fill();

      // Distant mega-towers
      ctx.fillStyle = '#172554';
      [0.05, 0.18, 0.32, 0.44].forEach((pos, idx) => {
        const th = height * (0.12 + (idx % 2) * 0.08);
        ctx.fillRect(baseX + width * pos, horizonY - th, width * 0.09, th);
      });
    }
  } else if (horizonType === 'ALPS') {
    // Massive Snow-capped Alpine Giants
    for (let i = -1; i <= 2; i++) {
      const baseX = i * width + panDist;
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(baseX, horizonY);
      ctx.lineTo(baseX + width * 0.25, horizonY - height * 0.32);
      ctx.lineTo(baseX + width * 0.50, horizonY - height * 0.18);
      ctx.lineTo(baseX + width * 0.75, horizonY - height * 0.35);
      ctx.lineTo(baseX + width, horizonY);
      ctx.closePath();
      ctx.fill();

      // Glacial Snow Caps
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.moveTo(baseX + width * 0.18, horizonY - height * 0.23);
      ctx.lineTo(baseX + width * 0.25, horizonY - height * 0.32);
      ctx.lineTo(baseX + width * 0.32, horizonY - height * 0.23);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(baseX + width * 0.68, horizonY - height * 0.25);
      ctx.lineTo(baseX + width * 0.75, horizonY - height * 0.35);
      ctx.lineTo(baseX + width * 0.82, horizonY - height * 0.25);
      ctx.closePath();
      ctx.fill();
    }
  } else if (horizonType === 'TROPICAL_RIO') {
    // Distant Ocean Islands of Guanabara Bay
    ctx.fillStyle = '#065f46';
    for (let i = -1; i <= 2; i++) {
      const baseX = i * width + panDist;
      ctx.beginPath();
      ctx.ellipse(baseX + width * 0.20, horizonY, width * 0.25, height * 0.15, 0, Math.PI, 2 * Math.PI);
      ctx.ellipse(baseX + width * 0.78, horizonY, width * 0.28, height * 0.18, 0, Math.PI, 2 * Math.PI);
      ctx.fill();
    }
  }

  // ==========================================
  // LAYER 2: MIDGROUND PARALLAX RIDGE (Medium)
  // ==========================================
  const panMid = wrap(-midOffset * 0.18, width);

  if (horizonType === 'DESERT') {
    // Terracotta Canyons & Sandstone Mesas
    ctx.fillStyle = '#9a3412';
    for (let i = -1; i <= 2; i++) {
      const baseX = i * width + panMid;
      ctx.beginPath();
      ctx.moveTo(baseX, horizonY);
      ctx.lineTo(baseX + width * 0.10, horizonY - height * 0.16);
      ctx.lineTo(baseX + width * 0.32, horizonY - height * 0.16); // Mesa top
      ctx.lineTo(baseX + width * 0.42, horizonY - height * 0.08);
      ctx.lineTo(baseX + width * 0.62, horizonY - height * 0.20);
      ctx.lineTo(baseX + width * 0.82, horizonY - height * 0.20); // Mesa top 2
      ctx.lineTo(baseX + width * 0.95, horizonY - height * 0.06);
      ctx.lineTo(baseX + width, horizonY);
      ctx.closePath();
      ctx.fill();

      // Sandstone rock strata highlights
      ctx.fillStyle = '#c2410c';
      ctx.fillRect(baseX + width * 0.12, horizonY - height * 0.12, width * 0.18, 4);
      ctx.fillRect(baseX + width * 0.64, horizonY - height * 0.15, width * 0.16, 4);
      ctx.fillStyle = '#9a3412';
    }
  } else if (horizonType === 'COAST') {
    // Emerald Sea Water Strip + Rocky Coastal Cliffs
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(0, horizonY - height * 0.09, width, height * 0.09);

    // Rocky ocean cliffs
    ctx.fillStyle = '#0f766e';
    for (let i = -1; i <= 2; i++) {
      const baseX = i * width + panMid;
      ctx.beginPath();
      ctx.moveTo(baseX, horizonY);
      ctx.lineTo(baseX + width * 0.20, horizonY - height * 0.12);
      ctx.lineTo(baseX + width * 0.45, horizonY - height * 0.16);
      ctx.lineTo(baseX + width * 0.60, horizonY - height * 0.06);
      ctx.lineTo(baseX + width * 0.85, horizonY - height * 0.14);
      ctx.lineTo(baseX + width, horizonY);
      ctx.closePath();
      ctx.fill();
    }
  } else if (horizonType === 'CITY_NIGHT') {
    // Cyberpunk Skyscraper Skyline with Glowing Windows & Neon Billboards
    for (let i = -1; i <= 2; i++) {
      const baseX = i * width + panMid;
      const towers = [
        { x: 0.04, w: 0.11, h: 0.24, neon: '#06b6d4' },
        { x: 0.18, w: 0.09, h: 0.18, neon: '#ec4899' },
        { x: 0.30, w: 0.14, h: 0.28, neon: '#f59e0b' },
        { x: 0.47, w: 0.10, h: 0.19, neon: '#10b981' },
        { x: 0.60, w: 0.12, h: 0.25, neon: '#ec4899' },
        { x: 0.75, w: 0.15, h: 0.30, neon: '#3b82f6' },
      ];

      towers.forEach((t) => {
        const tx = baseX + width * t.x;
        const th = height * t.h;
        const tw = width * t.w;

        // Building mass
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(tx, horizonY - th, tw, th);

        // Antenna tower
        ctx.fillStyle = '#64748b';
        ctx.fillRect(tx + tw * 0.46, horizonY - th - 12, 2, 12);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(tx + tw * 0.46 - 1, horizonY - th - 14, 4, 3);

        // Neon Billboard / Windows Grid
        ctx.fillStyle = t.neon;
        ctx.fillRect(tx + 4, horizonY - th + 6, tw - 8, 4);

        // Grid of office windows
        const rows = Math.floor(th / 8) - 2;
        const cols = Math.floor(tw / 6) - 1;
        for (let r = 2; r < rows; r++) {
          for (let c = 1; c < cols; c++) {
            if ((r + c + Math.floor(baseX)) % 3 === 0) {
              ctx.fillStyle = (r + c) % 2 === 0 ? '#38bdf8' : '#fbbf24';
              ctx.fillRect(tx + c * 6, horizonY - th + r * 8, 3, 3);
            }
          }
        }
      });
    }
  } else if (horizonType === 'ALPS') {
    // Dense Pine-Covered Alpine Foothills
    ctx.fillStyle = '#1e3a5f';
    for (let i = -1; i <= 2; i++) {
      const baseX = i * width + panMid;
      ctx.beginPath();
      ctx.moveTo(baseX, horizonY);
      ctx.lineTo(baseX + width * 0.18, horizonY - height * 0.18);
      ctx.lineTo(baseX + width * 0.38, horizonY - height * 0.12);
      ctx.lineTo(baseX + width * 0.65, horizonY - height * 0.22);
      ctx.lineTo(baseX + width * 0.88, horizonY - height * 0.14);
      ctx.lineTo(baseX + width, horizonY);
      ctx.closePath();
      ctx.fill();
    }
  } else if (horizonType === 'TROPICAL_RIO') {
    // Sugarloaf Mountain (Pão de Açúcar) & Corcovado Peak with Christ Redeemer
    ctx.fillStyle = '#047857';
    for (let i = -1; i <= 2; i++) {
      const baseX = i * width + panMid;
      // Sugarloaf Monolith (Pão de Açúcar)
      ctx.beginPath();
      ctx.ellipse(baseX + width * 0.30, horizonY, width * 0.16, height * 0.28, 0, Math.PI, 2 * Math.PI);
      ctx.fill();
      // Morro da Urca
      ctx.beginPath();
      ctx.ellipse(baseX + width * 0.16, horizonY, width * 0.11, height * 0.17, 0, Math.PI, 2 * Math.PI);
      ctx.fill();
      // Corcovado Peak
      ctx.beginPath();
      ctx.moveTo(baseX + width * 0.60, horizonY);
      ctx.lineTo(baseX + width * 0.74, horizonY - height * 0.30);
      ctx.lineTo(baseX + width * 0.88, horizonY);
      ctx.closePath();
      ctx.fill();

      // Glowing Christ the Redeemer statue atop Corcovado
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(baseX + width * 0.735, horizonY - height * 0.35, Math.max(3, width * 0.01), height * 0.05);
      ctx.fillRect(baseX + width * 0.722, horizonY - height * 0.335, Math.max(9, width * 0.038), height * 0.014);
      ctx.fillStyle = '#047857';
    }
  }

  // ==========================================
  // LAYER 3: NEAR HORIZON SILHOUETTES (Brisk)
  // ==========================================
  const panNear = wrap(-nearOffset * 0.35, width);

  if (horizonType === 'DESERT') {
    // Saguaro Cacti & Desert Scrub
    ctx.fillStyle = '#7c2d12';
    for (let i = -1; i <= 2; i++) {
      const baseX = i * width + panNear;
      // Desert hillocks
      ctx.beginPath();
      ctx.ellipse(baseX + width * 0.20, horizonY, width * 0.18, height * 0.06, 0, Math.PI, 2 * Math.PI);
      ctx.ellipse(baseX + width * 0.70, horizonY, width * 0.22, height * 0.07, 0, Math.PI, 2 * Math.PI);
      ctx.fill();

      // Cacti silhouettes
      [0.18, 0.45, 0.72, 0.90].forEach((pos) => {
        const cx = baseX + width * pos;
        ctx.fillRect(cx, horizonY - 18, 4, 18);
        ctx.fillRect(cx - 5, horizonY - 14, 5, 3);
        ctx.fillRect(cx - 5, horizonY - 18, 3, 7);
        ctx.fillRect(cx + 4, horizonY - 12, 5, 3);
        ctx.fillRect(cx + 6, horizonY - 16, 3, 7);
      });
    }
  } else if (horizonType === 'COAST') {
    // Coastal Palm Trees & Seaside Railings
    ctx.fillStyle = '#064e3b';
    for (let i = -1; i <= 2; i++) {
      const baseX = i * width + panNear;
      [0.12, 0.38, 0.65, 0.88].forEach((pos) => {
        const px = baseX + width * pos;
        // Curved trunk
        ctx.fillRect(px, horizonY - 22, 3, 22);
        // Fronds
        ctx.beginPath();
        ctx.ellipse(px + 1, horizonY - 22, 12, 4, -0.3, 0, Math.PI * 2);
        ctx.ellipse(px + 1, horizonY - 22, 12, 4, 0.3, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  } else if (horizonType === 'CITY_NIGHT') {
    // Monorail Beams, Industrial Cranes & Glowing Streetlights
    ctx.fillStyle = '#020617';
    for (let i = -1; i <= 2; i++) {
      const baseX = i * width + panNear;
      // Monorail rail line
      ctx.fillRect(baseX, horizonY - 8, width, 3);
      // Pylons
      [0.15, 0.40, 0.65, 0.90].forEach((pos) => {
        const px = baseX + width * pos;
        ctx.fillRect(px, horizonY - 14, 4, 14);
        // Neon beacon
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(px + 1, horizonY - 15, 2, 2);
        ctx.fillStyle = '#020617';
      });
    }
  } else if (horizonType === 'ALPS') {
    // Dense Silhouette of Evergreen Pine Trees & Wooden Chalets
    ctx.fillStyle = '#0f172a';
    for (let i = -1; i <= 2; i++) {
      const baseX = i * width + panNear;
      for (let t = 0; t < 12; t++) {
        const tx = baseX + (width / 12) * t + 6;
        ctx.beginPath();
        ctx.moveTo(tx, horizonY - 18);
        ctx.lineTo(tx - 6, horizonY);
        ctx.lineTo(tx + 6, horizonY);
        ctx.closePath();
        ctx.fill();
      }
    }
  } else if (horizonType === 'TROPICAL_RIO') {
    // Tropical Palm Jungle & Beach Coastline Silhouette
    ctx.fillStyle = '#022c22';
    for (let i = -1; i <= 2; i++) {
      const baseX = i * width + panNear;
      for (let p = 0; p < 8; p++) {
        const px = baseX + (width / 8) * p + 10;
        ctx.fillRect(px, horizonY - 20, 3, 20);
        ctx.beginPath();
        ctx.ellipse(px + 1, horizonY - 20, 14, 5, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  ctx.restore();
}
