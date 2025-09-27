import React from "react";
import { audioManager } from "@/app/services/audio/audiotrackmanager";
import { RootState } from "@/app/state/store";
import { SEC_TO_MICROSEC, Status } from "@/app/state/trackdetails/trackdetails";
import { useSelector } from "react-redux";

// TODO: Add unitTimePerLineDistance
export function WaveformSeeker(props: React.PropsWithoutRef<{
  trackNumber: number
  audioId: number
  h: number
  lineDist: number
  seekOffset?: number
}>) {
  const seekbarRef = React.useRef<HTMLDivElement>(null);
  const {trackNumber, audioId, lineDist, h} = props;

  const track = useSelector((state: RootState) => (
    state.trackDetailsReducer.trackDetails[trackNumber][audioId]
  ));
  const status = useSelector((store: RootState) => (
    store.trackDetailsReducer.status
  ));

  const {
    trackDetail: {
      startOffsetInMicros,
      endOffsetInMicros,
      offsetInMicros
    }
  } = track;

  const startOffsetSecs = startOffsetInMicros / SEC_TO_MICROSEC;
  const endOffsetSecs = endOffsetInMicros / SEC_TO_MICROSEC;
  const trackOffsetSecs = offsetInMicros / SEC_TO_MICROSEC;

  React.useEffect(() => {
    let value = status === Status.Play ?
      requestAnimationFrame(animateSeekbar) :
      0;

    function animateSeekbar() {
      const effectiveOffset = audioManager.getTimestamp() - trackOffsetSecs;
      const show = effectiveOffset >= 0 && 
        effectiveOffset <= endOffsetSecs - startOffsetSecs;

      if (!seekbarRef.current) {
        return;
      }

      if (show) {
        const left = (lineDist / 5) * (effectiveOffset + startOffsetSecs);
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
      
      value = requestAnimationFrame(animateSeekbar);
    }

    return () => cancelAnimationFrame(value);
  });

  return (
    <div
      ref={seekbarRef}
      className="seekbar-seek z-10 absolute bg-green-500 w-[2px]"
      style={{height: h + 60 + 'px'}}
    ></div>
  )
}