import { svgxmlns } from "@/app/utils";
import React from "react";

/**
 * @description Slicer information
 */
export interface SlicerSelection {
  /**
   * @description Starting track for the slicer
   */
  startTrack: number
  /**
   * @description Ending track of slicer.
   */
  endTrack: number
  /**
   * @description Exact point of time where a track is sliced
   */
  pointOfSliceSecs: number
}

/**
 * @description Slicer Component details.
 */
interface SlicerProps {
  /**
   * @description Width of workspace
   */
  w: number
  /**
   * @description height of workspace
   */
  h: number
  /**
   * @description Height of each track
   */
  trackHeight: number
  /**
   * @description Distance between two line
   */
  lineDist: number
  /**
   * @description  Time difference between two thick lines
   */
  unitTime: number
  /**
   * @description On Slice select interacted by user.
   * @param slicer Slicer information (see `SlicerSelection`).
   * @returns void.
   */
  onSliceSelect: (slicer: SlicerSelection) => void
}

/**
 * @description Slicer component that tracks
 * @param props Metadata of workspace
 * @returns Slice component
 */
export function Slicer(props: React.PropsWithoutRef<SlicerProps>) {
  const [startX, setStartX] = React.useState(0);
  const [startY, setStartY] = React.useState(0);
  const [endY, setEndY] = React.useState(0);

  /**
   * @description Setup dragging for slicing tracks.
   * @param event Event details
   */
  function setupDrag(event: React.MouseEvent<HTMLDivElement, MouseEvent>) {
    setStartX(event.nativeEvent.offsetX);
    const multiplier = event.nativeEvent.offsetY / props.trackHeight;
    const level = Math.round(multiplier) * props.trackHeight;
    setStartY(level);
    setEndY(level);
  }

  /** 
   * @description End slicing operation
   * @returns void
   */
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

  /**
   * @description Drag slicer.
   * @param event Event details.
   */
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
        <svg xmlns={svgxmlns} width={props.w} height={props.h}>
          <path stroke="#fff" strokeWidth={2} d={`M ${startX} ${startY} L ${startX} ${endY}`}></path>
        </svg>
      </div>
    </>
  )
}
