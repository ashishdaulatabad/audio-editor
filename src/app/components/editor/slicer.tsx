import {SVGXMLNS} from '@/app/utils';
import React from 'react';

export interface SlicerSelection {
  startTrack: number
  endTrack: number
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

export function Slicer(props: React.PropsWithoutRef<SlicerProps>) {
  const [startX, setStartX] = React.useState(0);
  const [startY, setStartY] = React.useState(0);
  const [endY, setEndY] = React.useState(0);

  const {unitTime, trackHeight, lineDist} = props;

  function setupDrag(event: React.MouseEvent<HTMLDivElement>) {
    setStartX(event.nativeEvent.offsetX);
    const multiplier = event.nativeEvent.offsetY / trackHeight;
    const level = Math.round(multiplier) * trackHeight;
    setStartY(level);
    setEndY(level);
  }

  function leaveSlicer() {
    const pointOfSliceSecs = (startX / lineDist) * unitTime;
    const trackFirst = Math.round(startY / trackHeight);
    const trackSecond = Math.round(endY / trackHeight);
    const startTrack = Math.min(trackFirst, trackSecond);
    const endTrack = Math.max(trackFirst, trackSecond) - 1;

    if (startTrack <= endTrack) {
      props.onSliceSelect({ pointOfSliceSecs, startTrack, endTrack });
    }

    setStartX(0);
    setStartY(0);
    setEndY(0);
  }

  function dragSlicer(event: React.MouseEvent<HTMLDivElement>) {
    if (event.buttons === 1) {
      const multiplier = event.nativeEvent.offsetY / trackHeight;
      const level = Math.round(multiplier) * trackHeight;
      setEndY(level);
    }
  }

  return (
    <div
      className="absolute w-full h-full z-[11]"
      onMouseDown={setupDrag}
      onMouseLeave={leaveSlicer}
      onMouseUp={leaveSlicer}
      onMouseMove={dragSlicer}
    >
      <svg xmlns={SVGXMLNS} width={props.w} height={props.h}>
        <path 
          stroke="#fff"
          strokeWidth={2}
          d={`M ${startX} ${startY} L ${startX} ${endY}`}
        ></path>
      </svg>
    </div>
  );
}
