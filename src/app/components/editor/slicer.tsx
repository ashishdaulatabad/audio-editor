import { utils } from "@/app/utils";
import React from "react";

export interface SlicerSelection {
  startTrack: number,
  endTrack: number,
  pointOfSliceSecs: number
}

interface SlicerProps {
  w: number,
  h: number,
  trackHeight: number,
  lineDist: number,
  unitTime: number
  onSliceSelect: (slicer: SlicerSelection) => void
}

export function Slicer(props: React.PropsWithoutRef<SlicerProps>) {
  const [startX, setStartX] = React.useState(0);
  const [startY, setStartY] = React.useState(0);
  const [endX, setEndX] = React.useState(0);
  const [endY, setEndY] = React.useState(0);
  // const [hold, setHold] = React.useState(0)

  function setupDrag(event: React.MouseEvent<HTMLDivElement, MouseEvent>) {
    setStartX(event.nativeEvent.offsetX);
    const multiplier = event.nativeEvent.offsetY / props.trackHeight;
    const level = Math.round(multiplier) * props.trackHeight;
    setStartY(level);
    setEndY(level);
  }

  /** */
  function leaveSlicer() {
    const pointOfSliceSecs = (startX / props.lineDist) * props.unitTime;
    const trackFirst = Math.round(startY / props.trackHeight);
    const trackSecond = Math.round(endY / props.trackHeight);
    const startTrack = Math.min(trackFirst, trackSecond), endTrack = Math.max(trackFirst, trackSecond) - 1;

    if (startTrack <= endTrack) {
      props.onSliceSelect({
        pointOfSliceSecs,
        startTrack,
        endTrack
      });
    }

    setStartX(0);
    setStartY(0);
    setEndY(0);
  }

  function dragSlicer(event: React.MouseEvent<HTMLDivElement, MouseEvent>) {
    if (event.buttons === 1) {
      const multiplier = event.nativeEvent.offsetY / props.trackHeight;
      const level = Math.round(multiplier) * props.trackHeight;
      setEndY(level);
    }
  }

  return (
    <>  
      <div
        className="absolute w-full h-full z-[11]"
        onMouseDown={setupDrag}
        onMouseLeave={leaveSlicer}
        onMouseUp={leaveSlicer}
        onMouseMove={dragSlicer}
      >
        <svg xmlns={utils.constants.svgxmlns} width={props.w} height={props.h}>
          <path stroke="#fff" strokeWidth={2} d={`M ${startX} ${startY} L ${startX} ${endY}`}></path>
        </svg>
      </div>
    </>
  )
}