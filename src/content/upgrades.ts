import type { Upgrade } from '../game/types';

export const upgrades: Upgrade[] = [
  {
    id: 'rapid',
    title: '비전 서책',
    body: '마력파를 더 자주 발사합니다.',
    cost: 3,
    apply: (game) => {
      game.player.fireRate = Math.max(0.18, game.player.fireRate * 0.84);
    },
  },
  {
    id: 'damage',
    title: '룬 각인',
    body: '마력파의 피해량이 증가합니다.',
    cost: 3,
    apply: (game) => {
      game.player.damage += 7;
    },
  },
  {
    id: 'projectile',
    title: '쌍월 주문',
    body: '한 번에 발사하는 마력파가 늘어납니다.',
    cost: 3,
    apply: (game) => {
      game.player.projectiles += 1;
    },
  },
  {
    id: 'speed',
    title: '순풍 망토',
    body: '이동 속도가 증가합니다.',
    cost: 3,
    apply: (game) => {
      game.player.speed += 18;
    },
  },
  {
    id: 'magnet',
    title: '수정 부적',
    body: '마력 수정을 더 멀리서 끌어옵니다.',
    cost: 3,
    apply: (game) => {
      game.player.magnet += 34;
    },
  },
  {
    id: 'heart',
    title: '성소의 축복',
    body: '최대 체력이 증가합니다.',
    cost: 3,
    apply: (game) => {
      game.player.maxHp += 22;
    },
  },
  {
    id: 'pierce',
    title: '관통의 룬',
    body: '마력파가 적을 추가로 관통합니다.',
    cost: 3,
    apply: (game) => {
      game.player.pierce += 1;
    },
  },
  {
    id: 'velocity',
    title: '푸른 혜성',
    body: '마력파가 더 빠르게 날아가고 조금 강해집니다.',
    cost: 3,
    apply: (game) => {
      game.player.bulletSpeed += 95;
      game.player.damage += 3;
    },
  },
  {
    id: 'barrier',
    title: '수호 결계',
    body: '받는 피해가 감소합니다.',
    cost: 3,
    apply: (game) => {
      game.player.damageTakenMultiplier = Math.max(0.45, game.player.damageTakenMultiplier * 0.86);
    },
  },
  {
    id: 'knockback',
    title: '충격 파동',
    body: '마력파가 적을 더 강하게 밀쳐냅니다.',
    cost: 3,
    apply: (game) => {
      game.player.knockback += 20;
    },
  },
  {
    id: 'overload',
    title: '마력 과부하',
    body: '피해량과 발사 속도가 함께 증가합니다.',
    cost: 3,
    apply: (game) => {
      game.player.damage += 5;
      game.player.fireRate = Math.max(0.18, game.player.fireRate * 0.9);
    },
  },
];
