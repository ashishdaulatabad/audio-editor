import React from "react";
import { svgxmlns } from "@/app/utils";
import { WaveformSeeker } from "./waveformseeker";

interface WaveformSeekbarProps {
  trackNumber: number
  audioId: number
  startOffsetInMillis: number
  endOffsetInMillis: number
  w: number
  h: number
  totalLines: number
  lineDist: number
  isPartial: boolean
  timeUnitPerLineDistInSeconds: number
}

export function WaveformSeekbar(props: React.PropsWithoutRef<WaveformSeekbarProps>) {
  const { trackNumber, audioId } = props;
  const lineDist = props.lineDist;
  const [leftSeek, setLeftSeek] = React.useState(0);

  const divRef = React.createRef<HTMLDivElement>();

  const timeUnit = props.timeUnitPerLineDistInSeconds;

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

  function seekToPoint(event: React.MouseEvent<HTMLDivElement, MouseEvent>) {
    const { offsetX } = event.nativeEvent;
    setLeftSeek(offsetX);
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
  const isPartial = props.isPartial;
  const startOffsetSecs = props.startOffsetInMillis / 1000;
  const endOffsetSecs = props.endOffsetInMillis / 1000;
  const startLimit = ((props.lineDist / props.timeUnitPerLineDistInSeconds) * startOffsetSecs);
  const endLimit = ((props.lineDist / props.timeUnitPerLineDistInSeconds) * endOffsetSecs);

  return (
    <div
      className="seekbar bg-slate-800 overflow-visible rounded-sm z-[12] border border-solid border-slate-900 cursor-pointer shadow-bg"
      onClick={seekToPoint}
      ref={divRef}
    >
      <WaveformSeeker
        h={props.h}
        lineDist={props.lineDist}
        seekOffset={leftSeek}
        trackNumber={trackNumber}
        audioId={audioId}
      />
      <svg xmlns={svgxmlns} width={props.w} height={30}>
        {timeData}
        {isPartial && <rect fill="#C5645466" x={startLimit} y={0} width={endLimit - startLimit} height={30}></rect>}
      </svg>
      <svg xmlns={svgxmlns} width={props.w} height={30}>
        {svgLines.map((svgLine, index: number) => (
          <path
            d={svgLine.content}
            key={index}
            stroke="#777"
            strokeWidth={svgLine.lw}
          ></path>
        ))}
        {isPartial && <rect fill="#C5645466" x={startLimit} y={0} width={endLimit - startLimit} height={30}></rect>}
      </svg>
    </div>
  );
}
