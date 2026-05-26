export type Vec = { x: number; y: number };

export type EnemyKind = 'slime' | 'goblin';

export type Enemy = {
  id: number;
  x: number;
  y: number;
  r: number;
  hp: number;
  speed: number;
  damage: number;
  gemDrops: number;
  kind: EnemyKind;
  slowTimer: number;
  slowMultiplier: number;
  dotTimer: number;
  dotDamage: number;
};

export type Bullet = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  damage: number;
  pierce: number;
  knockback: number;
  homing: number;
  hitIds: number[];
};

export type Gem = { x: number; y: number; value: number; r: number };

export type FloatText = { x: number; y: number; text: string; life: number; color: string };

export type Upgrade = {
  id: string;
  familyId: string;
  tier: number;
  title: string;
  body: string;
  cost: number;
  apply: (game: GameState) => void;
};

export type CharacterDefinition = {
  id: string;
  name: string;
  description: string;
  damageTakenMultiplier: number;
};

export type WeaponCategory = 'ranged' | 'melee';

export type WeaponDefinition = {
  id: string;
  name: string;
  description: string;
  projectileName: string;
  category: WeaponCategory;
  fireRate: number;
  bulletSpeed: number;
  damage: number;
  projectiles: number;
};

export type Direction = 'down' | 'left' | 'right' | 'up';

export type GameState = {
  status: 'ready' | 'running' | 'paused' | 'levelup' | 'stageClear' | 'lounge' | 'gameover';
  width: number;
  height: number;
  time: number;
  stage: number;
  stageTime: number;
  stageDuration: number;
  stageClearTimer: number;
  mapWidth: number;
  mapHeight: number;
  rerollCost: number;
  nextId: number;
  spawnClock: number;
  shootClock: number;
  player: {
    x: number;
    y: number;
    r: number;
    hp: number;
    maxHp: number;
    speed: number;
    damageTakenMultiplier: number;
    facing: Direction;
    moving: boolean;
    attackTimer: number;
    xp: number;
    nextXp: number;
    level: number;
    gemsCollected: number;
    upgradeCurrency: number;
    magnet: number;
    fireRate: number;
    bulletSpeed: number;
    damage: number;
    projectiles: number;
    pierce: number;
    regen: number;
    knockback: number;
    bulletLife: number;
    splashDamage: number;
    splashRadius: number;
    slowChance: number;
    slowMultiplier: number;
    slowDuration: number;
    thornsDamage: number;
    dotDamage: number;
    dotDuration: number;
    homing: number;
    doubleGemChance: number;
  };
  enemies: Enemy[];
  bullets: Bullet[];
  gems: Gem[];
  texts: FloatText[];
  upgrades: Upgrade[];
  upgradeLevels: Record<string, number>;
};
