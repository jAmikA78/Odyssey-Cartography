import { assetUrl } from "../lib/assets";
import "./c2-extras.css";

interface CuriosityImage {
  id: string;
  file: string;
  title: string;
  when: string;
  credit: string;
  sourceUrl: string;
}

const CURIOSITY_IMAGES: CuriosityImage[] = [
  {
    id: "PIA19039",
    file: "pov/pia19039.jpg",
    title: "Pahrump Hills walkabout (annotated Mastcam view)",
    when: "Autumn 2014 · walkabout Sol 780–794",
    credit: "NASA/JPL-Caltech/MSSS",
    sourceUrl: "https://photojournal.jpl.nasa.gov/catalog/PIA19039",
  },
  {
    id: "PIA21041",
    file: "pov/pia21041.jpg",
    title: "Sloping hillside in the Murray Buttes region, lower Mount Sharp",
    when: "Released 2016-09-09",
    credit: "NASA/JPL-Caltech/MSSS",
    sourceUrl: "https://photojournal.jpl.nasa.gov/catalog/PIA21041",
  },
  {
    id: "PIA23137",
    file: "pov/pia23137.jpg",
    title: "Curiosity Sees Waves in the Clay Unit",
    when: "Sol 2299 · 23 Jan 2019",
    credit: "NASA/JPL-Caltech/MSSS",
    sourceUrl: "https://photojournal.jpl.nasa.gov/catalog/PIA23137",
  },
];

export function PovGallery() {
  return (
    <section className="panel" aria-labelledby="pov-panel-title">
      <div className="panel-heading">
        <h2 id="pov-panel-title">Curiosity surface context</h2>
        <span className="panel-tag">Gale Crater · Mastcam</span>
      </div>
      <p className="panel-note">
        Real Curiosity Mastcam images from Gale Crater, shown for visual context
        only. They were not taken at this patch or at the demo waypoints, which
        are synthetic.
      </p>

      <div className="pov-grid">
        {CURIOSITY_IMAGES.map((item) => (
          <article className="pov-card" key={item.id}>
            <img
              src={assetUrl(item.file)}
              alt={item.title}
              loading="lazy"
              style={{ width: "100%", height: "96px", objectFit: "cover", display: "block" }}
            />
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
    </section>
  );
}