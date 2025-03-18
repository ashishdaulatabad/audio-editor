import { svgxmlns } from '@/app/utils';
import React from "react";

/**
 * @description Region Selection performed by the user.
 */
export interface RegionSelection {
  /**
   * @description Starting range of the track.
   */
  trackStart: number
  /**
   * @description Ending range of the track.
   */
  trackEnd: number
  /**
   * @description Starting point of selection, in seconds.
   */
  pointStartSec: number
  /**
   * @descrption Ending point of selection, in seconds.
   */
  pointEndSec: number
}

interface RegionSelectProps {
  w: number
  h: number
  trackHeight: number
  lineDist: number
  unitTime: number
  onRegionSelect: (event: RegionSelection) => void
  onRegionSelectDone?: (event: RegionSelection) => void
}

export function RegionSelect(props: React.PropsWithChildren<RegionSelectProps>) {
  const [startX, setStartX] = React.useState(0);
  const [startY, setStartY] = React.useState(0);
  const [endX, setEndX] = React.useState(0);
  const [endY, setEndY] = React.useState(0);
  const [hold, setHold] = React.useState(false);

  function setDrag(event: React.MouseEvent<HTMLDivElement, MouseEvent>) {
    setHold(true);
    setStartX(event.nativeEvent.offsetX);
    setStartY(event.nativeEvent.offsetY);
    setEndX(event.nativeEvent.offsetX);
    setEndY(event.nativeEvent.offsetY);
  }

  function dragRectangle(event: React.MouseEvent<HTMLDivElement, MouseEvent>) {
    if (event.buttons === 1 && hold) {
      setEndX(event.nativeEvent.offsetX);
      setEndY(event.nativeEvent.offsetY);

      /// Get timer
      const startTimePoint = Math.min(startX, event.nativeEvent.offsetX);
      const endTimePoint = Math.max(startX, event.nativeEvent.offsetX);

      const pointStartSec = (startTimePoint / props.lineDist) * props.unitTime;
      const pointEndSec = (endTimePoint / props.lineDist) * props.unitTime;

      /// Get tracks
      const startTrackPoint = Math.min(startY, event.nativeEvent.offsetY);
      const endTrackPoint = Math.max(startY, event.nativeEvent.offsetY);

      const trackStart = Math.floor(startTrackPoint / props.trackHeight);
      const trackEnd = Math.floor(endTrackPoint / props.trackHeight);

      props.onRegionSelect({
        trackStart,
        trackEnd,
        pointStartSec,
        pointEndSec
      })
    }
  }

  function leaveRegionSelect(event: React.MouseEvent<HTMLDivElement, MouseEvent>) {
    setHold(false);
    setStartX(0);
    setStartY(0);
    setEndX(0);
    setEndY(0);

    /// Get timer
    const startTimePoint = Math.min(startX, event.nativeEvent.offsetX);
    const endTimePoint = Math.max(startX, event.nativeEvent.offsetX);

    const pointStartSec = (startTimePoint / props.lineDist) * props.unitTime;
    const pointEndSec = (endTimePoint / props.lineDist) * props.unitTime;

    /// Get tracks
    const startTrackPoint = Math.min(startY, event.nativeEvent.offsetY);
    const endTrackPoint = Math.max(startY, event.nativeEvent.offsetY);

    const trackStart = Math.floor(startTrackPoint / props.trackHeight);
    const trackEnd = Math.floor(endTrackPoint / props.trackHeight);
    props.onRegionSelectDone && props.onRegionSelectDone({
      trackStart,
      trackEnd,
      pointStartSec,
      pointEndSec
    });
  }

  return (
    <div
      className="absolute w-full h-full z-[100] cursor-crosshair"
      onMouseDown={setDrag}
      onMouseLeave={leaveRegionSelect}
      onMouseUp={leaveRegionSelect}
      onMouseMove={dragRectangle}
    >
      <svg xmlns={svgxmlns} width={props.w} height={props.h}>
        <rect
          x={Math.min(startX, endX)}
          y={Math.min(startY, endY)} 
          width={Math.abs(endX - startX)}
          height={Math.abs(endY - startY)}
          fill="#C2566733"
          stroke="#E18891"
        ></rect>
      </svg>
    </div>
  );
}
