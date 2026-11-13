import type { GalePatchMetadata, GaleWaypoint } from "../types";
import { assetUrl } from "./assets";
import { cellToLatLon } from "./geo";

interface GeoJsonPointFeature {
  type: string;
  properties?: {
    name?: string;
    row?: number;
    col?: number;
    elevation_m?: number;
    slope_deg?: number;
    synthetic?: boolean;
  };
  geometry?: {
    type?: string;
    coordinates?: number[];
  };
}

interface GeoJsonCollection {
  type?: string;
  features?: GeoJsonPointFeature[];
}

export async function loadGaleWaypoints(
  patch: GalePatchMetadata,
  signal?: AbortSignal,
): Promise<GaleWaypoint[]> {
  const response = await fetch(
    assetUrl("data/gale/data/example_route.geojson"),
    { signal },
  );
  if (!response.ok) {
    throw new Error(`example_route.geojson: HTTP ${response.status}`);
  }

  const collection = (await response.json()) as GeoJsonCollection;
  const features = collection.features ?? [];
  const waypoints: GaleWaypoint[] = [];

  for (const feature of features) {
    if (feature.geometry?.type !== "Point") continue;
    const properties = feature.properties ?? {};
    const row = properties.row;
    const col = properties.col;
    if (typeof row !== "number" || typeof col !== "number") continue;

    const fallback = cellToLatLon(row, col, patch);
    const coordinates = feature.geometry.coordinates ?? [];
    const lon = Number.isFinite(coordinates[0]) ? coordinates[0] : fallback.lon;
    const lat = Number.isFinite(coordinates[1])
      ? coordinates[1]
      : fallback.lat;
    const ordinal = waypoints.length + 1;

    waypoints.push({
      id: `wp-${ordinal}`,
      label: `WP${ordinal}`,
      name: properties.name ?? `Demo waypoint ${ordinal}`,
      lat,
      lon,
      row,
      col,
      elevationM: properties.elevation_m ?? 0,
      slopeDeg: properties.slope_deg ?? 0,
      synthetic: properties.synthetic !== false,
    });
  }

  return waypoints;
}
