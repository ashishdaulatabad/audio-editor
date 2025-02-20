'use client'
import React from 'react';
import { utils } from '../utils';

interface KnobSettings {
  r: number,
  pd: number,
  value?: number,
  scrollDelta?: number,
  onKnobChange: (value: number) => void
}

function calcEyeX(centerX: number, r: number, value: number) {
  return centerX + (r - 7) * Math.cos((3 - value * 6) * Math.PI / 4);
}

function calcEyeY(centerY: number, r: number, value: number) {
  return centerY + (r - 7) * Math.sin((3 - value * 6) * Math.PI / 4);
}

function normalizeAngle(x: number, y: number, centerX: number, centerY: number): number {
  const dx = x - centerX, dy = y - centerY;
  let angle = Math.atan(dx / dy);

  if (dx > 0 && dy >= 0) {
    angle -= Math.PI;
  } else if (dx < 0 && dy >= 0) {
    angle += Math.PI;
  }

  return utils.fn.clamp(angle, -startAngle, startAngle);
}

const baseCurveLength = 3 * Math.PI / 2;
const startAngle = 3 * Math.PI / 4;

export function Knob(props: React.PropsWithoutRef<KnobSettings>) {
  const [value, setValue] = React.useState(props.value ?? 0);
  const [hold, setHold] = React.useState(false);
  const ref = React.createRef<HTMLDivElement>();
  const scrollDelta: number = props.scrollDelta || 0.05;

  const centerX = (props.r) + props.pd;
  const centerY = (props.r) + props.pd;

  const [eyeX, setEyeX] = React.useState(calcEyeX(centerX, props.r, -value));
  const [eyeY, setEyeY] = React.useState(calcEyeY(centerY, props.r, -value));

  const [holdAngle, setHoldAngle] = React.useState<number>(0);
  const [eyeAngle, setEyeAngle] = React.useState<number>(startAngle);

  function releaseKnob(event: React.MouseEvent<HTMLElement, MouseEvent>) {
    setHold(event.buttons === 1);
  }

  function holdKnob(event: React.MouseEvent<HTMLElement, MouseEvent>) {
    setHold(event.buttons === 1);
    if (event.buttons === 1) {
      const x = event.nativeEvent.offsetX, y = event.nativeEvent.offsetY;
      const angle = normalizeAngle(x, y, centerX, centerY);
      const eyeAngle = normalizeAngle(eyeX, eyeY, centerX, centerY);
      setHoldAngle(angle);
      setEyeAngle(eyeAngle);
    }
  }

  function moveKnob(event: React.MouseEvent<HTMLElement, MouseEvent>) {
    if (hold && event.buttons === 1) {
      const x = event.nativeEvent.offsetX, y = event.nativeEvent.offsetY;
      let angle = normalizeAngle(x, y, centerX, centerY);
      
      const delta = holdAngle - angle;
      angle = utils.fn.clamp(eyeAngle - delta, -startAngle, startAngle);
 
      const currValue = (startAngle - angle) / baseCurveLength;
      setValue(currValue)

      setEyeX(calcEyeX(centerX, props.r, -currValue))
      setEyeY(calcEyeY(centerY, props.r, -currValue))
      props.onKnobChange(currValue);
    }
  }

  function onScroll(event: WheelEvent) {
    event.preventDefault();
    const { deltaY } = event;

    if (deltaY > 0) {
      const newValue = Math.min(value + scrollDelta, 1);
      setEyeX(calcEyeX(centerX, props.r, -newValue));
      setEyeY(calcEyeY(centerY, props.r, -newValue));
      setValue(newValue);
      props.onKnobChange(newValue);
    } else if (deltaY < 0) {
      const newValue = Math.max(value - scrollDelta, 0);
      setEyeX(calcEyeX(centerX, props.r, -newValue));
      setEyeY(calcEyeY(centerY, props.r, -newValue));
      setValue(newValue);
      props.onKnobChange(newValue);
    }
  }

  React.useEffect(() => {
    ref.current?.addEventListener('wheel', onScroll, { passive: false});
    return () => ref.current?.removeEventListener('wheel', onScroll)
  })

  return (
    <div 
      ref={ref}
      className="knob flex justify-center touch-none"
      onMouseUp={releaseKnob} 
      onMouseDown={holdKnob}
      onMouseLeave={releaseKnob}
      onMouseMove={moveKnob}
    >
      <svg xmlns={utils.constants.svgxmlns} width={centerX * 2} height={centerY * 2}>
        <circle fill="#F2F5FC" cx={centerX} cy={centerY} r={props.r}></circle>
        <circle fill="#58AB6C" cx={eyeX} cy={eyeY} r={2}></circle>
        <circle fill="none" stroke="#999" cx={centerX} cy={centerY} r={props.r - 2}></circle>
      </svg>
    </div>
  )
}
