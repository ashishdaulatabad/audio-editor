import React from "react";
import { audioManager } from "@/app/services/audio/audiotrackmanager";
import { RootState } from "@/app/state/store";
import { SEC_TO_MICROSEC, Status } from "@/app/state/trackdetails/trackdetails";
import { useSelector } from "react-redux";

export function WaveformSeeker(props: React.PropsWithoutRef<{
  trackNumber: number
  audioId: number
  h: number
  lineDist: number
  seekOffset?: number
}>) {
  const seekbarRef = React.createRef<HTMLDivElement>();
  const { trackNumber, audioId } = props;
  const track = useSelector((state: RootState) => state.trackDetailsReducer.trackDetails[trackNumber][audioId]);
  const status = useSelector((store: RootState) => store.trackDetailsReducer.status);
  const startOffsetSecs = track.trackDetail.startOffsetInMicros / SEC_TO_MICROSEC;
  const endOffsetSecs = track.trackDetail.endOffsetInMicros / SEC_TO_MICROSEC;
  const trackOffsetSecs = track.trackDetail.offsetInMicros / SEC_TO_MICROSEC;

  React.useEffect(() => {
    let value = 0;
    if (status === Status.Play) {
      value = requestAnimationFrame(animateSeekbar);
    }

    function animateSeekbar() {
      const effectiveOffset = audioManager.getTimestamp() - trackOffsetSecs;
      const show = effectiveOffset >= 0 && effectiveOffset <= endOffsetSecs - startOffsetSecs;

      if (seekbarRef.current) {
        if (show) {
          const left = (props.lineDist / 5) * (effectiveOffset + startOffsetSecs);
          Object.assign(
            seekbarRef.current.style,
            {
              display: 'block',
              transform: `translate(${Math.round(left)}px)`,
            }
          );
        } else {
          seekbarRef.current.style.display = 'none';
        }
      }
      
      value = requestAnimationFrame(animateSeekbar);
    }

    return () => cancelAnimationFrame(value)
  });

  return (
    <div
      ref={seekbarRef}
      className="seekbar-seek z-10 absolute bg-green-500 w-[2px]"
      style={{height: props.h + 60 + 'px'}}
    ></div>
  )
}