import React from 'react';
import { audioService } from '@/app/services/audioservice';
import { audioManager } from '@/app/services/audiotrackmanager';
import { animationBatcher } from '@/app/services/animationbatch';

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

  return Math.round(Math.sqrt(rms / length));
}

/**
 * @todo Can there be more efficient level drawing method?
 * @param props 
 * @returns 
 */
export function VolumeLevels(props: React.PropsWithoutRef<{
  orientation?: Orientation
  mixerNumber?: number
  mixerMaster?: boolean
}>) {
  const leftRect = React.useRef<HTMLDivElement | null>(null);
  const rightRect = React.useRef<HTMLDivElement | null>(null);
  let handler: symbol | null = null;
  const leftBuffer = new Uint8Array(2048);
  const rightBuffer = new Uint8Array(2048);
  leftBuffer.fill(0);
  rightBuffer.fill(0);
  
  React.useEffect(() => {
    function animateVolumeLevels() {
      if (!audioService.audioContext || !audioManager.leftAnalyserNode) {
        return;
      }

      if (props.mixerNumber === undefined) { 
        audioManager.getTimeData(leftBuffer, rightBuffer);
      } else if (typeof props.mixerMaster === 'boolean' && props.mixerMaster) {
        audioManager.getTimeDataFromMixer(0, leftBuffer, rightBuffer);
      } else {
        audioManager.getTimeDataFromMixer(props.mixerNumber + 1, leftBuffer, rightBuffer);
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
    }

    // Returns a handler that manages the animation.
    handler = animationBatcher.addAnimationHandler(animateVolumeLevels);
    animationBatcher.setAnimationFrame(handler, 30);

    return () => {
      handler && animationBatcher.removeAnimationHandler(handler);
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
