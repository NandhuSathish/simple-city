import type { BuildingDef } from '../types';

export const buildingCatalog: BuildingDef[] = [
  {
    key:            'wood_house_blue',
    label:          'Wood House',
    tab:            'Housing',
    spriteFrame:    'House_1_Wood_Base_Blue',
    footprint:      { w: 2, h: 2 },
    terrainAllowed: ['grass'],
    cost:           { Wood: 10, Stone: 5 },
    produces:       {},
    consumes:       { Food: 0.05 },
  },
  {
    key:            'windmill',
    label:          'Windmill',
    tab:            'Production',
    spriteFrame:    'Windmill',
    footprint:      { w: 2, h: 3 },
    terrainAllowed: ['grass'],
    cost:           { Wood: 20, Stone: 10 },
    produces:       { Food: 0.2 },
    consumes:       {},
  },
  {
    key:            'well',
    label:          'Well',
    tab:            'Resource',
    spriteFrame:    'Well',
    footprint:      { w: 1, h: 1 },
    terrainAllowed: ['grass', 'path'],
    cost:           { Stone: 15 },
    produces:       {},
    consumes:       {},
  },
];
