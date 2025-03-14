import React from 'react';
import { audioService } from '@/app/services/audioservice';
import { audioManager } from '@/app/services/audiotrackmanager';

export enum Orientation {
  Horizontal,
  Vertical
}

function calculateRMS(array: Uint8Array): number {
  let rms = 0, length = array.length;

  for (let i = 0; i < length; ++i) {
    let p = array[i] - 128;
    rms += p * p;
  }

  return Math.round(Math.sqrt(rms / array.length));
}

export function VolumeLevels(props: React.PropsWithoutRef<{
  orientation?: Orientation
  mixerNumber?: number
}>) {
  const leftRect = React.useRef<HTMLDivElement | null>(null);
  const rightRect = React.useRef<HTMLDivElement | null>(null);
  
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
      if (props.mixerNumber === undefined) { 
        audioManager.getTimeData(leftBuffer, rightBuffer);
      } else {
        audioManager.getTimeDataFromMixer(props.mixerNumber, leftBuffer, rightBuffer);
      }

      if (leftRect.current && rightRect.current) {
        switch (props.orientation) {
          case Orientation.Vertical: {
            if (!audioManager.paused) {
              leftRect.current.style.height = calculateRMS(leftBuffer) + 'px';
              rightRect.current.style.height = calculateRMS(rightBuffer) + 'px';
            } else {
              leftRect.current.style.height = '0px';
              rightRect.current.style.height = '0px';
            }
            break;
          }
          case Orientation.Horizontal:
          default: {
            if (!audioManager.paused) {
              leftRect.current.style.width = calculateRMS(leftBuffer) + 'px';
              rightRect.current.style.width = calculateRMS(rightBuffer) + 'px';
            } else {
              leftRect.current.style.width = '0px';
              rightRect.current.style.width = '0px';
            }
          }
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
      {
        (props.orientation === Orientation.Horizontal || props.orientation === undefined) && <>
          <div className="lchannel-volume w-36 flex items-center">
            <label className="text-sm w-6 min-w-6">L</label>
            <div className="bg-slate-900 w-full min-w-32 h-2">
              <div className="lchannel-done bg-green-500 h-2 w-0" ref={leftRect}></div>
            </div>
          </div>
          <div className="lchannel-volume w-36 flex items-center">
          <label className="text-sm w-6 min-w-6">R</label>
            <div className="bg-slate-900 w-full min-w-32 h-2">
              <div className="lchannel-done bg-green-500 h-2 w-0" ref={rightRect}></div>
            </div>
          </div>
        </>
      }
      {
        (props.orientation === Orientation.Vertical) && 
        <div className="flex flex-row w-6 justify-center m-4">
          <div className="lchannel-volume h-36 items-center m-2">
            <div className="bg-slate-900 h-full min-h-32 w-2 flex flex-col-reverse">
              <div className="lchannel-done bg-green-500 w-2 h-0" ref={leftRect}></div>
            </div>
            <label className="text-md h-6 min-h-6">L</label>
          </div>
          <div className="lchannel-volume h-36 items-centerm m-2">
            <div className="bg-slate-900 h-full min-h-32 w-2 flex flex-col-reverse">
              <div className="lchannel-done bg-green-500 w-2 h-0" ref={rightRect}></div>
            </div>
            <label className="text-md h-6 min-h-6">R</label>
          </div>
        </div>
      }
    </>
  );
}
