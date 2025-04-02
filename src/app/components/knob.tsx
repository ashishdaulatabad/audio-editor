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
  onKnobChange?: (value: number) => void
  /**
   * @description Handle release event when user releases the mouse
   * @param value current value emitted when released.
   * @returns void
   */
  onKnobRelease?: (value: number) => void
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

  return clamp(angle, -START_ANGLE, START_ANGLE);
}

const BASE_CURVE_LENGTH = 3 * Math.PI / 2;
const START_ANGLE = 3 * Math.PI / 4;

/**
 * @description Knob component
 * @todo 
 * - Can just rotate with transform instead of manually calculating angle??
 * - On Change via
 *  1. Scroll, debounce and then register as this controller changed.
 *  2. Mouse Drag, register as this controller changed when the trigger is released.
 * @param props 
 * @returns 
 */
export function Knob(props: React.PropsWithoutRef<KnobSettings>) {
  // States
  const [value, setValue] = React.useState(props.value ?? 0);
  const [hold, setHold] = React.useState(false);
  const [holdY, setHoldY] = React.useState<number>(0);
  // Refs
  const ref = React.useRef<HTMLDivElement | null>(null);
  const scrollDelta: number = props.scrollDelta || 0.05;

  const centerX = props.r + props.pd;
  const centerY = centerX;
  const totalWidth = centerX * 2;

  function releaseKnob() {
    setHold(false);
    const mapper = props.functionMapper ? props.functionMapper(value) : value;
    props.onKnobRelease && props.onKnobRelease(mapper);
  }

  function holdKnob(event: React.MouseEvent<HTMLElement, MouseEvent>) {
    setHold(event.buttons === 1);

    if (event.buttons === 1) {
      const { offsetY: y } = event.nativeEvent;
      setHoldY(y);
    }
  }

  function moveKnob(event: React.MouseEvent<HTMLElement, MouseEvent>) {
    if (hold && event.buttons === 1) {
      const { offsetY: y } = event.nativeEvent;
      const delta = (y - holdY) / (totalWidth);

      const currValue = clamp(value + delta, 0, 1);
      setHoldY(y);
      setValue(currValue);

      const mapper = props.functionMapper ? props.functionMapper(currValue) : currValue;
      props.onKnobChange && props.onKnobChange(mapper);
    }
  }

  function onScroll(event: WheelEvent) {
    event.preventDefault();
    const { deltaY } = event;
    const newValue = clamp(value + (deltaY !== 0 ? (deltaY / Math.abs(deltaY)) : 0) * scrollDelta, 0, 1);

    setValue(newValue);

    const mapper = props.functionMapper ? props.functionMapper(newValue) : newValue;
    props.onKnobChange && props.onKnobChange(mapper);
  }

  React.useEffect(() => {
    ref.current?.addEventListener('wheel', onScroll, { passive: false });
    // Cleanup
    return () => {
      ref.current?.removeEventListener('wheel', onScroll);
    }
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
  const eyeAngle = START_ANGLE - normalizeAngle(eyeX, eyeY, centerX, centerY);

  return (
    <div 
      ref={ref}
      className="knob flex justify-center touch-none"
      onMouseUp={releaseKnob} 
      onMouseDown={holdKnob}
      onMouseLeave={releaseKnob}
      onMouseMove={moveKnob}
    >
      <svg
        xmlns={svgxmlns}
        width={centerX * 2}
        height={centerY * 2}
      >
        <path
          stroke="#666"
          fill="none"
          strokeWidth={2}
          d={
          `M${arcStartX} ${arcStartY} 
           A${props.r + 6} ${props.r + 6} ${BASE_CURVE_LENGTH} 1 1 ${arcEndX} ${arcEndY}`
        }></path>
        <path
          stroke="#58AB6C"
          fill="none"
          strokeWidth={2}
          d={
            `M${arcStartX} ${arcStartY} 
             A${props.r + 6} ${props.r + 6} ${eyeAngle} ${Math.PI < eyeAngle ? '1 1' : '0 1'} ${valueEndX} ${valueEndY}`
        }></path>
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
