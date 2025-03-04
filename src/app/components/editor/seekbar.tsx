import React from "react";
import { svgxmlns } from "@/app/utils";
import { Seeker } from "./seeker";
import { audioManager } from "@/app/services/audiotrackmanager";
import { useSelector } from "react-redux";
import { RootState } from "@/app/state/store";
import { ModeType } from "./toolkit";

export interface TimeSectionSelection {
  startTimeMillis: number
  endTimeMillis: number
}

/**
 * @description Seekbar Props
 */
interface SeekbarProps {
  /**
   * @description Width of the seekbar (in pixels)
   */
  w: number
  /**
   * @description Height of the seekbar (in pixels)
   */
  h: number
  /**
   * @description Total lines that should be drawn
   */
  totalLines: number
  /**
   * @description Distance between two reference line (in pixels)
   */
  lineDist: number
  /**
   * @description Unit time difference between two lines (see `lineDist`).
   */
  timeUnitPerLineDistInSeconds: number
  /**
   * @description Cursor Mode
   */
  mode: ModeType
  /**
   * @description Emits an event when a region is selected.
   */
  onTimeSelection: (timeSection: TimeSectionSelection) => void
}

export function Seekbar(props: React.PropsWithoutRef<SeekbarProps>) {
  // Redux States
  const tracks = useSelector((state: RootState) => state.trackDetailsReducer.trackDetails);
  // Component states
  const [leftSeek, setLeftSeek] = React.useState(0);
  const [isUserSelectingRegion, setIsUserSelectingRegion] = React.useState(false);
  const [startRegionSelection, setStartRegionSelection] = React.useState(0);
  const [endRegionSelection, setEndRegionSelection] = React.useState(0);
  // Refs
  const divRef = React.useRef<HTMLDivElement | null>(null);
  // Declared variables
  const lineDist = props.lineDist;
  const timeUnit = props.timeUnitPerLineDistInSeconds;
  const labelMultiplier = Math.ceil(50 / lineDist);

  const thickLineData = {
    lw: 2,
    content: Array.from({ length: props.totalLines }, (_, index: number) => {
      return ["M", index * lineDist, 15, "L", index * lineDist, 30].join(' ');
    }).join(" "),
  };

  const thinLineData = {
    lw: 1,
    content: Array.from({ length: props.totalLines }, (_, index: number) => {
      return ["M", index * lineDist + lineDist / 2, 23, "L", index * lineDist + lineDist / 2, 30].join(' ');
    }).join(" "),
  };

  /**
   * @description Seek to certain point.
   * @param event 
   */
  function seekToPoint(event: React.MouseEvent<HTMLDivElement, MouseEvent>) {
    const { offsetX } = event.nativeEvent;
    const currentTimeInSeconds = (offsetX / lineDist) * timeUnit;

    // First time, force use manager to initialize all the audiocontext
    // variables; since they cannot be used without user interaction.
    audioManager.useManager().setTimestamp(currentTimeInSeconds);
    audioManager.rescheduleAllTracks(tracks);
    setLeftSeek(offsetX);
  }

  /**
   * @description Handle on loop end, emitted by the seeker component.
   */
  function handleLoopEnd() {
    audioManager.useManager().rescheduleAllTracks(tracks);
  }

  /**
   * @description Handle Mouse Down Event
   * @param event
   */
  function handleMouseDown(event: React.MouseEvent<HTMLDivElement, MouseEvent>) {
    if (
      // Region select between ranges iff current cursor is Region Select.
      (props.mode === ModeType.RegionSelect && event.buttons === 1) ||
      // Trying to pull off context switch, but instead offer a selection iff
      // current cursor is default.
      (props.mode === ModeType.DefaultSelector && event.buttons === 2)
    ) {
      const { offsetX } = event.nativeEvent;
      setStartRegionSelection(offsetX);
      setEndRegionSelection(offsetX);
      setIsUserSelectingRegion(true);
    }
  }

  /**
   * @description Handle Mouse event after moving some offset.
   * @param event event details
   * @returns void
   */
  function handleMouseMove(event: React.MouseEvent<HTMLDivElement, MouseEvent>) {
    if (isUserSelectingRegion && event.buttons > 0) {
      const { offsetX } = event.nativeEvent;
      setEndRegionSelection(offsetX);

      const startPoint = Math.min(startRegionSelection, offsetX);
      const endPoint = Math.max(startRegionSelection, offsetX);

      const startTimeSecs = (startPoint / lineDist) * timeUnit;
      const endTimeSecs = (endPoint / lineDist) * timeUnit;
      
      props.onTimeSelection({
        startTimeMillis: startTimeSecs * 1000,
        endTimeMillis: endTimeSecs * 1000
      });
    }
  }

  /**
   * @description Handle mouse release event.
   * @param event Event details.
   * @returns void
   */
  function handleMouseRelease(event: React.MouseEvent<HTMLDivElement, MouseEvent>) {
    if (isUserSelectingRegion) {
      const { offsetX } = event.nativeEvent;

      const startPoint = Math.min(startRegionSelection, offsetX);
      const endPoint = Math.max(startRegionSelection, offsetX);

      if (Math.abs(endPoint - startPoint) > 10) {
        setEndRegionSelection(offsetX);
        const startTimeSecs = (startPoint / lineDist) * timeUnit;
        const endTimeSecs = (endPoint / lineDist) * timeUnit;

        props.onTimeSelection({
          startTimeMillis: startTimeSecs * 1000,
          endTimeMillis: endTimeSecs * 1000
        });
      } else {
        setStartRegionSelection(0);
        setEndRegionSelection(0);
        setIsUserSelectingRegion(false);
      }
    }
    setIsUserSelectingRegion(false);
  }

  const timeData = Array.from(
    { length: Math.floor(props.totalLines / labelMultiplier) },
    (_, index: number) => {
      const currMinute = Math.floor((timeUnit * labelMultiplier * (index + 1)) / 60);
      const currSecond = (timeUnit * labelMultiplier * (index + 1)) % 60;

      return (
        <text
          key={index}
          className="select-none"
          fill="#ccc"
          strokeWidth={1}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={13}
          dy={25}
          dx={lineDist * labelMultiplier * (index + 1)}
        >
          {(currMinute < 10 ? "0" : "") + currMinute}:
          {(currSecond < 10 ? "0" : "") + currSecond}
        </text>
      );
    },
  );

  const svgLines = [thickLineData, thinLineData];
  const startRegion = Math.min(startRegionSelection, endRegionSelection);
  const endRegion = Math.max(startRegionSelection, endRegionSelection);

  return (
    <div
      className="seekbar bg-slate-800 overflow-visible rounded-sm z-[12] border border-solid border-slate-900 cursor-pointer shadow-bg"
      onClick={seekToPoint}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseRelease}
      onMouseUp={handleMouseRelease}
      ref={divRef}
    >
      <Seeker
        onLoopEnd={handleLoopEnd}
        h={props.h}
        lineDist={props.lineDist}
        seekOffset={leftSeek}
        setLeft={setLeftSeek}
      />
      <svg xmlns={svgxmlns} width={props.w} height={30}>
        <rect
          fill="#C5887666"
          x={startRegion}
          y={0}
          width={endRegion - startRegion}
          height={30}
        ></rect>
        {timeData}
      </svg>
      <svg xmlns={svgxmlns} width={props.w} height={30}>
        <rect
          fill="#C5887666"
          x={startRegion}
          y={0}
          width={endRegion - startRegion}
          height={30}
        ></rect>
        {svgLines.map((svgLine, index: number) => (
          <path
            d={svgLine.content}
            key={index}
            stroke="#777"
            strokeWidth={svgLine.lw}
          ></path>
        ))}
      </svg>
    </div>
  );
}
