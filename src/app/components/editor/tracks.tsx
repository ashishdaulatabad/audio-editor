import React, { useEffect } from "react";
import { RootState } from "@/app/state/store";
import { svgxmlns } from "@/app/utils"
import { useSelector } from "react-redux";
import { TrackAudio } from "./trackaudio";

export interface TrackDrawContent {
  content: string
  lw: number
}

interface TrackProps {
  id: number,
  w: number,
  h: number,
  lineDist: number,
  svgLines: Array<TrackDrawContent>
}

export function Tracks(props: React.PropsWithoutRef<TrackProps>) {
  const trackData = useSelector((state: RootState) => state.trackDetailsReducer.trackDetails[props.id]);
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
