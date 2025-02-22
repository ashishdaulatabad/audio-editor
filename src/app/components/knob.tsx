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

function calcVectorX(value: number) {
  return Math.cos((3 - value * 6) * Math.PI / 4);
}

function calcVectorY(value: number) {
  return Math.sin((3 - value * 6) * Math.PI / 4);
}

const minX = calcVectorX(0);
const minY = calcVectorY(0);

const maxX = calcVectorX(-1);
const maxY = calcVectorY(-1);

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

  const [holdAngle, setHoldAngle] = React.useState<number>(0);

  function releaseKnob(event: React.MouseEvent<HTMLElement, MouseEvent>) {
    setHold(event.buttons === 1);
  }

  function holdKnob(event: React.MouseEvent<HTMLElement, MouseEvent>) {
    setHold(event.buttons === 1);
    if (event.buttons === 1) {
      const x = event.nativeEvent.offsetX, y = event.nativeEvent.offsetY;
      const angle = normalizeAngle(x, y, centerX, centerY);
      setHoldAngle(angle);
    }
  }

  function moveKnob(event: React.MouseEvent<HTMLElement, MouseEvent>) {
    if (hold && event.buttons === 1) {
      const x = event.nativeEvent.offsetX, y = event.nativeEvent.offsetY;
      let angle = normalizeAngle(x, y, centerX, centerY);
      
      const delta = holdAngle - angle;
      angle = utils.fn.clamp(angle - delta, -startAngle, startAngle);
 
      const currValue = (startAngle - angle) / baseCurveLength;
      setValue(currValue);

      props.onKnobChange(currValue);
    }
  }

  function onScroll(event: WheelEvent) {
    event.preventDefault();
    const { deltaY } = event;
    const newValue = utils.fn.clamp(value + (deltaY !== 0 ? (deltaY / Math.abs(deltaY)) : 0) * scrollDelta, 0, 1);

    setValue(newValue);
    props.onKnobChange(newValue);
  }

  React.useEffect(() => {
    ref.current?.addEventListener('wheel', onScroll, { passive: false });
    return () => ref.current?.removeEventListener('wheel', onScroll)
  }, [props.value]);

  const factorX = calcVectorX(-value);
  const factorY = calcVectorY(-value);

  const eyeX = centerX + (props.r - 8) * factorX;
  const eyeY = centerY + (props.r - 8) * factorY;

  const arcStartX = centerX + (props.r + 6) * minX;
  const arcStartY = centerY + (props.r + 6) * minY;

  const arcEndX = centerX + (props.r + 6) * maxX;
  const arcEndY = centerY + (props.r + 6) * maxY;

  const valueEndX = centerX + (props.r + 6) * factorX;
  const valueEndY = centerY + (props.r + 6) * factorY;
  const eyeAngle = startAngle - normalizeAngle(eyeX, eyeY, centerX, centerY);

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
        <path stroke="#666" fill="none" strokeWidth={2} d={`M ${arcStartX} ${arcStartY} A ${props.r + 6} ${props.r + 6} ${baseCurveLength} 1 1 ${arcEndX} ${arcEndY}`}></path>
        <path stroke="#58AB6C" fill="none" strokeWidth={2} d={`M ${arcStartX} ${arcStartY} A ${props.r + 6} ${props.r + 6} ${eyeAngle} ${Math.PI < eyeAngle ? '1 1' : '0 1'} ${valueEndX} ${valueEndY}`}></path>
        <circle fill="#F2F5FC" cx={centerX} cy={centerY} r={props.r}></circle>
        <circle fill="#58AB6C" cx={eyeX} cy={eyeY} r={2}></circle>
        <circle fill="none" stroke="#999" cx={centerX} cy={centerY} r={props.r - 2}></circle>
      </svg>
    </div>
  )
}
