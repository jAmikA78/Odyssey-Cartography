import { useState } from "react";

export function CaveatBanner() {
  const [open, setOpen] = useState(false);
  return (
    <div className="caveat-banner" role="note">
      <strong>Demo planner.</strong> Routes are computed from a local 20 m DEM
      and CTX subset, not rover telemetry, and are not a safety assessment.{" "}
      <button
        type="button"
        className="caveat-toggle"
        aria-expanded={open}
        onClick={() => setOpen((show) => !show)}
      >
        {open ? "Hide details" : "What does this mean?"}
      </button>
      {open ? (
        <span className="caveat-more">
          Mineral colors are CRISM spectral indices from one 2007 orbital
          observation (97.2% of cells measured; the west/southwest wedge is
          gap-filled and flagged on hover): candidate signatures, not mineral
          abundances or soil chemistry. The boxwork location is unverified.
        </span>
      ) : null}
    </div>
  );
}
