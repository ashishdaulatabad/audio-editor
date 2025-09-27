import React from 'react';
import {SVGXMLNS} from '@/app/utils';
import {Seeker} from './seeker';
import {audioManager} from '@/app/services/audio/audiotrackmanager';
import {useSelector} from 'react-redux';
import {RootState} from '@/app/state/store';
import {ModeType} from './toolkit';
import {SEC_TO_MICROSEC} from '@/app/state/trackdetails/trackdetails';

/**
 * @description Timeframe selected by the user.
 */
export interface TimeSectionSelection {
  startTimeMicros: number
  endTimeMicros: number
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
   * @description Scroll Ref
   */
  scrollRef: React.RefObject<HTMLDivElement | null>
  /**
   * @description Scroll Ref
   */
  seekerRef: React.RefObject<HTMLDivElement | null>
  /**
   * @description Emits an event when a region is selected.
   */
  onTimeSelection: (timeSection: TimeSectionSelection | null) => void
}

// Distance threshold between two label, if lower, 
// then label is multiplied by certain factor.
const TIME_LABEL_DISTANCE_THRESHOLD = 50;

export function Seekbar(props: React.PropsWithoutRef<SeekbarProps>) {
  // Redux States
  const tracks = useSelector((state: RootState) => (
    state.trackDetailsReducer.trackDetails
  ));
  // Component states
  const [isUserSelecting, setIsUserSelecting] = React.useState(false);
  const [startRegionSelection, setStartRegionSelection] = React.useState(0);
  const [endRegionSelection, setEndRegionSelection] = React.useState(0);
  const [left, setLeft] = React.useState(0);

  const {
    lineDist,
    timeUnitPerLineDistInSeconds: timeUnit,
    seekerRef
  } = props;

  const labelMultiplier = Math.ceil(TIME_LABEL_DISTANCE_THRESHOLD / lineDist);

  function seekToPoint(event: React.MouseEvent<HTMLDivElement>) {
    if (!isUserSelecting && props.mode === ModeType.DefaultSelector) {
      const {offsetX} = event.nativeEvent;
      const currentTimeInSeconds = (offsetX / lineDist) * timeUnit;

      audioManager.useManager().setTimestamp(currentTimeInSeconds);
      audioManager.rescheduleAllTracks(tracks);
      setLeft(offsetX);
    }
  }

  function onLoopEnd() {
    audioManager.useManager().rescheduleAllTracks(tracks);
  }

  function handleMouseDown(event: React.MouseEvent<HTMLDivElement>) {
    if (
      // Region select between ranges iff current cursor is Region Select.
      (props.mode === ModeType.RegionSelect && event.buttons === 1) ||
      // Trying to pull off context switch, but instead offer a selection iff
      // current cursor is default.
      (props.mode === ModeType.DefaultSelector && event.buttons === 2)
    ) {
      const {offsetX} = event.nativeEvent;
      const currentTimeSecs = (offsetX / lineDist) * timeUnit;

      setStartRegionSelection(currentTimeSecs);
      setEndRegionSelection(currentTimeSecs);
      setIsUserSelecting(true);

      props.onTimeSelection({
        startTimeMicros: currentTimeSecs * SEC_TO_MICROSEC,
        endTimeMicros: currentTimeSecs * SEC_TO_MICROSEC
      });
    }
  }

  function handleMouseMove(event: React.MouseEvent<HTMLDivElement>) {
    if (isUserSelecting && event.buttons > 0) {
      const { offsetX } = event.nativeEvent;
      const endTimeSecs = (offsetX / lineDist) * timeUnit;
      setEndRegionSelection(endTimeSecs);

      const startPoint = Math.min(startRegionSelection, endTimeSecs);
      const endPoint = Math.max(startRegionSelection, endTimeSecs);
      
      props.onTimeSelection({
        startTimeMicros: startPoint * SEC_TO_MICROSEC,
        endTimeMicros: endPoint * SEC_TO_MICROSEC
      });
    }
  }

  function handleMouseRelease(event: React.MouseEvent<HTMLDivElement>) {
    if (isUserSelecting) {
      const { offsetX } = event.nativeEvent;
      const endTimeSecs = (offsetX / lineDist) * timeUnit;

      if (Math.abs(endTimeSecs - startRegionSelection) > 0.1) {
        setEndRegionSelection(endTimeSecs);
        const startPoint = Math.min(startRegionSelection, endTimeSecs);
        const endPoint = Math.max(startRegionSelection, endTimeSecs);

        props.onTimeSelection({
          startTimeMicros: startPoint * SEC_TO_MICROSEC,
          endTimeMicros: endPoint * SEC_TO_MICROSEC
        });
      } else {
        setStartRegionSelection(0);
        setEndRegionSelection(0);
        setIsUserSelecting(false);

        props.onTimeSelection(null);
      }
    }
    setIsUserSelecting(false);
  }

  // This might take some time.
  // Will look for alternatives later.
  const timeData = Array.from(
    {length: Math.floor(props.totalLines / labelMultiplier)},
    (_, index: number) => {
      const time = (timeUnit * labelMultiplier * (index + 1));
      const currMinute = Math.floor(time / 60);
      const currSecond = Math.floor(time) % 60;

      return (
        <text
          key={index}
          className="select-none"
          fill="#ccc"
          strokeWidth={1}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={16}
          dy={25}
          dx={lineDist * labelMultiplier * (index + 1)}
        >
          {(currMinute < 10 ? "0" : "") + currMinute}:
          {(currSecond < 10 ? "0" : "") + currSecond}
        </text>
      );
    },
  );

  const startSecs = Math.min(startRegionSelection, endRegionSelection);
  const endSecs = Math.max(startRegionSelection, endRegionSelection);
  const startRegion = (startSecs / timeUnit) * lineDist;
  const endRegion = (endSecs / timeUnit) * lineDist;

  return (
    <>
      <Seeker
        ref={seekerRef}
        timePerUnitLine={timeUnit}
        lineDist={lineDist}
        seekOffset={0}
        left={left}
        onLoopEnd={onLoopEnd}
      />
      <div
        className="relative overflow-hidden bg-darker rounded-sm z-[12] border-t border-b border-solid border-darker-2 cursor-pointer shadow-bg"
        onClick={seekToPoint}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseRelease}
        onMouseUp={handleMouseRelease}
        ref={props.scrollRef}
      >
        <svg xmlns={SVGXMLNS} width={props.w} height={30}>
          <rect
            fill="#C5887666"
            x={startRegion}
            y={0}
            width={endRegion - startRegion}
            height={30}
          ></rect>
          {timeData}
        </svg>
        <svg xmlns={SVGXMLNS} width={props.w} height={30}>
          <defs>
            <pattern
              id="repeatedSeekbarLines"
              x="0"
              y="0"
              width={lineDist}
              height={props.h}
              patternUnits="userSpaceOnUse"
              patternContentUnits="userSpaceOnUse"
            >
              <path d={`M${lineDist / 2} 23 L${lineDist / 2} 30`} stroke="#777" strokeWidth="2" />
              <path d={`M0 15 L0 30`} stroke="#777" strokeWidth="4" />
            </pattern>
          </defs>
          <rect x="0" y="0" width={props.w} height={30} fill="url(#repeatedSeekbarLines)" />

          <rect
            fill="#C5887666"
            x={startRegion}
            y={0}
            width={endRegion - startRegion}
            height={30}
          ></rect>
        </svg>
      </div>
    </>
  );
}
