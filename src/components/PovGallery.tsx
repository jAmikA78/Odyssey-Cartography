import "./c2-extras.css";

interface CuriosityReference {
  id: string;
  sol: number;
  location: string;
  caption: string;
  credit: string;
  sourceUrl: string;
  horizonSvg: string;
}

const CURIOSITY_REFERENCES: CuriosityReference[] = [
  {
    id: "pov-sol-753",
    sol: 753,
    location: "Pahrump Hills · Lower Mount Sharp, Gale Crater",
    caption:
      "Laminated mudstone outcrops and sulfate-bearing bedrock inspected by MSL Curiosity Mastcam.",
    credit: "NASA / JPL-Caltech / MSSS (PIA19039)",
    sourceUrl: "https://photojournal.jpl.nasa.gov/catalog/PIA19039",
    horizonSvg:
      "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 130'><rect width='400' height='130' fill='%23231a14'/><polygon points='0,65 95,48 210,58 320,42 400,55 400,130 0,130' fill='%236d4b34'/><polygon points='0,92 130,82 260,96 400,85 400,130 0,130' fill='%234a3223'/><text x='14' y='24' fill='%23ffd260' font-family='sans-serif' font-size='12' font-weight='bold'>MSL CURIOSITY MASTCAM · SOL 753</text></svg>",
  },
  {
    id: "pov-sol-1454",
    sol: 1454,
    location: "Murray Buttes · Aeolis Mons Foothills, Gale Crater",
    caption:
      "Cross-bedded sandstone buttes surrounded by steep talus slopes (~20°+ trafficability hazard context).",
    credit: "NASA / JPL-Caltech / MSSS (PIA21046)",
    sourceUrl: "https://photojournal.jpl.nasa.gov/catalog/PIA21046",
    horizonSvg:
      "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 130'><rect width='400' height='130' fill='%23281c15'/><polygon points='40,85 75,32 145,32 180,85' fill='%238c5a3c'/><polygon points='230,88 270,40 340,40 375,88' fill='%23784c32'/><rect y='85' width='400' height='45' fill='%23493122'/><text x='14' y='24' fill='%23ffd260' font-family='sans-serif' font-size='12' font-weight='bold'>MSL CURIOSITY MASTCAM · SOL 1454</text></svg>",
  },
  {
    id: "pov-sol-2300",
    sol: 2300,
    location: "Glen Torridon Clay-Bearing Unit · NW Mount Sharp",
    caption:
      "Undulating pebble-strewn regolith and low-slope fractured bedrock corridors in Gale Crater.",
    credit: "NASA / JPL-Caltech / MSSS (PIA23137)",
    sourceUrl: "https://photojournal.jpl.nasa.gov/catalog/PIA23137",
    horizonSvg:
      "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 130'><rect width='400' height='130' fill='%231f1916'/><path d='M0,72 Q120,60 220,70 T400,66 L400,130 L0,130 Z' fill='%23634836'/><path d='M0,96 Q150,88 280,98 T400,92 L400,130 L0,130 Z' fill='%233f2d22'/><text x='14' y='24' fill='%23ffd260' font-family='sans-serif' font-size='12' font-weight='bold'>MSL CURIOSITY MASTCAM · SOL 2300</text></svg>",
  },
];

export function PovGallery() {
  return (
    <section className="panel" aria-labelledby="pov-panel-title">
      <div className="panel-heading">
        <h2 id="pov-panel-title">Curiosity surface context</h2>
        <span className="panel-tag">Gale Crater POV</span>
      </div>
      <p className="panel-note">
        Demo waypoints are synthetic; these verified MSL Curiosity Mastcam
        records show real Gale Crater terrain by Sol for visual context.
      </p>

      <div className="pov-grid">
        {CURIOSITY_REFERENCES.map((item) => (
          <article className="pov-card" key={item.id}>
            <img
              src={item.horizonSvg}
              alt={`${item.location} (Sol ${item.sol})`}
              style={{ width: "100%", height: "96px", objectFit: "cover", display: "block" }}
            />
            <div className="pov-body">
              <div className="pov-sol">Sol {item.sol}</div>
              <h3 className="pov-title">{item.location}</h3>
              <p className="pov-caption">{item.caption}</p>
              <div className="pov-credit">
                {item.credit} ·{" "}
                <a href={item.sourceUrl} target="_blank" rel="noreferrer">
                  NASA Catalog
                </a>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}