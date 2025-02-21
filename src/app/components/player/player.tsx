import { audioService } from "@/app/services/audioservice";
import { audioManager } from "@/app/services/audiotrackmanager";
import { RootState } from "@/app/state/store";
import { Status, togglePlay } from "@/app/state/trackdetails";
import { Pause } from "@/assets/pause";
import { Play } from "@/assets/play";
import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { VolumeLevels } from "./volumelevels";

/**
 * Player at the top bar
 * To do: Too many re-animations: checking.
 *
 * @param props 
 * @returns 
 */
export function Player(props: React.PropsWithoutRef<any>) {
  const status = useSelector((state: RootState) => state.trackDetailsReducer.status);
  const [timer, setTimer] = React.useState('00:00');

  const ref = React.createRef<HTMLDivElement>();

  const [left, setLeft] = React.useState(0);
  const [right, setRight] = React.useState(0);
  const dispatch = useDispatch();

  React.useEffect(() => {
    let intervalId = 0, volumeAnimationId = 0;
    intervalId = requestAnimationFrame(animateTimer);

    function animateTimer() {
      const currentTime = audioManager.getTimestamp();
      const minutes = Math.floor(currentTime / 60);
      const seconds = Math.floor(currentTime - minutes * 60);
      setTimer(`${(minutes < 10 ? '0' : '') + minutes}:${(seconds < 10 ? '0' : '') + seconds}`);
      intervalId = requestAnimationFrame(animateTimer);
    }

    return () => cancelAnimationFrame(intervalId);
  }, []);

  function pause() {
    dispatch(togglePlay(status === Status.Pause ? Status.Play : Status.Pause));
  }

  return (
    <div className="flex justify-center items-center flex-row min-h-[8dvh] bg-slate-800 shadow-lg">
      <div ref={ref} className="timer bg-slate-700 text-2xl text-pretty p-2 rounded-md min-w-28 text-center select-none">
        {timer}
      </div>
      <span className="ml-2 pause play bg-slate-700 p-2 rounded-md cursor-pointer" onClick={pause}>
        {
        status === Status.Pause ? 
          <Play c="#61E361" f="#51DE56" w={25} h={25} /> :
          <Pause c="#E1E361" f="#D1D256" w={25} h={25} />
        }
      </span>
      <div className="speaker-decibel ml-4">
        <VolumeLevels />
      </div>
    </div>
  );
}