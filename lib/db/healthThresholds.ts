export function statusFromRatio(value: number, warn: number, danger: number) {
  if (value >= danger) return "red";
  if (value >= warn) return "yellow";
  return "green";
}

export function statusFromMs(value: number, warn: number, danger: number) {
  if (value >= danger) return "red";
  if (value >= warn) return "yellow";
  return "green";
}

export function statusFromBytes(value: number, warn: number, danger: number) {
  if (value >= danger) return "red";
  if (value >= warn) return "yellow";
  return "green";
}
