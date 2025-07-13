import React from 'react';
import { RootState } from '@/app/state/store';
import { svgxmlns } from '@/app/utils'
import { useSelector } from 'react-redux';
import { TrackAudio } from './trackaudio';
import { TimeSectionSelection } from './seekbar';
import { SEC_TO_MICROSEC } from '@/app/state//trackdetails/trackdetails';

interface TrackProps {
  id: number
  w: number
  h: number
  lineDist: number
  timeUnitPerLineDistanceSecs: number
  selectedContent: TimeSectionSelection | null
}

export function Tracks(props: React.PropsWithoutRef<TrackProps>) {
  const trackData = useSelector((state: RootState) => (
    state.trackDetailsReducer.trackDetails[props.id]
  ));
  const mode = useSelector((state: RootState) => (
    state.trackDetailsReducer.timeframeMode
  ));

  const lineDist = props.lineDist;
  const timeUnit = props.timeUnitPerLineDistanceSecs;
  const timeUnitLine = SEC_TO_MICROSEC * timeUnit
  const selectedStart = (((props.selectedContent?.startTimeMicros || 0) / timeUnitLine) * lineDist);
  const selectedEnd = (((props.selectedContent?.endTimeMicros || 0) / timeUnitLine) * lineDist);

  return (
    <div 
      className="track relative box-border border-solid border-slate-700"
      data-id={props.id}
    >
      {
        trackData.map((track, index: number) => (
          <TrackAudio
            index={index}
            lineDist={lineDist}
            trackId={props.id}
            timeUnitPerLineDistanceSecs={timeUnit}
            audioDetails={track}
            key={track.trackDetail.id}
            height={props.h}
          />
        ))
      }
      <svg xmlns={svgxmlns} width={props.w} height={props.h}>
        <svg width={props.w} className="track-patterns relative" style={{zIndex: 10000}} height={props.h} xmlns={svgxmlns}>
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
              <path d={`M${lineDist / 4} 0 L${lineDist / 4} ${props.h}`} stroke="#333" strokeWidth="1" />
              <path d={`M${lineDist / 2} 0 L${lineDist / 2} ${props.h}`} stroke="#333" strokeWidth="1" />
              <path d={`M${3 * lineDist / 4} 0 L${3 * lineDist / 4} ${props.h}`} stroke="#333" strokeWidth="1" />
              <path d={`M0 0 L0 ${props.h}`} stroke="#333" strokeWidth="4" />
              <path d={`M0 0 L${lineDist} 0`} stroke="#333" strokeWidth="1" />
              <path d={`M0 ${props.h} L${lineDist} ${props.h}`} stroke="#344556" strokeWidth="1" />
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
