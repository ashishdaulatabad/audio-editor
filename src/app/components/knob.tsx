import React from 'react';
import { clamp, svgxmlns } from '../utils';

/**
 * @description Knob Props for setting values.
 */
interface KnobSettings {
  /**
   * @description Radius of this knob in pixels.
   */
  r: number
  /**
   * @description Padding in pixels
   */
  pd: number
  /**
   * @description Value to be set.
   */
  value?: number
  /**
   * @description Scroll Change to be made when hovered over the Knob.
   * - [ ] Todo: Delta change for making the values discrete as well
   */
  scrollDelta?: number
  /**
   * @description Parent Component action to perform when Knob changes it's value
   * @param value value that it returns as per `functionMapper`; if not defined, 
   * returns normalized value from `0` to `1`.
   * @returns void
   */
  onKnobChange: (value: number) => void
  /**
   * @description User settings as one-to-one mapping from [0, 1] to a different range of values.
   */
  functionMapper?: (e: number) => number
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

/**
 * @description Normalize angle between `5 * PI / 4` and `-PI / 4`.
 * 
 * @param x horizontal position of cursor
 * @param y vertical position of cursor
 * @param centerX x center point
 * @param centerY y center point
 * @returns Normalized angle.
 */
function normalizeAngle(x: number, y: number, centerX: number, centerY: number): number {
  const dx = x - centerX, dy = y - centerY;
  let angle = Math.atan(dx / dy);

  if (dx > 0 && dy >= 0) {
    angle -= Math.PI;
  } else if (dx < 0 && dy >= 0) {
    angle += Math.PI;
  }

  return clamp(angle, -startAngle, startAngle);
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

  function releaseKnob() {
    setHold(false);
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
      angle = clamp(angle - delta, -startAngle, startAngle);
 
      const currValue = (startAngle - angle) / baseCurveLength;
      setValue(currValue);

      const mapper = props.functionMapper ? props.functionMapper(currValue) : currValue;
      props.onKnobChange(mapper);
    }
  }

  function onScroll(event: WheelEvent) {
    event.preventDefault();
    const { deltaY } = event;
    const newValue = clamp(value + (deltaY !== 0 ? (deltaY / Math.abs(deltaY)) : 0) * scrollDelta, 0, 1);

    setValue(newValue);

    const mapper = props.functionMapper ? props.functionMapper(newValue) : newValue;
    props.onKnobChange(mapper);
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
      <svg xmlns={svgxmlns} width={centerX * 2} height={centerY * 2}>
        <path
          stroke="#666"
          fill="none"
          strokeWidth={2}
          d={`M ${arcStartX} ${arcStartY} A ${props.r + 6} ${props.r + 6} ${baseCurveLength} 1 1 ${arcEndX} ${arcEndY}`}
        ></path>
        <path
          stroke="#58AB6C"
          fill="none"
          strokeWidth={2}
          d={`M ${arcStartX} ${arcStartY} A ${props.r + 6} ${props.r + 6} ${eyeAngle} ${Math.PI < eyeAngle ? '1 1' : '0 1'} ${valueEndX} ${valueEndY}`}
        ></path>
        <circle
          fill="#F2F5FC"
          cx={centerX}
          cy={centerY}
          r={props.r}
        ></circle>
        <circle
          fill="#58AB6C"
          cx={eyeX}
          cy={eyeY}
          r={2}
        ></circle>
        <circle
          fill="none"
          stroke="#999"
          cx={centerX}
          cy={centerY}
          r={props.r - 2}
        ></circle>
      </svg>
    </div>
  )
}
