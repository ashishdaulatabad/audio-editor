const colorSet: Set<string> = new Set();

export function randomColor() {
  let value = '';
  do {
    const r = Math.round(Math.random() * 192);
    const g = Math.round(Math.random() * 192);
    const b = Math.round(Math.random() * 192);

    value = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  } while (colorSet.has(value));

  colorSet.add(value);

  return value;
}

export function deleteColor(color: string) {
  colorSet.delete(color);
}