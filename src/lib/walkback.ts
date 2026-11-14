import type { GaleRouteResult, GaleTerrain, SafetyConfig } from "../types";
import { cellStepMeters } from "./geo";

export type WalkBackStatus = "safe" | "caution" | "beyond-ponr";

export interface WalkBackStep {
  index: number;
  outboundKm: number;
  returnKm: number;
  outboundHours: number;
  returnHours: number;
  roundTripHours: number;
  usableHours: number;
  marginHours: number;
  status: WalkBackStatus;
}

export interface WalkBackEnvelope {
  steps: WalkBackStep[];
  pointOfNoReturnIndex: number | null;
  pointOfNoReturnKm: number | null;
  goalReturnHours: number;
  goalMarginHours: number;
  usableHours: number;
  reserveFraction: number;
  overallStatus: WalkBackStatus;
}

/**
 * Computes an Apollo-style EVA Walk-Back Safety Envelope along a planned traverse.
 * Scenario assumption: crew walks back along the validated A* corridor at nominal
 * walking speed while preserving the configured suit reserve fraction.
 */
export function computeWalkBackEnvelope(
  terrain: GaleTerrain,
  route: GaleRouteResult,
  config: SafetyConfig,
): WalkBackEnvelope | null {
  if (!route.ok || route.path.length === 0) return null;

  const walkSpeedKmH = config.walkSpeedKmH > 0 ? config.walkSpeedKmH : 1.2;
  const maxEvaHours = config.maxEvaHours > 0 ? config.maxEvaHours : 8;
  const reserveFraction =
    (config as { suitReserveFraction?: number }).suitReserveFraction ?? 0.25;
  const usableHours = maxEvaHours * (1 - reserveFraction);

  const steps: WalkBackStep[] = [];
  let cumulativeM = 0;
  let pointOfNoReturnIndex: number | null = null;
  let pointOfNoReturnKm: number | null = null;

  for (let i = 0; i < route.path.length; i += 1) {
    if (i > 0) {
      const prev = route.path[i - 1];
      const curr = route.path[i];
      cumulativeM += cellStepMeters(
        { row: prev.y, col: prev.x },
        { row: curr.y, col: curr.x },
        terrain.patch,
      );
    }

    const outboundKm = cumulativeM / 1000;
    const returnKm = outboundKm; // Symmetric return along validated slope-screened path
    const outboundHours = outboundKm / walkSpeedKmH;
    const returnHours = returnKm / walkSpeedKmH;
    const roundTripHours = outboundHours + returnHours;
    const marginHours = usableHours - roundTripHours;

    let status: WalkBackStatus = "safe";
    if (marginHours < 0) {
      status = "beyond-ponr";
      if (pointOfNoReturnIndex === null) {
        pointOfNoReturnIndex = i;
        pointOfNoReturnKm = outboundKm;
      }
    } else if (marginHours < 0.5) {
      status = "caution";
    }

    steps.push({
      index: i,
      outboundKm,
      returnKm,
      outboundHours,
      returnHours,
      roundTripHours,
      usableHours,
      marginHours,
      status,
    });
  }

  const last = steps[steps.length - 1];
  return {
    steps,
    pointOfNoReturnIndex,
    pointOfNoReturnKm,
    goalReturnHours: last.returnHours,
    goalMarginHours: last.marginHours,
    usableHours,
    reserveFraction,
    overallStatus: last.status,
  };
}