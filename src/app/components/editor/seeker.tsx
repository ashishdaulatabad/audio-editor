import { audioManager } from "@/app/services/audiotrackmanager";
import { RootState } from "@/app/state/store";
import { Status } from "@/app/state/trackdetails";
import { utils } from "@/app/utils";
import React from "react";
import { useSelector } from "react-redux";

export function Seeker(props: React.PropsWithoutRef<{
  lineDist: number,
  h: number,
  seekOffset?: number,
  onLoopEnd: () => void,
  setLeft: (e: number) => void
}>) {
  const seekbarRef = React.createRef<HTMLDivElement>();
  const status = useSelector((store: RootState) => store.trackDetailsReducer.status);

  React.useEffect(() => {
    if (seekbarRef.current) {
      const currLeft = (props.lineDist / 5) * audioManager.getTimestamp();
      seekbarRef.current.style.transform = `translate(${Math.round(currLeft)}px)`;
    }

    let value = 0;
    if (status === Status.Play) {
      value = requestAnimationFrame(animateSeekbar);
    }

    function animateSeekbar() {
      if (seekbarRef.current) {
        const isLoopEnd = audioManager.updateTimestamp();
        if (isLoopEnd) {
          props.onLoopEnd();
        }

        const left = (props.lineDist / 5) * audioManager.getTimestamp();
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