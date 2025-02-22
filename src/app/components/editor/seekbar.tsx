"use client";

import { utils } from "@/app/utils";
import React from "react";
import { Seeker } from "./seeker";
import { audioManager } from "@/app/services/audiotrackmanager";
import { useSelector } from "react-redux";
import { RootState } from "@/app/state/store";

interface SeekbarProps {
  w: number,
  h: number,
  totalLines: number,
  lineDist: number,
  timeUnitPerLineDistInSeconds: number
}

export function Seekbar(props: React.PropsWithoutRef<SeekbarProps>) {
  const tracks = useSelector(
    (state: RootState) => state.trackDetailsReducer.trackDetails,
  );
  const lineDist = props.lineDist;
  const [leftSeek, setLeftSeek] = React.useState(0);

  const divRef = React.createRef<HTMLDivElement>();

  const timeUnit = props.timeUnitPerLineDistInSeconds;

  const thickLineData = {
    lw: 2,
    content: Array.from({ length: props.totalLines }, (_, index: number) => {
      return ["M", index * lineDist, 15, "L", index * lineDist, 30];
    })
      .flat()
      .join(" "),
  };

  const thinLineData = {
    lw: 1,
    content: Array.from({ length: props.totalLines }, (_, index: number) => {
      return ["M", index * lineDist + lineDist / 2, 23, "L", index * lineDist + lineDist / 2, 30];
    })
      .flat()
      .join(" "),
  };

  function seekToPoint(event: React.MouseEvent<HTMLDivElement, MouseEvent>) {
    const { offsetX } = event.nativeEvent;
    const currentTimeInSeconds = (offsetX / lineDist) * timeUnit;
    audioManager.useManager().setTimestamp(currentTimeInSeconds);

    audioManager.useManager().rescheduleAllTracks(tracks);
    setLeftSeek(offsetX);
  }

  function handleLoopEnd() {
    audioManager.useManager().rescheduleAllTracks(tracks);
  }

  const labelMultiplier = Math.ceil(50 / lineDist);

  const timeData = Array.from(
    { length: Math.floor(props.totalLines / labelMultiplier) },
    (_, index: number) => {
      const currMinute = Math.floor(
        (timeUnit * labelMultiplier * (index + 1)) / 60,
      );
      const currSecond = Math.floor(
        (timeUnit * labelMultiplier * (index + 1)) % 60,
      );

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

  return (
    <div
      className="seekbar bg-slate-800 overflow-visible rounded-sm z-[12] border border-solid border-slate-900 cursor-pointer shadow-bg"
      onClick={seekToPoint}
      ref={divRef}
    >
      <Seeker
        onLoopEnd={handleLoopEnd}
        h={props.h}
        lineDist={props.lineDist}
        seekOffset={leftSeek}
        setLeft={setLeftSeek}
      />
      <svg xmlns={utils.constants.svgxmlns} width={props.w} height={30}>
        {timeData}
      </svg>
      <svg xmlns={utils.constants.svgxmlns} width={props.w} height={30}>
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
