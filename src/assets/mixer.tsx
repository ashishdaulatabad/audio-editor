import {SVGXMLNS} from '@/app/utils';
import React from 'react';

export function Mixer(props: React.PropsWithoutRef<{
  w: number
  h: number
  stroke: string
}>) {
  return (
    <svg xmlns={SVGXMLNS} width={props.w} height={props.h} viewBox="0 0 50 50">
      <path d="M18 40 L18 10 M32 40 L32 10" stroke={props.stroke}></path>
      <rect x="11" y="14" width="14" height="6" rx="1" ry="1" fill="#ccc" stroke={props.stroke}></rect>
      <path d="M11 17 L25 17" stroke={props.stroke}></path>
      <rect x="25" y="28" width="14" height="6" rx="1" ry="1" fill="#ccc" stroke={props.stroke}></rect>
      <path d="M25 31 L39 31" stroke={props.stroke}></path>
    </svg>
  )
}