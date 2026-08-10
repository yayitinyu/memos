export const normalizeSelectionRange = (startPos: number, endPos: number | undefined, contentLength: number): [number, number] => {
  const max = Math.max(0, contentLength);
  const clamp = (value: number, fallback: number): number => {
    const finiteValue = Number.isFinite(value) ? value : fallback;
    return Math.min(max, Math.max(0, Math.trunc(finiteValue)));
  };

  const start = clamp(startPos, 0);
  const end = clamp(endPos ?? start, start);
  return [start, Math.max(start, end)];
};
