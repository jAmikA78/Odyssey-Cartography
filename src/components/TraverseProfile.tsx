import { useMemo } from "react";
import { sampleTraverse } from "../lib/traverse";
import { formatHours } from "../lib/format";
import type { GaleRouteResult, GaleTerrain } from "../types";

interface Props {
  terrain: GaleTerrain;
  route: GaleRouteResult | null;
  progress: number;
  playing: boolean;
  onProgress: (value: number) => void;
  onPlay: () => void;
}

export function TraverseProfile({ terrain, route, progress, playing, onProgress, onPlay }: Props) {
  const samples = useMemo(() => sampleTraverse(terrain, route), [terrain, route]);
  const total = samples.at(-1)?.distanceM ?? 0;
  const low = samples.length ? Math.min(...samples.map(p => p.elevation)) : 0;
  const high = samples.length ? Math.max(...samples.map(p => p.elevation)) : 0;
  const x = (distance: number) => 8 + distance / Math.max(1, total) * 784;
  const y = (elevation: number) => 62 - (elevation - low) / Math.max(1, high - low) * 48;
  const line = samples.map((p, i) => `${i ? "L" : "M"}${x(p.distanceM).toFixed(2)},${y(p.elevation).toFixed(2)}`).join(" ");
  const selected = samples.find(p => p.distanceM >= progress * total) ?? samples.at(-1);
  const available = samples.length > 1;

  return <section className="traverse-profile" aria-label="Route elevation and playback">
    <div className="profile-topline">
      <div><span className="eyebrow">Traverse preview</span><strong>{available ? `${(total / 1000).toFixed(2)} km of possibility` : "Your next traverse starts here"}</strong></div>
      <button className="play-button" disabled={!available} onClick={onPlay} aria-label={playing ? "Pause traverse preview" : progress >= 1 ? "Replay traverse preview" : "Play traverse preview"}>
        <span aria-hidden="true">{playing ? "Ⅱ" : "▶"}</span> {playing ? "Pause" : progress >= 1 ? "Replay" : "Preview route"}
      </button>
    </div>
    {available ? <>
      <div className="profile-chart">
        <svg viewBox="0 0 800 76" preserveAspectRatio="none" role="img" aria-label={`DEM elevation profile, ${Math.round(low)} to ${Math.round(high)} meters`}>
          <defs><linearGradient id="profile-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#65e3ce" stopOpacity=".25"/><stop offset="100%" stopColor="#65e3ce" stopOpacity="0"/></linearGradient></defs>
          {[18, 40, 62].map(v => <path key={v} d={`M0 ${v} H800`} stroke="#ffffff" strokeOpacity=".06" strokeDasharray="3 7"/>)}
          <path d={`${line} L792,76 L8,76 Z`} fill="url(#profile-fill)"/>
          <path d={line} fill="none" stroke="#65e3ce" strokeWidth="2" vectorEffect="non-scaling-stroke"/>
          <path d={`M${x(progress * total)} 0 V76`} stroke="#f9bc80" strokeDasharray="3 3"/>
          {selected && <circle cx={x(selected.distanceM)} cy={y(selected.elevation)} r="4" fill="#f9bc80"/>}
        </svg>
        <input type="range" min="0" max="1000" value={Math.round(progress * 1000)} onChange={e => onProgress(Number(e.target.value) / 1000)} aria-label="Traverse preview position" aria-valuetext={`${(progress * total / 1000).toFixed(2)} km along route`}/>
      </div>
      <div className="profile-labels"><span>{(progress * total / 1000).toFixed(2)} / {(total / 1000).toFixed(2)} km</span><span>{selected && `${Math.round(selected.elevation)} m · ${selected.slope.toFixed(1)}°`}</span><span>{route && formatHours(route.durationH)} estimated walk</span></div>
      <p className="profile-note">20 m DEM samples · compressed playback, not live telemetry · drag to explore</p>
    </> : <p className="panel-note">{route && !route.ok ? "This route is blocked. Choose a traversable start and destination." : "Choose two points to reveal the elevation profile and preview your route."}</p>}
  </section>;
}
