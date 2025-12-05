import {SVGXMLNS} from '@/app/utils';
import React from 'react';

interface IconProps {
  color: string,
  w: number,
  h: number,
  vb: string
}

export function Waveform(props: React.PropsWithoutRef<IconProps>) {
  return (
    <svg xmlns={SVGXMLNS} style={{display: 'inline'}} width={props.w} height={props.h} viewBox={props.vb}>
      <g fill="none" fillRule="evenodd" stroke={props.color} strokeLinecap="round" strokeLinejoin="round">
      <path d="m6.5 8.5v4"/>
      <path d="m8.5 6.5v9"/>
      <path d="m10.5 9.5v2"/>
      <path d="m12.5 7.5v6.814"/>
      <path d="m14.5 4.5v12"/>
      </g>
    </svg>
  );
}
