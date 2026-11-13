export function formatKm(value: number): string {
  return `${value.toFixed(2)} km`;
}

export function formatHours(value: number): string {
  const totalMinutes = Math.round(value * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours} h ${minutes.toString().padStart(2, "0")} min`;
}

export function formatDegrees(value: number): string {
  return `${value.toFixed(1)}°`;
}

export function formatDose(value: number): string {
  return `${value.toFixed(3)} mSv`;
}

export function formatMeters(value: number): string {
  return `${Math.round(value)} m`;
}

export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function formatLatLon(value: number, axis: "lat" | "lon"): string {
  const hemisphere =
    axis === "lat" ? (value >= 0 ? "N" : "S") : value >= 0 ? "E" : "W";
  return `${Math.abs(value).toFixed(4)}° ${hemisphere}`;
}
