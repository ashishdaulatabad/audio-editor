const colorSet: Set<string> = new Set();
const windowSet: Set<number> = new Set();

export function randomColor() {
  let value = '';
  do {
    const r = Math.round(Math.random() * 160);
    const g = Math.round(Math.random() * 160);
    const b = Math.round(Math.random() * 160);

    value = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  } while (colorSet.has(value));

  colorSet.add(value);

  return value;
}

export function deleteColor(color: string) {
  colorSet.delete(color);
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
