const colorSet: Set<string> = new Set();
const windowSet: Set<number> = new Set();
const trackIdSet: Set<number> = new Set();

export function randomColor() {
  let value = '';
  do {
    const r = Math.round(Math.random() * 110) + 80;
    const g = Math.round(Math.random() * 110) + 80;
    const b = Math.round(Math.random() * 110) + 80;

    value = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  } while (colorSet.has(value));

  colorSet.add(value);

  return value;
}

export function deleteColor(color: string) {
  colorSet.delete(color);
}

export function getRandomTrackId(): number {
  let value = 0;
  do {
    value = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
  } while (trackIdSet.has(value));

  trackIdSet.add(value);
  return value;
}

export function deleteTrackId(id: number): boolean {
  return trackIdSet.delete(id);
}

export function getRandomWindowId() {
  let value = 0;
  do {} while (windowSet.has((value = Math.round(Math.random() * (1 << 30)))));

  windowSet.add(value);

  return value;
}

export function removeRandomWindowId(value: number) {
  windowSet.delete(value);
}
