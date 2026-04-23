import { getOccupancyAt, getGridDimensions } from './grid';

export type GridPoint = { col: number; row: number };

interface PFNode {
  col:    number;
  row:    number;
  g:      number;
  h:      number;
  f:      number;
  parent: PFNode | null;
}

// Optional blocker registry — ResourceNodeSystem registers itself here
let nodeBlocker: ((col: number, row: number) => boolean) | null = null;

export function registerPathfindingBlocker(fn: (col: number, row: number) => boolean): void {
  nodeBlocker = fn;
}

function isWalkable(col: number, row: number, endCol: number, endRow: number): boolean {
  const { cols, rows } = getGridDimensions();
  if (col < 0 || row < 0 || col >= cols || row >= rows) return false;
  // Allow destination even if occupied (villager walks to building entrance)
  if (col === endCol && row === endRow) return true;
  if (getOccupancyAt(col, row) !== 0) return false;
  if (nodeBlocker?.(col, row)) return false;
  return true;
}

function heuristic(col: number, row: number, ec: number, er: number): number {
  return Math.abs(col - ec) + Math.abs(row - er);
}

/** Returns an accessible neighbour of (col,row) when the cell itself is blocked. */
function nearestWalkable(col: number, row: number): GridPoint | null {
  const { cols, rows } = getGridDimensions();
  for (let radius = 1; radius <= 4; radius++) {
    for (let dc = -radius; dc <= radius; dc++) {
      for (let dr = -radius; dr <= radius; dr++) {
        if (Math.abs(dc) !== radius && Math.abs(dr) !== radius) continue;
        const nc = col + dc, nr = row + dr;
        if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
        if (getOccupancyAt(nc, nr) === 0 && !nodeBlocker?.(nc, nr)) {
          return { col: nc, row: nr };
        }
      }
    }
  }
  return null;
}

function reconstructPath(node: PFNode): GridPoint[] {
  const path: GridPoint[] = [];
  let cur: PFNode | null = node;
  while (cur) {
    path.unshift({ col: cur.col, row: cur.row });
    cur = cur.parent;
  }
  return path;
}

/**
 * A* pathfinding on the occupancy grid.
 * Trees/ore (registered via registerPathfindingBlocker) block; decoration does not.
 * Returns empty array if no path exists.
 * Capped at 3000 iterations to avoid frame stalls on complex maps.
 */
export function findPath(startCol: number, startRow: number, endCol: number, endRow: number): GridPoint[] {
  // Resolve a walkable arrival point next to the target if target is blocked
  let ec = endCol, er = endRow;
  if (getOccupancyAt(ec, er) !== 0 || nodeBlocker?.(ec, er)) {
    const nb = nearestWalkable(ec, er);
    if (!nb) return [];
    ec = nb.col; er = nb.row;
  }

  if (startCol === ec && startRow === er) return [{ col: ec, row: er }];

  const open:   Map<string, PFNode> = new Map();
  const closed: Set<string>         = new Set();

  const h0 = heuristic(startCol, startRow, ec, er);
  const start: PFNode = { col: startCol, row: startRow, g: 0, h: h0, f: h0, parent: null };
  open.set(`${startCol},${startRow}`, start);

  let iterations = 0;
  while (open.size > 0 && iterations < 3000) {
    iterations++;

    let current: PFNode | null = null;
    for (const n of open.values()) {
      if (!current || n.f < current.f) current = n;
    }
    if (!current) break;

    if (current.col === ec && current.row === er) {
      return reconstructPath(current);
    }

    const key = `${current.col},${current.row}`;
    open.delete(key);
    closed.add(key);

    const neighbours: GridPoint[] = [
      { col: current.col - 1, row: current.row },
      { col: current.col + 1, row: current.row },
      { col: current.col,     row: current.row - 1 },
      { col: current.col,     row: current.row + 1 },
    ];

    for (const nb of neighbours) {
      const nbKey = `${nb.col},${nb.row}`;
      if (closed.has(nbKey)) continue;
      if (!isWalkable(nb.col, nb.row, ec, er)) continue;

      const g = current.g + 1;
      const existing = open.get(nbKey);
      if (existing && existing.g <= g) continue;

      const h = heuristic(nb.col, nb.row, ec, er);
      const node: PFNode = { col: nb.col, row: nb.row, g, h, f: g + h, parent: current };
      open.set(nbKey, node);
    }
  }

  return [];
}
