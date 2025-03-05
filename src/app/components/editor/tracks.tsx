import React from 'react';
import { RootState } from '@/app/state/store';
import { svgxmlns } from '@/app/utils'
import { useSelector } from 'react-redux';
import { TrackAudio } from './trackaudio';
import { TimeSectionSelection } from './seekbar';

/**
 * @description Track bar hint information
 */
export interface TrackDrawContent {
  content: string
  lw: number
}

interface TrackProps {
  id: number
  w: number
  h: number
  lineDist: number
  timeUnitPerLineDistance: number
  svgLines: Array<TrackDrawContent>
  selectedContent: TimeSectionSelection | null
}

export function Tracks(props: React.PropsWithoutRef<TrackProps>) {
  const trackData = useSelector((state: RootState) => state.trackDetailsReducer.trackDetails[props.id]);
  const lineDist = props.lineDist;
  const timeUnit = props.timeUnitPerLineDistance;
  const selectedStart = props.selectedContent ? ((props.selectedContent.startTimeMillis / 1000 / timeUnit)) * lineDist : 0;
  const selectedEnd = props.selectedContent ? ((props.selectedContent.endTimeMillis / 1000 / timeUnit) * lineDist) : 0;

  return (
    <div 
      className="track relative border border-solid border-slate-700"
      data-id={props.id}
    >
      {
        trackData.map((track, index: number) => (
          <TrackAudio
            index={index}
            lineDist={props.lineDist}
            trackId={props.id}
            audioDetails={track}
            key={index}
            height={props.h}
          />
        ))
      }
      <svg xmlns={svgxmlns} width={props.w} height={props.h}>
        {props.selectedContent && 
          <rect
            fill="#C5664566"
            x={selectedStart}
            y={0}
            width={selectedEnd - selectedStart}
            height={props.h}
          ></rect>
        }
        {
          props.svgLines.map((svgLine, index: number) => (
            <path
              key={index}
              stroke="#333"
              strokeWidth={svgLine.lw}
              d={svgLine.content}
            ></path>
          ))
        }
      </svg>
    </div>
  )
}
