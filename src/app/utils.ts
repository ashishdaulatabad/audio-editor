export const utils = {
  constants: {
    svgxmlns: 'https://www.w3.org/2000/svg'
  },
  fn: {
    clamp: function(x: number, min: number, max: number): number {
      return Math.max(Math.min(x, max), min);
    }
  }
}