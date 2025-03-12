import React from 'react';
import { clamp, svgxmlns } from '../utils';

/**
 * @description Slider Settings.
 */
interface SliderSettings {
  value?: number
  h: number
  pd: number
  headw: number
  headh: number
  lineThickness?: number
  activeStroke?: string
  r?: number
  onSliderChange: (value: number) => void
  functionMapper?: (value: number) => number
  scrollDelta: number
}

export function Slider(props: React.PropsWithoutRef<SliderSettings>) {
  const [value, setValue] = React.useState(props.value ?? 0);
  const [hold, setHold] = React.useState(false);
  const ref = React.useRef<HTMLDivElement | null>(null);

  function releaseKnob() {
    setHold(false);
  }

  function holdKnob(event: React.MouseEvent<HTMLElement, MouseEvent>) {
    setHold(event.buttons === 1);
  }

  function onScroll(event: WheelEvent) {
    event.preventDefault();
    const { deltaY } = event;
    const newValue = clamp(value + (deltaY !== 0 ? (-deltaY / Math.abs(deltaY)) : 0) * props.scrollDelta, 0, 1);

    setValue(newValue);

    const mapper = props.functionMapper ? props.functionMapper(newValue) : newValue;
    props.onSliderChange(mapper);
  }

  function moveKnob(event: React.MouseEvent<HTMLElement, MouseEvent>) {
    if (hold && event.buttons === 1) {
      const y = event.nativeEvent.offsetY;
      const normalizedValue = clamp((props.h + (props.headh / 2) - y) / props.h, 0, 1);
      setValue(normalizedValue);
      props.onSliderChange(normalizedValue)
    }
  }
  const width = props.headw;
  const sliderHeight = props.headh;
  const level = props.h - value * props.h;
  
  React.useEffect(() => {
    ref.current?.addEventListener('wheel', onScroll, { passive: false });
    return () => ref.current?.removeEventListener('wheel', onScroll)
  }, [props.value]);

  // To do: work on markers.
  return (
    <div 
      ref={ref}
      className="slider flex flex-row justify-center"
      onMouseUp={releaseKnob}
      onMouseDown={holdKnob}
      onMouseLeave={releaseKnob}
      onMouseMove={moveKnob}
    >
      <svg xmlns={svgxmlns} width={width} height={props.h + props.pd}>
        <path
          stroke="#888"
          strokeWidth={props.lineThickness ?? 3}
          d={`M ${width / 2}
          ${props.h + (props.pd / 2)} L ${width / 2} 0`}
        ></path>
        <path
          stroke={props.activeStroke ?? "#2135EF"}
          strokeWidth={props.lineThickness ?? 3}
          d={`M ${width / 2} ${props.h + (props.pd / 2)} L ${width / 2} ${level}`}
        ></path>
        <g>
          <rect width={width} rx={3} ry={3} height={sliderHeight} fill="#666" x={0} y={level}></rect>
          <rect width={width - 4} rx={3} ry={3} height={sliderHeight - 4} fill="#ccc" x={2} y={level + 2}></rect>
          <rect width={width - 8} rx={3} ry={3} height={sliderHeight - 8} fill="#eee" x={4} y={level + 4}></rect>
        </g>
      </svg>
    </div>
  )
}