import type {
  GaleRouteResult,
  GaleTerrain,
  RoutePoint,
  SafetyConfig,
} from "../types";
import { buildNoGo } from "./gale";
import { cellStepMeters, gridIndex, inBounds, type Cell } from "./geo";
import { DEFAULT_SAFETY } from "./safety";

const NEIGHBORS: ReadonlyArray<readonly [number, number]> = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
];

const STEEP_SLOPE_DEG = 15;

export type RouteMode = "balanced" | "shortest" | "safest";

const MODE_WEIGHTS: Record<
  RouteMode,
  { slopePenalty: number; climbPenalty: number; cautionPenalty: number }
> = {
  balanced: { slopePenalty: 4, climbPenalty: 3.5, cautionPenalty: 0.6 },
  shortest: { slopePenalty: 0.6, climbPenalty: 0.5, cautionPenalty: 0 },
  safest: { slopePenalty: 10, climbPenalty: 6.5, cautionPenalty: 1.5 },
};

class MinHeap {
  private indices: number[] = [];
  private priorities: number[] = [];

  get size(): number {
    return this.indices.length;
  }

  push(index: number, priority: number): void {
    this.indices.push(index);
    this.priorities.push(priority);
    let i = this.indices.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.priorities[parent] <= this.priorities[i]) break;
      this.swap(i, parent);
      i = parent;
    }
  }

  pop(): number {
    const top = this.indices[0];
    const lastIndex = this.indices.pop() as number;
    const lastPriority = this.priorities.pop() as number;
    if (this.indices.length > 0) {
      this.indices[0] = lastIndex;
      this.priorities[0] = lastPriority;
      let i = 0;
      for (;;) {
        const left = i * 2 + 1;
        const right = left + 1;
        let smallest = i;
        if (
          left < this.indices.length &&
          this.priorities[left] < this.priorities[smallest]
        ) {
          smallest = left;
        }
        if (
          right < this.indices.length &&
          this.priorities[right] < this.priorities[smallest]
        ) {
          smallest = right;
        }
        if (smallest === i) break;
        this.swap(i, smallest);
        i = smallest;
      }
    }
    return top;
  }

  private swap(a: number, b: number): void {
    const index = this.indices[a];
    this.indices[a] = this.indices[b];
    this.indices[b] = index;
    const priority = this.priorities[a];
    this.priorities[a] = this.priorities[b];
    this.priorities[b] = priority;
  }
}

function routePoint(cell: Cell): RoutePoint {
  return { x: cell.col, y: cell.row };
}

function blockedResult(
  start: Cell,
  goal: Cell,
  warnings: string[],
): GaleRouteResult {
  return {
    ok: false,
    path: [],
    distanceKm: 0,
    durationH: 0,
    maxSlope: 0,
    avgSlope: 0,
    hazard: 0,
    warnings,
    start: routePoint(start),
    goal: routePoint(goal),
    elevationGainM: 0,
    elevationLossM: 0,
    steepFraction: 0,
  };
}

export interface RouteOptions {
  maxSlopeDeg?: number;
  slopePenalty?: number;
  safetyConfig?: SafetyConfig;
  mode?: RouteMode;
}

