import type { BuildingDef } from '../types';

export const buildingCatalog: BuildingDef[] = [
  {
    key: 'wood_house_blue',
    spriteFrame: 'House_1_Wood_Base_Blue',
    footprint: { w: 2, h: 2 },
    terrainAllowed: ['grass'],
  },
  {
    key: 'windmill',
    spriteFrame: 'Windmill',
    footprint: { w: 2, h: 3 },
    terrainAllowed: ['grass'],
  },
  {
    key: 'well',
    spriteFrame: 'Well',
    footprint: { w: 1, h: 1 },
    terrainAllowed: ['grass', 'path'],
  },
];
