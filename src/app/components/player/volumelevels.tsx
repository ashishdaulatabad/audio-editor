import React from 'react';
import { audioService } from '@/app/services/audioservice';
import { audioManager } from '@/app/services/audiotrackmanager';

function calculateRMS(array: Uint8Array): number {
  let rms = 0, length = array.length;

  for (let i = 0; i < length; ++i) {
    let p = array[i] - 128;
    rms += p * p;
  }

  return Math.round(Math.sqrt(rms / array.length));
}

export function VolumeLevels() {
  const leftRect = React.createRef<HTMLDivElement>();
  const rightRect = React.createRef<HTMLDivElement>();
  
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
        if (!audioManager.paused) {
          leftRect.current.style.width = calculateRMS(leftBuffer) + 'px';
          rightRect.current.style.width = calculateRMS(rightBuffer) + 'px';
        } else {
          leftRect.current.style.width = '0px';
          rightRect.current.style.width = '0px';
        }
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
        <label className="text-sm w-6 min-w-6">L</label>
        <div className="bg-slate-900 w-full min-w-32 h-1">
          <div className="lchannel-done bg-green-500 h-1 w-0" ref={leftRect}></div>
        </div>
      </div>
      <div className="lchannel-volume w-36 flex items-center">
      <label className="text-sm w-6 min-w-6">R</label>
        <div className="bg-slate-900 w-full min-w-32 h-1">
          <div className="lchannel-done bg-green-500 h-1 w-0" ref={rightRect}></div>
        </div>
      </div>
    </>
  );
}