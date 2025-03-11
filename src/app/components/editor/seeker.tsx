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
export function Seeker(props: React.PropsWithoutRef<{
  lineDist: number
  timePerUnitLine: number
  h: number
  seekOffset?: number
  onLoopEnd: () => void
  setLeft: (e: number) => void
}>) {
  const seekbarRef = React.createRef<HTMLDivElement>();
  const status = useSelector((store: RootState) => store.trackDetailsReducer.status);
  const timePerUnitLine = props.timePerUnitLine;

  React.useEffect(() => {
    if (seekbarRef.current) {
      const currLeft = (props.lineDist / timePerUnitLine) * audioManager.getTimestamp();
      seekbarRef.current.style.transform = `translate(${Math.round(currLeft)}px)`;
    }

    let value = 0;
    if (status === Status.Play) {
      value = requestAnimationFrame(animateSeekbar);
    }

    /**
     * @description Animate seekbar to move as per timestamp
     */
    function animateSeekbar() {
      if (seekbarRef.current) {
        const isLoopEnd = audioManager.updateTimestamp();
        if (isLoopEnd) {
          props.onLoopEnd();
        }

        const left = (props.lineDist / timePerUnitLine) * audioManager.getTimestamp();
        seekbarRef.current.style.transform = `translate(${Math.round(left)}px)`;
      }
      
      value = requestAnimationFrame(animateSeekbar);
    }

    return () => cancelAnimationFrame(value)
  });

  /// Resetting seekbar after exceeding certain threshold
  return (
    <div
      ref={seekbarRef}
      className="seekbar-seek z-10 absolute bg-green-500 w-[2px]"
      style={{height: props.h + 60 + 'px'}}
    ></div>
  )
}
