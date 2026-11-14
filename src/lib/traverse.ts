import { cellStepMeters } from "./geo";
import type { GaleRouteResult, GaleTerrain } from "../types";

export function sampleTraverse(terrain: GaleTerrain, route: GaleRouteResult | null) {
  let distanceM = 0;
  return route?.ok ? route.path.map((point, index, path) => {
    if (index) distanceM += cellStepMeters(
      { row: path[index - 1].y, col: path[index - 1].x },
      { row: point.y, col: point.x }, terrain.patch,
    );
    const cell = point.y * terrain.meta.width + point.x;
    return { ...point, distanceM, elevation: terrain.elevation[cell], slope: terrain.slope[cell] };
  }) : [];
}
