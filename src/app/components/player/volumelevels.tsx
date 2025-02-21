import { audioService } from "@/app/services/audioservice";
import { audioManager } from "@/app/services/audiotrackmanager";
import React from "react";

function calculateRMS(array: Uint8Array): number {
  let rms = 0, length = array.length;

  for (let i = 0; i < length; ++i) {
    let p = array[i] - 128;
    rms += p * p;
  }

  return Math.sqrt(Math.round(rms / array.length));
}

export function VolumeLevels() {
  const leftRect = React.createRef<HTMLDivElement>();
  const rightRect = React.createRef<HTMLDivElement>();
  const [left, setLeft] = React.useState(0);
  const [right, setRight] = React.useState(0);
  
  React.useEffect(() => {
    let volumeAnimationId = 0;
    volumeAnimationId = requestAnimationFrame(animateVolumeLevels);
    const leftBuffer = new Uint8Array(2048);
    const rightBuffer = new Uint8Array(2048);

    function animateVolumeLevels() {
      if (!audioService.audioContext || !audioManager.leftAnalyserNode) {
        volumeAnimationId = requestAnimationFrame(animateVolumeLevels);
        return;
      }
      audioManager.getTimeData(leftBuffer, rightBuffer);

      if (leftRect.current && rightRect.current) {
        leftRect.current.style.width = calculateRMS(leftBuffer) + 'px';
        rightRect.current.style.width = calculateRMS(rightBuffer) + 'px';
      }

      volumeAnimationId = requestAnimationFrame(animateVolumeLevels);
    }

    return () => {
      cancelAnimationFrame(volumeAnimationId);
    }
  });

  return (
    <>
      <div className="lchannel-volume w-36 flex items-center">
        <label className="text-xs w-4 min-w-4">L</label>
        <div className="bg-slate-900 w-full min-w-32 h-1">
          <div className="lchannel-done bg-green-500 h-1" ref={leftRect}></div>
        </div>
      </div>
      <div className="lchannel-volume w-36 flex items-center mt-[1px]">
      <label className="text-xs w-4 min-w-4">R</label>
        <div className="bg-slate-900 w-full min-w-32 h-1">
          <div className="lchannel-done bg-green-500 h-1" ref={rightRect}></div>
        </div>
      </div>
    </>
  );
}