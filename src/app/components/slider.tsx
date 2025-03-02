import React from "react";
import { svgxmlns } from "../utils";

interface SliderSettings {
  h: number,
  pd: number,
  headw: number,
  headh: number,
  onSliderChange: (value: number) => void
}

export function Slider(props: React.PropsWithoutRef<SliderSettings>) {
  const [value, setValue] = React.useState(0);
  const [hold, setHold] = React.useState(false);

  function releaseKnob() {
    setHold(false);
  }

  function holdKnob(event: React.MouseEvent<HTMLElement, MouseEvent>) {
    setHold(event.buttons === 1);
  }

  function moveKnob(event: React.MouseEvent<HTMLElement, MouseEvent>) {
    if (hold && event.buttons === 1) {
      const y = event.nativeEvent.offsetY;
      const normalizedValue = (props.h - y) / props.h;
      setValue(normalizedValue)
      props.onSliderChange(normalizedValue)
    }
  }
  const width = props.headw;
  const sliderHeight = props.headh;
  const level = props.h - value * props.h;

  return (
    <div 
      className="slider"
      onMouseUp={releaseKnob}
      onMouseDown={holdKnob}
      onMouseLeave={releaseKnob}
      onMouseMove={moveKnob}
    >
      <svg xmlns={svgxmlns} width={width} height={props.h + props.pd}>
        <path stroke="#888" strokeWidth={3} d={`M ${width / 2} ${props.h} L ${width / 2} 0`}></path>
        <path stroke="#2135EF" strokeWidth={3} d={`M ${width / 2} ${props.h} L ${width / 2} ${level}`}></path>
        <g>
          <rect width={width} height={sliderHeight} fill="#666" x={0} y={level}></rect>
          <rect width={width - 4} height={sliderHeight - 4} fill="#ccc" x={2} y={level + 2}></rect>
          <rect width={width - 8} height={sliderHeight - 8} fill="#eee" x={4} y={level + 4}></rect>
        </g>
      </svg>
    </div>
  )
}