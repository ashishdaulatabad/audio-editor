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
  /// Resetting seekbar after exceeding certain threshold
  return (
    <div
      ref={props.ref}
      className="seekbar-seek absolute z-10 bg-green-500 w-[2px]"
      style={{height: 'calc(100% - 6px)'}}
    ></div>
  )
}
