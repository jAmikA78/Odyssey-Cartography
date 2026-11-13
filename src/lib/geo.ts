import type { GalePatchMetadata, RoutePoint } from "../types";

export interface Cell {
  row: number;
  col: number;
}

export interface WorldPoint {
  x: number;
  z: number;
}

export interface LatLon {
  lat: number;
  lon: number;
}

const DEG_PER_RAD = 180 / Math.PI;
const RAD_PER_DEG = Math.PI / 180;

export function gridIndex(row: number, col: number, width: number): number {
  return row * width + col;
}

export function inBounds(
  row: number,
  col: number,
  width: number,
  height: number,
): boolean {
  return row >= 0 && row < height && col >= 0 && col < width;
}

export function clampCell(cell: Cell, width: number, height: number): Cell {
  return {
    row: Math.min(height - 1, Math.max(0, Math.round(cell.row))),
    col: Math.min(width - 1, Math.max(0, Math.round(cell.col))),
  };
}

export function cellToWorld(
  row: number,
  col: number,
  patch: GalePatchMetadata,
): WorldPoint {
  const [dx, dy] = patch.cell_size_m;
  return {
    x: (col - (patch.width - 1) / 2) * dx,
    z: (row - (patch.height - 1) / 2) * dy,
  };
}

export function worldToCell(
  x: number,
  z: number,
  patch: GalePatchMetadata,
): Cell {
  const [dx, dy] = patch.cell_size_m;
  return {
    row: Math.round(z / dy + (patch.height - 1) / 2),
    col: Math.round(x / dx + (patch.width - 1) / 2),
  };
}

export function cellToLatLon(
  row: number,
  col: number,
  patch: GalePatchMetadata,
): LatLon {
  const [x0, dx, , y0, , negativeDy] = patch.affine_gdal;
  const x = x0 + (col + 0.5) * dx;
  const y = y0 + (row + 0.5) * negativeDy;
  return {
    lat: (y / patch.mars_radius_m) * DEG_PER_RAD,
    lon: (x / patch.mars_radius_m) * DEG_PER_RAD,
  };
}

export function latLonToCell(
  lat: number,
  lon: number,
  patch: GalePatchMetadata,
): Cell {
  const [x0, dx, , y0, , negativeDy] = patch.affine_gdal;
  const x = lon * RAD_PER_DEG * patch.mars_radius_m;
  const y = lat * RAD_PER_DEG * patch.mars_radius_m;
  return {
    row: Math.round((y - y0) / negativeDy - 0.5),
    col: Math.round((x - x0) / dx - 0.5),
  };
}

export function worldDistanceM(
  ax: number,
  az: number,
  bx: number,
  bz: number,
): number {
  return Math.hypot(bx - ax, bz - az);
}

export function cellStepMeters(
  from: Cell,
  to: Cell,
  patch: GalePatchMetadata,
): number {
  const [dx, dy] = patch.cell_size_m;
  return Math.hypot((to.col - from.col) * dx, (to.row - from.row) * dy);
}

export function cellToRoutePoint(cell: Cell): RoutePoint {
  return { x: cell.col, y: cell.row };
}

export function routePointToCell(point: RoutePoint): Cell {
  return { row: point.y, col: point.x };
}

export function cellLabel(cell: Cell): string {
  return `row ${cell.row}, col ${cell.col}`;
}
