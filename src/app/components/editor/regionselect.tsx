import { SVGXMLNS } from '@/app/utils';
import React from "react";

/**
 * @description Region Selection performed by the user.
 */
export interface RegionSelection {
  trackStart: number
  trackEnd: number
  pointStartSec: number
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

  const {lineDist, trackHeight, unitTime} = props;

  function setDrag(event: React.MouseEvent<HTMLDivElement, MouseEvent>) {
    setHold(true);
    setStartX(event.nativeEvent.offsetX);
    setStartY(event.nativeEvent.offsetY);
    setEndX(event.nativeEvent.offsetX);
    setEndY(event.nativeEvent.offsetY);
  }

  function dragRectangle(event: React.MouseEvent<HTMLDivElement>) {
    if (event.buttons === 1 && hold) {
      const { offsetX, offsetY } = event.nativeEvent;
      setEndX(offsetX);
      setEndY(offsetY);

      /// Get timer
      const startTimePoint = Math.min(startX, offsetX);
      const endTimePoint = Math.max(startX, offsetX);

      const pointStartSec = (startTimePoint / lineDist) * unitTime;
      const pointEndSec = (endTimePoint / lineDist) * unitTime;

      /// Get tracks
      const startTrackPoint = Math.min(startY, offsetY);
      const endTrackPoint = Math.max(startY, offsetY);

      const trackStart = Math.floor(startTrackPoint / trackHeight);
      const trackEnd = Math.floor(endTrackPoint / trackHeight);

      props.onRegionSelect({
        trackStart,
        trackEnd,
        pointStartSec,
        pointEndSec
      })
    }
  }

  function leaveRegionSelect(event: React.MouseEvent<HTMLDivElement>) {
    const {offsetX, offsetY} = event.nativeEvent;

    setHold(false);
    setStartX(0);
    setStartY(0);
    setEndX(0);
    setEndY(0);

    const startTimePoint = Math.min(startX, offsetX);
    const endTimePoint = Math.max(startX, offsetX);

    const pointStartSec = (startTimePoint / lineDist) * unitTime;
    const pointEndSec = (endTimePoint / lineDist) * unitTime;

    const startTrackPoint = Math.min(startY, offsetY);
    const endTrackPoint = Math.max(startY, offsetY);

    const trackStart = Math.floor(startTrackPoint / trackHeight);
    const trackEnd = Math.floor(endTrackPoint / trackHeight);

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
      <svg xmlns={SVGXMLNS} width={props.w} height={props.h}>
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
