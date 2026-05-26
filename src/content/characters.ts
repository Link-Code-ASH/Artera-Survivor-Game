import type { CharacterDefinition } from '../game/types';

export const characters: CharacterDefinition[] = [
  {
    id: 'caiden',
    name: '케이든',
    description: '푸른 망토를 두른 아르테라의 젊은 수호자입니다.',
    damageTakenMultiplier: 1,
  },
];

export function characterName(character: CharacterDefinition) {
  if (character.id === 'caiden') return '케이든';
  return character.name;
}

export function characterDescription(character: CharacterDefinition) {
  if (character.id === 'caiden') return '푸른 망토를 두른 아르테라의 젊은 수호자입니다.';
  return character.description;
}
