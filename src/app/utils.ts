export const svgxmlns = 'https://www.w3.org/2000/svg';
export function clamp(x: number, min: number, max: number): number {
  return Math.max(Math.min(x, max), min);
}
