export function CaveatBanner() {
  return (
    <div className="caveat-banner" role="note">
      <strong>Demo planner.</strong> Routes are computed from a local 20 m DEM
      and CTX subset, not rover telemetry, and are not a safety assessment.
      Mineral colors are CRISM spectral indices from one 2007 orbital
      observation (97.2% of cells measured; the west/southwest wedge is
      gap-filled and flagged on hover): candidate signatures, not mineral
      abundances or soil chemistry. The boxwork location is unverified.
    </div>
  );
}
