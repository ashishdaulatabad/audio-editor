import React from "react";
import { audioManager } from "@/app/services/audiotrackmanager";
import { RootState } from "@/app/state/store";
import { Status } from "@/app/state/trackdetails";
import { useSelector } from "react-redux";

/**
 * @description Seeker component
 * @param props Props.
 * @returns void
 */
export function Seeker(props: {
  lineDist: number
  timePerUnitLine: number
  ref: React.RefObject<HTMLDivElement | null>
  seekOffset?: number
}) {
  const status = useSelector((state: RootState) => state.trackDetailsReducer.status);
  const tracks = useSelector((state: RootState) => state.trackDetailsReducer.trackDetails);
  /// Resetting seekbar after exceeding certain threshold
  React.useEffect(() => {
    const { lineDist, ref, timePerUnitLine } = props;
    if (ref.current) {
      const currLeft = (lineDist / timePerUnitLine) * audioManager.getTimestamp();
      ref.current.style.transform = `translate(${Math.round(currLeft)}px)`;
    }

    let value = 0;
    if (status === Status.Play) {
      value = requestAnimationFrame(animateSeekbar);
    }

    /**
     * @description Animate seekbar to move as per timestamp
     */
    function animateSeekbar() {
      if (ref.current) {
        const isLoopEnd = audioManager.updateTimestamp();
        if (isLoopEnd) {
          audioManager.useManager().rescheduleAllTracks(tracks);
        }

        const left = (lineDist / timePerUnitLine) * audioManager.getTimestamp();
        ref.current.style.transform = `translate(${Math.round(left)}px)`;
      }
      
      value = requestAnimationFrame(animateSeekbar);
    }

    return () => cancelAnimationFrame(value)
  });

  return (
    <div
      ref={props.ref}
      className="seekbar-seek absolute z-10 bg-green-500 w-[2px]"
      style={{height: 'calc(100% - 6px)'}}
    ></div>
  )
}
