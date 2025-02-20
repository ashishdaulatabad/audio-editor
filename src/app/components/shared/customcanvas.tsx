import React from "react";

export function Canvas(props: React.PropsWithoutRef<{
  image: OffscreenCanvas,
  w: number,
  h: number,
  ox?: number,
  oy?: number,
  offset?: number
}>) {
  const ref = React.createRef<HTMLCanvasElement>();

  React.useEffect(() => {
    if (ref.current) {
      const context = ref.current.getContext('2d') as CanvasRenderingContext2D;
      context.drawImage(props.image, 0, 0, props.w, props.h)
    }
  }, [props.w]);

  return (
    <canvas
      ref={ref}
      width={props.w}
      height={props.h}
    ></canvas>
  );
}