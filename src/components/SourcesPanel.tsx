import { assetUrl } from "../lib/assets";

export function SourcesPanel() {
  return (
    <section className="panel" aria-labelledby="sources-panel-title">
      <div className="panel-heading">
        <h2 id="sources-panel-title">Sources & caveats</h2>
        <span className="panel-tag">Offline pack</span>
      </div>

      <ul className="source-list">
        <li>
          Terrain: MSL Gale Merged DEM (Calef &amp; Parker 2016, PDS), 20 m
          resample; merged support varies by location.
        </li>
        <li>
          CTX: NASA/JPL-Caltech/MSSS via Mars Trek, local 466 px texture;
          visual context only.
        </li>
        <li>
          Visor CTX: Caltech Murray Lab global mosaic via Esri, NASA, JPL, and
          MSSS; local 932 px crop for visual context only. The visor uses the
          same map bounds but a separate image registration.
        </li>
        <li>
          Minerals: MRO CRISM MTRDR FRT000058A3 (2007), 21 spectral summary
          indices at 18 m, co-registered to the imagery. Candidate signatures,
          not abundances or soil chemistry; no in-situ soil measurements exist
          inside this patch. 97.19% of patch cells (55,052 of 56,644) hold
          real measured values; 1,592 west/southwest wedge cells are
          gap-filled from nearest measured values, marked in
          minerals_mask.f32 and flagged by the hover readout.
        </li>
        <li>
          Geology: USGS SIM3292 1:20M regional units; one unit (Htu) covers the
          whole patch, drawn as a toggleable boundary overlay.
        </li>
        <li>3D: Three.js r128, MIT license, vendored locally.</li>
        <li>
          Safety constants: demo assumptions documented in the local safety
          model; not a mission radiation or suit model.
        </li>
      </ul>

      <p className="panel-note">
        The runtime makes no external tile, API, or telemetry requests.
      </p>

      <div className="button-row">
        <a
          className="ghost-button"
          href={assetUrl("data/gale/SOURCES.md")}
          target="_blank"
          rel="noreferrer"
        >
          Local source notes
        </a>
        <a
          className="ghost-button"
          href={assetUrl("data/gale/README.md")}
          target="_blank"
          rel="noreferrer"
        >
          Pack README
        </a>
      </div>

      <details className="assumptions">
        <summary>Limitations</summary>
        <ul>
          <li>Not verified as the Gale boxwork location.</li>
          <li>Waypoints and example route are synthetic demo data.</li>
          <li>20 m screening cannot detect rover-scale obstacles.</li>
          <li>Slope-only model; no thermal, dust, or storm-shelter model.</li>
          <li>
            Mineral layers are one 2007 orbital snapshot; dust suppresses
            signatures and values need literature thresholds before any
            detection claim.
          </li>
          <li>Dose and suit values are unverified scenario assumptions.</li>
        </ul>
      </details>
    </section>
  );
}
