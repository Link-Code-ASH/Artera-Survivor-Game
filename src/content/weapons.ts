import type { WeaponDefinition } from '../game/types';

export const weapons: WeaponDefinition[] = [
  {
    id: 'magic-staff',
    name: '마법 지팡이',
    description: '응축한 마력을 파동으로 날립니다.',
    projectileName: '마력파',
    category: 'ranged',
    fireRate: 0.62,
    bulletSpeed: 530,
    damage: 18,
    projectiles: 1,
  },
];

export function weaponName(weapon: WeaponDefinition) {
  if (weapon.id === 'magic-staff') return '마법 지팡이';
  return weapon.name;
}

export function weaponDescription(weapon: WeaponDefinition) {
  if (weapon.id === 'magic-staff') return '응축한 마력을 파동으로 날립니다.';
  return weapon.description;
}
