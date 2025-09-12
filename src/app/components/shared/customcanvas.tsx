import React from 'react';

/**
 * TODO: Add some information for debugging info.
 * @param props 
 * @returns 
 */
export function Canvas(props: React.PropsWithoutRef<{
  image: OffscreenCanvas
  w: number
  h: number
}>) {
  const ref = React.useRef<HTMLCanvasElement>(null);
  const {w, h, image} = props;

  React.useEffect(() => {
    if (ref.current) {
      const context = ref.current.getContext('2d');

      if (!(context instanceof CanvasRenderingContext2D)) {
        console.log('Cannot draw image on canvas');
        return;
      }

      context.clearRect(0, 0, w, h);
      context.drawImage(image, 0, 0, w, h);
    }
  });

  return <canvas ref={ref} width={w} height={h}></canvas>;
}