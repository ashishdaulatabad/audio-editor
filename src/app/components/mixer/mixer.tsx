import { mixer } from '@/app/services/mixer';
import React from 'react';
import { MixerInput } from './mixerinput';

export interface MixerProps {

}

/**
 * @description Mixer control.
 * @param props Mixer Props
 * @returns mixer component
 */
export function MixerMaster(props: React.PropsWithoutRef<MixerProps>) {
  const totalMixers = mixer.totalMixers;

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