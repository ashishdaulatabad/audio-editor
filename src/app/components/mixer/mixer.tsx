import React from 'react';
import { MixerInput } from './mixerinput';
import { audioManager } from '@/app/services/audiotrackmanager';

export interface MixerProps {

}

/**
 * @description Mixer control.
 * @param props Mixer Props
 * @returns mixer component
 */
export function MixerMaster(props: React.PropsWithoutRef<MixerProps>) {
  const totalMixers = audioManager.totalMixers;

  return (
    <div className="mixer-master flex flex-row">
      {
        Array.from({length: totalMixers}, (_, index: number) => (
          <MixerInput mixerNumber={index} key={index} />
        ))
      }
    </div>
  );
}