import React from 'react';
import {RootState} from '@/app/state/store';
import {svgxmlns} from '@/app/utils'
import {useSelector} from 'react-redux';
import {TrackAudio} from './trackaudio';
import {TimeSectionSelection} from './seekbar';
import {SEC_TO_MICROSEC} from '@/app/state//trackdetails/trackdetails';
import {TrackAutomation} from './trackautomation';

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
  const trackAutomation = useSelector((state: RootState) => (
    state.trackDetailsReducer.trackAutomation[props.id]
  ));
  const mode = useSelector((state: RootState) => (
    state.trackDetailsReducer.timeframeMode
  ));

  const lineDist = props.lineDist;
  const timeUnit = props.timeUnitPerLineDistanceSecs;
  const timeUnitLine = SEC_TO_MICROSEC * timeUnit

  const startTime = (props.selectedContent?.startTimeMicros || 0);
  const endTime = (props.selectedContent?.endTimeMicros || 0);
  const selectedStart = ((startTime / timeUnitLine) * lineDist);
  const selectedEnd = ((endTime / timeUnitLine) * lineDist);

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
      {
        trackAutomation.map((automation, index: number) => (
          <TrackAutomation
            index={index}
            lineDist={lineDist}
            trackId={props.id}
            timeUnitPerLineDistanceSecs={timeUnit}
            key={automation.colorAnnotation}
            automation={automation}
            height={props.h}
          />
        ))
      }
      <c-marker
        width={props.w}
        height={props.h} 
        lineDistance={lineDist}
        style={{width: props.w, height: props.h}}
        className="track-patterns relative block"
        selectedStart={selectedStart}
        selectedEnd={selectedEnd}
      ></c-marker>
    </div>
  )
}