export function planRoute(
  terrain: GaleTerrain,
  start: Cell,
  goal: Cell,
  options: RouteOptions = {},
): GaleRouteResult {
  const config = options.safetyConfig ?? DEFAULT_SAFETY;
  const maxSlopeDeg = options.maxSlopeDeg ?? config.maxSlopeDeg;
  const mode = options.mode ?? "balanced";
  const weights = MODE_WEIGHTS[mode];
  const slopePenalty = options.slopePenalty ?? weights.slopePenalty;
  const width = terrain.meta.width;
  const height = terrain.meta.height;

  if (
    !inBounds(start.row, start.col, width, height) ||
    !inBounds(goal.row, goal.col, width, height)
  ) {
    return blockedResult(start, goal, [
      "Start or destination falls outside the terrain patch.",
    ]);
  }

  const noGo = buildNoGo(terrain.slope, maxSlopeDeg);
  const startIndex = gridIndex(start.row, start.col, width);
  const goalIndex = gridIndex(goal.row, goal.col, width);

  if (noGo[startIndex]) {
    return blockedResult(start, goal, [
      `Start is no-go: slope ${terrain.slope[startIndex].toFixed(1)}° exceeds the ${maxSlopeDeg}° limit.`,
    ]);
  }
  if (noGo[goalIndex]) {
    return blockedResult(start, goal, [
      `Destination is no-go: slope ${terrain.slope[goalIndex].toFixed(1)}° exceeds the ${maxSlopeDeg}° limit.`,
    ]);
  }

  const total = width * height;
  const gScore = new Float64Array(total);
  gScore.fill(Number.POSITIVE_INFINITY);
  const cameFrom = new Int32Array(total);
  cameFrom.fill(-1);
  const closed = new Uint8Array(total);
  const heap = new MinHeap();

  const heuristic = (row: number, col: number): number =>
    cellStepMeters({ row, col }, goal, terrain.patch);

  gScore[startIndex] = 0;
  heap.push(startIndex, heuristic(start.row, start.col));

  let reached = startIndex === goalIndex;

  while (heap.size > 0) {
    const current = heap.pop();
    if (closed[current]) continue;
    if (current === goalIndex) {
      reached = true;
      break;
    }
    closed[current] = 1;

    const row = Math.floor(current / width);
    const col = current - row * width;

    for (const [dr, dc] of NEIGHBORS) {
      const nextRow = row + dr;
      const nextCol = col + dc;
      if (!inBounds(nextRow, nextCol, width, height)) continue;
      const nextIndex = gridIndex(nextRow, nextCol, width);
      if (noGo[nextIndex]) continue;

      if (dr !== 0 && dc !== 0) {
        if (
          noGo[gridIndex(row, nextCol, width)] ||
          noGo[gridIndex(nextRow, col, width)]
        ) {
          continue;
        }
      }

      const stepMeters = cellStepMeters(
        { row, col },
        { row: nextRow, col: nextCol },
        terrain.patch,
      );
      const slopeDeg = terrain.slope[nextIndex];
      const ratio = slopeDeg / maxSlopeDeg;
      const climbM = Math.max(
        0,
        terrain.elevation[nextIndex] - terrain.elevation[current],
      );
      const climbRatio = climbM / Math.max(1, stepMeters);
      const cautionExtra =
        slopeDeg > STEEP_SLOPE_DEG ? weights.cautionPenalty : 0;

      const stepCost =
        stepMeters *
        (1 +
          slopePenalty * ratio * ratio +
          weights.climbPenalty * climbRatio +
          cautionExtra);
      const tentative = gScore[current] + stepCost;

      if (tentative < gScore[nextIndex]) {
        gScore[nextIndex] = tentative;
        cameFrom[nextIndex] = current;
        heap.push(nextIndex, tentative + heuristic(nextRow, nextCol));
      }
    }
  }

  if (!reached) {
    return blockedResult(start, goal, [
      "No traversable route found at the current slope limit.",
    ]);
  }

  const pathIndices: number[] = [];
  let cursor = goalIndex;
  pathIndices.push(cursor);
  while (cursor !== startIndex) {
    const previous = cameFrom[cursor];
    if (previous < 0) {
      return blockedResult(start, goal, [
        "No traversable route found at the current slope limit.",
      ]);
    }
    cursor = previous;
    pathIndices.push(cursor);
  }
  pathIndices.reverse();

  const path = pathIndices.map((index) => {
    const row = Math.floor(index / width);
    return { x: index - row * width, y: row };
  });

  let distanceM = 0;
  let elevationGainM = 0;
  let elevationLossM = 0;
  let slopeSum = 0;
  let maxSlope = 0;
  let steepCells = 0;

  for (let i = 0; i < pathIndices.length; i += 1) {
    const index = pathIndices[i];
    const slope = terrain.slope[index];
    slopeSum += slope;
    if (slope > maxSlope) maxSlope = slope;
    if (slope > STEEP_SLOPE_DEG) steepCells += 1;

    if (i === 0) continue;
    const previous = pathIndices[i - 1];
    const previousRow = Math.floor(previous / width);
    const currentRow = Math.floor(index / width);
    distanceM += cellStepMeters(
      { row: previousRow, col: previous - previousRow * width },
      { row: currentRow, col: index - currentRow * width },
      terrain.patch,
    );
    const delta = terrain.elevation[index] - terrain.elevation[previous];
    if (delta > 0) elevationGainM += delta;
    else elevationLossM += -delta;
  }

  const distanceKm = distanceM / 1000;
  const durationH = distanceKm / config.walkSpeedKmH;
  const avgSlope = pathIndices.length > 0 ? slopeSum / pathIndices.length : 0;
  const steepFraction =
    pathIndices.length > 0 ? steepCells / pathIndices.length : 0;

  const warnings: string[] = [];
  if (maxSlope > STEEP_SLOPE_DEG) {
    warnings.push(
      `Route crosses cells above ${STEEP_SLOPE_DEG}°; treat this as slope screening, not trafficability.`,
    );
  }
  if (durationH > config.nominalEvaHours) {
    warnings.push(
      `Walking time exceeds the nominal ${config.nominalEvaHours} h EVA before suit reserve.`,
    );
  }
  if (steepFraction > 0.25) {
    warnings.push("More than 25% of the route is on near-limit slopes.");
  }

  return {
    ok: true,
    path,
    distanceKm,
    durationH,
    maxSlope,
    avgSlope,
    hazard: Math.min(1, avgSlope / maxSlopeDeg),
    warnings,
    start: routePoint(start),
    goal: routePoint(goal),
    elevationGainM,
    elevationLossM,
    steepFraction,
  };
}