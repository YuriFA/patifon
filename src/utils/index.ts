export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "-:--";
  }
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function validateInRange(value: number, min: number, max: number): number {
  if (value > max) {
    return max;
  }
  if (value < min) {
    return min;
  }
  return value;
}
