import { Scene } from 'phaser';
import spriteDefs from '../data/sprite-defs.json';

interface AnimDef {
  name:             string;
  row:              number;
  cols:             number;
  flipForOpposite?: boolean;
}
interface SpriteSheetDef {
  id:          string;
  category:    string;
  srcFile:     string;
  atlasGroup:  string;
  frameWidth:  number;
  frameHeight: number;
  animations:  AnimDef[];
}

// ─── NPC sheet definitions ────────────────────────────────────────────────────
// Frame layout confirmed from reference image (knowledge.md §NPC spritesheets):
//   rows 0-3: idle_down / idle_left / idle_right / idle_up (6 frames each)
//   rows 4-7: walk_down / walk_left / walk_right / walk_up (6 frames each)
//   row 8+:   profession-specific work anims (where sheet height allows)
const NPC_COLS = 6;

interface NpcDef {
  key:    string;
  rows:   number;
  prefix: string;
}

const NPC_SHEETS: NpcDef[] = [
  { key: 'farmer_bob',      rows: 13, prefix: 'farmer_bob'      },
  { key: 'farmer_buba',     rows: 13, prefix: 'farmer_buba'     },
  { key: 'lumberjack_jack', rows: 10, prefix: 'lumberjack_jack' },
  { key: 'miner_mike',      rows: 10, prefix: 'miner_mike'      },
  { key: 'chef_chloe',      rows: 7,  prefix: 'chef_chloe'      },
  { key: 'bartender_bruno', rows: 7,  prefix: 'bartender_bruno' },
  { key: 'bartender_katy',  rows: 7,  prefix: 'bartender_katy'  },
];

const ANIM_ROWS = [
  { name: 'idle_down',  row: 0 },
  { name: 'idle_left',  row: 1 },
  { name: 'idle_right', row: 2 },
  { name: 'idle_up',    row: 3 },
  { name: 'walk_down',  row: 4 },
  { name: 'walk_left',  row: 5 },
  { name: 'walk_right', row: 6 },
  { name: 'walk_up',    row: 7 },
];

const WORK_ANIMS: Record<string, Array<{ name: string; row: number }>> = {
  lumberjack_jack:  [{ name: 'work_chop',    row: 8 }, { name: 'work_chop2',   row: 9 }],
  miner_mike:       [{ name: 'work_mine',    row: 8 }, { name: 'work_mine2',   row: 9 }],
  farmer_bob:       [{ name: 'work_plant',   row: 8 }, { name: 'work_harvest', row: 9 }],
  farmer_buba:      [{ name: 'work_plant',   row: 8 }, { name: 'work_harvest', row: 9 }],
};

// Animal animations are registered dynamically from src/data/sprite-defs.json.

export class PreloadScene extends Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload(): void {
    this.load.tilemapTiledJSON('world',      'assets/maps/world.tmj');
    this.load.image('terrain_base',           'assets/tilesets/terrain_base.png');
    this.load.atlas('buildings',              'assets/atlases/buildings.png', 'assets/atlases/buildings.json');
    this.load.atlas('icons',                  'assets/atlases/icons.png',     'assets/atlases/icons.json');
    this.load.atlas('trees',                  'assets/atlases/trees.png',     'assets/atlases/trees.json');
    this.load.atlas('decor',                  'assets/atlases/decor.png',     'assets/atlases/decor.json');
    this.load.atlas('crops',                  'assets/atlases/crops.png',     'assets/atlases/crops.json');
    this.load.atlas('npcs',                   'assets/atlases/npcs.png',      'assets/atlases/npcs.json');
    this.load.atlas('animals',                'assets/atlases/animals.png',   'assets/atlases/animals.json');
    this.load.atlas('weather',                'assets/atlases/weather.png',   'assets/atlases/weather.json');
  }

  create(): void {
    this.registerNpcAnims();
    this.registerAnimalAnims();
    this.scene.start('WorldScene');
  }

  private registerNpcAnims(): void {
    for (const npc of NPC_SHEETS) {
      for (const anim of ANIM_ROWS) {
        if (anim.row >= npc.rows) continue;
        const start = anim.row * NPC_COLS;
        const frames = this.anims.generateFrameNames('npcs', {
          prefix: `${npc.prefix}_`,
          start,
          end:    start + NPC_COLS - 1,
        });
        this.anims.create({
          key:       `${npc.prefix}_${anim.name}`,
          frames,
          frameRate: 8,
          repeat:    -1,
        });
      }

      const workAnims = WORK_ANIMS[npc.prefix];
      if (workAnims) {
        for (const wa of workAnims) {
          if (wa.row >= npc.rows) continue;
          const start = wa.row * NPC_COLS;
          const frames = this.anims.generateFrameNames('npcs', {
            prefix: `${npc.prefix}_`,
            start,
            end:    start + NPC_COLS - 1,
          });
          this.anims.create({
            key:       `${npc.prefix}_${wa.name}`,
            frames,
            frameRate: 6,
            repeat:    -1,
          });
        }
      }
    }
  }

  private registerAnimalAnims(): void {
    const sheets = (spriteDefs as { spritesheets: SpriteSheetDef[] }).spritesheets
      .filter(s => s.atlasGroup === 'animals');

    for (const sheet of sheets) {
      for (const anim of sheet.animations) {
        const frames = Array.from({ length: anim.cols }, (_, i) => ({
          key:   'animals',
          frame: `${sheet.id}_${anim.name}_${i}`,
        }));
        this.anims.create({
          key:       `${sheet.id}_${anim.name}`,
          frames,
          frameRate: 8,
          repeat:    -1,
        });
      }
    }
  }
}
