import { useState } from "react";
import { assetUrl } from "../lib/assets";
import "./c2-extras.css";

interface CuriosityImage {
  id: string;
  file: string;
  title: string;
  when: string;
  credit: string;
  sourceUrl: string;
  plannerRelevance: string;
}

const CURIOSITY_IMAGES: CuriosityImage[] = [
  {
    id: "PIA19039",
    file: "pov/pia19039.jpg",
    title: "Pahrump Hills walkabout (annotated Mastcam view)",
    when: "Autumn 2014 · walkabout Sol 780–794",
    credit: "NASA/JPL-Caltech/MSSS",
    sourceUrl: "https://photojournal.jpl.nasa.gov/catalog/PIA19039",
    plannerRelevance:
      "Demonstrates how NASA traverse planners link multi-waypoint field stations across layered sedimentary outcrops before committing to sample stops.",
  },
  {
    id: "PIA21041",
    file: "pov/pia21041.jpg",
    title: "Sloping hillside in the Murray Buttes region, lower Mount Sharp",
    when: "Released 2016-09-09",
    credit: "NASA/JPL-Caltech/MSSS",
    sourceUrl: "https://photojournal.jpl.nasa.gov/catalog/PIA21041",
    plannerRelevance:
      "Illustrates steep, boulder-strewn talus slopes at lower Mount Sharp—visually reinforcing why our A* planner enforces slope thresholds to keep EVA crews on stable ground.",
  },
  {
    id: "PIA23137",
    file: "pov/pia23137.jpg",
    title: "Curiosity Sees Waves in the Clay Unit",
    when: "Sol 2299 · 23 Jan 2019",
    credit: "NASA/JPL-Caltech/MSSS",
    sourceUrl: "https://photojournal.jpl.nasa.gov/catalog/PIA23137",
    plannerRelevance:
      "Shows the clay-bearing bedrock of Glen Torridon in Gale Crater, providing ground-level visual context alongside orbital mineral/spectral layers.",
  },
];

export function PovGallery() {
  const [activeImage, setActiveImage] = useState<CuriosityImage | null>(null);

  return (
    <section className="panel" aria-labelledby="pov-panel-title">
      <div className="panel-heading">
        <h2 id="pov-panel-title">Curiosity surface context</h2>
        <span className="panel-tag">Gale Crater · Mastcam</span>
      </div>
      <p className="panel-note">
        Real Curiosity Mastcam images from Gale Crater, shown for visual context
        only. Click any image to inspect full-resolution field context.
      </p>

      <div className="pov-grid">
        {CURIOSITY_IMAGES.map((item) => (
          <article className="pov-card" key={item.id}>
            <button
              type="button"
              className="pov-thumb-btn"
              onClick={() => setActiveImage(item)}
              aria-label={`Inspect ${item.title}`}
            >
              <img
                src={assetUrl(item.file)}
                alt={item.title}
                loading="lazy"
                style={{ width: "100%", height: "96px", objectFit: "cover", display: "block" }}
              />
              <span className="pov-zoom-badge">Inspect · {item.id}</span>
            </button>
            <div className="pov-body">
              <div className="pov-sol">{item.when}</div>
              <h3 className="pov-title">{item.title}</h3>
              <div className="pov-credit">
                {item.credit} ·{" "}
                <a href={item.sourceUrl} target="_blank" rel="noreferrer">
                  NASA Photojournal {item.id}
                </a>
              </div>
            </div>
          </article>
        ))}
      </div>

      {activeImage && (
        <div
          className="mission-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={activeImage.title}
          onClick={() => setActiveImage(null)}
        >
          <div className="pov-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="mission-card-header">
              <div>
                <div className="pov-sol">
                  {activeImage.id} · {activeImage.when}
                </div>
                <h3>{activeImage.title}</h3>
              </div>
              <button
                type="button"
                className="ghost-button"
                onClick={() => setActiveImage(null)}
              >
                Close
              </button>
            </div>

            <img
              src={assetUrl(activeImage.file)}
              alt={activeImage.title}
              className="pov-modal-img"
            />

            <div className="pov-science-box">
              <strong>EVA &amp; Science Context:</strong>{" "}
              {activeImage.plannerRelevance}
            </div>

            <p className="panel-note">
              <strong>Credit &amp; Caveat:</strong> {activeImage.credit} (
              <a
                href={activeImage.sourceUrl}
                target="_blank"
                rel="noreferrer"
                style={{ color: "#49ffe2" }}
              >
                {activeImage.sourceUrl}
              </a>
              ). Reference image from Gale Crater; not captured at the synthetic
              demo waypoint coordinates.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}