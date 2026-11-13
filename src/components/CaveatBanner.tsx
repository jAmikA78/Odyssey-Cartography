export function CaveatBanner() {
  return (
    <div className="caveat-banner" role="note">
      <strong>Demo planner.</strong> Routes are computed from a local 20 m DEM
      and CTX subset, not rover telemetry, and are not a safety assessment. The
      boxwork location is unverified.
    </div>
  );
}
