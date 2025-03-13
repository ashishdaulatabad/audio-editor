import React from 'react';
import { Knob } from '../knob';
import { Slider } from '../slider';
import { audioManager } from '@/app/services/audiotrackmanager';

export function MixerInput(props: React.PropsWithoutRef<{mixerNumber: number}>) {
  const [gain, setGain] = React.useState(1);
  const [panner, setPanner] = React.useState(0);

  function setGainValue(e: number) {
    audioManager.setGainNodeForMixer(props.mixerNumber, e);
    setGain(e);
  }

  function setPannerValue(e: number) {
    audioManager.setPannerNodeForMixer(props.mixerNumber, e);
    setPanner(e);
  }

  return (
    <div className="p-2 bg-slate-700 m-1 shadow-md content-center items-center text-center mb-4">
      <div className="panner-value mb-6">
        <Knob 
          pd={10}
          r={15}
          onKnobChange={setPannerValue}
          functionMapper={(e) => e * 2 - 1}
          value={(panner + 1) / 2}
          scrollDelta={0.04}
        />
        <label className="text-md">Pan</label>
      </div>
      <div className="volume mb-6">
        <Slider 
          h={200}
          headh={12}
          headw={30}
          value={gain / 1.5}
          functionMapper={(e) => e * 1.5}
          scrollDelta={0.01}
          onSliderChange={setGainValue}
          lineThickness={4}
          activeStroke="#58AB6C"
          pd={20}
        />
        <label className="text-md">Vol</label>
      </div>
      <span className="text-nowrap text-sm">Mixer {props.mixerNumber + 1}</span>
    </div>
  )
}