import React from "react";
import { audioManager } from "@/app/services/audiotrackmanager";
import { RootState } from "@/app/state/store";
import { Status } from "@/app/state/trackdetails/trackdetails";
import { useSelector } from "react-redux";
import { animationBatcher } from "@/app/services/animationbatch";

export function Seeker(props: {
  lineDist: number
  timePerUnitLine: number
  ref: React.RefObject<HTMLDivElement | null>
  seekOffset?: number
  left: number
  onLoopEnd: () => void
}) {
  const status = useSelector((state: RootState) => state.trackDetailsReducer.status);

  const {
    lineDist,
    ref,
    timePerUnitLine
  } = props;

  /// Resetting seekbar after exceeding certain threshold
  React.useEffect(() => {
    if (ref.current) {
      const currLeft = (lineDist / timePerUnitLine) * audioManager.getTimestamp();
      ref.current.style.transform = `translate(${Math.round(currLeft)}px)`;
    }

    let value = Symbol();
    value = animationBatcher.addAnimationHandler(animateSeekbar);

    if (status === Status.Play) {
      animationBatcher.resumeAnimation(value);
    } else {
      animationBatcher.suspendAnimation(value);
    }

    function animateSeekbar() {
      if (ref.current) {
        const isLoopEnd = audioManager.updateTimestamp();

        if (isLoopEnd) {
          props.onLoopEnd();
        }

        const left = (lineDist / timePerUnitLine) * audioManager.getTimestamp();
        ref.current.style.transform = `translate(${Math.round(left)}px)`;
      }
    }

    return () => animationBatcher.removeAnimationHandler(value);
  });

  return (
    <div
      ref={props.ref}
      className="seekbar-seek absolute z-[20] bg-green-500 w-[2px]"
      style={{height: 'calc(100% - 6px)'}}
    ></div>
  )
}
