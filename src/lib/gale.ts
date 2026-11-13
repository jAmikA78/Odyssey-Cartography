import { assetUrl } from "./assets";
import type {
  GalePatchMetadata,
  GaleTerrain,
  GridMeta,
  TerrainSurface,
} from "../types";

export const DEFAULT_MAX_SLOPE_DEG = 20;

export const SURFACE_TEXTURES: Record<TerrainSurface, string> = {
  ctx: "data/gale/data/texture_ctx.jpg",
  hillshade: "data/gale/data/hillshade.png",
  slope: "data/gale/data/slope_preview.png",
  geology: "data/gale/data/geology.geojson",
};

async function fetchChecked(
  path: string,
  signal?: AbortSignal,
): Promise<Response> {
  const response = await fetch(assetUrl(path), { signal });
  if (!response.ok) {
    throw new Error(`${path}: HTTP ${response.status}`);
  }
  return response;
}

export function buildNoGo(
  slope: Float32Array,
  maxSlopeDeg: number,
): Uint8Array {
  const noGo = new Uint8Array(slope.length);
  for (let i = 0; i < slope.length; i += 1) {
    noGo[i] = slope[i] > maxSlopeDeg ? 1 : 0;
  }
  return noGo;
}

export async function loadGaleTerrain(
  signal?: AbortSignal,
): Promise<GaleTerrain> {
  const [metaResponse, elevationResponse, slopeResponse] = await Promise.all([
    fetchChecked("data/gale/data/metadata.json", signal),
    fetchChecked("data/gale/data/elevation.f32", signal),
    fetchChecked("data/gale/data/slope.f32", signal),
  ]);

  const patch = (await metaResponse.json()) as GalePatchMetadata;
  const elevation = new Float32Array(await elevationResponse.arrayBuffer());
  const slope = new Float32Array(await slopeResponse.arrayBuffer());
  const expected = patch.width * patch.height;

  if (elevation.length !== expected || slope.length !== expected) {
    throw new Error(
      `Gale raster size mismatch: expected ${expected} cells, got elevation ${elevation.length}, slope ${slope.length}.`,
    );
  }

  const [west, south, east, north] = patch.bounds_lonlat_deg;
  const meta: GridMeta = {
    width: patch.width,
    height: patch.height,
    bbox: [west, south, east, north],
    center: [(south + north) / 2, (west + east) / 2],
    metersPerCell: patch.cell_size_m[0],
    source:
      "MSL Gale Merged DEM (Calef & Parker 2016), offline 20 m subset; see public/data/gale/SOURCES.md",
  };

  let minElevation = Infinity;
  let maxElevation = -Infinity;
  for (let i = 0; i < elevation.length; i += 1) {
    const value = elevation[i];
    if (value < minElevation) minElevation = value;
    if (value > maxElevation) maxElevation = value;
  }

  return {
    meta,
    patch,
    elevation,
    slope,
    noGo: buildNoGo(slope, DEFAULT_MAX_SLOPE_DEG),
    minElevation,
    maxElevation,
  };
}