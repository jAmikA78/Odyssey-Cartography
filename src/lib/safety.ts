import type {
  GaleRouteResult,
  SafetyConfig,
  SafetyEvaluation,
  SafetyStatus,
} from "../types";
import { assetUrl } from "./assets";

export const DEFAULT_SAFETY: SafetyConfig = {
  baselineDoseRatePerDay: 0.64,
  nominalEvaHours: 6,
  maxEvaHours: 8,
  walkSpeedKmH: 1.2,
  suitReserve: 0.25,
  maxSlopeDeg: 20,
  doseBudgetMsV: 150,
  sources: [
    "MSL RAD archive: https://pds-ppi.igpp.ucla.edu/data/MSL-M-RAD-3-RDR-V1.0/",
  ],
  notes: [
    "Scenario assumptions for a hackathon demo; not a mission radiation or suit model.",
    "Baseline dose rate is unverified and needs a specific citation.",
  ],
};

export async function loadSafetyConfig(
  signal?: AbortSignal,
): Promise<SafetyConfig> {
  try {
    const response = await fetch(assetUrl("data/safety.json"), { signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const parsed = (await response.json()) as Partial<SafetyConfig>;
    return { ...DEFAULT_SAFETY, ...parsed };
  } catch (error) {
    if (signal?.aborted) throw error;
    return DEFAULT_SAFETY;
  }
}

export function evaluateSafety(
  route: GaleRouteResult,
  config: SafetyConfig,
): SafetyEvaluation {
  if (!route.ok) {
    return {
      status: "blocked",
      doseMsV: 0,
      walkHours: 0,
      requiredSuitHours: 0,
      warnings:
        route.warnings.length > 0
          ? route.warnings
          : ["No traversable route found at the current slope limit."],
      assumptions: assumptionNotes(config),
    };
  }

  const walkHours = route.distanceKm / config.walkSpeedKmH;
  const requiredSuitHours = walkHours * (1 + config.suitReserve);
  const doseMsV = config.baselineDoseRatePerDay * (walkHours / 24);
  const warnings: string[] = [];
  let status: SafetyStatus = "normal";

  const block = (message: string): void => {
    status = "blocked";
    warnings.push(message);
  };
  const caution = (message: string): void => {
    if (status !== "blocked") status = "caution";
    warnings.push(message);
  };

  if (route.maxSlope > config.maxSlopeDeg) {
    block(`Route exceeds the ${config.maxSlopeDeg}° traversable-slope limit.`);
  }
  if (walkHours > config.maxEvaHours) {
    block("Route exceeds the maximum EVA duration.");
  }
  if (requiredSuitHours > config.maxEvaHours) {
    block("Route exceeds the suit duration limit.");
  }
  if (doseMsV > config.doseBudgetMsV) {
    block("Estimated dose exceeds the scenario budget.");
  }
  if (walkHours > config.nominalEvaHours) {
    caution("Route exceeds the nominal EVA duration; review reserves.");
  }
  if (requiredSuitHours > config.nominalEvaHours) {
    caution("Suit reserve is tight; shorten the route if possible.");
  }

  return {
    status,
    doseMsV,
    walkHours,
    requiredSuitHours,
    warnings,
    assumptions: assumptionNotes(config),
  };
}

function assumptionNotes(config: SafetyConfig): string[] {
  return [
    `Baseline dose ${config.baselineDoseRatePerDay} mSv/day is an unverified demo assumption, not a Mars surface measurement.`,
    `${config.walkSpeedKmH} km/h walking speed, ${Math.round(
      config.suitReserve * 100,
    )}% suit reserve, ${config.nominalEvaHours} h nominal / ${
      config.maxEvaHours
    } h max EVA, and ${config.doseBudgetMsV} mSv budget are scenario assumptions.`,
    "Slope-only screening: no rover-scale obstacle inventory, thermal model, or solar-particle-event shelter model.",
  ];
}
