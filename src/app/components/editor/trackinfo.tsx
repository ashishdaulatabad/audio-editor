import React from 'react';
import { Knob } from '../knob';
import { audioManager } from '@/app/services/audiotrackmanager';

interface TrackInfoProps {
  id: number
  height: number
}

export function TrackInfo(props: React.PropsWithoutRef<TrackInfoProps>) {
  const [vol, setVol] = React.useState(1.0);
  const [panner, setPanner] = React.useState(0.0);
  
  function setVolume(e: number) {
    audioManager.useManager().setGainNodeForTrack(props.id, e);
    setVol(e);
  }

  function setPan(e: number) {
    const finalValue = e * 2 - 1;
    audioManager.useManager().setPannerNodeForTrack(props.id, finalValue);
    setPanner(finalValue);
  }

  return (
    <div className="inline-flex items-center content-start">
      <span className="block text-sm text-center [writing-mode:vertical-lr] rotate-180 select-none">Track {props.id + 1}</span>
      <div className="vol" title={"Set Volume for Track " + (props.id+1)}>
        <Knob r={16} value={vol} pd={10} onKnobChange={setVolume} />
        <span className="block text-sm text-center select-none">{Math.round(vol * 100)}</span>
      </div>
      <div className="pan" title={"Set Pan for Track " + (props.id+1)}>
        <Knob
          r={16}
          value={((panner + 1) / 2)}
          pd={10}
          onKnobChange={setPan}
          scrollDelta={0.02}
        />
        <span className="block text-sm text-center select-none">{Math.round(panner * 100) / 100}</span>
      </div>
    </div>
  );
}
