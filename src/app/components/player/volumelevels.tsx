import { audioService } from "@/app/services/audioservice";
import { audioManager } from "@/app/services/audiotrackmanager";
import { utils } from "@/app/utils";
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
      setLeft(calculateRMS(leftBuffer));
      setRight(calculateRMS(rightBuffer));
      volumeAnimationId = requestAnimationFrame(animateVolumeLevels);
    }

    return () => {
      cancelAnimationFrame(volumeAnimationId);
    }
  }, []);

  return (
    <>
      <svg xmlns={utils.constants.svgxmlns} width={200} height={15}>
        <text fill="#fff" dx={10} dy={10}>L</text>
        <rect x={30} y={0} width={(left * 2) + 30} height={10} fill="#5e8"></rect>
      </svg>
      <svg xmlns={utils.constants.svgxmlns} width={200} height={15}>
        <text fill="#fff" dx={10} dy={10}>R</text>
        <rect x={30} y={0} width={(right * 2) + 30} height={10} fill="#5e8"></rect>
      </svg>
    </>
  );
}