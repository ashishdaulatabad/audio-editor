import React from 'react';
import {SVGXMLNS} from '@/app/utils';
import {WaveformSeeker} from './waveformseeker';

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

export function setTimeInterval(
  timeUnit: number,
  totalLines: number, 
  lineDist: number
) {
  while (totalLines < 4) {
    timeUnit /= 5;
    lineDist /= 5;
    totalLines *= 5;
  }

  return [timeUnit, totalLines, lineDist];
}

export function WaveformSeekbar(
  props: React.PropsWithoutRef<WaveformSeekbarProps>
) {
  const { trackNumber, audioId } = props;
  const [leftSeek, setLeftSeek] = React.useState(0);

  const divRef = React.useRef<HTMLDivElement>(null);

  let {lineDist, timeUnitPerLineDistInSeconds: timeUnit, totalLines} = props;

  [timeUnit, totalLines, lineDist] = setTimeInterval(
    timeUnit,
    totalLines,
    lineDist
  );

  const showMillis = timeUnit - Math.floor(timeUnit) !== 0;

  const thickLineData = {
    lw: 2,
    content: Array.from(
      {length: Math.ceil(totalLines)},
      (_, index: number) => (
        `M${index * lineDist} 15 L${index * lineDist} 30`
      )).join(''),
  };

  const ld_2 = lineDist / 2;

  const thinLineData = {
    lw: 1,
    content: Array.from(
      {length: Math.ceil(totalLines)}, 
      (_, index: number) => (
        `M${index * lineDist + ld_2} 23L${index * lineDist + ld_2} 30`
      )).join(''),
  };

  function seekToPoint(event: React.MouseEvent<HTMLDivElement>) {
    setLeftSeek(event.nativeEvent.offsetX);
  }

  const labelMultiplier = Math.ceil((showMillis ? 80 : 50) / lineDist);

  const svgTimeData = Array.from(
    { length: Math.floor(totalLines / labelMultiplier) },
    (_, index: number) => {
      const currMinute = Math.floor(
        (timeUnit * labelMultiplier * (index + 1)) / 60,
      );
      const currSecond = Math.floor(
        (timeUnit * labelMultiplier * (index + 1)) % 60,
      );

      const currMillis = Math.floor(
        (timeUnit * labelMultiplier * (index + 1) * 1000) % 1000 / 10,
      );

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
          {showMillis && (':'+currMillis.toString().padStart(2, '0'))}
        </text>
      );
    },
  );

  const svgLinePathDetails = [thickLineData, thinLineData];
  const isPartial = props.isPartial;
  const startOffsetSecs = props.startOffsetInMillis / 1000;
  const endOffsetSecs = props.endOffsetInMillis / 1000;
  const startLimit = ((lineDist / timeUnit) * startOffsetSecs);
  const endLimit = ((lineDist / timeUnit) * endOffsetSecs);

  return (
    <div
      className="seekbar bg-darker overflow-visible rounded-sm z-[12] border border-solid border-darker-2 cursor-pointer shadow-bg"
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
      <svg xmlns={SVGXMLNS} width={props.w} height={30}>
        {svgTimeData}
        {isPartial && <rect fill="#C5645466" x={startLimit} y={0} width={endLimit - startLimit} height={30}></rect>}
      </svg>
      <svg xmlns={SVGXMLNS} width={props.w} height={30}>
        {svgLinePathDetails.map((svgLine, index: number) => (
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
