export type GameState = 
  | 'TITLE'
  | 'TRACK_SELECT'
  | 'GARAGE'
  | 'RACING'
  | 'PAUSED'
  | 'RACE_FINISHED'
  | 'CHAMPIONSHIP_VICTORY';

export type ResolutionMode = 'RETRO_64' | 'ARCADE_256';

export interface BikeConfig {
  id: string;
  name: string;
  cc: number;
  description: string;
  topSpeed: number; // max speed units
  acceleration: number;
  handling: number;
  durability: number; // Max HP
  weapon: 'FIST' | 'LEAD_PIPE' | 'CHAIN_WHIP' | 'BASEBALL_BAT' | 'SPIKED_MACE';
  weaponDamage: number;
  weaponRange: number;
  unlocked: boolean;
  cost: number;
  color: string;
  accentColor: string;
}

export interface TrackConfig {
  id: string;
  name: string;
  country: string;
  city?: string;
  flag: string;
  distanceKm: number;
  totalSegments: number;
  laps: number;
  skyColors: [string, string]; // top, bottom
  horizonType: 'DESERT' | 'COAST' | 'CITY_NIGHT' | 'ALPS' | 'TROPICAL_RIO';
  roadColors: {
    grassLight: string;
    grassDark: string;
    rumbleLight: string;
    rumbleDark: string;
    roadLight: string;
    roadDark: string;
    laneColor: string;
  };
  scenerySprites: Array<'CACTUS' | 'ROCK' | 'SIGN' | 'PALM' | 'VILLA' | 'CHERRY_BLOSSOM' | 'NEON_BILLBOARD' | 'PINE' | 'WINDMILL'>;
  curveComplexity: number;
  hillComplexity: number;
  rivalCount: number;
  unlocked: boolean;
  bestTime?: number;
}

export interface RoadSegment {
  index: number;
  p1: { world: { x: number; y: number; z: number }; screen: { x: number; y: number; w: number; scale: number } };
  p2: { world: { x: number; y: number; z: number }; screen: { x: number; y: number; w: number; scale: number } };
  curve: number;
  sprites: Array<{
    type: string;
    offset: number; // -1 to 1 is on road, <-1 or >1 is roadside
    scale?: number;
  }>;
  cars: Array<{
    racer?: CombatRacer;
    percent?: number;
    offset?: number;
    z?: number;
    speed?: number;
    color?: string;
  }>;
  color: {
    road: string;
    grass: string;
    rumble: string;
    lane?: string;
  };
  clip?: number;
  looped?: boolean;
  fog?: number;
  isFinishLine?: boolean;
  gridSlot?: 'LEFT' | 'RIGHT' | 'BOTH';
}

export interface CombatRacer {
  id: string;
  name: string;
  isPlayer: boolean;
  x: number; // lateral position (-1 to 1 relative to road center)
  z: number; // distance along track
  speed: number;
  maxSpeed: number;
  accel: number;
  hp: number;
  maxHp: number;
  bikeColor: string;
  suitColor: string;
  bikeId: string;
  attackCooldown: number;
  isAttacking: 'LEFT' | 'RIGHT' | null;
  attackType: 'PUNCH' | 'KICK' | 'WEAPON';
  isWipedOut: boolean;
  wipeoutTimer: number;
  staggerTimer: number;
  weapon: 'FIST' | 'LEAD_PIPE' | 'CHAIN_WHIP' | 'BASEBALL_BAT' | 'SPIKED_MACE';
  rank: number;
  aiAggression?: number; // 0 to 1
  aiFlankTimer?: number;
  lap?: number;
  totalDistance?: number;
}

export interface PlayerStats {
  money: number;
  currentTrackIndex: number;
  unlockedBikeIds: string[];
  selectedBikeId: string;
  upgrades: {
    speedLevel: number;
    armorLevel: number;
    weaponLevel: number;
  };
  totalRivalsKnocked: number;
  championshipWon: boolean;
}

export interface GameControls {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  punchLeft: boolean;
  punchRight: boolean;
  kick: boolean;
  nitro: boolean;
  pause: boolean;
}
