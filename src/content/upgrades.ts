import type { GameState, Upgrade, UpgradeCategory } from '../game/types';

const romanTiers = ['I', 'II', 'III', 'IV', 'V'];
const tierCosts = [3, 5, 7, 9, 11];

type UpgradeFamily = {
  id: string;
  category: UpgradeCategory;
  name: string;
  body: (tier: number) => string;
  apply: (game: GameState, tier: number) => void;
};

const upgradeFamilies: UpgradeFamily[] = [
  {
    id: 'rapid',
    category: 'rangedOnly',
    name: '비전 속삭임',
    body: (tier) => `마력파 발사 간격이 누적 ${Math.round((1 - Math.pow(0.94, tier)) * 100)}% 짧아집니다.`,
    apply: (game) => {
      game.player.fireRate = Math.max(0.18, game.player.fireRate * 0.94);
    },
  },
  {
    id: 'damage',
    category: 'common',
    name: '룬 각인',
    body: (tier) => `마력파 피해량이 +${5 + tier * 2} 증가합니다.`,
    apply: (game, tier) => {
      game.player.damage += 5 + tier * 2;
    },
  },
  {
    id: 'projectile',
    category: 'rangedOnly',
    name: '쌍월 주문',
    body: () => '한 번에 발사하는 마력파가 1개 추가됩니다.',
    apply: (game) => {
      game.player.projectiles += 1;
    },
  },
  {
    id: 'speed',
    category: 'utility',
    name: '질풍 망토',
    body: (tier) => `이동 속도가 +${12 + tier * 3} 증가합니다.`,
    apply: (game, tier) => {
      game.player.speed += 12 + tier * 3;
    },
  },
  {
    id: 'magnet',
    category: 'utility',
    name: '수정 부름',
    body: (tier) => `보석 흡수 범위가 +${24 + tier * 6} 증가합니다.`,
    apply: (game, tier) => {
      game.player.magnet += 24 + tier * 6;
    },
  },
  {
    id: 'heart',
    category: 'common',
    name: '성소의 축복',
    body: (tier) => `최대 체력이 +${16 + tier * 4} 증가합니다.`,
    apply: (game, tier) => {
      game.player.maxHp += 16 + tier * 4;
    },
  },
  {
    id: 'pierce',
    category: 'rangedOnly',
    name: '관통의 룬',
    body: () => '마력파가 적을 1명 더 관통합니다.',
    apply: (game) => {
      game.player.pierce += 1;
    },
  },
  {
    id: 'velocity',
    category: 'rangedOnly',
    name: '빠른 혜성',
    body: (tier) => `마력파 속도가 +${70 + tier * 15}, 피해량이 +${tier + 1} 증가합니다.`,
    apply: (game, tier) => {
      game.player.bulletSpeed += 70 + tier * 15;
      game.player.damage += tier + 1;
    },
  },
  {
    id: 'barrier',
    category: 'common',
    name: '수호 결계',
    body: () => '받는 피해가 8% 감소합니다.',
    apply: (game) => {
      game.player.damageTakenMultiplier = Math.max(0.45, game.player.damageTakenMultiplier * 0.92);
    },
  },
  {
    id: 'knockback',
    category: 'common',
    name: '충격 파동',
    body: (tier) => `마력파 넉백이 +${14 + tier * 3} 증가합니다.`,
    apply: (game, tier) => {
      game.player.knockback += 14 + tier * 3;
    },
  },
  {
    id: 'overload',
    category: 'rangedOnly',
    name: '마력 과부하',
    body: (tier) => `피해량이 +${3 + tier * 2} 증가하고 발사 간격이 4% 줄어듭니다.`,
    apply: (game, tier) => {
      game.player.damage += 3 + tier * 2;
      game.player.fireRate = Math.max(0.18, game.player.fireRate * 0.96);
    },
  },
  {
    id: 'range',
    category: 'rangedOnly',
    name: '별빛 사거리',
    body: (tier) => `마력파 유지 시간이 +${Math.round((0.12 + tier * 0.03) * 100) / 100}초 증가합니다.`,
    apply: (game, tier) => {
      game.player.bulletLife += 0.12 + tier * 0.03;
    },
  },
  {
    id: 'splash',
    category: 'rangedOnly',
    name: '파열의 낙인',
    body: (tier) => `적 처치 시 주변에 ${10 + tier * 5}의 폭발 피해를 줍니다.`,
    apply: (game, tier) => {
      game.player.splashDamage += 10 + tier * 5;
      game.player.splashRadius = Math.max(game.player.splashRadius, 76 + tier * 8);
    },
  },
  {
    id: 'slow',
    category: 'utility',
    name: '서리 족쇄',
    body: (tier) => `타격 시 ${18 + tier * 2}% 확률로 적을 ${Math.round((1 + tier * 0.15) * 10) / 10}초 둔화시킵니다.`,
    apply: (game, tier) => {
      game.player.slowChance = Math.min(0.75, game.player.slowChance + 0.18 + tier * 0.02);
      game.player.slowMultiplier = Math.min(game.player.slowMultiplier, Math.max(0.45, 0.78 - tier * 0.04));
      game.player.slowDuration = Math.max(game.player.slowDuration, 1 + tier * 0.15);
    },
  },
  {
    id: 'thorns',
    category: 'meleeOnly',
    name: '거울 갑주',
    body: (tier) => `피격 중 접촉한 적에게 초당 ${10 + tier * 4}의 반사 피해를 줍니다.`,
    apply: (game, tier) => {
      game.player.thornsDamage += 10 + tier * 4;
    },
  },
  {
    id: 'dot',
    category: 'rangedOnly',
    name: '잔불 저주',
    body: (tier) => `타격한 적에게 초당 ${3 + tier * 2}의 지속 피해를 줍니다.`,
    apply: (game, tier) => {
      game.player.dotDamage += 3 + tier * 2;
      game.player.dotDuration = Math.max(game.player.dotDuration, 2 + tier * 0.2);
    },
  },
  {
    id: 'homing',
    category: 'rangedOnly',
    name: '추적의 별',
    body: (tier) => `투사체가 적을 향해 ${18 + tier * 4}% 강도로 방향을 보정합니다.`,
    apply: (game, tier) => {
      game.player.homing = Math.min(0.9, game.player.homing + 0.18 + tier * 0.04);
    },
  },
  {
    id: 'double-gem',
    category: 'utility',
    name: '탐욕의 별잔',
    body: (tier) => `보석 획득량이 2배가 될 확률이 +${8 + tier * 4}% 증가합니다.`,
    apply: (game, tier) => {
      game.player.doubleGemChance = Math.min(0.75, game.player.doubleGemChance + 0.08 + tier * 0.04);
    },
  },
];

function createUpgrade(family: UpgradeFamily, tier: number): Upgrade {
  const roman = romanTiers[tier - 1];
  return {
    id: `${family.id}-${tier}`,
    familyId: family.id,
    tier,
    category: family.category,
    title: `${family.name} ${roman}`,
    body: family.body(tier),
    cost: tierCosts[tier - 1],
    apply: (game) => family.apply(game, tier),
  };
}

export function buildAvailableUpgrades(game: GameState): Upgrade[] {
  return upgradeFamilies.flatMap((family) => {
    const nextTier = (game.upgradeLevels[family.id] || 0) + 1;
    return nextTier <= romanTiers.length ? [createUpgrade(family, nextTier)] : [];
  });
}

export const upgrades = upgradeFamilies.map((family) => createUpgrade(family, 1));
export const upgradeFamilyCount = upgradeFamilies.length;
export const upgradeTierCount = romanTiers.length;
export const upgradeTierCosts = tierCosts;
