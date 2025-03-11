import React from 'react';
import { RootState } from '@/app/state/store';
import { svgxmlns } from '@/app/utils'
import { useSelector } from 'react-redux';
import { TrackAudio } from './trackaudio';
import { TimeSectionSelection } from './seekbar';
import { SEC_TO_MICROSEC } from '@/app/state/trackdetails';

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
  timeUnitPerLineDistanceSecs: number
  selectedContent: TimeSectionSelection | null
}

export function Tracks(props: React.PropsWithoutRef<TrackProps>) {
  const trackData = useSelector((state: RootState) => state.trackDetailsReducer.trackDetails[props.id]);
  const lineDist = props.lineDist;
  const timeUnit = props.timeUnitPerLineDistanceSecs;
  const timeUnitLine = SEC_TO_MICROSEC * timeUnit
  const selectedStart = props.selectedContent ? ((props.selectedContent.startTimeMicros / timeUnitLine)) * lineDist : 0;
  const selectedEnd = props.selectedContent ? ((props.selectedContent.endTimeMicros / timeUnitLine) * lineDist) : 0;

  return (
    <div 
      className="track relative border-t border-b box-border border-solid border-slate-700"
      data-id={props.id}
    >
      {
        trackData.map((track, index: number) => (
          <TrackAudio
            index={index}
            lineDist={props.lineDist}
            trackId={props.id}
            timeUnitPerLineDistanceSecs={timeUnit}
            audioDetails={track}
            key={index}
            height={props.h}
          />
        ))
      }
      <svg xmlns={svgxmlns} width={props.w} height={props.h}>
        <svg width={props.w} className="relative" style={{zIndex: 10000}} height={props.h} xmlns={svgxmlns}>
          <defs>
            <pattern
              id="repeatingLines"
              x="0"
              y="0"
              width={props.lineDist}
              height={props.h}
              patternUnits="userSpaceOnUse"
              patternContentUnits="userSpaceOnUse"
            >
              <path d={`M0 0 L0 ${props.h}`} stroke="#333" strokeWidth="2" />
              <path d={`M${props.lineDist / 4} 0 L${props.lineDist / 4} ${props.h}`} stroke="#333" strokeWidth="1" />
              <path d={`M${props.lineDist / 2} 0 L${props.lineDist / 2} ${props.h}`} stroke="#333" strokeWidth="1" />
              <path d={`M${3 * props.lineDist / 4} 0 L${3 * props.lineDist / 4} ${props.h}`} stroke="#333" strokeWidth="1" />
              <path d={`M0 0 L0 ${props.h}`} stroke="#333" strokeWidth="4" />
            </pattern>
          </defs>
          <rect x="0" y="0" width={props.w} height={props.h} fill="url(#repeatingLines)" />
        </svg>
        {props.selectedContent && 
          <rect
            fill="#C5664566"
            x={selectedStart}
            y={0}
            width={selectedEnd - selectedStart}
            height={props.h}
          ></rect>
        }
      </svg>
    </div>
  )
}
